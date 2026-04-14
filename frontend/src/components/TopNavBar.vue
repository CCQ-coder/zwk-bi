<template>
  <header class="top-nav">
    <div class="brand">AI BI</div>
    <nav class="nav-items">
      <button
        v-for="menu in navMenus"
        :key="menu.id"
        class="nav-btn"
        :class="{ 'nav-btn--active': isMenuActive(menu.path) }"
        @click="go(menu.path)"
      >
        {{ menu.name }}
      </button>
    </nav>
    <div class="user-menu">
      <span class="user-avatar">{{ avatarText }}</span>
      <span>{{ displayName }}</span>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const router = useRouter()
const route = useRoute()
const menus = ref<AuthMenuItem[]>(getAuthMenus())

const displayName = computed(() => getAuthDisplayName())
const avatarText = computed(() => displayName.value.slice(0, 1) || '用')
const navMenus = computed(() => menus.value.filter((item) => item.visible !== false && item.type === 'menu' && item.path && !item.parentId))

const go = (path: string) => {
  router.push(path)
}

const isMenuActive = (path: string) => route.path === path || (path !== '/home' && route.path.startsWith(`${path}/`))

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
  clearAuthSession()
  router.push('/login')
}

onMounted(loadMenus)
</script>

<style scoped>
.top-nav {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, #04152f, #021230 70%);
  color: #ffffff;
  padding: 0 18px;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.5px;
  min-width: 110px;
}

.nav-items {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
}

.nav-btn {
  border: none;
  background: transparent;
  color: #ffffff;
  height: 100%;
  padding: 0 18px;
  cursor: pointer;
  opacity: 0.85;
}

.nav-btn--active {
  background: #2f6df6;
  opacity: 1;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #3b82f6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.logout-btn {
  color: #fbbf24;
}

@media (max-width: 768px) {
  .top-nav {
    padding: 0 10px;
  }

  .nav-items {
    display: none;
  }
}
</style>
