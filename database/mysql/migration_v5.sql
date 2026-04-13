-- Migration V5: 补建组件布局表和图表模板表，修复 bi_chart 缺失字段
USE ai_bi;

-- 1. 修复 bi_chart：补齐字段配置列
ALTER TABLE bi_chart
  ADD COLUMN IF NOT EXISTS x_field VARCHAR(128) NOT NULL DEFAULT '' AFTER chart_type,
  ADD COLUMN IF NOT EXISTS y_field VARCHAR(128) NOT NULL DEFAULT '' AFTER x_field,
  ADD COLUMN IF NOT EXISTS group_field VARCHAR(128) NOT NULL DEFAULT '' AFTER y_field;

-- 2. 修复 bi_dashboard：将 layout_json 列重命名为 config_json（MySQL 8.0+）
ALTER TABLE bi_dashboard
  RENAME COLUMN layout_json TO config_json;

-- 3. 新建仪表板组件布局表（替代无位置信息的 bi_dashboard_chart）
CREATE TABLE IF NOT EXISTS bi_dashboard_component (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  dashboard_id BIGINT NOT NULL,
  chart_id     BIGINT NOT NULL,
  pos_x        INT    NOT NULL DEFAULT 0  COMMENT '列位置(0-23)',
  pos_y        INT    NOT NULL DEFAULT 0  COMMENT '行位置',
  width        INT    NOT NULL DEFAULT 12 COMMENT '列宽(1-24)',
  height       INT    NOT NULL DEFAULT 4  COMMENT '行高',
  z_index      INT    NOT NULL DEFAULT 0,
  CONSTRAINT fk_dc_dashboard FOREIGN KEY (dashboard_id) REFERENCES bi_dashboard(id),
  CONSTRAINT fk_dc_chart     FOREIGN KEY (chart_id)     REFERENCES bi_chart(id)
);

-- 4. 将旧 bi_dashboard_chart 数据迁移到 bi_dashboard_component（给予默认坐标）
INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT  dashboard_id,
        chart_id,
        ((ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY id) - 1) % 2) * 12 AS pos_x,
        ((ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY id) - 1) / 2) * 4  AS pos_y,
        12,
        4
FROM    bi_dashboard_chart
WHERE   NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc2
    WHERE dc2.dashboard_id = bi_dashboard_chart.dashboard_id
      AND dc2.chart_id     = bi_dashboard_chart.chart_id
);

-- 5. 新建图表模板表
CREATE TABLE IF NOT EXISTS bi_chart_template (
  id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(128) NOT NULL,
  chart_type  VARCHAR(32)  NOT NULL,
  config_json TEXT         NOT NULL COMMENT '默认字段映射、样式、颜色等配置',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 6. 内置模板种子数据（幂等）
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
) t
WHERE NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = t.name);
