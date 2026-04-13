<template>
  <div class="login-page">
    <div class="login-bg-shape login-bg-shape-1"></div>
    <div class="login-bg-shape login-bg-shape-2"></div>
    <el-card class="login-card" shadow="hover">
      <div class="brand">AIBI</div>
      <h1>企业智能分析平台</h1>
      <p class="subtitle">统一接入业务数据，构建可视化分析与决策大屏</p>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="用户名" required>
          <el-input v-model="username" placeholder="请输入用户名" clearable @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="password" type="password" placeholder="请输入密码" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <div class="login-options">
          <el-checkbox v-model="rememberUser">记住用户名</el-checkbox>
        </div>
        <el-button type="primary" class="full" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../api/auth'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const rememberUser = ref(true)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const result = await login({ username: username.value, password: password.value })
    localStorage.setItem('bi_user_id', String(result.id))
    localStorage.setItem('bi_token', result.token)
    localStorage.setItem('bi_username', result.username)
    localStorage.setItem('bi_display_name', result.displayName)
    if (rememberUser.value) {
      localStorage.setItem('bi_last_username', username.value)
    } else {
      localStorage.removeItem('bi_last_username')
    }
    router.push('/home')
    ElMessage.success(`欢迎回来，${result.displayName || result.username}`)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const lastUsername = localStorage.getItem('bi_last_username')
  if (lastUsername) {
    username.value = lastUsername
    rememberUser.value = true
  } else {
    username.value = 'admin'
    password.value = '123456'
  }
})
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 10% 10%, #c7f9cc, #f8fbff 35%),
              radial-gradient(circle at 90% 80%, #bae6fd, #f8fbff 40%);
}

.login-card {
  width: 100%;
  max-width: 460px;
  border-radius: 16px;
  z-index: 2;
}

.brand {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 700;
  color: #065f46;
  background: #d1fae5;
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 6px;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
}

.full {
  width: 100%;
}

.login-options {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.login-bg-shape {
  position: absolute;
  border-radius: 999px;
  filter: blur(6px);
  z-index: 1;
}

.login-bg-shape-1 {
  width: 220px;
  height: 220px;
  background: rgba(59, 130, 246, 0.18);
  top: -40px;
  left: -50px;
}

.login-bg-shape-2 {
  width: 260px;
  height: 260px;
  background: rgba(16, 185, 129, 0.16);
  bottom: -60px;
  right: -60px;
}
</style>
