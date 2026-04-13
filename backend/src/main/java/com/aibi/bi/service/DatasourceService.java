package com.aibi.bi.service;

import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.mapper.BiDatasourceMapper;
import com.aibi.bi.model.request.CreateDatasourceRequest;
import com.aibi.bi.model.request.DatasourceConnectionTestRequest;
import com.aibi.bi.model.request.ExtractPreviewRequest;
import com.aibi.bi.model.request.UpdateDatasourceRequest;
import com.aibi.bi.model.response.DatasourceConnectionTestResponse;
import com.aibi.bi.model.response.ColumnInfo;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.aibi.bi.model.response.ExtractPreviewResponse;
import com.aibi.bi.model.response.TableInfo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class DatasourceService {

    private static final Pattern SAFE_TABLE = Pattern.compile("^[a-zA-Z0-9_\\.]+$");

    private final BiDatasourceMapper biDatasourceMapper;
    private final JdbcPreviewService jdbcPreviewService;

    public DatasourceService(BiDatasourceMapper biDatasourceMapper, JdbcPreviewService jdbcPreviewService) {
        this.biDatasourceMapper = biDatasourceMapper;
        this.jdbcPreviewService = jdbcPreviewService;
    }

    public List<BiDatasource> list() {
        return biDatasourceMapper.listAll();
    }

    public BiDatasource getById(Long id) {
        return biDatasourceMapper.findById(id);
    }

    public BiDatasource create(CreateDatasourceRequest request) {
        BiDatasource entity = buildDatasource(request.getDatasourceType(), request.getConnectMode(),
                request.getHost(), request.getPort(), request.getDatabaseName(),
                request.getUsername(), request.getPassword());
        entity.setName(request.getName());
        biDatasourceMapper.insert(entity);
        return entity;
    }

    public BiDatasource update(Long id, UpdateDatasourceRequest request) {
        BiDatasource entity = biDatasourceMapper.findById(id);
        if (entity == null) {
            throw new IllegalArgumentException("Datasource not found: " + id);
        }
        entity.setName(request.getName());
        entity.setDatasourceType(normalizeType(request.getDatasourceType()));
        entity.setConnectMode(normalizeMode(request.getConnectMode()));
        entity.setHost(request.getHost());
        entity.setPort(request.getPort());
        entity.setDatabaseName(request.getDatabaseName());
        entity.setDbUsername(normalizeCredential(request.getUsername()));
        entity.setDbPassword(normalizeCredential(request.getPassword()));
        biDatasourceMapper.update(entity);
        return entity;
    }

    public DatasourceConnectionTestResponse testConnection(DatasourceConnectionTestRequest request) {
        BiDatasource temp = buildDatasource(request.getDatasourceType(), null,
                request.getHost(), request.getPort(),
                request.getDatabaseName(), request.getUsername(), request.getPassword());
        return jdbcPreviewService.testConnection(temp);
    }

    public ExtractPreviewResponse previewExtract(ExtractPreviewRequest request) {
        BiDatasource entity = biDatasourceMapper.findById(request.getDatasourceId());
        if (entity == null) {
            throw new IllegalArgumentException("Datasource not found: " + request.getDatasourceId());
        }

        String table = request.getTableName() == null ? "" : request.getTableName().trim();
        if (!SAFE_TABLE.matcher(table).matches()) {
            throw new IllegalArgumentException("tableName 包含非法字符，仅支持字母数字下划线与点号");
        }

        String whereClause = request.getWhereClause() == null ? "" : request.getWhereClause().trim();
        if (whereClause.contains(";") || whereClause.toLowerCase().contains(" drop ")
                || whereClause.toLowerCase().contains(" delete ")
                || whereClause.toLowerCase().contains(" update ")
                || whereClause.toLowerCase().contains(" insert ")) {
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
        BiDatasource entity = biDatasourceMapper.findById(id);
        if (entity == null) {
            throw new IllegalArgumentException("Datasource not found: " + id);
        }
        return jdbcPreviewService.listTables(entity);
    }

    public List<ColumnInfo> listColumns(Long id, String tableName) {
        BiDatasource entity = biDatasourceMapper.findById(id);
        if (entity == null) {
            throw new IllegalArgumentException("Datasource not found: " + id);
        }
        return jdbcPreviewService.listColumns(entity, tableName);
    }

    public void delete(Long id) {
        biDatasourceMapper.deleteById(id);
    }

    private BiDatasource buildDatasource(String datasourceType, String connectMode,
                                         String host, Integer port, String databaseName,
                                         String username, String password) {
        BiDatasource entity = new BiDatasource();
        entity.setDatasourceType(normalizeType(datasourceType));
        entity.setConnectMode(normalizeMode(connectMode));
        entity.setHost(host);
        entity.setPort(port);
        entity.setDatabaseName(databaseName);
        entity.setDbUsername(normalizeCredential(username));
        entity.setDbPassword(normalizeCredential(password));
        return entity;
    }

    private String normalizeType(String type) {
        return type != null && !type.isBlank() ? type.toUpperCase() : "MYSQL";
    }

    private String normalizeMode(String mode) {
        return mode != null && !mode.isBlank() ? mode.toUpperCase() : "DIRECT";
    }

    private String normalizeCredential(String value) {
        return value != null ? value : "";
    }
}

