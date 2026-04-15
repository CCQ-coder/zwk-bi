package com.aibi.bi.service;

import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.model.request.CreateChartRequest;
import com.aibi.bi.model.request.UpdateChartRequest;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ChartService {

    private final BiChartMapper biChartMapper;
    private final BiDatasetMapper biDatasetMapper;
    private final BiDatasourceMapper biDatasourceMapper;
    private final JdbcPreviewService jdbcPreviewService;
    private final DatasetService datasetService;
    private final ObjectMapper objectMapper;

    public ChartService(BiChartMapper biChartMapper,
                        BiDatasetMapper biDatasetMapper,
                        BiDatasourceMapper biDatasourceMapper,
                        JdbcPreviewService jdbcPreviewService,
                        DatasetService datasetService,
                        ObjectMapper objectMapper) {
        this.biChartMapper = biChartMapper;
        this.biDatasetMapper = biDatasetMapper;
        this.biDatasourceMapper = biDatasourceMapper;
        this.jdbcPreviewService = jdbcPreviewService;
        this.datasetService = datasetService;
        this.objectMapper = objectMapper;
    }

    public List<BiChart> list() {
        return biChartMapper.listAll();
    }

    public BiChart getById(Long id) {
        return biChartMapper.findById(id);
    }

    public BiChart create(CreateChartRequest request) {
        BiChart entity = new BiChart();
        entity.setName(request.getName());
        entity.setDatasetId(request.getDatasetId());
        entity.setChartType(request.getChartType());
        entity.setXField(request.getXField());
        entity.setYField(request.getYField());
        entity.setGroupField(request.getGroupField());
        biChartMapper.insert(entity);
        return entity;
    }

    public BiChart update(Long id, UpdateChartRequest request) {
        BiChart entity = biChartMapper.findById(id);
        if (entity == null) {
            throw new IllegalArgumentException("Chart not found: " + id);
        }
        entity.setName(request.getName());
        entity.setDatasetId(request.getDatasetId());
        entity.setChartType(request.getChartType());
        entity.setXField(request.getXField());
        entity.setYField(request.getYField());
        entity.setGroupField(request.getGroupField());
        biChartMapper.update(entity);
        return entity;
    }

    public void delete(Long id) {
        biChartMapper.deleteById(id);
    }

    /**
     * Execute the chart's dataset SQL and aggregate data for ECharts rendering.
     * Returns: { labels:[...], series:[{name, data:[...]}] }
     */
    public Map<String, Object> getChartData(Long chartId, String filterJson, String configJson) {
        BiChart chart = biChartMapper.findById(chartId);
        if (chart == null) throw new IllegalArgumentException("Chart not found: " + chartId);

        ResolvedChartConfig resolvedConfig = resolveChartConfig(chart, configJson);

        BiDataset dataset = biDatasetMapper.findById(resolvedConfig.datasetId());
        if (dataset == null) throw new IllegalArgumentException("Dataset not found");

        DatasetPreviewResponse preview;
        if (dataset.getDatasourceId() == null || dataset.getDatasourceId() == 0L) {
            preview = datasetService.getDemoPreviewResponse(dataset.getSqlText());
        } else {
            BiDatasource datasource = biDatasourceMapper.findById(dataset.getDatasourceId());
            if (datasource == null) throw new IllegalArgumentException("Datasource not found");
            preview = jdbcPreviewService.preview(datasource, dataset.getSqlText());
        }
        Map<String, String> filters = parseFilters(filterJson);
        List<Map<String, Object>> rows = applyFilters(preview.getRows(), filters);

        String xField = resolvedConfig.xField();
        String yField = resolvedConfig.yField();
        String groupField = resolvedConfig.groupField();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("columns", preview.getColumns());
        result.put("chartType", resolvedConfig.chartType());

        if (xField == null || xField.isEmpty() || yField == null || yField.isEmpty()) {
            // No field config: just return raw rows
            result.put("labels", List.of());
            result.put("series", List.of());
            result.put("rawRows", rows);
            result.put("filters", filters);
            return result;
        }

        if (groupField != null && !groupField.isEmpty()) {
            // Multi-series grouped by groupField
            LinkedHashMap<String, List<Object>> xMap = new LinkedHashMap<>();
            LinkedHashMap<String, LinkedHashMap<String, Object>> seriesAgg = new LinkedHashMap<>();

            for (Map<String, Object> row : rows) {
                String xVal = String.valueOf(row.getOrDefault(xField, ""));
                String grpVal = String.valueOf(row.getOrDefault(groupField, ""));
                xMap.put(xVal, List.of());
                seriesAgg.computeIfAbsent(grpVal, k -> new LinkedHashMap<>())
                         .merge(xVal, row.getOrDefault(yField, 0),
                                (a, b) -> addNumbers(a, b));
            }

            List<String> labels = new ArrayList<>(xMap.keySet());
            List<Map<String, Object>> series = new ArrayList<>();
            for (Map.Entry<String, LinkedHashMap<String, Object>> entry : seriesAgg.entrySet()) {
                List<Object> data = new ArrayList<>();
                for (String lbl : labels) {
                    data.add(entry.getValue().getOrDefault(lbl, 0));
                }
                series.add(Map.of("name", entry.getKey(), "data", data));
            }
            result.put("labels", labels);
            result.put("series", series);
        } else {
            // Single series: aggregate y by x
            LinkedHashMap<String, Object> agg = new LinkedHashMap<>();
            for (Map<String, Object> row : rows) {
                String xVal = String.valueOf(row.getOrDefault(xField, ""));
                agg.merge(xVal, row.getOrDefault(yField, 0), (a, b) -> addNumbers(a, b));
            }
            List<String> labels = new ArrayList<>(agg.keySet());
            List<Object> data = new ArrayList<>(agg.values());
            result.put("labels", labels);
            result.put("series", List.of(Map.of("name", yField, "data", data)));
        }

        result.put("rawRows", rows);
        result.put("filters", filters);

        return result;
    }

    private ResolvedChartConfig resolveChartConfig(BiChart chart, String configJson) {
        Long datasetId = chart.getDatasetId();
        String chartType = chart.getChartType();
        String xField = chart.getXField();
        String yField = chart.getYField();
        String groupField = chart.getGroupField();

        if (configJson == null || configJson.isBlank()) {
            return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField);
        }

        try {
            JsonNode chartNode = objectMapper.readTree(configJson).path("chart");
            if (!chartNode.isObject()) {
                return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField);
            }

            datasetId = readLong(chartNode.get("datasetId"), datasetId);
            chartType = readText(chartNode.get("chartType"), chartType);
            xField = readText(chartNode.get("xField"), xField);
            yField = readText(chartNode.get("yField"), yField);
            groupField = readText(chartNode.get("groupField"), groupField);
            return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField);
        } catch (Exception ex) {
            throw new IllegalArgumentException("组件配置格式不正确");
        }
    }

    private Long readLong(JsonNode node, Long fallback) {
        if (node == null || node.isNull()) {
            return fallback;
        }
        if (node.isNumber()) {
            return node.longValue();
        }
        String text = node.asText("").trim();
        if (text.isEmpty()) {
            return fallback;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String readText(JsonNode node, String fallback) {
        if (node == null || node.isNull()) {
            return fallback;
        }
        String text = node.asText("").trim();
        return text.isEmpty() ? fallback : text;
    }

    private Map<String, String> parseFilters(String filterJson) {
        if (filterJson == null || filterJson.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, String> parsed = objectMapper.readValue(filterJson, new TypeReference<Map<String, String>>() {});
            Map<String, String> normalized = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : parsed.entrySet()) {
                String key = entry.getKey() == null ? "" : entry.getKey().trim();
                String value = entry.getValue() == null ? "" : entry.getValue().trim();
                if (!key.isEmpty() && !value.isEmpty()) {
                    normalized.put(key, value);
                }
            }
            return normalized;
        } catch (Exception ex) {
            throw new IllegalArgumentException("过滤参数格式不正确");
        }
    }

    private List<Map<String, Object>> applyFilters(List<Map<String, Object>> rows, Map<String, String> filters) {
        if (filters.isEmpty()) {
            return rows;
        }
        return rows.stream()
                .filter(row -> filters.entrySet().stream().allMatch(entry -> matchFilterValue(row.get(entry.getKey()), entry.getValue())))
                .toList();
    }

    private boolean matchFilterValue(Object rawValue, String expectedValue) {
        if (rawValue == null) {
            return false;
        }
        String actual = String.valueOf(rawValue).trim();
        if (actual.equalsIgnoreCase(expectedValue)) {
            return true;
        }
        return actual.toLowerCase(Locale.ROOT).contains(expectedValue.toLowerCase(Locale.ROOT));
    }

    private Object addNumbers(Object a, Object b) {
        try {
            double da = Double.parseDouble(String.valueOf(a));
            double db = Double.parseDouble(String.valueOf(b));
            double sum = da + db;
            return sum == Math.floor(sum) ? (long) sum : sum;
        } catch (NumberFormatException e) {
            return a;
        }
    }

    private record ResolvedChartConfig(Long datasetId,
                                       String chartType,
                                       String xField,
                                       String yField,
                                       String groupField) {
    }
}

