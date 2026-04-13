package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.service.DashboardComponentService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 仪表板组件布局接口
 * GET    /api/dashboards/{dashboardId}/components        — 获取组件列表
 * POST   /api/dashboards/{dashboardId}/components        — 添加组件
 * PUT    /api/dashboards/{dashboardId}/components/{id}   — 更新组件位置/尺寸
 * DELETE /api/dashboards/{dashboardId}/components/{id}   — 移除组件
 */
@RestController
@RequestMapping("/api/dashboards/{dashboardId}/components")
public class DashboardComponentController {

    private final DashboardComponentService service;

    public DashboardComponentController(DashboardComponentService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<BiDashboardComponent>> list(@PathVariable Long dashboardId) {
        return ApiResponse.ok(service.listByDashboard(dashboardId));
    }

    @PostMapping
    public ApiResponse<BiDashboardComponent> add(@PathVariable Long dashboardId,
                                                  @RequestBody BiDashboardComponent req) {
        req.setDashboardId(dashboardId);
        return ApiResponse.ok(service.add(req));
    }

    @PutMapping("/{id}")
    public ApiResponse<BiDashboardComponent> update(@PathVariable Long dashboardId,
                                                     @PathVariable Long id,
                                                     @RequestBody BiDashboardComponent req) {
        return ApiResponse.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long dashboardId,
                                    @PathVariable Long id) {
        service.delete(id);
        return ApiResponse.ok(null);
    }
}
