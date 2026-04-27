/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import ComponentDataFallback from './ComponentDataFallback.vue';
import { DEFAULT_COMPONENT_STYLE, buildComponentOption, chartTypeLabel, getChartTypeMeta, isCanvasRenderableChartType, materializeChartData, postProcessChartOption, } from '../utils/component-config';
import { echarts } from '../utils/echarts';
const props = defineProps();
const TABLE_PREVIEW_TYPES = new Set(['table', 'table_summary', 'table_pivot', 'table_rank']);
const GROUP_PREVIEW_TYPES = new Set([
    'bar_stack',
    'bar_percent',
    'bar_group',
    'bar_group_stack',
    'bar_horizontal_stack',
    'bar_horizontal_percent',
    'bar_horizontal_symmetric',
    'bar_combo',
    'bar_combo_group',
    'bar_combo_stack',
    'line_stack',
    'scatter',
    'radar',
    'heatmap',
]);
const chartRef = ref(null);
let chartInstance = null;
const previewChartConfig = computed(() => {
    const next = {
        ...props.chartConfig,
        name: props.chartConfig.name || chartTypeLabel(props.chartConfig.chartType || 'bar'),
        chartType: props.chartConfig.chartType || 'bar',
        xField: props.chartConfig.xField || '',
        yField: props.chartConfig.yField || '',
        groupField: props.chartConfig.groupField || '',
    };
    const meta = getChartTypeMeta(next.chartType);
    if (!next.xField && (meta.requiresDimension || meta.allowsOptionalDimension || next.chartType === 'filter_button' || TABLE_PREVIEW_TYPES.has(next.chartType))) {
        next.xField = next.chartType === 'scatter' ? 'xValue' : 'category';
    }
    if (!next.yField && (meta.requiresMetric || TABLE_PREVIEW_TYPES.has(next.chartType))) {
        next.yField = next.chartType === 'scatter' ? 'yValue' : 'value';
    }
    if (!next.groupField && GROUP_PREVIEW_TYPES.has(next.chartType)) {
        next.groupField = next.chartType === 'heatmap' ? 'band' : 'series';
    }
    if (next.chartType === 'gauge' && !next.xField) {
        next.xField = 'label';
    }
    return next;
});
const previewStyle = computed(() => ({
    ...DEFAULT_COMPONENT_STYLE,
    ...(props.styleConfig ?? {}),
    bgColor: 'rgba(0,0,0,0)',
    showTitle: false,
}));
const previewRows = computed(() => buildPreviewRows(previewChartConfig.value));
const previewColumns = computed(() => Object.keys(previewRows.value[0] ?? {}));
const previewData = computed(() => materializeChartData(previewRows.value, previewColumns.value, previewChartConfig.value));
const previewMode = computed(() => {
    const type = previewChartConfig.value.chartType;
    if (TABLE_PREVIEW_TYPES.has(type))
        return 'table';
    if (type === 'filter_button')
        return 'filter';
    if (!isCanvasRenderableChartType(type))
        return 'fallback';
    if (!getChartTypeMeta(type).stablePreview || type === 'map')
        return 'fallback';
    return 'chart';
});
const tableColumns = computed(() => previewColumns.value.slice(0, 4));
const tableRows = computed(() => previewRows.value.slice(0, 4));
const filterOptions = computed(() => {
    const field = previewChartConfig.value.xField;
    if (!field)
        return [];
    return Array.from(new Set(previewRows.value.map((row) => String(row[field] ?? '')).filter(Boolean))).slice(0, 5);
});
const disposeChart = () => {
    if (!chartInstance)
        return;
    chartInstance.dispose();
    chartInstance = null;
};
const renderChart = async () => {
    if (previewMode.value !== 'chart') {
        disposeChart();
        return;
    }
    await nextTick();
    if (!chartRef.value)
        return;
    if (!chartInstance) {
        chartInstance = echarts.init(chartRef.value);
    }
    const option = buildComponentOption(previewData.value, previewChartConfig.value, previewStyle.value);
    postProcessChartOption(option, previewStyle.value, previewChartConfig.value.name);
    option.animation = false;
    chartInstance.setOption(option, true);
    chartInstance.resize();
};
watch([previewMode, previewData, previewChartConfig, previewStyle], renderChart, { deep: true, immediate: true });
onBeforeUnmount(() => {
    disposeChart();
});
function buildPreviewRows(chartConfig) {
    const dimensionField = chartConfig.xField || 'category';
    const metricField = chartConfig.yField || 'value';
    const groupField = chartConfig.groupField || 'series';
    const categories = ['华东', '华南', '华北', '华中', '西南', '东北'];
    const metricValues = [126, 168, 142, 195, 171, 214];
    const compareValues = [82, 116, 101, 148, 133, 162];
    const tertiaryValues = [64, 88, 79, 110, 98, 126];
    if (chartConfig.chartType === 'gauge') {
        return [{ [chartConfig.xField || 'label']: '达成率', [metricField]: 78 }];
    }
    if (chartConfig.chartType === 'scatter') {
        const points = [[14, 34], [22, 48], [28, 40], [36, 64], [44, 58], [52, 78]];
        return points.map(([x, y], index) => ({
            [dimensionField]: x,
            [metricField]: y,
            ...(chartConfig.groupField ? { [groupField]: index % 2 === 0 ? '计划' : '实际' } : {}),
        }));
    }
    if (chartConfig.chartType === 'heatmap') {
        const bands = ['周一', '周三', '周五'];
        return categories.slice(0, 4).flatMap((category, categoryIndex) => (bands.map((band, bandIndex) => ({
            [dimensionField]: category,
            [groupField]: band,
            [metricField]: 42 + categoryIndex * 18 + bandIndex * 11,
        }))));
    }
    if (TABLE_PREVIEW_TYPES.has(chartConfig.chartType)) {
        return categories.slice(0, 5).map((category, index) => ({
            [dimensionField]: category,
            [metricField]: metricValues[index],
            状态: index % 2 === 0 ? '正常' : '关注',
            同比: `${index % 2 === 0 ? '+' : '-'}${8 + index}%`,
        }));
    }
    if (chartConfig.chartType === 'filter_button') {
        return ['全部', '重点区域', '增长中', '预警中', '已完成'].map((item, index) => ({
            [dimensionField]: item,
            [metricField]: index + 1,
        }));
    }
    if (chartConfig.groupField) {
        const groups = ['计划', '实际', '预测'];
        const seriesValues = [metricValues, compareValues, tertiaryValues];
        return categories.map((category, index) => groups.map((groupName, groupIndex) => ({
            [dimensionField]: category,
            [metricField]: seriesValues[groupIndex][index],
            [groupField]: groupName,
        }))).flat();
    }
    return categories.map((category, index) => ({
        [dimensionField]: category,
        [metricField]: metricValues[index],
    }));
}
function formatCell(value) {
    if (value == null)
        return '--';
    if (typeof value === 'number')
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return String(value);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['template-preview-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-table']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-filter']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "template-preview-shell" },
});
if (__VLS_ctx.previewMode === 'chart') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "chartRef",
        ...{ class: "template-preview-chart" },
    });
    /** @type {typeof __VLS_ctx.chartRef} */ ;
}
else if (__VLS_ctx.previewMode === 'table') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview-table-head" },
    });
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.tableColumns))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (column),
            ...{ class: "template-preview-cell template-preview-cell--head" },
        });
        (column);
    }
    for (const [row, index] of __VLS_getVForSourceType((__VLS_ctx.tableRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (`row-${index}`),
            ...{ class: "template-preview-table-row" },
        });
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.tableColumns))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (`${index}-${column}`),
                ...{ class: "template-preview-cell" },
            });
            (__VLS_ctx.formatCell(row[column]));
        }
    }
}
else if (__VLS_ctx.previewMode === 'filter') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview-filter" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview-filter-label" },
    });
    (__VLS_ctx.previewChartConfig.xField || '筛选字段');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview-filter-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "template-preview-chip template-preview-chip--active" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filterOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (item),
            ...{ class: "template-preview-chip" },
        });
        (item);
    }
}
else {
    /** @type {[typeof ComponentDataFallback, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ComponentDataFallback, new ComponentDataFallback({
        chartType: (__VLS_ctx.previewChartConfig.chartType),
        chartConfig: (__VLS_ctx.previewChartConfig),
        data: (__VLS_ctx.previewData),
        dark: true,
    }));
    const __VLS_1 = __VLS_0({
        chartType: (__VLS_ctx.previewChartConfig.chartType),
        chartConfig: (__VLS_ctx.previewChartConfig),
        data: (__VLS_ctx.previewData),
        dark: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
/** @type {__VLS_StyleScopedClasses['template-preview-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-table']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-table-head']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-cell--head']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-table-row']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-filter-label']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-filter-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-chip--active']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview-chip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ComponentDataFallback: ComponentDataFallback,
            chartRef: chartRef,
            previewChartConfig: previewChartConfig,
            previewData: previewData,
            previewMode: previewMode,
            tableColumns: tableColumns,
            tableRows: tableRows,
            filterOptions: filterOptions,
            formatCell: formatCell,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
