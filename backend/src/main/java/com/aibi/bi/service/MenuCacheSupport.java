package com.aibi.bi.service;

import com.aibi.bi.domain.SysMenu;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

@Component
public class MenuCacheSupport {

    private static final long CURRENT_MENU_TTL_MILLIS = 5 * 60 * 1000L;

    private final ConcurrentMap<Long, CacheEntry> currentMenuCache = new ConcurrentHashMap<>();
    private final AtomicLong globalVersion = new AtomicLong(0L);

    public List<SysMenu> getCurrentMenus(Long userId, Supplier<List<SysMenu>> loader) {
        long version = globalVersion.get();
        long now = System.currentTimeMillis();
        CacheEntry cached = currentMenuCache.get(userId);
        if (cached != null && cached.version == version && now - cached.loadedAt <= CURRENT_MENU_TTL_MILLIS) {
            return cached.menus;
        }
        List<SysMenu> loaded = loader.get();
        currentMenuCache.put(userId, new CacheEntry(loaded, version, now));
        return loaded;
    }

    public void invalidateUser(Long userId) {
        if (userId == null) {
            return;
        }
        currentMenuCache.remove(userId);
    }

    public void invalidateAll() {
        globalVersion.incrementAndGet();
        currentMenuCache.clear();
    }

    private record CacheEntry(List<SysMenu> menus, long version, long loadedAt) {
    }
}