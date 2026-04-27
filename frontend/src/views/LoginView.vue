<template>
  <div class="login-shell">
    <div class="bg-wash"></div>
    <div class="bg-halo bg-halo--left"></div>
    <div class="bg-halo bg-halo--right"></div>
    <div class="bg-raster"></div>
    <div class="bg-noise"></div>

    <div class="login-stage">
      <section class="login-scene">
        <div class="scene-stack" aria-hidden="true">
          <div class="scene-stack__plate scene-stack__plate--ghost"></div>
          <div class="scene-stack__plate scene-stack__plate--soft"></div>
          <div class="scene-stack__plate scene-stack__plate--main">
            <div class="scene-stack__shine"></div>
            <div class="scene-stack__sky"></div>
            <div class="scene-stack__mountain scene-stack__mountain--far"></div>
            <div class="scene-stack__mountain scene-stack__mountain--near"></div>
            <div class="scene-stack__water"></div>
            <div class="scene-stack__dock"></div>
            <div class="scene-stack__cube">
              <span v-for="item in 9" :key="`cube-${item}`" class="scene-stack__cube-cell"></span>
            </div>
            <div class="scene-stack__cube-shadow"></div>
          </div>

          <div class="scene-stack__control scene-stack__control--left">‹</div>
          <div class="scene-stack__control scene-stack__control--center">›</div>
          <div class="scene-stack__dots">
            <span
              v-for="dot in 4"
              :key="`dot-${dot}`"
              class="scene-stack__dot"
              :class="{ 'scene-stack__dot--active': dot === 1 }"
            ></span>
          </div>
        </div>

        <div class="scene-copy">
          <div class="scene-copy__chip">SMART BI WORKSPACE</div>
          <h1 class="scene-copy__title">{{ platformName }}</h1>
          <div class="scene-copy__subtitle">{{ platformSlogan }}</div>
          <p class="scene-copy__desc">
            统一完成数据接入、分析建模、看板设计与发布分享，让业务决策界面保持简洁、稳定且可信。
          </p>
          <div class="scene-copy__pills">
            <span class="scene-copy__pill">多源接入</span>
            <span class="scene-copy__pill">组件分析</span>
            <span class="scene-copy__pill">权限发布</span>
          </div>
          <div class="scene-copy__footer">
            <span>{{ copyright }}</span>
            <span class="scene-copy__sep">·</span>
            <span>v{{ version }}</span>
          </div>
        </div>
      </section>

      <section class="login-card">
        <div class="login-card__glow"></div>
        <div class="login-card__symbol" aria-hidden="true">
          <span class="login-card__symbol-face login-card__symbol-face--left"></span>
          <span class="login-card__symbol-face login-card__symbol-face--right"></span>
          <span class="login-card__symbol-core"></span>
        </div>

        <div class="login-card__head">
          <div class="login-card__eyebrow">ACCOUNT ACCESS</div>
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
            <span class="login-btn__text">{{ loading ? '登录中…' : '进入平台' }}</span>
            <span v-if="!loading" class="login-btn__arrow">→</span>
          </el-button>

          <div class="login-quick">
            <span class="login-quick__label">快速试用</span>
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
  display: grid;
  place-items: center;
  padding: 26px;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 52%, #ebf1f8 100%);
  color: #173246;
}

.bg-wash,
.bg-halo,
.bg-raster,
.bg-noise {
  position: absolute;
  pointer-events: none;
}

.bg-wash {
  inset: -12% -8%;
  background:
    radial-gradient(circle at 16% 24%, rgba(126, 185, 255, 0.26), transparent 18%),
    radial-gradient(circle at 74% 16%, rgba(188, 216, 255, 0.4), transparent 22%),
    radial-gradient(circle at 48% 68%, rgba(255, 255, 255, 0.68), transparent 22%);
  filter: blur(26px);
  animation: wash-drift 20s ease-in-out infinite alternate;
}

.bg-halo {
  border-radius: 50%;
  filter: blur(82px);
  opacity: 0.5;
  animation: halo-float 18s ease-in-out infinite;
}

.bg-halo--left {
  width: 32vw;
  min-width: 260px;
  aspect-ratio: 1;
  left: -6vw;
  top: 14%;
  background: rgba(156, 204, 255, 0.44);
}

.bg-halo--right {
  width: 28vw;
  min-width: 240px;
  aspect-ratio: 1;
  right: -4vw;
  bottom: 6%;
  background: rgba(160, 225, 255, 0.42);
  animation-delay: -8s;
}

.bg-raster {
  inset: 0;
  background-image:
    linear-gradient(rgba(155, 173, 191, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(155, 173, 191, 0.16) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at center, #000 26%, transparent 78%);
  opacity: 0.22;
  animation: raster-drift 28s linear infinite;
}

.bg-noise {
  inset: 0;
  background-image: radial-gradient(rgba(87, 118, 145, 0.14) 0.7px, transparent 0.7px);
  background-size: 18px 18px;
  opacity: 0.14;
  mix-blend-mode: soft-light;
}

.login-stage {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.14fr) minmax(360px, 420px);
  align-items: center;
  gap: clamp(26px, 4vw, 58px);
}

.login-scene {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.scene-stack {
  position: relative;
  min-height: 540px;
  max-width: 760px;
}

.scene-stack__plate {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 34px;
  border: 1px solid rgba(160, 184, 210, 0.22);
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow:
    0 28px 56px rgba(92, 118, 152, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  overflow: hidden;
}

.scene-stack__plate--ghost {
  left: 0;
  width: 30%;
  height: 74%;
  background: linear-gradient(180deg, rgba(255, 220, 213, 0.36), rgba(238, 246, 255, 0.2));
  animation: plate-float-back 18s ease-in-out infinite;
}

.scene-stack__plate--soft {
  left: 74px;
  width: 46%;
  height: 82%;
  background: linear-gradient(180deg, rgba(101, 164, 255, 0.24), rgba(234, 244, 255, 0.34));
  animation: plate-float-mid 16s ease-in-out infinite;
}

.scene-stack__plate--main {
  left: 156px;
  right: 0;
  height: 88%;
  min-width: 440px;
  background: linear-gradient(180deg, rgba(233, 243, 255, 0.96) 0%, rgba(215, 230, 246, 0.92) 48%, rgba(241, 246, 252, 0.98) 100%);
  animation: plate-float-main 20s ease-in-out infinite;
}

.scene-stack__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.56) 0%, rgba(255, 255, 255, 0.18) 24%, transparent 38%, rgba(255, 255, 255, 0.22) 62%, transparent 78%);
  mix-blend-mode: screen;
  animation: shine-sweep 12s ease-in-out infinite;
}

.scene-stack__sky {
  position: absolute;
  inset: 0 0 36% 0;
  background:
    radial-gradient(circle at 76% 18%, rgba(255, 255, 255, 0.84), transparent 16%),
    linear-gradient(180deg, rgba(225, 238, 255, 0.98), rgba(194, 217, 245, 0.94));
}

.scene-stack__mountain {
  position: absolute;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(191, 208, 234, 0.96), rgba(233, 242, 250, 0.98));
}

.scene-stack__mountain--far {
  bottom: 28%;
  height: 26%;
  clip-path: polygon(0 100%, 12% 72%, 20% 82%, 34% 58%, 46% 78%, 62% 42%, 76% 66%, 88% 38%, 100% 58%, 100% 100%);
  opacity: 0.76;
}

.scene-stack__mountain--near {
  bottom: 20%;
  height: 24%;
  clip-path: polygon(0 100%, 10% 78%, 18% 88%, 32% 52%, 46% 80%, 58% 60%, 72% 74%, 88% 46%, 100% 66%, 100% 100%);
  background: linear-gradient(180deg, rgba(174, 197, 228, 0.94), rgba(226, 238, 248, 0.98));
}

.scene-stack__water {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 34%;
  background: linear-gradient(180deg, rgba(193, 216, 242, 0.56), rgba(126, 166, 219, 0.3) 44%, rgba(244, 248, 252, 0.9));
}

.scene-stack__water::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0 2px, transparent 2px 10px);
  opacity: 0.28;
}

.scene-stack__dock {
  position: absolute;
  left: 20%;
  right: 12%;
  bottom: 12%;
  height: 17%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 44%, rgba(255, 255, 255, 0.94), rgba(219, 231, 245, 0.94) 58%, rgba(170, 193, 223, 0.54) 100%);
  box-shadow: 0 18px 38px rgba(94, 125, 162, 0.16);
}

.scene-stack__dock::before {
  content: '';
  position: absolute;
  inset: 16% 14%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.72);
  opacity: 0.52;
}

.scene-stack__cube {
  position: absolute;
  right: 15%;
  bottom: 19%;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  width: 154px;
  height: 154px;
  padding: 12px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(165, 210, 255, 0.2), rgba(255, 255, 255, 0.16));
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 26px 44px rgba(83, 120, 184, 0.18);
  transform: rotate(-4deg);
  animation: cube-float 8s ease-in-out infinite;
}

.scene-stack__cube::before {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  top: -28px;
  height: 30px;
  clip-path: polygon(12% 100%, 50% 0, 88% 100%);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(188, 221, 255, 0.54));
  opacity: 0.86;
}

.scene-stack__cube::after {
  content: '';
  position: absolute;
  top: 14px;
  right: -28px;
  bottom: 14px;
  width: 28px;
  clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%);
  background: linear-gradient(180deg, rgba(167, 212, 255, 0.52), rgba(110, 170, 247, 0.24));
  opacity: 0.88;
}

.scene-stack__cube-cell {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(148, 203, 255, 0.28));
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.34);
}

.scene-stack__cube-shadow {
  position: absolute;
  right: 14%;
  bottom: 13%;
  width: 176px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(91, 126, 178, 0.22), transparent 72%);
  filter: blur(10px);
}

.scene-stack__control {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(130, 160, 199, 0.42);
  color: rgba(255, 255, 255, 0.96);
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 10px 22px rgba(95, 123, 160, 0.18);
  backdrop-filter: blur(14px);
}

.scene-stack__control--left {
  left: -22px;
  top: 56%;
}

.scene-stack__control--center {
  left: 36%;
  top: 60%;
}

.scene-stack__dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -10px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.scene-stack__dot {
  width: 12px;
  height: 6px;
  border-radius: 999px;
  background: rgba(194, 208, 228, 0.66);
  transition: width 0.2s ease, background 0.2s ease;
}

.scene-stack__dot--active {
  width: 18px;
  background: rgba(255, 255, 255, 0.94);
}

.scene-copy {
  max-width: 560px;
  padding-left: 12px;
}

.scene-copy__chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(144, 170, 198, 0.18);
  color: #62819a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.scene-copy__title {
  margin: 16px 0 0;
  font-size: clamp(36px, 5vw, 52px);
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: #173246;
}

.scene-copy__subtitle {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #62819a;
}

.scene-copy__desc {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #637d8c;
}

.scene-copy__pills {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.scene-copy__pill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(140, 165, 190, 0.16);
  background: rgba(255, 255, 255, 0.72);
  color: #4f6f83;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(83, 109, 143, 0.08);
}

.scene-copy__footer {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7a909d;
}

.scene-copy__sep {
  opacity: 0.55;
}

.login-card {
  position: relative;
  min-height: 620px;
  padding: 34px 34px 28px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(155, 177, 199, 0.18);
  box-shadow:
    0 32px 80px rgba(91, 118, 152, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  overflow: hidden;
}

.login-card__glow {
  position: absolute;
  inset: 14% 12% auto;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(116, 172, 255, 0.26), transparent 72%);
  filter: blur(22px);
  pointer-events: none;
}

.login-card__symbol {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 8px auto 26px;
  filter: drop-shadow(0 18px 28px rgba(86, 129, 214, 0.22));
  animation: icon-float 12s ease-in-out infinite;
}

.login-card__symbol-face,
.login-card__symbol-core {
  position: absolute;
  border-radius: 28px;
}

.login-card__symbol-face--left {
  inset: 12px 30px 16px 10px;
  background: linear-gradient(160deg, #84bcff 0%, #4d82ff 42%, #77cfff 100%);
  transform: rotate(-28deg);
}

.login-card__symbol-face--right {
  inset: 18px 10px 12px 34px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), #9edbff 100%);
  transform: rotate(28deg);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.78);
}

.login-card__symbol-core {
  inset: 34px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(199, 229, 255, 0.9));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.84);
}

.login-card__head {
  position: relative;
  z-index: 1;
  margin-bottom: 22px;
  text-align: center;
}

.login-card__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #7a94a7;
}

.login-card__title {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #173246;
}

.login-card__subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: #7791a0;
}

.login-form {
  position: relative;
  z-index: 1;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-form-item__label) {
  color: #6a8190;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding-bottom: 8px;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 56px;
  padding: 0 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88) !important;
  box-shadow:
    0 10px 24px rgba(83, 109, 143, 0.05),
    0 0 0 1px rgba(154, 176, 196, 0.14) inset !important;
  transition: box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow:
    0 12px 26px rgba(83, 109, 143, 0.08),
    0 0 0 1px rgba(100, 165, 255, 0.24) inset !important;
}

.login-form :deep(.el-input.is-focus .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.98) !important;
  box-shadow:
    0 14px 28px rgba(83, 109, 143, 0.08),
    0 0 0 1px rgba(89, 147, 255, 0.56) inset,
    0 0 0 4px rgba(89, 147, 255, 0.12) !important;
  transform: translateY(-1px);
}

.login-form :deep(.el-input__inner) {
  color: #173246 !important;
  font-size: 14px;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #8ea1b0;
}

.login-form :deep(.el-input__prefix) {
  color: #7c92a3;
  font-size: 15px;
}

.login-form :deep(.el-checkbox__label) {
  color: #68808e;
}

.login-form :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #4581ff;
  border-color: #4581ff;
}

.login-form :deep(.el-link) {
  color: #4f82f6;
}

.login-form__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 18px;
}

.login-btn {
  width: 100%;
  min-height: 56px;
  padding: 0 22px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(90deg, #3e72ff 0%, #39bffd 100%);
  box-shadow: 0 22px 34px rgba(63, 114, 255, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 26px 40px rgba(63, 114, 255, 0.28);
}

.login-btn :deep(.el-button__text) {
  width: 100%;
}

.login-btn__text {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 24px);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-btn__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.login-btn:hover .login-btn__arrow {
  transform: translateX(4px);
}

.login-quick {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.login-quick__label {
  font-size: 12px;
  font-weight: 600;
  color: #7b93a2;
}

.login-quick__tag {
  cursor: pointer;
  min-height: 28px;
  padding-inline: 10px;
  background: rgba(255, 255, 255, 0.86) !important;
  border-color: rgba(150, 173, 194, 0.18) !important;
  color: #507188 !important;
  box-shadow: 0 10px 18px rgba(83, 109, 143, 0.06);
  transition: transform 0.2s ease, background 0.2s ease !important;
}

.login-quick__tag:hover {
  transform: translateY(-1px);
  background: rgba(244, 249, 255, 0.98) !important;
}

.login-card__foot {
  position: relative;
  z-index: 1;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(154, 176, 196, 0.14);
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
}

.login-card__foot-text {
  color: #8a9fad;
}

.login-card__foot :deep(.el-link) {
  color: #4f82f6;
}

@keyframes wash-drift {
  0% {
    transform: translate3d(-1.5%, -1%, 0) scale(1);
  }
  100% {
    transform: translate3d(2%, 2%, 0) scale(1.04);
  }
}

@keyframes halo-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(20px, -14px, 0) scale(1.06);
  }
}

@keyframes raster-drift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(46px, 46px, 0);
  }
}

@keyframes plate-float-back {
  0%,
  100% {
    transform: translateY(-50%) translateX(0) rotate(0deg);
  }
  50% {
    transform: translateY(-50%) translateX(-8px) rotate(-1deg);
  }
}

@keyframes plate-float-mid {
  0%,
  100% {
    transform: translateY(-50%) translateX(0) rotate(0deg);
  }
  50% {
    transform: translateY(-50%) translateX(8px) rotate(1.2deg);
  }
}

@keyframes plate-float-main {
  0%,
  100% {
    transform: translateY(-50%) translateX(0);
  }
  50% {
    transform: translateY(-50%) translateX(10px);
  }
}

@keyframes shine-sweep {
  0%,
  100% {
    transform: translateX(-4%);
    opacity: 0.46;
  }
  50% {
    transform: translateX(4%);
    opacity: 0.76;
  }
}

@keyframes cube-float {
  0%,
  100% {
    transform: rotate(-4deg) translateY(0);
  }
  50% {
    transform: rotate(-2deg) translateY(-10px);
  }
}

@keyframes icon-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (max-width: 1180px) {
  .login-stage {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 392px);
    gap: 30px;
  }

  .scene-stack {
    min-height: 500px;
  }

  .scene-stack__plate--main {
    left: 124px;
    min-width: 380px;
  }

  .scene-stack__plate--soft {
    left: 56px;
  }
}

@media (max-width: 980px) {
  .login-shell {
    padding: 18px;
  }

  .login-stage {
    grid-template-columns: 1fr;
    max-width: 560px;
  }

  .login-scene {
    gap: 18px;
  }

  .scene-stack {
    min-height: 400px;
  }

  .scene-stack__plate--ghost {
    width: 24%;
  }

  .scene-stack__plate--soft {
    left: 46px;
    width: 42%;
  }

  .scene-stack__plate--main {
    left: 96px;
    min-width: 0;
  }

  .scene-stack__cube {
    width: 128px;
    height: 128px;
    right: 14%;
  }

  .scene-copy {
    padding-left: 0;
  }

  .login-card {
    min-height: 0;
  }
}

@media (max-width: 640px) {
  .login-shell {
    padding: 12px;
  }

  .scene-stack {
    min-height: 300px;
  }

  .scene-stack__plate--ghost,
  .scene-stack__plate--soft {
    display: none;
  }

  .scene-stack__plate--main {
    left: 0;
    height: 100%;
    min-width: 0;
    border-radius: 26px;
  }

  .scene-stack__control,
  .scene-stack__dots {
    display: none;
  }

  .scene-stack__cube {
    right: 10%;
    bottom: 18%;
    width: 108px;
    height: 108px;
    gap: 5px;
    padding: 10px;
  }

  .scene-copy__title {
    font-size: 32px;
  }

  .scene-copy__subtitle {
    font-size: 14px;
  }

  .scene-copy__desc {
    font-size: 13px;
  }

  .login-card {
    padding: 28px 20px 22px;
    border-radius: 28px;
  }

  .login-card__title {
    font-size: 26px;
  }

  .login-form__row,
  .login-card__foot {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bg-wash,
  .bg-halo,
  .bg-raster,
  .scene-stack__plate,
  .scene-stack__shine,
  .scene-stack__cube,
  .login-card__symbol {
    animation: none !important;
  }
}
</style>
