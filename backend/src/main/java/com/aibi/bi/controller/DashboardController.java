package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.model.request.CreateDashboardRequest;
import com.aibi.bi.model.request.UpdateDashboardRequest;
import com.aibi.bi.model.response.DashboardResponse;
import com.aibi.bi.model.response.DashboardSummaryResponse;
import com.aibi.bi.model.response.PageResult;
import com.aibi.bi.service.DashboardService;
import jakarta.validation.Valid;
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
    public ApiResponse<List<DashboardResponse>> list() {
        return ApiResponse.ok(dashboardService.list().stream().map(this::toResponse).toList());
    }

    @GetMapping("/page")
    public ApiResponse<PageResult<DashboardResponse>> listPage(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String publishStatus,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int pageSize
    ) {
        PageResult<BiDashboard> pageResult = dashboardService.listPage(keyword, scene, publishStatus, page, pageSize);
        return ApiResponse.ok(PageResult.of(
                pageResult.getItems().stream().map(this::toResponse).toList(),
                pageResult.getTotal(),
                pageResult.getPage(),
                pageResult.getPageSize()
        ));
    }

    @GetMapping("/{id}")
    public ApiResponse<DashboardResponse> getById(@PathVariable Long id) {
        BiDashboard d = dashboardService.getById(id);
        if (d == null) return ApiResponse.fail(40401, "仪表板不存在");
        return ApiResponse.ok(toResponse(d));
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DashboardResponse> create(@Valid @RequestBody CreateDashboardRequest request) {
        return ApiResponse.ok(toResponse(dashboardService.create(toDomain(request))));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DashboardResponse> update(@PathVariable Long id, @RequestBody UpdateDashboardRequest request) {
        return ApiResponse.ok(toResponse(dashboardService.update(id, toDomain(request))));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long id) {
        dashboardService.delete(id);
        return ApiResponse.ok(null);
    }

    private BiDashboard toDomain(CreateDashboardRequest request) {
        BiDashboard dashboard = new BiDashboard();
        dashboard.setName(request.getName());
        dashboard.setConfigJson(request.getConfigJson());
        return dashboard;
    }

    private BiDashboard toDomain(UpdateDashboardRequest request) {
        BiDashboard dashboard = new BiDashboard();
        dashboard.setName(request.getName());
        dashboard.setConfigJson(request.getConfigJson());
        return dashboard;
    }

    private DashboardResponse toResponse(BiDashboard dashboard) {
        DashboardResponse response = new DashboardResponse();
        response.setId(dashboard.getId());
        response.setName(dashboard.getName());
        response.setConfigJson(dashboard.getConfigJson());
        response.setComponentCount(dashboard.getComponentCount());
        response.setCreatedAt(dashboard.getCreatedAt());
        return response;
    }
}
