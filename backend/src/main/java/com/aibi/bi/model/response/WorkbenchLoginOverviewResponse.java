package com.aibi.bi.model.response;

import java.util.List;

public record WorkbenchLoginOverviewResponse(
        boolean enabled,
        int successCount,
        int failCount,
        int activeUserCount,
        List<WorkbenchLoginTrendResponse> trend
) {
}