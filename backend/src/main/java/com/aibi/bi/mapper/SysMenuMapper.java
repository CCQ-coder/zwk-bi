package com.aibi.bi.mapper;

import com.aibi.bi.domain.SysMenu;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysMenuMapper {
    List<SysMenu> listVisibleMenusByUserId(Long userId);

    List<SysMenu> listAll();

    SysMenu findById(Long id);

    long countByPath(@Param("path") String path, @Param("excludeId") Long excludeId);

    long countChildren(Long parentId);

    int insert(SysMenu menu);

    int update(SysMenu menu);

    int deleteById(Long id);
}