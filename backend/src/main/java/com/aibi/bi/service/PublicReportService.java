package com.aibi.bi.service;

import com.aibi.bi.common.ForbiddenException;
import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiDashboardComponentMapper;
import com.aibi.bi.mapper.BiDashboardMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PublicReportService {

    private final BiDashboardMapper dashboardMapper;
    private final BiDashboardComponentMapper componentMapper;
    private final BiChartMapper chartMapper;
    private final ChartService chartService;
    private final ObjectMapper objectMapper;

    public PublicReportService(BiDashboardMapper dashboardMapper,
                               BiDashboardComponentMapper componentMapper,
                               BiChartMapper chartMapper,
                               ChartService chartService,
                               ObjectMapper objectMapper) {
        this.dashboardMapper = dashboardMapper;
        this.componentMapper = componentMapper;
        this.chartMapper = chartMapper;
        this.chartService = chartService;
        this.objectMapper = objectMapper;
    }

    public BiDashboard getPublishedDashboard(Long dashboardId, String token) {
        BiDashboard dashboard = dashboardMapper.findById(dashboardId);
        if (dashboard == null) {
            throw new IllegalArgumentException("仪表板不存在");
        }
        validateShareAccess(dashboard, token);
        return dashboard;
    }

    public List<BiDashboardComponent> listPublishedComponents(Long dashboardId, String token) {
        getPublishedDashboard(dashboardId, token);
        return componentMapper.listByDashboardId(dashboardId);
    }

    public List<BiChart> listPublishedCharts(Long dashboardId, String token) {
        return listPublishedComponents(dashboardId, token).stream()
                .map(component -> chartMapper.findById(component.getChartId()))
                .filter(chart -> chart != null)
                .toList();
    }

    public java.util.Map<String, Object> getPublishedComponentData(Long dashboardId,
                                                                   Long componentId,
                                                                   String token,
                                                                   String filterJson) {
        getPublishedDashboard(dashboardId, token);
        BiDashboardComponent component = componentMapper.findById(componentId);
        if (component == null || !dashboardId.equals(component.getDashboardId())) {
            throw new IllegalArgumentException("组件不存在");
        }
        return chartService.getChartData(component.getChartId(), filterJson, component.getConfigJson());
    }

    private void validateShareAccess(BiDashboard dashboard, String token) {
        try {
            JsonNode publish = objectMapper.readTree(normalizeConfig(dashboard.getConfigJson())).path("publish");
            String status = publish.path("status").asText("DRAFT");
            boolean allowAnonymousAccess = publish.path("allowAnonymousAccess").asBoolean(false);
            String shareToken = publish.path("shareToken").asText("");
            if (!"PUBLISHED".equalsIgnoreCase(status)) {
                throw new ForbiddenException("该报告尚未发布");
            }
            if (!allowAnonymousAccess) {
                throw new ForbiddenException("该报告仅允许登录后访问");
            }
            if (token == null || token.isBlank() || !shareToken.equals(token.trim())) {
                throw new ForbiddenException("分享链接无效或已失效");
            }
        } catch (ForbiddenException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ForbiddenException("报告发布配置无效");
        }
    }

    private String normalizeConfig(String configJson) {
        return (configJson == null || configJson.isBlank()) ? "{}" : configJson;
    }
}