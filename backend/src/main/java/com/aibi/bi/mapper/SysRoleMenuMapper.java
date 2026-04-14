package com.aibi.bi.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysRoleMenuMapper {
    List<Long> listMenuIdsByRoleId(Long roleId);

    int deleteByRoleId(Long roleId);

    int deleteByMenuId(Long menuId);

    int insert(@Param("roleId") Long roleId, @Param("menuId") Long menuId);
}