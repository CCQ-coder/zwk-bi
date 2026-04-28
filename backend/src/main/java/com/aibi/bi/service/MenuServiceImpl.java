package com.aibi.bi.service;

import com.aibi.bi.domain.SysMenu;
import com.aibi.bi.mapper.SysMenuMapper;
import com.aibi.bi.mapper.SysRoleMenuMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MenuServiceImpl implements MenuService {

    private final SysMenuMapper sysMenuMapper;
    private final SysRoleMenuMapper sysRoleMenuMapper;
    private final MenuCacheSupport menuCacheSupport;

    public MenuServiceImpl(SysMenuMapper sysMenuMapper,
                           SysRoleMenuMapper sysRoleMenuMapper,
                           MenuCacheSupport menuCacheSupport) {
        this.sysMenuMapper = sysMenuMapper;
        this.sysRoleMenuMapper = sysRoleMenuMapper;
        this.menuCacheSupport = menuCacheSupport;
    }

    @Override
    public List<SysMenu> listCurrentMenus(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("请先登录");
        }
        return menuCacheSupport.getCurrentMenus(userId,
            () -> buildTree(sysMenuMapper.listVisibleMenusByUserId(userId)));
    }

    @Override
    public List<SysMenu> listAllMenus() {
        return buildTree(sysMenuMapper.listAll());
    }

    @Override
    public SysMenu createMenu(SysMenu menu) {
        SysMenu target = normalizeMenu(menu, null);
        validateMenu(target, null);
        sysMenuMapper.insert(target);
        menuCacheSupport.invalidateAll();
        return target;
    }

    @Override
    public SysMenu updateMenu(Long id, SysMenu menu) {
        SysMenu existing = sysMenuMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("菜单不存在: " + id);
        }
        SysMenu target = normalizeMenu(menu, existing);
        target.setId(id);
        validateMenu(target, id);
        sysMenuMapper.update(target);
        menuCacheSupport.invalidateAll();
        return sysMenuMapper.findById(id);
    }

    @Override
    public void deleteMenu(Long id) {
        SysMenu existing = sysMenuMapper.findById(id);
        if (existing == null) {
            return;
        }
        if (sysMenuMapper.countChildren(id) > 0) {
            throw new IllegalArgumentException("请先删除下级菜单");
        }
        sysRoleMenuMapper.deleteByMenuId(id);
        sysMenuMapper.deleteById(id);
        menuCacheSupport.invalidateAll();
    }

    private List<SysMenu> buildTree(List<SysMenu> flatMenus) {
        if (flatMenus.isEmpty()) {
            return List.of();
        }
        Map<Long, SysMenu> menuMap = new LinkedHashMap<>();
        for (SysMenu menu : flatMenus) {
            menu.setChildren(new ArrayList<>());
            menuMap.put(menu.getId(), menu);
        }
        List<SysMenu> roots = new ArrayList<>();
        for (SysMenu menu : menuMap.values()) {
            Long parentId = menu.getParentId();
            if (parentId == null || parentId == 0 || !menuMap.containsKey(parentId)) {
                roots.add(menu);
                continue;
            }
            menuMap.get(parentId).getChildren().add(menu);
        }
        return roots;
    }

    private SysMenu normalizeMenu(SysMenu request, SysMenu base) {
        SysMenu target = base == null ? new SysMenu() : base;
        target.setName(normalizeText(request == null ? null : request.getName()));
        target.setPath(normalizeText(request == null ? null : request.getPath()));
        target.setComponent(normalizeText(request == null ? null : request.getComponent()));
        target.setPermission(normalizeText(request == null ? null : request.getPermission()));
        target.setIcon(normalizeText(request == null ? null : request.getIcon()));
        target.setType(normalizeType(request == null ? null : request.getType()));
        target.setParentId(normalizeId(request == null ? null : request.getParentId()));
        target.setDashboardId(normalizeId(request == null ? null : request.getDashboardId()));
        target.setSort(request != null && request.getSort() != null ? request.getSort() : 100);
        target.setVisible(request == null || request.getVisible() == null ? Boolean.TRUE : request.getVisible());
        return target;
    }

    private void validateMenu(SysMenu menu, Long currentId) {
        if (!StringUtils.hasText(menu.getName())) {
            throw new IllegalArgumentException("菜单名称不能为空");
        }
        if ("menu".equals(menu.getType()) && !StringUtils.hasText(menu.getPath())) {
            throw new IllegalArgumentException("菜单路径不能为空");
        }
        if (menu.getParentId() != null) {
            if (menu.getParentId().equals(currentId)) {
                throw new IllegalArgumentException("菜单不能选择自身为上级");
            }
            if (sysMenuMapper.findById(menu.getParentId()) == null) {
                throw new IllegalArgumentException("上级菜单不存在");
            }
            if (currentId != null && wouldCreateCycle(currentId, menu.getParentId())) {
                throw new IllegalArgumentException("上级菜单不能选择当前菜单的下级");
            }
        }
        if (StringUtils.hasText(menu.getPath()) && sysMenuMapper.countByPath(menu.getPath(), currentId) > 0) {
            throw new IllegalArgumentException("菜单路径已存在: " + menu.getPath());
        }
    }

    private boolean wouldCreateCycle(Long currentId, Long parentId) {
        Long cursor = parentId;
        while (cursor != null) {
            if (cursor.equals(currentId)) {
                return true;
            }
            SysMenu parent = sysMenuMapper.findById(cursor);
            if (parent == null || parent.getParentId() == null || parent.getParentId().equals(cursor)) {
                return false;
            }
            cursor = parent.getParentId();
        }
        return false;
    }

    private String normalizeType(String type) {
        if (!StringUtils.hasText(type)) {
            return "menu";
        }
        String normalized = type.trim().toLowerCase();
        if (!normalized.equals("menu") && !normalized.equals("catalog")) {
            throw new IllegalArgumentException("菜单类型仅支持 menu 或 catalog");
        }
        return normalized;
    }

    private Long normalizeId(Long id) {
        return id == null || id <= 0 ? null : id;
    }

    private String normalizeText(String text) {
        return text == null ? "" : text.trim();
    }
}