export type PublishStatus = 'DRAFT' | 'PUBLISHED'

export interface ReportPublishConfig {
  status: PublishStatus
  shareToken: string
  allowedRoles: string[]
  allowAnonymousAccess: boolean
  publishedAt?: string
}

export interface CanvasOverlay {
  show: boolean
  bgColor: string
  opacity: number
  x: number
  y: number
  w: number
  h: number
  bgType?: 'solid' | 'gradient' | 'image'
  gradientStart?: string
  gradientEnd?: string
  gradientAngle?: number
  bgImage?: string
}

export interface ReportCanvasConfig {
  width: number
  height: number
  overlay?: CanvasOverlay
}

export interface ReportCanvasPreset extends ReportCanvasConfig {
  id: string
  label: string
}

export interface ReportConfig {
  scene?: string
  publish?: ReportPublishConfig
  canvas?: ReportCanvasConfig
}

const DEFAULT_ALLOWED_ROLES = ['ADMIN', 'ANALYST']

export const SCREEN_CANVAS_PRESETS: ReportCanvasPreset[] = [
  { id: 'hd', label: '1366 x 768', width: 1366, height: 768 },
  { id: 'fhd', label: '1920 x 1080', width: 1920, height: 1080 },
  { id: '2k', label: '2560 x 1440', width: 2560, height: 1440 },
  { id: '4k', label: '3840 x 2160', width: 3840, height: 2160 },
]

const DEFAULT_SCREEN_CANVAS: ReportCanvasConfig = { width: 1920, height: 1080 }
const DEFAULT_DASHBOARD_CANVAS: ReportCanvasConfig = { width: 1440, height: 900 }

export const parseReportConfig = (configJson?: string | null): ReportConfig => {
  if (!configJson) {
    return {}
  }
  try {
    return JSON.parse(configJson) as ReportConfig
  } catch {
    return {}
  }
}

export const normalizeCanvasConfig = (
  canvas?: Partial<ReportCanvasConfig>,
  scene: 'dashboard' | 'screen' = 'dashboard'
): ReportCanvasConfig => {
  const defaults = scene === 'screen' ? DEFAULT_SCREEN_CANVAS : DEFAULT_DASHBOARD_CANVAS
  const parsedWidth = Number(canvas?.width ?? defaults.width)
  const parsedHeight = Number(canvas?.height ?? defaults.height)
  const width = Number.isFinite(parsedWidth) ? Math.max(960, Math.round(parsedWidth)) : defaults.width
  const height = Number.isFinite(parsedHeight) ? Math.max(540, Math.round(parsedHeight)) : defaults.height
  return { width, height, overlay: canvas?.overlay }
}

export const buildReportConfig = (
  originalConfigJson: string | null | undefined,
  scene: 'dashboard' | 'screen',
  publishPatch?: Partial<ReportPublishConfig>,
  canvasPatch?: Partial<ReportCanvasConfig>
) => {
  const config = parseReportConfig(originalConfigJson)
  const currentPublish = normalizePublishConfig(config.publish)
  const nextPublish = publishPatch ? normalizePublishConfig({ ...currentPublish, ...publishPatch }) : currentPublish
  const currentCanvas = normalizeCanvasConfig(config.canvas, scene)
  const nextCanvas = canvasPatch
    ? normalizeCanvasConfig({ ...currentCanvas, ...canvasPatch }, scene)
    : currentCanvas
  return JSON.stringify({
    ...config,
    scene,
    publish: nextPublish,
    canvas: nextCanvas,
  })
}

export const normalizePublishConfig = (publish?: Partial<ReportPublishConfig>): ReportPublishConfig => ({
  status: publish?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
  shareToken: publish?.shareToken || generateShareToken(),
  allowedRoles: Array.isArray(publish?.allowedRoles) && publish.allowedRoles.length ? publish.allowedRoles : [...DEFAULT_ALLOWED_ROLES],
  allowAnonymousAccess: publish?.allowAnonymousAccess ?? true,
  publishedAt: publish?.publishedAt,
})

export const generateShareToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export const buildPublishedLink = (scene: 'dashboard' | 'screen', id: number, shareToken: string) =>
  `${window.location.origin}/preview/${scene}/${id}?token=${encodeURIComponent(shareToken)}`

export const canAccessPublishedReport = (options: {
  configJson?: string | null
  localRole?: string | null
  hasSession?: boolean
  token?: string | null
}) => {
  const config = parseReportConfig(options.configJson)
  const publish = normalizePublishConfig(config.publish)

  if (options.hasSession) {
    if (!options.localRole) {
      return { allowed: true, reason: '' }
    }
    if (!publish.allowedRoles.length || publish.allowedRoles.includes(options.localRole)) {
      return { allowed: true, reason: '' }
    }
    if (publish.status === 'PUBLISHED' && options.token === publish.shareToken) {
      return { allowed: true, reason: '' }
    }
    return { allowed: false, reason: '当前账号不在该报告的发布权限范围内' }
  }

  if (publish.status !== 'PUBLISHED') {
    return { allowed: false, reason: '该报告尚未发布' }
  }
  if (!publish.allowAnonymousAccess) {
    return { allowed: false, reason: '该报告仅允许登录后访问' }
  }
  if (options.token !== publish.shareToken) {
    return { allowed: false, reason: '分享链接无效或已失效' }
  }
  return { allowed: true, reason: '' }
}