// 平台基础信息与系统级配置（全前端读写，落地在 localStorage，便于演示与本地定制）
// - 后端目前未提供租户级品牌设置接口，所以这里不调任何 API，避免 404
// - 当后端补上 /api/system/settings 后，可以在这里替换实现而调用方无需改动

export interface PlatformBranding {
  name: string
  slogan: string
  copyright: string
  version: string
}

export interface SecurityPolicy {
  passwordMinLength: number
  passwordRequireMixed: boolean
  loginMaxFailures: number
  loginLockMinutes: number
  sessionTimeoutMinutes: number
}

export interface DataDefaults {
  previewLimit: number
  queryTimeoutSeconds: number
  cacheMinutes: number
  enableQueryCache: boolean
}

export interface PlatformSettings {
  branding: PlatformBranding
  security: SecurityPolicy
  dataDefaults: DataDefaults
  themeMode: 'light' | 'dark' | 'auto'
  primaryColor: string
}

const STORAGE_KEY = 'bi_platform_settings_v1'

export const DEFAULT_BRANDING: PlatformBranding = {
  name: 'AI BI 智能分析平台',
  slogan: '统一接入业务数据 · 构建可视化分析与决策大屏',
  copyright: '© 2026 AI BI Studio',
  version: '1.0.0'
}

export const DEFAULT_SECURITY: SecurityPolicy = {
  passwordMinLength: 8,
  passwordRequireMixed: true,
  loginMaxFailures: 5,
  loginLockMinutes: 15,
  sessionTimeoutMinutes: 120
}

export const DEFAULT_DATA: DataDefaults = {
  previewLimit: 200,
  queryTimeoutSeconds: 30,
  cacheMinutes: 10,
  enableQueryCache: true
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  branding: { ...DEFAULT_BRANDING },
  security: { ...DEFAULT_SECURITY },
  dataDefaults: { ...DEFAULT_DATA },
  themeMode: 'light',
  primaryColor: '#4a7dff'
}

export function getPlatformSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLATFORM_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<PlatformSettings>
    return {
      branding: { ...DEFAULT_BRANDING, ...(parsed.branding ?? {}) },
      security: { ...DEFAULT_SECURITY, ...(parsed.security ?? {}) },
      dataDefaults: { ...DEFAULT_DATA, ...(parsed.dataDefaults ?? {}) },
      themeMode: parsed.themeMode ?? DEFAULT_PLATFORM_SETTINGS.themeMode,
      primaryColor: parsed.primaryColor ?? DEFAULT_PLATFORM_SETTINGS.primaryColor
    }
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS }
  }
}

export function savePlatformSettings(settings: PlatformSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function resetPlatformSettings(): PlatformSettings {
  localStorage.removeItem(STORAGE_KEY)
  return { ...DEFAULT_PLATFORM_SETTINGS }
}

export function getPlatformBranding(): PlatformBranding {
  return getPlatformSettings().branding
}
