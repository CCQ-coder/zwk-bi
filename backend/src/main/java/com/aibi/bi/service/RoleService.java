package com.aibi.bi.service;

import com.aibi.bi.domain.SysRole;

import java.util.List;

public interface RoleService {
    List<SysRole> listRoles();

    List<Long> listRoleMenuIds(Long roleId);

    List<Long> updateRoleMenus(Long roleId, List<Long> menuIds);
}