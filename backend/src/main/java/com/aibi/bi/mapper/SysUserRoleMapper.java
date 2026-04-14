package com.aibi.bi.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysUserRoleMapper {
    int deleteByUserId(Long userId);

    int insert(@Param("userId") Long userId, @Param("roleId") Long roleId);
}