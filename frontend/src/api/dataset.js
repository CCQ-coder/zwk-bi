import request from './request';
export const getDatasetList = () => request.get('/datasets');
export const createDataset = (data) => request.post('/datasets', data);
export const updateDataset = (id, data) => request.put(`/datasets/${id}`, data);
export const deleteDataset = (id) => request.delete(`/datasets/${id}`);
export const previewDatasetSql = (data) => request.post('/datasets/preview', data);
