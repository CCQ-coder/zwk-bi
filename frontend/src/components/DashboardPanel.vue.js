import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close, Delete, Download, Grid, PieChart, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, getDefaultDashboard, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { getChartData, getChartList } from '../api/chart';
import { buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, mergeComponentRequestFilters, materializeChartData, normalizeComponentConfig, } from '../utils/component-config';
import { buildPublishedLink, buildReportConfig, normalizePublishConfig, parseReportConfig } from '../utils/report-config';
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
const dashboardSearch = ref('');
const shareVisible = ref(false);
const publishVisible = ref(false);
const publishSaving = ref(false);
const publishForm = reactive({
    published: false,
    allowAnonymousAccess: true,
    allowedRoles: ['ADMIN', 'ANALYST'],
    shareToken: ''
});
// add chart dialog
const addChartVisible = ref(false);
const chartSearch = ref('');
const selectedChartId = ref(null);
const addingChart = ref(false);
const filteredCharts = computed(() => {
    const q = chartSearch.value.toLowerCase();
    return q ? allCharts.value.filter(c => c.name.toLowerCase().includes(q)) : allCharts.value;
});
const filteredDashboards = computed(() => {
    const q = dashboardSearch.value.trim().toLowerCase();
    return q ? dashboards.value.filter(d => d.name.toLowerCase().includes(q)) : dashboards.value;
});
const shareLink = computed(() => currentDashboard.value
    ? buildPublishedLink('dashboard', currentDashboard.value.id, currentPublishConfig.value.shareToken)
    : '');
const previewLink = computed(() => currentDashboard.value
    ? `${window.location.origin}/preview/dashboard/${currentDashboard.value.id}`
    : '');
const roleOptions = ['ADMIN', 'ANALYST', 'VIEWER'];
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish));
const isPublished = computed(() => currentPublishConfig.value.status === 'PUBLISHED');
const draftPublishedLink = computed(() => currentDashboard.value
    ? buildPublishedLink('dashboard', currentDashboard.value.id, publishForm.shareToken || currentPublishConfig.value.shareToken)
    : '');
const activeComponent = computed(() => components.value.find((item) => item.id === activeCompId.value) ?? null);
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null);
const getComponentConfig = (comp) => normalizeComponentConfig(comp.configJson, chartMap.value.get(comp.chartId));
const getComponentChartConfig = (comp) => getComponentConfig(comp).chart;
const showNoField = (comp) => getMissingChartFields(getComponentChartConfig(comp)).length > 0;
const isRenderableChart = (comp) => isCanvasRenderableChartType(getComponentChartConfig(comp).chartType ?? '');
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
const getCardStyle = (comp) => {
    const style = getComponentConfig(comp).style;
    const shadow = style.shadowShow
        ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
        : undefined;
    return {
        left: `${comp.posX}px`,
        top: `${comp.posY}px`,
        width: `${comp.width}px`,
        height: `${comp.height}px`,
        zIndex: String(comp.zIndex ?? 0),
        opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
        boxShadow: shadow,
        padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
    };
};
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
const applyLayoutPatch = async (patch) => {
    const comp = activeComponent.value;
    if (!comp)
        return;
    if (typeof patch.posX === 'number')
        comp.posX = Math.max(0, Math.round(patch.posX));
    if (typeof patch.posY === 'number')
        comp.posY = Math.max(0, Math.round(patch.posY));
    if (typeof patch.width === 'number')
        comp.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width));
    if (typeof patch.height === 'number')
        comp.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height));
    if (typeof patch.zIndex === 'number')
        comp.zIndex = Math.max(0, Math.round(patch.zIndex));
    normalizeLayout(comp);
    await nextTick();
    chartInstances.get(comp.id)?.resize();
    await persistLayout(comp);
};
const bringComponentToFront = async () => {
    const comp = activeComponent.value;
    if (!comp)
        return;
    await applyLayoutPatch({ zIndex: getMaxZ() + 1 });
};
const handleRemoveActiveComponent = async () => {
    if (!activeComponent.value)
        return;
    await removeComponent(activeComponent.value.id);
};
const previewActiveComponent = async (payload) => {
    const comp = activeComponent.value;
    if (!comp)
        return;
    comp.chartId = payload.chartId;
    comp.configJson = payload.configJson;
    await nextTick();
    if (showNoField(comp)) {
        chartInstances.get(comp.id)?.clear();
        return;
    }
    if (!isRenderableChart(comp)) {
        chartInstances.get(comp.id)?.clear();
        return;
    }
    await renderChart(comp);
};
const saveActiveComponent = async (payload) => {
    const comp = activeComponent.value;
    if (!comp || !currentDashboard.value)
        return;
    await updateDashboardComponent(currentDashboard.value.id, comp.id, payload);
    comp.chartId = payload.chartId;
    comp.configJson = payload.configJson;
    await loadComponents();
    ElMessage.success('组件实例配置已保存');
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
    activeCompId.value = null;
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
            if (!showNoField(comp) && isRenderableChart(comp))
                renderChart(comp);
        }
    }
    finally {
        compLoading.value = false;
    }
};
// ---- render ----
const renderChart = async (comp) => {
    const el = chartRefs.get(comp.id);
    if (!el)
        return;
    if (!isRenderableChart(comp))
        return;
    try {
        const resolved = getComponentConfig(comp);
        const data = await getChartData(comp.chartId, {
            configJson: comp.configJson,
            filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
        });
        const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], resolved.chart);
        let inst = chartInstances.get(comp.id);
        if (!inst) {
            inst = echarts.init(el);
            chartInstances.set(comp.id, inst);
            window.addEventListener('resize', () => inst?.resize());
        }
        inst.setOption(buildComponentOption(materialized, resolved.chart, resolved.style), true);
    }
    catch { /* ignore */ }
};
let interaction = null;
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
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
const startResize = (evt, comp, handle = 'se') => {
    focusComponent(comp);
    interaction = {
        mode: 'resize',
        compId: comp.id,
        startMouseX: evt.clientX,
        startMouseY: evt.clientY,
        startX: comp.posX,
        startY: comp.posY,
        startWidth: comp.width,
        startHeight: comp.height,
        handle,
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
        const handle = interaction.handle ?? 'se';
        let nextX = interaction.startX;
        let nextY = interaction.startY;
        let nextWidth = interaction.startWidth;
        let nextHeight = interaction.startHeight;
        const canvasWidth = getCanvasWidth();
        if (handle.includes('e')) {
            nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX));
        }
        if (handle.includes('s')) {
            nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy);
        }
        if (handle.includes('w')) {
            const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH;
            nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft);
            nextWidth = interaction.startWidth - (nextX - interaction.startX);
        }
        if (handle.includes('n')) {
            const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT;
            nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop);
            nextHeight = interaction.startHeight - (nextY - interaction.startY);
        }
        comp.posX = Math.round(nextX);
        comp.posY = Math.round(nextY);
        comp.width = Math.round(nextWidth);
        comp.height = Math.round(nextHeight);
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
        const newDb = await createDashboard({ name: dashForm.name, configJson: buildReportConfig(null, 'dashboard') });
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
const openPreview = (focusShare = false) => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择仪表板');
    window.open(focusShare && isPublished.value ? shareLink.value : previewLink.value, '_blank', 'noopener,noreferrer');
};
const openShareDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择仪表板');
    shareVisible.value = true;
};
const openPublishDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择仪表板');
    const publish = currentPublishConfig.value;
    publishForm.published = publish.status === 'PUBLISHED';
    publishForm.allowAnonymousAccess = publish.allowAnonymousAccess;
    publishForm.allowedRoles = [...publish.allowedRoles];
    publishForm.shareToken = publish.shareToken;
    publishVisible.value = true;
};
const savePublishSettings = async () => {
    if (!currentDashboard.value)
        return;
    publishSaving.value = true;
    try {
        const configJson = buildReportConfig(currentDashboard.value.configJson, 'dashboard', {
            status: publishForm.published ? 'PUBLISHED' : 'DRAFT',
            allowAnonymousAccess: publishForm.allowAnonymousAccess,
            allowedRoles: publishForm.allowedRoles,
            shareToken: publishForm.shareToken,
            publishedAt: publishForm.published ? new Date().toISOString() : undefined,
        });
        const updated = await updateDashboard(currentDashboard.value.id, { configJson });
        currentDashboard.value = updated;
        dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item);
        publishVisible.value = false;
        ElMessage.success('发布设置已保存');
    }
    finally {
        publishSaving.value = false;
    }
};
const copyShareLink = async () => {
    if (!isPublished.value) {
        ElMessage.warning('请先发布仪表板');
        return;
    }
    try {
        await navigator.clipboard.writeText(shareLink.value);
        ElMessage.success('分享链接已复制');
    }
    catch {
        ElMessage.warning('复制失败，请手动复制链接');
    }
};
const exportDashboardJson = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择仪表板');
    const payload = {
        dashboard: currentDashboard.value,
        components: components.value,
        charts: components.value
            .map((comp) => chartMap.value.get(comp.chartId))
            .filter((chart) => Boolean(chart))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDashboard.value.name}-dashboard.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
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
            zIndex: getMaxZ() + 1,
            configJson: buildComponentConfig(chartMap.value.get(selectedChartId.value) ?? null, undefined, {
                chart: buildChartSnapshot(chartMap.value.get(selectedChartId.value) ?? null),
            })
        });
        normalizeLayout(comp);
        components.value.push(comp);
        addChartVisible.value = false;
        ElMessage.success('图表已添加到仪表板');
        await nextTick();
        if (!showNoField(comp) && isRenderableChart(comp))
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
    if (activeCompId.value === compId)
        activeCompId.value = null;
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
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-root']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kpi-row']} */ ;
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
    ...{ class: "sidebar-search-wrap" },
});
const __VLS_8 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    modelValue: (__VLS_ctx.dashboardSearch),
    prefixIcon: (__VLS_ctx.Search),
    placeholder: "检索目录",
    clearable: true,
}));
const __VLS_10 = __VLS_9({
    modelValue: (__VLS_ctx.dashboardSearch),
    prefixIcon: (__VLS_ctx.Search),
    placeholder: "检索目录",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-list" },
});
for (const [db] of __VLS_getVForSourceType((__VLS_ctx.filteredDashboards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectDashboard(db);
            } },
        key: (db.id),
        ...{ class: "sidebar-item" },
        ...{ class: ({ active: __VLS_ctx.currentDashboard?.id === db.id }) },
    });
    const __VLS_12 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ class: "sidebar-icon" },
    }));
    const __VLS_14 = __VLS_13({
        ...{ class: "sidebar-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    const __VLS_16 = {}.Grid;
    /** @type {[typeof __VLS_components.Grid, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
    const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
    var __VLS_15;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sidebar-name" },
        title: (db.name),
    });
    (db.name);
    const __VLS_20 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        ...{ 'onConfirm': {} },
        title: "确认删除此仪表板？",
    }));
    const __VLS_22 = __VLS_21({
        ...{ 'onConfirm': {} },
        title: "确认删除此仪表板？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    let __VLS_24;
    let __VLS_25;
    let __VLS_26;
    const __VLS_27 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDeleteDashboard(db.id);
        }
    };
    __VLS_23.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_23.slots;
        const __VLS_28 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ 'onClick': {} },
            ...{ class: "sidebar-del" },
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onClick': {} },
            ...{ class: "sidebar-del" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onClick: () => { }
        };
        __VLS_31.slots.default;
        const __VLS_36 = {}.Delete;
        /** @type {[typeof __VLS_components.Delete, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
        const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
        var __VLS_31;
    }
    var __VLS_23;
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
    const __VLS_40 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }));
    const __VLS_42 = __VLS_41({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    const __VLS_44 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_46 = __VLS_45({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_47;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-actions" },
    });
    const __VLS_48 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.openAddChart)
    };
    __VLS_51.slots.default;
    var __VLS_51;
    const __VLS_56 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    __VLS_59.slots.default;
    var __VLS_59;
    const __VLS_64 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (__VLS_ctx.openPreview)
    };
    __VLS_67.slots.default;
    var __VLS_67;
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_75.slots.default;
    (__VLS_ctx.isPublished ? '发布设置' : '发布');
    var __VLS_75;
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_83.slots.default;
    var __VLS_83;
    const __VLS_88 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onClick: (__VLS_ctx.exportDashboardJson)
    };
    __VLS_91.slots.default;
    var __VLS_91;
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
        (__VLS_ctx.getComponentChartConfig(comp).name || '图表');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-card-actions" },
        });
        const __VLS_96 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
            size: "small",
            type: "info",
            ...{ style: {} },
        }));
        const __VLS_98 = __VLS_97({
            size: "small",
            type: "info",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_97));
        __VLS_99.slots.default;
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(comp).chartType));
        var __VLS_99;
        const __VLS_100 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(comp.id);
            }
        };
        __VLS_103.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_103.slots;
            const __VLS_108 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
                ...{ class: "remove-btn" },
            }));
            const __VLS_110 = __VLS_109({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_109));
            __VLS_111.slots.default;
            const __VLS_112 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({}));
            const __VLS_114 = __VLS_113({}, ...__VLS_functionalComponentArgsRest(__VLS_113));
            var __VLS_111;
        }
        var __VLS_103;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ref: ((el) => __VLS_ctx.setChartRef(el, comp.id)),
            ...{ class: "chart-canvas" },
        });
        if (__VLS_ctx.showNoField(comp)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "no-field-tip" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(comp)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "no-field-tip" },
            });
            (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(comp).chartType));
        }
        for (const [handle] of __VLS_getVForSourceType((__VLS_ctx.resizeHandles))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onMousedown: (...[$event]) => {
                        if (!!(!__VLS_ctx.currentDashboard))
                            return;
                        __VLS_ctx.startResize($event, comp, handle);
                    } },
                key: (handle),
                ...{ class: "resize-handle" },
                ...{ class: (`resize-handle--${handle}`) },
            });
        }
    }
    if (!__VLS_ctx.components.length && !__VLS_ctx.compLoading) {
        const __VLS_116 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }));
        const __VLS_118 = __VLS_117({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dash-inspector" },
});
/** @type {[typeof EditorComponentInspector, ]} */ ;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}));
const __VLS_121 = __VLS_120({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
let __VLS_123;
let __VLS_124;
let __VLS_125;
const __VLS_126 = {
    onApplyLayout: (__VLS_ctx.applyLayoutPatch)
};
const __VLS_127 = {
    onBringFront: (__VLS_ctx.bringComponentToFront)
};
const __VLS_128 = {
    onRemove: (__VLS_ctx.handleRemoveActiveComponent)
};
const __VLS_129 = {
    onPreviewComponent: (__VLS_ctx.previewActiveComponent)
};
const __VLS_130 = {
    onSaveComponent: (__VLS_ctx.saveActiveComponent)
};
var __VLS_122;
const __VLS_131 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_133 = __VLS_132({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
__VLS_134.slots.default;
const __VLS_135 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_137 = __VLS_136({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
__VLS_138.slots.default;
const __VLS_139 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    label: "名称",
}));
const __VLS_141 = __VLS_140({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
const __VLS_143 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}));
const __VLS_145 = __VLS_144({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
var __VLS_142;
var __VLS_138;
{
    const { footer: __VLS_thisSlot } = __VLS_134.slots;
    const __VLS_147 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
        ...{ 'onClick': {} },
    }));
    const __VLS_149 = __VLS_148({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    let __VLS_151;
    let __VLS_152;
    let __VLS_153;
    const __VLS_154 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_150.slots.default;
    var __VLS_150;
    const __VLS_155 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_157 = __VLS_156({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_156));
    let __VLS_159;
    let __VLS_160;
    let __VLS_161;
    const __VLS_162 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_158.slots.default;
    var __VLS_158;
}
var __VLS_134;
const __VLS_163 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_165 = __VLS_164({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_164));
__VLS_166.slots.default;
const __VLS_167 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_169 = __VLS_168({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_168));
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
    const __VLS_171 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({}));
    const __VLS_173 = __VLS_172({}, ...__VLS_functionalComponentArgsRest(__VLS_172));
    __VLS_174.slots.default;
    const __VLS_175 = {}.PieChart;
    /** @type {[typeof __VLS_components.PieChart, ]} */ ;
    // @ts-ignore
    const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({}));
    const __VLS_177 = __VLS_176({}, ...__VLS_functionalComponentArgsRest(__VLS_176));
    var __VLS_174;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pick-name" },
    });
    (c.name);
    const __VLS_179 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
        size: "small",
        type: "info",
    }));
    const __VLS_181 = __VLS_180({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_180));
    __VLS_182.slots.default;
    (c.chartType);
    var __VLS_182;
}
if (!__VLS_ctx.filteredCharts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_166.slots;
    const __VLS_183 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
        ...{ 'onClick': {} },
    }));
    const __VLS_185 = __VLS_184({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    let __VLS_187;
    let __VLS_188;
    let __VLS_189;
    const __VLS_190 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addChartVisible = false;
        }
    };
    __VLS_186.slots.default;
    var __VLS_186;
    const __VLS_191 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_195;
    let __VLS_196;
    let __VLS_197;
    const __VLS_198 = {
        onClick: (__VLS_ctx.handleAddChart)
    };
    __VLS_194.slots.default;
    var __VLS_194;
}
var __VLS_166;
const __VLS_199 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_201 = __VLS_200({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
__VLS_202.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_203 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_205 = __VLS_204({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_204));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_207 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_209 = __VLS_208({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
}
{
    const { footer: __VLS_thisSlot } = __VLS_202.slots;
    const __VLS_211 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
        ...{ 'onClick': {} },
    }));
    const __VLS_213 = __VLS_212({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_212));
    let __VLS_215;
    let __VLS_216;
    let __VLS_217;
    const __VLS_218 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_214.slots.default;
    var __VLS_214;
    if (!__VLS_ctx.isPublished) {
        const __VLS_219 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_221 = __VLS_220({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_220));
        let __VLS_223;
        let __VLS_224;
        let __VLS_225;
        const __VLS_226 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_222.slots.default;
        var __VLS_222;
    }
    else {
        const __VLS_227 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
            ...{ 'onClick': {} },
        }));
        const __VLS_229 = __VLS_228({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_228));
        let __VLS_231;
        let __VLS_232;
        let __VLS_233;
        const __VLS_234 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_230.slots.default;
        var __VLS_230;
        const __VLS_235 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_237 = __VLS_236({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        let __VLS_239;
        let __VLS_240;
        let __VLS_241;
        const __VLS_242 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_238.slots.default;
        var __VLS_238;
    }
}
var __VLS_202;
const __VLS_243 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_245 = __VLS_244({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
__VLS_246.slots.default;
const __VLS_247 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    labelWidth: "120px",
}));
const __VLS_249 = __VLS_248({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
__VLS_250.slots.default;
const __VLS_251 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    label: "发布状态",
}));
const __VLS_253 = __VLS_252({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
__VLS_254.slots.default;
const __VLS_255 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_257 = __VLS_256({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
var __VLS_254;
const __VLS_259 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
    label: "允许匿名链接",
}));
const __VLS_261 = __VLS_260({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_260));
__VLS_262.slots.default;
const __VLS_263 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_265 = __VLS_264({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
var __VLS_262;
const __VLS_267 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
    label: "允许访问角色",
}));
const __VLS_269 = __VLS_268({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
__VLS_270.slots.default;
const __VLS_271 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_273 = __VLS_272({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_272));
__VLS_274.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_275 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
        key: (role),
        label: (role),
    }));
    const __VLS_277 = __VLS_276({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_276));
    __VLS_278.slots.default;
    (role);
    var __VLS_278;
}
var __VLS_274;
var __VLS_270;
const __VLS_279 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
    label: "正式分享链接",
}));
const __VLS_281 = __VLS_280({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
__VLS_282.slots.default;
const __VLS_283 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_285 = __VLS_284({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_284));
var __VLS_282;
var __VLS_250;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_246.slots;
    const __VLS_287 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
        ...{ 'onClick': {} },
    }));
    const __VLS_289 = __VLS_288({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_288));
    let __VLS_291;
    let __VLS_292;
    let __VLS_293;
    const __VLS_294 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_290.slots.default;
    var __VLS_290;
    const __VLS_295 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_297 = __VLS_296({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_296));
    let __VLS_299;
    let __VLS_300;
    let __VLS_301;
    const __VLS_302 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_298.slots.default;
    var __VLS_298;
}
var __VLS_246;
/** @type {__VLS_StyleScopedClasses['dash-root']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-search-wrap']} */ ;
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
/** @type {__VLS_StyleScopedClasses['section-title-wrap']} */ ;
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
/** @type {__VLS_StyleScopedClasses['no-field-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-pick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pick-name']} */ ;
/** @type {__VLS_StyleScopedClasses['share-block']} */ ;
/** @type {__VLS_StyleScopedClasses['share-label']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-tip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Close: Close,
            Delete: Delete,
            Download: Download,
            Grid: Grid,
            PieChart: PieChart,
            Plus: Plus,
            Promotion: Promotion,
            Refresh: Refresh,
            Search: Search,
            Share: Share,
            View: View,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            loading: loading,
            compLoading: compLoading,
            dashboards: dashboards,
            currentDashboard: currentDashboard,
            components: components,
            kpi: kpi,
            canvasRef: canvasRef,
            activeCompId: activeCompId,
            createDashVisible: createDashVisible,
            dashSaving: dashSaving,
            dashForm: dashForm,
            dashboardSearch: dashboardSearch,
            shareVisible: shareVisible,
            publishVisible: publishVisible,
            publishSaving: publishSaving,
            publishForm: publishForm,
            addChartVisible: addChartVisible,
            chartSearch: chartSearch,
            selectedChartId: selectedChartId,
            addingChart: addingChart,
            filteredCharts: filteredCharts,
            filteredDashboards: filteredDashboards,
            shareLink: shareLink,
            roleOptions: roleOptions,
            isPublished: isPublished,
            draftPublishedLink: draftPublishedLink,
            activeComponent: activeComponent,
            activeChart: activeChart,
            getComponentChartConfig: getComponentChartConfig,
            showNoField: showNoField,
            isRenderableChart: isRenderableChart,
            setChartRef: setChartRef,
            getCardStyle: getCardStyle,
            canvasMinHeight: canvasMinHeight,
            focusComponent: focusComponent,
            applyLayoutPatch: applyLayoutPatch,
            bringComponentToFront: bringComponentToFront,
            handleRemoveActiveComponent: handleRemoveActiveComponent,
            previewActiveComponent: previewActiveComponent,
            saveActiveComponent: saveActiveComponent,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            resizeHandles: resizeHandles,
            startDrag: startDrag,
            startResize: startResize,
            openCreateDashboard: openCreateDashboard,
            handleCreateDashboard: handleCreateDashboard,
            handleDeleteDashboard: handleDeleteDashboard,
            openPreview: openPreview,
            openShareDialog: openShareDialog,
            openPublishDialog: openPublishDialog,
            savePublishSettings: savePublishSettings,
            copyShareLink: copyShareLink,
            exportDashboardJson: exportDashboardJson,
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
