CREATE DATABASE IF NOT EXISTS ai_bi;
USE ai_bi;

-- BI user table
CREATE TABLE IF NOT EXISTS bi_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
  email VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BI datasource table
CREATE TABLE IF NOT EXISTS bi_datasource (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  datasource_type VARCHAR(32) NOT NULL DEFAULT 'MYSQL',
  connect_mode VARCHAR(16) NOT NULL DEFAULT 'DIRECT',
  host VARCHAR(128) NOT NULL,
  port INT NOT NULL,
  database_name VARCHAR(128) NOT NULL,
  db_username VARCHAR(128) NOT NULL DEFAULT '',
  db_password VARCHAR(256) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BI dataset table
CREATE TABLE IF NOT EXISTS bi_dataset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  datasource_id BIGINT NOT NULL,
  sql_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_dataset_datasource FOREIGN KEY (datasource_id) REFERENCES bi_datasource(id)
);

-- BI chart table
CREATE TABLE IF NOT EXISTS bi_chart (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  dataset_id BIGINT NOT NULL,
  chart_type VARCHAR(32) NOT NULL,
  x_field VARCHAR(128) NOT NULL DEFAULT '',
  y_field VARCHAR(128) NOT NULL DEFAULT '',
  group_field VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_chart_dataset FOREIGN KEY (dataset_id) REFERENCES bi_dataset(id)
);

-- BI dashboard table
CREATE TABLE IF NOT EXISTS bi_dashboard (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  layout_json TEXT NOT NULL DEFAULT ('{}') COMMENT '页面级配置（背景色、主题等）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BI dashboard component table（存放仪表板里每个图表组件的位置和尺寸）
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

-- BI chart template table（存放可复用的图表模板）
CREATE TABLE IF NOT EXISTS bi_chart_template (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  chart_type VARCHAR(32) NOT NULL,
  config_json TEXT NOT NULL COMMENT '默认字段映射、样式、颜色等配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reset seed data to keep local environment consistent.
DELETE FROM bi_dashboard_component;
DELETE FROM bi_chart_template;
DELETE FROM bi_chart;
DELETE FROM bi_dataset;
DELETE FROM bi_datasource;
DELETE FROM bi_dashboard;
DELETE FROM bi_user;

INSERT INTO bi_user(username, password_hash, display_name, role, email)
VALUES ('admin', '123456', 'Admin', 'ADMIN', 'admin@aibi.local');

INSERT INTO bi_datasource(name, host, port, database_name)
VALUES
('ERP MySQL', '127.0.0.1', 3306, 'erp'),
('MES MySQL', '127.0.0.1', 3307, 'mes'),
('CRM MySQL', '127.0.0.1', 3308, 'crm');

INSERT INTO bi_dataset(name, datasource_id, sql_text)
VALUES
('Sales Trend Dataset', 1, 'SELECT biz_date, amount FROM dwd_sales ORDER BY biz_date'),
('Order Detail Dataset', 1, 'SELECT order_id, amount, region FROM dwd_order_detail');

INSERT INTO bi_chart(name, dataset_id, chart_type, x_field, y_field)
VALUES
('Sales Trend', 1, 'line', 'biz_date', 'amount'),
('Product Ranking', 1, 'bar', 'biz_date', 'amount'),
('Order Detail', 2, 'table', 'order_id', 'amount');

INSERT INTO bi_dashboard(name, layout_json)
VALUES ('Business Overview', '{"theme":"default","backgroundColor":"#f0f2f5"}');

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
VALUES (1, 1, 0, 0, 12, 4),
       (1, 2, 12, 0, 12, 4),
       (1, 3, 0, 4, 24, 4);

INSERT INTO bi_chart_template(name, chart_type, config_json)
VALUES
('折线图-时间趋势', 'line', '{"xField":"date","yField":"value","title":"趋势图","smooth":true}'),
('柱状图-分类对比', 'bar', '{"xField":"category","yField":"value","title":"分类对比"}'),
('饼图-占比分析', 'pie', '{"xField":"category","yField":"value","title":"占比分析"}');
