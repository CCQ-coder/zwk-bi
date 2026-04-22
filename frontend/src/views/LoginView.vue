<template>
  <div class="login-shell">
    <!-- 装饰：流动光斑 -->
    <div class="bg-orb bg-orb--1"></div>
    <div class="bg-orb bg-orb--2"></div>
    <div class="bg-orb bg-orb--3"></div>
    <div class="bg-grid"></div>

    <div class="login-frame">
      <!-- 左侧品牌展示 -->
      <section class="login-brand">
        <header class="brand-head">
          <div class="brand-logo">
            <span class="brand-logo__mark">AI</span>
            <span class="brand-logo__dot"></span>
          </div>
          <div class="brand-meta">
            <div class="brand-name">{{ platformName }}</div>
            <div class="brand-slogan">{{ platformSlogan }}</div>
          </div>
        </header>

        <div class="brand-hero">
          <div class="brand-kicker">ENTERPRISE BI PLATFORM</div>
          <h2 class="brand-title">
            <span>一个平台</span>
            <span class="brand-title__accent">驱动你的全部数据决策</span>
          </h2>
          <p class="brand-desc">
            统一接入业务库、数仓与外部接口，秒级出图、组件级权限，让每一次决策都基于可信数据。
          </p>

          <ul class="brand-feature-list">
            <li v-for="item in features" :key="item.title" class="brand-feature">
              <span class="brand-feature__icon" v-html="item.icon"></span>
              <div>
                <div class="brand-feature__title">{{ item.title }}</div>
                <div class="brand-feature__desc">{{ item.desc }}</div>
              </div>
            </li>
          </ul>
        </div>

        <footer class="brand-footer">
          <span>{{ copyright }}</span>
          <span class="brand-footer__sep">·</span>
          <span>v{{ version }}</span>
        </footer>
      </section>

      <!-- 右侧登录表单 -->
      <section class="login-card">
        <div class="login-card__head">
          <div class="login-card__title">欢迎登录</div>
          <div class="login-card__subtitle">请使用账号登录 {{ platformName }}</div>
        </div>

        <el-form
          ref="formRef"
          class="login-form"
          :model="loginForm"
          :rules="rules"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="账号" prop="username">
            <el-input
              v-model="loginForm.username"
              size="large"
              placeholder="请输入用户名"
              clearable
              :prefix-icon="User"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              size="large"
              placeholder="请输入密码"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="login-form__row">
            <el-checkbox v-model="rememberUser">记住账号</el-checkbox>
            <el-link type="primary" underline="never" @click="onForgotPwd">忘记密码？</el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            <span v-if="!loading">登 录</span>
            <span v-else>登录中…</span>
          </el-button>

          <div class="login-quick">
            <span class="login-quick__label">快速试用：</span>
            <el-tag
              v-for="item in quickAccounts"
              :key="item.username"
              class="login-quick__tag"
              effect="plain"
              @click="fillQuick(item)"
            >
              {{ item.label }} · {{ item.username }}
            </el-tag>
          </div>
        </el-form>

        <div class="login-card__foot">
          <span class="login-card__foot-text">登录即表示同意</span>
          <el-link type="primary" underline="never">服务协议</el-link>
          <span class="login-card__foot-text">与</span>
          <el-link type="primary" underline="never">隐私政策</el-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
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

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const features = [
  {
    title: '多源数据接入',
    desc: '数据库 / API / 表格 / JSON 一站接入，复用统一数据集',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>'
  },
  {
    title: '组件级权限',
    desc: '按角色 / 菜单 / 数据集精细控制访问范围与编辑权限',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>'
  },
  {
    title: '可视化分析',
    desc: '柱线饼/地图/雷达/词云等 30+ 组件，交互联动开箱即用',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg>'
  },
  {
    title: '数据大屏',
    desc: '画布拖拽、装饰组件、自适应分辨率与发布分享一气呵成',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
  }
]

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
})
</script>

<style scoped>
.login-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow: hidden;
  background:
    radial-gradient(1200px 600px at 0% 0%, #1d2c5a 0%, transparent 60%),
    radial-gradient(900px 500px at 100% 100%, #0f3a55 0%, transparent 55%),
    linear-gradient(135deg, #0a1530 0%, #0d1b3d 45%, #0a213c 100%);
  color: #e8efff;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(120, 170, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 170, 255, 0.06) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 80%);
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
  pointer-events: none;
}
.bg-orb--1 { width: 420px; height: 420px; background: #4a7dff; top: -120px; left: -120px; }
.bg-orb--2 { width: 380px; height: 380px; background: #1ec7c0; bottom: -100px; right: -80px; }
.bg-orb--3 { width: 260px; height: 260px; background: #8b5cf6; top: 40%; left: 50%; transform: translateX(-50%); opacity: 0.35; }

.login-frame {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1080px;
  min-height: 620px;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(13, 22, 48, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 30px 80px rgba(2, 8, 23, 0.55),
    0 0 0 1px rgba(120, 170, 255, 0.12) inset;
}

/* 左侧品牌区 */
.login-brand {
  position: relative;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    linear-gradient(160deg, rgba(74, 125, 255, 0.18), rgba(30, 199, 192, 0.08) 60%, transparent),
    linear-gradient(180deg, rgba(13, 22, 48, 0), rgba(13, 22, 48, 0.4));
  border-right: 1px solid rgba(120, 170, 255, 0.12);
}
.brand-head { display: flex; align-items: center; gap: 14px; }
.brand-logo {
  position: relative; width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, #4a7dff, #1ec7c0);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(74, 125, 255, 0.45);
}
.brand-logo__mark { color: #fff; font-weight: 800; letter-spacing: 1px; font-size: 16px; }
.brand-logo__dot {
  position: absolute; right: -3px; top: -3px;
  width: 12px; height: 12px; border-radius: 50%;
  background: #ffd166; box-shadow: 0 0 12px rgba(255, 209, 102, 0.8);
}
.brand-name { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; color: #f3f7ff; }
.brand-slogan { font-size: 12px; color: #93a4cd; margin-top: 2px; }

.brand-hero { margin: 32px 0; }
.brand-kicker {
  display: inline-block; padding: 4px 10px;
  font-size: 11px; letter-spacing: 2px; color: #7ee0d8;
  border-radius: 999px;
  background: rgba(30, 199, 192, 0.12);
  border: 1px solid rgba(30, 199, 192, 0.3);
}
.brand-title {
  margin: 18px 0 12px; font-size: 32px; font-weight: 700; line-height: 1.25;
  color: #f3f7ff; display: flex; flex-direction: column; gap: 4px;
}
.brand-title__accent {
  background: linear-gradient(90deg, #4a7dff, #1ec7c0 60%, #ffd166);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.brand-desc { margin: 0 0 24px; color: #c2cee9; font-size: 13.5px; line-height: 1.7; max-width: 420px; }

.brand-feature-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.brand-feature {
  display: flex; gap: 14px; padding: 12px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 170, 255, 0.08);
  transition: transform .25s, background .25s;
}
.brand-feature:hover { transform: translateX(2px); background: rgba(74, 125, 255, 0.08); }
.brand-feature__icon {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(74, 125, 255, 0.25), rgba(30, 199, 192, 0.18));
  color: #7eb0ff;
}
.brand-feature__title { font-size: 13.5px; color: #f3f7ff; font-weight: 600; }
.brand-feature__desc { font-size: 12px; color: #93a4cd; margin-top: 2px; line-height: 1.5; }

.brand-footer { font-size: 12px; color: #6b7ba1; display: flex; align-items: center; gap: 8px; }
.brand-footer__sep { opacity: .6; }

/* 右侧登录卡 */
.login-card { padding: 48px 56px; display: flex; flex-direction: column; justify-content: center; background: rgba(255, 255, 255, 0.02); }
.login-card__head { margin-bottom: 24px; }
.login-card__title { font-size: 26px; font-weight: 700; color: #f3f7ff; letter-spacing: 0.5px; }
.login-card__subtitle { margin-top: 6px; font-size: 13px; color: #93a4cd; }

.login-form :deep(.el-form-item__label) { color: #c2cee9; font-weight: 500; padding-bottom: 4px; }
.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.04) !important;
  box-shadow: 0 0 0 1px rgba(120, 170, 255, 0.18) inset !important;
  border-radius: 10px;
  transition: box-shadow .2s, background .2s;
}
.login-form :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px rgba(74, 125, 255, 0.5) inset !important; }
.login-form :deep(.el-input.is-focus .el-input__wrapper) {
  background: rgba(74, 125, 255, 0.08) !important;
  box-shadow: 0 0 0 1px #4a7dff inset, 0 0 0 4px rgba(74, 125, 255, 0.18) !important;
}
.login-form :deep(.el-input__inner) { color: #f3f7ff !important; }
.login-form :deep(.el-input__inner::placeholder) { color: #6b7ba1; }
.login-form :deep(.el-input__prefix) { color: #7eb0ff; }
.login-form :deep(.el-checkbox__label) { color: #c2cee9; }

.login-form__row {
  display: flex; align-items: center; justify-content: space-between;
  margin: -4px 0 18px;
}

.login-btn {
  width: 100%; height: 46px; font-size: 15px; font-weight: 600; letter-spacing: 4px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4a7dff, #1ec7c0);
  border: none;
  box-shadow: 0 12px 28px rgba(74, 125, 255, 0.35);
  transition: transform .2s, box-shadow .2s;
}
.login-btn:hover { transform: translateY(-1px); box-shadow: 0 16px 36px rgba(74, 125, 255, 0.45); }

.login-quick { margin-top: 18px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.login-quick__label { font-size: 12px; color: #93a4cd; }
.login-quick__tag {
  cursor: pointer;
  background: rgba(74, 125, 255, 0.1) !important;
  border-color: rgba(74, 125, 255, 0.3) !important;
  color: #b9d2ff !important;
  transition: background .2s;
}
.login-quick__tag:hover { background: rgba(74, 125, 255, 0.22) !important; }

.login-card__foot {
  margin-top: 28px; display: flex; justify-content: center; gap: 6px; font-size: 12px;
}
.login-card__foot-text { color: #6b7ba1; }

/* 响应式 */
@media (max-width: 880px) {
  .login-frame { grid-template-columns: 1fr; max-width: 460px; min-height: 0; }
  .login-brand { padding: 32px 28px 24px; border-right: none; border-bottom: 1px solid rgba(120, 170, 255, 0.12); }
  .brand-hero { margin: 18px 0; }
  .brand-title { font-size: 24px; }
  .brand-feature-list { display: none; }
  .login-card { padding: 28px; }
}
</style>
