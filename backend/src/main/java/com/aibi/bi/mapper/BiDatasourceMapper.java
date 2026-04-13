package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDatasource;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDatasourceMapper {
    List<BiDatasource> listAll();

    BiDatasource findById(Long id);

    int insert(BiDatasource datasource);

    int update(BiDatasource datasource);

    int deleteById(Long id);

    long countAll();
}
