package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.model.request.CreateDashboardComponentRequest;
import com.aibi.bi.model.request.UpdateDashboardComponentRequest;
import com.aibi.bi.model.response.DashboardComponentResponse;
import com.aibi.bi.service.DashboardComponentService;
import jakarta.validation.Valid;
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
    public ApiResponse<List<DashboardComponentResponse>> list(@PathVariable Long dashboardId) {
        return ApiResponse.ok(service.listByDashboard(dashboardId).stream().map(this::toResponse).toList());
    }

    @PostMapping
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DashboardComponentResponse> add(@PathVariable Long dashboardId,
                                                       @Valid @RequestBody CreateDashboardComponentRequest request) {
        return ApiResponse.ok(toResponse(service.add(toDomain(dashboardId, request))));
    }

    @PutMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<DashboardComponentResponse> update(@PathVariable Long dashboardId,
                                                          @PathVariable Long id,
                                                          @RequestBody UpdateDashboardComponentRequest request) {
        return ApiResponse.ok(toResponse(service.update(dashboardId, id, toDomain(request))));
    }

    @DeleteMapping("/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> delete(@PathVariable Long dashboardId,
                                    @PathVariable Long id) {
        service.delete(dashboardId, id);
        return ApiResponse.ok(null);
    }

    private BiDashboardComponent toDomain(Long dashboardId, CreateDashboardComponentRequest request) {
        BiDashboardComponent component = new BiDashboardComponent();
        component.setDashboardId(dashboardId);
        component.setChartId(request.getChartId());
        component.setPosX(request.getPosX());
        component.setPosY(request.getPosY());
        component.setWidth(request.getWidth());
        component.setHeight(request.getHeight());
        component.setZIndex(request.getZIndex());
        component.setConfigJson(request.getConfigJson());
        return component;
    }

    private BiDashboardComponent toDomain(UpdateDashboardComponentRequest request) {
        BiDashboardComponent component = new BiDashboardComponent();
        component.setChartId(request.getChartId());
        component.setPosX(request.getPosX());
        component.setPosY(request.getPosY());
        component.setWidth(request.getWidth());
        component.setHeight(request.getHeight());
        component.setZIndex(request.getZIndex());
        component.setConfigJson(request.getConfigJson());
        return component;
    }

    private DashboardComponentResponse toResponse(BiDashboardComponent component) {
        DashboardComponentResponse response = new DashboardComponentResponse();
        response.setId(component.getId());
        response.setDashboardId(component.getDashboardId());
        response.setChartId(component.getChartId());
        response.setPosX(component.getPosX());
        response.setPosY(component.getPosY());
        response.setWidth(component.getWidth());
        response.setHeight(component.getHeight());
        response.setZIndex(component.getZIndex());
        response.setConfigJson(component.getConfigJson());
        return response;
    }
}
