package com.aibi.bi.service;

import com.aibi.bi.domain.BiDatasource;
import com.aibi.bi.model.response.ColumnInfo;
import com.aibi.bi.model.response.DatasourceConnectionTestResponse;
import com.aibi.bi.model.response.DatasetPreviewResponse;
import com.aibi.bi.model.response.TableInfo;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class JdbcPreviewService {

    private static final int PREVIEW_LIMIT = 20;

    @FunctionalInterface
    public interface ResultSetExtractor<T> {
        T extract(ResultSet resultSet) throws SQLException;
    }

    public DatasourceConnectionTestResponse testConnection(BiDatasource datasource) {
        try (Connection connection = openConnection(datasource)) {
            DatasourceConnectionTestResponse response = new DatasourceConnectionTestResponse();
            response.setSuccess(true);
            response.setMessage("连接成功");
            response.setDatabaseProductName(connection.getMetaData().getDatabaseProductName());
            response.setDatabaseProductVersion(connection.getMetaData().getDatabaseProductVersion());
            return response;
        } catch (SQLException ex) {
            throw new IllegalArgumentException("连接失败: " + ex.getMessage(), ex);
        }
    }

    public DatasetPreviewResponse preview(BiDatasource datasource, String sqlText) {
        return query(datasource, sqlText, PREVIEW_LIMIT);
    }

    public DatasetPreviewResponse query(BiDatasource datasource, String sqlText, Integer maxRows) {
        return executeQuery(datasource, sqlText, maxRows, resultSet -> buildPreviewResponse(resultSet, maxRows));
    }

    public <T> T executeQuery(BiDatasource datasource, String sqlText, Integer maxRows, ResultSetExtractor<T> extractor) {
        validatePreviewSql(sqlText);
        try (Connection connection = openConnection(datasource);
             PreparedStatement statement = createPreparedStatement(connection, datasource, sqlText.trim(), maxRows)) {
            boolean hasResultSet = statement.execute();
            if (!hasResultSet) {
                throw new IllegalArgumentException("预览 SQL 必须返回结果集");
            }
            try (ResultSet resultSet = statement.getResultSet()) {
                return extractor.extract(resultSet);
            }
        } catch (SQLException ex) {
            throw new IllegalArgumentException("SQL 预览失败: " + ex.getMessage(), ex);
        }
    }

    private PreparedStatement createPreparedStatement(Connection connection, BiDatasource datasource, String sqlText, Integer maxRows) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sqlText, ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
        if (maxRows != null && maxRows > 0) {
            statement.setMaxRows(maxRows);
        }
        String type = datasourceType(datasource);
        if ("MYSQL".equals(type)) {
            statement.setFetchSize(Integer.MIN_VALUE);
        } else if (maxRows != null && maxRows > 0) {
            statement.setFetchSize(Math.min(maxRows, 1000));
        } else {
            statement.setFetchSize(500);
        }
        return statement;
    }

    public List<TableInfo> listTables(BiDatasource datasource) {
        try (Connection conn = openConnection(datasource)) {
            DatabaseMetaData meta = conn.getMetaData();
            String type = datasourceType(datasource);
            // For PostgreSQL the schema is typically "public", for others use the catalog
            String catalog = "POSTGRESQL".equals(type) ? null : datasource.getDatabaseName();
            String schema = "POSTGRESQL".equals(type) ? "public" : null;
            List<TableInfo> tables = new ArrayList<>();
            try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[]{"TABLE", "VIEW"})) {
                while (rs.next()) {
                    TableInfo info = new TableInfo();
                    info.setTableName(rs.getString("TABLE_NAME"));
                    info.setTableType(rs.getString("TABLE_TYPE"));
                    info.setComment(rs.getString("REMARKS"));
                    tables.add(info);
                }
            }
            return tables;
        } catch (SQLException ex) {
            throw new IllegalArgumentException("获取数据表列表失败: " + ex.getMessage(), ex);
        }
    }

    public List<ColumnInfo> listColumns(BiDatasource datasource, String tableName) {
        if (tableName == null || tableName.isBlank()) {
            throw new IllegalArgumentException("tableName 不能为空");
        }
        try (Connection conn = openConnection(datasource)) {
            DatabaseMetaData meta = conn.getMetaData();
            String type = datasourceType(datasource);
            String catalog = "POSTGRESQL".equals(type) ? null : datasource.getDatabaseName();
            String schema = "POSTGRESQL".equals(type) ? "public" : null;
            List<ColumnInfo> columns = new ArrayList<>();
            try (ResultSet rs = meta.getColumns(catalog, schema, tableName, "%")) {
                while (rs.next()) {
                    ColumnInfo info = new ColumnInfo();
                    info.setColumnName(rs.getString("COLUMN_NAME"));
                    info.setDataType(rs.getString("TYPE_NAME"));
                    info.setRemarks(rs.getString("REMARKS"));
                    info.setNullable(rs.getInt("NULLABLE") != DatabaseMetaData.columnNoNulls);
                    columns.add(info);
                }
            }
            return columns;
        } catch (SQLException ex) {
            throw new IllegalArgumentException("获取列信息失败: " + ex.getMessage(), ex);
        }
    }

    private Connection openConnection(BiDatasource datasource) throws SQLException {
        DriverManager.setLoginTimeout(5);
        return DriverManager.getConnection(buildJdbcUrl(datasource),
                datasource.getDbUsername(), datasource.getDbPassword());
    }

    private String buildJdbcUrl(BiDatasource datasource) {
        String type = datasourceType(datasource);
        String host = datasource.getHost();
        int port = datasource.getPort();
        String db = datasource.getDatabaseName();
        return switch (type) {
            case "POSTGRESQL" -> String.format(Locale.ROOT,
                    "jdbc:postgresql://%s:%d/%s", host, port, db);
            case "CLICKHOUSE" -> String.format(Locale.ROOT,
                    "jdbc:clickhouse://%s:%d/%s", host, port, db);
            case "SQLSERVER" -> String.format(Locale.ROOT,
                    "jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=false;trustServerCertificate=true",
                    host, port, db);
            case "ORACLE" -> String.format(Locale.ROOT,
                    "jdbc:oracle:thin:@%s:%d:%s", host, port, db);
            default -> String.format(Locale.ROOT,
                    "jdbc:mysql://%s:%d/%s?useUnicode=true&characterEncoding=UTF-8" +
                    "&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true",
                    host, port, db);
        };
    }

    private String datasourceType(BiDatasource datasource) {
        String type = datasource.getDatasourceType();
        return type != null ? type.toUpperCase(Locale.ROOT) : "MYSQL";
    }

    private void validatePreviewSql(String sqlText) {
        String normalized = sqlText == null ? "" : sqlText.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("SQL 不能为空");
        }
        if (!(normalized.startsWith("select") || normalized.startsWith("with") || normalized.startsWith("show")
                || normalized.startsWith("desc") || normalized.startsWith("describe") || normalized.startsWith("explain"))) {
            throw new IllegalArgumentException("仅支持预览查询类 SQL");
        }
    }

    private DatasetPreviewResponse buildPreviewResponse(ResultSet resultSet, Integer maxRows) throws SQLException {
        ResultSetMetaData metaData = resultSet.getMetaData();
        int columnCount = metaData.getColumnCount();
        List<String> columns = new ArrayList<>(columnCount);
        for (int index = 1; index <= columnCount; index++) {
            columns.add(metaData.getColumnLabel(index));
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        int safeMaxRows = maxRows == null || maxRows <= 0 ? Integer.MAX_VALUE : maxRows;
        while (resultSet.next()) {
            if (rows.size() >= safeMaxRows) {
                break;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            for (int index = 1; index <= columnCount; index++) {
                row.put(columns.get(index - 1), resultSet.getObject(index));
            }
            rows.add(row);
        }

        DatasetPreviewResponse response = new DatasetPreviewResponse();
        response.setColumns(columns);
        response.setRows(rows);
        response.setRowCount(rows.size());
        return response;
    }
}
