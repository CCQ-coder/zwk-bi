package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDatasetField;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDatasetFieldMapper {
    List<BiDatasetField> listByDatasetId(Long datasetId);

    int deleteByDatasetId(Long datasetId);

    int batchInsert(List<BiDatasetField> fields);
}