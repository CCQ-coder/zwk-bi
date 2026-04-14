package com.aibi.bi.service;

import com.aibi.bi.domain.SysMenu;

import java.util.List;

public interface MenuService {
    List<SysMenu> listCurrentMenus(Long userId);

    List<SysMenu> listAllMenus();

    SysMenu createMenu(SysMenu menu);

    SysMenu updateMenu(Long id, SysMenu menu);

    void deleteMenu(Long id);
}