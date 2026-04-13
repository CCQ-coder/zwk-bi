import request from './request'

export interface User {
  id: number
  username: string
  displayName: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  email: string
  createdAt: string
}

export interface UserForm {
  username: string
  displayName: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  email: string
  password: string
}

export interface UpdateUserForm {
  displayName: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  email: string
  password?: string
}

export const getUserList = (): Promise<User[]> => request.get('/users')

export const createUser = (payload: UserForm): Promise<User> => request.post('/users', payload)

export const updateUser = (id: number, payload: UpdateUserForm): Promise<User> =>
  request.put(`/users/${id}`, payload)

export const deleteUser = (id: number): Promise<void> => request.delete(`/users/${id}`)
