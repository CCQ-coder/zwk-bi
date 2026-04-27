/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { chartTypeLabel, isDecorationChartType, isVectorIconChartType, } from '../utils/component-config';
const props = withDefaults(defineProps(), {
    styleConfig: undefined,
    data: null,
    dark: false,
    showTitle: false,
});
const now = ref(new Date());
let clockTimer = null;
onMounted(() => {
    if (props.chartType !== 'clock_display')
        return;
    clockTimer = window.setInterval(() => {
        now.value = new Date();
    }, 1000);
});
onBeforeUnmount(() => {
    if (clockTimer !== null) {
        window.clearInterval(clockTimer);
        clockTimer = null;
    }
});
const titleText = computed(() => props.chartConfig.name || chartTypeLabel(props.chartType));
// Enforce hidden titles for static widgets in preview, per screen design requirement.
const shouldShowTitle = computed(() => false);
const rawRows = computed(() => props.data?.rawRows ?? []);
// ─── iframe ───────────────────────────────────────────────────────────
const activeIframeTab = ref(0);
const IFRAME_URL_FIELDS = ['url', 'URL', 'href', 'link', '链接', '地址', '网址', 'iframeUrl', 'iframe_url'];
const sanitizeUrl = (url) => {
    const trimmed = (url ?? '').trim();
    if (!trimmed)
        return '';
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:')
            return parsed.href;
    }
    catch { /* invalid URL */ }
    return '';
};
const resolveIframeDataUrl = () => {
    const firstRow = rawRows.value[0];
    if (!firstRow)
        return '';
    const columns = props.data?.columns ?? Object.keys(firstRow);
    const preferredFields = Array.from(new Set([
        props.chartConfig.xField,
        ...IFRAME_URL_FIELDS,
    ].filter(Boolean)));
    for (const field of preferredFields) {
        const value = firstRow[field];
        if (value == null)
            continue;
        const sanitized = sanitizeUrl(String(value));
        if (sanitized)
            return sanitized;
    }
    const urlValues = columns
        .map((field) => sanitizeUrl(String(firstRow[field] ?? '')))
        .filter(Boolean);
    return urlValues[0] ?? '';
};
const iframeSingleUrl = computed(() => resolveIframeDataUrl() || sanitizeUrl(props.styleConfig?.iframeUrl ?? ''));
const iframeTabList = computed(() => {
    const tabs = props.styleConfig?.iframeTabs ?? [];
    return tabs.length ? tabs : [];
});
const activeIframeTabUrl = computed(() => {
    const tab = iframeTabList.value[activeIframeTab.value];
    return tab ? sanitizeUrl(tab.url) : '';
});
// ─── text block ───────────────────────────────────────────────────────
const textBlockContent = computed(() => {
    // Priority: data source > static text content > default placeholder
    if (rawRows.value.length) {
        const firstRow = rawRows.value[0];
        // If yField is set, show its value
        if (props.chartConfig.yField && firstRow[props.chartConfig.yField] != null) {
            return String(firstRow[props.chartConfig.yField]);
        }
        // If xField is set, show its value
        if (props.chartConfig.xField && firstRow[props.chartConfig.xField] != null) {
            return String(firstRow[props.chartConfig.xField]);
        }
        // Show first column value
        const cols = props.data?.columns ?? Object.keys(firstRow);
        if (cols.length)
            return String(firstRow[cols[0]] ?? '');
    }
    if (props.styleConfig?.textContent)
        return props.styleConfig.textContent;
    return '本区域适合展示公告、提示信息、模块说明或重点摘要，支持作为独立文字组件进行视觉编排。';
});
const primaryMetric = computed(() => {
    if (props.chartConfig.yField && rawRows.value.length) {
        const values = rawRows.value
            .map((row) => Number(row[props.chartConfig.yField]))
            .filter((value) => Number.isFinite(value));
        if (values.length) {
            return Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(values.reduce((sum, value) => sum + value, 0));
        }
    }
    const seriesValues = (props.data?.series ?? [])
        .flatMap((series) => series.data)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    if (seriesValues.length) {
        return Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(seriesValues.reduce((sum, value) => sum + value, 0));
    }
    return '128,560';
});
const listItems = computed(() => {
    const xField = props.chartConfig.xField;
    const yField = props.chartConfig.yField;
    if (xField && rawRows.value.length) {
        return rawRows.value.slice(0, 5).map((row, index) => ({
            key: `${index}-${String(row[xField] ?? '')}`,
            index: String(index + 1).padStart(2, '0'),
            label: String(row[xField] ?? `项目 ${index + 1}`),
            value: yField ? String(row[yField] ?? '--') : '查看',
        }));
    }
    return [
        { key: '1', index: '01', label: '华北大区', value: '98,120' },
        { key: '2', index: '02', label: '华东大区', value: '87,430' },
        { key: '3', index: '03', label: '华南大区', value: '79,540' },
        { key: '4', index: '04', label: '西南大区', value: '63,210' },
    ];
});
const cloudItems = computed(() => {
    const source = listItems.value.map((item, index) => ({
        word: item.label,
        size: `${28 - index * 3}px`,
        opacity: String(0.92 - index * 0.12),
    }));
    return source.length ? source : [
        { word: '销量', size: '28px', opacity: '0.95' },
        { word: '区域', size: '22px', opacity: '0.8' },
        { word: '订单', size: '18px', opacity: '0.7' },
    ];
});
const trendBars = computed(() => {
    const labels = props.data?.labels?.slice(0, 6) ?? ['1月', '2月', '3月', '4月', '5月', '6月'];
    const series = props.data?.series?.[0]?.data?.slice(0, labels.length) ?? [18, 24, 20, 30, 34, 40];
    const numeric = series.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    const max = Math.max(...numeric, 40);
    return labels.map((label, index) => ({
        key: `${label}-${index}`,
        label: String(label),
        height: `${Math.max(26, Math.round((Number(series[index] ?? 0) / max) * 100))}%`,
    }));
});
const nowDate = computed(() => now.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
const nowTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }));
const qrMatrix = [
    '111000111',
    '101010101',
    '111010111',
    '000111000',
    '110101011',
    '010111010',
    '111010111',
    '101000101',
    '111111111',
];
const qrCells = computed(() => qrMatrix.flatMap((row, rowIndex) => row.split('').map((cell, cellIndex) => ({
    key: `${rowIndex}-${cellIndex}`,
    active: cell === '1',
}))));
const iconMarkup = computed(() => ({
    icon_arrow_trend: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M22 84L48 58L66 74L98 38" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 38H98V58" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_warning_badge: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 16L104 94H16L60 16Z" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><path d="M60 44V66" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><circle cx="60" cy="82" r="5" fill="currentColor"/></svg>',
    icon_location_pin: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 102C76 81 90 67 90 46C90 28 76 16 60 16C44 16 30 28 30 46C30 67 44 81 60 102Z" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><circle cx="60" cy="46" r="10" fill="none" stroke="currentColor" stroke-width="10"/></svg>',
    icon_data_signal: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M18 72C30 72 30 48 42 48C54 48 54 84 66 84C78 84 78 36 90 36C98 36 102 48 102 48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="88" width="84" height="10" rx="5" fill="currentColor" opacity="0.25"/></svg>',
    icon_user_badge: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="10"/><path d="M30 96C34 78 46 68 60 68C74 68 86 78 90 96" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M92 24L100 32L112 20" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_chart_mark: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="64" width="14" height="30" rx="4" fill="currentColor"/><rect x="42" y="48" width="14" height="46" rx="4" fill="currentColor" opacity="0.8"/><rect x="66" y="34" width="14" height="60" rx="4" fill="currentColor" opacity="0.65"/><path d="M18 28H100" stroke="currentColor" stroke-width="10" stroke-linecap="round" opacity="0.22"/></svg>',
    icon_plus: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 30V90" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M30 60H90" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>',
    icon_minus: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M30 60H90" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>',
    icon_search: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="52" r="24" fill="none" stroke="currentColor" stroke-width="10"/><path d="M70 70L92 92" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>',
    icon_focus_frame: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M26 42V26H42" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M94 42V26H78" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 78V94H42" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M94 78V94H78" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_home_badge: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M24 54L60 26L96 54" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 50V92H86V50" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><path d="M50 92V68H70V92" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/></svg>',
    icon_share_nodes: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="34" cy="60" r="10" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="84" cy="34" r="10" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="86" cy="86" r="10" fill="none" stroke="currentColor" stroke-width="8"/><path d="M43 55L75 39" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M44 66L76 81" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_link_chain: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M42 72L32 82C24 90 24 102 32 110C40 118 52 118 60 110L70 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 48L88 38C96 30 96 18 88 10C80 2 68 2 60 10L50 20" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M46 74L74 46" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_message_chat: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M26 30H94V78H54L36 94V78H26Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M42 48H78" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.8"/><path d="M42 62H68" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity="0.5"/></svg>',
    icon_eye_watch: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M14 60C24 42 40 30 60 30C80 30 96 42 106 60C96 78 80 90 60 90C40 90 24 78 14 60Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><circle cx="60" cy="60" r="12" fill="none" stroke="currentColor" stroke-width="8"/></svg>',
    icon_lock_safe: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="52" width="64" height="48" rx="8" fill="none" stroke="currentColor" stroke-width="8"/><path d="M42 52V38C42 28 50 20 60 20C70 20 78 28 78 38V52" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="74" r="6" fill="currentColor"/></svg>',
    icon_bell_notice: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M36 84H84L78 74V52C78 40 70 30 60 30C50 30 42 40 42 52V74L36 84Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M52 92C54 98 58 102 60 102C62 102 66 98 68 92" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M60 18V26" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_user_profile: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="40" r="18" fill="none" stroke="currentColor" stroke-width="8"/><path d="M28 94C34 78 46 68 60 68C74 68 86 78 92 94" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_check_mark: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M26 64L48 86L94 34" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_alert_mark: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" stroke-width="8"/><path d="M60 42V66" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="80" r="5" fill="currentColor"/></svg>',
    icon_close_mark: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M34 34L86 86" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M86 34L34 86" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>',
    icon_settings_gear: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="18" fill="none" stroke="currentColor" stroke-width="8"/><path d="M60 18V30" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M60 90V102" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M18 60H30" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M90 60H102" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M31 31L40 40" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M80 80L89 89" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M89 31L80 40" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M40 80L31 89" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_chevron_double: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M26 32L56 60L26 88" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 32L92 60L62 88" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_orbit_ring: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="22" fill="none" stroke="currentColor" stroke-width="8" opacity="0.9"/><ellipse cx="60" cy="60" rx="40" ry="18" fill="none" stroke="currentColor" stroke-width="8" opacity="0.78" transform="rotate(-18 60 60)"/><ellipse cx="60" cy="60" rx="18" ry="40" fill="none" stroke="currentColor" stroke-width="8" opacity="0.42" transform="rotate(-18 60 60)"/><circle cx="60" cy="60" r="5" fill="currentColor"/></svg>',
    icon_compass_star: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L72 48L102 60L72 72L60 102L48 72L18 60L48 48Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.9"/></svg>',
    icon_database_stack: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="28" rx="30" ry="12" fill="none" stroke="currentColor" stroke-width="8"/><path d="M30 28V80C30 86 43 92 60 92C77 92 90 86 90 80V28" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M30 52C30 58 43 64 60 64C77 64 90 58 90 52" fill="none" stroke="currentColor" stroke-width="8"/><path d="M30 68C30 74 43 80 60 80C77 80 90 74 90 68" fill="none" stroke="currentColor" stroke-width="8"/></svg>',
    icon_shield_guard: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L94 30V56C94 78 80 96 60 104C40 96 26 78 26 56V30L60 18Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M46 60L56 70L78 48" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    icon_lightning_bolt: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M68 16L34 66H58L50 104L86 54H62L68 16Z" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/></svg>',
    icon_globe_grid: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="8"/><path d="M22 60H98" fill="none" stroke="currentColor" stroke-width="8" opacity="0.75"/><path d="M30 40H90" fill="none" stroke="currentColor" stroke-width="8" opacity="0.38"/><path d="M30 80H90" fill="none" stroke="currentColor" stroke-width="8" opacity="0.38"/><path d="M60 22C74 34 80 48 80 60C80 72 74 86 60 98" fill="none" stroke="currentColor" stroke-width="8" opacity="0.65"/><path d="M60 22C46 34 40 48 40 60C40 72 46 86 60 98" fill="none" stroke="currentColor" stroke-width="8" opacity="0.65"/></svg>',
    icon_radar_pulse: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 60L90 34" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M60 22A38 38 0 0 1 98 60" fill="none" stroke="currentColor" stroke-width="8" opacity="0.85" stroke-linecap="round"/><path d="M60 38A22 22 0 0 1 82 60" fill="none" stroke="currentColor" stroke-width="8" opacity="0.5" stroke-linecap="round"/><circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="8" opacity="0.2"/><circle cx="60" cy="60" r="6" fill="currentColor"/></svg>',
    icon_cube_wire: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 18L92 36V82L60 100L28 82V36L60 18Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M28 36L60 54L92 36" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M60 54V100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
    icon_wave_ribbon: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M18 70C28 52 40 46 52 58C64 70 76 76 88 58C96 46 102 42 102 42" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 92C28 74 40 68 52 80C64 92 76 98 88 80C96 68 102 64 102 64" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.52"/></svg>',
}[props.chartType] ?? '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="28" fill="none" stroke="currentColor" stroke-width="10"/></svg>'));
const themeName = computed(() => {
    if (isDecorationChartType(props.chartType))
        return 'decor';
    if (isVectorIconChartType(props.chartType))
        return 'icon';
    return 'text';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    styleConfig: undefined,
    data: null,
    dark: false,
    showTitle: false,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['decor-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--tr']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--bl']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--br']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_glow']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_stream']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_pulse']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_bracket']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_panel']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_panel']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_border_circuit']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_title_plate']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_divider_glow']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_target_ring']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_scan_panel']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell--decor_hex_badge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__tail']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__line']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__sweep']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__edge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell__stage']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell__date']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__tab']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell__trend']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['cloud-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell__axis']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "static-widget" },
    ...{ class: ([`static-widget--${__VLS_ctx.themeName}`, { 'static-widget--dark': __VLS_ctx.dark }]) },
});
if (__VLS_ctx.isDecorationChartType(__VLS_ctx.chartType)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "decor-shell" },
        ...{ class: (`decor-shell--${__VLS_ctx.chartType}`) },
    });
    if (__VLS_ctx.chartType === 'decor_title_plate') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-title-plate" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-title-plate__rail decor-title-plate__rail--left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-title-plate__bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-title-plate__cap decor-title-plate__cap--left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "decor-title-plate__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-title-plate__cap decor-title-plate__cap--right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-title-plate__rail decor-title-plate__rail--right" },
        });
    }
    else if (__VLS_ctx.chartType === 'decor_divider_glow') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-divider__tail decor-divider__tail--left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-divider__line" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-divider__core" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-divider__line" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-divider__tail decor-divider__tail--right" },
        });
    }
    else if (__VLS_ctx.chartType === 'decor_target_ring') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-target" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__cross decor-target__cross--h" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__cross decor-target__cross--v" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__ring decor-target__ring--outer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__ring decor-target__ring--middle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__ring decor-target__ring--inner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-target__dot" },
        });
    }
    else if (__VLS_ctx.chartType === 'decor_scan_panel') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-scan" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-scan__grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-scan__sweep" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "decor-scan__badge" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-scan__edge decor-scan__edge--top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-scan__edge decor-scan__edge--bottom" },
        });
    }
    else if (__VLS_ctx.chartType === 'decor_hex_badge') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-hex" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-hex__halo" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "decor-hex__core" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-hex__inner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "decor-hex__label" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-corner decor-corner--tl" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-corner decor-corner--tr" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-corner decor-corner--bl" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "decor-corner decor-corner--br" },
        });
    }
}
else if (__VLS_ctx.isVectorIconChartType(__VLS_ctx.chartType)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "icon-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "icon-shell__stage" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.iconMarkup) }, null, null);
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "icon-shell__label" },
        });
        (__VLS_ctx.titleText);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "icon-shell__meta" },
        });
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.chartType));
    }
}
else if (__VLS_ctx.chartType === 'clock_display') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "time-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "time-shell__date" },
    });
    (__VLS_ctx.nowDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "time-shell__time" },
    });
    (__VLS_ctx.nowTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "time-shell__meta" },
    });
}
else if (__VLS_ctx.chartType === 'qr_code') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-grid" },
    });
    for (const [cell] of __VLS_getVForSourceType((__VLS_ctx.qrCells))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            key: (cell.key),
            ...{ class: "qr-grid__cell" },
            ...{ class: ({ 'qr-grid__cell--active': cell.active }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-shell__meta" },
    });
}
else if (__VLS_ctx.chartType === 'hyperlink') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "link-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "link-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: "link-shell__url" },
        href: "javascript:void(0)",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "link-shell__hint" },
    });
}
else if (__VLS_ctx.chartType === 'iframe_single' || __VLS_ctx.chartType === 'iframe_tabs') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "frame-shell" },
    });
    if (__VLS_ctx.chartType === 'iframe_tabs' && __VLS_ctx.iframeTabList.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__tabs" },
        });
        for (const [tab, idx] of __VLS_getVForSourceType((__VLS_ctx.iframeTabList))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.isDecorationChartType(__VLS_ctx.chartType)))
                            return;
                        if (!!(__VLS_ctx.isVectorIconChartType(__VLS_ctx.chartType)))
                            return;
                        if (!!(__VLS_ctx.chartType === 'clock_display'))
                            return;
                        if (!!(__VLS_ctx.chartType === 'qr_code'))
                            return;
                        if (!!(__VLS_ctx.chartType === 'hyperlink'))
                            return;
                        if (!(__VLS_ctx.chartType === 'iframe_single' || __VLS_ctx.chartType === 'iframe_tabs'))
                            return;
                        if (!(__VLS_ctx.chartType === 'iframe_tabs' && __VLS_ctx.iframeTabList.length))
                            return;
                        __VLS_ctx.activeIframeTab = idx;
                    } },
                key: (idx),
                ...{ class: "frame-shell__tab" },
                ...{ class: ({ 'frame-shell__tab--active': __VLS_ctx.activeIframeTab === idx }) },
            });
            (tab.label);
        }
        if (__VLS_ctx.activeIframeTabUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe)({
                src: (__VLS_ctx.activeIframeTabUrl),
                ...{ class: "frame-shell__iframe" },
                frameborder: "0",
                allowfullscreen: true,
                sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
                referrerpolicy: "no-referrer",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "frame-shell__placeholder" },
            });
        }
    }
    else if (__VLS_ctx.iframeSingleUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe)({
            src: (__VLS_ctx.iframeSingleUrl),
            ...{ class: "frame-shell__iframe" },
            frameborder: "0",
            allowfullscreen: true,
            sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
            referrerpolicy: "no-referrer",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__address" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__card frame-shell__card--wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__card" },
        });
    }
}
else if (__VLS_ctx.chartType === 'text_block') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-shell__paragraph" },
    });
    (__VLS_ctx.textBlockContent);
}
else if (__VLS_ctx.chartType === 'single_field' || __VLS_ctx.chartType === 'metric_indicator' || __VLS_ctx.chartType === 'number_flipper') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-shell__value" },
        ...{ class: ({ 'metric-shell__value--flipper': __VLS_ctx.chartType === 'number_flipper' }) },
    });
    (__VLS_ctx.primaryMetric);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-shell__trend" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.chartType === 'text_list' || __VLS_ctx.chartType === 'image_list' || __VLS_ctx.chartType === 'table_rank') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "list-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.listItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.key),
            ...{ class: "list-shell__row" },
            ...{ class: ({ 'list-shell__row--media': __VLS_ctx.chartType === 'image_list' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "list-shell__index" },
        });
        (item.index);
        if (__VLS_ctx.chartType === 'image_list') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "list-shell__thumb" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "list-shell__label" },
        });
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "list-shell__value" },
        });
        (item.value);
    }
}
else if (__VLS_ctx.chartType === 'word_cloud') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cloud-shell" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.cloudItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (item.word),
            ...{ class: "cloud-shell__word" },
            ...{ style: ({ fontSize: item.size, opacity: item.opacity }) },
        });
        (item.word);
    }
}
else if (__VLS_ctx.chartType === 'business_trend') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trend-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "trend-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trend-shell__bars" },
    });
    for (const [bar] of __VLS_getVForSourceType((__VLS_ctx.trendBars))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            key: (bar.key),
            ...{ class: "trend-shell__bar" },
            ...{ style: ({ height: bar.height }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "trend-shell__axis" },
    });
    for (const [bar] of __VLS_getVForSourceType((__VLS_ctx.trendBars))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (`${bar.key}-label`),
        });
        (bar.label);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-shell" },
    });
    if (__VLS_ctx.shouldShowTitle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-shell__title" },
        });
        (__VLS_ctx.titleText);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-shell__paragraph" },
    });
    (__VLS_ctx.chartTypeLabel(__VLS_ctx.chartType));
}
/** @type {__VLS_StyleScopedClasses['static-widget']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__rail']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__rail--left']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__bar']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__cap']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__cap--left']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__label']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__cap']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__cap--right']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__rail']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-title-plate__rail--right']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__tail']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__tail--left']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__line']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__core']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__line']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__tail']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-divider__tail--right']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__cross']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__cross--h']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__cross']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__cross--v']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring--outer']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring--middle']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__ring--inner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-target__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__sweep']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__edge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__edge--top']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__edge']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-scan__edge--bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex__halo']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex__core']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-hex__label']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--tl']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--tr']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--bl']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['decor-corner--br']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell__stage']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell__label']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell__date']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell__time']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-grid__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell__url']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell__hint']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__tab']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__iframe']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__iframe']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__bar']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__address']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__body']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__card']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__card']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__card--wide']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__card']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell__paragraph']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell__value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell__trend']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__row']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__index']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__label']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell__value']} */ ;
/** @type {__VLS_StyleScopedClasses['cloud-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['cloud-shell__word']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell__bars']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell__bar']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell__axis']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell__title']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell__paragraph']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartTypeLabel: chartTypeLabel,
            isDecorationChartType: isDecorationChartType,
            isVectorIconChartType: isVectorIconChartType,
            titleText: titleText,
            shouldShowTitle: shouldShowTitle,
            activeIframeTab: activeIframeTab,
            iframeSingleUrl: iframeSingleUrl,
            iframeTabList: iframeTabList,
            activeIframeTabUrl: activeIframeTabUrl,
            textBlockContent: textBlockContent,
            primaryMetric: primaryMetric,
            listItems: listItems,
            cloudItems: cloudItems,
            trendBars: trendBars,
            nowDate: nowDate,
            nowTime: nowTime,
            qrCells: qrCells,
            iconMarkup: iconMarkup,
            themeName: themeName,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
