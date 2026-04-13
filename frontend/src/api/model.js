import request from './request';
export const getModelList = () => request.get('/models');
export const createModel = (data) => request.post('/models', data);
export const updateModel = (id, data) => request.put(`/models/${id}`, data);
export const deleteModel = (id) => request.delete(`/models/${id}`);
