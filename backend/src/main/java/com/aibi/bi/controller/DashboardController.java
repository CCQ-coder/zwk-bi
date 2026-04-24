package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.model.response.DashboardSummaryResponse;
import com.aibi.bi.model.response.PageResult;
import com.aibi.bi.service.DashboardService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/default")
    public ApiResponse<DashboardSummaryResponse> getDefault() {
        return ApiResponse.ok(dashboardService.getDefaultDashboard());
    }

    @GetMapping
    public ApiResponse<List<BiDashboard>> list() {
        return ApiResponse.ok(dashboardService.list());
    }

    @GetMapping("/page")
    public ApiResponse<PageResult<BiDashboard>> listPage(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String publishStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize
    ) {
        return ApiResponse.ok(dashboardService.listPage(keyword, scene, publishStatus, page, pageSize));
    }

    @GetMapping("/{id}")
    public ApiResponse<BiDashboard> getById(@PathVariable Long id) {
        BiDashboard d = dashboardService.getById(id);
        if (d == null) return ApiResponse.fail(40401, "仪表板不存在");
        return ApiResponse.ok(d);
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDashboard> create(@RequestBody BiDashboard req) {
        return ApiResponse.ok(dashboardService.create(req));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<BiDashboard> update(@PathVariable Long id, @RequestBody BiDashboard req) {
        return ApiResponse.ok(dashboardService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        dashboardService.delete(id);
        return ApiResponse.ok(null);
    }
}
