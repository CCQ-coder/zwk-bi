import request from './request';
export const getCurrentMenus = () => request.get('/menus/current');
export const getMenuTree = () => request.get('/menus');
export const createMenu = (payload) => request.post('/menus', payload);
export const updateMenu = (id, payload) => request.put(`/menus/${id}`, payload);
export const deleteMenu = (id) => request.delete(`/menus/${id}`);
