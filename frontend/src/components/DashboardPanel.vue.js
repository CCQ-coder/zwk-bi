import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close, Delete, Grid, PieChart, Plus, Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, getDefaultDashboard, removeDashboardComponent, updateDashboardComponent } from '../api/dashboard';
import { getChartData, getChartList } from '../api/chart';
// ---- state ----
const loading = ref(false);
const compLoading = ref(false);
const dashboards = ref([]);
const currentDashboard = ref(null);
const components = ref([]);
const allCharts = ref([]);
const chartMap = ref(new Map());
const kpi = ref({});
const canvasRef = ref(null);
const activeCompId = ref(null);
const MIN_CARD_WIDTH = 320;
const MIN_CARD_HEIGHT = 220;
const LEGACY_GRID_COL_PX = 42;
const LEGACY_GRID_ROW_PX = 70;
// create dashboard dialog
const createDashVisible = ref(false);
const dashSaving = ref(false);
const dashForm = reactive({ name: '' });
// add chart dialog
const addChartVisible = ref(false);
const chartSearch = ref('');
const selectedChartId = ref(null);
const addingChart = ref(false);
const filteredCharts = computed(() => {
    const q = chartSearch.value.toLowerCase();
    return q ? allCharts.value.filter(c => c.name.toLowerCase().includes(q)) : allCharts.value;
});
// echarts instances
const chartRefs = new Map();
const chartInstances = new Map();
const setChartRef = (el, compId) => {
    if (el)
        chartRefs.set(compId, el);
};
const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? 1200, MIN_CARD_WIDTH + 32);
const normalizeLayout = (comp) => {
    if (comp.width <= 24)
        comp.width = Math.max(MIN_CARD_WIDTH, comp.width * LEGACY_GRID_COL_PX);
    if (comp.height <= 12)
        comp.height = Math.max(MIN_CARD_HEIGHT, comp.height * LEGACY_GRID_ROW_PX);
    if (comp.posX <= 24 && comp.width > 24)
        comp.posX = comp.posX * LEGACY_GRID_COL_PX;
    if (comp.posY <= 24 && comp.height > 12)
        comp.posY = comp.posY * LEGACY_GRID_ROW_PX;
    comp.posX = Math.max(0, Number(comp.posX) || 0);
    comp.posY = Math.max(0, Number(comp.posY) || 0);
    comp.width = Math.max(MIN_CARD_WIDTH, Number(comp.width) || MIN_CARD_WIDTH);
    comp.height = Math.max(MIN_CARD_HEIGHT, Number(comp.height) || MIN_CARD_HEIGHT);
    comp.zIndex = Number(comp.zIndex) || 0;
};
const getCardStyle = (comp) => ({
    left: `${comp.posX}px`,
    top: `${comp.posY}px`,
    width: `${comp.width}px`,
    height: `${comp.height}px`,
    zIndex: String(comp.zIndex ?? 0),
});
const canvasMinHeight = computed(() => {
    const occupied = components.value.reduce((max, c) => Math.max(max, (c.posY ?? 0) + (c.height ?? 0) + 20), 0);
    return Math.max(420, occupied);
});
const getMaxZ = () => components.value.reduce((max, c) => Math.max(max, c.zIndex ?? 0), 0);
const focusComponent = (comp) => {
    activeCompId.value = comp.id;
    const maxZ = getMaxZ();
    if ((comp.zIndex ?? 0) <= maxZ)
        comp.zIndex = maxZ + 1;
};
// ---- load ----
const loadAll = async () => {
    loading.value = true;
    try {
        const [dbList, charts, summary] = await Promise.all([
            getDashboardList(),
            getChartList(),
            getDefaultDashboard()
        ]);
        dashboards.value = dbList;
        allCharts.value = charts;
        kpi.value = summary.kpi;
        chartMap.value = new Map(charts.map(c => [c.id, c]));
        if (dbList.length) {
            await selectDashboard(dbList[0]);
        }
    }
    finally {
        loading.value = false;
    }
};
const selectDashboard = async (db) => {
    currentDashboard.value = db;
    await loadComponents();
};
const loadComponents = async () => {
    if (!currentDashboard.value)
        return;
    compLoading.value = true;
    // dispose old instances
    chartInstances.forEach(i => i.dispose());
    chartInstances.clear();
    chartRefs.clear();
    try {
        components.value = await getDashboardComponents(currentDashboard.value.id);
        components.value.forEach(normalizeLayout);
        await nextTick();
        for (const comp of components.value) {
            const chart = chartMap.value.get(comp.chartId);
            if (chart?.xField && chart?.yField)
                renderChart(comp);
        }
    }
    finally {
        compLoading.value = false;
    }
};
// ---- render ----
const buildOption = (data) => {
    const { chartType: type, labels, series } = data;
    if (type === 'pie' || type === 'doughnut') {
        const pieData = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? [];
        return {
            tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
            series: [{ type: 'pie', radius: type === 'doughnut' ? ['40%', '70%'] : '60%', data: pieData }]
        };
    }
    if (type === 'funnel') {
        return {
            tooltip: { trigger: 'item' },
            series: [{ type: 'funnel', data: series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? [] }]
        };
    }
    return {
        tooltip: { trigger: 'axis' },
        legend: series.length > 1 ? {} : undefined,
        grid: { left: 30, right: 20, bottom: 20, top: series.length > 1 ? 36 : 16, containLabel: true },
        xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 30 : 0 } },
        yAxis: { type: 'value' },
        series: series.map(s => ({ name: s.name, type: type === 'bar_horizontal' ? 'bar' : type, data: s.data }))
    };
};
const renderChart = async (comp) => {
    const el = chartRefs.get(comp.id);
    if (!el)
        return;
    try {
        const data = await getChartData(comp.chartId);
        let inst = chartInstances.get(comp.id);
        if (!inst) {
            inst = echarts.init(el);
            chartInstances.set(comp.id, inst);
            window.addEventListener('resize', () => inst?.resize());
        }
        inst.setOption(buildOption(data), true);
    }
    catch { /* ignore */ }
};
let interaction = null;
const findComp = (id) => components.value.find(c => c.id === id);
const persistLayout = async (comp) => {
    if (!currentDashboard.value)
        return;
    try {
        await updateDashboardComponent(currentDashboard.value.id, comp.id, {
            posX: Math.round(comp.posX),
            posY: Math.round(comp.posY),
            width: Math.round(comp.width),
            height: Math.round(comp.height),
            zIndex: comp.zIndex
        });
    }
    catch {
        ElMessage.warning('布局保存失败，请重试');
    }
};
const startDrag = (evt, comp) => {
    focusComponent(comp);
    interaction = {
        mode: 'move',
        compId: comp.id,
        startMouseX: evt.clientX,
        startMouseY: evt.clientY,
        startX: comp.posX,
        startY: comp.posY,
        startWidth: comp.width,
        startHeight: comp.height
    };
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const startResize = (evt, comp) => {
    focusComponent(comp);
    interaction = {
        mode: 'resize',
        compId: comp.id,
        startMouseX: evt.clientX,
        startMouseY: evt.clientY,
        startX: comp.posX,
        startY: comp.posY,
        startWidth: comp.width,
        startHeight: comp.height
    };
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const onPointerMove = (evt) => {
    if (!interaction)
        return;
    const comp = findComp(interaction.compId);
    if (!comp)
        return;
    const dx = evt.clientX - interaction.startMouseX;
    const dy = evt.clientY - interaction.startMouseY;
    if (interaction.mode === 'move') {
        const maxX = Math.max(0, getCanvasWidth() - comp.width);
        comp.posX = Math.min(maxX, Math.max(0, interaction.startX + dx));
        comp.posY = Math.max(0, interaction.startY + dy);
    }
    else {
        const maxWidth = Math.max(MIN_CARD_WIDTH, getCanvasWidth() - comp.posX);
        comp.width = Math.min(maxWidth, Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx));
        comp.height = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy);
        chartInstances.get(comp.id)?.resize();
    }
};
const onPointerUp = async () => {
    if (!interaction)
        return;
    const comp = findComp(interaction.compId);
    interaction = null;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    if (comp) {
        chartInstances.get(comp.id)?.resize();
        await persistLayout(comp);
    }
};
// ---- dashboard CRUD ----
const openCreateDashboard = () => {
    dashForm.name = '';
    createDashVisible.value = true;
};
const handleCreateDashboard = async () => {
    if (!dashForm.name.trim())
        return ElMessage.warning('请输入仪表板名称');
    dashSaving.value = true;
    try {
        const newDb = await createDashboard({ name: dashForm.name });
        dashboards.value.unshift(newDb);
        createDashVisible.value = false;
        await selectDashboard(newDb);
        ElMessage.success('仪表板创建成功');
    }
    finally {
        dashSaving.value = false;
    }
};
const handleDeleteDashboard = async (id) => {
    await deleteDashboard(id);
    dashboards.value = dashboards.value.filter(d => d.id !== id);
    if (currentDashboard.value?.id === id) {
        currentDashboard.value = dashboards.value[0] ?? null;
        if (currentDashboard.value)
            await loadComponents();
        else
            components.value = [];
    }
    ElMessage.success('已删除');
};
// ---- component CRUD ----
const openAddChart = () => {
    selectedChartId.value = null;
    chartSearch.value = '';
    addChartVisible.value = true;
};
const handleAddChart = async () => {
    if (!currentDashboard.value || !selectedChartId.value)
        return;
    addingChart.value = true;
    try {
        // auto pos: place below existing cards in canvas coordinates
        const lastY = components.value.reduce((max, c) => Math.max(max, c.posY + c.height), 0);
        const comp = await addDashboardComponent(currentDashboard.value.id, {
            chartId: selectedChartId.value,
            posX: 12,
            posY: lastY + 12,
            width: 520,
            height: 320,
            zIndex: getMaxZ() + 1
        });
        normalizeLayout(comp);
        components.value.push(comp);
        addChartVisible.value = false;
        ElMessage.success('图表已添加到仪表板');
        await nextTick();
        const chart = chartMap.value.get(comp.chartId);
        if (chart?.xField && chart?.yField)
            renderChart(comp);
    }
    finally {
        addingChart.value = false;
    }
};
const removeComponent = async (compId) => {
    if (!currentDashboard.value)
        return;
    await removeDashboardComponent(currentDashboard.value.id, compId);
    const inst = chartInstances.get(compId);
    if (inst) {
        inst.dispose();
        chartInstances.delete(compId);
    }
    components.value = components.value.filter(c => c.id !== compId);
    ElMessage.success('已从仪表板移除');
};
onMounted(loadAll);
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    chartInstances.forEach(i => i.dispose());
    chartInstances.clear();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-del']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dash-root" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dash-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sidebar-title" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openCreateDashboard)
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-list" },
});
for (const [db] of __VLS_getVForSourceType((__VLS_ctx.dashboards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectDashboard(db);
            } },
        key: (db.id),
        ...{ class: "sidebar-item" },
        ...{ class: ({ active: __VLS_ctx.currentDashboard?.id === db.id }) },
    });
    const __VLS_8 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ class: "sidebar-icon" },
    }));
    const __VLS_10 = __VLS_9({
        ...{ class: "sidebar-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = {}.Grid;
    /** @type {[typeof __VLS_components.Grid, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sidebar-name" },
        title: (db.name),
    });
    (db.name);
    const __VLS_16 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onConfirm': {} },
        title: "确认删除此仪表板？",
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onConfirm': {} },
        title: "确认删除此仪表板？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDeleteDashboard(db.id);
        }
    };
    __VLS_19.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_19.slots;
        const __VLS_24 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onClick': {} },
            ...{ class: "sidebar-del" },
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onClick': {} },
            ...{ class: "sidebar-del" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_28;
        let __VLS_29;
        let __VLS_30;
        const __VLS_31 = {
            onClick: () => { }
        };
        __VLS_27.slots.default;
        const __VLS_32 = {}.Delete;
        /** @type {[typeof __VLS_components.Delete, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
        const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
        var __VLS_27;
    }
    var __VLS_19;
}
if (!__VLS_ctx.dashboards.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "dash-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    const __VLS_36 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }));
    const __VLS_38 = __VLS_37({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-value" },
    });
    (__VLS_ctx.kpi.dashboardCount ?? '--');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-value" },
    });
    (__VLS_ctx.kpi.chartCount ?? '--');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-value" },
    });
    (__VLS_ctx.kpi.datasetCount ?? '--');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kpi-value" },
    });
    (__VLS_ctx.kpi.datasourceCount ?? '--');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-bar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-actions" },
    });
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.openAddChart)
    };
    __VLS_43.slots.default;
    var __VLS_43;
    const __VLS_48 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    __VLS_51.slots.default;
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "layout-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "canvasRef",
        ...{ class: "chart-grid" },
        ...{ style: ({ minHeight: `${__VLS_ctx.canvasMinHeight}px` }) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.compLoading) }, null, null);
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    for (const [comp] of __VLS_getVForSourceType((__VLS_ctx.components))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.focusComponent(comp);
                } },
            key: (comp.id),
            ...{ class: "chart-card" },
            ...{ class: ({ active: __VLS_ctx.activeCompId === comp.id }) },
            ...{ style: (__VLS_ctx.getCardStyle(comp)) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startDrag($event, comp);
                } },
            ...{ class: "chart-card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chart-card-name" },
        });
        (__VLS_ctx.chartMap.get(comp.chartId)?.name ?? '图表');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-card-actions" },
        });
        const __VLS_56 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            size: "small",
            type: "info",
            ...{ style: {} },
        }));
        const __VLS_58 = __VLS_57({
            size: "small",
            type: "info",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_59.slots.default;
        (__VLS_ctx.chartMap.get(comp.chartId)?.chartType ?? '');
        var __VLS_59;
        const __VLS_60 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }));
        const __VLS_62 = __VLS_61({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        let __VLS_64;
        let __VLS_65;
        let __VLS_66;
        const __VLS_67 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(comp.id);
            }
        };
        __VLS_63.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_63.slots;
            const __VLS_68 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                ...{ class: "remove-btn" },
            }));
            const __VLS_70 = __VLS_69({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            __VLS_71.slots.default;
            const __VLS_72 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({}));
            const __VLS_74 = __VLS_73({}, ...__VLS_functionalComponentArgsRest(__VLS_73));
            var __VLS_71;
        }
        var __VLS_63;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ref: ((el) => __VLS_ctx.setChartRef(el, comp.id)),
            ...{ class: "chart-canvas" },
        });
        if (!__VLS_ctx.chartMap.get(comp.chartId)?.xField || !__VLS_ctx.chartMap.get(comp.chartId)?.yField) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "no-field-tip" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, comp);
                } },
            ...{ class: "resize-handle" },
        });
    }
    if (!__VLS_ctx.components.length && !__VLS_ctx.compLoading) {
        const __VLS_76 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }));
        const __VLS_78 = __VLS_77({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
}
const __VLS_80 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_86 = __VLS_85({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "名称",
}));
const __VLS_90 = __VLS_89({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
const __VLS_92 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}));
const __VLS_94 = __VLS_93({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
var __VLS_91;
var __VLS_87;
{
    const { footer: __VLS_thisSlot } = __VLS_83.slots;
    const __VLS_96 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_99.slots.default;
    var __VLS_99;
    const __VLS_104 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_107.slots.default;
    var __VLS_107;
}
var __VLS_83;
const __VLS_112 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_114 = __VLS_113({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_118 = __VLS_117({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chart-pick-list" },
});
for (const [c] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedChartId = c.id;
            } },
        key: (c.id),
        ...{ class: "chart-pick-item" },
        ...{ class: ({ selected: __VLS_ctx.selectedChartId === c.id }) },
    });
    const __VLS_120 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
    const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.PieChart;
    /** @type {[typeof __VLS_components.PieChart, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
    const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
    var __VLS_123;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pick-name" },
    });
    (c.name);
    const __VLS_128 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        size: "small",
        type: "info",
    }));
    const __VLS_130 = __VLS_129({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    (c.chartType);
    var __VLS_131;
}
if (!__VLS_ctx.filteredCharts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_115.slots;
    const __VLS_132 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_136;
    let __VLS_137;
    let __VLS_138;
    const __VLS_139 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addChartVisible = false;
        }
    };
    __VLS_135.slots.default;
    var __VLS_135;
    const __VLS_140 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }));
    const __VLS_142 = __VLS_141({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    let __VLS_144;
    let __VLS_145;
    let __VLS_146;
    const __VLS_147 = {
        onClick: (__VLS_ctx.handleAddChart)
    };
    __VLS_143.slots.default;
    var __VLS_143;
}
var __VLS_115;
/** @type {__VLS_StyleScopedClasses['dash-root']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-del']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-main']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-label']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-value']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-label']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-value']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-label']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-value']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-card']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-label']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-value']} */ ;
/** @type {__VLS_StyleScopedClasses['section-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['no-field-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pick-name']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Close: Close,
            Delete: Delete,
            Grid: Grid,
            PieChart: PieChart,
            Plus: Plus,
            Refresh: Refresh,
            loading: loading,
            compLoading: compLoading,
            dashboards: dashboards,
            currentDashboard: currentDashboard,
            components: components,
            chartMap: chartMap,
            kpi: kpi,
            canvasRef: canvasRef,
            activeCompId: activeCompId,
            createDashVisible: createDashVisible,
            dashSaving: dashSaving,
            dashForm: dashForm,
            addChartVisible: addChartVisible,
            chartSearch: chartSearch,
            selectedChartId: selectedChartId,
            addingChart: addingChart,
            filteredCharts: filteredCharts,
            setChartRef: setChartRef,
            getCardStyle: getCardStyle,
            canvasMinHeight: canvasMinHeight,
            focusComponent: focusComponent,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            startDrag: startDrag,
            startResize: startResize,
            openCreateDashboard: openCreateDashboard,
            handleCreateDashboard: handleCreateDashboard,
            handleDeleteDashboard: handleDeleteDashboard,
            openAddChart: openAddChart,
            handleAddChart: handleAddChart,
            removeComponent: removeComponent,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
