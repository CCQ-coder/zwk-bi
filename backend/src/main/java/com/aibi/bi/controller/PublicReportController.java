package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.service.PublicReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/reports/{dashboardId}")
public class PublicReportController {

    private final PublicReportService publicReportService;

    public PublicReportController(PublicReportService publicReportService) {
        this.publicReportService = publicReportService;
    }

    @GetMapping
    public ApiResponse<BiDashboard> getDashboard(@PathVariable Long dashboardId,
                                                 @RequestParam String token) {
        return ApiResponse.ok(publicReportService.getPublishedDashboard(dashboardId, token));
    }

    @GetMapping("/components")
    public ApiResponse<List<BiDashboardComponent>> listComponents(@PathVariable Long dashboardId,
                                                                  @RequestParam String token) {
        return ApiResponse.ok(publicReportService.listPublishedComponents(dashboardId, token));
    }

    @GetMapping("/charts")
    public ApiResponse<List<BiChart>> listCharts(@PathVariable Long dashboardId,
                                                 @RequestParam String token) {
        return ApiResponse.ok(publicReportService.listPublishedCharts(dashboardId, token));
    }

    @GetMapping("/components/{componentId}/data")
    public ApiResponse<Map<String, Object>> getComponentData(@PathVariable Long dashboardId,
                                                             @PathVariable Long componentId,
                                                             @RequestParam String token,
                                                             @RequestParam(required = false) String filterJson) {
        return ApiResponse.ok(publicReportService.getPublishedComponentData(dashboardId, componentId, token, filterJson));
    }
}