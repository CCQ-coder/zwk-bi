package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDashboardComponent;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDashboardComponentMapper {
    List<BiDashboardComponent> listByDashboardId(Long dashboardId);
    BiDashboardComponent findById(Long id);
    void insert(BiDashboardComponent component);
    void update(BiDashboardComponent component);
    void deleteById(Long id);
    void deleteByDashboardId(Long dashboardId);
}
