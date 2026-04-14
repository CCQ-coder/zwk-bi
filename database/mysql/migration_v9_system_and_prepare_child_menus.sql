USE ai_bi;

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据源管理', '/home/prepare/datasource', 'DataPrepareView', p.id, 'menu', 'datasource:view', 'Coin', 41, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/prepare/datasource');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据集管理', '/home/prepare/dataset', 'DataPrepareView', p.id, 'menu', 'dataset:view', 'Tickets', 42, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/prepare/dataset');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '组件管理', '/home/prepare/components', 'DataPrepareView', p.id, 'menu', 'component:view', 'Grid', 43, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/prepare/components');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '数据抽取', '/home/prepare/extract', 'DataPrepareView', p.id, 'menu', 'extract:view', 'Refresh', 44, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/prepare'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/prepare/extract');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '基础设置', '/home/system/settings', 'SystemView', p.id, 'menu', 'system:settings', 'Tools', 61, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/settings');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '用户管理', '/home/system/users', 'SystemView', p.id, 'menu', 'system:user', 'User', 62, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/users');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '角色权限', '/home/system/roles', 'SystemView', p.id, 'menu', 'system:role', 'Avatar', 63, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/roles');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '菜单管理', '/home/system/menus', 'SystemView', p.id, 'menu', 'system:menu', 'Menu', 64, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/menus');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '审计日志', '/home/system/audit', 'SystemView', p.id, 'menu', 'system:audit', 'Document', 65, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/audit');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '登录日志', '/home/system/login-logs', 'SystemView', p.id, 'menu', 'system:login-log', 'Histogram', 66, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/login-logs');

INSERT INTO sys_menu(name, path, component, parent_id, type, permission, icon, sort, visible, dashboard_id)
SELECT '系统监控', '/home/system/monitor', 'SystemView', p.id, 'menu', 'system:monitor', 'Monitor', 67, 1, NULL
FROM sys_menu p
WHERE p.path = '/home/system'
  AND NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.path = '/home/system/monitor');

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN (
  '/home/prepare/datasource',
  '/home/prepare/dataset',
  '/home/prepare/components',
  '/home/prepare/extract'
)
WHERE r.name = 'ANALYST'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );

INSERT INTO sys_role_menu(role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON m.path IN (
  '/home/system/settings',
  '/home/system/users',
  '/home/system/roles',
  '/home/system/menus',
  '/home/system/audit',
  '/home/system/login-logs',
  '/home/system/monitor'
)
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_rm WHERE existing_rm.role_id = r.id AND existing_rm.menu_id = m.id
  );