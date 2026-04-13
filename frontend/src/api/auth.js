import request from './request';
// 登录接口
export const login = (payload) => request.post('/auth/login', payload);
