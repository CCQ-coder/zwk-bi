USE ai_bi;

-- 重新同步 ADMIN 角色的菜单权限，确保所有菜单都已分配
-- 先删除 ADMIN 的所有 role_menu 记录，再重新全量插入
DELETE FROM sys_role_menu
WHERE role_id = (SELECT id FROM sys_role WHERE name = 'ADMIN');

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT r.id, m.id
FROM sys_role r
INNER JOIN sys_menu m ON 1 = 1
WHERE r.name = 'ADMIN';
