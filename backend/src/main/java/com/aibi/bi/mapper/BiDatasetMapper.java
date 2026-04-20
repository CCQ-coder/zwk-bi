package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDataset;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDatasetMapper {
    List<BiDataset> listAll();

    BiDataset findById(Long id);

    long countByDatasourceId(Long datasourceId);

    int insert(BiDataset dataset);

    int update(BiDataset dataset);

    int deleteById(Long id);

    long countAll();
}
