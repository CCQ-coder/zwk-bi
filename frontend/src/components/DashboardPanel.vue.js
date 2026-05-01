import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Close, Delete, Download, Fold, Grid, PieChart, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import ComponentStaticPreview from './ComponentStaticPreview.vue';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardById, getDashboardComponents, getDashboardList, getDefaultDashboard, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { getChartData, getChartList } from '../api/chart';
import { buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, isStaticWidgetChartType, mergeComponentRequestFilters, normalizeRuntimeChartData, normalizeComponentConfig, } from '../utils/component-config';
import { echarts } from '../utils/echarts';
import { buildPublishedLink, buildReportConfig, normalizePublishConfig, parseReportConfig } from '../utils/report-config';
const props = withDefaults(defineProps(), {
    dashboardId: null,
});
const emit = defineEmits();
// ---- state ----
const loading = ref(false);
const compLoading = ref(false);
const dashboards = ref([]);
const currentDashboard = ref(null);
const components = ref([]);
const dashboardComponentCountMap = ref({});
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
const requestedDashboardId = computed(() => {
    const id = Number(props.dashboardId ?? 0);
    return Number.isFinite(id) && id > 0 ? id : null;
});
const editorMode = computed(() => requestedDashboardId.value !== null);
const filteredCharts = computed(() => {
    const q = chartSearch.value.toLowerCase();
    return q ? allCharts.value.filter(c => c.name.toLowerCase().includes(q)) : allCharts.value;
});
const filteredDashboards = computed(() => {
    const q = dashboardSearch.value.trim().toLowerCase();
    return q ? dashboards.value.filter(d => d.name.toLowerCase().includes(q)) : dashboards.value;
});
const getDashboardScene = (dashboard) => parseReportConfig(dashboard.configJson).scene === 'screen' ? 'screen' : 'dashboard';
const getDashboardPublishStatus = (dashboard) => normalizePublishConfig(parseReportConfig(dashboard.configJson).publish).status;
const getDashboardComponentCount = (dashboardId) => dashboardComponentCountMap.value[dashboardId] ?? 0;
const getDashboardStatusText = (dashboard) => getDashboardPublishStatus(dashboard) === 'PUBLISHED' ? '已发布' : '草稿';
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
const getComponentDisplayName = (comp) => getComponentChartConfig(comp).name?.trim()
    || chartMap.value.get(comp.chartId)?.name
    || '未命名组件';
const isStaticWidget = (comp) => isStaticWidgetChartType(getComponentChartConfig(comp).chartType ?? '');
const showNoField = (comp) => isStaticWidget(comp) ? false : getMissingChartFields(getComponentChartConfig(comp)).length > 0;
const isRenderableChart = (comp) => isCanvasRenderableChartType(getComponentChartConfig(comp).chartType ?? '');
const getComponentStatus = (comp) => {
    if (showNoField(comp)) {
        return { label: '待补字段', type: 'warning' };
    }
    if (!isStaticWidget(comp) && !isRenderableChart(comp)) {
        return { label: '预览受限', type: 'info' };
    }
    return { label: '可预览', type: 'success' };
};
// echarts instances
const cardRefs = new Map();
const chartRefs = new Map();
const chartInstances = new Map();
const setCardRef = (el, compId) => {
    if (!el) {
        cardRefs.delete(compId);
        return;
    }
    cardRefs.set(compId, el);
    if (interactionPreviewSnapshot?.compId === compId) {
        applyInteractionPreviewToCard(interactionPreviewSnapshot);
    }
};
const setChartRef = (el, compId) => {
    if (el)
        chartRefs.set(compId, el);
    else
        chartRefs.delete(compId);
};
const waitForRenderFrame = () => new Promise((resolve) => {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
    });
});
const resolveChartHost = async (compId, attempt = 0) => {
    const host = chartRefs.get(compId) ?? null;
    if (!host)
        return null;
    if (host.clientWidth > 0 && host.clientHeight > 0)
        return host;
    if (attempt >= 6)
        return null;
    await waitForRenderFrame();
    return resolveChartHost(compId, attempt + 1);
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
const handleWindowResize = () => {
    chartInstances.forEach((instance) => instance.resize());
};
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
    await updateDashboardComponent(currentDashboard.value.id, comp.id, {
        posX: comp.posX,
        posY: comp.posY,
        width: comp.width,
        height: comp.height,
        zIndex: comp.zIndex,
        ...payload,
    });
    comp.chartId = payload.chartId;
    comp.configJson = payload.configJson;
    await loadComponents();
    ElMessage.success('组件实例配置已保存');
};
// ---- load ----
const loadRequestedDashboard = async (dashboardId = requestedDashboardId.value) => {
    if (!dashboardId) {
        if (dashboards.value.length) {
            await selectDashboard(dashboards.value[0]);
        }
        else {
            currentDashboard.value = null;
            components.value = [];
        }
        return;
    }
    let target = dashboards.value.find((item) => item.id === dashboardId) ?? null;
    if (!target) {
        try {
            const fetched = await getDashboardById(dashboardId);
            if (getDashboardScene(fetched) === 'dashboard') {
                target = fetched;
                dashboards.value = [fetched, ...dashboards.value.filter((item) => item.id !== fetched.id)];
            }
        }
        catch {
            target = null;
        }
    }
    if (!target) {
        currentDashboard.value = null;
        components.value = [];
        ElMessage.error('未找到对应仪表板');
        return;
    }
    await selectDashboard(target);
};
const loadAll = async () => {
    loading.value = true;
    try {
        const [dbList, charts, summary] = await Promise.all([
            getDashboardList(),
            getChartList(),
            getDefaultDashboard()
        ]);
        dashboards.value = dbList.filter((item) => getDashboardScene(item) === 'dashboard');
        allCharts.value = charts;
        kpi.value = summary.kpi;
        chartMap.value = new Map(charts.map(c => [c.id, c]));
        const entries = await Promise.all(dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length]));
        dashboardComponentCountMap.value = Object.fromEntries(entries);
        await loadRequestedDashboard();
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
        dashboardComponentCountMap.value = {
            ...dashboardComponentCountMap.value,
            [currentDashboard.value.id]: components.value.length,
        };
        await nextTick();
        await Promise.all(components.value.map(async (comp) => {
            if (!showNoField(comp) && isRenderableChart(comp)) {
                await renderChart(comp);
            }
        }));
    }
    finally {
        compLoading.value = false;
    }
};
// ---- render ----
const renderChart = async (comp) => {
    const el = await resolveChartHost(comp.id);
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
        const materialized = normalizeRuntimeChartData(data, resolved.chart);
        let inst = chartInstances.get(comp.id);
        if (!inst) {
            inst = echarts.init(el);
            chartInstances.set(comp.id, inst);
        }
        else {
            inst.resize();
        }
        inst.setOption(buildComponentOption(materialized, resolved.chart, resolved.style), true);
    }
    catch { /* ignore */ }
};
let interaction = null;
let interactionPreviewSnapshot = null;
let interactionFrame = null;
let pendingPointer = null;
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const findComp = (id) => components.value.find(c => c.id === id);
const getResizeTransformOrigin = (handle) => {
    const horizontal = handle.includes('w') ? 'right' : handle.includes('e') ? 'left' : 'center';
    const vertical = handle.includes('n') ? 'bottom' : handle.includes('s') ? 'top' : 'center';
    return `${horizontal} ${vertical}`;
};
const applyInteractionPreviewToCard = (preview) => {
    if (!preview)
        return;
    const card = cardRefs.get(preview.compId);
    if (!card)
        return;
    card.style.transform = preview.transform;
    card.style.transformOrigin = preview.transformOrigin;
};
const clearInteractionPreviewFromCard = (componentId) => {
    const targetId = componentId ?? interactionPreviewSnapshot?.compId;
    if (!targetId)
        return;
    const card = cardRefs.get(targetId);
    if (!card)
        return;
    card.style.transform = '';
    card.style.transformOrigin = '';
};
const applyInteractionFrame = () => {
    interactionFrame = null;
    if (!interaction || !pendingPointer)
        return;
    const comp = findComp(interaction.compId);
    if (!comp)
        return;
    const dx = pendingPointer.x - interaction.startMouseX;
    const dy = pendingPointer.y - interaction.startMouseY;
    if (interaction.mode === 'move') {
        const maxX = Math.max(0, getCanvasWidth() - interaction.startWidth);
        const nextX = Math.min(maxX, Math.max(0, interaction.startX + dx));
        const nextY = Math.max(0, interaction.startY + dy);
        const preview = {
            compId: comp.id,
            nextX: Math.round(nextX),
            nextY: Math.round(nextY),
            nextWidth: interaction.startWidth,
            nextHeight: interaction.startHeight,
            transform: `translate(${Math.round(nextX - interaction.startX)}px, ${Math.round(nextY - interaction.startY)}px)`,
            transformOrigin: 'left top',
        };
        interactionPreviewSnapshot = preview;
        applyInteractionPreviewToCard(preview);
        return;
    }
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
    const preview = {
        compId: comp.id,
        nextX: Math.round(nextX),
        nextY: Math.round(nextY),
        nextWidth: Math.round(nextWidth),
        nextHeight: Math.round(nextHeight),
        transform: `translate(${Math.round(nextX - interaction.startX)}px, ${Math.round(nextY - interaction.startY)}px) scale(${nextWidth / interaction.startWidth}, ${nextHeight / interaction.startHeight})`,
        transformOrigin: getResizeTransformOrigin(handle),
    };
    interactionPreviewSnapshot = preview;
    applyInteractionPreviewToCard(preview);
};
const scheduleInteractionFrame = () => {
    if (interactionFrame !== null)
        return;
    interactionFrame = window.requestAnimationFrame(applyInteractionFrame);
};
const cleanupInteractionFrame = (clearCardPreview = true) => {
    if (interactionFrame !== null) {
        window.cancelAnimationFrame(interactionFrame);
        interactionFrame = null;
    }
    pendingPointer = null;
    if (clearCardPreview) {
        clearInteractionPreviewFromCard();
        interactionPreviewSnapshot = null;
    }
    document.body.classList.remove('canvas-interacting');
};
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
    pendingPointer = { x: evt.clientX, y: evt.clientY };
    document.body.classList.add('canvas-interacting');
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
    pendingPointer = { x: evt.clientX, y: evt.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const onPointerMove = (evt) => {
    if (!interaction)
        return;
    pendingPointer = { x: evt.clientX, y: evt.clientY };
    scheduleInteractionFrame();
};
const onPointerUp = async () => {
    if (!interaction)
        return;
    const comp = findComp(interaction.compId);
    if (pendingPointer) {
        applyInteractionFrame();
    }
    const preview = interactionPreviewSnapshot?.compId === interaction.compId ? { ...interactionPreviewSnapshot } : null;
    interaction = null;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame(false);
    if (comp) {
        if (preview) {
            clearInteractionPreviewFromCard(comp.id);
            interactionPreviewSnapshot = null;
            comp.posX = preview.nextX;
            comp.posY = preview.nextY;
            comp.width = preview.nextWidth;
            comp.height = preview.nextHeight;
            normalizeLayout(comp);
        }
        else {
            clearInteractionPreviewFromCard(comp.id);
            interactionPreviewSnapshot = null;
        }
        await nextTick();
        chartInstances.get(comp.id)?.resize();
        await persistLayout(comp);
    }
    else {
        clearInteractionPreviewFromCard();
        interactionPreviewSnapshot = null;
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
        dashboardComponentCountMap.value = {
            ...dashboardComponentCountMap.value,
            [newDb.id]: 0,
        };
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
    const nextCountMap = { ...dashboardComponentCountMap.value };
    delete nextCountMap[id];
    dashboardComponentCountMap.value = nextCountMap;
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
        dashboardComponentCountMap.value = {
            ...dashboardComponentCountMap.value,
            [currentDashboard.value.id]: components.value.length,
        };
        addChartVisible.value = false;
        ElMessage.success('图表已添加到仪表板');
        await nextTick();
        if (!showNoField(comp) && isRenderableChart(comp))
            await renderChart(comp);
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
    dashboardComponentCountMap.value = {
        ...dashboardComponentCountMap.value,
        [currentDashboard.value.id]: components.value.length,
    };
    if (activeCompId.value === compId)
        activeCompId.value = null;
    ElMessage.success('已从仪表板移除');
};
watch(requestedDashboardId, (nextId, prevId) => {
    if (nextId === prevId)
        return;
    void loadRequestedDashboard(nextId);
});
onMounted(() => {
    window.addEventListener('resize', handleWindowResize);
    void loadAll();
});
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    window.removeEventListener('resize', handleWindowResize);
    chartInstances.forEach(i => i.dispose());
    chartInstances.clear();
    cardRefs.clear();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    dashboardId: null,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-del']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
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
    ...{ class: ({ 'dash-root--editor': __VLS_ctx.editorMode }) },
});
if (!__VLS_ctx.editorMode) {
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
            if (!(!__VLS_ctx.editorMode))
                return;
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
                        if (!(!__VLS_ctx.editorMode))
                            return;
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
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "sidebar-copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "sidebar-name" },
                title: (db.name),
            });
            (db.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "sidebar-meta" },
            });
            (__VLS_ctx.getDashboardComponentCount(db.id));
            (__VLS_ctx.getDashboardStatusText(db));
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
                    if (!(!__VLS_ctx.editorMode))
                        return;
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
        description: (__VLS_ctx.editorMode ? '未找到对应仪表板' : '请在左侧选择或新建仪表板'),
        ...{ class: "dash-empty" },
    }));
    const __VLS_50 = __VLS_49({
        description: (__VLS_ctx.editorMode ? '未找到对应仪表板' : '请在左侧选择或新建仪表板'),
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-subtext" },
    });
    (__VLS_ctx.components.length);
    (__VLS_ctx.isPublished ? '已发布，可直接分享' : '草稿，建议完成后发布');
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
    if (__VLS_ctx.editorMode) {
        const __VLS_104 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.ArrowLeft),
        }));
        const __VLS_106 = __VLS_105({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.ArrowLeft),
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        let __VLS_108;
        let __VLS_109;
        let __VLS_110;
        const __VLS_111 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                if (!(__VLS_ctx.editorMode))
                    return;
                __VLS_ctx.emit('back');
            }
        };
        __VLS_107.slots.default;
        var __VLS_107;
    }
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
            ref: ((el) => __VLS_ctx.setCardRef(el, comp.id)),
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-card-header-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chart-card-name" },
        });
        (__VLS_ctx.getComponentDisplayName(comp));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chart-card-subtitle" },
        });
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(comp).chartType));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-card-actions" },
        });
        const __VLS_112 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            size: "small",
            type: (__VLS_ctx.getComponentStatus(comp).type),
            ...{ style: {} },
        }));
        const __VLS_114 = __VLS_113({
            size: "small",
            type: (__VLS_ctx.getComponentStatus(comp).type),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        (__VLS_ctx.getComponentStatus(comp).label);
        var __VLS_115;
        const __VLS_116 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }));
        const __VLS_118 = __VLS_117({
            ...{ 'onConfirm': {} },
            title: "从仪表板移除此图表？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        let __VLS_120;
        let __VLS_121;
        let __VLS_122;
        const __VLS_123 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(comp.id);
            }
        };
        __VLS_119.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_119.slots;
            const __VLS_124 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
                ...{ class: "remove-btn" },
            }));
            const __VLS_126 = __VLS_125({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_125));
            __VLS_127.slots.default;
            const __VLS_128 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({}));
            const __VLS_130 = __VLS_129({}, ...__VLS_functionalComponentArgsRest(__VLS_129));
            var __VLS_127;
        }
        var __VLS_119;
        if (__VLS_ctx.isStaticWidget(comp)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-canvas" },
            });
            /** @type {[typeof ComponentStaticPreview, ]} */ ;
            // @ts-ignore
            const __VLS_132 = __VLS_asFunctionalComponent(ComponentStaticPreview, new ComponentStaticPreview({
                chartType: (__VLS_ctx.getComponentChartConfig(comp).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(comp)),
                styleConfig: (__VLS_ctx.getComponentConfig(comp).style),
                showTitle: (__VLS_ctx.getComponentConfig(comp).style.showTitle),
            }));
            const __VLS_133 = __VLS_132({
                chartType: (__VLS_ctx.getComponentChartConfig(comp).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(comp)),
                styleConfig: (__VLS_ctx.getComponentConfig(comp).style),
                showTitle: (__VLS_ctx.getComponentConfig(comp).style.showTitle),
            }, ...__VLS_functionalComponentArgsRest(__VLS_132));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ref: ((el) => __VLS_ctx.setChartRef(el, comp.id)),
                ...{ class: "chart-canvas" },
            });
        }
        if (__VLS_ctx.showNoField(comp)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "no-field-tip" },
            });
        }
        else if (!__VLS_ctx.isStaticWidget(comp) && !__VLS_ctx.isRenderableChart(comp)) {
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
        const __VLS_135 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }));
        const __VLS_137 = __VLS_136({
            description: "暂无图表组件，点击「添加图表」将图表加入仪表板",
            ...{ class: "grid-empty" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dash-inspector" },
});
/** @type {[typeof EditorComponentInspector, ]} */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}));
const __VLS_140 = __VLS_139({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "dashboard",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
let __VLS_142;
let __VLS_143;
let __VLS_144;
const __VLS_145 = {
    onApplyLayout: (__VLS_ctx.applyLayoutPatch)
};
const __VLS_146 = {
    onBringFront: (__VLS_ctx.bringComponentToFront)
};
const __VLS_147 = {
    onRemove: (__VLS_ctx.handleRemoveActiveComponent)
};
const __VLS_148 = {
    onPreviewComponent: (__VLS_ctx.previewActiveComponent)
};
const __VLS_149 = {
    onSaveComponent: (__VLS_ctx.saveActiveComponent)
};
var __VLS_141;
const __VLS_150 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_152 = __VLS_151({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建仪表板",
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
__VLS_153.slots.default;
const __VLS_154 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_156 = __VLS_155({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
__VLS_157.slots.default;
const __VLS_158 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    label: "名称",
}));
const __VLS_160 = __VLS_159({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
__VLS_161.slots.default;
const __VLS_162 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}));
const __VLS_164 = __VLS_163({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入仪表板名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
var __VLS_161;
var __VLS_157;
{
    const { footer: __VLS_thisSlot } = __VLS_153.slots;
    const __VLS_166 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
        ...{ 'onClick': {} },
    }));
    const __VLS_168 = __VLS_167({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_167));
    let __VLS_170;
    let __VLS_171;
    let __VLS_172;
    const __VLS_173 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_169.slots.default;
    var __VLS_169;
    const __VLS_174 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_176 = __VLS_175({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
    let __VLS_178;
    let __VLS_179;
    let __VLS_180;
    const __VLS_181 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_177.slots.default;
    var __VLS_177;
}
var __VLS_153;
const __VLS_182 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}));
const __VLS_184 = __VLS_183({
    modelValue: (__VLS_ctx.addChartVisible),
    title: "添加图表到仪表板",
    width: "500px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
__VLS_185.slots.default;
const __VLS_186 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_188 = __VLS_187({
    modelValue: (__VLS_ctx.chartSearch),
    placeholder: "搜索图表名称",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
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
    const __VLS_190 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({}));
    const __VLS_192 = __VLS_191({}, ...__VLS_functionalComponentArgsRest(__VLS_191));
    __VLS_193.slots.default;
    const __VLS_194 = {}.PieChart;
    /** @type {[typeof __VLS_components.PieChart, ]} */ ;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({}));
    const __VLS_196 = __VLS_195({}, ...__VLS_functionalComponentArgsRest(__VLS_195));
    var __VLS_193;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pick-name" },
    });
    (c.name);
    const __VLS_198 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
        size: "small",
        type: "info",
    }));
    const __VLS_200 = __VLS_199({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    __VLS_201.slots.default;
    (c.chartType);
    var __VLS_201;
}
if (!__VLS_ctx.filteredCharts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_185.slots;
    const __VLS_202 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
        ...{ 'onClick': {} },
    }));
    const __VLS_204 = __VLS_203({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_203));
    let __VLS_206;
    let __VLS_207;
    let __VLS_208;
    const __VLS_209 = {
        onClick: (...[$event]) => {
            __VLS_ctx.addChartVisible = false;
        }
    };
    __VLS_205.slots.default;
    var __VLS_205;
    const __VLS_210 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }));
    const __VLS_212 = __VLS_211({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.addingChart),
        disabled: (!__VLS_ctx.selectedChartId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    let __VLS_214;
    let __VLS_215;
    let __VLS_216;
    const __VLS_217 = {
        onClick: (__VLS_ctx.handleAddChart)
    };
    __VLS_213.slots.default;
    var __VLS_213;
}
var __VLS_185;
const __VLS_218 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_220 = __VLS_219({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享仪表板",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_219));
__VLS_221.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_222 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_223 = __VLS_asFunctionalComponent(__VLS_222, new __VLS_222({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_224 = __VLS_223({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_223));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_226 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_228 = __VLS_227({
        title: "当前仪表板尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、允许访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_227));
}
{
    const { footer: __VLS_thisSlot } = __VLS_221.slots;
    const __VLS_230 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
        ...{ 'onClick': {} },
    }));
    const __VLS_232 = __VLS_231({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_231));
    let __VLS_234;
    let __VLS_235;
    let __VLS_236;
    const __VLS_237 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_233.slots.default;
    var __VLS_233;
    if (!__VLS_ctx.isPublished) {
        const __VLS_238 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_240 = __VLS_239({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_239));
        let __VLS_242;
        let __VLS_243;
        let __VLS_244;
        const __VLS_245 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_241.slots.default;
        var __VLS_241;
    }
    else {
        const __VLS_246 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
            ...{ 'onClick': {} },
        }));
        const __VLS_248 = __VLS_247({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_247));
        let __VLS_250;
        let __VLS_251;
        let __VLS_252;
        const __VLS_253 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_249.slots.default;
        var __VLS_249;
        const __VLS_254 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_256 = __VLS_255({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_255));
        let __VLS_258;
        let __VLS_259;
        let __VLS_260;
        const __VLS_261 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_257.slots.default;
        var __VLS_257;
    }
}
var __VLS_221;
const __VLS_262 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_264 = __VLS_263({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布仪表板",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
__VLS_265.slots.default;
const __VLS_266 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    labelWidth: "120px",
}));
const __VLS_268 = __VLS_267({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
__VLS_269.slots.default;
const __VLS_270 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
    label: "发布状态",
}));
const __VLS_272 = __VLS_271({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_271));
__VLS_273.slots.default;
const __VLS_274 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_276 = __VLS_275({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_275));
var __VLS_273;
const __VLS_278 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
    label: "允许匿名链接",
}));
const __VLS_280 = __VLS_279({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
__VLS_281.slots.default;
const __VLS_282 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_284 = __VLS_283({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_283));
var __VLS_281;
const __VLS_286 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent(__VLS_286, new __VLS_286({
    label: "允许访问角色",
}));
const __VLS_288 = __VLS_287({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
__VLS_289.slots.default;
const __VLS_290 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_292 = __VLS_291({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
__VLS_293.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_294 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_295 = __VLS_asFunctionalComponent(__VLS_294, new __VLS_294({
        key: (role),
        label: (role),
    }));
    const __VLS_296 = __VLS_295({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_295));
    __VLS_297.slots.default;
    (role);
    var __VLS_297;
}
var __VLS_293;
var __VLS_289;
const __VLS_298 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
    label: "正式分享链接",
}));
const __VLS_300 = __VLS_299({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
__VLS_301.slots.default;
const __VLS_302 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_304 = __VLS_303({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_303));
var __VLS_301;
var __VLS_269;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_265.slots;
    const __VLS_306 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
        ...{ 'onClick': {} },
    }));
    const __VLS_308 = __VLS_307({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_307));
    let __VLS_310;
    let __VLS_311;
    let __VLS_312;
    const __VLS_313 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_309.slots.default;
    var __VLS_309;
    const __VLS_314 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_316 = __VLS_315({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_315));
    let __VLS_318;
    let __VLS_319;
    let __VLS_320;
    const __VLS_321 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_317.slots.default;
    var __VLS_317;
}
var __VLS_265;
/** @type {__VLS_StyleScopedClasses['dash-root']} */ ;
/** @type {__VLS_StyleScopedClasses['dash-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header-btns']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-search-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-list']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-meta']} */ ;
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
/** @type {__VLS_StyleScopedClasses['section-title-block']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtext']} */ ;
/** @type {__VLS_StyleScopedClasses['section-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-header-main']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
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
            ArrowLeft: ArrowLeft,
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
            ComponentStaticPreview: ComponentStaticPreview,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            emit: emit,
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
            editorMode: editorMode,
            filteredCharts: filteredCharts,
            filteredDashboards: filteredDashboards,
            getDashboardComponentCount: getDashboardComponentCount,
            getDashboardStatusText: getDashboardStatusText,
            shareLink: shareLink,
            roleOptions: roleOptions,
            isPublished: isPublished,
            draftPublishedLink: draftPublishedLink,
            activeComponent: activeComponent,
            activeChart: activeChart,
            getComponentConfig: getComponentConfig,
            getComponentChartConfig: getComponentChartConfig,
            getComponentDisplayName: getComponentDisplayName,
            isStaticWidget: isStaticWidget,
            showNoField: showNoField,
            isRenderableChart: isRenderableChart,
            getComponentStatus: getComponentStatus,
            setCardRef: setCardRef,
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
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
