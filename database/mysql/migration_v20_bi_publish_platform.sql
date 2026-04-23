USE ai_bi;

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

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT 'BI发布平台', '', 'BIPublishView', NULL, 'catalog', 'publish:view', 'Promotion', 35, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM sys_menu existing_menu WHERE existing_menu.permission = 'publish:view'
);

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '分组管理', '/home/publish/groups', 'BIPublishView', p.id, 'menu', 'publish:group', 'Files', 10, 1, NULL
FROM sys_menu p
WHERE p.permission = 'publish:view'
  AND NOT EXISTS (
    SELECT 1 FROM sys_menu existing_menu WHERE existing_menu.path = '/home/publish/groups'
  );

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT 'BI面板展示', '/home/publish/panels', 'BIPublishView', p.id, 'menu', 'publish:panel', 'Monitor', 20, 1, NULL
FROM sys_menu p
WHERE p.permission = 'publish:view'
  AND NOT EXISTS (
    SELECT 1 FROM sys_menu existing_menu WHERE existing_menu.path = '/home/publish/panels'
  );

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.permission IN ('publish:view', 'publish:group', 'publish:panel')
WHERE r.name IN ('ADMIN', 'ANALYST')
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.permission IN ('publish:view', 'publish:panel')
WHERE r.name = 'VIEWER'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );