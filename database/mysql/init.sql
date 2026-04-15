CREATE DATABASE IF NOT EXISTS ai_bi;
USE ai_bi;

-- RBAC user table
CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
  email VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_sys_user_role_user FOREIGN KEY (user_id) REFERENCES sys_user(id),
  CONSTRAINT fk_sys_user_role_role FOREIGN KEY (role_id) REFERENCES sys_role(id)
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

-- BI dataset folder table
CREATE TABLE IF NOT EXISTS bi_dataset_folder (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    parent_id  BIGINT DEFAULT NULL COMMENT 'NULL=根目录',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_folder_parent FOREIGN KEY (parent_id) REFERENCES bi_dataset_folder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据集文件夹';

-- BI dataset table
CREATE TABLE IF NOT EXISTS bi_dataset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  datasource_id BIGINT DEFAULT NULL COMMENT '关联数据源，NULL 表示内置演示数据',
  sql_text TEXT NOT NULL,
  folder_id BIGINT DEFAULT NULL COMMENT '所属文件夹',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_dataset_folder FOREIGN KEY (folder_id) REFERENCES bi_dataset_folder(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bi_dataset_field (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dataset_id BIGINT NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  field_type VARCHAR(32) NOT NULL DEFAULT 'string',
  field_label VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_dataset_field_dataset FOREIGN KEY (dataset_id) REFERENCES bi_dataset(id)
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

CREATE TABLE IF NOT EXISTS sys_menu (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  path VARCHAR(255) NOT NULL DEFAULT '',
  component VARCHAR(128) NOT NULL DEFAULT '',
  parent_id BIGINT NULL,
  type VARCHAR(16) NOT NULL DEFAULT 'menu',
  permission VARCHAR(128) NOT NULL DEFAULT '',
  icon VARCHAR(64) NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 100,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  dashboard_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sys_menu_parent FOREIGN KEY (parent_id) REFERENCES sys_menu(id),
  CONSTRAINT fk_sys_menu_dashboard FOREIGN KEY (dashboard_id) REFERENCES bi_dashboard(id)
);

CREATE TABLE IF NOT EXISTS sys_role_menu (
  role_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, menu_id),
  CONSTRAINT fk_sys_role_menu_role FOREIGN KEY (role_id) REFERENCES sys_role(id),
  CONSTRAINT fk_sys_role_menu_menu FOREIGN KEY (menu_id) REFERENCES sys_menu(id)
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
  config_json TEXT NOT NULL DEFAULT ('{}') COMMENT '组件实例级配置（字段绑定、样式、交互）',
  CONSTRAINT fk_dc_dashboard FOREIGN KEY (dashboard_id) REFERENCES bi_dashboard(id),
  CONSTRAINT fk_dc_chart FOREIGN KEY (chart_id) REFERENCES bi_chart(id)
);

-- BI component asset table（沿用 bi_chart_template，存放默认组件与可复用组件资产）
CREATE TABLE IF NOT EXISTS bi_chart_template (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  chart_type VARCHAR(32) NOT NULL,
  config_json TEXT NOT NULL COMMENT '默认字段映射、样式、颜色等配置',
  built_in TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=默认组件，0=用户自定义组件',
  sort_order INT NOT NULL DEFAULT 1000 COMMENT '排序值，默认组件优先且按该值排序',
  created_by VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reset seed data to keep local environment consistent.
DELETE FROM bi_dashboard_component;
DELETE FROM bi_dataset_field;
DELETE FROM bi_chart_template;
DELETE FROM bi_chart;
DELETE FROM bi_dataset;
DELETE FROM bi_dataset_folder;
DELETE FROM bi_datasource;
DELETE FROM sys_role_menu;
DELETE FROM sys_menu;
DELETE FROM sys_user_role;
DELETE FROM sys_role;
DELETE FROM sys_user;
DELETE FROM bi_dashboard;
-- Reset auto_increment so demo dataset IDs are predictable
ALTER TABLE bi_dataset AUTO_INCREMENT = 1;
ALTER TABLE bi_dataset_field AUTO_INCREMENT = 1;
ALTER TABLE bi_chart AUTO_INCREMENT = 1;
ALTER TABLE bi_chart_template AUTO_INCREMENT = 1;
ALTER TABLE bi_datasource AUTO_INCREMENT = 1;

INSERT INTO sys_user(username, password_hash, display_name, role, email)
VALUES ('admin', '123456', 'Admin', 'ADMIN', 'admin@aibi.local');

INSERT INTO sys_role(name)
VALUES ('ADMIN'), ('ANALYST'), ('VIEWER');

INSERT INTO sys_user_role(user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
INNER JOIN sys_role r ON r.name = u.role;

INSERT INTO bi_datasource(name, host, port, database_name)
VALUES
('ERP MySQL', '127.0.0.1', 3306, 'erp'),
('MES MySQL', '127.0.0.1', 3307, 'mes'),
('CRM MySQL', '127.0.0.1', 3308, 'crm');

INSERT INTO bi_dataset_folder (id, name, parent_id, sort_order)
VALUES (1, '演示数据集', NULL, 0);

INSERT INTO bi_dataset(id, name, datasource_id, sql_text, folder_id)
VALUES
(1, 'Sales Trend Dataset', 1, 'SELECT biz_date, amount FROM dwd_sales ORDER BY biz_date', NULL),
(2, 'Order Detail Dataset', 1, 'SELECT order_id, amount, region FROM dwd_order_detail', NULL);

-- Demo datasets (internal, no datasource required) -- IDs 3-6 are fixed for template references
INSERT INTO bi_dataset(id, name, datasource_id, sql_text, folder_id)
VALUES
(3, '销售额月度趋势（演示）', NULL, 'SELECT * FROM demo_sales_monthly', 1),
(4, '各区域销售额（演示）', NULL, 'SELECT * FROM demo_sales_region', 1),
(5, '产品类别占比（演示）', NULL, 'SELECT * FROM demo_category_pie', 1),
(6, '用户增长趋势（演示）', NULL, 'SELECT * FROM demo_user_growth', 1);
-- Ensure auto_increment continues after explicit inserts
ALTER TABLE bi_dataset AUTO_INCREMENT = 7;

INSERT INTO bi_dataset_field(dataset_id, field_name, field_type, field_label)
VALUES
(1, 'biz_date', 'datetime', 'biz_date'),
(1, 'amount', 'number', 'amount'),
(2, 'order_id', 'string', 'order_id'),
(2, 'amount', 'number', 'amount'),
(2, 'region', 'string', 'region');

INSERT INTO bi_chart(name, dataset_id, chart_type, x_field, y_field)
VALUES
('Sales Trend', 1, 'line', 'biz_date', 'amount'),
('Product Ranking', 1, 'bar', 'biz_date', 'amount'),
('Order Detail', 2, 'table', 'order_id', 'amount');

INSERT INTO bi_dashboard(name, layout_json)
VALUES ('Business Overview', '{"theme":"default","backgroundColor":"#f0f2f5"}');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
VALUES
('工作台', '/home', 'HomeView', NULL, 'menu', 'workbench:view', 'House', 10, 1, NULL),
('仪表板', '/home/dashboard', 'DashboardView', NULL, 'menu', 'dashboard:view', 'DataBoard', 20, 1, 1),
('数据大屏', '/home/screen', 'DataScreenView', NULL, 'menu', 'screen:view', 'Monitor', 30, 1, 1),
('数据准备', '/home/prepare', 'DataPrepareView', NULL, 'menu', 'dataset:view', 'Collection', 40, 1, NULL),
('数据建模', '/home/modeling', 'ModelingView', NULL, 'menu', 'model:view', 'Connection', 50, 1, NULL),
('系统管理', '/home/system', 'SystemView', NULL, 'menu', 'system:view', 'Setting', 60, 1, NULL);

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据源管理', '/home/prepare/datasource', 'DataPrepareView', p.id, 'menu', 'datasource:view', 'Coin', 41, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据集管理', '/home/prepare/dataset', 'DataPrepareView', p.id, 'menu', 'dataset:view', 'Tickets', 42, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '组件管理', '/home/prepare/components', 'DataPrepareView', p.id, 'menu', 'component:view', 'Grid', 43, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据抽取', '/home/prepare/extract', 'DataPrepareView', p.id, 'menu', 'extract:view', 'Refresh', 44, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '基础设置', '/home/system/settings', 'SystemView', p.id, 'menu', 'system:settings', 'Tools', 61, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '用户管理', '/home/system/users', 'SystemView', p.id, 'menu', 'system:user', 'User', 62, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '角色管理', '/home/system/roles', 'SystemView', p.id, 'menu', 'system:role', 'Avatar', 63, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '菜单权限管理', '/home/system/menus', 'SystemView', p.id, 'menu', 'system:menu', 'Menu', 64, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '审计日志', '/home/system/audit', 'SystemView', p.id, 'menu', 'system:audit', 'Document', 65, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '登录日志', '/home/system/login-logs', 'SystemView', p.id, 'menu', 'system:login-log', 'Histogram', 66, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '系统监控', '/home/system/monitor', 'SystemView', p.id, 'menu', 'system:monitor', 'Monitor', 67, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON 1 = 1
WHERE r.name = 'ADMIN';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/dashboard', '/home/screen', '/home/prepare', '/home/modeling')
WHERE r.name = 'ANALYST';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home/prepare/datasource', '/home/prepare/dataset', '/home/prepare/components', '/home/prepare/extract')
WHERE r.name = 'ANALYST';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/dashboard', '/home/screen')
WHERE r.name = 'VIEWER';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
VALUES (1, 1, 0, 0, 12, 4),
       (1, 2, 12, 0, 12, 4),
       (1, 3, 0, 4, 24, 4);

INSERT INTO bi_chart_template(name, description, chart_type, config_json, built_in, sort_order, created_by)
VALUES
('晨光趋势卡', '适合首页趋势区，默认柔和渐变和面积填充。', 'line', '{"chart":{"name":"晨光趋势卡","datasetId":3,"chartType":"line","xField":"月份","yField":"销售额","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#f6fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":true,"areaFill":true,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":560,"height":320}}', 1, 10, 'system'),
('经营对比卡', '适合经营总览中的分类对比。', 'bar', '{"chart":{"name":"经营对比卡","datasetId":4,"chartType":"bar","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"琥珀橙金","bgColor":"#fffaf3","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":10,"barMaxWidth":32,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}', 1, 20, 'system'),
('排行条形卡', '适合 TopN 榜单和长名称类目。', 'bar_horizontal', '{"chart":{"name":"排行条形卡","datasetId":4,"chartType":"bar_horizontal","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f5fcf8","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":12,"barMaxWidth":26,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":340}}', 1, 30, 'system'),
('结构占比卡', '适合结构占比、贡献度分析。', 'doughnut', '{"chart":{"name":"结构占比卡","datasetId":5,"chartType":"doughnut","xField":"产品类别","yField":"销售占比","groupField":""},"style":{"theme":"霓光星砂","bgColor":"#fff9fb","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"right"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":420,"height":320}}', 1, 40, 'system'),
('转化漏斗卡', '适合阶段转化与流程流失分析。', 'funnel', '{"chart":{"name":"转化漏斗卡","datasetId":4,"chartType":"funnel","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"暮光珊瑚","bgColor":"#fff8f5","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":420,"height":320}}', 1, 50, 'system'),
('目标仪表卡', '适合完成率、达成率和告警值展示。', 'gauge', '{"chart":{"name":"目标仪表卡","datasetId":3,"chartType":"gauge","xField":"月份","yField":"销售额","groupField":""},"style":{"theme":"深海荧光","bgColor":"#f4fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":360,"height":300}}', 1, 60, 'system'),
('能力雷达卡', '适合多维度能力、质量评分等场景。', 'radar', '{"chart":{"name":"能力雷达卡","datasetId":4,"chartType":"radar","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f8fbff","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":480,"height":340}}', 1, 70, 'system'),
('关系散点卡', '适合相关性、分布和聚类趋势观察。', 'scatter', '{"chart":{"name":"关系散点卡","datasetId":4,"chartType":"scatter","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"深海荧光","bgColor":"#f5fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":340}}', 1, 80, 'system'),
('经营明细表', '适合明细追踪、问题回溯和导出。', 'table', '{"chart":{"name":"经营明细表","datasetId":4,"chartType":"table","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#ffffff","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":640,"height":360}}', 1, 90, 'system');
