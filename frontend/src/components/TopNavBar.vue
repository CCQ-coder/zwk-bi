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
        </div>
      </div>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </header>

  <el-drawer v-model="drawerVisible" direction="ltr" size="280px" class="nav-drawer">
    <template #header>
      <div class="drawer-head">
        <div class="drawer-brand">AI BI</div>
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

defineProps<{ active?: 'workbench' | 'dashboard' | 'screen' | 'publish' | 'prepare' | 'modeling' | 'system' }>()

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
  height: 68px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(246, 249, 250, 0.8) 100%);
  border-bottom: 1px solid rgba(111, 138, 148, 0.18);
  box-shadow: 0 12px 28px rgba(38, 68, 75, 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: #173246;
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
  color: #55717d;
  border-radius: 12px;
  border: 1px solid rgba(116, 144, 154, 0.18);
  background: rgba(255, 255, 255, 0.48);
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
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #55b0a3 0%, #7aaed5 100%);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(84, 162, 160, 0.24);
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #173246;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-items::-webkit-scrollbar {
  display: none;
}

.nav-btn {
  border: 1px solid rgba(118, 144, 154, 0.12);
  background: rgba(255, 255, 255, 0.36);
  color: #607985;
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.nav-btn:hover {
  color: #173246;
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(101, 162, 172, 0.24);
  box-shadow: 0 10px 20px rgba(48, 89, 98, 0.08);
  transform: translateY(-1px);
}

.nav-btn--active {
  color: #173246;
  border-color: rgba(85, 176, 163, 0.28);
  background: linear-gradient(180deg, rgba(227, 245, 241, 0.98), rgba(245, 251, 250, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-copy {
  display: flex;
  align-items: center;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #173246;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #57b0a4 0%, #7baed5 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(83, 149, 161, 0.2);
}

.logout-btn {
  color: #65808d;
}

.drawer-head {
  display: flex;
  align-items: center;
}

.drawer-brand {
  font-size: 16px;
  font-weight: 700;
  color: #173246;
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-menu-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(119, 145, 154, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 249, 0.9));
  color: #23405f;
  cursor: pointer;
}

.drawer-menu-btn--active {
  background: linear-gradient(180deg, rgba(225, 245, 240, 0.98), rgba(240, 249, 247, 0.92));
  border-color: rgba(85, 176, 163, 0.24);
  color: #1b5e67;
  font-weight: 600;
}

.drawer-user-card {
  margin-top: 16px;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(242, 249, 248, 0.96), rgba(248, 251, 251, 0.92));
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-user-copy {
  flex: 1;
  min-width: 0;
}

.drawer-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #173246;
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
