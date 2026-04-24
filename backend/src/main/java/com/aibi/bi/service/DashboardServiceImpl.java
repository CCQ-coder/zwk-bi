package com.aibi.bi.service;

import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.domain.BiDashboardComponent;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiDashboardComponentMapper;
import com.aibi.bi.mapper.BiDashboardMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.model.response.DashboardKpiResponse;
import com.aibi.bi.model.response.DashboardSummaryResponse;
import com.aibi.bi.model.response.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final BiDashboardMapper biDashboardMapper;
    private final BiDashboardComponentMapper componentMapper;
    private final BiChartMapper biChartMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final BiDatasetMapper biDatasetMapper;

    public DashboardServiceImpl(
            BiDashboardMapper biDashboardMapper,
            BiDashboardComponentMapper componentMapper,
            BiChartMapper biChartMapper,
            BiDatasourceMapper biDatasourceMapper,
            BiDatasetMapper biDatasetMapper
    ) {
        this.biDashboardMapper = biDashboardMapper;
        this.componentMapper = componentMapper;
        this.biChartMapper = biChartMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.biDatasetMapper = biDatasetMapper;
    }

    @Override
    public List<BiDashboard> list() {
        return biDashboardMapper.listAll();
    }

    @Override
    public PageResult<BiDashboard> listPage(String keyword, String scene, String publishStatus, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safePageSize = Math.max(1, Math.min(pageSize, 60));
        int offset = (safePage - 1) * safePageSize;
        String normalizedKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String normalizedScene = normalizeScene(scene);
        String normalizedPublishStatus = normalizePublishStatus(publishStatus);

        List<BiDashboard> items = biDashboardMapper.listPage(normalizedKeyword, normalizedScene, normalizedPublishStatus, offset, safePageSize);
        long total = biDashboardMapper.countPage(normalizedKeyword, normalizedScene, normalizedPublishStatus);
        return PageResult.of(items, total, safePage, safePageSize);
    }

    @Override
    public BiDashboard getById(Long id) {
        return biDashboardMapper.findById(id);
    }

    @Override
    public BiDashboard create(BiDashboard req) {
        if (!StringUtils.hasText(req.getName())) {
            throw new IllegalArgumentException("仪表板名称不能为空");
        }
        if (!StringUtils.hasText(req.getConfigJson())) {
            req.setConfigJson("{}");
        }
        biDashboardMapper.insert(req);
        return req;
    }

    @Override
    public BiDashboard update(Long id, BiDashboard req) {
        BiDashboard existing = biDashboardMapper.findById(id);
        if (existing == null) {
            throw new IllegalArgumentException("仪表板不存在: " + id);
        }
        if (StringUtils.hasText(req.getName())) {
            existing.setName(req.getName());
        }
        if (req.getConfigJson() != null) {
            existing.setConfigJson(req.getConfigJson());
        }
        biDashboardMapper.update(existing);
        return existing;
    }

    @Override
    public void delete(Long id) {
        componentMapper.deleteByDashboardId(id);
        biDashboardMapper.deleteById(id);
    }

    @Override
    public DashboardSummaryResponse getDefaultDashboard() {
        BiDashboard latestDashboard = biDashboardMapper.findLatest();

        DashboardKpiResponse kpi = new DashboardKpiResponse();
        kpi.setDashboardCount(biDashboardMapper.countAll());
        kpi.setChartCount(biChartMapper.countAll());
        kpi.setDatasetCount(biDatasetMapper.countAll());
        kpi.setDatasourceCount(biDatasourceMapper.countAll());

        DashboardSummaryResponse response = new DashboardSummaryResponse();
        if (latestDashboard == null) {
            response.setName("未配置看板");
            response.setKpi(kpi);
            response.setCharts(List.of());
            return response;
        }

        List<BiDashboardComponent> components = componentMapper.listByDashboardId(latestDashboard.getId());
        List<BiChart> charts = components.stream()
                .map(component -> biChartMapper.findById(component.getChartId()))
                .filter(chart -> chart != null)
                .toList();

        response.setName(latestDashboard.getName());
        response.setKpi(kpi);
        response.setCharts(charts);
        return response;
    }

    private String normalizeScene(String scene) {
        if (!StringUtils.hasText(scene)) {
            return null;
        }
        String normalized = scene.trim().toLowerCase();
        if ("screen".equals(normalized) || "dashboard".equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private String normalizePublishStatus(String publishStatus) {
        if (!StringUtils.hasText(publishStatus)) {
            return null;
        }
        String normalized = publishStatus.trim().toUpperCase();
        if ("PUBLISHED".equals(normalized) || "DRAFT".equals(normalized)) {
            return normalized;
        }
        return null;
    }
}