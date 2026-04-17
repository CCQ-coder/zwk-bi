import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { chartTypeLabel, isDecorationChartType, isVectorIconChartType, } from '../utils/component-config';
const props = withDefaults(defineProps(), {
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
    data: null,
    dark: false,
    showTitle: false,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['decor-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['text-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['trend-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-shell__stage']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['time-shell__date']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['link-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell']} */ ;
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
    if (__VLS_ctx.chartType === 'iframe_tabs') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-shell__tabs" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__tab frame-shell__tab--active" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__tab" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "frame-shell__tab" },
        });
    }
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
/** @type {__VLS_StyleScopedClasses['frame-shell__tab--active']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__tab']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-shell__tab']} */ ;
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
