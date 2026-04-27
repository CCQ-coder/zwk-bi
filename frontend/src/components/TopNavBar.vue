<template>
  <button class="nav-mobile-trigger" type="button" @click="drawerVisible = true" aria-label="打开导航菜单">
    <el-icon><Operation /></el-icon>
  </button>

  <aside class="side-nav" :class="{ 'side-nav--collapsed': navCollapsed }" aria-label="系统导航">
    <div class="side-nav__top">
      <button class="brand" type="button" @click="go('/home')">
        <span class="brand-mark">AI</span>
        <span v-if="!navCollapsed" class="brand-copy">
          <span class="brand-text">AI BI</span>
          <span class="brand-sub">数据工作台</span>
        </span>
      </button>

      <button
        class="side-nav__toggle"
        type="button"
        :aria-label="navCollapsed ? '展开侧边栏' : '收起侧边栏'"
        @click="toggleCollapse"
      >
        <el-icon><component :is="navCollapsed ? Expand : Fold" /></el-icon>
      </button>
    </div>

    <nav class="side-nav__menu" aria-label="主导航">
      <button
        v-for="menu in navMenus"
        :key="menu.id"
        class="side-nav__item"
        :class="{ 'side-nav__item--active': isMenuActive(menu) }"
        :title="navCollapsed ? menu.name : undefined"
        @click="go(menu.path)"
      >
        <span class="side-nav__item-mark">
          <el-icon><component :is="getMenuIcon(menu.path)" /></el-icon>
        </span>
        <span v-if="!navCollapsed" class="side-nav__item-copy">
          <span class="side-nav__item-label">{{ menu.name }}</span>
          <span class="side-nav__item-tip">{{ getMenuHint(menu.path) }}</span>
        </span>
      </button>
    </nav>

    <div class="side-nav__footer">
      <div class="side-nav__user">
        <span class="user-avatar">{{ avatarText }}</span>
        <div v-if="!navCollapsed" class="side-nav__user-copy">
          <span class="side-nav__user-name">{{ displayName }}</span>
          <span class="side-nav__user-role">当前账号</span>
        </div>
      </div>

      <button class="side-nav__logout" type="button" @click="logout">
        <el-icon><SwitchButton /></el-icon>
        <span v-if="!navCollapsed">退出登录</span>
      </button>
    </div>
  </aside>

  <el-drawer v-model="drawerVisible" direction="ltr" size="280px" class="nav-drawer">
    <template #header>
      <div class="drawer-head">
        <button class="brand brand--drawer" type="button" @click="go('/home')">
          <span class="brand-mark">AI</span>
          <span class="brand-copy">
            <span class="brand-text">AI BI</span>
            <span class="brand-sub">数据工作台</span>
          </span>
        </button>
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
        <div class="drawer-menu-copy">
          <span class="drawer-menu-main">
            <el-icon class="drawer-menu-icon"><component :is="getMenuIcon(menu.path)" /></el-icon>
            <span>{{ menu.name }}</span>
          </span>
          <small>{{ getMenuHint(menu.path) }}</small>
        </div>
        <el-icon><ArrowRight /></el-icon>
      </button>
    </div>

    <div class="drawer-user-card">
      <span class="user-avatar">{{ avatarText }}</span>
      <div class="drawer-user-copy">
        <div class="drawer-user-name">{{ displayName }}</div>
        <div class="drawer-user-role">当前账号</div>
      </div>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  Connection,
  DataAnalysis,
  Expand,
  Fold,
  Grid,
  House,
  Monitor,
  Operation,
  Promotion,
  Setting,
  SwitchButton,
} from '@element-plus/icons-vue'
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

const NAV_COLLAPSED_STORAGE_KEY = 'bi_shell_nav_collapsed'

const MENU_HINTS: Record<string, string> = {
  '/home': '总览与最近大屏',
  '/home/screen': '进入大屏工作区',
  '/home/publish/groups': '发布与面板管理',
  '/home/publish/panels': '发布与面板管理',
  '/home/prepare': '接入与加工资源',
  '/home/prepare/datasource': '接入与加工资源',
  '/home/prepare/dataset': '接入与加工资源',
  '/home/prepare/components': '接入与加工资源',
  '/home/prepare/extract': '接入与加工资源',
  '/home/modeling': '模型设计与管理',
  '/home/system': '系统设置与权限',
}

const MENU_ICONS: Record<string, Component> = {
  '/home': House,
  '/home/screen': Monitor,
  '/home/publish/groups': Promotion,
  '/home/publish/panels': Promotion,
  '/home/prepare': Connection,
  '/home/prepare/datasource': Connection,
  '/home/prepare/dataset': Connection,
  '/home/prepare/components': Connection,
  '/home/prepare/extract': Connection,
  '/home/modeling': DataAnalysis,
  '/home/system': Setting,
}

const router = useRouter()
const route = useRoute()
const menus = ref<AuthMenuItem[]>(getAuthMenus())
const drawerVisible = ref(false)
const navCollapsed = ref(localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === '1')

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

const applyShellBodyClass = () => {
  const body = document.body
  body.classList.toggle('bi-shell-nav-expanded', !navCollapsed.value)
  body.classList.toggle('bi-shell-nav-collapsed', navCollapsed.value)
}

const clearShellBodyClass = () => {
  document.body.classList.remove('bi-shell-nav-expanded', 'bi-shell-nav-collapsed')
}

const getMenuHint = (path: string) => MENU_HINTS[path] || '进入对应模块'

const getMenuIcon = (path: string) => MENU_ICONS[path] || Grid

const go = (path: string) => {
  drawerVisible.value = false
  router.push(path)
}

const toggleCollapse = () => {
  navCollapsed.value = !navCollapsed.value
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
  clearShellBodyClass()
  router.push('/login')
}

watch(navCollapsed, (value) => {
  localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, value ? '1' : '0')
  applyShellBodyClass()
}, { immediate: true })

onMounted(async () => {
  applyShellBodyClass()
  await loadMenus()
})

onBeforeUnmount(() => {
  clearShellBodyClass()
})
</script>

<style scoped>
:global(body.bi-shell-nav-expanded #app) {
  padding-left: 248px;
  transition: padding-left 0.22s ease;
}

:global(body.bi-shell-nav-collapsed #app) {
  padding-left: 92px;
  transition: padding-left 0.22s ease;
}

.nav-mobile-trigger {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 60;
  width: 42px;
  height: 42px;
  display: none;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(123, 150, 160, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #335468;
  box-shadow: 0 12px 28px rgba(32, 64, 75, 0.14);
}

.side-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 45;
  width: 248px;
  padding: 18px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(180deg, rgba(247, 251, 252, 0.82) 0%, rgba(232, 241, 244, 0.92) 100%),
    linear-gradient(150deg, rgba(128, 194, 190, 0.14) 0%, rgba(122, 176, 211, 0.12) 52%, rgba(255, 255, 255, 0.08) 100%);
  border-right: 1px solid rgba(178, 200, 209, 0.34);
  box-shadow: 22px 0 48px rgba(28, 54, 63, 0.1), inset -1px 0 0 rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: width 0.22s ease, padding 0.22s ease;
}

.side-nav::before {
  content: '';
  position: absolute;
  inset: 10px 8px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.08) 24%, rgba(120, 161, 172, 0.08) 100%),
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0) 42%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.side-nav::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 22%, rgba(91, 137, 151, 0.08) 100%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0 10px, rgba(255, 255, 255, 0) 10px 24px);
  opacity: 0.52;
  pointer-events: none;
}

.side-nav > * {
  position: relative;
  z-index: 1;
}

.side-nav--collapsed {
  width: 92px;
  padding-inline: 12px;
}

.side-nav__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.16));
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.brand--drawer {
  align-items: center;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #55b0a3 0%, #7aaed5 100%);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(84, 162, 160, 0.24);
  flex: none;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #173246;
}

.brand-sub {
  font-size: 12px;
  color: #738892;
}

.side-nav__toggle {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(116, 144, 154, 0.18);
  background: rgba(255, 255, 255, 0.72);
  color: #56717b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
}

.side-nav__menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 2px;
}

.side-nav__item {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid rgba(201, 214, 221, 0.28);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(246, 250, 251, 0.18));
  color: #607985;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.side-nav__item::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0));
  opacity: 0;
  transition: opacity 0.18s ease;
}

.side-nav--collapsed .side-nav__item {
  justify-content: center;
  padding-inline: 0;
}

.side-nav__item:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 251, 252, 0.44));
  border-color: rgba(101, 162, 172, 0.28);
  box-shadow: 0 12px 22px rgba(48, 89, 98, 0.1);
  transform: translateY(-1px);
}

.side-nav__item:hover::before,
.side-nav__item--active::before {
  opacity: 1;
}

.side-nav__item--active {
  color: #173246;
  border-color: rgba(85, 176, 163, 0.32);
  background: linear-gradient(180deg, rgba(227, 245, 241, 0.98), rgba(238, 247, 248, 0.92));
  box-shadow: 0 14px 24px rgba(67, 120, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.side-nav__item--active::after {
  content: '';
  position: absolute;
  left: 10px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4bb39d 0%, #7eb8d8 100%);
}

.side-nav__item-mark {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  background: rgba(87, 176, 164, 0.14);
  color: #2f6d75;
  font-size: 13px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.side-nav__item-mark .el-icon {
  font-size: 16px;
}

.side-nav__item-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.side-nav__item-label {
  font-size: 14px;
  font-weight: 600;
  color: currentColor;
}

.side-nav__item-tip {
  font-size: 11px;
  color: #7a909b;
}

.side-nav__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 6px;
  padding: 12px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.16));
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.side-nav__user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.side-nav--collapsed .side-nav__user {
  justify-content: center;
}

.side-nav__user-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.side-nav__user-name {
  font-size: 14px;
  font-weight: 600;
  color: #173246;
}

.side-nav__user-role {
  font-size: 12px;
  color: #748993;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #57b0a4 0%, #7baed5 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(83, 149, 161, 0.2);
  flex: none;
}

.side-nav__logout {
  width: 100%;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(118, 144, 154, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(246, 250, 251, 0.48));
  color: #4f6874;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.drawer-head {
  display: flex;
  align-items: center;
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
  min-height: 50px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(119, 145, 154, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 249, 0.9));
  color: #23405f;
  cursor: pointer;
}

.drawer-menu-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.drawer-menu-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.drawer-menu-icon {
  font-size: 16px;
}

.drawer-menu-copy small {
  color: #76909c;
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

.drawer-user-role,
.logout-btn {
  color: #65808d;
}

@media (max-width: 900px) {
  :global(body.bi-shell-nav-expanded #app),
  :global(body.bi-shell-nav-collapsed #app) {
    padding-left: 0;
    padding-top: 72px;
  }

  .side-nav {
    display: none;
  }

  .nav-mobile-trigger {
    display: inline-flex;
  }
}
</style>
