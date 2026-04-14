package com.aibi.bi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;

@Component
public class SchemaCompatibilityRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaCompatibilityRunner.class);

    private final JdbcTemplate jdbcTemplate;
    private final ChartTemplateService chartTemplateService;
    private final DatasetService datasetService;

    public SchemaCompatibilityRunner(JdbcTemplate jdbcTemplate,
                                     ChartTemplateService chartTemplateService,
                                     DatasetService datasetService) {
        this.jdbcTemplate = jdbcTemplate;
        this.chartTemplateService = chartTemplateService;
        this.datasetService = datasetService;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureDashboardComponentConfigColumn();
        ensureChartTemplateAssetColumns();
        chartTemplateService.ensureBuiltinAssets();
        datasetService.refreshAllDatasetFields();
    }

    private void ensureDashboardComponentConfigColumn() {
        if (!tableExists("bi_dashboard_component")) {
            log.warn("Table bi_dashboard_component does not exist yet, skip schema compatibility check");
            return;
        }

        if (columnExists("bi_dashboard_component", "config_json")) {
            return;
        }

        log.warn("Detected legacy schema: bi_dashboard_component.config_json is missing, applying compatibility migration");
        jdbcTemplate.execute("ALTER TABLE bi_dashboard_component ADD COLUMN config_json TEXT NOT NULL DEFAULT ('{}') AFTER z_index");
        jdbcTemplate.update("UPDATE bi_dashboard_component SET config_json = '{}' WHERE config_json IS NULL OR TRIM(config_json) = ''");
        log.info("Schema compatibility migration applied: bi_dashboard_component.config_json");
    }

    private void ensureChartTemplateAssetColumns() {
        if (!tableExists("bi_chart_template")) {
            log.warn("Table bi_chart_template does not exist yet, skip component asset compatibility check");
            return;
        }
        ensureColumn("bi_chart_template", "description", "ALTER TABLE bi_chart_template ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '' AFTER name");
        ensureColumn("bi_chart_template", "built_in", "ALTER TABLE bi_chart_template ADD COLUMN built_in TINYINT(1) NOT NULL DEFAULT 0 AFTER config_json");
        ensureColumn("bi_chart_template", "sort_order", "ALTER TABLE bi_chart_template ADD COLUMN sort_order INT NOT NULL DEFAULT 1000 AFTER built_in");
        ensureColumn("bi_chart_template", "created_by", "ALTER TABLE bi_chart_template ADD COLUMN created_by VARCHAR(64) NOT NULL DEFAULT 'system' AFTER sort_order");
        jdbcTemplate.update("UPDATE bi_chart_template SET description = '' WHERE description IS NULL");
        jdbcTemplate.update("UPDATE bi_chart_template SET built_in = 0 WHERE built_in IS NULL");
        jdbcTemplate.update("UPDATE bi_chart_template SET sort_order = 1000 WHERE sort_order IS NULL OR sort_order = 0");
        jdbcTemplate.update("UPDATE bi_chart_template SET created_by = 'system' WHERE created_by IS NULL OR TRIM(created_by) = ''");
    }

    private void ensureColumn(String tableName, String columnName, String ddl) {
        if (columnExists(tableName, columnName)) {
            return;
        }
        log.warn("Detected legacy schema: {}.{} is missing, applying compatibility migration", tableName, columnName);
        jdbcTemplate.execute(ddl);
    }

    private boolean tableExists(String tableName) {
        return Boolean.TRUE.equals(jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> {
            try (ResultSet resultSet = connection.getMetaData().getTables(connection.getCatalog(), null, tableName, new String[]{"TABLE"})) {
                return resultSet.next();
            }
        }));
    }

    private boolean columnExists(String tableName, String columnName) {
        return Boolean.TRUE.equals(jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> {
            try (ResultSet resultSet = connection.getMetaData().getColumns(connection.getCatalog(), null, tableName, columnName)) {
                return resultSet.next();
            }
        }));
    }
}