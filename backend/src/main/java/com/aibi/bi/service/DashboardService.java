package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.model.response.DashboardSummaryResponse;

import java.util.List;

public interface DashboardService {

    List<BiDashboard> list();

    BiDashboard getById(Long id);

    BiDashboard create(BiDashboard req);

    BiDashboard update(Long id, BiDashboard req);

    void delete(Long id);

    DashboardSummaryResponse getDefaultDashboard();
}
