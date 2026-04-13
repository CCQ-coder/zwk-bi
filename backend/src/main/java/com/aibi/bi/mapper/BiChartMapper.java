package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiChart;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiChartMapper {
    List<BiChart> listAll();

    BiChart findById(Long id);

    int insert(BiChart chart);

    int update(BiChart chart);

    int deleteById(Long id);

    List<BiChart> listByDashboardId(Long dashboardId);

    long countAll();
}
