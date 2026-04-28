package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDatasourceGroup;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDatasourceGroupMapper {
    List<BiDatasourceGroup> listAll();

    BiDatasourceGroup findById(Long id);

    int insert(BiDatasourceGroup group);

    int update(BiDatasourceGroup group);

    int deleteById(Long id);
}