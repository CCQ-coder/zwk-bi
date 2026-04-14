export interface AuthSession {
  id: number
  token: string
  username: string
  displayName: string
  role: string
}

export interface AuthMenuItem {
  id: number
  name: string
  path: string
  component: string
  parentId: number | null
  type: string
  permission: string
  icon: string
  sort: number
  visible: boolean
  dashboardId: number | null
  children?: AuthMenuItem[]
}

const MENU_STORAGE_KEY = 'bi_auth_menus'

export const getAuthToken = () => localStorage.getItem('bi_token') || ''

export const getAuthRole = () => localStorage.getItem('bi_role') || ''

export const getAuthUsername = () => localStorage.getItem('bi_username') || ''

export const getAuthDisplayName = () => localStorage.getItem('bi_display_name') || getAuthUsername() || '未登录用户'

export const hasAuthSession = () => Boolean(getAuthToken())

export const getAuthMenus = (): AuthMenuItem[] => {
  const raw = localStorage.getItem(MENU_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as AuthMenuItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveAuthMenus = (menus: AuthMenuItem[]) => {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menus))
}

export const flattenAuthMenus = (menus: AuthMenuItem[]): AuthMenuItem[] => menus.flatMap((item) => [
  item,
  ...flattenAuthMenus(item.children ?? []),
])

export const saveAuthSession = (session: AuthSession) => {
  localStorage.setItem('bi_user_id', String(session.id))
  localStorage.setItem('bi_token', session.token)
  localStorage.setItem('bi_username', session.username)
  localStorage.setItem('bi_display_name', session.displayName)
  localStorage.setItem('bi_role', session.role)
}

export const clearAuthSession = () => {
  localStorage.removeItem('bi_user_id')
  localStorage.removeItem('bi_token')
  localStorage.removeItem('bi_username')
  localStorage.removeItem('bi_display_name')
  localStorage.removeItem('bi_role')
  localStorage.removeItem(MENU_STORAGE_KEY)
}