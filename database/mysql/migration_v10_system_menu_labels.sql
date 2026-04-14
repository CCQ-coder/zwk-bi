USE ai_bi;

UPDATE sys_menu
SET name = '角色管理'
WHERE path = '/home/system/roles';

UPDATE sys_menu
SET name = '菜单权限管理'
WHERE path = '/home/system/menus';