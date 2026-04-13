<template>
  <header class="top-nav">
    <div class="brand">AI BI</div>
    <nav class="nav-items">
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'workbench' }" @click="go('/home')">工作台</button>
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'dashboard' }" @click="go('/home/dashboard')">仪表板</button>
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'screen' }" @click="go('/home/screen')">数据大屏</button>
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'prepare' }" @click="go('/home/prepare')">数据准备</button>
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'modeling' }" @click="go('/home/modeling')">数据建模</button>
      <button class="nav-btn" :class="{ 'nav-btn--active': active === 'system' }" @click="go('/home/system')">系统管理</button>
    </nav>
    <div class="user-menu">
      <span class="user-avatar">管</span>
      <span>{{ displayName }}</span>
      <el-button link class="logout-btn" @click="logout">退出</el-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

defineProps<{ active: 'workbench' | 'dashboard' | 'screen' | 'prepare' | 'modeling' | 'system' }>()

const router = useRouter()

const displayName = computed(() => {
  return localStorage.getItem('bi_display_name') || localStorage.getItem('bi_username') || '未登录用户'
})

const go = (path: string) => {
  router.push(path)
}

const logout = () => {
  localStorage.removeItem('bi_user_id')
  localStorage.removeItem('bi_token')
  localStorage.removeItem('bi_username')
  localStorage.removeItem('bi_display_name')
  router.push('/login')
}
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
