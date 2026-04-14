import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, CirclePlus, Close, Delete, Download, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { createChart, getChartData, getChartList } from '../api/chart';
import { createTemplate, getTemplateList } from '../api/chart-template';
import { getDatasetList } from '../api/dataset';
import { buildComponentAssetConfig, buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, materializeChartData, mergeComponentRequestFilters, normalizeComponentAssetConfig, normalizeComponentConfig, } from '../utils/component-config';
import { buildPublishedLink, buildReportConfig, normalizeCanvasConfig, normalizePublishConfig, parseReportConfig, SCREEN_CANVAS_PRESETS, } from '../utils/report-config';
const props = withDefaults(defineProps(), {
    screenId: null,
});
const emit = defineEmits();
const makeBarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/></svg>`;
const makeBarStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="6" y="8" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="18" y="12" width="8" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="18" y="4" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="30" y="18" width="8" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="30" y="10" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarHIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="20" height="6" fill="currentColor" rx="1"/><rect x="4" y="13" width="28" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="14" height="6" fill="currentColor" rx="1"/></svg>`;
const makeLineIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,26 12,16 20,20 28,8 36,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const makeAreaIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="4,28 4,20 12,12 20,16 28,6 36,10 36,28" fill="currentColor" opacity=".4"/><polyline points="4,20 12,12 20,16 28,6 36,10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const makeLineStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,24 12,18 20,20 28,12 36,16" fill="none" stroke="currentColor" stroke-width="2" opacity=".5" stroke-linecap="round"/><polyline points="4,18 12,10 20,14 28,6 36,8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const makePieIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="12" fill="currentColor" opacity=".25"/><path d="M20,16 L20,4 A12,12 0 0,1 30.4,22 Z" fill="currentColor"/><path d="M20,16 L30.4,22 A12,12 0 0,1 9.6,22 Z" fill="currentColor" opacity=".6"/></svg>`;
const makeDoughnutIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,4 a12,12 0 0 1 10.4,18 l-6-3.5 a5.5,5.5 0 0 0 -4.4-8.3 Z" fill="currentColor"/><path d="M20,4 a12,12 0 0 0 -12,12 l7,.1 a5.5,5.5 0 0 1 5.5-5.6 Z" fill="currentColor" opacity=".5"/><circle cx="20" cy="16" r="5" fill="#fff" opacity=".9"/></svg>`;
const makeRoseIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,16 L20,6 A4,4 0 0,1 20,6 L24,16 Z" fill="currentColor" opacity=".9"/><path d="M20,16 L24,16 A8,8 0,0,1 14,22 Z" fill="currentColor" opacity=".7"/><path d="M20,16 L14,22 A6,6,0,0,1 14,8 Z" fill="currentColor" opacity=".5"/></svg>`;
const makeRadarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="20,4 32,12 28,26 12,26 8,12" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><polygon points="20,10 27,14 24,22 16,22 13,14" fill="currentColor" opacity=".5"/></svg>`;
const makeFunnelIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="6,4 34,4 28,13 12,13" fill="currentColor" opacity=".9" rx="1"/><polygon points="12,14 28,14 24,22 16,22" fill="currentColor" opacity=".6"/><polygon points="16,23 24,23 21,30 19,30" fill="currentColor" opacity=".4"/></svg>`;
const makeGaugeIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M8,24 A12,12 0 0,1 32,24" fill="none" stroke="currentColor" stroke-width="3" opacity=".3" stroke-linecap="round"/><path d="M8,24 A12,12 0 0,1 24,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="24" x2="26" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="24" r="2.5" fill="currentColor"/></svg>`;
const makeScatterIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="22" r="2.5" fill="currentColor"/><circle cx="16" cy="10" r="2.5" fill="currentColor"/><circle cx="22" cy="18" r="2.5" fill="currentColor"/><circle cx="28" cy="8" r="2.5" fill="currentColor"/><circle cx="32" cy="20" r="2.5" fill="currentColor"/></svg>`;
const makeTreemapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="20" height="18" fill="currentColor" opacity=".8" rx="1"/><rect x="25" y="3" width="12" height="10" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="15" width="12" height="6" fill="currentColor" opacity=".35" rx="1"/><rect x="3" y="23" width="34" height="6" fill="currentColor" opacity=".25" rx="1"/></svg>`;
const makeTableIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="7" fill="currentColor" rx="1"/><rect x="4" y="13" width="32" height="5" fill="currentColor" opacity=".4" rx="1"/><rect x="4" y="20" width="32" height="5" fill="currentColor" opacity=".25" rx="1"/><line x1="18" y1="4" x2="18" y2="25" stroke="white" stroke-width="1" opacity=".4"/></svg>`;
const CHART_CATEGORIES = [
    {
        label: '指标',
        types: [
            { type: 'gauge', label: '仪表盘', svgIcon: makeGaugeIcon() },
        ],
    },
    {
        label: '表格',
        types: [
            { type: 'table', label: '明细表', svgIcon: makeTableIcon() },
        ],
    },
    {
        label: '线/面图',
        types: [
            { type: 'line', label: '基础折线图', svgIcon: makeLineIcon() },
            { type: 'area', label: '面积图', svgIcon: makeAreaIcon() },
            { type: 'line_stack', label: '堆叠折线图', svgIcon: makeLineStackIcon() },
        ],
    },
    {
        label: '柱/条图',
        types: [
            { type: 'bar', label: '基础柱状图', svgIcon: makeBarIcon() },
            { type: 'bar_stack', label: '堆叠柱状图', svgIcon: makeBarStackIcon() },
            { type: 'bar_percent', label: '百分比柱状图', svgIcon: makeBarStackIcon() },
            { type: 'bar_group', label: '分组柱状图', svgIcon: makeBarIcon() },
            { type: 'bar_horizontal', label: '基础条形图', svgIcon: makeBarHIcon() },
            { type: 'bar_horizontal_stack', label: '堆叠条形图', svgIcon: makeBarHIcon() },
        ],
    },
    {
        label: '分布图',
        types: [
            { type: 'pie', label: '饼图', svgIcon: makePieIcon() },
            { type: 'doughnut', label: '环形图', svgIcon: makeDoughnutIcon() },
            { type: 'rose', label: '玫瑰图', svgIcon: makeRoseIcon() },
            { type: 'radar', label: '雷达图', svgIcon: makeRadarIcon() },
            { type: 'funnel', label: '漏斗图', svgIcon: makeFunnelIcon() },
            { type: 'treemap', label: '矩形树图', svgIcon: makeTreemapIcon() },
        ],
    },
    {
        label: '关系图',
        types: [
            { type: 'scatter', label: '散点图', svgIcon: makeScatterIcon() },
        ],
    },
];
const activeCat = ref(CHART_CATEGORIES[0].label);
const activeCategoryTypes = computed(() => CHART_CATEGORIES.find((c) => c.label === activeCat.value)?.types ?? []);
const selectTypeFilter = (type) => {
    assetType.value = assetType.value === type ? '' : type;
    libraryTab.value = 'templates';
};
const loading = ref(false);
const compLoading = ref(false);
const dashboards = ref([]);
const currentDashboard = ref(null);
const components = ref([]);
const charts = ref([]);
const datasets = ref([]);
const templates = ref([]);
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])));
const datasetMap = computed(() => new Map(datasets.value.map((item) => [item.id, item])));
const dashboardCounts = ref(new Map());
const componentDataMap = ref(new Map());
const canvasRef = ref(null);
const activeCompId = ref(null);
const dashboardSearch = ref('');
const shareVisible = ref(false);
const publishVisible = ref(false);
const publishSaving = ref(false);
const canvasSaving = ref(false);
const libraryTab = ref('templates');
const assetSearch = ref('');
const assetType = ref('');
const selectedChartId = ref(null);
const selectedTemplateId = ref(null);
const draggingTemplateId = ref(null);
const stageDropActive = ref(false);
const createDashVisible = ref(false);
const dashSaving = ref(false);
const dashForm = reactive({ name: '' });
const templateSaveVisible = ref(false);
const templateSaving = ref(false);
const templateForm = reactive({ name: '', description: '' });
const publishForm = reactive({
    published: false,
    allowAnonymousAccess: true,
    allowedRoles: ['ADMIN', 'ANALYST'],
    shareToken: ''
});
const chartRefs = new Map();
const chartInstances = new Map();
let interactionFrame = null;
let pendingPointer = null;
const MIN_CARD_WIDTH = 320;
const MIN_CARD_HEIGHT = 220;
const LEGACY_GRID_COL_PX = 42;
const LEGACY_GRID_ROW_PX = 70;
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
    { label: '表格', value: 'table' },
    { label: '漏斗图', value: 'funnel' },
    { label: '仪表盘', value: 'gauge' },
    { label: '散点图', value: 'scatter' },
    { label: '雷达图', value: 'radar' },
    { label: '矩形树图', value: 'treemap' },
];
const filteredCharts = computed(() => {
    const keyword = assetSearch.value.trim().toLowerCase();
    return charts.value.filter((item) => {
        const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword);
        const matchType = !assetType.value || item.chartType === assetType.value;
        return matchKeyword && matchType;
    });
});
const filteredTemplates = computed(() => {
    const keyword = assetSearch.value.trim().toLowerCase();
    return templates.value.filter((item) => {
        const matchKeyword = !keyword
            || item.name.toLowerCase().includes(keyword)
            || item.description.toLowerCase().includes(keyword);
        const matchType = !assetType.value || item.chartType === assetType.value;
        return matchKeyword && matchType;
    });
});
const selectedChartAsset = computed(() => charts.value.find((item) => item.id === selectedChartId.value) ?? null);
const selectedTemplate = computed(() => templates.value.find((item) => item.id === selectedTemplateId.value) ?? null);
const selectedLibraryAsset = computed(() => libraryTab.value === 'templates' ? selectedTemplate.value : selectedChartAsset.value);
const filteredDashboards = computed(() => {
    const keyword = dashboardSearch.value.trim().toLowerCase();
    return keyword ? dashboards.value.filter((item) => item.name.toLowerCase().includes(keyword)) : dashboards.value;
});
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish));
const isPublished = computed(() => currentPublishConfig.value.status === 'PUBLISHED');
const shareLink = computed(() => currentDashboard.value
    ? buildPublishedLink('screen', currentDashboard.value.id, currentPublishConfig.value.shareToken)
    : '');
const previewLink = computed(() => currentDashboard.value
    ? `${window.location.origin}/preview/screen/${currentDashboard.value.id}`
    : '');
const draftPublishedLink = computed(() => currentDashboard.value
    ? buildPublishedLink('screen', currentDashboard.value.id, publishForm.shareToken || currentPublishConfig.value.shareToken)
    : '');
const roleOptions = ['ADMIN', 'ANALYST', 'VIEWER'];
const activeComponent = computed(() => components.value.find((item) => item.id === activeCompId.value) ?? null);
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null);
const getComponentConfig = (component) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId));
const getComponentChartConfig = (component) => getComponentConfig(component).chart;
const currentCanvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(currentDashboard.value?.configJson).canvas, 'screen'));
const matchedCanvasPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === currentCanvasConfig.value.width && item.height === currentCanvasConfig.value.height)?.id ?? 'custom');
const canvasMinHeight = computed(() => {
    const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0);
    return Math.max(currentCanvasConfig.value.height, 560, occupied);
});
const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? currentCanvasConfig.value.width, MIN_CARD_WIDTH + 32);
const setChartRef = (el, componentId) => {
    if (el)
        chartRefs.set(componentId, el);
    else
        chartRefs.delete(componentId);
};
const getDashboardComponentCount = (dashboardId) => dashboardCounts.value.get(dashboardId) ?? 0;
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
    component.zIndex = Number(component.zIndex) || 0;
};
const getCardStyle = (component) => ({
    left: `${component.posX}px`,
    top: `${component.posY}px`,
    width: `${component.width}px`,
    height: `${component.height}px`,
    zIndex: String(component.zIndex ?? 0),
});
const buildCounts = async () => {
    const entries = await Promise.all(dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length]));
    dashboardCounts.value = new Map(entries);
};
const loadBaseData = async () => {
    loading.value = true;
    try {
        const [dashboardList, chartList, datasetList, templateList] = await Promise.all([
            getDashboardList(),
            getChartList(),
            getDatasetList(),
            getTemplateList()
        ]);
        dashboards.value = dashboardList;
        charts.value = chartList;
        datasets.value = datasetList;
        templates.value = templateList;
        if (!selectedTemplateId.value && templateList.length)
            selectedTemplateId.value = templateList[0].id;
        if (!selectedChartId.value && chartList.length)
            selectedChartId.value = chartList[0].id;
        if (props.screenId) {
            // 编辑器模式：直接加载指定大屏
            const target = dashboardList.find((d) => d.id === props.screenId);
            if (target) {
                await selectDashboard(target);
            }
            else {
                ElMessage.error('未找到对应大屏');
            }
        }
        else {
            await buildCounts();
            if (dashboardList.length)
                await selectDashboard(dashboardList[0]);
        }
    }
    finally {
        loading.value = false;
    }
};
const disposeCharts = () => {
    chartInstances.forEach((instance) => instance.dispose());
    chartInstances.clear();
    chartRefs.clear();
};
const selectDashboard = async (dashboard) => {
    currentDashboard.value = dashboard;
    activeCompId.value = null;
    await loadComponents();
};
const loadComponents = async () => {
    if (!currentDashboard.value)
        return;
    compLoading.value = true;
    disposeCharts();
    componentDataMap.value = new Map();
    try {
        const result = await getDashboardComponents(currentDashboard.value.id);
        result.forEach(normalizeLayout);
        components.value = result;
        dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length);
        await nextTick();
        await Promise.all(result.map((component) => loadComponentData(component)));
    }
    finally {
        compLoading.value = false;
    }
};
const loadComponentData = async (component) => {
    const chart = getComponentChartConfig(component);
    if (!chart || showNoField(component))
        return;
    try {
        const resolved = getComponentConfig(component);
        const data = await getChartData(component.chartId, {
            configJson: component.configJson,
            filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
        });
        const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart);
        const nextMap = new Map(componentDataMap.value);
        nextMap.set(component.id, materialized);
        componentDataMap.value = nextMap;
        if (isRenderableChart(component))
            renderChart(component, materialized);
    }
    catch {
        ElMessage.warning(`组件 ${chart.name} 数据加载失败`);
    }
};
const renderChart = (component, data) => {
    const el = chartRefs.get(component.id);
    if (!el)
        return;
    let chartInstance = chartInstances.get(component.id);
    if (!chartInstance) {
        chartInstance = echarts.init(el);
        chartInstances.set(component.id, chartInstance);
    }
    const resolved = getComponentConfig(component);
    chartInstance.setOption(buildComponentOption(data, resolved.chart, resolved.style), true);
};
const isTableChart = (component) => getComponentChartConfig(component).chartType === 'table';
const isRenderableChart = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isCanvasRenderableChartType(type);
};
const showNoField = (component) => getMissingChartFields(getComponentChartConfig(component)).length > 0;
const getTableColumns = (componentId) => componentDataMap.value.get(componentId)?.columns ?? [];
const getTableRows = (componentId) => componentDataMap.value.get(componentId)?.rawRows ?? [];
const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0);
const focusComponent = (component) => {
    activeCompId.value = component.id;
    const nextZ = getMaxZ() + 1;
    if ((component.zIndex ?? 0) < nextZ)
        component.zIndex = nextZ;
};
const applyLayoutPatch = async (patch) => {
    const component = activeComponent.value;
    if (!component)
        return;
    if (typeof patch.posX === 'number')
        component.posX = Math.max(0, Math.round(patch.posX));
    if (typeof patch.posY === 'number')
        component.posY = Math.max(0, Math.round(patch.posY));
    if (typeof patch.width === 'number')
        component.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width));
    if (typeof patch.height === 'number')
        component.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height));
    if (typeof patch.zIndex === 'number')
        component.zIndex = Math.max(0, Math.round(patch.zIndex));
    normalizeLayout(component);
    await nextTick();
    chartInstances.get(component.id)?.resize();
    await persistLayout(component);
};
const bringComponentToFront = async () => {
    const component = activeComponent.value;
    if (!component)
        return;
    await applyLayoutPatch({ zIndex: getMaxZ() + 1 });
};
const handleRemoveActiveComponent = async () => {
    if (!activeComponent.value)
        return;
    await removeComponent(activeComponent.value.id);
};
const previewActiveComponent = async (payload) => {
    const component = activeComponent.value;
    if (!component)
        return;
    component.chartId = payload.chartId;
    component.configJson = payload.configJson;
    await nextTick();
    await loadComponentData(component);
};
const saveActiveComponent = async (payload) => {
    const component = activeComponent.value;
    if (!component || !currentDashboard.value)
        return;
    await updateDashboardComponent(currentDashboard.value.id, component.id, payload);
    component.chartId = payload.chartId;
    component.configJson = payload.configJson;
    await loadComponents();
    ElMessage.success('组件实例配置已保存');
};
const persistLayout = async (component) => {
    if (!currentDashboard.value)
        return;
    try {
        await updateDashboardComponent(currentDashboard.value.id, component.id, {
            posX: Math.round(component.posX),
            posY: Math.round(component.posY),
            width: Math.round(component.width),
            height: Math.round(component.height),
            zIndex: component.zIndex,
        });
    }
    catch {
        ElMessage.warning('布局保存失败，请重试');
    }
};
let interaction = null;
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const findComponent = (id) => components.value.find((item) => item.id === id);
const applyInteractionFrame = () => {
    interactionFrame = null;
    if (!interaction || !pendingPointer)
        return;
    const component = findComponent(interaction.compId);
    if (!component)
        return;
    const dx = pendingPointer.x - interaction.startMouseX;
    const dy = pendingPointer.y - interaction.startMouseY;
    if (interaction.mode === 'move') {
        const maxX = Math.max(0, getCanvasWidth() - component.width);
        component.posX = Math.min(maxX, Math.max(0, interaction.startX + dx));
        component.posY = Math.max(0, interaction.startY + dy);
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
        component.posX = Math.round(nextX);
        component.posY = Math.round(nextY);
        component.width = Math.round(nextWidth);
        component.height = Math.round(nextHeight);
        chartInstances.get(component.id)?.resize();
    }
};
const scheduleInteractionFrame = () => {
    if (interactionFrame !== null)
        return;
    interactionFrame = window.requestAnimationFrame(applyInteractionFrame);
};
const cleanupInteractionFrame = () => {
    if (interactionFrame !== null) {
        window.cancelAnimationFrame(interactionFrame);
        interactionFrame = null;
    }
    pendingPointer = null;
    document.body.classList.remove('canvas-interacting');
};
const startDrag = (event, component) => {
    focusComponent(component);
    interaction = {
        mode: 'move',
        compId: component.id,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startX: component.posX,
        startY: component.posY,
        startWidth: component.width,
        startHeight: component.height,
    };
    pendingPointer = { x: event.clientX, y: event.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const startResize = (event, component, handle = 'se') => {
    focusComponent(component);
    interaction = {
        mode: 'resize',
        compId: component.id,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startX: component.posX,
        startY: component.posY,
        startWidth: component.width,
        startHeight: component.height,
        handle,
    };
    pendingPointer = { x: event.clientX, y: event.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const onPointerMove = (event) => {
    if (!interaction)
        return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    scheduleInteractionFrame();
};
const onPointerUp = async () => {
    if (!interaction)
        return;
    const component = findComponent(interaction.compId);
    if (pendingPointer) {
        applyInteractionFrame();
    }
    interaction = null;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    if (component) {
        chartInstances.get(component.id)?.resize();
        await persistLayout(component);
    }
};
const openCreateDashboard = () => {
    dashForm.name = '';
    createDashVisible.value = true;
};
const handleCreateDashboard = async () => {
    if (!dashForm.name.trim()) {
        ElMessage.warning('请输入大屏名称');
        return;
    }
    dashSaving.value = true;
    try {
        const dashboard = await createDashboard({ name: dashForm.name, configJson: buildReportConfig(null, 'screen') });
        dashboards.value.unshift(dashboard);
        dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, 0);
        createDashVisible.value = false;
        await selectDashboard(dashboard);
        ElMessage.success('数据大屏创建成功');
    }
    finally {
        dashSaving.value = false;
    }
};
const handleDeleteDashboard = async (id) => {
    await deleteDashboard(id);
    dashboards.value = dashboards.value.filter((item) => item.id !== id);
    const nextCounts = new Map(dashboardCounts.value);
    nextCounts.delete(id);
    dashboardCounts.value = nextCounts;
    if (currentDashboard.value?.id === id) {
        currentDashboard.value = dashboards.value[0] ?? null;
        if (currentDashboard.value)
            await loadComponents();
        else
            components.value = [];
    }
    ElMessage.success('已删除数据大屏');
};
const openPreview = (usePublishedLink = false) => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    window.open(usePublishedLink && isPublished.value ? shareLink.value : previewLink.value, '_blank', 'noopener,noreferrer');
};
const openShareDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    shareVisible.value = true;
};
const openPublishDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
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
        const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', {
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
const updateCanvasConfig = async (patch) => {
    if (!currentDashboard.value)
        return;
    canvasSaving.value = true;
    try {
        const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', undefined, patch);
        const updated = await updateDashboard(currentDashboard.value.id, { configJson });
        currentDashboard.value = updated;
        dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item);
        await nextTick();
        handleWindowResize();
    }
    finally {
        canvasSaving.value = false;
    }
};
const applyCanvasPreset = async (presetId) => {
    if (presetId === 'custom')
        return;
    const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId);
    if (!preset)
        return;
    await updateCanvasConfig({ width: preset.width, height: preset.height });
};
const updateCanvasDimension = async (dimension, value) => {
    const fallback = currentCanvasConfig.value[dimension];
    const normalizedValue = Math.max(dimension === 'width' ? 640 : 360, Math.round(Number(value) || fallback));
    if (normalizedValue === currentCanvasConfig.value[dimension])
        return;
    await updateCanvasConfig({ [dimension]: normalizedValue });
};
const onCanvasWidthChange = (value) => updateCanvasDimension('width', value ?? undefined);
const onCanvasHeightChange = (value) => updateCanvasDimension('height', value ?? undefined);
const copyShareLink = async () => {
    if (!isPublished.value) {
        ElMessage.warning('请先发布数据大屏');
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
const exportScreenJson = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    const payload = {
        screen: currentDashboard.value,
        components: components.value,
        charts: components.value
            .map((component) => chartMap.value.get(component.chartId))
            .filter((chart) => Boolean(chart))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDashboard.value.name}-screen.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
};
const getTemplateDatasetName = (template) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    return datasetMap.value.get(Number(asset.chart.datasetId) || -1)?.name ?? '未关联数据集';
};
const getTemplateLayoutText = (template) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    return `${asset.layout.width} × ${asset.layout.height}`;
};
const openSaveAssetDialog = () => {
    if (!activeComponent.value) {
        ElMessage.warning('请先选中一个画布组件');
        return;
    }
    const currentName = getComponentChartConfig(activeComponent.value).name || '未命名组件';
    templateForm.name = `${currentName}-复用组件`;
    templateForm.description = '';
    templateSaveVisible.value = true;
};
const saveActiveComponentAsAsset = async () => {
    if (!activeComponent.value) {
        ElMessage.warning('请先选中一个画布组件');
        return;
    }
    if (!templateForm.name.trim()) {
        ElMessage.warning('请输入组件名称');
        return;
    }
    const baseChart = chartMap.value.get(activeComponent.value.chartId) ?? null;
    const resolved = getComponentConfig(activeComponent.value);
    templateSaving.value = true;
    try {
        const created = await createTemplate({
            name: templateForm.name.trim(),
            description: templateForm.description.trim(),
            chartType: resolved.chart.chartType,
            configJson: buildComponentAssetConfig(baseChart, activeComponent.value.configJson, {
                chart: {
                    ...resolved.chart,
                    name: templateForm.name.trim(),
                },
            }, {
                width: activeComponent.value.width,
                height: activeComponent.value.height,
            }),
        });
        templates.value = [created, ...templates.value];
        selectedTemplateId.value = created.id;
        libraryTab.value = 'templates';
        templateSaveVisible.value = false;
        ElMessage.success('组件已保存到组件库');
    }
    finally {
        templateSaving.value = false;
    }
};
const handleAddSelectedAsset = async () => {
    if (libraryTab.value === 'templates') {
        if (!selectedTemplate.value) {
            ElMessage.warning('请先选择组件资产');
            return;
        }
        await addTemplateToScreen(selectedTemplate.value);
        return;
    }
    if (!selectedChartAsset.value) {
        ElMessage.warning('请先选择组件');
        return;
    }
    await addChartToScreen(selectedChartAsset.value);
};
const quickAddChart = async (chart) => {
    selectedChartId.value = chart.id;
    await addChartToScreen(chart);
};
const quickAddTemplate = async (template) => {
    selectedTemplateId.value = template.id;
    await addTemplateToScreen(template);
};
const resolveDropPlacement = (width, height, point) => {
    if (!point || !canvasRef.value) {
        const lastY = components.value.reduce((max, item) => Math.max(max, item.posY + item.height), 0);
        return {
            posX: 16,
            posY: lastY + 16,
            width,
            height,
        };
    }
    const rect = canvasRef.value.getBoundingClientRect();
    const posX = Math.max(0, Math.min(getCanvasWidth() - width, point.clientX - rect.left - width / 2));
    const posY = Math.max(0, point.clientY - rect.top - 28);
    return {
        posX: Math.round(posX),
        posY: Math.round(posY),
        width,
        height,
    };
};
const addChartToScreen = async (chart, configJson, size, point) => {
    if (!currentDashboard.value) {
        ElMessage.warning('请先选择大屏');
        return;
    }
    const nextSize = size ?? {
        width: chart.chartType === 'table' ? 760 : 520,
        height: chart.chartType === 'table' ? 340 : 320,
    };
    const placement = resolveDropPlacement(nextSize.width, nextSize.height, point);
    const component = await addDashboardComponent(currentDashboard.value.id, {
        chartId: chart.id,
        posX: placement.posX,
        posY: placement.posY,
        width: placement.width,
        height: placement.height,
        zIndex: getMaxZ() + 1,
        configJson: configJson ?? buildComponentConfig(chart, undefined, {
            chart: buildChartSnapshot(chart),
        }),
    });
    normalizeLayout(component);
    components.value.push(component);
    activeCompId.value = component.id;
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    await nextTick();
    await loadComponentData(component);
    ElMessage.success('组件已加入大屏');
};
const addTemplateToScreen = async (template, point) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    const datasetId = Number(asset.chart.datasetId);
    if (!Number.isFinite(datasetId) || datasetId <= 0) {
        ElMessage.warning('该组件资产未绑定有效数据集，请先调整后再使用');
        return;
    }
    const createdChart = await createChart({
        name: asset.chart.name || template.name,
        datasetId,
        chartType: asset.chart.chartType || template.chartType,
        xField: asset.chart.xField,
        yField: asset.chart.yField,
        groupField: asset.chart.groupField,
    });
    charts.value = [createdChart, ...charts.value.filter((item) => item.id !== createdChart.id)];
    selectedChartId.value = createdChart.id;
    await addChartToScreen(createdChart, buildComponentAssetConfig(createdChart, template.configJson, {
        chart: {
            ...asset.chart,
            name: asset.chart.name || template.name,
        },
    }, asset.layout), asset.layout, point);
};
const removeComponent = async (componentId) => {
    if (!currentDashboard.value)
        return;
    await removeDashboardComponent(currentDashboard.value.id, componentId);
    chartInstances.get(componentId)?.dispose();
    chartInstances.delete(componentId);
    chartRefs.delete(componentId);
    const nextData = new Map(componentDataMap.value);
    nextData.delete(componentId);
    componentDataMap.value = nextData;
    components.value = components.value.filter((item) => item.id !== componentId);
    if (activeCompId.value === componentId)
        activeCompId.value = null;
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    ElMessage.success('组件已移除');
};
const onTemplateDragStart = (event, template) => {
    selectedTemplateId.value = template.id;
    draggingTemplateId.value = template.id;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', String(template.id));
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
    }
};
const onTemplateDragEnd = () => {
    draggingTemplateId.value = null;
    stageDropActive.value = false;
};
const onStageDragOver = (event) => {
    if (!draggingTemplateId.value)
        return;
    stageDropActive.value = true;
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
    }
};
const onStageDragLeave = (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget && event.currentTarget?.contains(nextTarget)) {
        return;
    }
    stageDropActive.value = false;
};
const onStageDrop = async (event) => {
    const templateId = draggingTemplateId.value ?? Number(event.dataTransfer?.getData('text/plain') || 0);
    const template = templates.value.find((item) => item.id === templateId);
    stageDropActive.value = false;
    draggingTemplateId.value = null;
    if (!template)
        return;
    await addTemplateToScreen(template, { clientX: event.clientX, clientY: event.clientY });
};
const summarizeTemplateConfig = (configJson) => {
    const asset = normalizeComponentAssetConfig(configJson);
    const segments = [
        asset.chart.xField ? `维度 ${asset.chart.xField}` : '',
        asset.chart.yField ? `度量 ${asset.chart.yField}` : '',
        asset.chart.groupField ? `分组 ${asset.chart.groupField}` : '',
        asset.style.theme ? `主题 ${asset.style.theme}` : '',
    ];
    return segments.filter(Boolean).join(' / ');
};
const handleWindowResize = () => {
    chartInstances.forEach((instance) => instance.resize());
};
onMounted(async () => {
    window.addEventListener('resize', handleWindowResize);
    await loadBaseData();
});
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    window.removeEventListener('resize', handleWindowResize);
    disposeCharts();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    screenId: null,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
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
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-bar-content']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-head-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-canvas-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-type-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-type-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-type-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['type-grid-item']} */ ;
/** @type {__VLS_StyleScopedClasses['type-grid-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-root" },
    ...{ class: ({ 'screen-root--editor': __VLS_ctx.screenId }) },
});
if (__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "screen-type-sidebar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "type-cat-nav" },
    });
    for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.CHART_CATEGORIES))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.activeCat = cat.label;
                } },
            key: (cat.label),
            ...{ class: "type-cat-item" },
            ...{ class: ({ active: __VLS_ctx.activeCat === cat.label }) },
        });
        (cat.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "type-cat-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.activeCategoryTypes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectTypeFilter(item.type);
                } },
            key: (item.type),
            ...{ class: "type-grid-item" },
            ...{ class: ({ 'type-grid-item--active': __VLS_ctx.assetType === item.type }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "type-grid-icon" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (item.svgIcon) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "type-grid-label" },
        });
        (item.label);
    }
}
if (!__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "screen-sidebar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-subtitle" },
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
        ...{ class: "screen-search-wrap" },
    });
    const __VLS_8 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }));
    const __VLS_10 = __VLS_9({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-list" },
    });
    for (const [dashboard] of __VLS_getVForSourceType((__VLS_ctx.filteredDashboards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectDashboard(dashboard);
                } },
            key: (dashboard.id),
            ...{ class: "screen-item" },
            ...{ class: ({ active: __VLS_ctx.currentDashboard?.id === dashboard.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-name" },
        });
        (dashboard.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-meta" },
        });
        (__VLS_ctx.getDashboardComponentCount(dashboard.id));
        const __VLS_12 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }));
        const __VLS_14 = __VLS_13({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        let __VLS_16;
        let __VLS_17;
        let __VLS_18;
        const __VLS_19 = {
            onConfirm: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.handleDeleteDashboard(dashboard.id);
            }
        };
        __VLS_15.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_15.slots;
            const __VLS_20 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }));
            const __VLS_22 = __VLS_21({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
            let __VLS_24;
            let __VLS_25;
            let __VLS_26;
            const __VLS_27 = {
                onClick: () => { }
            };
            __VLS_23.slots.default;
            const __VLS_28 = {}.Delete;
            /** @type {[typeof __VLS_components.Delete, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
            const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
            var __VLS_23;
        }
        var __VLS_15;
    }
    if (!__VLS_ctx.dashboards.length && !__VLS_ctx.loading) {
        const __VLS_32 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            description: "暂无大屏",
            imageSize: (60),
        }));
        const __VLS_34 = __VLS_33({
            description: "暂无大屏",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-panel library-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-subtitle" },
    });
    const __VLS_36 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        type: "success",
        effect: "plain",
    }));
    const __VLS_38 = __VLS_37({
        type: "success",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    var __VLS_39;
    const __VLS_40 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }));
    const __VLS_42 = __VLS_41({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        label: "组件库",
        name: "templates",
    }));
    const __VLS_46 = __VLS_45({
        label: "组件库",
        name: "templates",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_47.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_48 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }));
    const __VLS_50 = __VLS_49({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    const __VLS_52 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_54 = __VLS_53({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    const __VLS_56 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        label: "全部类型",
        value: "",
    }));
    const __VLS_58 = __VLS_57({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_60 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_62 = __VLS_61({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    }
    var __VLS_55;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedTemplateId = template.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddTemplate(template);
                } },
            ...{ onDragstart: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.onTemplateDragStart($event, template);
                } },
            ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
            key: (template.id),
            ...{ class: "asset-card template-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedTemplateId === template.id, 'asset-card--builtin': template.builtIn }) },
            draggable: "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (template.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (template.description || '可复用组件资产');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-tags" },
        });
        if (template.builtIn) {
            const __VLS_64 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                size: "small",
                type: "success",
            }));
            const __VLS_66 = __VLS_65({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            __VLS_67.slots.default;
            var __VLS_67;
        }
        const __VLS_68 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            size: "small",
            effect: "dark",
        }));
        const __VLS_70 = __VLS_69({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        (__VLS_ctx.chartTypeLabel(template.chartType));
        var __VLS_71;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getTemplateDatasetName(template));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getTemplateLayoutText(template));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "template-config" },
        });
        (__VLS_ctx.summarizeTemplateConfig(template.configJson));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "drag-tip" },
        });
        const __VLS_72 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_74 = __VLS_73({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        let __VLS_76;
        let __VLS_77;
        let __VLS_78;
        const __VLS_79 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.quickAddTemplate(template);
            }
        };
        __VLS_75.slots.default;
        var __VLS_75;
    }
    if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
        const __VLS_80 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }));
        const __VLS_82 = __VLS_81({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    }
    var __VLS_47;
    const __VLS_84 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        label: "图表源",
        name: "charts",
    }));
    const __VLS_86 = __VLS_85({
        label: "图表源",
        name: "charts",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_88 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }));
    const __VLS_90 = __VLS_89({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    const __VLS_92 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_94 = __VLS_93({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    const __VLS_96 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        label: "全部类型",
        value: "",
    }));
    const __VLS_98 = __VLS_97({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_100 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_102 = __VLS_101({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    }
    var __VLS_95;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedChartId = chart.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddChart(chart);
                } },
            key: (chart.id),
            ...{ class: "asset-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedChartId === chart.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (chart.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-tags" },
        });
        const __VLS_104 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
            size: "small",
            effect: "dark",
        }));
        const __VLS_106 = __VLS_105({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        __VLS_107.slots.default;
        (__VLS_ctx.chartTypeLabel(chart.chartType));
        var __VLS_107;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (__VLS_ctx.datasetMap.get(chart.datasetId)?.name ?? '未关联');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (chart.xField || '未设');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (chart.yField || '未设');
    }
    if (!__VLS_ctx.filteredCharts.length && !__VLS_ctx.loading) {
        const __VLS_108 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            description: "没有匹配的图表源",
            imageSize: (60),
        }));
        const __VLS_110 = __VLS_109({
            description: "没有匹配的图表源",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    }
    var __VLS_87;
    var __VLS_43;
}
if (__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "screen-library-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-editor-head" },
    });
    const __VLS_112 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_116;
    let __VLS_117;
    let __VLS_118;
    const __VLS_119 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.screenId))
                return;
            __VLS_ctx.$emit('back');
        }
    };
    __VLS_115.slots.default;
    var __VLS_115;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "library-editor-title" },
    });
    (__VLS_ctx.currentDashboard?.name ?? '编辑大屏');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_120 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
        size: "small",
    }));
    const __VLS_122 = __VLS_121({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    const __VLS_124 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }));
    const __VLS_126 = __VLS_125({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        label: "组件库",
        name: "templates",
    }));
    const __VLS_130 = __VLS_129({
        label: "组件库",
        name: "templates",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedTemplateId = template.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddTemplate(template);
                } },
            ...{ onDragstart: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.onTemplateDragStart($event, template);
                } },
            ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
            key: (template.id),
            ...{ class: "asset-card template-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedTemplateId === template.id, 'asset-card--builtin': template.builtIn }) },
            draggable: "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (template.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (template.description || '可复用组件资产');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-tags" },
        });
        if (template.builtIn) {
            const __VLS_132 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
                size: "small",
                type: "success",
            }));
            const __VLS_134 = __VLS_133({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_133));
            __VLS_135.slots.default;
            var __VLS_135;
        }
        const __VLS_136 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            size: "small",
            effect: "dark",
        }));
        const __VLS_138 = __VLS_137({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        __VLS_139.slots.default;
        (__VLS_ctx.chartTypeLabel(template.chartType));
        var __VLS_139;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "drag-tip" },
        });
        const __VLS_140 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_144;
        let __VLS_145;
        let __VLS_146;
        const __VLS_147 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.screenId))
                    return;
                __VLS_ctx.quickAddTemplate(template);
            }
        };
        __VLS_143.slots.default;
        var __VLS_143;
    }
    if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
        const __VLS_148 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            description: "没有匹配的组件",
            imageSize: (60),
        }));
        const __VLS_150 = __VLS_149({
            description: "没有匹配的组件",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    }
    var __VLS_131;
    const __VLS_152 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        label: "图表源",
        name: "charts",
    }));
    const __VLS_154 = __VLS_153({
        label: "图表源",
        name: "charts",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedChartId = chart.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddChart(chart);
                } },
            key: (chart.id),
            ...{ class: "asset-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedChartId === chart.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (chart.name);
        const __VLS_156 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            size: "small",
            effect: "dark",
        }));
        const __VLS_158 = __VLS_157({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        __VLS_159.slots.default;
        (__VLS_ctx.chartTypeLabel(chart.chartType));
        var __VLS_159;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (__VLS_ctx.datasetMap.get(chart.datasetId)?.name ?? '未关联');
    }
    if (!__VLS_ctx.filteredCharts.length && !__VLS_ctx.loading) {
        const __VLS_160 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            description: "没有匹配的图表源",
            imageSize: (60),
        }));
        const __VLS_162 = __VLS_161({
            description: "没有匹配的图表源",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    }
    var __VLS_155;
    var __VLS_127;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "screen-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading || __VLS_ctx.compLoading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-empty-state" },
    });
    const __VLS_164 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }));
    const __VLS_166 = __VLS_165({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    const __VLS_168 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_170 = __VLS_169({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    __VLS_171.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_171;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-actions" },
    });
    const __VLS_172 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }));
    const __VLS_174 = __VLS_173({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    let __VLS_176;
    let __VLS_177;
    let __VLS_178;
    const __VLS_179 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    __VLS_175.slots.default;
    var __VLS_175;
    const __VLS_180 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }));
    const __VLS_182 = __VLS_181({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    let __VLS_184;
    let __VLS_185;
    let __VLS_186;
    const __VLS_187 = {
        onClick: (__VLS_ctx.openPreview)
    };
    __VLS_183.slots.default;
    var __VLS_183;
    const __VLS_188 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_190 = __VLS_189({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    let __VLS_192;
    let __VLS_193;
    let __VLS_194;
    const __VLS_195 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_191.slots.default;
    (__VLS_ctx.isPublished ? '发布设置' : '发布');
    var __VLS_191;
    const __VLS_196 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_198 = __VLS_197({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    let __VLS_200;
    let __VLS_201;
    let __VLS_202;
    const __VLS_203 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_199.slots.default;
    var __VLS_199;
    const __VLS_204 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (__VLS_ctx.exportScreenJson)
    };
    __VLS_207.slots.default;
    var __VLS_207;
    const __VLS_212 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }));
    const __VLS_214 = __VLS_213({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    let __VLS_216;
    let __VLS_217;
    let __VLS_218;
    const __VLS_219 = {
        onClick: (__VLS_ctx.openSaveAssetDialog)
    };
    __VLS_215.slots.default;
    var __VLS_215;
    const __VLS_220 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }));
    const __VLS_222 = __VLS_221({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    let __VLS_224;
    let __VLS_225;
    let __VLS_226;
    const __VLS_227 = {
        onClick: (__VLS_ctx.handleAddSelectedAsset)
    };
    __VLS_223.slots.default;
    var __VLS_223;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "readonly-banner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    if (__VLS_ctx.selectedLibraryAsset) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-bar-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-bar-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.selectedLibraryAsset.name);
        const __VLS_228 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
            size: "small",
        }));
        const __VLS_230 = __VLS_229({
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_229));
        __VLS_231.slots.default;
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.selectedLibraryAsset.chartType));
        var __VLS_231;
        if (__VLS_ctx.libraryTab === 'templates') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedTemplate?.builtIn ? '默认组件' : '自定义组件');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.datasetMap.get(__VLS_ctx.selectedChartAsset?.datasetId ?? -1)?.name ?? '未关联');
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-head-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-canvas-controls" },
    });
    const __VLS_232 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedCanvasPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_234 = __VLS_233({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedCanvasPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    let __VLS_236;
    let __VLS_237;
    let __VLS_238;
    const __VLS_239 = {
        onChange: (__VLS_ctx.applyCanvasPreset)
    };
    __VLS_235.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.SCREEN_CANVAS_PRESETS))) {
        const __VLS_240 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }));
        const __VLS_242 = __VLS_241({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    }
    const __VLS_244 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "自定义",
        value: "custom",
    }));
    const __VLS_246 = __VLS_245({
        label: "自定义",
        value: "custom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    var __VLS_235;
    const __VLS_248 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.currentCanvasConfig.width),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_250 = __VLS_249({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.currentCanvasConfig.width),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    let __VLS_252;
    let __VLS_253;
    let __VLS_254;
    const __VLS_255 = {
        onChange: (__VLS_ctx.onCanvasWidthChange)
    };
    var __VLS_251;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stage-canvas-separator" },
    });
    const __VLS_256 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.currentCanvasConfig.height),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_258 = __VLS_257({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.currentCanvasConfig.height),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    let __VLS_260;
    let __VLS_261;
    let __VLS_262;
    const __VLS_263 = {
        onChange: (__VLS_ctx.onCanvasHeightChange)
    };
    var __VLS_259;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stage-stats" },
    });
    (__VLS_ctx.components.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-stage-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: (__VLS_ctx.onStageDragOver) },
        ...{ onDragleave: (__VLS_ctx.onStageDragLeave) },
        ...{ onDrop: (__VLS_ctx.onStageDrop) },
        ref: "canvasRef",
        ...{ class: "screen-stage" },
        ...{ class: ({ 'screen-stage--drop': __VLS_ctx.stageDropActive }) },
        ...{ style: ({ width: `${__VLS_ctx.currentCanvasConfig.width}px`, minHeight: `${__VLS_ctx.canvasMinHeight}px`, height: `${__VLS_ctx.canvasMinHeight}px` }) },
    });
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    for (const [component] of __VLS_getVForSourceType((__VLS_ctx.components))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.focusComponent(component);
                } },
            key: (component.id),
            ...{ class: "stage-card" },
            ...{ class: ({ active: __VLS_ctx.activeCompId === component.id }) },
            ...{ style: (__VLS_ctx.getCardStyle(component)) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startDrag($event, component);
                } },
            ...{ class: "stage-card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-header-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-name" },
        });
        (__VLS_ctx.getComponentChartConfig(component).name || '未命名组件');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-meta" },
        });
        const __VLS_264 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
            size: "small",
            type: "info",
        }));
        const __VLS_266 = __VLS_265({
            size: "small",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_265));
        __VLS_267.slots.default;
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
        var __VLS_267;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.datasetMap.get(Number(__VLS_ctx.getComponentChartConfig(component).datasetId) || -1)?.name ?? '未关联数据集');
        const __VLS_268 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
            ...{ 'onConfirm': {} },
            title: "从大屏移除此组件？",
        }));
        const __VLS_270 = __VLS_269({
            ...{ 'onConfirm': {} },
            title: "从大屏移除此组件？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_269));
        let __VLS_272;
        let __VLS_273;
        let __VLS_274;
        const __VLS_275 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(component.id);
            }
        };
        __VLS_271.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_271.slots;
            const __VLS_276 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
                ...{ class: "remove-btn" },
            }));
            const __VLS_278 = __VLS_277({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_277));
            __VLS_279.slots.default;
            const __VLS_280 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({}));
            const __VLS_282 = __VLS_281({}, ...__VLS_functionalComponentArgsRest(__VLS_281));
            var __VLS_279;
        }
        var __VLS_271;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-body" },
        });
        if (__VLS_ctx.isTableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-wrapper" },
            });
            const __VLS_284 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: true,
            }));
            const __VLS_286 = __VLS_285({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_285));
            __VLS_287.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.getTableColumns(component.id)))) {
                const __VLS_288 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                }));
                const __VLS_290 = __VLS_289({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                }, ...__VLS_functionalComponentArgsRest(__VLS_289));
            }
            var __VLS_287;
        }
        else if (__VLS_ctx.showNoField(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder warning" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder" },
            });
            (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ref: ((el) => __VLS_ctx.setChartRef(el, component.id)),
                ...{ class: "chart-canvas" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'n');
                } },
            ...{ class: "resize-handle resize-handle--n" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 's');
                } },
            ...{ class: "resize-handle resize-handle--s" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'e');
                } },
            ...{ class: "resize-handle resize-handle--e" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'w');
                } },
            ...{ class: "resize-handle resize-handle--w" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'ne');
                } },
            ...{ class: "resize-handle resize-handle--ne" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'nw');
                } },
            ...{ class: "resize-handle resize-handle--nw" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'se');
                } },
            ...{ class: "resize-handle resize-handle--se" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'sw');
                } },
            ...{ class: "resize-handle resize-handle--sw" },
        });
    }
    if (!__VLS_ctx.components.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-empty" },
        });
        const __VLS_292 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }));
        const __VLS_294 = __VLS_293({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "screen-inspector" },
});
/** @type {[typeof EditorComponentInspector, ]} */ ;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "screen",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}));
const __VLS_297 = __VLS_296({
    ...{ 'onApplyLayout': {} },
    ...{ 'onBringFront': {} },
    ...{ 'onRemove': {} },
    ...{ 'onPreviewComponent': {} },
    ...{ 'onSaveComponent': {} },
    scene: "screen",
    component: (__VLS_ctx.activeComponent),
    chart: (__VLS_ctx.activeChart),
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
let __VLS_299;
let __VLS_300;
let __VLS_301;
const __VLS_302 = {
    onApplyLayout: (__VLS_ctx.applyLayoutPatch)
};
const __VLS_303 = {
    onBringFront: (__VLS_ctx.bringComponentToFront)
};
const __VLS_304 = {
    onRemove: (__VLS_ctx.handleRemoveActiveComponent)
};
const __VLS_305 = {
    onPreviewComponent: (__VLS_ctx.previewActiveComponent)
};
const __VLS_306 = {
    onSaveComponent: (__VLS_ctx.saveActiveComponent)
};
var __VLS_298;
const __VLS_307 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_309 = __VLS_308({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_308));
__VLS_310.slots.default;
const __VLS_311 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_313 = __VLS_312({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
__VLS_314.slots.default;
const __VLS_315 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
    label: "名称",
}));
const __VLS_317 = __VLS_316({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_316));
__VLS_318.slots.default;
const __VLS_319 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_320 = __VLS_asFunctionalComponent(__VLS_319, new __VLS_319({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}));
const __VLS_321 = __VLS_320({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_320));
var __VLS_318;
var __VLS_314;
{
    const { footer: __VLS_thisSlot } = __VLS_310.slots;
    const __VLS_323 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
        ...{ 'onClick': {} },
    }));
    const __VLS_325 = __VLS_324({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_324));
    let __VLS_327;
    let __VLS_328;
    let __VLS_329;
    const __VLS_330 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_326.slots.default;
    var __VLS_326;
    const __VLS_331 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_333 = __VLS_332({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_332));
    let __VLS_335;
    let __VLS_336;
    let __VLS_337;
    const __VLS_338 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_334.slots.default;
    var __VLS_334;
}
var __VLS_310;
const __VLS_339 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}));
const __VLS_341 = __VLS_340({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
__VLS_342.slots.default;
const __VLS_343 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}));
const __VLS_345 = __VLS_344({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_344));
__VLS_346.slots.default;
const __VLS_347 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
    label: "组件名称",
}));
const __VLS_349 = __VLS_348({
    label: "组件名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_348));
__VLS_350.slots.default;
const __VLS_351 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}));
const __VLS_353 = __VLS_352({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_352));
var __VLS_350;
const __VLS_355 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
    label: "说明",
}));
const __VLS_357 = __VLS_356({
    label: "说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_356));
__VLS_358.slots.default;
const __VLS_359 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}));
const __VLS_361 = __VLS_360({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_360));
var __VLS_358;
var __VLS_346;
{
    const { footer: __VLS_thisSlot } = __VLS_342.slots;
    const __VLS_363 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
        ...{ 'onClick': {} },
    }));
    const __VLS_365 = __VLS_364({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_364));
    let __VLS_367;
    let __VLS_368;
    let __VLS_369;
    const __VLS_370 = {
        onClick: (...[$event]) => {
            __VLS_ctx.templateSaveVisible = false;
        }
    };
    __VLS_366.slots.default;
    var __VLS_366;
    const __VLS_371 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }));
    const __VLS_373 = __VLS_372({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    let __VLS_375;
    let __VLS_376;
    let __VLS_377;
    const __VLS_378 = {
        onClick: (__VLS_ctx.saveActiveComponentAsAsset)
    };
    __VLS_374.slots.default;
    var __VLS_374;
}
var __VLS_342;
const __VLS_379 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_380 = __VLS_asFunctionalComponent(__VLS_379, new __VLS_379({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_381 = __VLS_380({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_380));
__VLS_382.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_383 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_385 = __VLS_384({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_384));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_387 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_388 = __VLS_asFunctionalComponent(__VLS_387, new __VLS_387({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_389 = __VLS_388({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_388));
}
{
    const { footer: __VLS_thisSlot } = __VLS_382.slots;
    const __VLS_391 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_392 = __VLS_asFunctionalComponent(__VLS_391, new __VLS_391({
        ...{ 'onClick': {} },
    }));
    const __VLS_393 = __VLS_392({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_392));
    let __VLS_395;
    let __VLS_396;
    let __VLS_397;
    const __VLS_398 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_394.slots.default;
    var __VLS_394;
    if (!__VLS_ctx.isPublished) {
        const __VLS_399 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_400 = __VLS_asFunctionalComponent(__VLS_399, new __VLS_399({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_401 = __VLS_400({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_400));
        let __VLS_403;
        let __VLS_404;
        let __VLS_405;
        const __VLS_406 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_402.slots.default;
        var __VLS_402;
    }
    else {
        const __VLS_407 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
            ...{ 'onClick': {} },
        }));
        const __VLS_409 = __VLS_408({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_408));
        let __VLS_411;
        let __VLS_412;
        let __VLS_413;
        const __VLS_414 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_410.slots.default;
        var __VLS_410;
        const __VLS_415 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_416 = __VLS_asFunctionalComponent(__VLS_415, new __VLS_415({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_417 = __VLS_416({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_416));
        let __VLS_419;
        let __VLS_420;
        let __VLS_421;
        const __VLS_422 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_418.slots.default;
        var __VLS_418;
    }
}
var __VLS_382;
const __VLS_423 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_424 = __VLS_asFunctionalComponent(__VLS_423, new __VLS_423({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_425 = __VLS_424({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_424));
__VLS_426.slots.default;
const __VLS_427 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
    labelWidth: "120px",
}));
const __VLS_429 = __VLS_428({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_428));
__VLS_430.slots.default;
const __VLS_431 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_432 = __VLS_asFunctionalComponent(__VLS_431, new __VLS_431({
    label: "发布状态",
}));
const __VLS_433 = __VLS_432({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_432));
__VLS_434.slots.default;
const __VLS_435 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_436 = __VLS_asFunctionalComponent(__VLS_435, new __VLS_435({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_437 = __VLS_436({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_436));
var __VLS_434;
const __VLS_439 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_440 = __VLS_asFunctionalComponent(__VLS_439, new __VLS_439({
    label: "允许匿名链接",
}));
const __VLS_441 = __VLS_440({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_440));
__VLS_442.slots.default;
const __VLS_443 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_444 = __VLS_asFunctionalComponent(__VLS_443, new __VLS_443({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_445 = __VLS_444({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_444));
var __VLS_442;
const __VLS_447 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_448 = __VLS_asFunctionalComponent(__VLS_447, new __VLS_447({
    label: "允许访问角色",
}));
const __VLS_449 = __VLS_448({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_448));
__VLS_450.slots.default;
const __VLS_451 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_452 = __VLS_asFunctionalComponent(__VLS_451, new __VLS_451({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_453 = __VLS_452({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_452));
__VLS_454.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_455 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_456 = __VLS_asFunctionalComponent(__VLS_455, new __VLS_455({
        key: (role),
        label: (role),
    }));
    const __VLS_457 = __VLS_456({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_456));
    __VLS_458.slots.default;
    (role);
    var __VLS_458;
}
var __VLS_454;
var __VLS_450;
const __VLS_459 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_460 = __VLS_asFunctionalComponent(__VLS_459, new __VLS_459({
    label: "正式分享链接",
}));
const __VLS_461 = __VLS_460({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_460));
__VLS_462.slots.default;
const __VLS_463 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_464 = __VLS_asFunctionalComponent(__VLS_463, new __VLS_463({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_465 = __VLS_464({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_464));
var __VLS_462;
var __VLS_430;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "share-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_426.slots;
    const __VLS_467 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_468 = __VLS_asFunctionalComponent(__VLS_467, new __VLS_467({
        ...{ 'onClick': {} },
    }));
    const __VLS_469 = __VLS_468({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_468));
    let __VLS_471;
    let __VLS_472;
    let __VLS_473;
    const __VLS_474 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_470.slots.default;
    var __VLS_470;
    const __VLS_475 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_476 = __VLS_asFunctionalComponent(__VLS_475, new __VLS_475({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_477 = __VLS_476({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_476));
    let __VLS_479;
    let __VLS_480;
    let __VLS_481;
    const __VLS_482 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_478.slots.default;
    var __VLS_478;
}
var __VLS_426;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-type-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-item']} */ ;
/** @type {__VLS_StyleScopedClasses['type-cat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['type-grid-item']} */ ;
/** @type {__VLS_StyleScopedClasses['type-grid-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['type-grid-label']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-title']} */ ;
/** @type {__VLS_StyleScopedClasses['side-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-search-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-list']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-title']} */ ;
/** @type {__VLS_StyleScopedClasses['side-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['template-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['template-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['template-config']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['drag-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['template-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['library-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['library-editor-title']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['template-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['drag-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['readonly-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-bar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-bar-content']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-title']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-note']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-head-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-canvas-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-canvas-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header-main']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['share-block']} */ ;
/** @type {__VLS_StyleScopedClasses['share-label']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            CirclePlus: CirclePlus,
            Close: Close,
            Delete: Delete,
            Download: Download,
            Plus: Plus,
            Promotion: Promotion,
            Refresh: Refresh,
            Search: Search,
            Share: Share,
            View: View,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            SCREEN_CANVAS_PRESETS: SCREEN_CANVAS_PRESETS,
            CHART_CATEGORIES: CHART_CATEGORIES,
            activeCat: activeCat,
            activeCategoryTypes: activeCategoryTypes,
            selectTypeFilter: selectTypeFilter,
            loading: loading,
            compLoading: compLoading,
            dashboards: dashboards,
            currentDashboard: currentDashboard,
            components: components,
            datasetMap: datasetMap,
            canvasRef: canvasRef,
            activeCompId: activeCompId,
            dashboardSearch: dashboardSearch,
            shareVisible: shareVisible,
            publishVisible: publishVisible,
            publishSaving: publishSaving,
            canvasSaving: canvasSaving,
            libraryTab: libraryTab,
            assetSearch: assetSearch,
            assetType: assetType,
            selectedChartId: selectedChartId,
            selectedTemplateId: selectedTemplateId,
            stageDropActive: stageDropActive,
            createDashVisible: createDashVisible,
            dashSaving: dashSaving,
            dashForm: dashForm,
            templateSaveVisible: templateSaveVisible,
            templateSaving: templateSaving,
            templateForm: templateForm,
            publishForm: publishForm,
            chartTypeOptions: chartTypeOptions,
            filteredCharts: filteredCharts,
            filteredTemplates: filteredTemplates,
            selectedChartAsset: selectedChartAsset,
            selectedTemplate: selectedTemplate,
            selectedLibraryAsset: selectedLibraryAsset,
            filteredDashboards: filteredDashboards,
            isPublished: isPublished,
            shareLink: shareLink,
            draftPublishedLink: draftPublishedLink,
            roleOptions: roleOptions,
            activeComponent: activeComponent,
            activeChart: activeChart,
            getComponentChartConfig: getComponentChartConfig,
            currentCanvasConfig: currentCanvasConfig,
            matchedCanvasPreset: matchedCanvasPreset,
            canvasMinHeight: canvasMinHeight,
            setChartRef: setChartRef,
            getDashboardComponentCount: getDashboardComponentCount,
            getCardStyle: getCardStyle,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            isTableChart: isTableChart,
            isRenderableChart: isRenderableChart,
            showNoField: showNoField,
            getTableColumns: getTableColumns,
            getTableRows: getTableRows,
            focusComponent: focusComponent,
            applyLayoutPatch: applyLayoutPatch,
            bringComponentToFront: bringComponentToFront,
            handleRemoveActiveComponent: handleRemoveActiveComponent,
            previewActiveComponent: previewActiveComponent,
            saveActiveComponent: saveActiveComponent,
            startDrag: startDrag,
            startResize: startResize,
            openCreateDashboard: openCreateDashboard,
            handleCreateDashboard: handleCreateDashboard,
            handleDeleteDashboard: handleDeleteDashboard,
            openPreview: openPreview,
            openShareDialog: openShareDialog,
            openPublishDialog: openPublishDialog,
            savePublishSettings: savePublishSettings,
            applyCanvasPreset: applyCanvasPreset,
            onCanvasWidthChange: onCanvasWidthChange,
            onCanvasHeightChange: onCanvasHeightChange,
            copyShareLink: copyShareLink,
            exportScreenJson: exportScreenJson,
            getTemplateDatasetName: getTemplateDatasetName,
            getTemplateLayoutText: getTemplateLayoutText,
            openSaveAssetDialog: openSaveAssetDialog,
            saveActiveComponentAsAsset: saveActiveComponentAsAsset,
            handleAddSelectedAsset: handleAddSelectedAsset,
            quickAddChart: quickAddChart,
            quickAddTemplate: quickAddTemplate,
            removeComponent: removeComponent,
            onTemplateDragStart: onTemplateDragStart,
            onTemplateDragEnd: onTemplateDragEnd,
            onStageDragOver: onStageDragOver,
            onStageDragLeave: onStageDragLeave,
            onStageDrop: onStageDrop,
            summarizeTemplateConfig: summarizeTemplateConfig,
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
