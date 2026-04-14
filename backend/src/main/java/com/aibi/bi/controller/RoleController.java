package com.aibi.bi.controller;

import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.SysRole;
import com.aibi.bi.model.request.UpdateRoleMenusRequest;
import com.aibi.bi.service.RoleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequireRoles("ADMIN")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ApiResponse<List<SysRole>> list() {
        return ApiResponse.ok(roleService.listRoles());
    }

    @GetMapping("/{id}/menu-ids")
    public ApiResponse<List<Long>> listRoleMenuIds(@PathVariable Long id) {
        return ApiResponse.ok(roleService.listRoleMenuIds(id));
    }

    @PutMapping("/{id}/menu-ids")
    public ApiResponse<List<Long>> updateRoleMenuIds(@PathVariable Long id,
                                                     @RequestBody UpdateRoleMenusRequest request) {
        return ApiResponse.ok(roleService.updateRoleMenus(id, request.getMenuIds()));
    }
}