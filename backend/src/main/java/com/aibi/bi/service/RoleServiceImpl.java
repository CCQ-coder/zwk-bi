package com.aibi.bi.service;

import com.aibi.bi.domain.SysMenu;
import com.aibi.bi.domain.SysRole;
import com.aibi.bi.mapper.SysMenuMapper;
import com.aibi.bi.mapper.SysRoleMapper;
import com.aibi.bi.mapper.SysRoleMenuMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class RoleServiceImpl implements RoleService {

    private final SysRoleMapper sysRoleMapper;
    private final SysRoleMenuMapper sysRoleMenuMapper;
    private final SysMenuMapper sysMenuMapper;
    private final MenuCacheSupport menuCacheSupport;

    public RoleServiceImpl(SysRoleMapper sysRoleMapper,
                           SysRoleMenuMapper sysRoleMenuMapper,
                           SysMenuMapper sysMenuMapper,
                           MenuCacheSupport menuCacheSupport) {
        this.sysRoleMapper = sysRoleMapper;
        this.sysRoleMenuMapper = sysRoleMenuMapper;
        this.sysMenuMapper = sysMenuMapper;
        this.menuCacheSupport = menuCacheSupport;
    }

    @Override
    public List<SysRole> listRoles() {
        return sysRoleMapper.listAllWithStats();
    }

    @Override
    public List<Long> listRoleMenuIds(Long roleId) {
        ensureRoleExists(roleId);
        return sysRoleMenuMapper.listMenuIdsByRoleId(roleId);
    }

    @Override
    public List<Long> updateRoleMenus(Long roleId, List<Long> menuIds) {
        ensureRoleExists(roleId);
        List<SysMenu> allMenus = sysMenuMapper.listAll();
        Set<Long> validMenuIds = allMenus.stream()
            .map(SysMenu::getId)
            .collect(java.util.stream.Collectors.toSet());
        Map<Long, SysMenu> menuMap = allMenus.stream()
            .collect(java.util.stream.Collectors.toMap(SysMenu::getId, menu -> menu));
        LinkedHashSet<Long> normalizedIds = new LinkedHashSet<>();
        for (Long menuId : menuIds == null ? List.<Long>of() : menuIds) {
            if (menuId == null) {
                continue;
            }
            if (!validMenuIds.contains(menuId)) {
                throw new IllegalArgumentException("菜单不存在: " + menuId);
            }
            normalizedIds.add(menuId);
            appendParentMenus(menuId, menuMap, normalizedIds);
        }
        sysRoleMenuMapper.deleteByRoleId(roleId);
        for (Long menuId : normalizedIds) {
            sysRoleMenuMapper.insert(roleId, menuId);
        }
        menuCacheSupport.invalidateAll();
        return List.copyOf(normalizedIds);
    }

    private void ensureRoleExists(Long roleId) {
        if (roleId == null || sysRoleMapper.findById(roleId) == null) {
            throw new IllegalArgumentException("角色不存在: " + roleId);
        }
    }

    private void appendParentMenus(Long menuId, Map<Long, SysMenu> menuMap, Set<Long> normalizedIds) {
        SysMenu cursor = menuMap.get(menuId);
        while (cursor != null && cursor.getParentId() != null) {
            Long parentId = cursor.getParentId();
            if (parentId == null || normalizedIds.contains(parentId)) {
                cursor = menuMap.get(parentId);
                continue;
            }
            normalizedIds.add(parentId);
            cursor = menuMap.get(parentId);
        }
    }
}