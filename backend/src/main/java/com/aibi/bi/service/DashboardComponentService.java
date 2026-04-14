package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboardComponent;

import java.util.List;

public interface DashboardComponentService {

    List<BiDashboardComponent> listByDashboard(Long dashboardId);

    BiDashboardComponent add(BiDashboardComponent component);

    BiDashboardComponent update(Long dashboardId, Long id, BiDashboardComponent req);

    void delete(Long dashboardId, Long id);

    void deleteByDashboard(Long dashboardId);
}
