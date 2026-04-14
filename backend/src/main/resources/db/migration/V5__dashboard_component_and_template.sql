SET @has_x_field := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart'
    AND column_name = 'x_field'
);
SET @add_x_field_sql := IF(
  @has_x_field = 0,
  "ALTER TABLE bi_chart ADD COLUMN x_field VARCHAR(128) NOT NULL DEFAULT '' AFTER chart_type",
  "SELECT 1"
);
PREPARE add_x_field_stmt FROM @add_x_field_sql;
EXECUTE add_x_field_stmt;
DEALLOCATE PREPARE add_x_field_stmt;

SET @has_y_field := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart'
    AND column_name = 'y_field'
);
SET @add_y_field_sql := IF(
  @has_y_field = 0,
  "ALTER TABLE bi_chart ADD COLUMN y_field VARCHAR(128) NOT NULL DEFAULT '' AFTER x_field",
  "SELECT 1"
);
PREPARE add_y_field_stmt FROM @add_y_field_sql;
EXECUTE add_y_field_stmt;
DEALLOCATE PREPARE add_y_field_stmt;

SET @has_group_field := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart'
    AND column_name = 'group_field'
);
SET @add_group_field_sql := IF(
  @has_group_field = 0,
  "ALTER TABLE bi_chart ADD COLUMN group_field VARCHAR(128) NOT NULL DEFAULT '' AFTER y_field",
  "SELECT 1"
);
PREPARE add_group_field_stmt FROM @add_group_field_sql;
EXECUTE add_group_field_stmt;
DEALLOCATE PREPARE add_group_field_stmt;

CREATE TABLE IF NOT EXISTS bi_dashboard_component (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dashboard_id BIGINT NOT NULL,
  chart_id BIGINT NOT NULL,
  pos_x INT NOT NULL DEFAULT 0 COMMENT '列位置(0-23)',
  pos_y INT NOT NULL DEFAULT 0 COMMENT '行位置',
  width INT NOT NULL DEFAULT 12 COMMENT '列宽(1-24)',
  height INT NOT NULL DEFAULT 4 COMMENT '行高',
  z_index INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_dc_dashboard FOREIGN KEY (dashboard_id) REFERENCES bi_dashboard(id),
  CONSTRAINT fk_dc_chart FOREIGN KEY (chart_id) REFERENCES bi_chart(id)
);

SET @has_old_dashboard_chart := (
  SELECT COUNT(1)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_dashboard_chart'
);

SET @copy_dashboard_chart_sql := IF(
  @has_old_dashboard_chart > 0,
  "INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height)
   SELECT dashboard_id,
          chart_id,
          ((ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY id) - 1) % 2) * 12 AS pos_x,
          ((ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY id) - 1) / 2) * 4 AS pos_y,
          12,
          4
   FROM bi_dashboard_chart old_dc
   WHERE NOT EXISTS (
     SELECT 1 FROM bi_dashboard_component new_dc
     WHERE new_dc.dashboard_id = old_dc.dashboard_id
       AND new_dc.chart_id = old_dc.chart_id
   )",
  "SELECT 1"
);
PREPARE copy_dashboard_chart_stmt FROM @copy_dashboard_chart_sql;
EXECUTE copy_dashboard_chart_stmt;
DEALLOCATE PREPARE copy_dashboard_chart_stmt;

CREATE TABLE IF NOT EXISTS bi_chart_template (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  chart_type VARCHAR(32) NOT NULL,
  config_json TEXT NOT NULL COMMENT '默认字段映射、样式、颜色等配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bi_chart_template (name, chart_type, config_json)
SELECT * FROM (
  SELECT '折线图-时间趋势' AS name, 'line' AS chart_type,
         '{"xField":"date","yField":"value","title":"趋势图","smooth":true}' AS config_json
  UNION ALL
  SELECT '柱状图-分类对比', 'bar',
         '{"xField":"category","yField":"value","title":"分类对比"}'
  UNION ALL
  SELECT '饼图-占比分析', 'pie',
         '{"xField":"category","yField":"value","title":"占比分析"}'
) seeded
WHERE NOT EXISTS (
  SELECT 1 FROM bi_chart_template existing_template WHERE existing_template.name = seeded.name
);
