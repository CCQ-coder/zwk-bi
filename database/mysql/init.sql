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

CREATE TABLE IF NOT EXISTS bi_datasource_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据源分组';

-- BI datasource table
CREATE TABLE IF NOT EXISTS bi_datasource (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  group_id BIGINT DEFAULT NULL COMMENT '所属分组',
  source_kind VARCHAR(32) NOT NULL DEFAULT 'DATABASE',
  datasource_type VARCHAR(32) NOT NULL DEFAULT 'MYSQL',
  connect_mode VARCHAR(16) NOT NULL DEFAULT 'DIRECT',
  host VARCHAR(128) NOT NULL,
  port INT NOT NULL,
  database_name VARCHAR(128) NOT NULL,
  db_username VARCHAR(128) NOT NULL DEFAULT '',
  db_password VARCHAR(256) NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_datasource_group FOREIGN KEY (group_id) REFERENCES bi_datasource_group(id) ON DELETE SET NULL
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
  is_filterable TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bi_dataset_field_dataset FOREIGN KEY (dataset_id) REFERENCES bi_dataset(id)
);

-- BI chart table
CREATE TABLE IF NOT EXISTS bi_chart (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  dataset_id BIGINT NULL COMMENT '数据驱动组件绑定数据集，静态组件可为空',
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

CREATE TABLE IF NOT EXISTS bi_publish_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 100,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bi_publish_group_dashboard (
  group_id BIGINT NOT NULL,
  dashboard_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, dashboard_id),
  UNIQUE KEY uk_bi_publish_group_dashboard_dashboard (dashboard_id),
  CONSTRAINT fk_bi_publish_group_dashboard_group FOREIGN KEY (group_id) REFERENCES bi_publish_group(id) ON DELETE CASCADE,
  CONSTRAINT fk_bi_publish_group_dashboard_dashboard FOREIGN KEY (dashboard_id) REFERENCES bi_dashboard(id) ON DELETE CASCADE
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
DELETE FROM bi_publish_group_dashboard;
DELETE FROM bi_publish_group;
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
ALTER TABLE bi_publish_group AUTO_INCREMENT = 1;

INSERT INTO sys_user(username, password_hash, display_name, role, email)
VALUES ('admin', '123456', 'Admin', 'ADMIN', 'admin@aibi.local');

INSERT INTO sys_role(name)
VALUES ('ADMIN'), ('ANALYST'), ('VIEWER');

INSERT INTO sys_user_role(user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
INNER JOIN sys_role r ON r.name = u.role;

INSERT INTO bi_datasource(name, source_kind, host, port, database_name)
VALUES
('ERP MySQL', 'DATABASE', '127.0.0.1', 3306, 'erp'),
('MES MySQL', 'DATABASE', '127.0.0.1', 3307, 'mes'),
('CRM MySQL', 'DATABASE', '127.0.0.1', 3308, 'crm');

INSERT INTO bi_dataset_folder (id, name, parent_id, sort_order)
VALUES (1, '演示数据集', NULL, 0);

INSERT INTO bi_dataset(id, name, datasource_id, sql_text, folder_id)
VALUES
(1, 'Sales Trend Dataset', 1, 'SELECT biz_date, amount FROM dwd_sales ORDER BY biz_date', NULL),
(2, 'Order Detail Dataset', 1, 'SELECT order_id, amount, region FROM dwd_order_detail', NULL);

-- Demo datasets (internal, no datasource required) -- IDs 3-11 are reserved for built-in demos; 3-6 are used by chart template seeds
INSERT INTO bi_dataset(id, name, datasource_id, sql_text, folder_id)
VALUES
(3, '销售额月度趋势（演示）', NULL, 'SELECT * FROM demo_sales_monthly', 1),
(4, '各区域销售额（演示）', NULL, 'SELECT * FROM demo_sales_region', 1),
(5, '产品类别占比（演示）', NULL, 'SELECT * FROM demo_category_pie', 1),
(6, '用户增长趋势（演示）', NULL, 'SELECT * FROM demo_user_growth', 1),
(7, '茶饮订单明细', NULL, 'SELECT `店铺`, `品线`, `菜品名称`, `冷/热`, `规格`, `销售数量`, `单价`, (`销售数量` * `单价`) AS `销售金额`, DATE(`销售日期`) AS `销售日期` FROM `demo_tea_order` ORDER BY `销售日期` DESC', 1),
(8, '茶饮店铺日汇总', NULL, 'SELECT DATE(`销售日期`) AS `日期`, `店铺`, `品线`, SUM(`销售数量`) AS `销售数量`, SUM(`销售数量` * `单价`) AS `销售金额`, COUNT(DISTINCT `账单流水号`) AS `订单数` FROM `demo_tea_order` GROUP BY DATE(`销售日期`), `店铺`, `品线` ORDER BY `日期` DESC', 1),
(9, '茶饮品线销售排名', NULL, 'SELECT `品线`, SUM(`销售数量`) AS `销售数量`, SUM(`销售数量` * `单价`) AS `销售金额` FROM `demo_tea_order` GROUP BY `品线` ORDER BY `销售金额` DESC', 1),
(10, '茶饮原料费用明细', NULL, 'SELECT DATE(`日期`) AS `日期`, `店铺`, `用途`, `金额` FROM `demo_tea_material` ORDER BY `日期` DESC', 1),
(11, '茶饮店铺收支对比', NULL, 'SELECT o.`日期`, o.`店铺`, o.`销售金额`, COALESCE(m.`原料费用`, 0) AS `原料费用`, (o.`销售金额` - COALESCE(m.`原料费用`, 0)) AS `毛利` FROM ( SELECT DATE(`销售日期`) AS `日期`, `店铺`, SUM(`销售数量` * `单价`) AS `销售金额` FROM `demo_tea_order` GROUP BY DATE(`销售日期`), `店铺` ) o LEFT JOIN ( SELECT DATE(`日期`) AS `日期`, `店铺`, SUM(`金额`) AS `原料费用` FROM `demo_tea_material` GROUP BY DATE(`日期`), `店铺` ) m ON o.`日期` = m.`日期` AND o.`店铺` = m.`店铺` ORDER BY o.`日期` DESC', 1),
(12, '演示数据大屏1', NULL, 'SELECT * FROM demo_animal_screen_1', 1);
-- Ensure auto_increment continues after explicit inserts
ALTER TABLE bi_dataset AUTO_INCREMENT = 13;

INSERT INTO bi_dataset_field(dataset_id, field_name, field_type, field_label)
VALUES
(1, 'biz_date', 'datetime', 'biz_date'),
(1, 'amount', 'number', 'amount'),
(2, 'order_id', 'string', 'order_id'),
(2, 'amount', 'number', 'amount'),
(2, 'region', 'string', 'region');

INSERT INTO bi_dataset_field(dataset_id, field_name, field_type, field_label)
VALUES
(12, '模块', 'string', '模块'),
(12, '动物', 'string', '动物'),
(12, '品类', 'string', '品类'),
(12, '指标', 'string', '指标'),
(12, '数值', 'number', '数值'),
(12, '单位', 'string', '单位'),
(12, '简介', 'string', '简介'),
(12, '生态位', 'string', '生态位'),
(12, '能力', 'string', '能力'),
(12, '得分', 'number', '得分'),
(12, '时段', 'string', '时段'),
(12, '活跃指数', 'number', '活跃指数'),
(12, '综合值', 'number', '综合值'),
(12, '排序', 'number', '排序');

INSERT INTO bi_chart(name, dataset_id, chart_type, x_field, y_field)
VALUES
('Sales Trend', 1, 'line', 'biz_date', 'amount'),
('Product Ranking', 1, 'bar', 'biz_date', 'amount'),
('Order Detail', 2, 'table', 'order_id', 'amount');

INSERT INTO bi_chart(name, dataset_id, chart_type, x_field, y_field, group_field)
VALUES
('茶饮日销趋势', 8, 'line', '日期', '销售金额', '店铺'),
('茶饮品线销售排行', 9, 'bar_horizontal', '品线', '销售金额', ''),
('茶饮门店毛利对比', 11, 'bar', '店铺', '毛利', ''),
('茶饮原料费用对比', 10, 'bar', '店铺', '金额', ''),
('茶饮订单明细表', 7, 'table', '店铺', '销售金额', ''),
('动物信息面板标题', NULL, 'decor_title_plate', '', '', ''),
('动物信息面板左侧边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板中部边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板右侧边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板底部左边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板底部中边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板底部右边框', NULL, 'decor_border_panel', '', '', ''),
('动物信息面板-雪山狼犬档案', NULL, 'text_block', '', '', ''),
('动物信息面板-雪山狼犬体重', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-雪山狼犬速度', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-雪山狼犬嗅觉', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-月影灵猫档案', NULL, 'text_block', '', '', ''),
('动物信息面板-月影灵猫体重', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-月影灵猫跳跃', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-月影灵猫夜视', 12, 'metric_indicator', '指标', '数值', ''),
('动物信息面板-生态位占比', 12, 'doughnut', '生态位', '数值', ''),
('动物信息面板-感知能力排行', 12, 'table_rank', '能力', '得分', ''),
('动物信息面板-雪山狼犬节律', 12, 'business_trend', '时段', '活跃指数', ''),
('动物信息面板-综合评分', 12, 'bar', '动物', '综合值', ''),
('动物信息面板-月影灵猫节律', 12, 'business_trend', '时段', '活跃指数', '');

INSERT INTO bi_dashboard(name, layout_json)
VALUES ('Business Overview', '{"theme":"default","backgroundColor":"#f0f2f5"}');

INSERT INTO bi_dashboard(name, layout_json)
VALUES ('茶饮经营分析', '{"scene":"dashboard","publish":{"status":"DRAFT","shareToken":"teaoperatingdemo20260417","allowedRoles":["ADMIN","ANALYST"],"allowAnonymousAccess":true},"canvas":{"width":1440,"height":900}}');

INSERT INTO bi_dashboard(name, layout_json)
VALUES ('动物信息面板', '{"scene":"screen","publish":{"status":"DRAFT","shareToken":"animalscreen20260427","allowedRoles":["ADMIN","ANALYST"],"allowAnonymousAccess":true},"canvas":{"width":1920,"height":1080,"overlay":{"show":true,"bgColor":"#050d18","opacity":1,"x":0,"y":0,"w":1920,"h":1080,"bgType":"gradient","gradientStart":"#081827","gradientEnd":"#02070d","gradientAngle":135}}}');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
VALUES
('工作台', '/home', 'HomeView', NULL, 'menu', 'workbench:view', 'House', 10, 1, NULL),
('数据大屏', '/home/screen', 'DataScreenView', NULL, 'menu', 'screen:view', 'Monitor', 30, 1, 1),
('BI发布平台', '', 'BIPublishView', NULL, 'catalog', 'publish:view', 'Promotion', 35, 1, NULL),
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
SELECT '分组管理', '/home/publish/groups', 'BIPublishView', p.id, 'menu', 'publish:group', 'Files', 10, 1, NULL
FROM sys_menu p
WHERE p.permission = 'publish:view';

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT 'BI面板展示', '/home/publish/panels', 'BIPublishView', p.id, 'menu', 'publish:panel', 'Monitor', 20, 1, NULL
FROM sys_menu p
WHERE p.permission = 'publish:view';

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
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/screen', '/home/prepare', '/home/modeling')
WHERE r.name = 'ANALYST';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home/prepare/datasource', '/home/prepare/dataset', '/home/prepare/components', '/home/prepare/extract')
WHERE r.name = 'ANALYST';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.permission IN ('publish:view', 'publish:group', 'publish:panel')
WHERE r.name = 'ANALYST';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/screen')
WHERE r.name = 'VIEWER';

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.permission IN ('publish:view', 'publish:panel')
WHERE r.name = 'VIEWER';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
VALUES (1, 1, 0, 0, 12, 4),
       (1, 2, 12, 0, 12, 4),
       (1, 3, 0, 4, 24, 4);

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT d.id, c.id, 0, 0, 12, 4
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮日销趋势'
WHERE d.name = '茶饮经营分析';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT d.id, c.id, 12, 0, 12, 4
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮品线销售排行'
WHERE d.name = '茶饮经营分析';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT d.id, c.id, 0, 4, 12, 4
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮门店毛利对比'
WHERE d.name = '茶饮经营分析';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT d.id, c.id, 12, 4, 12, 4
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮原料费用对比'
WHERE d.name = '茶饮经营分析';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height)
SELECT d.id, c.id, 0, 8, 24, 5
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮订单明细表'
WHERE d.name = '茶饮经营分析';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 7, 0, 10, 2, 40, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板标题'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 2, 7, 9, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板左侧边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 7, 2, 10, 9, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板中部边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 17, 2, 7, 9, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板右侧边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 11, 8, 7, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部左边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 11, 8, 7, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部中边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 16, 11, 8, 7, 1, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部右边框'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 3, 5, 3, 20,
'{"chart":{"name":"雪山狼犬档案","chartType":"text_block"},"style":{"showTitle":true,"titleText":"雪山狼犬","textContent":"高寒巡护型犬种，耐力和嗅觉表现突出，适合山地搜救、夜间巡视与长距离追踪。","titleColor":"#eef8ff","bgColor":"rgba(7,23,42,0.62)","borderShow":true,"borderColor":"rgba(92,218,255,0.32)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(0,169,255,0.18)","shadowBlur":18},"interaction":{"dataFilters":[]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬档案'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 7, 2, 2, 20,
'{"chart":{"name":"犬类体重","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"体重 KG","titleColor":"#dcefff","metricValueColor":"#67dbff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"体重kg"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬体重'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 3, 7, 2, 2, 20,
'{"chart":{"name":"犬类速度","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"速度 KM/H","titleColor":"#dcefff","metricValueColor":"#4fe6ff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"奔跑速度"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬速度'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 5, 7, 2, 2, 20,
'{"chart":{"name":"犬类嗅觉","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"嗅觉 PTS","titleColor":"#dcefff","metricValueColor":"#8aefff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"嗅觉评分"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬嗅觉'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 18, 3, 5, 3, 20,
'{"chart":{"name":"月影灵猫档案","chartType":"text_block"},"style":{"showTitle":true,"titleText":"月影灵猫","textContent":"夜行潜伏型猫科样本，跃迁能力和夜视能力极强，擅长狭窄环境侦察与静默接近。","titleColor":"#fff2cf","bgColor":"rgba(29,20,12,0.55)","borderShow":true,"borderColor":"rgba(255,202,104,0.3)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(255,182,80,0.14)","shadowBlur":18},"interaction":{"dataFilters":[]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫档案'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 18, 7, 2, 2, 20,
'{"chart":{"name":"猫类体重","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"体重 KG","titleColor":"#fff1ce","metricValueColor":"#ffd675","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"体重kg"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫体重'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 20, 7, 2, 2, 20,
'{"chart":{"name":"猫类跳跃","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"跳跃 CM","titleColor":"#fff1ce","metricValueColor":"#ffcb6b","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"跳跃高度"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫跳跃'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 22, 7, 2, 2, 20,
'{"chart":{"name":"猫类夜视","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"夜视 PTS","titleColor":"#fff1ce","metricValueColor":"#fff0a1","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"夜视指数"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫夜视'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 3, 8, 4, 20,
'{"chart":{"name":"生态位占比","datasetId":12,"chartType":"doughnut","xField":"生态位","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"theme":"深海荧光","bgColor":"rgba(0,0,0,0)","showLegend":true,"showLabel":true,"legendPos":"bottom"},"interaction":{"dataFilters":[{"field":"模块","value":"生态位占比"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-生态位占比'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 7, 8, 3, 20,
'{"chart":{"name":"感知能力排行","datasetId":12,"chartType":"table_rank","xField":"能力","yField":"得分","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"感知能力排行","titleColor":"#eef8ff","metricValueColor":"#67dbff","bgColor":"rgba(7,23,42,0.08)","cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"感知排行"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-感知能力排行'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 12, 6, 5, 20,
'{"chart":{"name":"雪山狼犬节律","datasetId":12,"chartType":"business_trend","xField":"时段","yField":"活跃指数","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"雪山狼犬节律","titleColor":"#eef8ff","metricValueColor":"#67dbff","bgColor":"rgba(0,0,0,0)"},"interaction":{"dataFilters":[{"field":"模块","value":"活动趋势"},{"field":"动物","value":"雪山狼犬"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬节律'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 9, 12, 6, 5, 20,
'{"chart":{"name":"动物综合评分","datasetId":12,"chartType":"bar","xField":"动物","yField":"综合值","groupField":"","sourceMode":"DATASET"},"style":{"theme":"海湾晨光","bgColor":"rgba(0,0,0,0)","showLegend":false,"showLabel":true,"showGrid":false,"barRadius":12,"barMaxWidth":28},"interaction":{"dataFilters":[{"field":"模块","value":"综合评分"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-综合评分'
WHERE d.name = '动物信息面板';

INSERT INTO bi_dashboard_component(dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 17, 12, 6, 5, 20,
'{"chart":{"name":"月影灵猫节律","datasetId":12,"chartType":"business_trend","xField":"时段","yField":"活跃指数","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"月影灵猫节律","titleColor":"#fff1ce","metricValueColor":"#ffd675","bgColor":"rgba(0,0,0,0)"},"interaction":{"dataFilters":[{"field":"模块","value":"活动趋势"},{"field":"动物","value":"月影灵猫"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫节律'
WHERE d.name = '动物信息面板';

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
('经营明细表', '适合明细追踪、问题回溯和导出。', 'table', '{"chart":{"name":"经营明细表","datasetId":4,"chartType":"table","xField":"区域","yField":"销售额","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#ffffff","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":640,"height":360}}', 1, 90, 'system'),
('茶饮日销趋势卡', '适合追踪门店日销波动和高峰日表现。', 'line', '{"chart":{"name":"茶饮日销趋势卡","datasetId":8,"chartType":"line","xField":"日期","yField":"销售金额","groupField":"店铺"},"style":{"theme":"海湾晨光","bgColor":"#f6fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":true,"areaFill":true,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":560,"height":320}}', 1, 100, 'system'),
('茶饮品线排行卡', '适合查看不同品线的销售贡献排名。', 'bar_horizontal', '{"chart":{"name":"茶饮品线排行卡","datasetId":9,"chartType":"bar_horizontal","xField":"品线","yField":"销售金额","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f5fcf8","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":12,"barMaxWidth":26,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":340}}', 1, 110, 'system'),
('茶饮门店毛利卡', '适合对比不同门店的销售金额、成本与毛利。', 'bar', '{"chart":{"name":"茶饮门店毛利卡","datasetId":11,"chartType":"bar","xField":"店铺","yField":"毛利","groupField":""},"style":{"theme":"琥珀橙金","bgColor":"#fffaf3","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":10,"barMaxWidth":32,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}', 1, 120, 'system'),
('茶饮原料费用卡', '适合观察门店原料费用投入分布。', 'bar', '{"chart":{"name":"茶饮原料费用卡","datasetId":10,"chartType":"bar","xField":"店铺","yField":"金额","groupField":""},"style":{"theme":"暮光珊瑚","bgColor":"#fff8f5","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":10,"barMaxWidth":32,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}', 1, 130, 'system'),
('茶饮订单明细表', '适合回看茶饮订单明细与门店销售构成。', 'table', '{"chart":{"name":"茶饮订单明细表","datasetId":7,"chartType":"table","xField":"店铺","yField":"销售金额","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#ffffff","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":640,"height":360}}', 1, 140, 'system');
