import request from './request';
// 首页默认仪表板（最新一条）
export const getDefaultDashboard = () => request.get('/dashboard/default');
// 仪表板 CRUD
export const getDashboardList = () => request.get('/dashboard');
export const getDashboardById = (id) => request.get(`/dashboard/${id}`);
export const createDashboard = (data) => request.post('/dashboard', data);
export const updateDashboard = (id, data) => request.put(`/dashboard/${id}`, data);
export const deleteDashboard = (id) => request.delete(`/dashboard/${id}`);
// 仪表板组件布局
export const getDashboardComponents = (dashboardId) => request.get(`/dashboards/${dashboardId}/components`);
export const addDashboardComponent = (dashboardId, data) => request.post(`/dashboards/${dashboardId}/components`, data);
export const updateDashboardComponent = (dashboardId, id, data) => request.put(`/dashboards/${dashboardId}/components/${id}`, data);
export const removeDashboardComponent = (dashboardId, id) => request.delete(`/dashboards/${dashboardId}/components/${id}`);
