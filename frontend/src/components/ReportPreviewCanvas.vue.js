import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import ComponentDataFallback from './ComponentDataFallback.vue';
import ComponentStaticPreview from './ComponentStaticPreview.vue';
import { getChartData, getChartList } from '../api/chart';
import { getDashboardById, getDashboardComponents } from '../api/dashboard';
import { getPublicChartList, getPublicComponentData, getPublicDashboardById, getPublicDashboardComponents, } from '../api/report';
import { buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, isStaticWidgetChartType, materializeChartData, mergeComponentRequestFilters, normalizeComponentConfig, postProcessChartOption, } from '../utils/component-config';
import { normalizeCanvasConfig, parseReportConfig } from '../utils/report-config';
const props = defineProps();
const loading = ref(false);
const chartLoading = ref(false);
const filterCollapsed = ref(props.scene === 'screen');
const dashboard = ref(null);
const components = ref([]);
const charts = ref([]);
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])));
const componentDataMap = ref(new Map());
const activeFilters = reactive({});
const canvasRef = ref(null);
const chartRefs = new Map();
const chartInstances = new Map();
const viewportSize = reactive({
    width: typeof window === 'undefined' ? 1920 : window.innerWidth,
    height: typeof window === 'undefined' ? 1080 : window.innerHeight,
});
const MIN_CARD_WIDTH = 320;
const MIN_CARD_HEIGHT = 220;
const LEGACY_GRID_COL_PX = 42;
const LEGACY_GRID_ROW_PX = 70;
const renderedChartCount = computed(() => components.value.filter((item) => isRenderableChart(item)).length);
const isPublicPreview = computed(() => props.accessMode === 'public' && Boolean(props.shareToken));
const isImmersiveScreen = computed(() => props.scene === 'screen');
const getComponentConfig = (component) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId));
const getComponentChartConfig = (component) => getComponentConfig(component).chart;
const getComponentInteractionConfig = (component) => getComponentConfig(component).interaction;
const canvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(dashboard.value?.configJson).canvas, props.scene));
const overlayConfig = computed(() => {
    const overlay = canvasConfig.value.overlay;
    if (!overlay || !overlay.show)
        return null;
    return overlay;
});
const overlayStyle = computed(() => {
    const ov = overlayConfig.value;
    if (!ov)
        return null;
    let background;
    if (ov.bgType === 'gradient') {
        background = `linear-gradient(${ov.gradientAngle ?? 135}deg, ${ov.gradientStart ?? '#0d1b2a'}, ${ov.gradientEnd ?? '#1b3a5c'})`;
    }
    else if (ov.bgType === 'image' && ov.bgImage) {
        background = `url(${ov.bgImage}) center/cover no-repeat, ${ov.bgColor}`;
    }
    else {
        background = ov.bgColor;
    }
    return {
        position: 'absolute',
        left: `${isImmersiveScreen.value ? 0 : ov.x}px`,
        top: `${isImmersiveScreen.value ? 0 : ov.y}px`,
        width: `${ov.w}px`,
        height: `${ov.h}px`,
        background,
        opacity: String(ov.opacity),
        zIndex: '0',
        pointerEvents: 'none',
        overflow: 'hidden',
    };
});
const activeFilterEntries = computed(() => Object.entries(activeFilters)
    .filter(([, value]) => Boolean(value))
    .map(([field, value]) => ({ field, value })));
const hasFilterButtons = computed(() => components.value.some((c) => getComponentChartConfig(c).chartType === 'filter_button'));
const filterDefinitions = computed(() => {
    const definitions = new Map();
    for (const component of components.value) {
        const chart = getComponentChartConfig(component);
        const interaction = getComponentInteractionConfig(component);
        const data = componentDataMap.value.get(component.id);
        if (!data || !interaction.allowManualFilters)
            continue;
        for (const field of [chart.xField, chart.groupField].filter(Boolean)) {
            const values = definitions.get(field) ?? new Set();
            if (field === chart.xField) {
                data.labels.forEach((label) => values.add(String(label)));
            }
            ;
            (data.rawRows ?? []).forEach((row) => {
                if (row[field] != null)
                    values.add(String(row[field]));
            });
            definitions.set(field, values);
        }
    }
    return Array.from(definitions.entries()).map(([field, values]) => ({
        field,
        values: Array.from(values).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    }));
});
const canvasMinHeight = computed(() => {
    const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0);
    return Math.max(props.scene === 'screen' ? canvasConfig.value.height : 620, occupied);
});
const previewViewport = computed(() => {
    if (isImmersiveScreen.value) {
        const overlay = overlayConfig.value;
        if (overlay) {
            return {
                left: overlay.x,
                top: overlay.y,
                width: overlay.w,
                height: overlay.h,
            };
        }
        return {
            left: 0,
            top: 0,
            width: canvasConfig.value.width,
            height: canvasConfig.value.height,
        };
    }
    return {
        left: 0,
        top: 0,
        width: canvasConfig.value.width,
        height: canvasMinHeight.value,
    };
});
const previewScale = computed(() => {
    if (!isImmersiveScreen.value)
        return 1;
    const scaleX = viewportSize.width / Math.max(previewViewport.value.width, 1);
    const scaleY = viewportSize.height / Math.max(previewViewport.value.height, 1);
    const resolved = Math.min(scaleX, scaleY);
    return Number.isFinite(resolved) && resolved > 0 ? resolved : 1;
});
const stageHostStyle = computed(() => {
    if (!isImmersiveScreen.value)
        return undefined;
    return {
        width: `${Math.round(previewViewport.value.width * previewScale.value)}px`,
        height: `${Math.round(previewViewport.value.height * previewScale.value)}px`,
    };
});
const stageStyle = computed(() => {
    if (isImmersiveScreen.value) {
        return {
            width: `${previewViewport.value.width}px`,
            minHeight: `${previewViewport.value.height}px`,
            height: `${previewViewport.value.height}px`,
            transform: `scale(${previewScale.value})`,
            transformOrigin: 'top left',
        };
    }
    if (props.scene === 'screen') {
        return {
            width: `${canvasConfig.value.width}px`,
            minHeight: `${canvasMinHeight.value}px`,
            height: `${canvasMinHeight.value}px`,
        };
    }
    return {
        minHeight: `${canvasMinHeight.value}px`,
    };
});
const showFilterPanelOutside = computed(() => !isImmersiveScreen.value && filterDefinitions.value.length && !hasFilterButtons.value);
const showFilterPanelInside = computed(() => isImmersiveScreen.value && filterDefinitions.value.length && !hasFilterButtons.value);
const normalizeLayout = (component) => {
    if (component.width <= 24)
        component.width = Math.max(MIN_CARD_WIDTH, component.width * LEGACY_GRID_COL_PX);
    if (component.height <= 12)
        component.height = Math.max(MIN_CARD_HEIGHT, component.height * LEGACY_GRID_ROW_PX);
    if (component.posX <= 24 && component.width > 24)
        component.posX = component.posX * LEGACY_GRID_COL_PX;
    if (component.posY <= 24 && component.height > 12)
        component.posY = component.posY * LEGACY_GRID_ROW_PX;
    component.posX = Math.max(0, Number(component.posX) || 0);
    component.posY = Math.max(0, Number(component.posY) || 0);
    component.width = Math.max(MIN_CARD_WIDTH, Number(component.width) || MIN_CARD_WIDTH);
    component.height = Math.max(MIN_CARD_HEIGHT, Number(component.height) || MIN_CARD_HEIGHT);
};
const getCardStyle = (component) => {
    const style = getComponentConfig(component).style;
    const shadow = style.shadowShow
        ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
        : undefined;
    const offsetLeft = isImmersiveScreen.value ? previewViewport.value.left : 0;
    const offsetTop = isImmersiveScreen.value ? previewViewport.value.top : 0;
    return {
        left: `${component.posX - offsetLeft}px`,
        top: `${component.posY - offsetTop}px`,
        width: `${component.width}px`,
        height: `${component.height}px`,
        opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
        boxShadow: shadow,
        padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
    };
};
const setChartRef = (el, componentId) => {
    if (el)
        chartRefs.set(componentId, el);
    else
        chartRefs.delete(componentId);
};
const isTableChart = (component) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType);
const isFilterButtonChart = (component) => getComponentChartConfig(component).chartType === 'filter_button';
const getFilterButtonOptions = (component) => {
    const field = getComponentChartConfig(component).xField;
    if (!field)
        return [];
    const data = componentDataMap.value.get(component.id);
    if (!data)
        return [];
    const values = new Set();
    (data.rawRows ?? []).forEach((row) => {
        if (row[field] != null)
            values.add(String(row[field]));
    });
    data.labels.forEach((label) => values.add(String(label)));
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'zh-CN'));
};
const isStaticWidget = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isStaticWidgetChartType(type);
};
const showNoField = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    if (isStaticWidgetChartType(type))
        return false;
    return getMissingChartFields(getComponentChartConfig(component)).length > 0;
};
const isRenderableChart = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isCanvasRenderableChartType(type);
};
const getTableColumns = (componentId) => componentDataMap.value.get(componentId)?.columns ?? [];
const getTableRows = (componentId) => componentDataMap.value.get(componentId)?.rawRows ?? [];
const renderChart = (component, data) => {
    const el = chartRefs.get(component.id);
    if (!el)
        return;
    let instance = chartInstances.get(component.id);
    if (!instance) {
        instance = echarts.init(el);
        chartInstances.set(component.id, instance);
        instance.on('click', (params) => handleChartClick(component.id, params));
    }
    const resolved = getComponentConfig(component);
    const option = buildComponentOption(data, resolved.chart, resolved.style);
    postProcessChartOption(option, resolved.style, resolved.chart.name);
    instance.setOption(option, true);
};
const handleChartClick = (componentId, params) => {
    const component = components.value.find((item) => item.id === componentId);
    if (!component)
        return;
    const chart = getComponentChartConfig(component);
    const interaction = getComponentInteractionConfig(component);
    if (!interaction.enableClickLinkage || interaction.clickAction !== 'filter')
        return;
    let changed = false;
    const linkageField = interaction.linkageFieldMode === 'custom'
        ? interaction.linkageField
        : interaction.linkageFieldMode === 'group'
            ? chart.groupField
            : chart.xField;
    if (linkageField && params.name) {
        activeFilters[linkageField] = String(params.name);
        changed = true;
    }
    if (interaction.linkageFieldMode === 'auto' && chart.groupField && params.seriesName) {
        activeFilters[chart.groupField] = String(params.seriesName);
        changed = true;
    }
    if (changed) {
        reloadComponentData();
    }
};
const disposeCharts = () => {
    chartInstances.forEach((instance) => instance.dispose());
    chartInstances.clear();
    chartRefs.clear();
};
const reloadComponentData = async () => {
    chartLoading.value = true;
    componentDataMap.value = new Map();
    try {
        await nextTick();
        await Promise.all(components.value.map(async (component) => {
            const chart = getComponentChartConfig(component);
            const interaction = getComponentInteractionConfig(component);
            if (showNoField(component))
                return;
            try {
                const data = isPublicPreview.value
                    ? await getPublicComponentData(props.dashboardId, component.id, props.shareToken || '', mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }))
                    : await getChartData(component.chartId, {
                        filters: mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }),
                        configJson: component.configJson,
                    });
                const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart);
                const nextMap = new Map(componentDataMap.value);
                nextMap.set(component.id, materialized);
                componentDataMap.value = nextMap;
                if (isRenderableChart(component))
                    renderChart(component, materialized);
            }
            catch {
                // ignore individual chart failures to keep page usable
            }
        }));
    }
    finally {
        chartLoading.value = false;
    }
};
const updateFilter = (field, value) => {
    if (!value)
        delete activeFilters[field];
    else
        activeFilters[field] = String(value);
    reloadComponentData();
};
const clearFilters = () => {
    Object.keys(activeFilters).forEach((key) => delete activeFilters[key]);
    reloadComponentData();
};
const clearSingleFilter = (field) => {
    delete activeFilters[field];
    reloadComponentData();
};
const loadAll = async () => {
    loading.value = true;
    disposeCharts();
    componentDataMap.value = new Map();
    try {
        const [dashboardDetail, componentList, chartList] = await Promise.all(isPublicPreview.value
            ? [
                getPublicDashboardById(props.dashboardId, props.shareToken || ''),
                getPublicDashboardComponents(props.dashboardId, props.shareToken || ''),
                getPublicChartList(props.dashboardId, props.shareToken || ''),
            ]
            : [
                getDashboardById(props.dashboardId),
                getDashboardComponents(props.dashboardId),
                getChartList(),
            ]);
        dashboard.value = dashboardDetail;
        charts.value = chartList;
        componentList.forEach(normalizeLayout);
        components.value = componentList;
        await nextTick();
        await reloadComponentData();
    }
    catch {
        dashboard.value = null;
        components.value = [];
    }
    finally {
        loading.value = false;
        chartLoading.value = false;
    }
};
const handleResize = () => {
    viewportSize.width = window.innerWidth;
    viewportSize.height = window.innerHeight;
    chartInstances.forEach((instance) => instance.resize());
};
watch(() => [props.dashboardId, props.accessMode, props.shareToken], loadAll);
onMounted(async () => {
    window.addEventListener('resize', handleResize);
    await loadAll();
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    disposeCharts();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--immersive']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-shell" },
    ...{ class: ({ 'preview-shell--immersive': __VLS_ctx.isImmersiveScreen }) },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading || __VLS_ctx.chartLoading) }, null, null);
if (__VLS_ctx.showFilterPanelOutside) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-panel" },
        ...{ class: ({ 'filter-panel--collapsed': __VLS_ctx.filterCollapsed }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.showFilterPanelOutside))
                    return;
                __VLS_ctx.filterCollapsed = !__VLS_ctx.filterCollapsed;
            } },
        ...{ class: "filter-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-head-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "filter-toggle-icon" },
    });
    (__VLS_ctx.filterCollapsed ? '▶' : '▼');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "filter-title" },
    });
    if (__VLS_ctx.activeFilterEntries.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "filter-active-badge" },
        });
        (__VLS_ctx.activeFilterEntries.length);
    }
    if (!__VLS_ctx.filterCollapsed && __VLS_ctx.activeFilterEntries.length) {
        const __VLS_0 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            size: "small",
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_4;
        let __VLS_5;
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.clearFilters)
        };
        __VLS_3.slots.default;
        var __VLS_3;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.filterCollapsed) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-grid" },
    });
    for (const [definition] of __VLS_getVForSourceType((__VLS_ctx.filterDefinitions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (definition.field),
            ...{ class: "filter-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-item-label" },
        });
        (definition.field);
        const __VLS_8 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.activeFilters[definition.field] || ''),
            placeholder: "全部",
            clearable: true,
            filterable: true,
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.activeFilters[definition.field] || ''),
            placeholder: "全部",
            clearable: true,
            filterable: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_12;
        let __VLS_13;
        let __VLS_14;
        const __VLS_15 = {
            onChange: (...[$event]) => {
                if (!(__VLS_ctx.showFilterPanelOutside))
                    return;
                __VLS_ctx.updateFilter(definition.field, $event);
            }
        };
        __VLS_11.slots.default;
        for (const [value] of __VLS_getVForSourceType((definition.values))) {
            const __VLS_16 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                key: (`${definition.field}-${value}`),
                label: (String(value)),
                value: (String(value)),
            }));
            const __VLS_18 = __VLS_17({
                key: (`${definition.field}-${value}`),
                label: (String(value)),
                value: (String(value)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        }
        var __VLS_11;
    }
    if (__VLS_ctx.activeFilterEntries.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-tags" },
        });
        for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.activeFilterEntries))) {
            const __VLS_20 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                ...{ 'onClose': {} },
                key: (entry.field),
                closable: true,
                effect: "plain",
            }));
            const __VLS_22 = __VLS_21({
                ...{ 'onClose': {} },
                key: (entry.field),
                closable: true,
                effect: "plain",
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
            let __VLS_24;
            let __VLS_25;
            let __VLS_26;
            const __VLS_27 = {
                onClose: (...[$event]) => {
                    if (!(__VLS_ctx.showFilterPanelOutside))
                        return;
                    if (!(__VLS_ctx.activeFilterEntries.length))
                        return;
                    __VLS_ctx.clearSingleFilter(entry.field);
                }
            };
            __VLS_23.slots.default;
            (entry.field);
            (entry.value);
            var __VLS_23;
        }
    }
}
if (!__VLS_ctx.loading && !__VLS_ctx.dashboard) {
    const __VLS_28 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        description: "未找到对应报告",
        imageSize: (88),
    }));
    const __VLS_30 = __VLS_29({
        description: "未找到对应报告",
        imageSize: (88),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage-shell" },
        ...{ class: ({ 'preview-stage-shell--immersive': __VLS_ctx.isImmersiveScreen }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage-host" },
        ...{ style: (__VLS_ctx.stageHostStyle) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "canvasRef",
        ...{ class: "preview-stage" },
        ...{ class: ([`preview-stage--${__VLS_ctx.scene}`, { 'preview-stage--immersive': __VLS_ctx.isImmersiveScreen }]) },
        ...{ style: (__VLS_ctx.stageStyle) },
    });
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    if (__VLS_ctx.showFilterPanelInside) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-panel filter-panel--floating" },
            ...{ class: ({ 'filter-panel--collapsed': __VLS_ctx.filterCollapsed }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.loading && !__VLS_ctx.dashboard))
                        return;
                    if (!(__VLS_ctx.showFilterPanelInside))
                        return;
                    __VLS_ctx.filterCollapsed = !__VLS_ctx.filterCollapsed;
                } },
            ...{ class: "filter-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-head-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "filter-toggle-icon" },
        });
        (__VLS_ctx.filterCollapsed ? '▶' : '▼');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "filter-title" },
        });
        if (__VLS_ctx.activeFilterEntries.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "filter-active-badge" },
            });
            (__VLS_ctx.activeFilterEntries.length);
        }
        if (!__VLS_ctx.filterCollapsed && __VLS_ctx.activeFilterEntries.length) {
            const __VLS_32 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
            }));
            const __VLS_34 = __VLS_33({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            let __VLS_36;
            let __VLS_37;
            let __VLS_38;
            const __VLS_39 = {
                onClick: (__VLS_ctx.clearFilters)
            };
            __VLS_35.slots.default;
            var __VLS_35;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (!__VLS_ctx.filterCollapsed) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-grid" },
        });
        for (const [definition] of __VLS_getVForSourceType((__VLS_ctx.filterDefinitions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (definition.field),
                ...{ class: "filter-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-item-label" },
            });
            (definition.field);
            const __VLS_40 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.activeFilters[definition.field] || ''),
                placeholder: "全部",
                clearable: true,
                filterable: true,
            }));
            const __VLS_42 = __VLS_41({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.activeFilters[definition.field] || ''),
                placeholder: "全部",
                clearable: true,
                filterable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            let __VLS_44;
            let __VLS_45;
            let __VLS_46;
            const __VLS_47 = {
                onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.loading && !__VLS_ctx.dashboard))
                        return;
                    if (!(__VLS_ctx.showFilterPanelInside))
                        return;
                    __VLS_ctx.updateFilter(definition.field, $event);
                }
            };
            __VLS_43.slots.default;
            for (const [value] of __VLS_getVForSourceType((definition.values))) {
                const __VLS_48 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    key: (`${definition.field}-${value}`),
                    label: (String(value)),
                    value: (String(value)),
                }));
                const __VLS_50 = __VLS_49({
                    key: (`${definition.field}-${value}`),
                    label: (String(value)),
                    value: (String(value)),
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            }
            var __VLS_43;
        }
        if (__VLS_ctx.activeFilterEntries.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-tags" },
            });
            for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.activeFilterEntries))) {
                const __VLS_52 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                    ...{ 'onClose': {} },
                    key: (entry.field),
                    closable: true,
                    effect: "plain",
                }));
                const __VLS_54 = __VLS_53({
                    ...{ 'onClose': {} },
                    key: (entry.field),
                    closable: true,
                    effect: "plain",
                }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                let __VLS_56;
                let __VLS_57;
                let __VLS_58;
                const __VLS_59 = {
                    onClose: (...[$event]) => {
                        if (!!(!__VLS_ctx.loading && !__VLS_ctx.dashboard))
                            return;
                        if (!(__VLS_ctx.showFilterPanelInside))
                            return;
                        if (!(__VLS_ctx.activeFilterEntries.length))
                            return;
                        __VLS_ctx.clearSingleFilter(entry.field);
                    }
                };
                __VLS_55.slots.default;
                (entry.field);
                (entry.value);
                var __VLS_55;
            }
        }
    }
    if (__VLS_ctx.overlayStyle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ style: (__VLS_ctx.overlayStyle) },
        });
    }
    for (const [component] of __VLS_getVForSourceType((__VLS_ctx.components))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (component.id),
            ...{ class: "preview-card" },
            ...{ style: (__VLS_ctx.getCardStyle(component)) },
        });
        if (!__VLS_ctx.isFilterButtonChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-card-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-card-title" },
            });
            (__VLS_ctx.getComponentChartConfig(component).name || '图表组件');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-card-meta" },
            });
            const __VLS_60 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                size: "small",
                type: "info",
            }));
            const __VLS_62 = __VLS_61({
                size: "small",
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            __VLS_63.slots.default;
            (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
            var __VLS_63;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.getComponentChartConfig(component).datasetId ? `数据集 #${__VLS_ctx.getComponentChartConfig(component).datasetId}` : '未关联数据集');
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card-body" },
        });
        if (__VLS_ctx.isFilterButtonChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-button-preview" },
            });
            const __VLS_64 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.activeFilters[__VLS_ctx.getComponentChartConfig(component).xField] || ''),
                placeholder: (__VLS_ctx.getComponentChartConfig(component).name || '筛选'),
                filterable: true,
                clearable: true,
                size: "default",
                ...{ style: {} },
            }));
            const __VLS_66 = __VLS_65({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.activeFilters[__VLS_ctx.getComponentChartConfig(component).xField] || ''),
                placeholder: (__VLS_ctx.getComponentChartConfig(component).name || '筛选'),
                filterable: true,
                clearable: true,
                size: "default",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            let __VLS_68;
            let __VLS_69;
            let __VLS_70;
            const __VLS_71 = {
                onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.loading && !__VLS_ctx.dashboard))
                        return;
                    if (!(__VLS_ctx.isFilterButtonChart(component)))
                        return;
                    __VLS_ctx.updateFilter(__VLS_ctx.getComponentChartConfig(component).xField, $event);
                }
            };
            __VLS_67.slots.default;
            for (const [val] of __VLS_getVForSourceType((__VLS_ctx.getFilterButtonOptions(component)))) {
                const __VLS_72 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
                    key: (val),
                    label: (val),
                    value: (val),
                }));
                const __VLS_74 = __VLS_73({
                    key: (val),
                    label: (val),
                    value: (val),
                }, ...__VLS_functionalComponentArgsRest(__VLS_73));
            }
            var __VLS_67;
        }
        else if (__VLS_ctx.isTableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-wrapper" },
            });
            const __VLS_76 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                data: (__VLS_ctx.getTableRows(component.id)),
                size: "small",
                border: true,
                height: "100%",
                emptyText: "暂无数据",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                }),
            }));
            const __VLS_78 = __VLS_77({
                data: (__VLS_ctx.getTableRows(component.id)),
                size: "small",
                border: true,
                height: "100%",
                emptyText: "暂无数据",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                }),
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
            __VLS_79.slots.default;
            if (__VLS_ctx.getComponentConfig(component).style.tableShowIndex) {
                const __VLS_80 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                    type: "index",
                    width: "50",
                    label: "#",
                }));
                const __VLS_82 = __VLS_81({
                    type: "index",
                    width: "50",
                    label: "#",
                }, ...__VLS_functionalComponentArgsRest(__VLS_81));
            }
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.getTableColumns(component.id)))) {
                const __VLS_84 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }));
                const __VLS_86 = __VLS_85({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }, ...__VLS_functionalComponentArgsRest(__VLS_85));
            }
            var __VLS_79;
        }
        else if (__VLS_ctx.isStaticWidget(component)) {
            /** @type {[typeof ComponentStaticPreview, ]} */ ;
            // @ts-ignore
            const __VLS_88 = __VLS_asFunctionalComponent(ComponentStaticPreview, new ComponentStaticPreview({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: (__VLS_ctx.scene === 'screen'),
            }));
            const __VLS_89 = __VLS_88({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: (__VLS_ctx.scene === 'screen'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        }
        else if (__VLS_ctx.showNoField(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-placeholder warning" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(component)) {
            /** @type {[typeof ComponentDataFallback, ]} */ ;
            // @ts-ignore
            const __VLS_91 = __VLS_asFunctionalComponent(ComponentDataFallback, new ComponentDataFallback({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: (__VLS_ctx.scene === 'screen'),
            }));
            const __VLS_92 = __VLS_91({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: (__VLS_ctx.scene === 'screen'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ref: ((el) => __VLS_ctx.setChartRef(el, component.id)),
                ...{ class: "chart-canvas" },
            });
        }
    }
    if (!__VLS_ctx.components.length && !__VLS_ctx.chartLoading) {
        const __VLS_94 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
            description: "当前报告暂无组件",
            ...{ class: "preview-empty" },
        }));
        const __VLS_96 = __VLS_95({
            description: "当前报告暂无组件",
            ...{ class: "preview-empty" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
    }
}
/** @type {__VLS_StyleScopedClasses['preview-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head-left']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-active-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-item']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage-host']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--floating']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-head-left']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-title']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-active-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-item']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ComponentDataFallback: ComponentDataFallback,
            ComponentStaticPreview: ComponentStaticPreview,
            chartTypeLabel: chartTypeLabel,
            loading: loading,
            chartLoading: chartLoading,
            filterCollapsed: filterCollapsed,
            dashboard: dashboard,
            components: components,
            componentDataMap: componentDataMap,
            activeFilters: activeFilters,
            canvasRef: canvasRef,
            isImmersiveScreen: isImmersiveScreen,
            getComponentConfig: getComponentConfig,
            getComponentChartConfig: getComponentChartConfig,
            overlayStyle: overlayStyle,
            activeFilterEntries: activeFilterEntries,
            filterDefinitions: filterDefinitions,
            stageHostStyle: stageHostStyle,
            stageStyle: stageStyle,
            showFilterPanelOutside: showFilterPanelOutside,
            showFilterPanelInside: showFilterPanelInside,
            getCardStyle: getCardStyle,
            setChartRef: setChartRef,
            isTableChart: isTableChart,
            isFilterButtonChart: isFilterButtonChart,
            getFilterButtonOptions: getFilterButtonOptions,
            isStaticWidget: isStaticWidget,
            showNoField: showNoField,
            isRenderableChart: isRenderableChart,
            getTableColumns: getTableColumns,
            getTableRows: getTableRows,
            updateFilter: updateFilter,
            clearFilters: clearFilters,
            clearSingleFilter: clearSingleFilter,
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
