<template>
  <header class="top-nav">
    <div class="nav-brand-block">
      <el-button class="nav-mobile-trigger" text @click="drawerVisible = true">
        <el-icon><Operation /></el-icon>
      </el-button>
      <button class="brand" type="button" @click="go('/home')">
        <span class="brand-mark">AI</span>
        <span class="brand-text">BI</span>
      </button>
    </div>

    <nav class="nav-items" aria-label="主导航">
      <button
        v-for="menu in navMenus"
        :key="menu.id"
        class="nav-btn"
        :class="{ 'nav-btn--active': isMenuActive(menu) }"
        @click="go(menu.path)"
      >
        {{ menu.name }}
      </button>
    </nav>

    <div class="user-menu">
      <div class="user-meta">
        <span class="user-avatar">{{ avatarText }}</span>
        <div class="user-copy">
          <span class="user-name">{{ displayName }}</span>
          <span class="user-role">已登录</span>
        </div>
      </div>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </header>

  <el-drawer v-model="drawerVisible" direction="ltr" size="280px" class="nav-drawer">
    <template #header>
      <div class="drawer-head">
        <div class="drawer-brand">AI BI</div>
        <div class="drawer-subtitle">业务分析工作区</div>
      </div>
    </template>

    <div class="drawer-menu">
      <button
        v-for="menu in navMenus"
        :key="`drawer-${menu.id}`"
        class="drawer-menu-btn"
        :class="{ 'drawer-menu-btn--active': isMenuActive(menu) }"
        @click="go(menu.path)"
      >
        <span>{{ menu.name }}</span>
        <el-icon><ArrowRight /></el-icon>
      </button>
    </div>

    <div class="drawer-user-card">
      <span class="user-avatar">{{ avatarText }}</span>
      <div class="drawer-user-copy">
        <div class="drawer-user-name">{{ displayName }}</div>
        <div class="drawer-user-tip">当前会话账号</div>
      </div>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Operation } from '@element-plus/icons-vue'
import { getCurrentMenus } from '../api/menu'
import {
  clearAuthSession,
  getAuthDisplayName,
  getAuthMenus,
  hasAuthSession,
  saveAuthMenus,
  type AuthMenuItem,
} from '../utils/auth-session'

defineProps<{ active?: 'workbench' | 'dashboard' | 'screen' | 'prepare' | 'modeling' | 'system' }>()

interface ResolvedNavItem {
  id: number
  name: string
  path: string
  activePaths: string[]
}

const router = useRouter()
const route = useRoute()
const menus = ref<AuthMenuItem[]>(getAuthMenus())
const drawerVisible = ref(false)

const displayName = computed(() => getAuthDisplayName())
const avatarText = computed(() => displayName.value.slice(0, 1) || '用')

const sortMenus = (items: AuthMenuItem[]) => [...items]
  .filter((item) => item.visible !== false)
  .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0))

const resolveMenuPath = (item: AuthMenuItem): string => {
  if (item.path && item.type === 'menu') {
    return item.path
  }
  for (const child of sortMenus(item.children ?? [])) {
    const path = resolveMenuPath(child)
    if (path) return path
  }
  return item.path || ''
}

const collectActivePaths = (item: AuthMenuItem): string[] => {
  const paths = new Set<string>()
  if (item.path) paths.add(item.path)
  for (const child of sortMenus(item.children ?? [])) {
    collectActivePaths(child).forEach((path) => paths.add(path))
  }
  return Array.from(paths)
}

const isPathActive = (path: string) => route.path === path || (path !== '/home' && route.path.startsWith(`${path}/`))

const navMenus = computed<ResolvedNavItem[]>(() => sortMenus(
  menus.value.filter((item) => !item.parentId)
).map((item) => {
  const path = resolveMenuPath(item)
  if (!path) return null
  return {
    id: item.id,
    name: item.name,
    path,
    activePaths: collectActivePaths(item),
  }
}).filter((item): item is ResolvedNavItem => Boolean(item)))

const go = (path: string) => {
  drawerVisible.value = false
  router.push(path)
}

const isMenuActive = (menu: ResolvedNavItem) => menu.activePaths.some((path) => isPathActive(path))

const loadMenus = async () => {
  if (!hasAuthSession()) return
  try {
    const latestMenus = await getCurrentMenus()
    menus.value = latestMenus
    saveAuthMenus(latestMenus)
  } catch {
    menus.value = getAuthMenus()
  }
}

const logout = () => {
  drawerVisible.value = false
  clearAuthSession()
  router.push('/login')
}

onMounted(loadMenus)
</script>

<style scoped>
.top-nav {
  height: 64px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 0 20px;
  background: linear-gradient(90deg, #08182f 0%, #0b2344 52%, #112e57 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 30;
}

.nav-brand-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-mobile-trigger {
  display: none;
  color: #dbe8ff;
  border-radius: 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #42d6c5 0%, #2587ff 100%);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-items::-webkit-scrollbar {
  display: none;
}

.nav-btn {
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  height: 40px;
  padding: 0 16px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.nav-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-btn--active {
  color: #ffffff;
  border-color: rgba(123, 196, 255, 0.35);
  background: linear-gradient(135deg, rgba(61, 142, 255, 0.26) 0%, rgba(40, 101, 209, 0.46) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
}

.user-role {
  font-size: 11px;
  color: rgba(219, 232, 255, 0.72);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.logout-btn {
  color: #ffd783;
}

.drawer-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-brand {
  font-size: 18px;
  font-weight: 700;
  color: #15355d;
}

.drawer-subtitle {
  font-size: 12px;
  color: #6f86a3;
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-menu-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #d9e6f4;
  background: #ffffff;
  color: #23405f;
  cursor: pointer;
}

.drawer-menu-btn--active {
  background: #eef6ff;
  border-color: #b7d2f6;
  color: #13528f;
  font-weight: 600;
}

.drawer-user-card {
  margin-top: 20px;
  padding: 14px;
  border-radius: 16px;
  background: #f5f9ff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-user-copy {
  flex: 1;
  min-width: 0;
}

.drawer-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #183153;
}

.drawer-user-tip {
  font-size: 12px;
  color: #6f86a3;
}

@media (max-width: 900px) {
  .top-nav {
    grid-template-columns: auto 1fr auto;
    padding: 0 14px;
  }

  .nav-mobile-trigger {
    display: inline-flex;
  }

  .nav-items {
    display: none;
  }

  .user-copy,
  .logout-btn {
    display: none;
  }
}
</style>
