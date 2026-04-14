SET @has_component_config := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_dashboard_component'
    AND column_name = 'config_json'
);
SET @add_component_config_sql := IF(
  @has_component_config = 0,
  "ALTER TABLE bi_dashboard_component ADD COLUMN config_json TEXT NOT NULL DEFAULT ('{}') AFTER z_index",
  "SELECT 1"
);
PREPARE add_component_config_stmt FROM @add_component_config_sql;
EXECUTE add_component_config_stmt;
DEALLOCATE PREPARE add_component_config_stmt;

UPDATE bi_dashboard_component
SET config_json = '{}'
WHERE config_json IS NULL OR TRIM(config_json) = '';
