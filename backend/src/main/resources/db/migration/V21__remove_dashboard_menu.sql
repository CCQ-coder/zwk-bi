-- V21: remove deprecated dashboard menu entry

DELETE rm
FROM sys_role_menu rm
INNER JOIN sys_menu m ON m.id = rm.menu_id
WHERE m.path = '/home/dashboard'
   OR m.permission = 'dashboard:view';

DELETE FROM sys_menu
WHERE path = '/home/dashboard'
   OR permission = 'dashboard:view';