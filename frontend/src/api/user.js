import request from './request';
export const getUserList = () => request.get('/users');
export const createUser = (payload) => request.post('/users', payload);
export const updateUser = (id, payload) => request.put(`/users/${id}`, payload);
export const deleteUser = (id) => request.delete(`/users/${id}`);
