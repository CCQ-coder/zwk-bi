package com.aibi.bi.service;

import com.aibi.bi.domain.BiChart;
import com.aibi.bi.domain.BiDataset;
import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiChartMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.model.request.ChartPageSourceQueryRequest;
import com.aibi.bi.model.request.CreateChartRequest;
import com.aibi.bi.model.request.DatasetPreviewRequest;
import com.aibi.bi.model.request.UpdateChartRequest;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ChartService {

    private static final Set<String> STATIC_WIDGET_TYPES = Set.of(
            "decor_border_frame",
            "decor_border_corner",
            "decor_border_glow",
            "decor_border_grid",
            "text_block",
            "single_field",
            "number_flipper",
            "table_rank",
            "iframe_single",
            "iframe_tabs",
            "hyperlink",
            "image_list",
            "text_list",
            "clock_display",
            "word_cloud",
            "qr_code",
            "business_trend",
            "metric_indicator",
            "icon_arrow_trend",
            "icon_warning_badge",
            "icon_location_pin",
            "icon_data_signal",
            "icon_user_badge",
            "icon_chart_mark"
    );

    private static final Set<String> RUNTIME_ROW_DATA_TYPES = Set.of(
            "table",
            "table_summary",
            "table_pivot",
            "table_rank",
            "text_block",
            "image_list",
            "text_list",
            "word_cloud",
            "iframe_single",
            "filter_button"
    );

    private static final Set<String> AGGREGATED_RAW_ROW_TYPES = Set.of("heatmap");
    private static final int DEFAULT_RUNTIME_ROW_LIMIT = 200;
    private static final int SINGLE_VALUE_RUNTIME_ROW_LIMIT = 20;
    private static final int MAX_TABLE_RUNTIME_ROW_LIMIT = 1000;

    private final BiChartMapper biChartMapper;
    private final BiDatasetMapper biDatasetMapper;
    private final DatasourceService datasourceService;
    private final DatasetService datasetService;
    private final JdbcPreviewService jdbcPreviewService;
    private final ObjectMapper objectMapper;

    public ChartService(BiChartMapper biChartMapper,
                        BiDatasetMapper biDatasetMapper,
                        DatasourceService datasourceService,
                        DatasetService datasetService,
                        JdbcPreviewService jdbcPreviewService,
                        ObjectMapper objectMapper) {
        this.biChartMapper = biChartMapper;
        this.biDatasetMapper = biDatasetMapper;
        this.datasourceService = datasourceService;
        this.datasetService = datasetService;
        this.jdbcPreviewService = jdbcPreviewService;
        this.objectMapper = objectMapper;
    }

    public List<BiChart> list() {
        return biChartMapper.listAll();
    }

    public BiChart getById(Long id) {
        return biChartMapper.findById(id);
    }

    public BiChart create(CreateChartRequest request) {
        validateDatasetRequirement(request.getChartType(), request.getDatasetId());
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
        validateDatasetRequirement(request.getChartType(), request.getDatasetId());
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

    public DatasetPreviewResponse queryDataset(Long datasetId) {
        if (datasetId == null) {
            throw new IllegalArgumentException("datasetId is required");
        }
        return datasetService.previewDataset(datasetId);
    }

    public DatasetPreviewResponse queryPageSql(DatasetPreviewRequest request) {
        if (request.getDatasourceId() == null || request.getDatasourceId() == 0L) {
            throw new IllegalArgumentException("datasourceId is required for page-sql query");
        }
        return datasourceService.previewDatasource(request.getDatasourceId(), request.getSqlText(), null);
    }

    public DatasetPreviewResponse queryPageSource(ChartPageSourceQueryRequest request) {
        if (request.getDatasourceId() == null || request.getDatasourceId() == 0L) {
            if (request.getRuntimeConfigText() == null || request.getRuntimeConfigText().isBlank()) {
                throw new IllegalArgumentException("datasourceId is required for page-source query");
            }
            return datasourceService.previewInlineJson(request.getRuntimeConfigText(), null);
        }
        return datasourceService.previewDatasource(request.getDatasourceId(), request.getSqlText(), request.getRuntimeConfigText());
    }

    public Map<String, Object> getChartData(Long chartId, String filterJson, String configJson) {
        BiChart chart = biChartMapper.findById(chartId);
        if (chart == null) {
            throw new IllegalArgumentException("Chart not found: " + chartId);
        }

        ResolvedChartConfig resolvedConfig = resolveChartConfig(chart, configJson);
        Map<String, String> filters = parseFilters(filterJson);
        Map<String, Object> emptyResult = buildEmptyResult(resolvedConfig.chartType(), filters);

        if ("DATASET".equalsIgnoreCase(resolvedConfig.sourceMode()) && resolvedConfig.datasetId() == null) {
            return emptyResult;
        }

        RuntimeSource runtimeSource = resolveRuntimeSource(resolvedConfig);
        if (runtimeSource == null) {
            return emptyResult;
        }

        if (requiresRawRowResponse(resolvedConfig)) {
            DatasetPreviewResponse preview = queryRuntimeRows(runtimeSource, resolveRuntimeRowLimit(resolvedConfig));
            if (preview == null) {
                return emptyResult;
            }
            List<Map<String, Object>> rows = applyFilters(preview.getRows(), filters);
            emptyResult.put("columns", preview.getColumns());
            emptyResult.put("rawRows", rows);
            return emptyResult;
        }

        return aggregateRuntimeData(runtimeSource, resolvedConfig, filters);
    }

    private Map<String, Object> aggregateRuntimeData(RuntimeSource runtimeSource,
                                                     ResolvedChartConfig resolvedConfig,
                                                     Map<String, String> filters) {
        if (runtimeSource.demoPreview() != null) {
            return aggregatePreviewRows(runtimeSource.demoPreview(), resolvedConfig, filters);
        }
        if (runtimeSource.datasource() == null) {
            return buildEmptyResult(resolvedConfig.chartType(), filters);
        }
        if (datasourceService.isDatabaseDatasource(runtimeSource.datasource())) {
            return aggregateDatabaseRows(runtimeSource.datasource(), runtimeSource.sqlText(), resolvedConfig, filters);
        }
        DatasetPreviewResponse preview = datasourceService.queryRuntimeDatasource(
                runtimeSource.datasource(),
                runtimeSource.sqlText(),
                runtimeSource.runtimeConfigText(),
                null
        );
        return aggregatePreviewRows(preview, resolvedConfig, filters);
    }

    private Map<String, Object> aggregateDatabaseRows(BiDatasource datasource,
                                                      String sqlText,
                                                      ResolvedChartConfig resolvedConfig,
                                                      Map<String, String> filters) {
        return jdbcPreviewService.executeQuery(datasource, sqlText, null, resultSet -> {
            List<String> columns = readColumns(resultSet.getMetaData());
            Map<String, Object> result = buildEmptyResult(resolvedConfig.chartType(), filters);
            result.put("columns", columns);

            if (AGGREGATED_RAW_ROW_TYPES.contains(resolvedConfig.chartType())) {
                aggregateHeatmapRows(resultSet, resolvedConfig, filters, result);
                return result;
            }
            if ("gauge".equals(resolvedConfig.chartType())) {
                aggregateGaugeRows(resultSet, resolvedConfig, filters, result);
                return result;
            }
            if ("scatter".equals(resolvedConfig.chartType())) {
                aggregateScatterRows(resultSet, resolvedConfig, filters, result);
                return result;
            }
            aggregateSeriesRows(resultSet, resolvedConfig, filters, result);
            return result;
        });
    }

    private Map<String, Object> aggregatePreviewRows(DatasetPreviewResponse preview,
                                                     ResolvedChartConfig resolvedConfig,
                                                     Map<String, String> filters) {
        Map<String, Object> result = buildEmptyResult(resolvedConfig.chartType(), filters);
        if (preview == null) {
            return result;
        }

        List<Map<String, Object>> rows = applyFilters(preview.getRows(), filters);
        result.put("columns", preview.getColumns());

        if (AGGREGATED_RAW_ROW_TYPES.contains(resolvedConfig.chartType())) {
            aggregateHeatmapRows(rows, resolvedConfig, result);
            return result;
        }
        if ("gauge".equals(resolvedConfig.chartType())) {
            aggregateGaugeRows(rows, resolvedConfig, result);
            return result;
        }
        if ("scatter".equals(resolvedConfig.chartType())) {
            aggregateScatterRows(rows, resolvedConfig, result);
            return result;
        }
        aggregateSeriesRows(rows, resolvedConfig, result);
        return result;
    }

    private DatasetPreviewResponse queryRuntimeRows(RuntimeSource runtimeSource, int maxRows) {
        if (runtimeSource.demoPreview() != null) {
            return limitPreviewRows(runtimeSource.demoPreview(), maxRows);
        }
        if (runtimeSource.datasource() == null) {
            return null;
        }
        return datasourceService.queryRuntimeDatasource(
                runtimeSource.datasource(),
                runtimeSource.sqlText(),
                runtimeSource.runtimeConfigText(),
                maxRows
        );
    }

    private DatasetPreviewResponse limitPreviewRows(DatasetPreviewResponse preview, int maxRows) {
        DatasetPreviewResponse limited = new DatasetPreviewResponse();
        limited.setColumns(preview.getColumns());
        List<Map<String, Object>> rows = preview.getRows() == null
                ? List.of()
                : preview.getRows().subList(0, Math.min(maxRows, preview.getRows().size()));
        limited.setRows(new ArrayList<>(rows));
        limited.setRowCount(rows.size());
        return limited;
    }

    private RuntimeSource resolveRuntimeSource(ResolvedChartConfig resolvedConfig) {
        if ("PAGE_SQL".equalsIgnoreCase(resolvedConfig.sourceMode())) {
            if (resolvedConfig.datasourceId() == null || resolvedConfig.datasourceId() == 0L) {
                if (resolvedConfig.runtimeConfigText() == null || resolvedConfig.runtimeConfigText().isBlank()) {
                    return null;
                }
                return new RuntimeSource(
                        null,
                        resolvedConfig.sqlText(),
                        resolvedConfig.runtimeConfigText(),
                        datasourceService.previewInlineJson(resolvedConfig.runtimeConfigText(), null)
                );
            }
            if ((resolvedConfig.sqlText() == null || resolvedConfig.sqlText().isBlank())
                    && (resolvedConfig.runtimeConfigText() == null || resolvedConfig.runtimeConfigText().isBlank())) {
                return null;
            }
            BiDatasource datasource = datasourceService.getById(resolvedConfig.datasourceId());
            if (datasource == null) {
                throw new IllegalArgumentException("Datasource not found: " + resolvedConfig.datasourceId());
            }
            return new RuntimeSource(datasource, resolvedConfig.sqlText(), resolvedConfig.runtimeConfigText(), null);
        }

        if (resolvedConfig.datasetId() == null) {
            return null;
        }
        BiDataset dataset = biDatasetMapper.findById(resolvedConfig.datasetId());
        if (dataset == null) {
            throw new IllegalArgumentException("Dataset not found");
        }
        if (dataset.getDatasourceId() == null || dataset.getDatasourceId() == 0L) {
            return new RuntimeSource(null, dataset.getSqlText(), null, datasetService.getDemoPreviewResponse(dataset.getSqlText()));
        }
        BiDatasource datasource = datasourceService.getById(dataset.getDatasourceId());
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + dataset.getDatasourceId());
        }
        return new RuntimeSource(datasource, dataset.getSqlText(), null, null);
    }

    private boolean requiresRawRowResponse(ResolvedChartConfig resolvedConfig) {
        String chartType = resolvedConfig.chartType();
        if (AGGREGATED_RAW_ROW_TYPES.contains(chartType) || "gauge".equals(chartType) || "scatter".equals(chartType)) {
            return false;
        }
        if (RUNTIME_ROW_DATA_TYPES.contains(chartType)) {
            return true;
        }
        return isBlank(resolvedConfig.xField()) || isBlank(resolvedConfig.yField());
    }

    private int resolveRuntimeRowLimit(ResolvedChartConfig resolvedConfig) {
        String chartType = resolvedConfig.chartType();
        if (Set.of("table", "table_summary", "table_pivot").contains(chartType)) {
            return clampInt(resolvedConfig.tableLoadLimit(), 1, MAX_TABLE_RUNTIME_ROW_LIMIT);
        }
        if (Set.of("text_block", "single_field", "number_flipper", "metric_indicator", "iframe_single").contains(chartType)) {
            return SINGLE_VALUE_RUNTIME_ROW_LIMIT;
        }
        return DEFAULT_RUNTIME_ROW_LIMIT;
    }

    private int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }

    private void aggregateHeatmapRows(ResultSet resultSet,
                                      ResolvedChartConfig resolvedConfig,
                                      Map<String, String> filters,
                                      Map<String, Object> result) throws SQLException {
        String xField = resolvedConfig.xField();
        String metricField = resolvedConfig.yField();
        String yField = !isBlank(resolvedConfig.groupField()) ? resolvedConfig.groupField() : xField;

        LinkedHashSet<String> labels = new LinkedHashSet<>();
        LinkedHashMap<String, Map<String, Object>> heatRows = new LinkedHashMap<>();
        List<String> columns = readColumns(resultSet.getMetaData());

        while (resultSet.next()) {
            Map<String, Object> row = readRow(resultSet, columns);
            if (!matchesFilters(row, filters)) {
                continue;
            }
            String xValue = stringValue(row.get(xField));
            String yValue = stringValue(row.get(yField));
            labels.add(xValue);
            String key = xValue + "||" + yValue;
            Map<String, Object> cell = heatRows.computeIfAbsent(key, ignored -> {
                Map<String, Object> created = new LinkedHashMap<>();
                created.put(xField, xValue);
                created.put(yField, yValue);
                created.put(metricField, 0);
                return created;
            });
            cell.put(metricField, addNumbers(cell.get(metricField), row.get(metricField)));
        }

        result.put("labels", new ArrayList<>(labels));
        result.put("rawRows", new ArrayList<>(heatRows.values()));
    }

    private void aggregateHeatmapRows(List<Map<String, Object>> rows,
                                      ResolvedChartConfig resolvedConfig,
                                      Map<String, Object> result) {
        String xField = resolvedConfig.xField();
        String metricField = resolvedConfig.yField();
        String yField = !isBlank(resolvedConfig.groupField()) ? resolvedConfig.groupField() : xField;

        LinkedHashSet<String> labels = new LinkedHashSet<>();
        LinkedHashMap<String, Map<String, Object>> heatRows = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String xValue = stringValue(row.get(xField));
            String yValue = stringValue(row.get(yField));
            labels.add(xValue);
            String key = xValue + "||" + yValue;
            Map<String, Object> cell = heatRows.computeIfAbsent(key, ignored -> {
                Map<String, Object> created = new LinkedHashMap<>();
                created.put(xField, xValue);
                created.put(yField, yValue);
                created.put(metricField, 0);
                return created;
            });
            cell.put(metricField, addNumbers(cell.get(metricField), row.get(metricField)));
        }

        result.put("labels", new ArrayList<>(labels));
        result.put("rawRows", new ArrayList<>(heatRows.values()));
    }

    private void aggregateGaugeRows(ResultSet resultSet,
                                    ResolvedChartConfig resolvedConfig,
                                    Map<String, String> filters,
                                    Map<String, Object> result) throws SQLException {
        Object total = 0;
        String gaugeLabel = resolvedConfig.yField();
        List<String> columns = readColumns(resultSet.getMetaData());
        while (resultSet.next()) {
            Map<String, Object> row = readRow(resultSet, columns);
            if (!matchesFilters(row, filters)) {
                continue;
            }
            total = addNumbers(total, row.get(resolvedConfig.yField()));
            if (!isBlank(resolvedConfig.xField()) && !isBlank(stringValue(row.get(resolvedConfig.xField())))) {
                gaugeLabel = stringValue(row.get(resolvedConfig.xField()));
            }
        }
        result.put("labels", List.of(gaugeLabel));
        result.put("series", List.of(Map.of("name", resolvedConfig.yField(), "data", List.of(total == null ? 0 : total))));
    }

    private void aggregateGaugeRows(List<Map<String, Object>> rows,
                                    ResolvedChartConfig resolvedConfig,
                                    Map<String, Object> result) {
        Object total = 0;
        String gaugeLabel = resolvedConfig.yField();
        for (Map<String, Object> row : rows) {
            total = addNumbers(total, row.get(resolvedConfig.yField()));
            if (!isBlank(resolvedConfig.xField()) && !isBlank(stringValue(row.get(resolvedConfig.xField())))) {
                gaugeLabel = stringValue(row.get(resolvedConfig.xField()));
            }
        }
        result.put("labels", List.of(gaugeLabel));
        result.put("series", List.of(Map.of("name", resolvedConfig.yField(), "data", List.of(total == null ? 0 : total))));
    }

    private void aggregateScatterRows(ResultSet resultSet,
                                      ResolvedChartConfig resolvedConfig,
                                      Map<String, String> filters,
                                      Map<String, Object> result) throws SQLException {
        LinkedHashMap<String, List<List<Number>>> grouped = new LinkedHashMap<>();
        List<String> columns = readColumns(resultSet.getMetaData());
        while (resultSet.next()) {
            Map<String, Object> row = readRow(resultSet, columns);
            if (!matchesFilters(row, filters)) {
                continue;
            }
            Number xValue = toNumber(row.get(resolvedConfig.xField()));
            Number yValue = toNumber(row.get(resolvedConfig.yField()));
            if (xValue == null || yValue == null) {
                continue;
            }
            String groupName = !isBlank(resolvedConfig.groupField())
                    ? stringValue(row.get(resolvedConfig.groupField()))
                    : resolvedConfig.yField();
            grouped.computeIfAbsent(groupName, ignored -> new ArrayList<>()).add(List.of(xValue, yValue));
        }
        List<Map<String, Object>> series = new ArrayList<>();
        for (Map.Entry<String, List<List<Number>>> entry : grouped.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", entry.getKey());
            item.put("data", entry.getValue());
            series.add(item);
        }
        result.put("series", series);
    }

    private void aggregateScatterRows(List<Map<String, Object>> rows,
                                      ResolvedChartConfig resolvedConfig,
                                      Map<String, Object> result) {
        LinkedHashMap<String, List<List<Number>>> grouped = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            Number xValue = toNumber(row.get(resolvedConfig.xField()));
            Number yValue = toNumber(row.get(resolvedConfig.yField()));
            if (xValue == null || yValue == null) {
                continue;
            }
            String groupName = !isBlank(resolvedConfig.groupField())
                    ? stringValue(row.get(resolvedConfig.groupField()))
                    : resolvedConfig.yField();
            grouped.computeIfAbsent(groupName, ignored -> new ArrayList<>()).add(List.of(xValue, yValue));
        }
        List<Map<String, Object>> series = new ArrayList<>();
        for (Map.Entry<String, List<List<Number>>> entry : grouped.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", entry.getKey());
            item.put("data", entry.getValue());
            series.add(item);
        }
        result.put("series", series);
    }

    private void aggregateSeriesRows(ResultSet resultSet,
                                     ResolvedChartConfig resolvedConfig,
                                     Map<String, String> filters,
                                     Map<String, Object> result) throws SQLException {
        String xField = resolvedConfig.xField();
        String yField = resolvedConfig.yField();
        String groupField = resolvedConfig.groupField();
        if (isBlank(xField) || isBlank(yField)) {
            return;
        }

        LinkedHashSet<String> labels = new LinkedHashSet<>();
        List<String> columns = readColumns(resultSet.getMetaData());
        if (!isBlank(groupField)) {
            LinkedHashMap<String, LinkedHashMap<String, Object>> grouped = new LinkedHashMap<>();
            while (resultSet.next()) {
                Map<String, Object> row = readRow(resultSet, columns);
                if (!matchesFilters(row, filters)) {
                    continue;
                }
                String xValue = stringValue(row.get(xField));
                String groupValue = stringValue(row.get(groupField));
                labels.add(xValue);
                grouped.computeIfAbsent(groupValue, ignored -> new LinkedHashMap<>())
                        .merge(xValue, row.get(yField), this::addNumbers);
            }
            List<String> labelList = new ArrayList<>(labels);
            List<Map<String, Object>> series = new ArrayList<>();
            for (Map.Entry<String, LinkedHashMap<String, Object>> entry : grouped.entrySet()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", entry.getKey());
                List<Object> data = new ArrayList<>();
                for (String label : labelList) {
                    data.add(entry.getValue().getOrDefault(label, 0));
                }
                item.put("data", data);
                series.add(item);
            }
            result.put("labels", labelList);
            result.put("series", series);
            return;
        }

        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        while (resultSet.next()) {
            Map<String, Object> row = readRow(resultSet, columns);
            if (!matchesFilters(row, filters)) {
                continue;
            }
            String xValue = stringValue(row.get(xField));
            labels.add(xValue);
            values.merge(xValue, row.get(yField), this::addNumbers);
        }
        List<String> labelList = new ArrayList<>(labels);
        List<Object> data = new ArrayList<>();
        for (String label : labelList) {
            data.add(values.getOrDefault(label, 0));
        }
        result.put("labels", labelList);
        result.put("series", List.of(Map.of("name", yField, "data", data)));
    }

    private void aggregateSeriesRows(List<Map<String, Object>> rows,
                                     ResolvedChartConfig resolvedConfig,
                                     Map<String, Object> result) {
        String xField = resolvedConfig.xField();
        String yField = resolvedConfig.yField();
        String groupField = resolvedConfig.groupField();
        if (isBlank(xField) || isBlank(yField)) {
            result.put("rawRows", rows);
            return;
        }

        LinkedHashSet<String> labels = new LinkedHashSet<>();
        if (!isBlank(groupField)) {
            LinkedHashMap<String, LinkedHashMap<String, Object>> grouped = new LinkedHashMap<>();
            for (Map<String, Object> row : rows) {
                String xValue = stringValue(row.get(xField));
                String groupValue = stringValue(row.get(groupField));
                labels.add(xValue);
                grouped.computeIfAbsent(groupValue, ignored -> new LinkedHashMap<>())
                        .merge(xValue, row.get(yField), this::addNumbers);
            }
            List<String> labelList = new ArrayList<>(labels);
            List<Map<String, Object>> series = new ArrayList<>();
            for (Map.Entry<String, LinkedHashMap<String, Object>> entry : grouped.entrySet()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("name", entry.getKey());
                List<Object> data = new ArrayList<>();
                for (String label : labelList) {
                    data.add(entry.getValue().getOrDefault(label, 0));
                }
                item.put("data", data);
                series.add(item);
            }
            result.put("labels", labelList);
            result.put("series", series);
            return;
        }

        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String xValue = stringValue(row.get(xField));
            labels.add(xValue);
            values.merge(xValue, row.get(yField), this::addNumbers);
        }
        List<String> labelList = new ArrayList<>(labels);
        List<Object> data = new ArrayList<>();
        for (String label : labelList) {
            data.add(values.getOrDefault(label, 0));
        }
        result.put("labels", labelList);
        result.put("series", List.of(Map.of("name", yField, "data", data)));
    }

    private List<String> readColumns(ResultSetMetaData metaData) throws SQLException {
        int columnCount = metaData.getColumnCount();
        List<String> columns = new ArrayList<>(columnCount);
        for (int index = 1; index <= columnCount; index++) {
            columns.add(metaData.getColumnLabel(index));
        }
        return columns;
    }

    private Map<String, Object> readRow(ResultSet resultSet, List<String> columns) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>(columns.size());
        for (int index = 0; index < columns.size(); index++) {
            row.put(columns.get(index), resultSet.getObject(index + 1));
        }
        return row;
    }

    private Number toNumber(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Map<String, Object> buildEmptyResult(String chartType, Map<String, String> filters) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chartType", chartType);
        result.put("columns", List.of());
        result.put("labels", List.of());
        result.put("series", List.of());
        result.put("rawRows", List.of());
        result.put("filters", filters);
        return result;
    }

    private ResolvedChartConfig resolveChartConfig(BiChart chart, String configJson) {
        Long datasetId = chart.getDatasetId();
        String chartType = chart.getChartType();
        String xField = chart.getXField();
        String yField = chart.getYField();
        String groupField = chart.getGroupField();
        String sourceMode = "DATASET";
        Long datasourceId = null;
        String sqlText = "";
        String runtimeConfigText = "";
        int tableLoadLimit = 100;

        if (configJson == null || configJson.isBlank()) {
            return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField, sourceMode, datasourceId, sqlText, runtimeConfigText, tableLoadLimit);
        }

        try {
            JsonNode chartNode = objectMapper.readTree(configJson).path("chart");
            if (!chartNode.isObject()) {
                return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField, sourceMode, datasourceId, sqlText, runtimeConfigText, tableLoadLimit);
            }

            datasetId = readLong(chartNode.get("datasetId"), datasetId);
            chartType = readText(chartNode.get("chartType"), chartType);
            xField = readText(chartNode.get("xField"), xField);
            yField = readText(chartNode.get("yField"), yField);
            groupField = readText(chartNode.get("groupField"), groupField);
            sourceMode = readText(chartNode.get("sourceMode"), sourceMode);
            datasourceId = readLong(chartNode.get("datasourceId"), datasourceId);
            sqlText = readText(chartNode.get("sqlText"), sqlText);
            runtimeConfigText = readText(chartNode.get("runtimeConfigText"), runtimeConfigText);
            tableLoadLimit = readInt(chartNode.get("tableLoadLimit"), tableLoadLimit);
            return new ResolvedChartConfig(datasetId, chartType, xField, yField, groupField, sourceMode, datasourceId, sqlText, runtimeConfigText, tableLoadLimit);
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

    private int readInt(JsonNode node, int fallback) {
        if (node == null || node.isNull()) {
            return fallback;
        }
        if (node.isNumber()) {
            return node.intValue();
        }
        String text = node.asText("").trim();
        if (text.isEmpty()) {
            return fallback;
        }
        try {
            return Integer.parseInt(text);
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
                .filter(row -> matchesFilters(row, filters))
                .toList();
    }

    private boolean matchesFilters(Map<String, Object> row, Map<String, String> filters) {
        if (filters.isEmpty()) {
            return true;
        }
        return filters.entrySet().stream().allMatch(entry -> matchFilterValue(row.get(entry.getKey()), entry.getValue()));
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

    private void validateDatasetRequirement(String chartType, Long datasetId) {
        if (datasetId != null) {
            return;
        }
        if (chartType != null && STATIC_WIDGET_TYPES.contains(chartType)) {
            return;
        }
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

    private record RuntimeSource(BiDatasource datasource,
                                 String sqlText,
                                 String runtimeConfigText,
                                 DatasetPreviewResponse demoPreview) {
    }

    private record ResolvedChartConfig(Long datasetId,
                                       String chartType,
                                       String xField,
                                       String yField,
                                       String groupField,
                                       String sourceMode,
                                       Long datasourceId,
                                       String sqlText,
                                       String runtimeConfigText,
                                       int tableLoadLimit) {
    }
}

