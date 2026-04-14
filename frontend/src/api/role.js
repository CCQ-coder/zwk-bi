import request from './request';
export const getRoleList = () => request.get('/roles');
export const getRoleMenuIds = (id) => request.get(`/roles/${id}/menu-ids`);
export const updateRoleMenuIds = (id, menuIds) => request.put(`/roles/${id}/menu-ids`, { menuIds });
