package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiChartTemplate;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiChartTemplateMapper {
    List<BiChartTemplate> listAll();
    BiChartTemplate findById(Long id);
    void insert(BiChartTemplate template);
    void update(BiChartTemplate template);
    void deleteById(Long id);
}
