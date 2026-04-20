import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { createTemplate, deleteTemplate, getTemplateList, updateTemplate } from '../api/chart-template';
import { getChartList } from '../api/chart';
import { getDatasetFields, getDatasetList, getDatasetPreviewData } from '../api/dataset';
import { buildComponentOption, COLOR_THEMES, chartTypeLabel, isCanvasRenderableChartType, isStaticWidgetChartType, materializeChartData, normalizeComponentAssetConfig } from '../utils/component-config';
import { echarts } from '../utils/echarts';
const loading = ref(false);
const saving = ref(false);
const keyword = ref('');
const typeFilter = ref('ALL');
const templates = ref([]);
const charts = ref([]);
const datasets = ref([]);
const datasetFields = ref([]);
const dialogVisible = ref(false);
const editingId = ref(null);
const currentTemplate = ref(null);
const formRef = ref();
const themeOptions = Object.keys(COLOR_THEMES);
const staticChartTypeValues = [
    'decor_border_frame', 'decor_border_corner', 'decor_border_glow', 'decor_border_grid',
    'text_block', 'single_field', 'number_flipper', 'table_rank', 'iframe_single', 'iframe_tabs',
    'hyperlink', 'image_list', 'text_list', 'clock_display', 'word_cloud', 'qr_code',
    'business_trend', 'metric_indicator', 'icon_arrow_trend', 'icon_warning_badge',
    'icon_location_pin', 'icon_data_signal', 'icon_user_badge', 'icon_chart_mark',
];
const chartTypeOptions = [
    { label: '基础柱状图', value: 'bar' },
    { label: '堆叠柱状图', value: 'bar_stack' },
    { label: '百分比柱状图', value: 'bar_percent' },
    { label: '分组柱状图', value: 'bar_group' },
    { label: '基础条形图', value: 'bar_horizontal' },
    { label: '堆叠条形图', value: 'bar_horizontal_stack' },
    { label: '基础折线图', value: 'line' },
    { label: '面积图', value: 'area' },
    { label: '堆叠折线图', value: 'line_stack' },
    { label: '饼图', value: 'pie' },
    { label: '环图', value: 'doughnut' },
    { label: '玫瑰图', value: 'rose' },
    { label: '漏斗图', value: 'funnel' },
    { label: '仪表盘', value: 'gauge' },
    { label: '雷达图', value: 'radar' },
    { label: '散点图', value: 'scatter' },
    { label: '矩形树图', value: 'treemap' },
    { label: '表格', value: 'table' },
    ...staticChartTypeValues.map((value) => ({ label: chartTypeLabel(value), value })),
];
const form = reactive({
    name: '',
    description: '',
    sourceChartId: null,
    datasetId: '',
    chartType: 'bar',
    xField: '',
    yField: '',
    groupField: '',
    theme: themeOptions[0] || '默认蓝',
    bgColor: 'rgba(0,0,0,0)',
    showLegend: true,
    showLabel: true,
    showGrid: true,
    smooth: false,
    areaFill: false,
    width: 520,
    height: 320,
});
const isStaticAssetType = computed(() => isStaticWidgetChartType(form.chartType));
const rules = {
    name: [{ required: true, message: '请输入组件名称', trigger: 'blur' }],
    chartType: [{ required: true, message: '请选择图表类型', trigger: 'change' }],
    datasetId: [{
            validator: (_rule, value, callback) => {
                if (isStaticWidgetChartType(form.chartType) || value) {
                    callback();
                    return;
                }
                callback(new Error('请选择数据集'));
            },
            trigger: 'change'
        }],
    width: [{ required: true, message: '请输入组件宽度', trigger: 'change' }],
    height: [{ required: true, message: '请输入组件高度', trigger: 'change' }],
};
const filteredTemplates = computed(() => templates.value.filter((item) => {
    const text = keyword.value.trim().toLowerCase();
    const byKeyword = !text
        || item.name.toLowerCase().includes(text)
        || item.description.toLowerCase().includes(text)
        || item.createdBy.toLowerCase().includes(text);
    const byType = typeFilter.value === 'ALL' || item.chartType === typeFilter.value;
    return byKeyword && byType;
}));
const previewConfigJson = computed(() => JSON.stringify(buildPayloadConfig(), null, 2));
const resetForm = () => {
    editingId.value = null;
    currentTemplate.value = null;
    datasetFields.value = [];
    Object.assign(form, {
        name: '',
        description: '',
        sourceChartId: null,
        datasetId: '',
        chartType: 'bar',
        xField: '',
        yField: '',
        groupField: '',
        theme: themeOptions[0] || '默认蓝',
        bgColor: 'rgba(0,0,0,0)',
        showLegend: true,
        showLabel: true,
        showGrid: true,
        smooth: false,
        areaFill: false,
        width: 520,
        height: 320,
    });
};
const buildPayloadConfig = () => {
    const existing = currentTemplate.value ? normalizeComponentAssetConfig(currentTemplate.value.configJson) : null;
    return {
        chart: {
            ...(existing?.chart ?? {}),
            name: form.name,
            datasetId: form.datasetId,
            chartType: form.chartType,
            xField: form.xField,
            yField: form.yField,
            groupField: form.groupField,
        },
        style: {
            ...(existing?.style ?? {}),
            theme: form.theme,
            bgColor: form.bgColor,
            showLegend: form.showLegend,
            showLabel: form.showLabel,
            showGrid: form.showGrid,
            smooth: form.chartType === 'line' ? form.smooth : false,
            areaFill: form.chartType === 'line' ? form.areaFill : false,
        },
        interaction: {
            ...(existing?.interaction ?? {}),
            clickAction: existing?.interaction.clickAction ?? 'filter',
            enableClickLinkage: existing?.interaction.enableClickLinkage ?? true,
            allowManualFilters: existing?.interaction.allowManualFilters ?? true,
            linkageFieldMode: existing?.interaction.linkageFieldMode ?? 'auto',
            linkageField: existing?.interaction.linkageField ?? '',
            dataFilters: existing?.interaction.dataFilters ?? [],
        },
        layout: {
            ...(existing?.layout ?? {}),
            width: form.width,
            height: form.height,
        },
    };
};
const getTemplateSummary = (item) => {
    const parsed = normalizeComponentAssetConfig(item.configJson);
    const dataset = datasets.value.find((entry) => entry.id === parsed.chart.datasetId);
    return {
        datasetName: dataset
            ? `${dataset.name} / ${parsed.chart.xField || '-'} → ${parsed.chart.yField || '-'}`
            : (isStaticWidgetChartType(parsed.chart.chartType || item.chartType) ? '静态组件' : '未绑定数据集'),
        sizeText: `${parsed.layout.width} x ${parsed.layout.height}`,
    };
};
const loadAll = async () => {
    loading.value = true;
    try {
        const [templateList, chartList, datasetList] = await Promise.all([
            getTemplateList(),
            getChartList(),
            getDatasetList(),
        ]);
        templates.value = templateList;
        charts.value = chartList;
        datasets.value = datasetList;
    }
    finally {
        loading.value = false;
    }
};
const loadDatasetFields = async (datasetId) => {
    datasetFields.value = [];
    if (!datasetId)
        return;
    datasetFields.value = await getDatasetFields(datasetId);
};
const applySourceChart = async (chartId) => {
    if (!chartId)
        return;
    const selected = charts.value.find((item) => item.id === chartId);
    if (!selected)
        return;
    form.datasetId = selected.datasetId ?? '';
    form.chartType = selected.chartType;
    form.xField = selected.xField;
    form.yField = selected.yField;
    form.groupField = selected.groupField;
    if (!form.name) {
        form.name = `${selected.name} 资产组件`;
    }
    await loadDatasetFields(selected.datasetId);
};
const openCreate = () => {
    resetForm();
    dialogVisible.value = true;
};
const openEdit = async (item) => {
    resetForm();
    editingId.value = item.id;
    currentTemplate.value = item;
    const parsed = normalizeComponentAssetConfig(item.configJson);
    Object.assign(form, {
        name: parsed.chart.name || item.name,
        description: item.description,
        sourceChartId: null,
        datasetId: parsed.chart.datasetId,
        chartType: parsed.chart.chartType || item.chartType,
        xField: parsed.chart.xField,
        yField: parsed.chart.yField,
        groupField: parsed.chart.groupField,
        theme: parsed.style.theme,
        bgColor: parsed.style.bgColor,
        showLegend: parsed.style.showLegend,
        showLabel: parsed.style.showLabel,
        showGrid: parsed.style.showGrid,
        smooth: parsed.style.smooth,
        areaFill: parsed.style.areaFill,
        width: parsed.layout.width,
        height: parsed.layout.height,
    });
    await loadDatasetFields(parsed.chart.datasetId);
    dialogVisible.value = true;
};
const cloneTemplate = async (item) => {
    await openEdit(item);
    editingId.value = null;
    currentTemplate.value = null;
    form.name = `${form.name} 副本`;
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            chartType: form.chartType,
            configJson: JSON.stringify(buildPayloadConfig()),
        };
        if (editingId.value) {
            await updateTemplate(editingId.value, payload);
            ElMessage.success('组件资产已更新');
        }
        else {
            await createTemplate(payload);
            ElMessage.success('组件资产已创建');
        }
        dialogVisible.value = false;
        await loadAll();
    }
    finally {
        saving.value = false;
    }
};
const handleDelete = async (item) => {
    await deleteTemplate(item.id);
    ElMessage.success(`已删除组件资产：${item.name}`);
    await loadAll();
};
// ─── 图表预览 ────────────────────────────────────────────────────────────────
const previewChartRef = ref(null);
let previewChartInstance = null;
const previewLoading = ref(false);
const isPreviewRenderable = computed(() => !!form.datasetId && !!form.xField && !!form.yField && isCanvasRenderableChartType(form.chartType));
let previewTimer = null;
const updatePreview = () => {
    if (previewTimer)
        clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
        if (!isPreviewRenderable.value) {
            previewChartInstance?.clear();
            return;
        }
        await nextTick();
        if (!previewChartRef.value)
            return;
        previewLoading.value = true;
        try {
            const result = await getDatasetPreviewData(form.datasetId);
            const config = normalizeComponentAssetConfig(JSON.stringify(buildPayloadConfig()));
            const data = materializeChartData(result.rows, result.columns, config.chart);
            if (!previewChartInstance) {
                previewChartInstance = echarts.init(previewChartRef.value, null, { renderer: 'canvas' });
            }
            else {
                previewChartInstance.resize();
            }
            const option = buildComponentOption(data, config.chart, config.style);
            previewChartInstance.setOption(option, true);
        }
        catch {
            // 预览失败时静默处理
        }
        finally {
            previewLoading.value = false;
        }
    }, 400);
};
watch(() => [form.datasetId, form.chartType, form.xField, form.yField, form.groupField,
    form.theme, form.showLegend, form.showLabel, form.showGrid, form.smooth, form.areaFill], updatePreview);
onUnmounted(() => {
    if (previewTimer)
        clearTimeout(previewTimer);
    previewChartInstance?.dispose();
    previewChartInstance = null;
});
onMounted(loadAll);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "asset-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "panel-title" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索组件名称/描述",
    clearable: true,
    size: "small",
    ...{ class: "toolbar-input" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索组件名称/描述",
    clearable: true,
    size: "small",
    ...{ class: "toolbar-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    modelValue: (__VLS_ctx.typeFilter),
    size: "small",
    ...{ class: "toolbar-select" },
}));
const __VLS_6 = __VLS_5({
    modelValue: (__VLS_ctx.typeFilter),
    size: "small",
    ...{ class: "toolbar-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
const __VLS_8 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: "全部类型",
    value: "ALL",
}));
const __VLS_10 = __VLS_9({
    label: "全部类型",
    value: "ALL",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
    const __VLS_12 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        key: (option.value),
        label: (option.label),
        value: (option.value),
    }));
    const __VLS_14 = __VLS_13({
        key: (option.value),
        label: (option.label),
        value: (option.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
var __VLS_7;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar-actions" },
});
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.loadAll)
};
__VLS_19.slots.default;
var __VLS_19;
const __VLS_24 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}));
const __VLS_26 = __VLS_25({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_27.slots.default;
var __VLS_27;
const __VLS_32 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    data: (__VLS_ctx.filteredTemplates),
    border: true,
    size: "small",
    height: "100%",
}));
const __VLS_34 = __VLS_33({
    data: (__VLS_ctx.filteredTemplates),
    border: true,
    size: "small",
    height: "100%",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_35.slots.default;
const __VLS_36 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    prop: "name",
    label: "组件名称",
    minWidth: "180",
}));
const __VLS_38 = __VLS_37({
    prop: "name",
    label: "组件名称",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const __VLS_40 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    prop: "chartType",
    label: "类型",
    width: "110",
}));
const __VLS_42 = __VLS_41({
    prop: "chartType",
    label: "类型",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_43.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_44 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: "small",
        effect: "plain",
    }));
    const __VLS_46 = __VLS_45({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    (__VLS_ctx.chartTypeLabel(row.chartType));
    var __VLS_47;
}
var __VLS_43;
const __VLS_48 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "来源数据",
    minWidth: "180",
}));
const __VLS_50 = __VLS_49({
    label: "来源数据",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_51.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.getTemplateSummary(row).datasetName);
}
var __VLS_51;
const __VLS_52 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "画布尺寸",
    width: "130",
}));
const __VLS_54 = __VLS_53({
    label: "画布尺寸",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_55.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.getTemplateSummary(row).sizeText);
}
var __VLS_55;
const __VLS_56 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    prop: "description",
    label: "说明",
    minWidth: "220",
    showOverflowTooltip: true,
}));
const __VLS_58 = __VLS_57({
    prop: "description",
    label: "说明",
    minWidth: "220",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "来源类型",
    width: "110",
}));
const __VLS_62 = __VLS_61({
    label: "来源类型",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_63.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_64 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        type: (row.builtIn ? 'warning' : 'success'),
        size: "small",
    }));
    const __VLS_66 = __VLS_65({
        type: (row.builtIn ? 'warning' : 'success'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    (row.builtIn ? '默认组件' : '自定义组件');
    var __VLS_67;
}
var __VLS_63;
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    prop: "createdBy",
    label: "创建人",
    width: "110",
}));
const __VLS_70 = __VLS_69({
    prop: "createdBy",
    label: "创建人",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "165",
}));
const __VLS_74 = __VLS_73({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "165",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
const __VLS_76 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "操作",
    width: "180",
    fixed: "right",
}));
const __VLS_78 = __VLS_77({
    label: "操作",
    width: "180",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_79.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEdit(row);
        }
    };
    __VLS_83.slots.default;
    var __VLS_83;
    const __VLS_88 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onClick: (...[$event]) => {
            __VLS_ctx.cloneTemplate(row);
        }
    };
    __VLS_91.slots.default;
    var __VLS_91;
    const __VLS_96 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onConfirm': {} },
        title: (row.builtIn ? '默认组件不允许删除' : '确认删除该组件资产？'),
        disabled: (row.builtIn),
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onConfirm': {} },
        title: (row.builtIn ? '默认组件不允许删除' : '确认删除该组件资产？'),
        disabled: (row.builtIn),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDelete(row);
        }
    };
    __VLS_99.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_99.slots;
        const __VLS_104 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            link: true,
            type: "danger",
            disabled: (row.builtIn),
        }));
        const __VLS_106 = __VLS_105({
            link: true,
            type: "danger",
            disabled: (row.builtIn),
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        var __VLS_107;
    }
    var __VLS_99;
}
var __VLS_79;
var __VLS_35;
const __VLS_108 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editingId ? '编辑组件资产' : '新增组件资产'),
    width: "760px",
    destroyOnClose: true,
}));
const __VLS_110 = __VLS_109({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editingId ? '编辑组件资产' : '新增组件资产'),
    width: "760px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
const __VLS_112 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "100px",
    ...{ class: "asset-form" },
}));
const __VLS_114 = __VLS_113({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "100px",
    ...{ class: "asset-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_116 = {};
__VLS_115.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
const __VLS_118 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
    label: "组件名称",
    prop: "name",
}));
const __VLS_120 = __VLS_119({
    label: "组件名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_119));
__VLS_121.slots.default;
const __VLS_122 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入组件名称",
}));
const __VLS_124 = __VLS_123({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入组件名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
var __VLS_121;
const __VLS_126 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    label: "图表类型",
    prop: "chartType",
}));
const __VLS_128 = __VLS_127({
    label: "图表类型",
    prop: "chartType",
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
__VLS_129.slots.default;
const __VLS_130 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    modelValue: (__VLS_ctx.form.chartType),
    ...{ style: {} },
}));
const __VLS_132 = __VLS_131({
    modelValue: (__VLS_ctx.form.chartType),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
__VLS_133.slots.default;
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
    const __VLS_134 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        key: (option.value),
        label: (option.label),
        value: (option.value),
    }));
    const __VLS_136 = __VLS_135({
        key: (option.value),
        label: (option.label),
        value: (option.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
}
var __VLS_133;
var __VLS_129;
const __VLS_138 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
    label: "导入图表",
}));
const __VLS_140 = __VLS_139({
    label: "导入图表",
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
__VLS_141.slots.default;
const __VLS_142 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.sourceChartId),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}));
const __VLS_144 = __VLS_143({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.sourceChartId),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
let __VLS_146;
let __VLS_147;
let __VLS_148;
const __VLS_149 = {
    onChange: (__VLS_ctx.applySourceChart)
};
__VLS_145.slots.default;
for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.charts))) {
    const __VLS_150 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        key: (chart.id),
        label: (`${chart.name} · ${__VLS_ctx.chartTypeLabel(chart.chartType)}`),
        value: (chart.id),
    }));
    const __VLS_152 = __VLS_151({
        key: (chart.id),
        label: (`${chart.name} · ${__VLS_ctx.chartTypeLabel(chart.chartType)}`),
        value: (chart.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
}
var __VLS_145;
var __VLS_141;
const __VLS_154 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    label: "数据集",
    prop: "datasetId",
}));
const __VLS_156 = __VLS_155({
    label: "数据集",
    prop: "datasetId",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
__VLS_157.slots.default;
const __VLS_158 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasetId),
    filterable: true,
    ...{ style: {} },
    clearable: (__VLS_ctx.isStaticAssetType),
}));
const __VLS_160 = __VLS_159({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasetId),
    filterable: true,
    ...{ style: {} },
    clearable: (__VLS_ctx.isStaticAssetType),
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
let __VLS_162;
let __VLS_163;
let __VLS_164;
const __VLS_165 = {
    onChange: (__VLS_ctx.loadDatasetFields)
};
__VLS_161.slots.default;
for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
    const __VLS_166 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
        key: (dataset.id),
        label: (dataset.name),
        value: (dataset.id),
    }));
    const __VLS_168 = __VLS_167({
        key: (dataset.id),
        label: (dataset.name),
        value: (dataset.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_167));
}
var __VLS_161;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
(__VLS_ctx.isStaticAssetType ? '静态资产可不绑定数据集。' : '数据驱动资产需要绑定数据集。');
var __VLS_157;
const __VLS_170 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    label: "维度字段",
}));
const __VLS_172 = __VLS_171({
    label: "维度字段",
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_173.slots.default;
const __VLS_174 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    modelValue: (__VLS_ctx.form.xField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}));
const __VLS_176 = __VLS_175({
    modelValue: (__VLS_ctx.form.xField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_177.slots.default;
for (const [field] of __VLS_getVForSourceType((__VLS_ctx.datasetFields))) {
    const __VLS_178 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }));
    const __VLS_180 = __VLS_179({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_179));
}
var __VLS_177;
var __VLS_173;
const __VLS_182 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    label: "度量字段",
}));
const __VLS_184 = __VLS_183({
    label: "度量字段",
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
__VLS_185.slots.default;
const __VLS_186 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    modelValue: (__VLS_ctx.form.yField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}));
const __VLS_188 = __VLS_187({
    modelValue: (__VLS_ctx.form.yField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
__VLS_189.slots.default;
for (const [field] of __VLS_getVForSourceType((__VLS_ctx.datasetFields))) {
    const __VLS_190 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }));
    const __VLS_192 = __VLS_191({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_191));
}
var __VLS_189;
var __VLS_185;
const __VLS_194 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
    label: "分组字段",
}));
const __VLS_196 = __VLS_195({
    label: "分组字段",
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
__VLS_197.slots.default;
const __VLS_198 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    modelValue: (__VLS_ctx.form.groupField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}));
const __VLS_200 = __VLS_199({
    modelValue: (__VLS_ctx.form.groupField),
    clearable: true,
    filterable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
__VLS_201.slots.default;
for (const [field] of __VLS_getVForSourceType((__VLS_ctx.datasetFields))) {
    const __VLS_202 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }));
    const __VLS_204 = __VLS_203({
        key: (field.fieldName),
        label: (field.fieldName),
        value: (field.fieldName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_203));
}
var __VLS_201;
var __VLS_197;
const __VLS_206 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
    label: "配色主题",
}));
const __VLS_208 = __VLS_207({
    label: "配色主题",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
__VLS_209.slots.default;
const __VLS_210 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    modelValue: (__VLS_ctx.form.theme),
    ...{ style: {} },
}));
const __VLS_212 = __VLS_211({
    modelValue: (__VLS_ctx.form.theme),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
__VLS_213.slots.default;
for (const [theme] of __VLS_getVForSourceType((__VLS_ctx.themeOptions))) {
    const __VLS_214 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
        key: (theme),
        label: (theme),
        value: (theme),
    }));
    const __VLS_216 = __VLS_215({
        key: (theme),
        label: (theme),
        value: (theme),
    }, ...__VLS_functionalComponentArgsRest(__VLS_215));
}
var __VLS_213;
var __VLS_209;
const __VLS_218 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
    label: "组件宽度",
    prop: "width",
}));
const __VLS_220 = __VLS_219({
    label: "组件宽度",
    prop: "width",
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
__VLS_221.slots.default;
const __VLS_222 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
    modelValue: (__VLS_ctx.form.width),
    min: (320),
    max: (1400),
    controlsPosition: "right",
    ...{ style: {} },
}));
const __VLS_224 = __VLS_223({
    modelValue: (__VLS_ctx.form.width),
    min: (320),
    max: (1400),
    controlsPosition: "right",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_223));
var __VLS_221;
const __VLS_226 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    label: "组件高度",
    prop: "height",
}));
const __VLS_228 = __VLS_227({
    label: "组件高度",
    prop: "height",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
__VLS_229.slots.default;
const __VLS_230 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
    modelValue: (__VLS_ctx.form.height),
    min: (220),
    max: (900),
    controlsPosition: "right",
    ...{ style: {} },
}));
const __VLS_232 = __VLS_231({
    modelValue: (__VLS_ctx.form.height),
    min: (220),
    max: (900),
    controlsPosition: "right",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_231));
var __VLS_229;
const __VLS_234 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    label: "背景颜色",
}));
const __VLS_236 = __VLS_235({
    label: "背景颜色",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
__VLS_237.slots.default;
const __VLS_238 = {}.ElColorPicker;
/** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
    modelValue: (__VLS_ctx.form.bgColor),
    showAlpha: true,
}));
const __VLS_240 = __VLS_239({
    modelValue: (__VLS_ctx.form.bgColor),
    showAlpha: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
var __VLS_237;
const __VLS_242 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
    label: "说明",
    ...{ class: "form-item-full" },
}));
const __VLS_244 = __VLS_243({
    label: "说明",
    ...{ class: "form-item-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_243));
__VLS_245.slots.default;
const __VLS_246 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
    rows: (3),
    placeholder: "描述该组件适用场景",
}));
const __VLS_248 = __VLS_247({
    modelValue: (__VLS_ctx.form.description),
    type: "textarea",
    rows: (3),
    placeholder: "描述该组件适用场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
var __VLS_245;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "switch-row" },
});
const __VLS_250 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    modelValue: (__VLS_ctx.form.showLegend),
    activeText: "显示图例",
}));
const __VLS_252 = __VLS_251({
    modelValue: (__VLS_ctx.form.showLegend),
    activeText: "显示图例",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
const __VLS_254 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
    modelValue: (__VLS_ctx.form.showLabel),
    activeText: "显示标签",
}));
const __VLS_256 = __VLS_255({
    modelValue: (__VLS_ctx.form.showLabel),
    activeText: "显示标签",
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
const __VLS_258 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({
    modelValue: (__VLS_ctx.form.showGrid),
    activeText: "显示网格",
}));
const __VLS_260 = __VLS_259({
    modelValue: (__VLS_ctx.form.showGrid),
    activeText: "显示网格",
}, ...__VLS_functionalComponentArgsRest(__VLS_259));
const __VLS_262 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
    modelValue: (__VLS_ctx.form.smooth),
    activeText: "平滑曲线",
    disabled: (__VLS_ctx.form.chartType !== 'line'),
}));
const __VLS_264 = __VLS_263({
    modelValue: (__VLS_ctx.form.smooth),
    activeText: "平滑曲线",
    disabled: (__VLS_ctx.form.chartType !== 'line'),
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
const __VLS_266 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    modelValue: (__VLS_ctx.form.areaFill),
    activeText: "面积填充",
    disabled: (__VLS_ctx.form.chartType !== 'line'),
}));
const __VLS_268 = __VLS_267({
    modelValue: (__VLS_ctx.form.areaFill),
    activeText: "面积填充",
    disabled: (__VLS_ctx.form.chartType !== 'line'),
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-title" },
});
if (__VLS_ctx.previewLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
}
if (__VLS_ctx.isPreviewRenderable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "previewChartRef",
        ...{ style: {} },
    });
    /** @type {typeof __VLS_ctx.previewChartRef} */ ;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ style: {} },
    });
    (__VLS_ctx.previewConfigJson);
}
var __VLS_115;
{
    const { footer: __VLS_thisSlot } = __VLS_111.slots;
    const __VLS_270 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
        ...{ 'onClick': {} },
    }));
    const __VLS_272 = __VLS_271({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    let __VLS_274;
    let __VLS_275;
    let __VLS_276;
    const __VLS_277 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_273.slots.default;
    var __VLS_273;
    const __VLS_278 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_280 = __VLS_279({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_279));
    let __VLS_282;
    let __VLS_283;
    let __VLS_284;
    const __VLS_285 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_281.slots.default;
    var __VLS_281;
}
var __VLS_111;
/** @type {__VLS_StyleScopedClasses['asset-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-left']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item-full']} */ ;
/** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-title']} */ ;
// @ts-ignore
var __VLS_117 = __VLS_116;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartTypeLabel: chartTypeLabel,
            loading: loading,
            saving: saving,
            keyword: keyword,
            typeFilter: typeFilter,
            charts: charts,
            datasets: datasets,
            datasetFields: datasetFields,
            dialogVisible: dialogVisible,
            editingId: editingId,
            formRef: formRef,
            themeOptions: themeOptions,
            chartTypeOptions: chartTypeOptions,
            form: form,
            isStaticAssetType: isStaticAssetType,
            rules: rules,
            filteredTemplates: filteredTemplates,
            previewConfigJson: previewConfigJson,
            getTemplateSummary: getTemplateSummary,
            loadAll: loadAll,
            loadDatasetFields: loadDatasetFields,
            applySourceChart: applySourceChart,
            openCreate: openCreate,
            openEdit: openEdit,
            cloneTemplate: cloneTemplate,
            handleSubmit: handleSubmit,
            handleDelete: handleDelete,
            previewChartRef: previewChartRef,
            previewLoading: previewLoading,
            isPreviewRenderable: isPreviewRenderable,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
