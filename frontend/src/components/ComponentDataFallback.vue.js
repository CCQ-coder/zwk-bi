import { computed } from 'vue';
import { chartTypeLabel } from '../utils/component-config';
const props = withDefaults(defineProps(), {
    data: null,
    dark: false,
});
const formatNumber = (value) => {
    const abs = Math.abs(value);
    if (abs >= 100000000)
        return `${(value / 100000000).toFixed(1)}亿`;
    if (abs >= 10000)
        return `${(value / 10000).toFixed(1)}万`;
    if (Number.isInteger(value))
        return String(value);
    return value.toFixed(2);
};
const rawRows = computed(() => props.data?.rawRows ?? []);
const rowCount = computed(() => rawRows.value.length || props.data?.labels.length || 0);
const summaryMetric = computed(() => {
    if (rawRows.value.length && props.chartConfig.yField) {
        const values = rawRows.value
            .map((row) => Number(row[props.chartConfig.yField]))
            .filter((value) => Number.isFinite(value));
        if (values.length) {
            return values.reduce((sum, value) => sum + value, 0);
        }
    }
    const values = (props.data?.series ?? [])
        .flatMap((series) => series.data)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
    if (!values.length)
        return null;
    return values.reduce((sum, value) => sum + value, 0);
});
const formattedSummaryMetricValue = computed(() => (summaryMetric.value == null ? '' : formatNumber(summaryMetric.value)));
const summaryMetricLabel = computed(() => props.chartConfig.yField || '汇总值');
const topItems = computed(() => {
    const buckets = new Map();
    if (rawRows.value.length && props.chartConfig.xField) {
        rawRows.value.forEach((row) => {
            const label = String(row[props.chartConfig.xField] ?? '').trim();
            if (!label)
                return;
            const numericValue = props.chartConfig.yField ? Number(row[props.chartConfig.yField]) : Number.NaN;
            const nextValue = Number.isFinite(numericValue)
                ? (buckets.get(label) ?? 0) + numericValue
                : (buckets.get(label) ?? 0) + 1;
            buckets.set(label, nextValue);
        });
    }
    else if (props.data?.labels.length) {
        const baseSeries = props.data.series[0];
        props.data.labels.forEach((label, index) => {
            const numericValue = Number(baseSeries?.data[index] ?? 0);
            buckets.set(String(label), Number.isFinite(numericValue) ? numericValue : 0);
        });
    }
    const ranked = Array.from(buckets.entries())
        .map(([label, value]) => ({ label, value }))
        .filter((item) => item.label)
        .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
        .slice(0, 6);
    const maxValue = Math.max(...ranked.map((item) => Math.abs(item.value)), 1);
    return ranked.map((item) => ({
        label: item.label,
        value: item.value,
        displayValue: formatNumber(item.value),
        percent: Math.max(8, Math.round((Math.abs(item.value) / maxValue) * 100)),
    }));
});
const groupValues = computed(() => {
    if (!props.chartConfig.groupField || !rawRows.value.length)
        return [];
    const values = new Set();
    rawRows.value.forEach((row) => {
        const value = row[props.chartConfig.groupField];
        if (value == null)
            return;
        const normalized = String(value).trim();
        if (normalized)
            values.add(normalized);
    });
    return Array.from(values).slice(0, 6);
});
const listTitle = computed(() => {
    if (props.chartType === 'map')
        return '区域概览';
    if (props.chartType === 'bar_horizontal_range')
        return '区间概览';
    return '数据概览';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    data: null,
    dark: false,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['fallback-metric']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-list']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-value']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-widget--dark']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fallback-widget" },
    ...{ class: ({ 'fallback-widget--dark': __VLS_ctx.dark }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fallback-metrics" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fallback-metric" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "fallback-metric-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
    ...{ class: "fallback-metric-value" },
});
(__VLS_ctx.chartTypeLabel(__VLS_ctx.chartType));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fallback-metric" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "fallback-metric-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
    ...{ class: "fallback-metric-value" },
});
(__VLS_ctx.rowCount);
if (__VLS_ctx.formattedSummaryMetricValue) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fallback-metric" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "fallback-metric-label" },
    });
    (__VLS_ctx.summaryMetricLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
        ...{ class: "fallback-metric-value" },
    });
    (__VLS_ctx.formattedSummaryMetricValue);
}
if (__VLS_ctx.topItems.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fallback-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fallback-list-title" },
    });
    (__VLS_ctx.listTitle);
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.label),
            ...{ class: "fallback-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fallback-row-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fallback-row-label" },
        });
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "fallback-row-value" },
        });
        (item.displayValue);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fallback-row-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "fallback-row-bar-fill" },
            ...{ style: ({ width: `${item.percent}%` }) },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fallback-empty" },
    });
}
if (__VLS_ctx.groupValues.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "fallback-tags" },
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groupValues))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (group),
            ...{ class: "fallback-tag" },
        });
        (group);
    }
}
/** @type {__VLS_StyleScopedClasses['fallback-widget']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metrics']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-list']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-head']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-label']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-value']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-row-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['fallback-tag']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartTypeLabel: chartTypeLabel,
            rowCount: rowCount,
            formattedSummaryMetricValue: formattedSummaryMetricValue,
            summaryMetricLabel: summaryMetricLabel,
            topItems: topItems,
            groupValues: groupValues,
            listTitle: listTitle,
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
