package com.aibi.bi.model.response;

import java.util.List;

public record WorkbenchOverviewResponse(
        WorkbenchSummaryResponse summary,
        WorkbenchLoginOverviewResponse login,
        List<WorkbenchScreenSummaryResponse> screens
) {
}