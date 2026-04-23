import request from './request';
export const getManagePublishGroups = () => request.get('/publish/groups/manage');
export const getDisplayPublishGroups = () => request.get('/publish/groups/display');
export const getPublishedScreenOptions = () => request.get('/publish/screens/options');
export const createPublishGroup = (payload) => request.post('/publish/groups', payload);
export const updatePublishGroup = (id, payload) => request.put(`/publish/groups/${id}`, payload);
export const updatePublishGroupScreens = (id, screenIds) => request.put(`/publish/groups/${id}/screens`, { screenIds });
export const deletePublishGroup = (id) => request.delete(`/publish/groups/${id}`);
