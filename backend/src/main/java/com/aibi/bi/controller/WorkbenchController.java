package com.aibi.bi.controller;

import com.aibi.bi.auth.AuthContext;
import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.model.response.WorkbenchOverviewResponse;
import com.aibi.bi.service.WorkbenchOverviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workbench")
public class WorkbenchController {

    private final WorkbenchOverviewService workbenchOverviewService;

    public WorkbenchController(WorkbenchOverviewService workbenchOverviewService) {
        this.workbenchOverviewService = workbenchOverviewService;
    }

    @GetMapping("/overview")
    public ApiResponse<WorkbenchOverviewResponse> overview() {
        return ApiResponse.ok(workbenchOverviewService.getOverview(AuthContext.userId(), AuthContext.role()));
    }
}