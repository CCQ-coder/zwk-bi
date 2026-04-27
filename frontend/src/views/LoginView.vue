<template>
  <div class="login-shell">
    <div class="shell-novas" aria-hidden="true">
      <span class="shell-nova shell-nova--1"></span>
      <span class="shell-nova shell-nova--2"></span>
      <span class="shell-nova shell-nova--3"></span>
    </div>
    <div class="login-stage">

      <!-- Left: scene panel -->
      <div class="scene-panel">
        <!-- Rotating scene backgrounds -->
        <div class="scene-slides" aria-hidden="true">
          <div
            v-for="(scene, i) in sceneSlides"
            :key="scene.label"
            class="scene-slide"
            :class="{ active: i === currentBg }"
            :style="{ backgroundImage: `url(${scene.image})` }"
          ></div>
        </div>

        <div class="scene-glow" aria-hidden="true"></div>
        <div class="scene-vignette" aria-hidden="true"></div>
        <div class="scene-reflection" aria-hidden="true"></div>
        <div class="scene-stars" aria-hidden="true">
          <span class="scene-star scene-star--1"></span>
          <span class="scene-star scene-star--2"></span>
          <span class="scene-star scene-star--3"></span>
          <span class="scene-star scene-star--4"></span>
        </div>

        <!-- Content -->
        <div class="scene-body">
          <header class="scene-hd">
            <div class="scene-logo" aria-label="AI BI Workspace">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.18)"/>
                <path d="M18 6l10 5.8v11.6L18 29 8 23.4V11.6L18 6z" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"/>
                <path d="M18 12l5 2.9v5.8L18 23l-5-2.3V14.9L18 12z" fill="rgba(255,255,255,0.3)"/>
                <circle cx="18" cy="18" r="3" fill="rgba(255,255,255,0.92)"/>
              </svg>
            </div>
          </header>

          <div class="scene-hero">
            <div class="scene-kicker">{{ sceneSlides[currentBg]?.label }}</div>
            <h1 class="scene-title">{{ platformName }}</h1>
            <p class="scene-sub">{{ platformSlogan }}</p>
          </div>

          <div class="scene-spacer"></div>

          <footer class="scene-ft">
            <span class="scene-copy-text">{{ copyright }}</span>
            <nav class="scene-nav" aria-label="切换背景">
              <button type="button" class="scene-nav__btn" aria-label="上一张" @click="prevBg">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                  <path d="M6 1 2 6l4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div class="scene-dots" role="group" aria-label="背景选择">
                <button
                  v-for="(scene, i) in sceneSlides"
                  :key="scene.label"
                  type="button"
                  class="scene-dot"
                  :class="{ 'scene-dot--on': i === currentBg }"
                  :aria-label="scene.label"
                  @click="goToBg(i)"
                ></button>
              </div>
              <button type="button" class="scene-nav__btn" aria-label="下一张" @click="nextBg">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                  <path d="M2 1l4 5-4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </nav>
          </footer>
        </div>
      </div>

      <!-- Right: login panel -->
      <section class="auth-panel" aria-label="登录">
        <div class="auth-logo" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="14" fill="#EEF4FF"/>
            <path d="M22 8l11 6.35v12.7L22 34 11 27.05V14.35L22 8z" fill="none" stroke="#2563EB" stroke-width="1.8"/>
            <path d="M22 14l6 3.46v6.92L22 27.5l-6-3.12V17.46L22 14z" fill="rgba(59,130,246,0.18)"/>
            <circle cx="22" cy="22" r="3.5" fill="#2563EB"/>
          </svg>
        </div>

        <div class="auth-head">
          <h2 class="auth-title">欢迎回来</h2>
          <p class="auth-sub">请登录您的账号</p>
        </div>

        <el-form
          ref="formRef"
          class="auth-form"
          :model="loginForm"
          :rules="rules"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <label for="f-user" class="sr-only">账号</label>
            <el-input
              id="f-user"
              v-model="loginForm.username"
              size="large"
              placeholder="请输入账号"
              :prefix-icon="User"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item prop="password">
            <label for="f-pass" class="sr-only">密码</label>
            <el-input
              id="f-pass"
              v-model="loginForm.password"
              type="password"
              size="large"
              placeholder="请输入密码"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="auth-row">
            <el-checkbox v-model="rememberUser">记住我</el-checkbox>
            <el-link type="primary" underline="never" @click="onForgotPwd">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="auth-btn"
            :loading="loading"
            @click="handleLogin"
          >
            <span class="auth-btn__label">{{ loading ? '登录中...' : '登录' }}</span>
            <span v-if="!loading" class="auth-btn__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M15 9l-4-5M15 9l-4 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </el-button>

          <div class="auth-or" aria-hidden="true">
            <span></span><span class="auth-or__text">或</span><span></span>
          </div>

          <button type="button" class="sso-btn" @click="onSSO">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            企业 SSO 登录
          </button>

          <div v-if="quickAccounts.length" class="auth-quick">
            <span class="auth-quick__label">快速试用：</span>
            <el-tag
              v-for="item in quickAccounts"
              :key="item.username"
              class="auth-quick__tag"
              effect="plain"
              @click="fillQuick(item)"
            >{{ item.label }}</el-tag>
          </div>
        </el-form>
      </section>

    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import sceneAlpineCube from '../assets/login/uploaded/scene-1.png'
import sceneMoonTerrace from '../assets/login/uploaded/scene-2.png'
import sceneSunsetVilla from '../assets/login/uploaded/scene-3.png'
import sceneAlpineLake from '../assets/login/uploaded/scene-4.png'
import { login } from '../api/auth'
import { getCurrentMenus } from '../api/menu'
import { saveAuthMenus, saveAuthSession } from '../utils/auth-session'
import { getPlatformBranding } from '../utils/platform-settings'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberUser = ref(true)
const loginForm = reactive({ username: '', password: '' })

const branding = getPlatformBranding()
const platformName = ref(branding.name)
const platformSlogan = ref(branding.slogan)
const copyright = ref(branding.copyright)
const version = ref(branding.version)

const sceneSlides = [
  { label: '冰湖立方', image: sceneAlpineCube },
  { label: '月下露台', image: sceneMoonTerrace },
  { label: '日落水院', image: sceneSunsetVilla },
  { label: '雪山湖湾', image: sceneAlpineLake },
]
const currentBg = ref(0)
let bgTimer: ReturnType<typeof setInterval> | null = null

const goToBg = (i: number) => {
  currentBg.value = ((i % sceneSlides.length) + sceneSlides.length) % sceneSlides.length
}
const nextBg = () => goToBg(currentBg.value + 1)
const prevBg = () => goToBg(currentBg.value - 1)

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const quickAccounts = [
  { label: '管理员', username: 'admin', password: '123456' }
]

const fillQuick = (item: { username: string; password: string }) => {
  loginForm.username = item.username
  loginForm.password = item.password
}

const onForgotPwd = () => {
  ElMessageBox.alert('请联系系统管理员重置密码，或登录后在「系统设置 → 用户管理」中维护密码。', '忘记密码', {
    confirmButtonText: '我知道了'
  })
}

const onSSO = () => {
  ElMessageBox.alert('SSO 单点登录功能正在配置中，请使用账号密码登录。', 'SSO 登录', {
    confirmButtonText: '知道了'
  })
}

const handleLogin = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const result = await login({ username: loginForm.username, password: loginForm.password })
    saveAuthSession(result)
    const menus = await getCurrentMenus()
    saveAuthMenus(menus)
    if (rememberUser.value) {
      localStorage.setItem('bi_last_username', loginForm.username)
    } else {
      localStorage.removeItem('bi_last_username')
    }
    ElMessage.success(`欢迎回来，${result.displayName || result.username}`)
    router.push('/home')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const lastUsername = localStorage.getItem('bi_last_username')
  if (lastUsername) {
    loginForm.username = lastUsername
    rememberUser.value = true
  } else {
    rememberUser.value = false
  }
  bgTimer = setInterval(nextBg, 6000)
})

onUnmounted(() => {
  if (bgTimer) clearInterval(bgTimer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700&display=swap');

/* 鈹€鈹€鈹€ Page shell 鈹€鈹€鈹€ */
.login-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%),
    #edf4ff url('../assets/login/shell-starry-sky.svg') center top / cover no-repeat;
  font-family: 'Fira Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.login-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.18) 100%);
}

.shell-novas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.shell-nova {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.6) 34%, rgba(255, 255, 255, 0) 72%);
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.55));
  opacity: 0.2;
  transform: scale(0.75);
  animation: shell-nova-pulse 5.6s ease-in-out infinite;
}

.shell-nova::before,
.shell-nova::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0) 100%);
}

.shell-nova::before {
  width: 42px;
  height: 1.5px;
}

.shell-nova::after {
  width: 1.5px;
  height: 42px;
}

.shell-nova--1 {
  top: 12%;
  left: 18%;
  animation-delay: 0s;
}

.shell-nova--2 {
  top: 20%;
  right: 15%;
  width: 10px;
  height: 10px;
  animation-delay: 1.8s;
}

.shell-nova--3 {
  top: 30%;
  left: 64%;
  width: 9px;
  height: 9px;
  animation-delay: 3.2s;
}

/* 鈹€鈹€鈹€ Main stage 鈹€鈹€鈹€ */
.login-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.72fr 1fr;
  width: min(1280px, 100%);
  min-height: 640px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(10, 28, 72, 0.2), 0 2px 10px rgba(10, 28, 72, 0.08);
}

/* 鈹€鈹€鈹€ Scene panel (left) 鈹€鈹€鈹€ */
.scene-panel {
  position: relative;
  overflow: hidden;
  background: #d8e6f3;
}

/* Background slides */
.scene-slides {
  position: absolute;
  inset: 0;
}

.scene-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  transform: scale(1.03);
  filter: saturate(1.04) contrast(1.02);
  transition: opacity 1.2s ease, transform 6s ease;
}

.scene-slide.active {
  opacity: 1;
  transform: scale(1);
}

.scene-glow,
.scene-vignette,
.scene-reflection {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-glow {
  z-index: 2;
  background:
    radial-gradient(circle at 22% 12%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 28%);
}

.scene-vignette {
  z-index: 2;
  background: linear-gradient(
    180deg,
    rgba(8, 24, 54, 0.02) 0%,
    rgba(8, 24, 54, 0.06) 42%,
    rgba(5, 16, 38, 0.26) 100%
  );
}

.scene-reflection {
  z-index: 3;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 58%, rgba(255, 255, 255, 0.08) 80%, rgba(255, 255, 255, 0.01) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 16%, rgba(255, 255, 255, 0) 84%, rgba(255, 255, 255, 0.05) 100%);
}

.scene-stars {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.scene-star {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.58) 34%, rgba(255, 255, 255, 0) 74%);
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.42));
  opacity: 0.18;
  transform: scale(0.72);
  animation: scene-star-pulse 4.8s ease-in-out infinite;
}

.scene-star::before,
.scene-star::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.88) 50%, rgba(255, 255, 255, 0) 100%);
}

.scene-star::before {
  width: 34px;
  height: 1.4px;
}

.scene-star::after {
  width: 1.4px;
  height: 34px;
}

.scene-star--1 {
  top: 13%;
  left: 17%;
  animation-delay: 0.2s;
}

.scene-star--2 {
  top: 18%;
  left: 44%;
  width: 8px;
  height: 8px;
  animation-delay: 1.6s;
}

.scene-star--3 {
  top: 12%;
  right: 14%;
  width: 11px;
  height: 11px;
  animation-delay: 2.8s;
}

.scene-star--4 {
  top: 27%;
  right: 28%;
  width: 7px;
  height: 7px;
  animation-delay: 3.9s;
}

/* 鈹€鈹€鈹€ Scene content 鈹€鈹€鈹€ */
.scene-body {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 28px 32px 24px;
}

.scene-hd { flex-shrink: 0; }

.scene-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.24);
}

.scene-hero {
  margin-top: 22px;
  flex-shrink: 0;
}

.scene-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  margin-bottom: 14px;
  background: rgba(8, 31, 66, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.scene-title {
  font-size: clamp(24px, 2.8vw, 34px);
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.15;
  max-width: 420px;
  text-shadow: 0 2px 20px rgba(0, 20, 60, 0.34);
  margin: 0;
}

.scene-sub {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 400;
  max-width: 430px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 8px rgba(0, 20, 60, 0.28);
}

.scene-spacer { flex: 1; }

/* Scene footer */
.scene-ft {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
}

.scene-copy-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
}

.scene-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-nav__btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: rgba(8, 31, 66, 0.18);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition: background 0.2s ease;
  appearance: none;
  backdrop-filter: blur(10px);
}

.scene-nav__btn:hover { background: rgba(8, 31, 66, 0.32); }
.scene-nav__btn:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.8); outline-offset: 2px; }

.scene-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.scene-dot {
  width: 8px;
  height: 4px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.42);
  cursor: pointer;
  transition: width 0.25s ease, background 0.25s ease;
  appearance: none;
  padding: 0;
  min-width: 8px;
}

.scene-dot:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.8); outline-offset: 2px; }

.scene-dot--on {
  width: 16px;
  background: rgba(255, 255, 255, 0.9);
}

/* 鈹€鈹€鈹€ Auth panel (right) 鈹€鈹€鈹€ */
.auth-panel {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 44px 40px;
  overflow-y: auto;
}

.auth-logo { margin-bottom: 16px; }

.auth-head {
  text-align: center;
  width: 100%;
  margin-bottom: 24px;
}

.auth-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0c1c2e;
  margin: 0;
}

.auth-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7a8d;
}

/* 鈹€鈹€鈹€ Form 鈹€鈹€鈹€ */
.auth-form { width: 100%; }

.auth-form :deep(.el-form-item) { margin-bottom: 14px; }
.auth-form :deep(.el-form-item__label) { display: none; }

.auth-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  min-height: 50px;
  padding: 0 14px;
  background: #f7fafc !important;
  box-shadow: 0 0 0 1px rgba(196, 214, 230, 0.7) inset !important;
  transition: box-shadow 0.2s ease, background 0.2s ease;
}

.auth-form :deep(.el-input__wrapper:hover) {
  background: #f2f7fc !important;
  box-shadow: 0 0 0 1px rgba(100, 165, 255, 0.35) inset !important;
}

.auth-form :deep(.el-input.is-focus .el-input__wrapper) {
  background: #fff !important;
  box-shadow:
    0 0 0 1.5px rgba(59, 130, 246, 0.6) inset,
    0 0 0 4px rgba(59, 130, 246, 0.1) !important;
}

.auth-form :deep(.el-input__inner) {
  color: #0c1c2e;
  font-size: 14px;
  font-family: 'Fira Sans', 'PingFang SC', sans-serif;
}

.auth-form :deep(.el-input__inner::placeholder) { color: #96aab8; }
.auth-form :deep(.el-input__prefix) { color: #7a94a7; }
.auth-form :deep(.el-form-item__error) { font-size: 12px; padding-top: 3px; }

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 16px;
}

.auth-form :deep(.el-checkbox__label) { color: #4d6678; font-size: 13px; }
.auth-form :deep(.el-checkbox__input.is-checked .el-checkbox__inner) { background-color: #1d4ed8; border-color: #1d4ed8; }
.auth-form :deep(.el-link) { color: #1d4ed8; font-size: 13px; }

/* 鈹€鈹€鈹€ Login button 鈹€鈹€鈹€ */
.auth-btn {
  width: 100%;
  min-height: 50px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg, #1a3fd4 0%, #3b82f6 100%);
  box-shadow: 0 8px 24px rgba(26, 63, 212, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(26, 63, 212, 0.32);
}

.auth-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 3px; }

.auth-btn:disabled,
.auth-btn.is-loading { cursor: not-allowed; opacity: 0.72; transform: none; }

.auth-btn :deep(.el-button__text) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.auth-btn__label {
  flex: 1;
  text-align: center;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.auth-btn__icon {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.9);
  transition: transform 0.2s ease;
}

.auth-btn:hover .auth-btn__icon { transform: translateX(3px); }

/* 鈹€鈹€鈹€ Or divider 鈹€鈹€鈹€ */
.auth-or {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}

.auth-or span:not(.auth-or__text) { flex: 1; height: 1px; background: rgba(196, 214, 230, 0.7); }
.auth-or__text { font-size: 12px; color: #96aab8; white-space: nowrap; }

/* 鈹€鈹€鈹€ SSO button 鈹€鈹€鈹€ */
.sso-btn {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  border: 1.5px solid rgba(196, 214, 230, 0.85);
  background: #fff;
  color: #2a4a62;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Fira Sans', 'PingFang SC', sans-serif;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  appearance: none;
}

.sso-btn:hover { border-color: #3b82f6; background: #f0f7ff; }
.sso-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

/* 鈹€鈹€鈹€ Quick accounts 鈹€鈹€鈹€ */
.auth-quick {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.auth-quick__label { font-size: 12px; color: #546e7a; font-weight: 500; }

.auth-quick__tag {
  cursor: pointer;
  color: #3d5a70 !important;
  border-color: rgba(150, 175, 200, 0.25) !important;
  background: #f4f8fc !important;
  transition: background 0.2s ease !important;
}

.auth-quick__tag:hover {
  background: #e8f0fc !important;
  border-color: rgba(59, 130, 246, 0.3) !important;
}

/* 鈹€鈹€鈹€ Accessibility 鈹€鈹€鈹€ */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 鈹€鈹€鈹€ Responsive 鈹€鈹€鈹€ */
@media (max-width: 1080px) {
  .login-stage { grid-template-columns: 1.4fr 1fr; }
  .auth-panel { padding: 36px 30px; }
}

@media (max-width: 768px) {
  .login-shell { padding: 0; }
  .login-stage {
    grid-template-columns: 1fr;
    min-height: 100svh;
    border-radius: 0;
    box-shadow: none;
  }
  .scene-panel { min-height: 260px; max-height: 38vh; }
  .scene-features { display: none; }
  .scene-kicker { margin-bottom: 10px; }
  .auth-panel { padding: 32px 24px; }
  .auth-title { font-size: 24px; }
}

@media (max-width: 480px) {
  .scene-panel { max-height: 30vh; min-height: 200px; }
  .auth-panel { padding: 24px 18px; }
  .auth-logo { margin-bottom: 12px; }
}

@media (max-width: 375px) {
  .auth-panel { padding: 20px 14px; }
  .auth-title { font-size: 22px; }
  .auth-btn { min-height: 46px; }
}

@keyframes shell-nova-pulse {
  0%, 100% {
    opacity: 0.18;
    transform: scale(0.72);
  }
  45% {
    opacity: 0.92;
    transform: scale(1);
  }
  62% {
    opacity: 0.42;
    transform: scale(0.86);
  }
}

@keyframes scene-star-pulse {
  0%, 100% {
    opacity: 0.14;
    transform: scale(0.7);
  }
  40% {
    opacity: 0.84;
    transform: scale(1);
  }
  58% {
    opacity: 0.34;
    transform: scale(0.82);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scene-star { animation: none !important; }
  .shell-nova { animation: none !important; }
  .scene-slide { transition: none !important; }
  .auth-btn, .sso-btn, .scene-nav__btn, .scene-dot, .auth-quick__tag,
  .auth-form :deep(.el-input__wrapper) { transition: none !important; }
  .auth-btn:hover, .sso-btn:hover, .auth-btn:hover .auth-btn__icon { transform: none !important; }
}
</style>


