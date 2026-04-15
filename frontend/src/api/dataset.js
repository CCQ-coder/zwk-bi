import request from './request';
export const getDatasetList = () => request.get('/datasets');
export const getDatasetFolderTree = () => request.get('/datasets/folder-tree');
export const createDataset = (data) => request.post('/datasets', data);
export const updateDataset = (id, data) => request.put(`/datasets/${id}`, data);
export const deleteDataset = (id) => request.delete(`/datasets/${id}`);
export const previewDatasetSql = (data) => request.post('/datasets/preview', data);
export const getDatasetFields = (id) => request.get(`/datasets/${id}/fields`);
export const getDatasetPreviewData = (id) => request.get(`/datasets/${id}/preview-data`);
// Folder APIs
export const createDatasetFolder = (name, parentId) => request.post('/datasets/folders', { name, parentId: parentId ?? null });
export const renameDatasetFolder = (id, name) => request.put(`/datasets/folders/${id}`, { name });
export const deleteDatasetFolder = (id) => request.delete(`/datasets/folders/${id}`);
