import request from './request'
import type { AuthMenuItem } from '../utils/auth-session'

export const getCurrentMenus = (): Promise<AuthMenuItem[]> =>
  request.get('/menus/current')

export type MenuType = 'menu' | 'catalog'

export interface SystemMenu extends AuthMenuItem {
  createdAt?: string
  children?: SystemMenu[]
}

export interface MenuForm {
  name: string
  path: string
  component: string
  parentId: number | null
  type: MenuType
  permission: string
  icon: string
  sort: number
  visible: boolean
  dashboardId: number | null
}

export const getMenuTree = (): Promise<SystemMenu[]> =>
  request.get('/menus')

export const createMenu = (payload: MenuForm): Promise<SystemMenu> =>
  request.post('/menus', payload)

export const updateMenu = (id: number, payload: MenuForm): Promise<SystemMenu> =>
  request.put(`/menus/${id}`, payload)

export const deleteMenu = (id: number): Promise<void> =>
  request.delete(`/menus/${id}`)