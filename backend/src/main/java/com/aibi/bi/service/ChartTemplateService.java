package com.aibi.bi.service;

import com.aibi.bi.auth.AuthContext;
import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiChartTemplate;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiChartTemplateMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChartTemplateService {

    private final BiChartTemplateMapper mapper;
    private final BiChartMapper chartMapper;
    private final ObjectMapper objectMapper;

    public ChartTemplateService(BiChartTemplateMapper mapper,
                                BiChartMapper chartMapper,
                                ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.chartMapper = chartMapper;
        this.objectMapper = objectMapper;
    }

    public List<BiChartTemplate> list() {
        return mapper.listAll();
    }

    public BiChartTemplate getById(Long id) {
        return mapper.findById(id);
    }

    public BiChartTemplate create(BiChartTemplate req) {
        if (!StringUtils.hasText(req.getName())) throw new IllegalArgumentException("模板名称不能为空");
        if (!StringUtils.hasText(req.getChartType())) throw new IllegalArgumentException("图表类型不能为空");
        if (!StringUtils.hasText(req.getConfigJson())) req.setConfigJson("{}");
        req.setBuiltIn(Boolean.FALSE);
        req.setSortOrder(1000);
        req.setCreatedBy(StringUtils.hasText(AuthContext.username()) ? AuthContext.username() : "system");
        mapper.insert(req);
        return req;
    }

    public BiChartTemplate update(Long id, BiChartTemplate req) {
        BiChartTemplate existing = mapper.findById(id);
        if (existing == null) throw new IllegalArgumentException("模板不存在: " + id);
        if (Boolean.TRUE.equals(existing.getBuiltIn())) throw new IllegalArgumentException("默认组件不允许直接修改");
        if (StringUtils.hasText(req.getName())) existing.setName(req.getName());
        if (req.getDescription() != null) existing.setDescription(req.getDescription());
        if (StringUtils.hasText(req.getChartType())) existing.setChartType(req.getChartType());
        if (req.getConfigJson() != null) existing.setConfigJson(req.getConfigJson());
        mapper.update(existing);
        return existing;
    }

    public void delete(Long id) {
        BiChartTemplate existing = mapper.findById(id);
        if (existing == null) {
            return;
        }
        if (Boolean.TRUE.equals(existing.getBuiltIn())) throw new IllegalArgumentException("默认组件不允许删除");
        mapper.deleteById(id);
    }

    public void ensureBuiltinAssets() {
        List<BiChartTemplate> existingTemplates = mapper.listAll();
        Set<String> existingNames = existingTemplates.stream()
                .map(BiChartTemplate::getName)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());

        List<BiChart> charts = chartMapper.listAll();
        if (charts.isEmpty()) {
            return;
        }

        for (BiChartTemplate template : buildBuiltinAssets(charts)) {
            if (existingNames.contains(template.getName())) {
                continue;
            }
            mapper.insert(template);
        }
    }

    private List<BiChartTemplate> buildBuiltinAssets(List<BiChart> charts) {
        List<BiChartTemplate> assets = new ArrayList<>();
        BiChart trendChart = pickChart(charts, "line", true, true);
        BiChart compareChart = pickChart(charts, "bar", true, true);
        BiChart rankChart = pickChart(charts, "bar_horizontal", true, true);
        BiChart ratioChart = pickChart(charts, "pie", true, true);
        BiChart metricChart = pickChart(charts, "gauge", false, true);
        BiChart detailChart = pickChart(charts, "table", false, false);
        BiChart radarChart = pickChart(charts, "radar", true, true);
        BiChart scatterChart = pickChart(charts, "scatter", true, true);
        BiChart funnelChart = pickChart(charts, "funnel", true, true);

        assets.add(createBuiltinAsset("晨光趋势卡", "line", 10, "适合首页趋势区，默认柔和渐变和面积填充。", trendChart, Map.of(
                "theme", "海湾晨光",
                "bgColor", "#f6fbff",
                "smooth", true,
                "areaFill", true,
                "showGrid", true,
                "showLabel", false,
                "legendPos", "top"
        ), 560, 320));
        assets.add(createBuiltinAsset("经营对比卡", "bar", 20, "适合经营总览中的分类对比。", compareChart, Map.of(
                "theme", "琥珀橙金",
                "bgColor", "#fffaf3",
                "barRadius", 10,
                "barMaxWidth", 32,
                "showGrid", false,
                "legendPos", "bottom"
        ), 520, 320));
        assets.add(createBuiltinAsset("排行条形卡", "bar_horizontal", 30, "适合 TopN 榜单和长名称类目。", rankChart, Map.of(
                "theme", "山岚青绿",
                "bgColor", "#f5fcf8",
                "barRadius", 12,
                "barMaxWidth", 26,
                "showLabel", true,
                "showGrid", false
        ), 520, 340));
        assets.add(createBuiltinAsset("结构占比卡", "doughnut", 40, "适合结构占比、贡献度分析。", ratioChart, Map.of(
                "theme", "霓光星砂",
                "bgColor", "#fff9fb",
                "showLabel", true,
                "legendPos", "right"
        ), 420, 320));
        assets.add(createBuiltinAsset("转化漏斗卡", "funnel", 50, "适合阶段转化与流程流失分析。", funnelChart, Map.of(
                "theme", "暮光珊瑚",
                "bgColor", "#fff8f5",
                "showLabel", true,
                "legendPos", "bottom"
        ), 420, 320));
        assets.add(createBuiltinAsset("目标仪表卡", "gauge", 60, "适合完成率、达成率和告警值展示。", metricChart, Map.of(
                "theme", "深海荧光",
                "bgColor", "#f4fbff",
                "showLabel", false
        ), 360, 300));
        assets.add(createBuiltinAsset("能力雷达卡", "radar", 70, "适合多维度能力、质量评分等场景。", radarChart, Map.of(
                "theme", "山岚青绿",
                "bgColor", "#f8fbff",
                "showLabel", true,
                "legendPos", "top"
        ), 480, 340));
        assets.add(createBuiltinAsset("关系散点卡", "scatter", 80, "适合相关性、分布和聚类趋势观察。", scatterChart, Map.of(
                "theme", "深海荧光",
                "bgColor", "#f5fbff",
                "showLabel", false,
                "legendPos", "top"
        ), 520, 340));
        assets.add(createBuiltinAsset("经营明细表", "table", 90, "适合明细追踪、问题回溯和导出。", detailChart, Map.of(
                "theme", "海湾晨光",
                "bgColor", "#ffffff",
                "showLabel", true
        ), 640, 360));

        return assets;
    }

    private BiChart pickChart(List<BiChart> charts, String preferredType, boolean requiresDimension, boolean requiresMetric) {
        return charts.stream()
                .filter(chart -> !requiresDimension || StringUtils.hasText(chart.getXField()))
                .filter(chart -> !requiresMetric || StringUtils.hasText(chart.getYField()))
                .filter(chart -> preferredType.equals(chart.getChartType()))
                .findFirst()
                .orElseGet(() -> charts.stream()
                        .filter(chart -> !requiresDimension || StringUtils.hasText(chart.getXField()))
                        .filter(chart -> !requiresMetric || StringUtils.hasText(chart.getYField()))
                        .findFirst()
                        .orElse(charts.get(0)));
    }

    private BiChartTemplate createBuiltinAsset(String name,
                                               String chartType,
                                               int sortOrder,
                                               String description,
                                               BiChart sourceChart,
                                               Map<String, Object> stylePatch,
                                               int width,
                                               int height) {
        BiChartTemplate template = new BiChartTemplate();
        template.setName(name);
        template.setDescription(description);
        template.setChartType(chartType);
        template.setBuiltIn(Boolean.TRUE);
        template.setSortOrder(sortOrder);
        template.setCreatedBy("system");
        template.setConfigJson(buildComponentAssetConfig(name, chartType, sourceChart, stylePatch, width, height));
        return template;
    }

    private String buildComponentAssetConfig(String name,
                                             String chartType,
                                             BiChart sourceChart,
                                             Map<String, Object> stylePatch,
                                             int width,
                                             int height) {
        Map<String, Object> chart = new LinkedHashMap<>();
        chart.put("name", name);
        chart.put("datasetId", sourceChart.getDatasetId());
        chart.put("chartType", chartType);
        chart.put("xField", sourceChart.getXField());
        chart.put("yField", sourceChart.getYField());
        chart.put("groupField", sourceChart.getGroupField());

        Map<String, Object> style = new LinkedHashMap<>();
        style.put("theme", "海湾晨光");
        style.put("bgColor", "#ffffff");
        style.put("showLabel", Boolean.TRUE);
        style.put("labelSize", 12);
        style.put("showXName", Boolean.FALSE);
        style.put("showYName", Boolean.FALSE);
        style.put("showGrid", Boolean.TRUE);
        style.put("smooth", Boolean.FALSE);
        style.put("areaFill", Boolean.FALSE);
        style.put("barRadius", 8);
        style.put("barMaxWidth", 36);
        style.put("legendPos", "bottom");
        style.putAll(stylePatch);

        Map<String, Object> interaction = new LinkedHashMap<>();
        interaction.put("clickAction", "filter");
        interaction.put("enableClickLinkage", Boolean.TRUE);
        interaction.put("allowManualFilters", Boolean.TRUE);
        interaction.put("linkageFieldMode", "auto");
        interaction.put("linkageField", "");

        Map<String, Object> layout = new LinkedHashMap<>();
        layout.put("width", width);
        layout.put("height", height);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("chart", chart);
        root.put("style", style);
        root.put("interaction", interaction);
        root.put("layout", layout);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("默认组件配置生成失败", ex);
        }
    }
}
