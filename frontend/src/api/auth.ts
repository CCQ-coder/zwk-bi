import request from './request'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  id: number
  token: string
  username: string
  displayName: string
}

// 登录接口
export const login = (payload: LoginPayload): Promise<LoginResult> =>
  request.post('/auth/login', payload)
