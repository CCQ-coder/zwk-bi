import request from './request';
export const getChartList = () => request.get('/charts');
export const createChart = (data) => request.post('/charts', data);
export const updateChart = (id, data) => request.put(`/charts/${id}`, data);
export const deleteChart = (id) => request.delete(`/charts/${id}`);
export const getChartData = (id) => request.get(`/charts/${id}/data`);
