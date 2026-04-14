USE ai_bi;

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
  email VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sys_user (id, username, password_hash, display_name, role, email, created_at)
SELECT b.id, b.username, b.password_hash, b.display_name, b.role, b.email, b.created_at
FROM bi_user b
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bi_user')
  AND NOT EXISTS (SELECT 1 FROM sys_user s WHERE s.id = b.id);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_role_menu (
  role_id BIGINT NOT NULL,
  menu_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, menu_id),
  CONSTRAINT fk_sys_role_menu_role FOREIGN KEY (role_id) REFERENCES sys_role(id),
  CONSTRAINT fk_sys_role_menu_menu FOREIGN KEY (menu_id) REFERENCES sys_menu(id)
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

INSERT INTO sys_role(name)
SELECT role_name
FROM (
  SELECT 'ADMIN' AS role_name
  UNION ALL SELECT 'ANALYST'
  UNION ALL SELECT 'VIEWER'
) seeded
WHERE NOT EXISTS (
  SELECT 1 FROM sys_role existing_role WHERE existing_role.name = seeded.role_name
);

INSERT INTO sys_user_role(user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
INNER JOIN sys_role r ON r.name = u.role
WHERE NOT EXISTS (
  SELECT 1 FROM sys_user_role ur
  WHERE ur.user_id = u.id AND ur.role_id = r.id
);

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT *
FROM (
  SELECT '工作台' AS name, '/home' AS path, 'HomeView' AS component, NULL AS parent_id, 'menu' AS type, 'workbench:view' AS permission, 'House' AS icon, 10 AS sort, 1 AS visible, NULL AS dashboard_id
  UNION ALL SELECT '仪表板', '/home/dashboard', 'DashboardView', NULL, 'menu', 'dashboard:view', 'DataBoard', 20, 1, NULL
  UNION ALL SELECT '数据大屏', '/home/screen', 'DataScreenView', NULL, 'menu', 'screen:view', 'Monitor', 30, 1, NULL
  UNION ALL SELECT '数据准备', '/home/prepare', 'DataPrepareView', NULL, 'menu', 'dataset:view', 'Collection', 40, 1, NULL
  UNION ALL SELECT '数据建模', '/home/modeling', 'ModelingView', NULL, 'menu', 'model:view', 'Connection', 50, 1, NULL
  UNION ALL SELECT '系统管理', '/home/system', 'SystemView', NULL, 'menu', 'system:view', 'Setting', 60, 1, NULL
) seeded_menu
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu existing_menu WHERE existing_menu.path = seeded_menu.path
);

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON 1 = 1
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/dashboard', '/home/screen', '/home/prepare', '/home/modeling')
WHERE r.name = 'ANALYST'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN ('/home', '/home/dashboard', '/home/screen')
WHERE r.name = 'VIEWER'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );