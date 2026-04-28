package com.aibi.bi.service;

import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.mapper.BiDatasetMapper;
import com.aibi.bi.model.request.CreateDatasourceRequest;
import com.aibi.bi.model.request.DatasourceConnectionTestRequest;
import com.aibi.bi.model.request.ExtractPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasourceRequest;
import com.aibi.bi.model.response.ColumnInfo;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.aibi.bi.model.response.DatasourceConnectionTestResponse;
import com.aibi.bi.model.response.ExtractPreviewResponse;
import com.aibi.bi.model.response.TableInfo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class DatasourceService {

    private static final Pattern SAFE_TABLE = Pattern.compile("^[a-zA-Z0-9_\\.]+$");
    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final Set<String> DATABASE_TYPES = Set.of("MYSQL", "POSTGRESQL", "CLICKHOUSE", "SQLSERVER", "ORACLE");
    private static final Set<String> API_METHODS = Set.of("GET", "POST", "PUT", "PATCH");
    private static final int PREVIEW_LIMIT = 20;

    private final BiDatasourceMapper biDatasourceMapper;
    private final BiDatasetMapper biDatasetMapper;
    private final JdbcPreviewService jdbcPreviewService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public DatasourceService(BiDatasourceMapper biDatasourceMapper,
                             BiDatasetMapper biDatasetMapper,
                             JdbcPreviewService jdbcPreviewService,
                             ObjectMapper objectMapper) {
        this.biDatasourceMapper = biDatasourceMapper;
        this.biDatasetMapper = biDatasetMapper;
        this.jdbcPreviewService = jdbcPreviewService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public List<BiDatasource> list() {
        return biDatasourceMapper.listAll();
    }

    public BiDatasource getById(Long id) {
        return biDatasourceMapper.findById(id);
    }

    public BiDatasource create(CreateDatasourceRequest request) {
        BiDatasource entity = new BiDatasource();
        entity.setName(trimRequired(request.getName(), "数据源名称不能为空"));
        applyDatasourceRequest(
                entity,
                request.getSourceKind(),
                request.getDatasourceType(),
                request.getConnectMode(),
                request.getHost(),
                request.getPort(),
                request.getDatabaseName(),
                request.getUsername(),
                request.getPassword(),
                request.getConfigJson(),
                false
        );
        biDatasourceMapper.insert(entity);
        return entity;
    }

    public BiDatasource update(Long id, UpdateDatasourceRequest request) {
        BiDatasource entity = requireDatasource(id);
        entity.setName(trimRequired(request.getName(), "数据源名称不能为空"));
        applyDatasourceRequest(
                entity,
                request.getSourceKind(),
                request.getDatasourceType(),
                request.getConnectMode(),
                request.getHost(),
                request.getPort(),
                request.getDatabaseName(),
                request.getUsername(),
                request.getPassword(),
                request.getConfigJson(),
                true
        );
        biDatasourceMapper.update(entity);
        return entity;
    }

    public DatasourceConnectionTestResponse testConnection(DatasourceConnectionTestRequest request) {
        BiDatasource temp = new BiDatasource();
        temp.setName("temp");
        applyDatasourceRequest(
                temp,
                request.getSourceKind(),
                request.getDatasourceType(),
                "DIRECT",
                request.getHost(),
                request.getPort(),
                request.getDatabaseName(),
                request.getUsername(),
                request.getPassword(),
                request.getConfigJson(),
                false
        );
        String sourceKind = resolveSourceKind(temp);
        return switch (sourceKind) {
            case "DATABASE" -> jdbcPreviewService.testConnection(temp);
            case "API" -> {
                DatasetPreviewResponse preview = previewDatasource(temp, null, null);
                yield buildConnectionResponse("HTTP API", "rows=" + preview.getRowCount(), "接口连通并返回可解析数据");
            }
            case "TABLE" -> {
                DatasetPreviewResponse preview = previewDatasource(temp, null, null);
                yield buildConnectionResponse("STATIC TABLE", "rows=" + preview.getRowCount(), "表格文本解析成功");
            }
            case "JSON_STATIC" -> {
                DatasetPreviewResponse preview = previewDatasource(temp, null, null);
                yield buildConnectionResponse("JSON STATIC", "rows=" + preview.getRowCount(), "JSON 静态数据解析成功");
            }
            default -> throw new IllegalArgumentException("不支持的数据源类型: " + sourceKind);
        };
    }

    public DatasetPreviewResponse previewDatasourceData(Long id) {
        BiDatasource datasource = requireDatasource(id);
        if (isDatabaseDatasource(datasource)) {
            throw new IllegalArgumentException("数据库数据源请在“数据源表”页签或页面编写 SQL 中预览");
        }
        return previewDatasource(datasource, null, null);
    }

    public DatasetPreviewResponse previewDatasource(Long datasourceId, String sqlText, String runtimeConfigText) {
        return previewDatasource(requireDatasource(datasourceId), sqlText, runtimeConfigText);
    }

    public DatasetPreviewResponse previewDatasource(BiDatasource datasource, String sqlText, String runtimeConfigText) {
        return queryDatasource(datasource, sqlText, runtimeConfigText, PREVIEW_LIMIT);
    }

    public DatasetPreviewResponse queryRuntimeDatasource(Long datasourceId, String sqlText, String runtimeConfigText, Integer maxRows) {
        return queryDatasource(requireDatasource(datasourceId), sqlText, runtimeConfigText, maxRows);
    }

    public DatasetPreviewResponse queryRuntimeDatasource(BiDatasource datasource, String sqlText, String runtimeConfigText, Integer maxRows) {
        return queryDatasource(datasource, sqlText, runtimeConfigText, maxRows);
    }

    public DatasetPreviewResponse previewInlineJson(String runtimeConfigText, Integer maxRows) {
        Map<String, Object> config = mergeConfig("{}", runtimeConfigText, "JSON 页面配置格式不正确");
        return buildJsonPreviewResponse(config, maxRows);
    }

    private DatasetPreviewResponse queryDatasource(BiDatasource datasource, String sqlText, String runtimeConfigText, Integer maxRows) {
        String sourceKind = resolveSourceKind(datasource);
        return switch (sourceKind) {
            case "DATABASE" -> queryDatabaseDatasource(datasource, sqlText, maxRows);
            case "API" -> queryApiDatasource(datasource, runtimeConfigText, maxRows);
            case "TABLE" -> queryTableDatasource(datasource, runtimeConfigText, maxRows);
            case "JSON_STATIC" -> queryJsonDatasource(datasource, runtimeConfigText, maxRows);
            default -> throw new IllegalArgumentException("不支持的数据源类型: " + sourceKind);
        };
    }

    public ExtractPreviewResponse previewExtract(ExtractPreviewRequest request) {
        BiDatasource entity = requireDatasource(request.getDatasourceId());
        ensureDatabaseDatasource(entity, "仅数据库数据源支持抽取预览");

        String table = request.getTableName() == null ? "" : request.getTableName().trim();
        if (!SAFE_TABLE.matcher(table).matches()) {
            throw new IllegalArgumentException("tableName 包含非法字符，仅支持字母数字下划线与点号");
        }

        String whereClause = request.getWhereClause() == null ? "" : request.getWhereClause().trim();
        String lowerWhereClause = whereClause.toLowerCase(Locale.ROOT);
        if (whereClause.contains(";") || lowerWhereClause.contains(" drop ")
                || lowerWhereClause.contains(" delete ")
                || lowerWhereClause.contains(" update ")
                || lowerWhereClause.contains(" insert ")) {
            throw new IllegalArgumentException("whereClause 包含非法语句");
        }

        int limit = request.getLimit() == null ? 20 : Math.max(1, Math.min(request.getLimit(), 500));
        StringBuilder sql = new StringBuilder("SELECT * FROM ").append(table);
        if (!whereClause.isBlank()) {
            sql.append(" WHERE ").append(whereClause);
        }
        sql.append(" LIMIT ").append(limit);

        DatasetPreviewResponse preview = jdbcPreviewService.preview(entity, sql.toString());
        ExtractPreviewResponse response = new ExtractPreviewResponse();
        response.setSqlText(sql.toString());
        response.setColumns(preview.getColumns());
        response.setRows(preview.getRows());
        response.setRowCount(preview.getRowCount());
        return response;
    }

    public List<TableInfo> listTables(Long id) {
        BiDatasource entity = requireDatasource(id);
        ensureDatabaseDatasource(entity, "仅数据库数据源支持数据表浏览");
        return jdbcPreviewService.listTables(entity);
    }

    public List<ColumnInfo> listColumns(Long id, String tableName) {
        BiDatasource entity = requireDatasource(id);
        ensureDatabaseDatasource(entity, "仅数据库数据源支持字段浏览");
        return jdbcPreviewService.listColumns(entity, tableName);
    }

    public void delete(Long id) {
        requireDatasource(id);
        long datasetCount = biDatasetMapper.countByDatasourceId(id);
        if (datasetCount > 0) {
            throw new IllegalArgumentException("当前数据源仍被 " + datasetCount + " 个数据集引用，请先修改或删除这些数据集后再删除数据源");
        }
        biDatasourceMapper.deleteById(id);
    }

    public boolean isDatabaseDatasource(BiDatasource datasource) {
        return "DATABASE".equals(resolveSourceKind(datasource));
    }

    private void applyDatasourceRequest(BiDatasource entity,
                                        String sourceKind,
                                        String datasourceType,
                                        String connectMode,
                                        String host,
                                        Integer port,
                                        String databaseName,
                                        String username,
                                        String password,
                                        String configJson,
                                        boolean preserveExistingPassword) {
        String normalizedSourceKind = normalizeSourceKind(sourceKind, datasourceType);
        entity.setSourceKind(normalizedSourceKind);
        entity.setConnectMode(normalizeMode(connectMode));

        if ("DATABASE".equals(normalizedSourceKind)) {
            entity.setDatasourceType(normalizeDatabaseType(datasourceType));
            entity.setHost(trimRequired(host, "数据库数据源必须填写主机名/IP 地址"));
            if (port == null || port <= 0) {
                throw new IllegalArgumentException("数据库数据源必须填写合法端口");
            }
            entity.setPort(port);
            entity.setDatabaseName(trimRequired(databaseName, "数据库数据源必须填写数据库名称"));
            entity.setDbUsername(trimToEmpty(username));
            if (!preserveExistingPassword) {
                entity.setDbPassword(trimToEmpty(password));
            } else if (StringUtils.hasText(password)) {
                entity.setDbPassword(trimToEmpty(password));
            } else if (entity.getDbPassword() == null) {
                entity.setDbPassword("");
            }
            entity.setConfigJson(normalizeDatabaseConfig(configJson));
            return;
        }

        entity.setDatasourceType(defaultDatasourceType(normalizedSourceKind));
        entity.setConnectMode("DIRECT");
        entity.setHost("");
        entity.setPort(0);
        entity.setDatabaseName("");
        entity.setDbUsername("");
        entity.setDbPassword("");
        entity.setConfigJson(normalizeNonDatabaseConfig(normalizedSourceKind, configJson));
    }

    private DatasetPreviewResponse queryDatabaseDatasource(BiDatasource datasource, String sqlText, Integer maxRows) {
        if (!StringUtils.hasText(sqlText)) {
            throw new IllegalArgumentException("数据库页面编写模式必须填写 SQL");
        }
        return jdbcPreviewService.query(datasource, sqlText, maxRows);
    }

    private DatasetPreviewResponse queryApiDatasource(BiDatasource datasource, String runtimeConfigText, Integer maxRows) {
        Map<String, Object> config = mergeConfig(datasource.getConfigJson(), runtimeConfigText, "API 页面配置格式不正确");
        String url = readText(firstNonNull(config.get("apiUrl"), config.get("url")), "");
        String method = readText(firstNonNull(config.get("apiMethod"), config.get("method")), "GET").toUpperCase(Locale.ROOT);
        if (!StringUtils.hasText(url)) {
            throw new IllegalArgumentException("API 数据源缺少请求地址");
        }
        if (!API_METHODS.contains(method)) {
            throw new IllegalArgumentException("API 数据源仅支持 GET/POST/PUT/PATCH");
        }

        Map<String, Object> query = readMapObject(firstNonNull(config.get("apiQuery"), config.get("query")), "API query 配置格式不正确");
        Map<String, Object> headers = readMapObject(firstNonNull(config.get("apiHeaders"), config.get("headers")), "API headers 配置格式不正确");
        Object body = firstNonNull(config.get("apiBody"), config.get("body"));
        String resultPath = readText(firstNonNull(config.get("apiResultPath"), config.get("resultPath")), "");

        HttpRequest.Builder builder = HttpRequest.newBuilder(buildUri(url, query))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json");
        headers.forEach((key, value) -> {
            if (StringUtils.hasText(key) && value != null) {
                builder.header(key, String.valueOf(value));
            }
        });

        if (Set.of("POST", "PUT", "PATCH").contains(method)) {
            if (!headers.keySet().stream().map(key -> key.toLowerCase(Locale.ROOT)).anyMatch("content-type"::equals)) {
                builder.header("Content-Type", "application/json;charset=UTF-8");
            }
            builder.method(method, HttpRequest.BodyPublishers.ofString(serializeRequestBody(body), StandardCharsets.UTF_8));
        } else {
            builder.GET();
        }

        try {
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new IllegalArgumentException("API 请求失败: HTTP " + response.statusCode());
            }
            String bodyText = response.body() == null ? "" : response.body().trim();
            if (bodyText.isEmpty()) {
                throw new IllegalArgumentException("API 未返回可解析内容");
            }
            JsonNode root = objectMapper.readTree(bodyText);
            return buildPreviewResponse(resolveResultNode(root, resultPath), maxRows);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalArgumentException("API 请求被中断", ex);
        } catch (Exception ex) {
            throw new IllegalArgumentException("API 数据预览失败: " + ex.getMessage(), ex);
        }
    }

    private DatasetPreviewResponse queryTableDatasource(BiDatasource datasource, String runtimeConfigText, Integer maxRows) {
        Map<String, Object> config = mergeConfig(datasource.getConfigJson(), runtimeConfigText, "表格页面配置格式不正确");
        String tableText = readText(firstNonNull(config.get("tableText"), config.get("text")), "");
        if (!StringUtils.hasText(tableText)) {
            throw new IllegalArgumentException("表格数据源缺少表格内容");
        }
        String delimiter = readText(firstNonNull(config.get("tableDelimiter"), config.get("delimiter")), "CSV").toUpperCase(Locale.ROOT);
        boolean hasHeader = readBoolean(firstNonNull(config.get("tableHasHeader"), config.get("hasHeader")), true);
        char delimiterChar = "TSV".equals(delimiter) ? '\t' : ',';

        List<List<String>> records = tableText.lines()
                .map(String::stripTrailing)
                .filter(StringUtils::hasText)
                .map(line -> parseDelimitedLine(line, delimiterChar))
                .toList();
        if (records.isEmpty()) {
            return emptyPreviewResponse();
        }

        int maxColumnSize = records.stream().mapToInt(List::size).max().orElse(0);
        List<String> columns = hasHeader
                ? normalizeHeaderColumns(records.get(0), maxColumnSize)
                : buildDefaultColumns(maxColumnSize);
        int startIndex = hasHeader ? 1 : 0;
        List<Map<String, Object>> rows = new ArrayList<>();
        int safeMaxRows = resolveMaxRows(maxRows);
        for (int index = startIndex; index < records.size() && rows.size() < safeMaxRows; index++) {
            List<String> record = records.get(index);
            Map<String, Object> row = new LinkedHashMap<>();
            for (int columnIndex = 0; columnIndex < columns.size(); columnIndex++) {
                row.put(columns.get(columnIndex), columnIndex < record.size() ? record.get(columnIndex) : "");
            }
            rows.add(row);
        }
        return buildPreviewResponse(rows);
    }

    private DatasetPreviewResponse queryJsonDatasource(BiDatasource datasource, String runtimeConfigText, Integer maxRows) {
        Map<String, Object> config = mergeConfig(datasource.getConfigJson(), runtimeConfigText, "JSON 页面配置格式不正确");
        return buildJsonPreviewResponse(config, maxRows);
    }

    private DatasetPreviewResponse buildJsonPreviewResponse(Map<String, Object> config, Integer maxRows) {
        String jsonText = readText(firstNonNull(config.get("jsonText"), config.get("text")), "");
        if (!StringUtils.hasText(jsonText)) {
            throw new IllegalArgumentException("JSON 静态数据源缺少 JSON 内容");
        }
        String resultPath = readText(firstNonNull(config.get("jsonResultPath"), config.get("resultPath")), "");
        try {
            JsonNode root = objectMapper.readTree(jsonText);
            return buildPreviewResponse(resolveResultNode(root, resultPath), maxRows);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("JSON 静态数据解析失败: " + ex.getMessage(), ex);
        }
    }

    private BiDatasource requireDatasource(Long datasourceId) {
        BiDatasource datasource = biDatasourceMapper.findById(datasourceId);
        if (datasource == null) {
            throw new IllegalArgumentException("Datasource not found: " + datasourceId);
        }
        return datasource;
    }

    private void ensureDatabaseDatasource(BiDatasource datasource, String message) {
        if (!isDatabaseDatasource(datasource)) {
            throw new IllegalArgumentException(message);
        }
    }

    private String normalizeSourceKind(String sourceKind, String datasourceType) {
        if (!StringUtils.hasText(sourceKind)) {
            String normalizedType = datasourceType == null ? "" : datasourceType.trim().toUpperCase(Locale.ROOT);
            if (DATABASE_TYPES.contains(normalizedType) || normalizedType.isEmpty()) {
                return "DATABASE";
            }
            if (Set.of("REST_API", "API").contains(normalizedType)) {
                return "API";
            }
            if ("TABLE".equals(normalizedType)) {
                return "TABLE";
            }
            if (Set.of("JSON", "JSON_STATIC").contains(normalizedType)) {
                return "JSON_STATIC";
            }
            return "DATABASE";
        }

        String normalizedKind = sourceKind.trim().toUpperCase(Locale.ROOT);
        return switch (normalizedKind) {
            case "DATABASE", "API", "TABLE", "JSON_STATIC" -> normalizedKind;
            case "JSON" -> "JSON_STATIC";
            default -> throw new IllegalArgumentException("不支持的数据源种类: " + sourceKind);
        };
    }

    private String resolveSourceKind(BiDatasource datasource) {
        return normalizeSourceKind(datasource.getSourceKind(), datasource.getDatasourceType());
    }

    private String normalizeDatabaseType(String type) {
        String normalizedType = type != null && !type.isBlank() ? type.trim().toUpperCase(Locale.ROOT) : "MYSQL";
        if (!DATABASE_TYPES.contains(normalizedType)) {
            throw new IllegalArgumentException("数据库类型仅支持 MYSQL / POSTGRESQL / CLICKHOUSE / SQLSERVER / ORACLE");
        }
        return normalizedType;
    }

    private String defaultDatasourceType(String sourceKind) {
        return switch (sourceKind) {
            case "API" -> "REST_API";
            case "TABLE" -> "TABLE";
            case "JSON_STATIC" -> "JSON_STATIC";
            default -> normalizeDatabaseType(null);
        };
    }

    private String normalizeMode(String mode) {
        return mode != null && !mode.isBlank() ? mode.toUpperCase(Locale.ROOT) : "DIRECT";
    }

    private String normalizeDatabaseConfig(String configJson) {
        return toJson(parseJsonObject(configJson, "数据库扩展配置格式不正确"));
    }

    private String normalizeNonDatabaseConfig(String sourceKind, String configJson) {
        return switch (sourceKind) {
            case "API" -> normalizeApiConfig(configJson);
            case "TABLE" -> normalizeTableConfig(configJson);
            case "JSON_STATIC" -> normalizeJsonConfig(configJson);
            default -> toJson(Map.of());
        };
    }

    private String normalizeApiConfig(String configJson) {
        Map<String, Object> raw = parseJsonObject(configJson, "API 数据源配置格式不正确");
        String url = readText(firstNonNull(raw.get("apiUrl"), raw.get("url")), "");
        if (!StringUtils.hasText(url)) {
            throw new IllegalArgumentException("API 数据源必须填写请求地址");
        }
        String method = readText(firstNonNull(raw.get("apiMethod"), raw.get("method")), "GET").toUpperCase(Locale.ROOT);
        if (!API_METHODS.contains(method)) {
            throw new IllegalArgumentException("API 请求方式仅支持 GET / POST / PUT / PATCH");
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        normalized.put("apiUrl", url.trim());
        normalized.put("apiMethod", method);

        Map<String, Object> headers = readMapObject(firstNonNull(raw.get("apiHeaders"), raw.get("headers")), "API headers 配置格式不正确");
        if (!headers.isEmpty()) {
            normalized.put("apiHeaders", headers);
        }

        Map<String, Object> query = readMapObject(firstNonNull(raw.get("apiQuery"), raw.get("query")), "API query 配置格式不正确");
        if (!query.isEmpty()) {
            normalized.put("apiQuery", query);
        }

        Object body = firstNonNull(raw.get("apiBody"), raw.get("body"));
        if (body != null) {
            normalized.put("apiBody", body);
        }

        String resultPath = readText(firstNonNull(raw.get("apiResultPath"), raw.get("resultPath")), "");
        if (StringUtils.hasText(resultPath)) {
            normalized.put("apiResultPath", resultPath);
        }

        return toJson(normalized);
    }

    private String normalizeTableConfig(String configJson) {
        Map<String, Object> raw = parseJsonObject(configJson, "表格数据源配置格式不正确");
        String tableText = readText(firstNonNull(raw.get("tableText"), raw.get("text")), "");
        if (!StringUtils.hasText(tableText)) {
            throw new IllegalArgumentException("表格数据源必须填写 CSV/TSV 内容");
        }
        String delimiter = readText(firstNonNull(raw.get("tableDelimiter"), raw.get("delimiter")), "CSV").toUpperCase(Locale.ROOT);
        if (!Set.of("CSV", "TSV").contains(delimiter)) {
            throw new IllegalArgumentException("表格分隔格式仅支持 CSV 或 TSV");
        }
        boolean hasHeader = readBoolean(firstNonNull(raw.get("tableHasHeader"), raw.get("hasHeader")), true);

        Map<String, Object> normalized = new LinkedHashMap<>();
        normalized.put("tableText", tableText);
        normalized.put("tableDelimiter", delimiter);
        normalized.put("tableHasHeader", hasHeader);
        return toJson(normalized);
    }

    private String normalizeJsonConfig(String configJson) {
        Map<String, Object> raw = parseJsonObject(configJson, "JSON 静态数据源配置格式不正确");
        String jsonText = readText(firstNonNull(raw.get("jsonText"), raw.get("text")), "");
        if (!StringUtils.hasText(jsonText)) {
            throw new IllegalArgumentException("JSON 静态数据源必须填写 JSON 内容");
        }
        try {
            objectMapper.readTree(jsonText);
        } catch (Exception ex) {
            throw new IllegalArgumentException("JSON 静态数据源内容不是合法 JSON", ex);
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        normalized.put("jsonText", jsonText);
        String resultPath = readText(firstNonNull(raw.get("jsonResultPath"), raw.get("resultPath")), "");
        if (StringUtils.hasText(resultPath)) {
            normalized.put("jsonResultPath", resultPath);
        }
        return toJson(normalized);
    }

    private Map<String, Object> mergeConfig(String datasourceConfigJson, String runtimeConfigText, String runtimeErrorMessage) {
        Map<String, Object> merged = new LinkedHashMap<>(parseJsonObject(datasourceConfigJson, "数据源配置格式不正确"));
        if (StringUtils.hasText(runtimeConfigText)) {
            merged.putAll(parseJsonObject(runtimeConfigText, runtimeErrorMessage));
        }
        return merged;
    }

    private Map<String, Object> parseJsonObject(String jsonText, String errorMessage) {
        if (!StringUtils.hasText(jsonText)) {
            return new LinkedHashMap<>();
        }
        try {
            JsonNode root = objectMapper.readTree(jsonText);
            if (!root.isObject()) {
                throw new IllegalArgumentException(errorMessage);
            }
            return objectMapper.convertValue(root, MAP_TYPE);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException(errorMessage, ex);
        }
    }

    private Map<String, Object> readMapObject(Object raw, String errorMessage) {
        if (raw == null) {
            return new LinkedHashMap<>();
        }
        if (raw instanceof Map<?, ?> rawMap) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            rawMap.forEach((key, value) -> {
                if (key != null) {
                    normalized.put(String.valueOf(key), value);
                }
            });
            return normalized;
        }
        if (raw instanceof String text) {
            return parseJsonObject(text, errorMessage);
        }
        throw new IllegalArgumentException(errorMessage);
    }

    private URI buildUri(String url, Map<String, Object> queryParams) {
        StringBuilder builder = new StringBuilder(url.trim());
        String joiner = builder.indexOf("?") >= 0 ? "&" : "?";
        for (Map.Entry<String, Object> entry : queryParams.entrySet()) {
            if (!StringUtils.hasText(entry.getKey()) || entry.getValue() == null) {
                continue;
            }
            builder.append(joiner)
                    .append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(String.valueOf(entry.getValue()), StandardCharsets.UTF_8));
            joiner = "&";
        }
        return URI.create(builder.toString());
    }

    private String serializeRequestBody(Object body) {
        if (body == null) {
            return "";
        }
        if (body instanceof String text) {
            return text;
        }
        try {
            return objectMapper.writeValueAsString(body);
        } catch (Exception ex) {
            throw new IllegalArgumentException("API body 配置无法序列化", ex);
        }
    }

    private JsonNode resolveResultNode(JsonNode root, String resultPath) {
        if (!StringUtils.hasText(resultPath)) {
            return root;
        }
        JsonNode current = root;
        String normalizedPath = resultPath.replace("[", ".").replace("]", "");
        for (String segment : normalizedPath.split("\\.")) {
            if (!StringUtils.hasText(segment)) {
                continue;
            }
            if (current == null || current.isMissingNode() || current.isNull()) {
                return objectMapper.getNodeFactory().nullNode();
            }
            if (current.isArray() && segment.chars().allMatch(Character::isDigit)) {
                current = current.path(Integer.parseInt(segment));
            } else {
                current = current.path(segment);
            }
        }
        return current;
    }

    private DatasetPreviewResponse buildPreviewResponse(JsonNode node, Integer maxRows) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return emptyPreviewResponse();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        int safeMaxRows = resolveMaxRows(maxRows);
        if (node.isArray()) {
            int index = 0;
            for (JsonNode item : node) {
                if (index++ >= safeMaxRows) {
                    break;
                }
                rows.add(convertJsonRow(item));
            }
        } else {
            rows.add(convertJsonRow(node));
        }
        return buildPreviewResponse(rows);
    }

    private DatasetPreviewResponse buildPreviewResponse(List<Map<String, Object>> rows) {
        LinkedHashSet<String> columns = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            columns.addAll(row.keySet());
        }
        DatasetPreviewResponse response = new DatasetPreviewResponse();
        response.setColumns(new ArrayList<>(columns));
        response.setRows(rows);
        response.setRowCount(rows.size());
        return response;
    }

    private DatasetPreviewResponse emptyPreviewResponse() {
        DatasetPreviewResponse response = new DatasetPreviewResponse();
        response.setColumns(List.of());
        response.setRows(List.of());
        response.setRowCount(0);
        return response;
    }

    private int resolveMaxRows(Integer maxRows) {
        if (maxRows == null || maxRows <= 0) {
            return Integer.MAX_VALUE;
        }
        return maxRows;
    }

    private Map<String, Object> convertJsonRow(JsonNode node) {
        if (node == null || node.isNull()) {
            return new LinkedHashMap<>();
        }
        if (node.isObject()) {
            return objectMapper.convertValue(node, MAP_TYPE);
        }
        if (node.isArray()) {
            Map<String, Object> row = new LinkedHashMap<>();
            int index = 1;
            for (JsonNode child : node) {
                row.put("column_" + index++, objectMapper.convertValue(child, Object.class));
            }
            return row;
        }
        return new LinkedHashMap<>(Map.of("value", objectMapper.convertValue(node, Object.class)));
    }

    private List<String> normalizeHeaderColumns(List<String> headers, int expectedSize) {
        List<String> normalized = new ArrayList<>();
        Map<String, Integer> counter = new LinkedHashMap<>();
        for (int index = 0; index < expectedSize; index++) {
            String base = index < headers.size() ? headers.get(index).trim() : "";
            if (!StringUtils.hasText(base)) {
                base = "column_" + (index + 1);
            }
            int count = counter.getOrDefault(base, 0);
            counter.put(base, count + 1);
            normalized.add(count == 0 ? base : base + "_" + (count + 1));
        }
        return normalized;
    }

    private List<String> buildDefaultColumns(int size) {
        List<String> columns = new ArrayList<>();
        for (int index = 0; index < size; index++) {
            columns.add("column_" + (index + 1));
        }
        return columns;
    }

    private List<String> parseDelimitedLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char currentChar = line.charAt(index);
            if (currentChar == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
                continue;
            }
            if (currentChar == delimiter && !quoted) {
                values.add(current.toString().trim());
                current.setLength(0);
                continue;
            }
            current.append(currentChar);
        }
        values.add(current.toString().trim());
        return values;
    }

    private DatasourceConnectionTestResponse buildConnectionResponse(String productName, String version, String message) {
        DatasourceConnectionTestResponse response = new DatasourceConnectionTestResponse();
        response.setSuccess(true);
        response.setMessage(message);
        response.setDatabaseProductName(productName);
        response.setDatabaseProductVersion(version);
        return response;
    }

    private String toJson(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config == null ? Map.of() : config);
        } catch (Exception ex) {
            throw new IllegalArgumentException("数据源配置序列化失败", ex);
        }
    }

    private String trimRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private String readText(Object raw, String defaultValue) {
        if (raw == null) {
            return defaultValue;
        }
        String text = String.valueOf(raw).trim();
        return text.isEmpty() ? defaultValue : text;
    }

    private boolean readBoolean(Object raw, boolean defaultValue) {
        if (raw == null) {
            return defaultValue;
        }
        if (raw instanceof Boolean bool) {
            return bool;
        }
        return Boolean.parseBoolean(String.valueOf(raw));
    }

    private Object firstNonNull(Object left, Object right) {
        return left != null ? left : right;
    }
}
