package com.aibi.bi.service;

import com.aibi.bi.model.response.WorkbenchOverviewResponse;

public interface WorkbenchOverviewService {

    WorkbenchOverviewResponse getOverview(Long userId, String role);
}