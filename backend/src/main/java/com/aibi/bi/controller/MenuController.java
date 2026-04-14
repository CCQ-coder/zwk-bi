package com.aibi.bi.controller;

import com.aibi.bi.auth.AuthContext;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.SysMenu;
import com.aibi.bi.service.MenuService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/current")
    public ApiResponse<List<SysMenu>> currentMenus() {
        return ApiResponse.ok(menuService.listCurrentMenus(AuthContext.userId()));
    }

    @GetMapping
    @RequireRoles("ADMIN")
    public ApiResponse<List<SysMenu>> listAllMenus() {
        return ApiResponse.ok(menuService.listAllMenus());
    }

    @PostMapping
    @RequireRoles("ADMIN")
    public ApiResponse<SysMenu> create(@RequestBody SysMenu request) {
        return ApiResponse.ok(menuService.createMenu(request));
    }

    @PutMapping("/{id}")
    @RequireRoles("ADMIN")
    public ApiResponse<SysMenu> update(@PathVariable Long id, @RequestBody SysMenu request) {
        return ApiResponse.ok(menuService.updateMenu(id, request));
    }

    @DeleteMapping("/{id}")
    @RequireRoles("ADMIN")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        menuService.deleteMenu(id);
        return ApiResponse.ok(null);
    }
}