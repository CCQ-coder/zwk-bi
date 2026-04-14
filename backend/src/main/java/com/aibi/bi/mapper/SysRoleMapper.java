package com.aibi.bi.mapper;

import com.aibi.bi.domain.SysRole;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SysRoleMapper {
    List<SysRole> listAllWithStats();

    SysRole findById(Long id);

    SysRole findByName(String name);
}