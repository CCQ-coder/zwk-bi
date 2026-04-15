import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getChartList } from '../api/chart';
import { getDatasetList, getDatasetPreviewData, previewDatasetSql } from '../api/dataset';
import { buildChartSnapshot, buildComponentConfig, chartTypeLabel, COMPONENT_PRESETS, COLOR_THEMES, DEFAULT_COMPONENT_INTERACTION, DEFAULT_COMPONENT_STYLE, buildPresetChartConfig, getChartTypeMeta, getMissingChartFields, normalizeComponentDataFilters, normalizeComponentConfig, suggestChartFields, } from '../utils/component-config';
const props = defineProps();
const emit = defineEmits();
const availableCharts = ref([]);
const datasets = ref([]);
const previewColumns = ref([]);
const previewRows = ref([]);
const previewRowCount = ref(0);
const previewLoading = ref(false);
const saving = ref(false);
const selectedBaseChartId = ref(null);
const themeNames = Object.keys(COLOR_THEMES);
const activeTab = ref('summary');
const syncingFromProps = ref(false);
const componentPresets = COMPONENT_PRESETS;
const openSections = ref(new Set(['legend', 'label']));
const toggleSection = (name) => {
    const next = new Set(openSections.value);
    if (next.has(name))
        next.delete(name);
    else
        next.add(name);
    openSections.value = next;
};
let previewTimer = null;
const layoutForm = reactive({ posX: 0, posY: 0, width: 320, height: 220, zIndex: 0 });
const configForm = reactive({
    chart: buildChartSnapshot(null),
    style: { ...DEFAULT_COMPONENT_STYLE },
    interaction: { ...DEFAULT_COMPONENT_INTERACTION },
});
const currentChartMeta = computed(() => getChartTypeMeta(configForm.chart.chartType));
const missingFields = computed(() => getMissingChartFields(configForm.chart));
const suggestedFields = computed(() => suggestChartFields(previewColumns.value, configForm.chart.chartType));
const suggestionSummary = computed(() => {
    const entries = [
        suggestedFields.value.xField ? `维度 ${suggestedFields.value.xField}` : '',
        suggestedFields.value.yField ? `度量 ${suggestedFields.value.yField}` : '',
        suggestedFields.value.groupField ? `分组 ${suggestedFields.value.groupField}` : '',
    ];
    return entries.filter(Boolean);
});
const schemaPreview = computed(() => {
    if (!props.component)
        return '';
    return JSON.stringify({
        id: `comp_${props.component.id}`,
        type: configForm.chart.chartType,
        position: {
            x: props.component.posX,
            y: props.component.posY,
            w: props.component.width,
            h: props.component.height,
            zIndex: props.component.zIndex,
        },
        dataConfig: {
            sourceId: configForm.chart.datasetId,
            chartId: props.component.chartId,
            dimensions: configForm.chart.xField ? [configForm.chart.xField] : [],
            metrics: configForm.chart.yField ? [configForm.chart.yField] : [],
            groups: configForm.chart.groupField ? [configForm.chart.groupField] : [],
            filters: configForm.interaction.dataFilters,
            mode: 'instance-override',
        },
        styleConfig: configForm.style,
        interactionConfig: configForm.interaction,
    }, null, 2);
});
const buildCurrentConfigJson = () => buildComponentConfig(availableCharts.value.find((item) => item.id === selectedBaseChartId.value) ?? props.chart, props.component?.configJson, {
    chart: { ...configForm.chart },
    style: { ...configForm.style },
    interaction: { ...configForm.interaction },
});
const queuePreview = () => {
    if (syncingFromProps.value || !props.component || !selectedBaseChartId.value)
        return;
    if (previewTimer !== null) {
        window.clearTimeout(previewTimer);
    }
    previewTimer = window.setTimeout(() => {
        previewTimer = null;
        emit('preview-component', {
            chartId: selectedBaseChartId.value,
            configJson: buildCurrentConfigJson(),
        });
    }, 160);
};
const syncFromProps = async () => {
    syncingFromProps.value = true;
    layoutForm.posX = props.component?.posX ?? 0;
    layoutForm.posY = props.component?.posY ?? 0;
    layoutForm.width = props.component?.width ?? 320;
    layoutForm.height = props.component?.height ?? 220;
    layoutForm.zIndex = props.component?.zIndex ?? 0;
    const normalized = normalizeComponentConfig(props.component?.configJson, props.chart);
    configForm.chart = { ...normalized.chart };
    configForm.style = { ...normalized.style };
    configForm.interaction = { ...normalized.interaction };
    selectedBaseChartId.value = props.component?.chartId ?? props.chart?.id ?? null;
    if (configForm.chart.datasetId) {
        await onDatasetChange(configForm.chart.datasetId);
    }
    else {
        previewColumns.value = [];
        previewRows.value = [];
        previewRowCount.value = 0;
    }
    await nextTick();
    syncingFromProps.value = false;
};
watch(() => [props.component?.id, props.component?.configJson, props.chart?.id], syncFromProps, { immediate: true });
watch(() => [configForm.chart, configForm.style, configForm.interaction, selectedBaseChartId.value], queuePreview, { deep: true });
const loadMeta = async () => {
    const [chartList, datasetList] = await Promise.all([getChartList(), getDatasetList()]);
    availableCharts.value = chartList;
    datasets.value = datasetList;
};
const onDatasetChange = async (datasetId) => {
    previewColumns.value = [];
    previewRows.value = [];
    previewRowCount.value = 0;
    if (!datasetId)
        return;
    const dataset = datasets.value.find((item) => item.id === datasetId);
    if (!dataset)
        return;
    previewLoading.value = true;
    try {
        // Demo datasets have null datasourceId — use the by-id preview endpoint
        const preview = !dataset.datasourceId
            ? await getDatasetPreviewData(dataset.id)
            : await previewDatasetSql({ datasourceId: dataset.datasourceId, sqlText: dataset.sqlText });
        previewColumns.value = preview.columns;
        previewRows.value = preview.rows;
        previewRowCount.value = preview.rowCount;
    }
    finally {
        previewLoading.value = false;
    }
};
const applyLayout = (field, value) => {
    if (!props.component || value == null)
        return;
    const nextValue = Math.round(Number(value));
    layoutForm[field] = nextValue;
    emit('apply-layout', { [field]: nextValue });
};
const handlePosXChange = (value) => applyLayout('posX', value);
const handlePosYChange = (value) => applyLayout('posY', value);
const handleWidthChange = (value) => applyLayout('width', value);
const handleHeightChange = (value) => applyLayout('height', value);
const handleZIndexChange = (value) => applyLayout('zIndex', value);
const applyBaseChart = async (chartId) => {
    const selectedChart = availableCharts.value.find((item) => item.id === chartId);
    if (!selectedChart)
        return;
    configForm.chart = { ...buildChartSnapshot(selectedChart) };
    await onDatasetChange(configForm.chart.datasetId);
};
const applySuggestedFields = () => {
    if (suggestedFields.value.xField && !configForm.chart.xField) {
        configForm.chart.xField = suggestedFields.value.xField;
    }
    if (suggestedFields.value.yField && !configForm.chart.yField) {
        configForm.chart.yField = suggestedFields.value.yField;
    }
    if (suggestedFields.value.groupField && !configForm.chart.groupField) {
        configForm.chart.groupField = suggestedFields.value.groupField;
    }
};
const getFilterValueOptions = (field) => {
    if (!field)
        return [];
    return Array.from(new Set(previewRows.value
        .map((row) => row[field])
        .filter((value) => value != null && String(value).trim() !== '')
        .map((value) => String(value)))).slice(0, 50);
};
const addDataFilter = () => {
    configForm.interaction.dataFilters = [
        ...normalizeComponentDataFilters(configForm.interaction.dataFilters),
        { field: '', value: '' },
    ];
};
const removeDataFilter = (index) => {
    configForm.interaction.dataFilters = configForm.interaction.dataFilters.filter((_, itemIndex) => itemIndex !== index);
};
const applyPreset = (presetId) => {
    const preset = componentPresets.find((item) => item.id === presetId);
    if (!preset)
        return;
    const nextChart = buildPresetChartConfig(preset, previewColumns.value, configForm.chart);
    configForm.chart.name = nextChart.name ?? configForm.chart.name;
    configForm.chart.chartType = nextChart.chartType ?? configForm.chart.chartType;
    configForm.chart.xField = nextChart.xField ?? '';
    configForm.chart.yField = nextChart.yField ?? '';
    configForm.chart.groupField = nextChart.groupField ?? '';
};
const saveComponentConfig = async () => {
    if (!props.component)
        return;
    if (!configForm.chart.name.trim())
        return ElMessage.warning('请输入组件名称');
    if (!configForm.chart.datasetId)
        return ElMessage.warning('请选择数据集');
    if (!configForm.chart.chartType)
        return ElMessage.warning('请选择图表类型');
    if (missingFields.value.length)
        return ElMessage.warning(`请补充${missingFields.value.join('、')}`);
    if (!selectedBaseChartId.value)
        return ElMessage.warning('请选择基础组件来源');
    saving.value = true;
    try {
        if (previewTimer !== null) {
            window.clearTimeout(previewTimer);
            previewTimer = null;
        }
        emit('save-component', {
            chartId: selectedBaseChartId.value,
            configJson: buildCurrentConfigJson(),
        });
    }
    finally {
        saving.value = false;
    }
};
const copySchema = async () => {
    if (!schemaPreview.value)
        return;
    try {
        await navigator.clipboard.writeText(schemaPreview.value);
        ElMessage.success('组件 Schema 已复制');
    }
    catch {
        ElMessage.warning('复制失败，请手动复制');
    }
};
onMounted(loadMeta);
onBeforeUnmount(() => {
    if (previewTimer !== null) {
        window.clearTimeout(previewTimer);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['health-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__content']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-subtitle" },
});
if (!__VLS_ctx.component || !__VLS_ctx.chart) {
    const __VLS_0 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: "请选择画布中的组件开始编辑。",
        imageSize: (72),
        ...{ class: "inspector-empty" },
    }));
    const __VLS_2 = __VLS_1({
        description: "请选择画布中的组件开始编辑。",
        imageSize: (72),
        ...{ class: "inspector-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    const __VLS_4 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "inspector-tabs" },
        stretch: true,
    }));
    const __VLS_6 = __VLS_5({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "inspector-tabs" },
        stretch: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    const __VLS_8 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        label: "概览",
        name: "summary",
    }));
    const __VLS_10 = __VLS_9({
        label: "概览",
        name: "summary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-name" },
    });
    (__VLS_ctx.configForm.chart.name || __VLS_ctx.chart.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-tags" },
    });
    const __VLS_12 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: "small",
        type: "info",
    }));
    const __VLS_14 = __VLS_13({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    (__VLS_ctx.chartTypeLabel(__VLS_ctx.configForm.chart.chartType));
    var __VLS_15;
    const __VLS_16 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: "small",
        effect: "plain",
    }));
    const __VLS_18 = __VLS_17({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (__VLS_ctx.scene === 'screen' ? '大屏组件' : '仪表板组件');
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-meta" },
    });
    (__VLS_ctx.component.id);
    (__VLS_ctx.component.chartId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-card" },
        ...{ class: ({ 'health-card--warning': __VLS_ctx.missingFields.length }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.currentChartMeta.label);
    const __VLS_20 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }));
    const __VLS_22 = __VLS_21({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    (__VLS_ctx.missingFields.length ? '待补充' : '可预览');
    var __VLS_23;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-text" },
    });
    (__VLS_ctx.currentChartMeta.description);
    if (__VLS_ctx.missingFields.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "health-list" },
        });
        (__VLS_ctx.missingFields.join('、'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "health-list" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "layout-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_24 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onChange: (__VLS_ctx.handlePosXChange)
    };
    var __VLS_27;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_32 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onChange: (__VLS_ctx.handlePosYChange)
    };
    var __VLS_35;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_40 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (320),
        controlsPosition: "right",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (320),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onChange: (__VLS_ctx.handleWidthChange)
    };
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_48 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (220),
        controlsPosition: "right",
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (220),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onChange: (__VLS_ctx.handleHeightChange)
    };
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item field-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_56 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onChange: (__VLS_ctx.handleZIndexChange)
    };
    var __VLS_59;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_64 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('bring-front');
        }
    };
    __VLS_67.slots.default;
    var __VLS_67;
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('remove');
        }
    };
    __VLS_75.slots.default;
    var __VLS_75;
    var __VLS_11;
    const __VLS_80 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        label: "数据",
        name: "data",
    }));
    const __VLS_82 = __VLS_81({
        label: "数据",
        name: "data",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preset-grid" },
    });
    for (const [preset] of __VLS_getVForSourceType((__VLS_ctx.componentPresets))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    __VLS_ctx.applyPreset(preset.id);
                } },
            key: (preset.id),
            type: "button",
            ...{ class: "preset-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (preset.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (preset.description);
    }
    const __VLS_84 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        labelPosition: "top",
        ...{ class: "chart-form" },
    }));
    const __VLS_86 = __VLS_85({
        labelPosition: "top",
        ...{ class: "chart-form" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        label: "组件名称",
    }));
    const __VLS_90 = __VLS_89({
        label: "组件名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    const __VLS_92 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        modelValue: (__VLS_ctx.configForm.chart.name),
        placeholder: "请输入组件名称",
    }));
    const __VLS_94 = __VLS_93({
        modelValue: (__VLS_ctx.configForm.chart.name),
        placeholder: "请输入组件名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    var __VLS_91;
    const __VLS_96 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        label: "基础组件来源",
    }));
    const __VLS_98 = __VLS_97({
        label: "基础组件来源",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    const __VLS_100 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedBaseChartId),
        placeholder: "选择一个已保存组件",
        ...{ style: {} },
        filterable: true,
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedBaseChartId),
        placeholder: "选择一个已保存组件",
        ...{ style: {} },
        filterable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onChange: (__VLS_ctx.applyBaseChart)
    };
    __VLS_103.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.availableCharts))) {
        const __VLS_108 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            key: (item.id),
            label: (`${item.name} · ${__VLS_ctx.chartTypeLabel(item.chartType)}`),
            value: (item.id),
        }));
        const __VLS_110 = __VLS_109({
            key: (item.id),
            label: (`${item.name} · ${__VLS_ctx.chartTypeLabel(item.chartType)}`),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    }
    var __VLS_103;
    var __VLS_99;
    const __VLS_112 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        label: "数据集",
    }));
    const __VLS_114 = __VLS_113({
        label: "数据集",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.configForm.chart.datasetId),
        placeholder: "请选择数据集",
        ...{ style: {} },
        filterable: true,
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.configForm.chart.datasetId),
        placeholder: "请选择数据集",
        ...{ style: {} },
        filterable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_120;
    let __VLS_121;
    let __VLS_122;
    const __VLS_123 = {
        onChange: (__VLS_ctx.onDatasetChange)
    };
    __VLS_119.slots.default;
    for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
        const __VLS_124 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            key: (dataset.id),
            label: (dataset.name),
            value: (dataset.id),
        }));
        const __VLS_126 = __VLS_125({
            key: (dataset.id),
            label: (dataset.name),
            value: (dataset.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    }
    var __VLS_119;
    var __VLS_115;
    const __VLS_128 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        label: "图表类型",
    }));
    const __VLS_130 = __VLS_129({
        label: "图表类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    const __VLS_132 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        modelValue: (__VLS_ctx.configForm.chart.chartType),
        placeholder: "请选择图表类型",
        ...{ style: {} },
    }));
    const __VLS_134 = __VLS_133({
        modelValue: (__VLS_ctx.configForm.chart.chartType),
        placeholder: "请选择图表类型",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    const __VLS_136 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        label: "比较类",
    }));
    const __VLS_138 = __VLS_137({
        label: "比较类",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    const __VLS_140 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        label: "柱状图",
        value: "bar",
    }));
    const __VLS_142 = __VLS_141({
        label: "柱状图",
        value: "bar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    const __VLS_144 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        label: "条形图",
        value: "bar_horizontal",
    }));
    const __VLS_146 = __VLS_145({
        label: "条形图",
        value: "bar_horizontal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    const __VLS_148 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        label: "折线图",
        value: "line",
    }));
    const __VLS_150 = __VLS_149({
        label: "折线图",
        value: "line",
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    const __VLS_152 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        label: "雷达图",
        value: "radar",
    }));
    const __VLS_154 = __VLS_153({
        label: "雷达图",
        value: "radar",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    var __VLS_139;
    const __VLS_156 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        label: "占比类",
    }));
    const __VLS_158 = __VLS_157({
        label: "占比类",
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        label: "饼图",
        value: "pie",
    }));
    const __VLS_162 = __VLS_161({
        label: "饼图",
        value: "pie",
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    const __VLS_164 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        label: "环图",
        value: "doughnut",
    }));
    const __VLS_166 = __VLS_165({
        label: "环图",
        value: "doughnut",
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    var __VLS_159;
    const __VLS_168 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        label: "关系类",
    }));
    const __VLS_170 = __VLS_169({
        label: "关系类",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    __VLS_171.slots.default;
    const __VLS_172 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        label: "散点图",
        value: "scatter",
    }));
    const __VLS_174 = __VLS_173({
        label: "散点图",
        value: "scatter",
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    var __VLS_171;
    const __VLS_176 = {}.ElOptionGroup;
    /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        label: "高级",
    }));
    const __VLS_178 = __VLS_177({
        label: "高级",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    __VLS_179.slots.default;
    const __VLS_180 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        label: "漏斗图",
        value: "funnel",
    }));
    const __VLS_182 = __VLS_181({
        label: "漏斗图",
        value: "funnel",
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    const __VLS_184 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        label: "仪表盘",
        value: "gauge",
    }));
    const __VLS_186 = __VLS_185({
        label: "仪表盘",
        value: "gauge",
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    const __VLS_188 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        label: "表格",
        value: "table",
    }));
    const __VLS_190 = __VLS_189({
        label: "表格",
        value: "table",
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    var __VLS_179;
    var __VLS_135;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "helper-text" },
    });
    (__VLS_ctx.currentChartMeta.description);
    var __VLS_131;
    if (__VLS_ctx.suggestionSummary.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "suggestion-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "suggestion-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_192 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }));
        const __VLS_194 = __VLS_193({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_193));
        let __VLS_196;
        let __VLS_197;
        let __VLS_198;
        const __VLS_199 = {
            onClick: (__VLS_ctx.applySuggestedFields)
        };
        __VLS_195.slots.default;
        var __VLS_195;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "suggestion-body" },
        });
        (__VLS_ctx.suggestionSummary.join(' · '));
    }
    if (__VLS_ctx.currentChartMeta.requiresDimension || __VLS_ctx.currentChartMeta.allowsOptionalDimension) {
        const __VLS_200 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            label: (__VLS_ctx.currentChartMeta.requiresDimension ? '维度字段' : '维度字段（可选）'),
        }));
        const __VLS_202 = __VLS_201({
            label: (__VLS_ctx.currentChartMeta.requiresDimension ? '维度字段' : '维度字段（可选）'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        __VLS_203.slots.default;
        const __VLS_204 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            modelValue: (__VLS_ctx.configForm.chart.xField),
            placeholder: "选择维度字段",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }));
        const __VLS_206 = __VLS_205({
            modelValue: (__VLS_ctx.configForm.chart.xField),
            placeholder: "选择维度字段",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        __VLS_207.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_208 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
                key: (column),
                label: (column),
                value: (column),
            }));
            const __VLS_210 = __VLS_209({
                key: (column),
                label: (column),
                value: (column),
            }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        }
        var __VLS_207;
        var __VLS_203;
    }
    if (__VLS_ctx.currentChartMeta.requiresMetric) {
        const __VLS_212 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            label: "度量字段",
        }));
        const __VLS_214 = __VLS_213({
            label: "度量字段",
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        __VLS_215.slots.default;
        const __VLS_216 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            modelValue: (__VLS_ctx.configForm.chart.yField),
            placeholder: "选择度量字段",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }));
        const __VLS_218 = __VLS_217({
            modelValue: (__VLS_ctx.configForm.chart.yField),
            placeholder: "选择度量字段",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_219.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_220 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
                key: (column),
                label: (column),
                value: (column),
            }));
            const __VLS_222 = __VLS_221({
                key: (column),
                label: (column),
                value: (column),
            }, ...__VLS_functionalComponentArgsRest(__VLS_221));
        }
        var __VLS_219;
        var __VLS_215;
    }
    if (__VLS_ctx.currentChartMeta.allowsGroup) {
        const __VLS_224 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            label: "分组字段",
        }));
        const __VLS_226 = __VLS_225({
            label: "分组字段",
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
        __VLS_227.slots.default;
        const __VLS_228 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            modelValue: (__VLS_ctx.configForm.chart.groupField),
            placeholder: "可选",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }));
        const __VLS_230 = __VLS_229({
            modelValue: (__VLS_ctx.configForm.chart.groupField),
            placeholder: "可选",
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_232 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
                key: (column),
                label: (column),
                value: (column),
            }));
            const __VLS_234 = __VLS_233({
                key: (column),
                label: (column),
                value: (column),
            }, ...__VLS_functionalComponentArgsRest(__VLS_233));
        }
        var __VLS_231;
        var __VLS_227;
    }
    var __VLS_87;
    if (__VLS_ctx.previewColumns.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "preview-meta" },
        });
        (__VLS_ctx.previewColumns.length);
        (__VLS_ctx.previewRows.length);
        (__VLS_ctx.previewRowCount);
        const __VLS_236 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            data: (__VLS_ctx.previewRows.slice(0, 5)),
            size: "small",
            maxHeight: "240",
            border: true,
        }));
        const __VLS_238 = __VLS_237({
            data: (__VLS_ctx.previewRows.slice(0, 5)),
            size: "small",
            maxHeight: "240",
            border: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_239.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_240 = {}.ElTableColumn;
            /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
            // @ts-ignore
            const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
                key: (column),
                prop: (column),
                label: (column),
                minWidth: "120",
                showOverflowTooltip: true,
            }));
            const __VLS_242 = __VLS_241({
                key: (column),
                prop: (column),
                label: (column),
                minWidth: "120",
                showOverflowTooltip: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_241));
        }
        var __VLS_239;
    }
    var __VLS_83;
    const __VLS_244 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "样式",
        name: "style",
    }));
    const __VLS_246 = __VLS_245({
        label: "样式",
        name: "style",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-sections" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_248 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }));
    const __VLS_250 = __VLS_249({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    __VLS_251.slots.default;
    for (const [name] of __VLS_getVForSourceType((__VLS_ctx.themeNames))) {
        const __VLS_252 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
            key: (name),
            label: (name),
            value: (name),
        }));
        const __VLS_254 = __VLS_253({
            key: (name),
            label: (name),
            value: (name),
        }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    }
    var __VLS_251;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_256 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        modelValue: (__VLS_ctx.configForm.style.bgColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_258 = __VLS_257({
        modelValue: (__VLS_ctx.configForm.style.bgColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('title');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('title') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_260 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showTitle),
        size: "small",
    }));
    const __VLS_262 = __VLS_261({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showTitle),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    let __VLS_264;
    let __VLS_265;
    let __VLS_266;
    const __VLS_267 = {
        onClick: () => { }
    };
    var __VLS_263;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('title') && __VLS_ctx.configForm.style.showTitle) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_268 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        modelValue: (__VLS_ctx.configForm.style.titleText),
        size: "small",
        placeholder: "默认用组件名",
    }));
    const __VLS_270 = __VLS_269({
        modelValue: (__VLS_ctx.configForm.style.titleText),
        size: "small",
        placeholder: "默认用组件名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_272 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        modelValue: (__VLS_ctx.configForm.style.titleFontSize),
        min: (10),
        max: (32),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_274 = __VLS_273({
        modelValue: (__VLS_ctx.configForm.style.titleFontSize),
        min: (10),
        max: (32),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_276 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        modelValue: (__VLS_ctx.configForm.style.titleColor),
        size: "small",
    }));
    const __VLS_278 = __VLS_277({
        modelValue: (__VLS_ctx.configForm.style.titleColor),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    if (__VLS_ctx.currentChartMeta.supportsLegend) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsLegend))
                        return;
                    __VLS_ctx.toggleSection('legend');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('legend') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_280 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }));
        const __VLS_282 = __VLS_281({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_281));
        let __VLS_284;
        let __VLS_285;
        let __VLS_286;
        const __VLS_287 = {
            onClick: () => { }
        };
        var __VLS_283;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('legend') && __VLS_ctx.configForm.style.showLegend) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_288 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_290 = __VLS_289({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_289));
        __VLS_291.slots.default;
        const __VLS_292 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
            label: "底部",
            value: "bottom",
        }));
        const __VLS_294 = __VLS_293({
            label: "底部",
            value: "bottom",
        }, ...__VLS_functionalComponentArgsRest(__VLS_293));
        const __VLS_296 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
            label: "顶部",
            value: "top",
        }));
        const __VLS_298 = __VLS_297({
            label: "顶部",
            value: "top",
        }, ...__VLS_functionalComponentArgsRest(__VLS_297));
        const __VLS_300 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
            label: "右侧",
            value: "right",
        }));
        const __VLS_302 = __VLS_301({
            label: "右侧",
            value: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_301));
        var __VLS_291;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('border');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('border') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_304 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }));
    const __VLS_306 = __VLS_305({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    let __VLS_308;
    let __VLS_309;
    let __VLS_310;
    const __VLS_311 = {
        onClick: () => { }
    };
    var __VLS_307;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('border') && __VLS_ctx.configForm.style.borderShow) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_312 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_314 = __VLS_313({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_316 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_318 = __VLS_317({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_320 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_322 = __VLS_321({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('label');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('label') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_324 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showLabel),
        size: "small",
    }));
    const __VLS_326 = __VLS_325({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showLabel),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    let __VLS_328;
    let __VLS_329;
    let __VLS_330;
    const __VLS_331 = {
        onClick: () => { }
    };
    var __VLS_327;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('label') && __VLS_ctx.configForm.style.showLabel) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_332 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        modelValue: (__VLS_ctx.configForm.style.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_334 = __VLS_333({
        modelValue: (__VLS_ctx.configForm.style.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_336 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        modelValue: (__VLS_ctx.configForm.style.showTooltip),
        size: "small",
    }));
    const __VLS_338 = __VLS_337({
        modelValue: (__VLS_ctx.configForm.style.showTooltip),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    if (__VLS_ctx.currentChartMeta.supportsAxisNames) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsAxisNames))
                        return;
                    __VLS_ctx.toggleSection('xaxis');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('xaxis') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_340 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }));
        const __VLS_342 = __VLS_341({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_341));
        let __VLS_344;
        let __VLS_345;
        let __VLS_346;
        const __VLS_347 = {
            onClick: () => { }
        };
        var __VLS_343;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('xaxis')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_348 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }));
        const __VLS_350 = __VLS_349({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    }
    if (__VLS_ctx.currentChartMeta.supportsAxisNames) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_352 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }));
        const __VLS_354 = __VLS_353({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_353));
    }
    if (__VLS_ctx.currentChartMeta.supportsSmooth || __VLS_ctx.currentChartMeta.supportsAreaFill || __VLS_ctx.currentChartMeta.supportsBarStyle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsSmooth || __VLS_ctx.currentChartMeta.supportsAreaFill || __VLS_ctx.currentChartMeta.supportsBarStyle))
                        return;
                    __VLS_ctx.toggleSection('adv');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('adv') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('adv')) }, null, null);
        if (__VLS_ctx.currentChartMeta.supportsSmooth) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_356 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }));
            const __VLS_358 = __VLS_357({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_357));
        }
        if (__VLS_ctx.currentChartMeta.supportsAreaFill) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_360 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }));
            const __VLS_362 = __VLS_361({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_361));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_364 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_366 = __VLS_365({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_365));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_368 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_370 = __VLS_369({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_369));
        }
    }
    if (__VLS_ctx.configForm.chart.chartType === 'table') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-header');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-header') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-header')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_372 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_374 = __VLS_373({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_373));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_376 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }));
        const __VLS_378 = __VLS_377({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_377));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_380 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_382 = __VLS_381({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-rows');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-rows') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-rows')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_384 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }));
        const __VLS_386 = __VLS_385({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_385));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_388 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_390 = __VLS_389({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_389));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_392 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_394 = __VLS_393({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_393));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_396 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_398 = __VLS_397({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_397));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_400 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_402 = __VLS_401({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_401));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_404 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }));
        const __VLS_406 = __VLS_405({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_405));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_408 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_410 = __VLS_409({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_409));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-border');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-border') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-border')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_412 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_414 = __VLS_413({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_413));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_416 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_418 = __VLS_417({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-func');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-func') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-func')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_420 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }));
        const __VLS_422 = __VLS_421({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_424 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }));
        const __VLS_426 = __VLS_425({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_425));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('comp-adv');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('comp-adv') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('comp-adv')) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_428 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_430 = __VLS_429({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_429));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_432 = {}.ElSlider;
    /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
    // @ts-ignore
    const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }));
    const __VLS_434 = __VLS_433({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_433));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_436 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }));
    const __VLS_438 = __VLS_437({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_437));
    if (__VLS_ctx.configForm.style.shadowShow) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_440 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_442 = __VLS_441({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_441));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_444 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_446 = __VLS_445({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_445));
    }
    var __VLS_247;
    const __VLS_448 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
        label: "交互",
        name: "interaction",
    }));
    const __VLS_450 = __VLS_449({
        label: "交互",
        name: "interaction",
    }, ...__VLS_functionalComponentArgsRest(__VLS_449));
    __VLS_451.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "layout-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_452 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
        modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
    }));
    const __VLS_454 = __VLS_453({
        modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
    }, ...__VLS_functionalComponentArgsRest(__VLS_453));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_456 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
        modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
    }));
    const __VLS_458 = __VLS_457({
        modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
    }, ...__VLS_functionalComponentArgsRest(__VLS_457));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_460 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
        modelValue: (__VLS_ctx.configForm.interaction.clickAction),
        ...{ style: {} },
    }));
    const __VLS_462 = __VLS_461({
        modelValue: (__VLS_ctx.configForm.interaction.clickAction),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_461));
    __VLS_463.slots.default;
    const __VLS_464 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
        label: "不处理",
        value: "none",
    }));
    const __VLS_466 = __VLS_465({
        label: "不处理",
        value: "none",
    }, ...__VLS_functionalComponentArgsRest(__VLS_465));
    const __VLS_468 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_469 = __VLS_asFunctionalComponent(__VLS_468, new __VLS_468({
        label: "联动筛选",
        value: "filter",
    }));
    const __VLS_470 = __VLS_469({
        label: "联动筛选",
        value: "filter",
    }, ...__VLS_functionalComponentArgsRest(__VLS_469));
    var __VLS_463;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_472 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({
        modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
        ...{ style: {} },
    }));
    const __VLS_474 = __VLS_473({
        modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_473));
    __VLS_475.slots.default;
    const __VLS_476 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({
        label: "自动识别",
        value: "auto",
    }));
    const __VLS_478 = __VLS_477({
        label: "自动识别",
        value: "auto",
    }, ...__VLS_functionalComponentArgsRest(__VLS_477));
    const __VLS_480 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
        label: "维度字段",
        value: "dimension",
    }));
    const __VLS_482 = __VLS_481({
        label: "维度字段",
        value: "dimension",
    }, ...__VLS_functionalComponentArgsRest(__VLS_481));
    const __VLS_484 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
        label: "分组字段",
        value: "group",
    }));
    const __VLS_486 = __VLS_485({
        label: "分组字段",
        value: "group",
    }, ...__VLS_functionalComponentArgsRest(__VLS_485));
    const __VLS_488 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({
        label: "自定义字段",
        value: "custom",
    }));
    const __VLS_490 = __VLS_489({
        label: "自定义字段",
        value: "custom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_489));
    var __VLS_475;
    if (__VLS_ctx.configForm.interaction.linkageFieldMode === 'custom') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item field-item--full" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_492 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({
            modelValue: (__VLS_ctx.configForm.interaction.linkageField),
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }));
        const __VLS_494 = __VLS_493({
            modelValue: (__VLS_ctx.configForm.interaction.linkageField),
            clearable: true,
            filterable: true,
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_493));
        __VLS_495.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_496 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({
                key: (column),
                label: (column),
                value: (column),
            }));
            const __VLS_498 = __VLS_497({
                key: (column),
                label: (column),
                value: (column),
            }, ...__VLS_functionalComponentArgsRest(__VLS_497));
        }
        var __VLS_495;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-editor-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_500 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_502 = __VLS_501({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_501));
    let __VLS_504;
    let __VLS_505;
    let __VLS_506;
    const __VLS_507 = {
        onClick: (__VLS_ctx.addDataFilter)
    };
    __VLS_503.slots.default;
    var __VLS_503;
    if (__VLS_ctx.configForm.interaction.dataFilters.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-editor-list" },
        });
        for (const [filter, index] of __VLS_getVForSourceType((__VLS_ctx.configForm.interaction.dataFilters))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`filter-${index}`),
                ...{ class: "filter-editor-row" },
            });
            const __VLS_508 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
                modelValue: (filter.field),
                placeholder: "字段",
                filterable: true,
                clearable: true,
            }));
            const __VLS_510 = __VLS_509({
                modelValue: (filter.field),
                placeholder: "字段",
                filterable: true,
                clearable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_509));
            __VLS_511.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_512 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_514 = __VLS_513({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_513));
            }
            var __VLS_511;
            if (__VLS_ctx.getFilterValueOptions(filter.field).length) {
                const __VLS_516 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
                    modelValue: (filter.value),
                    placeholder: "值",
                    filterable: true,
                    clearable: true,
                }));
                const __VLS_518 = __VLS_517({
                    modelValue: (filter.value),
                    placeholder: "值",
                    filterable: true,
                    clearable: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_517));
                __VLS_519.slots.default;
                for (const [option] of __VLS_getVForSourceType((__VLS_ctx.getFilterValueOptions(filter.field)))) {
                    const __VLS_520 = {}.ElOption;
                    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                    // @ts-ignore
                    const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
                        key: (`${filter.field}-${option}`),
                        label: (option),
                        value: (option),
                    }));
                    const __VLS_522 = __VLS_521({
                        key: (`${filter.field}-${option}`),
                        label: (option),
                        value: (option),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_521));
                }
                var __VLS_519;
            }
            else {
                const __VLS_524 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
                    modelValue: (filter.value),
                    placeholder: "输入筛选值",
                }));
                const __VLS_526 = __VLS_525({
                    modelValue: (filter.value),
                    placeholder: "输入筛选值",
                }, ...__VLS_functionalComponentArgsRest(__VLS_525));
            }
            const __VLS_528 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
                ...{ 'onClick': {} },
                size: "small",
                text: true,
            }));
            const __VLS_530 = __VLS_529({
                ...{ 'onClick': {} },
                size: "small",
                text: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_529));
            let __VLS_532;
            let __VLS_533;
            let __VLS_534;
            const __VLS_535 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.interaction.dataFilters.length))
                        return;
                    __VLS_ctx.removeDataFilter(index);
                }
            };
            __VLS_531.slots.default;
            var __VLS_531;
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
    }
    var __VLS_451;
    const __VLS_536 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
        label: "Schema",
        name: "schema",
    }));
    const __VLS_538 = __VLS_537({
        label: "Schema",
        name: "schema",
    }, ...__VLS_functionalComponentArgsRest(__VLS_537));
    __VLS_539.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "schema-block" },
    });
    (__VLS_ctx.schemaPreview);
    var __VLS_539;
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hint-text" },
    });
    (__VLS_ctx.previewLoading ? '正在刷新字段列表...' : '属性修改会先在画布中实时预览，点击保存后才会持久化。');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_540 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_542 = __VLS_541({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_541));
    let __VLS_544;
    let __VLS_545;
    let __VLS_546;
    const __VLS_547 = {
        onClick: (__VLS_ctx.copySchema)
    };
    __VLS_543.slots.default;
    var __VLS_543;
    const __VLS_548 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_549 = __VLS_asFunctionalComponent(__VLS_548, new __VLS_548({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_550 = __VLS_549({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_549));
    let __VLS_552;
    let __VLS_553;
    let __VLS_554;
    const __VLS_555 = {
        onClick: (__VLS_ctx.saveComponentConfig)
    };
    __VLS_551.slots.default;
    var __VLS_551;
}
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-head']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-title']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-name']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['health-card']} */ ;
/** @type {__VLS_StyleScopedClasses['health-head']} */ ;
/** @type {__VLS_StyleScopedClasses['health-text']} */ ;
/** @type {__VLS_StyleScopedClasses['health-list']} */ ;
/** @type {__VLS_StyleScopedClasses['health-list']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-card']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['style-sections']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-block']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-list']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['schema-block']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hint-text']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartTypeLabel: chartTypeLabel,
            availableCharts: availableCharts,
            datasets: datasets,
            previewColumns: previewColumns,
            previewRows: previewRows,
            previewRowCount: previewRowCount,
            previewLoading: previewLoading,
            saving: saving,
            selectedBaseChartId: selectedBaseChartId,
            themeNames: themeNames,
            activeTab: activeTab,
            componentPresets: componentPresets,
            openSections: openSections,
            toggleSection: toggleSection,
            layoutForm: layoutForm,
            configForm: configForm,
            currentChartMeta: currentChartMeta,
            missingFields: missingFields,
            suggestionSummary: suggestionSummary,
            schemaPreview: schemaPreview,
            onDatasetChange: onDatasetChange,
            handlePosXChange: handlePosXChange,
            handlePosYChange: handlePosYChange,
            handleWidthChange: handleWidthChange,
            handleHeightChange: handleHeightChange,
            handleZIndexChange: handleZIndexChange,
            applyBaseChart: applyBaseChart,
            applySuggestedFields: applySuggestedFields,
            getFilterValueOptions: getFilterValueOptions,
            addDataFilter: addDataFilter,
            removeDataFilter: removeDataFilter,
            applyPreset: applyPreset,
            saveComponentConfig: saveComponentConfig,
            copySchema: copySchema,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
