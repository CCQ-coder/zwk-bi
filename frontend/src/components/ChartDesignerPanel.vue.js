import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DataLine, Delete, Edit, PieChart, TrendCharts, Histogram, Plus, RefreshRight } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { createChart, deleteChart, getChartData, getChartList, updateChart } from '../api/chart';
import { getDatasetList, previewDatasetSql } from '../api/dataset';
// ─── 颜色主题 ──────────────────────────────────────────────────────────────────
const COLOR_THEMES = {
    '默认蓝': ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
    '商务灰': ['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0', '#cbb0e3'],
    '暖橙色': ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc'],
    '紫霞粉': ['#9b59b6', '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#1abc9c', '#e67e22', '#95a5a6'],
    '海洋蓝': ['#1890ff', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2', '#3436c7', '#f04864'],
};
const styleConfig = reactive({
    theme: '默认蓝',
    bgColor: '#ffffff',
    showLabel: true,
    labelSize: 12,
    showXName: false,
    showYName: false,
    showGrid: true,
    smooth: false,
    areaFill: false,
    barRadius: 2,
    barMaxWidth: 40,
    legendPos: 'bottom',
});
const propsTab = ref('style');
// ─── 图表类型辅助 ──────────────────────────────────────────────────────────────
const chartTypeLabel = (t) => ({
    bar: '柱状图', bar_horizontal: '条形图', line: '折线图', pie: '饼图',
    doughnut: '环形图', scatter: '散点图', funnel: '漏斗图', gauge: '仪表盘', radar: '雷达图'
}[t] ?? t);
const chartTypeIcon = (t) => {
    if (t === 'pie' || t === 'doughnut')
        return PieChart;
    if (t === 'line')
        return TrendCharts;
    return Histogram;
};
const chartTagType = (t) => {
    if (t === 'pie' || t === 'doughnut')
        return 'warning';
    if (t === 'line')
        return 'success';
    if (t === 'funnel')
        return 'danger';
    return '';
};
const isPieType = computed(() => selected.value?.chartType === 'pie' || selected.value?.chartType === 'doughnut');
const isBarType = computed(() => selected.value?.chartType === 'bar' || selected.value?.chartType === 'bar_horizontal');
const isLineType = computed(() => selected.value?.chartType === 'line');
// ─── 列表 ──────────────────────────────────────────────────────────────────────
const rows = ref([]);
const loading = ref(false);
const sideSearch = ref('');
const selectedId = ref(null);
const selected = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null);
const filteredRows = computed(() => rows.value.filter((r) => !sideSearch.value || r.name.toLowerCase().includes(sideSearch.value.toLowerCase())));
const datasets = ref([]);
const previewColumns = ref([]);
const previewLoading = ref(false);
const loadList = async () => {
    loading.value = true;
    try {
        ;
        [rows.value, datasets.value] = await Promise.all([getChartList(), getDatasetList()]);
        if (!selectedId.value && rows.value.length)
            selectChart(rows.value[0]);
    }
    finally {
        loading.value = false;
    }
};
const selectChart = async (row) => {
    chartData.value = null;
    selectedId.value = row.id;
    await nextTick();
    if (row.xField && row.yField)
        loadChartData(row.id);
};
// ─── 图表渲染 ──────────────────────────────────────────────────────────────────
const chartPreviewRef = ref(null);
const dataLoading = ref(false);
let echart = null;
const chartData = ref(null);
const previewRows = computed(() => (chartData.value?.rawRows ?? chartData.value?.labels.map((lbl, i) => {
    const row = {};
    if (selected.value?.xField)
        row[selected.value.xField] = lbl;
    chartData.value?.series.forEach(s => { if (selected.value?.yField)
        row[selected.value.yField] = s.data[i]; });
    return row;
}) ?? []).slice(0, 5));
const loadChartData = async (id) => {
    if (!chartPreviewRef.value)
        return;
    dataLoading.value = true;
    try {
        const data = await getChartData(id);
        chartData.value = data;
        if (!echart) {
            echart = echarts.init(chartPreviewRef.value, null, { renderer: 'canvas' });
            window.addEventListener('resize', () => echart?.resize());
        }
        echart.setOption(buildEChartsOption(data), true);
    }
    catch {
        ElMessage.error('图表数据加载失败');
    }
    finally {
        dataLoading.value = false;
    }
};
const rerender = () => {
    if (!echart || !chartData.value)
        return;
    echart.setOption(buildEChartsOption(chartData.value), true);
};
const applyTheme = (name) => {
    styleConfig.theme = name;
    rerender();
};
watch(chartPreviewRef, (el) => {
    if (!el && echart) {
        echart.dispose();
        echart = null;
    }
});
const buildEChartsOption = (data) => {
    const { chartType: type, labels, series } = data;
    const colors = COLOR_THEMES[styleConfig.theme] ?? COLOR_THEMES['默认蓝'];
    const labelOpt = {
        show: styleConfig.showLabel,
        fontSize: styleConfig.labelSize,
        color: '#333',
    };
    if (type === 'pie' || type === 'doughnut') {
        const pieData = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? [];
        const legendOrient = styleConfig.legendPos === 'right' ? 'vertical' : 'horizontal';
        const legendPos = styleConfig.legendPos === 'right'
            ? { orient: 'vertical', right: 10, top: 'center' }
            : styleConfig.legendPos === 'top'
                ? { orient: 'horizontal', top: 10 }
                : { orient: 'horizontal', bottom: 0 };
        return {
            color: colors,
            backgroundColor: styleConfig.bgColor,
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            legend: { type: 'scroll', ...legendPos },
            series: [{
                    type: 'pie',
                    radius: type === 'doughnut' ? ['38%', '65%'] : '60%',
                    data: pieData,
                    label: { ...labelOpt, formatter: '{b}: {d}%' },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
                }]
        };
    }
    if (type === 'funnel') {
        const fd = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? [];
        return {
            color: colors,
            backgroundColor: styleConfig.bgColor,
            tooltip: { trigger: 'item', formatter: '{b}: {c}' },
            series: [{ type: 'funnel', left: '10%', width: '80%', label: { ...labelOpt }, data: fd }]
        };
    }
    if (type === 'gauge') {
        const val = Number(series[0]?.data[0] ?? 0);
        return {
            color: colors,
            backgroundColor: styleConfig.bgColor,
            series: [{ type: 'gauge', detail: { formatter: '{value}' }, data: [{ value: val, name: labels[0] ?? '' }] }]
        };
    }
    const isH = type === 'bar_horizontal';
    const gridSplitLine = styleConfig.showGrid ? {} : { splitLine: { show: false } };
    const seriesArr = series.map((s) => {
        const base = {
            name: s.name,
            type: isH ? 'bar' : type === 'scatter' ? 'scatter' : type,
            data: s.data,
        };
        if (styleConfig.showLabel) {
            base.label = { show: true, fontSize: styleConfig.labelSize,
                position: isH ? 'right' : 'top' };
        }
        if (type === 'bar' || type === 'bar_horizontal') {
            base.itemStyle = { borderRadius: styleConfig.barRadius };
            base.barMaxWidth = styleConfig.barMaxWidth;
        }
        if (type === 'line') {
            base.smooth = styleConfig.smooth;
            if (styleConfig.areaFill)
                base.areaStyle = { opacity: 0.3 };
        }
        return base;
    });
    return {
        color: colors,
        backgroundColor: styleConfig.bgColor,
        tooltip: { trigger: 'axis' },
        legend: series.length > 1 ? { type: 'scroll', top: 4 } : undefined,
        grid: { left: 16, right: 16, bottom: 8, top: series.length > 1 ? 36 : 24, containLabel: true },
        ...(isH
            ? { xAxis: { type: 'value', ...gridSplitLine, name: styleConfig.showXName ? (selected.value?.yField ?? '') : '' },
                yAxis: { type: 'category', data: labels, name: styleConfig.showYName ? (selected.value?.xField ?? '') : '' } }
            : { xAxis: { type: 'category', data: labels,
                    axisLabel: { rotate: labels.length > 8 ? 30 : 0 },
                    name: styleConfig.showXName ? (selected.value?.xField ?? '') : '' },
                yAxis: { type: 'value', ...gridSplitLine, name: styleConfig.showYName ? (selected.value?.yField ?? '') : '' } }),
        series: seriesArr
    };
};
// ─── 弹窗 CRUD ──────────────────────────────────────────────────────────────────
const dialogVisible = ref(false);
const saving = ref(false);
const editId = ref(null);
const formRef = ref();
const emptyForm = () => ({ name: '', datasetId: '', chartType: '', xField: '', yField: '', groupField: '' });
const form = reactive(emptyForm());
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    datasetId: [{ required: true, message: '请选择数据集', trigger: 'change' }],
    chartType: [{ required: true, message: '请选择图表类型', trigger: 'change' }]
};
const onDatasetChange = async (dsId) => {
    previewColumns.value = [];
    if (!dsId)
        return;
    previewLoading.value = true;
    try {
        const ds = datasets.value.find((d) => d.id === dsId);
        if (ds) {
            const r = await previewDatasetSql({ datasourceId: ds.datasourceId, sqlText: ds.sqlText });
            previewColumns.value = r.columns;
        }
    }
    catch { /* ignore */ }
    finally {
        previewLoading.value = false;
    }
};
const openCreate = () => {
    editId.value = null;
    Object.assign(form, emptyForm());
    previewColumns.value = [];
    dialogVisible.value = true;
};
const openEdit = (row) => {
    editId.value = row.id;
    form.name = row.name;
    form.datasetId = row.datasetId;
    form.chartType = row.chartType;
    form.xField = row.xField ?? '';
    form.yField = row.yField ?? '';
    form.groupField = row.groupField ?? '';
    previewColumns.value = [];
    dialogVisible.value = true;
    onDatasetChange(row.datasetId);
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        if (editId.value) {
            const updated = await updateChart(editId.value, form);
            ElMessage.success('更新成功');
            dialogVisible.value = false;
            await loadList();
            selectedId.value = updated.id;
            if (updated.xField && updated.yField)
                loadChartData(updated.id);
        }
        else {
            const created = await createChart(form);
            ElMessage.success('创建成功');
            dialogVisible.value = false;
            await loadList();
            selectedId.value = created.id;
            if (created.xField && created.yField)
                loadChartData(created.id);
        }
    }
    finally {
        saving.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteChart(id);
    ElMessage.success('删除成功');
    selectedId.value = null;
    chartData.value = null;
    await loadList();
};
onMounted(loadList);
onBeforeUnmount(() => { echart?.dispose(); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-name']} */ ;
/** @type {__VLS_StyleScopedClasses['props-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['props-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['props-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['props-theme-item']} */ ;
/** @type {__VLS_StyleScopedClasses['props-theme-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cdesigner-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "cdesigner-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cdesigner-sidebar-head" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.sideSearch),
    size: "small",
    placeholder: "搜索图表",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.sideSearch),
    size: "small",
    placeholder: "搜索图表",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.openCreate)
};
var __VLS_7;
const __VLS_12 = {}.ElScrollbar;
/** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: "cdesigner-sidebar-body" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "cdesigner-sidebar-body" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filteredRows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectChart(row);
            } },
        key: (row.id),
        ...{ class: "cdesigner-chart-item" },
        ...{ class: ({ active: __VLS_ctx.selectedId === row.id }) },
    });
    const __VLS_16 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ class: "chart-type-icon" },
    }));
    const __VLS_18 = __VLS_17({
        ...{ class: "chart-type-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = ((__VLS_ctx.chartTypeIcon(row.chartType)));
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-chart-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cdesigner-chart-name" },
        title: (row.name),
    });
    (row.name);
    const __VLS_24 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: "small",
        type: (__VLS_ctx.chartTagType(row.chartType)),
        ...{ class: "cdesigner-chart-tag" },
    }));
    const __VLS_26 = __VLS_25({
        size: "small",
        type: (__VLS_ctx.chartTagType(row.chartType)),
        ...{ class: "cdesigner-chart-tag" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    (__VLS_ctx.chartTypeLabel(row.chartType));
    var __VLS_27;
}
if (__VLS_ctx.filteredRows.length === 0 && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-empty" },
    });
}
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "cdesigner-canvas" },
});
if (!__VLS_ctx.selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-canvas-empty" },
    });
    const __VLS_28 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        description: "请在左侧选择或新建图表",
        imageSize: (80),
    }));
    const __VLS_30 = __VLS_29({
        description: "请在左侧选择或新建图表",
        imageSize: (80),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cdesigner-chart-title" },
    });
    (__VLS_ctx.selected.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-toolbar-actions" },
    });
    const __VLS_32 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selected);
        }
    };
    __VLS_35.slots.default;
    var __VLS_35;
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.RefreshRight),
        loading: (__VLS_ctx.dataLoading),
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.RefreshRight),
        loading: (__VLS_ctx.dataLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.loadChartData(__VLS_ctx.selected.id);
        }
    };
    __VLS_43.slots.default;
    var __VLS_43;
    const __VLS_48 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onConfirm': {} },
        title: "确认删除此图表？",
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onConfirm': {} },
        title: "确认删除此图表？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onConfirm: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.handleDelete(__VLS_ctx.selected.id);
        }
    };
    __VLS_51.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_51.slots;
        const __VLS_56 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }));
        const __VLS_58 = __VLS_57({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_59.slots.default;
        var __VLS_59;
    }
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-meta-bar" },
    });
    const __VLS_60 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        size: "small",
        effect: "plain",
        type: "info",
    }));
    const __VLS_62 = __VLS_61({
        size: "small",
        effect: "plain",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_63.slots.default;
    (__VLS_ctx.chartTypeLabel(__VLS_ctx.selected.chartType));
    var __VLS_63;
    const __VLS_64 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        size: "small",
        effect: "plain",
        type: "success",
    }));
    const __VLS_66 = __VLS_65({
        size: "small",
        effect: "plain",
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    (__VLS_ctx.selected.xField || '未设置');
    var __VLS_67;
    const __VLS_68 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        size: "small",
        effect: "plain",
        type: "warning",
    }));
    const __VLS_70 = __VLS_69({
        size: "small",
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_71.slots.default;
    (__VLS_ctx.selected.yField || '未设置');
    var __VLS_71;
    if (__VLS_ctx.selected.groupField) {
        const __VLS_72 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            size: "small",
            effect: "plain",
        }));
        const __VLS_74 = __VLS_73({
            size: "small",
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        (__VLS_ctx.selected.groupField);
        var __VLS_75;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cdesigner-canvas-body" },
    });
    if (!__VLS_ctx.selected.xField || !__VLS_ctx.selected.yField) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cdesigner-no-field" },
        });
        const __VLS_76 = {}.ElAlert;
        /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            title: "未配置字段",
            type: "warning",
            showIcon: true,
            closable: (false),
            description: "点击工具栏「编辑配置」，设置 X 轴（维度）与 Y 轴（度量）字段后图表将自动渲染。",
        }));
        const __VLS_78 = __VLS_77({
            title: "未配置字段",
            type: "warning",
            showIcon: true,
            closable: (false),
            description: "点击工具栏「编辑配置」，设置 X 轴（维度）与 Y 轴（度量）字段后图表将自动渲染。",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ref: "chartPreviewRef",
            ...{ class: "cdesigner-echarts" },
        });
        /** @type {typeof __VLS_ctx.chartPreviewRef} */ ;
    }
}
if (__VLS_ctx.selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "cdesigner-props" },
    });
    const __VLS_80 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        modelValue: (__VLS_ctx.propsTab),
        size: "small",
        ...{ class: "props-tabs" },
    }));
    const __VLS_82 = __VLS_81({
        modelValue: (__VLS_ctx.propsTab),
        size: "small",
        ...{ class: "props-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    const __VLS_84 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: "样式",
        name: "style",
    }));
    const __VLS_86 = __VLS_85({
        label: "样式",
        name: "style",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
    const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-colors" },
    });
    for (const [theme, name] of __VLS_getVForSourceType((__VLS_ctx.COLOR_THEMES))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selected))
                        return;
                    __VLS_ctx.applyTheme(name);
                } },
            key: (name),
            ...{ class: "props-theme-item" },
            ...{ class: ({ selected: __VLS_ctx.styleConfig.theme === name }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-theme-swatches" },
        });
        for (const [c] of __VLS_getVForSourceType((theme.slice(0, 5)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                key: (c),
                ...{ class: "props-swatch" },
                ...{ style: ({ background: c }) },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-theme-name" },
        });
        (name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "props-label" },
    });
    const __VLS_92 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.bgColor),
        size: "small",
        showAlpha: true,
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.bgColor),
        size: "small",
        showAlpha: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onChange: (__VLS_ctx.rerender)
    };
    var __VLS_95;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "props-label" },
    });
    const __VLS_100 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.showLabel),
        size: "small",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.showLabel),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onChange: (__VLS_ctx.rerender)
    };
    var __VLS_103;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "props-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "props-label" },
    });
    const __VLS_108 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.styleConfig.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onChange: (__VLS_ctx.rerender)
    };
    var __VLS_111;
    if (!__VLS_ctx.isPieType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_116 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showXName),
            size: "small",
        }));
        const __VLS_118 = __VLS_117({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showXName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        let __VLS_120;
        let __VLS_121;
        let __VLS_122;
        const __VLS_123 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_119;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_124 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showYName),
            size: "small",
        }));
        const __VLS_126 = __VLS_125({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showYName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        let __VLS_128;
        let __VLS_129;
        let __VLS_130;
        const __VLS_131 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_127;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_132 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showGrid),
            size: "small",
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.showGrid),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_135;
    }
    if (__VLS_ctx.isBarType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_140 = {}.ElSlider;
        /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.barRadius),
            min: (0),
            max: (20),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.barRadius),
            min: (0),
            max: (20),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_144;
        let __VLS_145;
        let __VLS_146;
        const __VLS_147 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_143;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_148 = {}.ElSlider;
        /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.barMaxWidth),
            min: (10),
            max: (80),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_150 = __VLS_149({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.barMaxWidth),
            min: (10),
            max: (80),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        let __VLS_152;
        let __VLS_153;
        let __VLS_154;
        const __VLS_155 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_151;
    }
    if (__VLS_ctx.isLineType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_156 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.smooth),
            size: "small",
        }));
        const __VLS_158 = __VLS_157({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.smooth),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        let __VLS_160;
        let __VLS_161;
        let __VLS_162;
        const __VLS_163 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_159;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_164 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.areaFill),
            size: "small",
        }));
        const __VLS_166 = __VLS_165({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.areaFill),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        let __VLS_168;
        let __VLS_169;
        let __VLS_170;
        const __VLS_171 = {
            onChange: (__VLS_ctx.rerender)
        };
        var __VLS_167;
    }
    if (__VLS_ctx.isPieType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "props-label" },
        });
        const __VLS_172 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.legendPos),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_174 = __VLS_173({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.styleConfig.legendPos),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        let __VLS_176;
        let __VLS_177;
        let __VLS_178;
        const __VLS_179 = {
            onChange: (__VLS_ctx.rerender)
        };
        __VLS_175.slots.default;
        const __VLS_180 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            value: "bottom",
            label: "底部",
        }));
        const __VLS_182 = __VLS_181({
            value: "bottom",
            label: "底部",
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        const __VLS_184 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            value: "right",
            label: "右侧",
        }));
        const __VLS_186 = __VLS_185({
            value: "right",
            label: "右侧",
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        const __VLS_188 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            value: "top",
            label: "顶部",
        }));
        const __VLS_190 = __VLS_189({
            value: "top",
            label: "顶部",
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
        var __VLS_175;
    }
    var __VLS_91;
    var __VLS_87;
    const __VLS_192 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        label: "数据",
        name: "data",
    }));
    const __VLS_194 = __VLS_193({
        label: "数据",
        name: "data",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    __VLS_195.slots.default;
    const __VLS_196 = {}.ElScrollbar;
    /** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    if (__VLS_ctx.chartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.chartData.columns))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (col),
                ...{ class: "props-field-row" },
            });
            const __VLS_200 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
                ...{ style: {} },
            }));
            const __VLS_202 = __VLS_201({
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            __VLS_203.slots.default;
            const __VLS_204 = {}.DataLine;
            /** @type {[typeof __VLS_components.DataLine, ]} */ ;
            // @ts-ignore
            const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({}));
            const __VLS_206 = __VLS_205({}, ...__VLS_functionalComponentArgsRest(__VLS_205));
            var __VLS_203;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ style: {} },
            });
            (col);
        }
    }
    if (__VLS_ctx.chartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "props-section-title" },
        });
        const __VLS_208 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
            data: (__VLS_ctx.previewRows),
            size: "small",
            border: true,
            maxHeight: "240",
            ...{ style: {} },
        }));
        const __VLS_210 = __VLS_209({
            data: (__VLS_ctx.previewRows),
            size: "small",
            border: true,
            maxHeight: "240",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        __VLS_211.slots.default;
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.chartData.columns))) {
            const __VLS_212 = {}.ElTableColumn;
            /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
            // @ts-ignore
            const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "80",
                showOverflowTooltip: true,
            }));
            const __VLS_214 = __VLS_213({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "80",
                showOverflowTooltip: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        }
        var __VLS_211;
    }
    if (!__VLS_ctx.chartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cdesigner-empty" },
            ...{ style: {} },
        });
    }
    var __VLS_199;
    var __VLS_195;
    var __VLS_83;
}
const __VLS_216 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑图表' : '新建图表'),
    width: "580px",
    destroyOnClose: true,
}));
const __VLS_218 = __VLS_217({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑图表' : '新建图表'),
    width: "580px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
__VLS_219.slots.default;
const __VLS_220 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "110px",
}));
const __VLS_222 = __VLS_221({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "110px",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_224 = {};
__VLS_223.slots.default;
const __VLS_226 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    label: "图表名称",
    prop: "name",
}));
const __VLS_228 = __VLS_227({
    label: "图表名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
__VLS_229.slots.default;
const __VLS_230 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入图表名称",
}));
const __VLS_232 = __VLS_231({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入图表名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_231));
var __VLS_229;
const __VLS_234 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    label: "数据集",
    prop: "datasetId",
}));
const __VLS_236 = __VLS_235({
    label: "数据集",
    prop: "datasetId",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
__VLS_237.slots.default;
const __VLS_238 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasetId),
    placeholder: "请选择",
    ...{ style: {} },
}));
const __VLS_240 = __VLS_239({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasetId),
    placeholder: "请选择",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
let __VLS_242;
let __VLS_243;
let __VLS_244;
const __VLS_245 = {
    onChange: (__VLS_ctx.onDatasetChange)
};
__VLS_241.slots.default;
for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
    const __VLS_246 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
        key: (ds.id),
        label: (ds.name),
        value: (ds.id),
    }));
    const __VLS_248 = __VLS_247({
        key: (ds.id),
        label: (ds.name),
        value: (ds.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_247));
}
var __VLS_241;
var __VLS_237;
const __VLS_250 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    label: "图表类型",
    prop: "chartType",
}));
const __VLS_252 = __VLS_251({
    label: "图表类型",
    prop: "chartType",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
__VLS_253.slots.default;
const __VLS_254 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
    modelValue: (__VLS_ctx.form.chartType),
    placeholder: "请选择",
    ...{ style: {} },
}));
const __VLS_256 = __VLS_255({
    modelValue: (__VLS_ctx.form.chartType),
    placeholder: "请选择",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
__VLS_257.slots.default;
const __VLS_258 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({
    label: "柱/条图",
}));
const __VLS_260 = __VLS_259({
    label: "柱/条图",
}, ...__VLS_functionalComponentArgsRest(__VLS_259));
__VLS_261.slots.default;
const __VLS_262 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
    label: "基础柱状图",
    value: "bar",
}));
const __VLS_264 = __VLS_263({
    label: "基础柱状图",
    value: "bar",
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
const __VLS_266 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    label: "堆叠柱状图",
    value: "bar_stack",
}));
const __VLS_268 = __VLS_267({
    label: "堆叠柱状图",
    value: "bar_stack",
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
const __VLS_270 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
    label: "百分比柱状图",
    value: "bar_percent",
}));
const __VLS_272 = __VLS_271({
    label: "百分比柱状图",
    value: "bar_percent",
}, ...__VLS_functionalComponentArgsRest(__VLS_271));
const __VLS_274 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
    label: "分组柱状图",
    value: "bar_group",
}));
const __VLS_276 = __VLS_275({
    label: "分组柱状图",
    value: "bar_group",
}, ...__VLS_functionalComponentArgsRest(__VLS_275));
const __VLS_278 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
    label: "基础条形图",
    value: "bar_horizontal",
}));
const __VLS_280 = __VLS_279({
    label: "基础条形图",
    value: "bar_horizontal",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
const __VLS_282 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
    label: "堆叠条形图",
    value: "bar_horizontal_stack",
}));
const __VLS_284 = __VLS_283({
    label: "堆叠条形图",
    value: "bar_horizontal_stack",
}, ...__VLS_functionalComponentArgsRest(__VLS_283));
var __VLS_261;
const __VLS_286 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent(__VLS_286, new __VLS_286({
    label: "线/面图",
}));
const __VLS_288 = __VLS_287({
    label: "线/面图",
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
__VLS_289.slots.default;
const __VLS_290 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    label: "基础折线图",
    value: "line",
}));
const __VLS_292 = __VLS_291({
    label: "基础折线图",
    value: "line",
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
const __VLS_294 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_295 = __VLS_asFunctionalComponent(__VLS_294, new __VLS_294({
    label: "面积图",
    value: "area",
}));
const __VLS_296 = __VLS_295({
    label: "面积图",
    value: "area",
}, ...__VLS_functionalComponentArgsRest(__VLS_295));
const __VLS_298 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
    label: "堆叠折线图",
    value: "line_stack",
}));
const __VLS_300 = __VLS_299({
    label: "堆叠折线图",
    value: "line_stack",
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
var __VLS_289;
const __VLS_302 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
    label: "分布图",
}));
const __VLS_304 = __VLS_303({
    label: "分布图",
}, ...__VLS_functionalComponentArgsRest(__VLS_303));
__VLS_305.slots.default;
const __VLS_306 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
    label: "饼图",
    value: "pie",
}));
const __VLS_308 = __VLS_307({
    label: "饼图",
    value: "pie",
}, ...__VLS_functionalComponentArgsRest(__VLS_307));
const __VLS_310 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_311 = __VLS_asFunctionalComponent(__VLS_310, new __VLS_310({
    label: "环形图",
    value: "doughnut",
}));
const __VLS_312 = __VLS_311({
    label: "环形图",
    value: "doughnut",
}, ...__VLS_functionalComponentArgsRest(__VLS_311));
const __VLS_314 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({
    label: "玫瑰图",
    value: "rose",
}));
const __VLS_316 = __VLS_315({
    label: "玫瑰图",
    value: "rose",
}, ...__VLS_functionalComponentArgsRest(__VLS_315));
const __VLS_318 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_319 = __VLS_asFunctionalComponent(__VLS_318, new __VLS_318({
    label: "雷达图",
    value: "radar",
}));
const __VLS_320 = __VLS_319({
    label: "雷达图",
    value: "radar",
}, ...__VLS_functionalComponentArgsRest(__VLS_319));
const __VLS_322 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_323 = __VLS_asFunctionalComponent(__VLS_322, new __VLS_322({
    label: "漏斗图",
    value: "funnel",
}));
const __VLS_324 = __VLS_323({
    label: "漏斗图",
    value: "funnel",
}, ...__VLS_functionalComponentArgsRest(__VLS_323));
const __VLS_326 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_327 = __VLS_asFunctionalComponent(__VLS_326, new __VLS_326({
    label: "矩形树图",
    value: "treemap",
}));
const __VLS_328 = __VLS_327({
    label: "矩形树图",
    value: "treemap",
}, ...__VLS_functionalComponentArgsRest(__VLS_327));
var __VLS_305;
const __VLS_330 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
    label: "关系图",
}));
const __VLS_332 = __VLS_331({
    label: "关系图",
}, ...__VLS_functionalComponentArgsRest(__VLS_331));
__VLS_333.slots.default;
const __VLS_334 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_335 = __VLS_asFunctionalComponent(__VLS_334, new __VLS_334({
    label: "散点图",
    value: "scatter",
}));
const __VLS_336 = __VLS_335({
    label: "散点图",
    value: "scatter",
}, ...__VLS_functionalComponentArgsRest(__VLS_335));
var __VLS_333;
const __VLS_338 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_339 = __VLS_asFunctionalComponent(__VLS_338, new __VLS_338({
    label: "指标",
}));
const __VLS_340 = __VLS_339({
    label: "指标",
}, ...__VLS_functionalComponentArgsRest(__VLS_339));
__VLS_341.slots.default;
const __VLS_342 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_343 = __VLS_asFunctionalComponent(__VLS_342, new __VLS_342({
    label: "仪表盘",
    value: "gauge",
}));
const __VLS_344 = __VLS_343({
    label: "仪表盘",
    value: "gauge",
}, ...__VLS_functionalComponentArgsRest(__VLS_343));
var __VLS_341;
const __VLS_346 = {}.ElOptionGroup;
/** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
// @ts-ignore
const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
    label: "表格",
}));
const __VLS_348 = __VLS_347({
    label: "表格",
}, ...__VLS_functionalComponentArgsRest(__VLS_347));
__VLS_349.slots.default;
const __VLS_350 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
    label: "明细表",
    value: "table",
}));
const __VLS_352 = __VLS_351({
    label: "明细表",
    value: "table",
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
var __VLS_349;
var __VLS_257;
var __VLS_253;
const __VLS_354 = {}.ElDivider;
/** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
// @ts-ignore
const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
    contentPosition: "left",
    ...{ style: {} },
}));
const __VLS_356 = __VLS_355({
    contentPosition: "left",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_355));
__VLS_357.slots.default;
var __VLS_357;
const __VLS_358 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
    label: "X轴（维度）",
}));
const __VLS_360 = __VLS_359({
    label: "X轴（维度）",
}, ...__VLS_functionalComponentArgsRest(__VLS_359));
__VLS_361.slots.default;
const __VLS_362 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({
    modelValue: (__VLS_ctx.form.xField),
    placeholder: "选择列",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_364 = __VLS_363({
    modelValue: (__VLS_ctx.form.xField),
    placeholder: "选择列",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_363));
__VLS_365.slots.default;
for (const [col] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
    const __VLS_366 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
        key: (col),
        label: (col),
        value: (col),
    }));
    const __VLS_368 = __VLS_367({
        key: (col),
        label: (col),
        value: (col),
    }, ...__VLS_functionalComponentArgsRest(__VLS_367));
}
var __VLS_365;
var __VLS_361;
const __VLS_370 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent(__VLS_370, new __VLS_370({
    label: "Y轴（度量）",
}));
const __VLS_372 = __VLS_371({
    label: "Y轴（度量）",
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
__VLS_373.slots.default;
const __VLS_374 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
    modelValue: (__VLS_ctx.form.yField),
    placeholder: "选择列",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_376 = __VLS_375({
    modelValue: (__VLS_ctx.form.yField),
    placeholder: "选择列",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
__VLS_377.slots.default;
for (const [col] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
    const __VLS_378 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
        key: (col),
        label: (col),
        value: (col),
    }));
    const __VLS_380 = __VLS_379({
        key: (col),
        label: (col),
        value: (col),
    }, ...__VLS_functionalComponentArgsRest(__VLS_379));
}
var __VLS_377;
var __VLS_373;
const __VLS_382 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
    label: "分组字段",
}));
const __VLS_384 = __VLS_383({
    label: "分组字段",
}, ...__VLS_functionalComponentArgsRest(__VLS_383));
__VLS_385.slots.default;
const __VLS_386 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
    modelValue: (__VLS_ctx.form.groupField),
    placeholder: "可选",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_388 = __VLS_387({
    modelValue: (__VLS_ctx.form.groupField),
    placeholder: "可选",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_387));
__VLS_389.slots.default;
for (const [col] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
    const __VLS_390 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
        key: (col),
        label: (col),
        value: (col),
    }));
    const __VLS_392 = __VLS_391({
        key: (col),
        label: (col),
        value: (col),
    }, ...__VLS_functionalComponentArgsRest(__VLS_391));
}
var __VLS_389;
var __VLS_385;
if (__VLS_ctx.previewLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
var __VLS_223;
{
    const { footer: __VLS_thisSlot } = __VLS_219.slots;
    const __VLS_394 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_395 = __VLS_asFunctionalComponent(__VLS_394, new __VLS_394({
        ...{ 'onClick': {} },
    }));
    const __VLS_396 = __VLS_395({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_395));
    let __VLS_398;
    let __VLS_399;
    let __VLS_400;
    const __VLS_401 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_397.slots.default;
    var __VLS_397;
    const __VLS_402 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_403 = __VLS_asFunctionalComponent(__VLS_402, new __VLS_402({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_404 = __VLS_403({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_403));
    let __VLS_406;
    let __VLS_407;
    let __VLS_408;
    const __VLS_409 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_405.slots.default;
    var __VLS_405;
}
var __VLS_219;
/** @type {__VLS_StyleScopedClasses['cdesigner-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-sidebar-head']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-sidebar-body']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-info']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-canvas-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-meta-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-canvas-body']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-no-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-echarts']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-props']} */ ;
/** @type {__VLS_StyleScopedClasses['props-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['props-theme-item']} */ ;
/** @type {__VLS_StyleScopedClasses['props-theme-swatches']} */ ;
/** @type {__VLS_StyleScopedClasses['props-swatch']} */ ;
/** @type {__VLS_StyleScopedClasses['props-theme-name']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-label']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['props-field-row']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section']} */ ;
/** @type {__VLS_StyleScopedClasses['props-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cdesigner-empty']} */ ;
// @ts-ignore
var __VLS_225 = __VLS_224;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataLine: DataLine,
            Delete: Delete,
            Edit: Edit,
            Plus: Plus,
            RefreshRight: RefreshRight,
            COLOR_THEMES: COLOR_THEMES,
            styleConfig: styleConfig,
            propsTab: propsTab,
            chartTypeLabel: chartTypeLabel,
            chartTypeIcon: chartTypeIcon,
            chartTagType: chartTagType,
            isPieType: isPieType,
            isBarType: isBarType,
            isLineType: isLineType,
            loading: loading,
            sideSearch: sideSearch,
            selectedId: selectedId,
            selected: selected,
            filteredRows: filteredRows,
            datasets: datasets,
            previewColumns: previewColumns,
            previewLoading: previewLoading,
            selectChart: selectChart,
            chartPreviewRef: chartPreviewRef,
            dataLoading: dataLoading,
            chartData: chartData,
            previewRows: previewRows,
            loadChartData: loadChartData,
            rerender: rerender,
            applyTheme: applyTheme,
            dialogVisible: dialogVisible,
            saving: saving,
            editId: editId,
            formRef: formRef,
            form: form,
            rules: rules,
            onDatasetChange: onDatasetChange,
            openCreate: openCreate,
            openEdit: openEdit,
            handleSubmit: handleSubmit,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
