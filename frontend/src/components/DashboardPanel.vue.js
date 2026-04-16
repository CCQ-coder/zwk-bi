import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close, Delete, Download, Fold, Grid, PieChart, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
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
const sidebarCollapsed = ref(false);
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
    // Legacy conversion: only convert when BOTH width and height are in old grid units
    const isLegacy = comp.width <= 24 && comp.height <= 12;
    if (isLegacy) {
        comp.width = Math.max(MIN_CARD_WIDTH, comp.width * LEGACY_GRID_COL_PX);
        comp.height = Math.max(MIN_CARD_HEIGHT, comp.height * LEGACY_GRID_ROW_PX);
        comp.posX = comp.posX * LEGACY_GRID_COL_PX;
        comp.posY = comp.posY * LEGACY_GRID_ROW_PX;
    }
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
        // auto pos: place below existing cards; flow into columns when space allows
        const cardW = 520;
        const cardH = 320;
        const gap = 12;
        const canvasW = getCanvasWidth();
        const cols = Math.max(1, Math.floor((canvasW + gap) / (cardW + gap)));
        const count = components.value.length;
        const col = count % cols;
        const row = Math.floor(count / cols);
        const posX = gap + col * (cardW + gap);
        const posY = gap + row * (cardH + gap);
        const comp = await addDashboardComponent(currentDashboard.value.id, {
            chartId: selectedChartId.value,
            posX,
            posY,
            width: cardW,
            height: cardH,
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
    ...{ class: ({ 'dash-sidebar--collapsed': __VLS_ctx.sidebarCollapsed }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-header" },
});
if (!__VLS_ctx.sidebarCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sidebar-title" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-header-btns" },
});
if (!__VLS_ctx.sidebarCollapsed) {
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
}
const __VLS_8 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    size: "small",
    icon: (__VLS_ctx.Fold),
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    size: "small",
    icon: (__VLS_ctx.Fold),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (...[$event]) => {
        __VLS_ctx.sidebarCollapsed = !__VLS_ctx.sidebarCollapsed;
    }
};
var __VLS_11;
if (!__VLS_ctx.sidebarCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-search-wrap" },
    });
    const __VLS_16 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        modelValue: (__VLS_ctx.dashboardSearch),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "检索目录",
        clearable: true,
    }));
    const __VLS_18 = __VLS_17({
        modelValue: (__VLS_ctx.dashboardSearch),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "检索目录",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-list" },
    });
    for (const [db] of __VLS_getVForSourceType((__VLS_ctx.filteredDashboards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.selectDashboard(db);
                } },
            key: (db.id),
            ...{ class: "sidebar-item" },
            ...{ class: ({ active: __VLS_ctx.currentDashboard?.id === db.id }) },
        });
        const __VLS_20 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ class: "sidebar-icon" },
        }));
        const __VLS_22 = __VLS_21({
            ...{ class: "sidebar-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        const __VLS_24 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({}));
        const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
        var __VLS_23;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sidebar-name" },
            title: (db.name),
        });
        (db.name);
        const __VLS_28 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ 'onConfirm': {} },
            title: "确认删除此仪表板？",
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onConfirm': {} },
            title: "确认删除此仪表板？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onConfirm: (...[$event]) => {
                if (!(!__VLS_ctx.sidebarCollapsed))
                    return;
                __VLS_ctx.handleDeleteDashboard(db.id);
            }
        };
        __VLS_31.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_31.slots;
            const __VLS_36 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                ...{ 'onClick': {} },
                ...{ class: "sidebar-del" },
            }));
            const __VLS_38 = __VLS_37({
                ...{ 'onClick': {} },
                ...{ class: "sidebar-del" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            let __VLS_40;
            let __VLS_41;
            let __VLS_42;
            const __VLS_43 = {
                onClick: () => { }
            };
            __VLS_39.slots.default;
            const __VLS_44 = {}.Delete;
            /** @type {[typeof __VLS_components.Delete, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            var __VLS_39;
        }
        var __VLS_31;
    }
    if (!__VLS_ctx.dashboards.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sidebar-empty" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "dash-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    const __VLS_48 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }));
    const __VLS_50 = __VLS_49({
        description: "请在左侧选择或新建仪表板",
        ...{ class: "dash-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
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
    const __VLS_52 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_54 = __VLS_53({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_55;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-actions" },
    });
    const __VLS_56 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Plus),
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onClick: (__VLS_ctx.openAddChart)
    };
    __VLS_59.slots.default;
    var __VLS_59;
    const __VLS_64 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    __VLS_67.slots.default;
    var __VLS_67;
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (__VLS_ctx.openPreview)
    };
    __VLS_75.slots.default;
    var __VLS_75;
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_83.slots.default;
    (__VLS_ctx.isPublished ? '发布设置' : '发布');
    var __VLS_83;
    const __VLS_88 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_91.slots.default;
    var __VLS_91;
    const __VLS_96 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (__VLS_ctx.exportDashboardJson)
    };
    __VLS_99.slots.default;
    var __VLS_99;
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
        const __VLS_104 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            size: "small",
            type: "info",
            ...{ style: {} },
        }));
        const __VLS_106 = __VLS_105({
            size: "small",
            type: "info",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(comp).chartType));
        var __VLS_107;
        const __VLS_108 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }));
        const __VLS_110 = __VLS_109({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        let __VLS_112;
        let __VLS_113;
        let __VLS_114;
        const __VLS_115 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(comp.id);
            }
        };
        __VLS_111.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_111.slots;
            const __VLS_116 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
                ...{ class: "remove-btn" },
            }));
            const __VLS_118 = __VLS_117({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_117));
            __VLS_119.slots.default;
            const __VLS_120 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({}));
            const __VLS_122 = __VLS_121({}, ...__VLS_functionalComponentArgsRest(__VLS_121));
            var __VLS_119;
        }
        var __VLS_111;
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
        const __VLS_124 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }));
        const __VLS_126 = __VLS_125({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dash-inspector" },
});
/** @type {[typeof EditorComponentInspector, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}));
const __VLS_129 = __VLS_128({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
let __VLS_131;
let __VLS_132;
let __VLS_133;
const __VLS_134 = {
    onApplyLayout: (__VLS_ctx.applyLayoutPatch)
};
const __VLS_135 = {
    onBringFront: (__VLS_ctx.bringComponentToFront)
};
const __VLS_136 = {
    onRemove: (__VLS_ctx.handleRemoveActiveComponent)
};
const __VLS_137 = {
    onPreviewComponent: (__VLS_ctx.previewActiveComponent)
};
const __VLS_138 = {
    onSaveComponent: (__VLS_ctx.saveActiveComponent)
};
var __VLS_130;
const __VLS_139 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_141 = __VLS_140({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
const __VLS_143 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_145 = __VLS_144({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
__VLS_146.slots.default;
const __VLS_147 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
    label: "名称",
}));
const __VLS_149 = __VLS_148({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
__VLS_150.slots.default;
const __VLS_151 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}));
const __VLS_153 = __VLS_152({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
var __VLS_150;
var __VLS_146;
{
    const { footer: __VLS_thisSlot } = __VLS_142.slots;
    const __VLS_155 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
        ...{ 'onClick': {} },
    }));
    const __VLS_157 = __VLS_156({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_156));
    let __VLS_159;
    let __VLS_160;
    let __VLS_161;
    const __VLS_162 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_158.slots.default;
    var __VLS_158;
    const __VLS_163 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_165 = __VLS_164({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    let __VLS_167;
    let __VLS_168;
    let __VLS_169;
    const __VLS_170 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_166.slots.default;
    var __VLS_166;
}
var __VLS_142;
const __VLS_171 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_173 = __VLS_172({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_172));
__VLS_174.slots.default;
const __VLS_175 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_177 = __VLS_176({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
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
    const __VLS_179 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({}));
    const __VLS_181 = __VLS_180({}, ...__VLS_functionalComponentArgsRest(__VLS_180));
    __VLS_182.slots.default;
    const __VLS_183 = {}.PieChart;
    /** @type {[typeof __VLS_components.PieChart, ]} */ ;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({}));
    const __VLS_185 = __VLS_184({}, ...__VLS_functionalComponentArgsRest(__VLS_184));
    var __VLS_182;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pick-name" },
    });
    (c.name);
    const __VLS_187 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
        size: "small",
        type: "info",
    }));
    const __VLS_189 = __VLS_188({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    __VLS_190.slots.default;
    (c.chartType);
    var __VLS_190;
}
if (!__VLS_ctx.filteredCharts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_174.slots;
    const __VLS_191 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        ...{ 'onClick': {} },
    }));
    const __VLS_193 = __VLS_192({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    let __VLS_195;
    let __VLS_196;
    let __VLS_197;
    const __VLS_198 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addChartVisible = false;
        }
    };
    __VLS_194.slots.default;
    var __VLS_194;
    const __VLS_199 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }));
    const __VLS_201 = __VLS_200({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    let __VLS_203;
    let __VLS_204;
    let __VLS_205;
    const __VLS_206 = {
        onClick: (__VLS_ctx.handleAddChart)
    };
    __VLS_202.slots.default;
    var __VLS_202;
}
var __VLS_174;
const __VLS_207 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_209 = __VLS_208({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
__VLS_210.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_211 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_213 = __VLS_212({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_212));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_215 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_217 = __VLS_216({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
}
{
    const { footer: __VLS_thisSlot } = __VLS_210.slots;
    const __VLS_219 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        ...{ 'onClick': {} },
    }));
    const __VLS_221 = __VLS_220({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    let __VLS_223;
    let __VLS_224;
    let __VLS_225;
    const __VLS_226 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_222.slots.default;
    var __VLS_222;
    if (!__VLS_ctx.isPublished) {
        const __VLS_227 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_229 = __VLS_228({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_228));
        let __VLS_231;
        let __VLS_232;
        let __VLS_233;
        const __VLS_234 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_230.slots.default;
        var __VLS_230;
    }
    else {
        const __VLS_235 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
            ...{ 'onClick': {} },
        }));
        const __VLS_237 = __VLS_236({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        let __VLS_239;
        let __VLS_240;
        let __VLS_241;
        const __VLS_242 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_238.slots.default;
        var __VLS_238;
        const __VLS_243 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_245 = __VLS_244({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_244));
        let __VLS_247;
        let __VLS_248;
        let __VLS_249;
        const __VLS_250 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_246.slots.default;
        var __VLS_246;
    }
}
var __VLS_210;
const __VLS_251 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
__VLS_254.slots.default;
const __VLS_255 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    labelWidth: "120px",
}));
const __VLS_257 = __VLS_256({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
__VLS_258.slots.default;
const __VLS_259 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
    label: "发布状态",
}));
const __VLS_261 = __VLS_260({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_260));
__VLS_262.slots.default;
const __VLS_263 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_265 = __VLS_264({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
var __VLS_262;
const __VLS_267 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
    label: "允许匿名链接",
}));
const __VLS_269 = __VLS_268({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
__VLS_270.slots.default;
const __VLS_271 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_273 = __VLS_272({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_272));
var __VLS_270;
const __VLS_275 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
    label: "允许访问角色",
}));
const __VLS_277 = __VLS_276({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
__VLS_278.slots.default;
const __VLS_279 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_281 = __VLS_280({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
__VLS_282.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_283 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
        key: (role),
        label: (role),
    }));
    const __VLS_285 = __VLS_284({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_284));
    __VLS_286.slots.default;
    (role);
    var __VLS_286;
}
var __VLS_282;
var __VLS_278;
const __VLS_287 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
    label: "正式分享链接",
}));
const __VLS_289 = __VLS_288({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_288));
__VLS_290.slots.default;
const __VLS_291 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_293 = __VLS_292({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_292));
var __VLS_290;
var __VLS_258;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_254.slots;
    const __VLS_295 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
        ...{ 'onClick': {} },
    }));
    const __VLS_297 = __VLS_296({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_296));
    let __VLS_299;
    let __VLS_300;
    let __VLS_301;
    const __VLS_302 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_298.slots.default;
    var __VLS_298;
    const __VLS_303 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_305 = __VLS_304({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_304));
    let __VLS_307;
    let __VLS_308;
    let __VLS_309;
    const __VLS_310 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_306.slots.default;
    var __VLS_306;
}
var __VLS_254;
/** @type {__VLS_StyleScopedClasses['dash-root']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header-btns']} */ ;
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
            Fold: Fold,
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
            sidebarCollapsed: sidebarCollapsed,
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
