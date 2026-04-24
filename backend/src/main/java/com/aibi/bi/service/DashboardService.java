package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.model.response.DashboardSummaryResponse;
import com.aibi.bi.model.response.PageResult;

import java.util.List;

public interface DashboardService {

    List<BiDashboard> list();

    PageResult<BiDashboard> listPage(String keyword, String scene, String publishStatus, int page, int pageSize);

    BiDashboard getById(Long id);

    BiDashboard create(BiDashboard req);

    BiDashboard update(Long id, BiDashboard req);

    void delete(Long id);

    DashboardSummaryResponse getDefaultDashboard();
}
