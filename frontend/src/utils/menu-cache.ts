import { ref } from 'vue'
import { getCurrentMenus } from '../api/menu'
import { getAuthMenus, hasAuthSession, saveAuthMenus, type AuthMenuItem } from './auth-session'

// 共享菜单缓存：避免每次进入新页面时 TopNavBar 重新拉一次后端菜单接口造成卡顿。
const cachedMenus = ref<AuthMenuItem[]>(getAuthMenus())
let inflight: Promise<AuthMenuItem[]> | null = null
let lastFetchedAt = 0
const TTL_MS = 5 * 60 * 1000

export const useSharedMenus = () => cachedMenus

export const setSharedMenus = (menus: AuthMenuItem[]) => {
  cachedMenus.value = menus
  saveAuthMenus(menus)
  lastFetchedAt = Date.now()
}

export const clearSharedMenus = () => {
  cachedMenus.value = []
  inflight = null
  lastFetchedAt = 0
}

export const ensureSharedMenus = async (force = false): Promise<AuthMenuItem[]> => {
  if (!hasAuthSession()) {
    cachedMenus.value = []
    return []
  }
  const fresh = !force && Date.now() - lastFetchedAt < TTL_MS && cachedMenus.value.length > 0
  if (fresh) return cachedMenus.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const latest = await getCurrentMenus()
      setSharedMenus(latest)
      return latest
    } catch {
      const fallback = getAuthMenus()
      cachedMenus.value = fallback
      return fallback
    } finally {
      inflight = null
    }
  })()
  return inflight
}
