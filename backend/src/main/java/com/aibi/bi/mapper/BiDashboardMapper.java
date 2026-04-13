package com.aibi.bi.mapper;

import com.aibi.bi.domain.BiDashboard;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BiDashboardMapper {
    List<BiDashboard> listAll();

    BiDashboard findLatest();

    BiDashboard findById(Long id);

    void insert(BiDashboard dashboard);

    void update(BiDashboard dashboard);

    void deleteById(Long id);

    long countAll();
}
