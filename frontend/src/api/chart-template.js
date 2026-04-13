import request from './request';
export const getTemplateList = () => request.get('/chart-templates');
export const createTemplate = (data) => request.post('/chart-templates', data);
export const updateTemplate = (id, data) => request.put(`/chart-templates/${id}`, data);
export const deleteTemplate = (id) => request.delete(`/chart-templates/${id}`);
