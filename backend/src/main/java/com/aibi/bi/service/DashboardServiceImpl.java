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
}