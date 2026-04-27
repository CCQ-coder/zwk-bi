<template>
  <div class="login-shell">
    <div class="login-stage">

      <!-- 鈺愨晲鈺?Left: scene panel 鈺愨晲鈺?-->
      <div class="scene-panel">
        <!-- Rotating gradient backgrounds -->
        <div class="scene-slides" aria-hidden="true">
          <div
            v-for="(grad, i) in sceneGradients"
            :key="i"
            class="scene-slide"
            :class="{ active: i === currentBg }"
            :style="{ background: grad }"
          ></div>
        </div>

        <!-- Mountain silhouettes -->
        <div class="scene-mtn scene-mtn--far" aria-hidden="true"></div>
        <div class="scene-mtn scene-mtn--pine" aria-hidden="true"></div>
        <div class="scene-mtn scene-mtn--near" aria-hidden="true"></div>

        <!-- Lake -->
        <div class="scene-lake" aria-hidden="true">
          <div class="scene-lake__lines"></div>
        </div>

        <!-- Overlay -->
        <div class="scene-overlay" aria-hidden="true"></div>

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
            <h1 class="scene-title">{{ platformName }}</h1>
            <p class="scene-sub">{{ platformSlogan }}</p>
          </div>

          <div class="scene-spacer"></div>

          <!-- Feature list -->
          <div class="scene-features">
            <div class="feat">
              <span class="feat__dot" aria-hidden="true"></span>
              <div>
                <p class="feat__title">澶氱淮鍒嗘瀽</p>
                <p class="feat__desc">澶氭暟鎹簮鎺ュ叆锛屾礊瀵熶笟鍔¤秼鍔?/p>
              </div>
            </div>
            <div class="feat">
              <span class="feat__dot feat__dot--violet" aria-hidden="true"></span>
              <div>
                <p class="feat__title">鍙鍖栫湅鏉?/p>
                <p class="feat__desc">涓板瘜鍥捐〃缁勪欢锛岀洿瑙傚憟鐜版暟鎹?/p>
              </div>
            </div>
            <div class="feat">
              <span class="feat__dot feat__dot--sky" aria-hidden="true"></span>
              <div>
                <p class="feat__title">瀹夊叏鍙潬</p>
                <p class="feat__desc">浼佷笟绾ф潈闄愮鐞嗕笌鏁版嵁闅旂</p>
              </div>
            </div>
          </div>

          <footer class="scene-ft">
            <span class="scene-copy-text">{{ copyright }}</span>
            <nav class="scene-nav" aria-label="鍒囨崲鑳屾櫙">
              <button type="button" class="scene-nav__btn" aria-label="涓婁竴寮? @click="prevBg">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                  <path d="M6 1 2 6l4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div class="scene-dots" role="group" aria-label="鑳屾櫙閫夋嫨">
                <button
                  v-for="i in sceneGradients.length"
                  :key="i"
                  type="button"
                  class="scene-dot"
                  :class="{ 'scene-dot--on': (i - 1) === currentBg }"
                  :aria-label="`绗?{i}寮燻"
                  @click="goToBg(i - 1)"
                ></button>
              </div>
              <button type="button" class="scene-nav__btn" aria-label="涓嬩竴寮? @click="nextBg">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                  <path d="M2 1l4 5-4 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </nav>
          </footer>
        </div>
      </div>

      <!-- 鈺愨晲鈺?Right: login panel 鈺愨晲鈺?-->
      <section class="auth-panel" aria-label="鐧诲綍">
        <div class="auth-logo" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="14" fill="#EEF4FF"/>
            <path d="M22 8l11 6.35v12.7L22 34 11 27.05V14.35L22 8z" fill="none" stroke="#2563EB" stroke-width="1.8"/>
            <path d="M22 14l6 3.46v6.92L22 27.5l-6-3.12V17.46L22 14z" fill="rgba(59,130,246,0.18)"/>
            <circle cx="22" cy="22" r="3.5" fill="#2563EB"/>
          </svg>
        </div>

        <div class="auth-head">
          <h2 class="auth-title">娆㈣繋鍥炴潵</h2>
          <p class="auth-sub">璇风櫥褰曟偍鐨勮处鍙?/p>
        </div>

        <el-form
          ref="formRef"
          class="auth-form"
          :model="loginForm"
          :rules="rules"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <label for="f-user" class="sr-only">璐﹀彿</label>
            <el-input
              id="f-user"
              v-model="loginForm.username"
              size="large"
              placeholder="璇疯緭鍏ヨ处鍙?
              :prefix-icon="User"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item prop="password">
            <label for="f-pass" class="sr-only">瀵嗙爜</label>
            <el-input
              id="f-pass"
              v-model="loginForm.password"
              type="password"
              size="large"
              placeholder="璇疯緭鍏ュ瘑鐮?
              show-password
              :prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="auth-row">
            <el-checkbox v-model="rememberUser">璁颁綇鎴?/el-checkbox>
            <el-link type="primary" underline="never" @click="onForgotPwd">蹇樿瀵嗙爜锛?/el-link>
          </div>

          <el-button
            type="primary"
            size="large"
            class="auth-btn"
            :loading="loading"
            @click="handleLogin"
          >
            <span class="auth-btn__label">{{ loading ? '鐧诲綍涓€? : '鐧?褰? }}</span>
            <span v-if="!loading" class="auth-btn__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12M15 9l-4-5M15 9l-4 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </el-button>

          <div class="auth-or" aria-hidden="true">
            <span></span><span class="auth-or__text">鎴?/span><span></span>
          </div>

          <button type="button" class="sso-btn" @click="onSSO">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ElMessageBox.alert('SSO 单点登录功能正在配置中，请使用账号密码登录。', 'SSO 登录', {
          </button>

          <div v-if="quickAccounts.length" class="auth-quick">
            <span class="auth-quick__label">蹇€熻瘯鐢細</span>
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

// 鈹€鈹€鈹€ Background rotation 鈹€鈹€鈹€
const sceneGradients = [
  // Dawn: warm pink-peach horizon over cool blue sky
  'linear-gradient(180deg, #8faed2 0%, #aac4df 18%, #c6d9ed 35%, #dce8f3 48%, #eeddd0 60%, #ecc898 72%, #e0a85a 85%, #cc8830 100%)',
  // Midday alpine: vivid blue sky, bright
  'linear-gradient(180deg, #1858a8 0%, #2878cc 20%, #4898de 40%, #6eb4ea 58%, #96ccf4 74%, #bce0fa 88%, #d8eef8 100%)',
  // Clear afternoon: deep blue to light sky
  'linear-gradient(180deg, #1e5eaa 0%, #3278c8 18%, #5298e0 38%, #7ab8f0 55%, #a2d0f8 72%, #c4e4fc 88%, #daf0fc 100%)',
  // Dusk: violet-blue to golden glow
  'linear-gradient(180deg, #4a5aa8 0%, #7878b8 16%, #a888a8 30%, #c8a088 48%, #dcb860 62%, #d8a840 76%, #c09030 90%, #a07820 100%)',
]
const currentBg = ref(0)
let bgTimer: ReturnType<typeof setInterval> | null = null

const goToBg = (i: number) => {
  currentBg.value = ((i % sceneGradients.length) + sceneGradients.length) % sceneGradients.length
}
const nextBg = () => goToBg(currentBg.value + 1)
const prevBg = () => goToBg(currentBg.value - 1)
// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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
    ElMessage.success(`娆㈣繋鍥炴潵锛?{result.displayName || result.username}`)
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
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #d8e8f4;
  font-family: 'Fira Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 鈹€鈹€鈹€ Main stage 鈹€鈹€鈹€ */
.login-stage {
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
  transition: opacity 1.4s ease;
}

.scene-slide.active {
  opacity: 1;
}

/* 鈹€鈹€鈹€ Mountain silhouettes 鈹€鈹€鈹€ */
.scene-mtn {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

/* Far peaks 鈥?snowy, blue-grey tones */
.scene-mtn--far {
  bottom: 30%;
  height: 32%;
  background: linear-gradient(180deg, rgba(210, 228, 248, 0.82) 0%, rgba(180, 206, 232, 0.6) 100%);
  clip-path: polygon(
    0% 100%, 0% 56%, 7% 34%, 16% 12%, 24% 4%,
    32% 20%, 40% 5%, 49% 22%, 57% 2%, 66% 17%,
    74% 30%, 82% 11%, 90% 28%, 95% 44%, 100% 38%, 100% 100%
  );
  z-index: 2;
}

/* Snow cap highlight */
.scene-mtn--far::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(240, 248, 255, 0.72);
  clip-path: polygon(
    22% 100%, 22% 62%, 24% 40%, 27% 22%, 31% 4%, 34% 20%, 38% 40%, 43% 55%, 48% 32%, 51% 8%,
    54% 28%, 58% 44%, 64% 60%, 72% 34%, 76% 14%, 80% 34%, 86% 52%, 91% 66%, 100% 100%
  );
  opacity: 0.58;
}

/* Pine forest treeline */
.scene-mtn--pine {
  bottom: 26%;
  height: 26%;
  background: rgba(32, 56, 40, 0.78);
  clip-path: polygon(
    0% 100%, 0% 72%, 4% 56%, 8% 66%, 12% 50%, 17% 62%, 21% 44%, 26% 56%,
    30% 40%, 34% 52%, 38% 36%, 42% 48%, 46% 32%, 50% 24%, 54% 36%, 58% 22%,
    62% 34%, 66% 20%, 70% 32%, 74% 18%, 78% 30%, 82% 16%, 86% 28%, 90% 42%,
    94% 56%, 97% 66%, 100% 72%, 100% 100%
  );
  z-index: 3;
}

/* Near foreground shore */
.scene-mtn--near {
  bottom: 24%;
  height: 12%;
  background: rgba(22, 44, 30, 0.88);
  clip-path: polygon(
    0% 100%, 0% 62%, 8% 44%, 18% 28%, 30% 14%,
    44% 6%, 56% 14%, 68% 28%, 80% 44%, 90% 62%, 100% 74%, 100% 100%
  );
  z-index: 4;
}

/* 鈹€鈹€鈹€ Lake 鈹€鈹€鈹€ */
.scene-lake {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 26%;
  background: linear-gradient(
    180deg,
    rgba(50, 90, 155, 0.58) 0%,
    rgba(40, 75, 140, 0.72) 40%,
    rgba(30, 62, 120, 0.84) 100%
  );
  z-index: 5;
}

.scene-lake__lines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0,
    rgba(255, 255, 255, 0.08) 1px,
    transparent 1px,
    transparent 9px
  );
}

/* 鈹€鈹€鈹€ Overlay 鈹€鈹€鈹€ */
.scene-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  background:
    linear-gradient(180deg, rgba(0, 18, 50, 0.16) 0%, transparent 42%),
    linear-gradient(0deg, rgba(0, 14, 40, 0.18) 0%, transparent 36%);
  pointer-events: none;
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
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.32);
}

.scene-hero {
  margin-top: 22px;
  flex-shrink: 0;
}

.scene-title {
  font-size: clamp(24px, 2.8vw, 34px);
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.15;
  text-shadow: 0 2px 14px rgba(0, 20, 60, 0.35);
  margin: 0;
}

.scene-sub {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.84);
  text-shadow: 0 1px 6px rgba(0, 20, 60, 0.28);
}

.scene-spacer { flex: 1; }

/* Feature list */
.scene-features {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex-shrink: 0;
  margin-bottom: 18px;
}

.feat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feat__dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  border-radius: 50%;
  background: #60a5fa;
  flex-shrink: 0;
}

.feat__dot--violet { background: #a78bfa; }
.feat__dot--sky    { background: #38bdf8; }

.feat__title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.96);
  margin: 0 0 2px;
  line-height: 1.2;
}

.feat__desc {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.5;
}

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
  color: rgba(255, 255, 255, 0.6);
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
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.13);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition: background 0.2s ease;
  appearance: none;
}

.scene-nav__btn:hover { background: rgba(255, 255, 255, 0.26); }
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
  background: rgba(255, 255, 255, 0.36);
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

@media (prefers-reduced-motion: reduce) {
  .scene-slide { transition: none !important; }
  .auth-btn, .sso-btn, .scene-nav__btn, .scene-dot, .auth-quick__tag,
  .auth-form :deep(.el-input__wrapper) { transition: none !important; }
  .auth-btn:hover, .sso-btn:hover, .auth-btn:hover .auth-btn__icon { transform: none !important; }
}
</style>



