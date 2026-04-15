const DEFAULT_ALLOWED_ROLES = ['ADMIN', 'ANALYST'];
export const SCREEN_CANVAS_PRESETS = [
    { id: 'hd', label: '1366 x 768', width: 1366, height: 768 },
    { id: 'fhd', label: '1920 x 1080', width: 1920, height: 1080 },
    { id: '2k', label: '2560 x 1440', width: 2560, height: 1440 },
    { id: '4k', label: '3840 x 2160', width: 3840, height: 2160 },
];
const DEFAULT_SCREEN_CANVAS = { width: 1920, height: 1080 };
const DEFAULT_DASHBOARD_CANVAS = { width: 1440, height: 900 };
export const parseReportConfig = (configJson) => {
    if (!configJson) {
        return {};
    }
    try {
        return JSON.parse(configJson);
    }
    catch {
        return {};
    }
};
export const normalizeCanvasConfig = (canvas, scene = 'dashboard') => {
    const defaults = scene === 'screen' ? DEFAULT_SCREEN_CANVAS : DEFAULT_DASHBOARD_CANVAS;
    const parsedWidth = Number(canvas?.width ?? defaults.width);
    const parsedHeight = Number(canvas?.height ?? defaults.height);
    const width = Number.isFinite(parsedWidth) ? Math.max(960, Math.round(parsedWidth)) : defaults.width;
    const height = Number.isFinite(parsedHeight) ? Math.max(540, Math.round(parsedHeight)) : defaults.height;
    return { width, height, overlay: canvas?.overlay };
};
export const buildReportConfig = (originalConfigJson, scene, publishPatch, canvasPatch) => {
    const config = parseReportConfig(originalConfigJson);
    const currentPublish = normalizePublishConfig(config.publish);
    const nextPublish = publishPatch ? normalizePublishConfig({ ...currentPublish, ...publishPatch }) : currentPublish;
    const currentCanvas = normalizeCanvasConfig(config.canvas, scene);
    const nextCanvas = canvasPatch
        ? normalizeCanvasConfig({ ...currentCanvas, ...canvasPatch }, scene)
        : currentCanvas;
    return JSON.stringify({
        ...config,
        scene,
        publish: nextPublish,
        canvas: nextCanvas,
    });
};
export const normalizePublishConfig = (publish) => ({
    status: publish?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    shareToken: publish?.shareToken || generateShareToken(),
    allowedRoles: Array.isArray(publish?.allowedRoles) && publish.allowedRoles.length ? publish.allowedRoles : [...DEFAULT_ALLOWED_ROLES],
    allowAnonymousAccess: publish?.allowAnonymousAccess ?? true,
    publishedAt: publish?.publishedAt,
});
export const generateShareToken = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};
export const buildPublishedLink = (scene, id, shareToken) => `${window.location.origin}/preview/${scene}/${id}?token=${encodeURIComponent(shareToken)}`;
export const canAccessPublishedReport = (options) => {
    const config = parseReportConfig(options.configJson);
    const publish = normalizePublishConfig(config.publish);
    if (options.hasSession) {
        if (!options.localRole) {
            return { allowed: true, reason: '' };
        }
        if (!publish.allowedRoles.length || publish.allowedRoles.includes(options.localRole)) {
            return { allowed: true, reason: '' };
        }
        if (publish.status === 'PUBLISHED' && options.token === publish.shareToken) {
            return { allowed: true, reason: '' };
        }
        return { allowed: false, reason: '当前账号不在该报告的发布权限范围内' };
    }
    if (publish.status !== 'PUBLISHED') {
        return { allowed: false, reason: '该报告尚未发布' };
    }
    if (!publish.allowAnonymousAccess) {
        return { allowed: false, reason: '该报告仅允许登录后访问' };
    }
    if (options.token !== publish.shareToken) {
        return { allowed: false, reason: '分享链接无效或已失效' };
    }
    return { allowed: true, reason: '' };
};
