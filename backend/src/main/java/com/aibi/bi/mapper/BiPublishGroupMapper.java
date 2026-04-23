package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiPublishGroup;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BiPublishGroupMapper {
    List<BiPublishGroup> listAll();

    List<BiPublishGroup> listVisible();

    BiPublishGroup findById(Long id);

    long countByName(@Param("name") String name, @Param("excludeId") Long excludeId);

    int insert(BiPublishGroup group);

    int update(BiPublishGroup group);

    int deleteById(Long id);
}