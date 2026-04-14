import request from './request'

export interface RoleSummary {
  id: number
  name: 'ADMIN' | 'ANALYST' | 'VIEWER' | string
  userCount: number
  menuCount: number
  createdAt: string
}

export const getRoleList = (): Promise<RoleSummary[]> =>
  request.get('/roles')

export const getRoleMenuIds = (id: number): Promise<number[]> =>
  request.get(`/roles/${id}/menu-ids`)

export const updateRoleMenuIds = (id: number, menuIds: number[]): Promise<number[]> =>
  request.put(`/roles/${id}/menu-ids`, { menuIds })