import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, CirclePlus, Close, Delete, Download, Filter, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import ComponentDataFallback from './ComponentDataFallback.vue';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { createChart, getChartData, getChartList } from '../api/chart';
import { createTemplate, getTemplateList } from '../api/chart-template';
import { getDatasetList } from '../api/dataset';
import { buildComponentAssetConfig, buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, materializeChartData, mergeComponentRequestFilters, normalizeComponentAssetConfig, normalizeComponentConfig, postProcessChartOption, } from '../utils/component-config';
import { buildPublishedLink, buildReportConfig, normalizeCanvasConfig, normalizePublishConfig, parseReportConfig, SCREEN_CANVAS_PRESETS, } from '../utils/report-config';
const props = withDefaults(defineProps(), {
    screenId: null,
});
const emit = defineEmits();
const makeBarComboIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/><polyline points="7,12 15,8 23,11 31,4" fill="none" stroke="currentColor" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`;
const makeHeatmapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" fill="currentColor" opacity=".9" rx="1"/><rect x="13" y="4" width="7" height="7" fill="currentColor" opacity=".5" rx="1"/><rect x="22" y="4" width="7" height="7" fill="currentColor" opacity=".2" rx="1"/><rect x="31" y="4" width="7" height="7" fill="currentColor" opacity=".7" rx="1"/><rect x="4" y="13" width="7" height="7" fill="currentColor" opacity=".3" rx="1"/><rect x="13" y="13" width="7" height="7" fill="currentColor" opacity=".8" rx="1"/><rect x="22" y="13" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="31" y="13" width="7" height="7" fill="currentColor" opacity=".15" rx="1"/><rect x="4" y="22" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="13" y="22" width="7" height="7" fill="currentColor" opacity=".25" rx="1"/><rect x="22" y="22" width="7" height="7" fill="currentColor" opacity=".95" rx="1"/><rect x="31" y="22" width="7" height="7" fill="currentColor" opacity=".4" rx="1"/></svg>`;
const makeMapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M5,6 L15,4 L25,8 L35,5 L35,26 L25,23 L15,27 L5,25 Z" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15,4 L15,27" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M25,8 L25,23" stroke="currentColor" stroke-width="1" opacity=".5"/><circle cx="22" cy="13" r="3" fill="currentColor" opacity=".8"/></svg>`;
const makeFilterButtonIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="32" height="16" rx="4" fill="currentColor" opacity=".2" stroke="currentColor" stroke-width="1.2"/><path d="M10,14 L14,18 L14,22" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10,14 L18,14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="28" cy="18" r="1.5" fill="currentColor"/><circle cx="23" cy="18" r="1.5" fill="currentColor"/><circle cx="33" cy="18" r="1.5" fill="currentColor" opacity=".4"/></svg>`;
const makeBarWaterfallIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="6" height="12" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="12" y="16" width="6" height="6" fill="currentColor" rx="1"/><rect x="20" y="6" width="6" height="4" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="10" width="6" height="12" fill="currentColor" rx="1"/><rect x="28" y="4" width="6" height="24" fill="currentColor" opacity=".7" rx="1"/></svg>`;
const makeBarProgressIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="6" width="22" height="5" fill="currentColor" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".5" rx="2.5"/><rect x="4" y="22" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="22" width="14" height="5" fill="currentColor" opacity=".8" rx="2.5"/></svg>`;
const makeBarSymmetricIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="4" width="14" height="6" fill="currentColor" rx="1"/><rect x="6" y="4" width="14" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="13" width="8" height="6" fill="currentColor" rx="1"/><rect x="12" y="13" width="8" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="22" width="16" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="16" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarGroupStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="5" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="4" y="12" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="10" y="14" width="5" height="14" fill="currentColor" opacity=".9" rx="1"/><rect x="10" y="8" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="19" y="16" width="5" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="19" y="10" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="12" width="5" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="25" y="6" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="6" y="8" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="18" y="12" width="8" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="18" y="4" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="30" y="18" width="8" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="30" y="10" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="14" y="8" width="6" height="20" fill="currentColor" rx="1"/><rect x="22" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="30" y="4" width="6" height="24" fill="currentColor" rx="1"/></svg>`;
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
            { type: 'table_summary', label: '汇总表', svgIcon: makeTableIcon() },
            { type: 'table_pivot', label: '透视表', svgIcon: makeTableIcon() },
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
        label: '双轴图',
        types: [
            { type: 'bar_combo', label: '柱线组合图', svgIcon: makeBarComboIcon() },
            { type: 'bar_combo_group', label: '分组柱线图', svgIcon: makeBarComboIcon() },
            { type: 'bar_combo_stack', label: '堆叠柱线图', svgIcon: makeBarComboIcon() },
        ],
    },
    {
        label: '柱/条图',
        types: [
            { type: 'bar', label: '基础柱状图', svgIcon: makeBarIcon() },
            { type: 'bar_stack', label: '堆叠柱状图', svgIcon: makeBarStackIcon() },
            { type: 'bar_percent', label: '百分比柱状图', svgIcon: makeBarStackIcon() },
            { type: 'bar_group', label: '分组柱状图', svgIcon: makeBarIcon() },
            { type: 'bar_group_stack', label: '分组堆叠', svgIcon: makeBarGroupStackIcon() },
            { type: 'bar_waterfall', label: '瀑布图', svgIcon: makeBarWaterfallIcon() },
            { type: 'bar_horizontal', label: '基础条形图', svgIcon: makeBarHIcon() },
            { type: 'bar_horizontal_stack', label: '堆叠条形图', svgIcon: makeBarHIcon() },
            { type: 'bar_horizontal_percent', label: '百分比条形图', svgIcon: makeBarHIcon() },
            { type: 'bar_horizontal_range', label: '区间条形图', svgIcon: makeBarSymmetricIcon() },
            { type: 'bar_horizontal_symmetric', label: '对称条形图', svgIcon: makeBarSymmetricIcon() },
            { type: 'bar_progress', label: '进度条', svgIcon: makeBarProgressIcon() },
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
        label: '热力图',
        types: [
            { type: 'heatmap', label: '热力图', svgIcon: makeHeatmapIcon() },
        ],
    },
    {
        label: '关系图',
        types: [
            { type: 'scatter', label: '散点图', svgIcon: makeScatterIcon() },
        ],
    },
    {
        label: '地图',
        types: [
            { type: 'map', label: '地图', svgIcon: makeMapIcon() },
        ],
    },
    {
        label: '交互控件',
        types: [
            { type: 'filter_button', label: '筛选按钮', svgIcon: makeFilterButtonIcon() },
        ],
    },
];
const activeCat = ref(CHART_CATEGORIES[0].label);
const activeCategoryTypes = computed(() => CHART_CATEGORIES.find((c) => c.label === activeCat.value)?.types ?? []);
// ─── 左侧面板展开/折叠 & 拖拽缩放 ────────────────────────────────────────────
const expandedCats = ref(new Set(CHART_CATEGORIES.map((c) => c.label)));
const toggleCategory = (label) => {
    const next = new Set(expandedCats.value);
    if (next.has(label)) {
        next.delete(label);
    }
    else {
        next.add(label);
    }
    expandedCats.value = next;
};
const selectTypeFilter = (type) => { assetType.value = type; };
const sidebarCollapsed = ref(false);
let sidebarHoverTimer = null;
const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
};
const hoverExpandSidebar = () => {
    if (!sidebarCollapsed.value)
        return;
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    sidebarHoverTimer = window.setTimeout(() => { sidebarCollapsed.value = false; }, 200);
};
const hoverCollapseSidebar = () => {
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    // Don't auto-collapse after hover-expand; user must click toggle or move away
};
const leftPanelWidth = ref(280);
const startPanelResize = (e) => {
    const startX = e.clientX;
    const startWidth = leftPanelWidth.value;
    const onMove = (ev) => {
        leftPanelWidth.value = Math.max(200, Math.min(520, startWidth + ev.clientX - startX));
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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
const bgImgInputRef = ref(null);
const bgImgUploading = ref(false);
const libraryTab = ref('templates');
const assetSearch = ref('');
const assetType = ref('');
const selectedChartId = ref(null);
const selectedTemplateId = ref(null);
const draggingTemplateId = ref(null);
const draggingChartId = ref(null);
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
// ─── 背景版 (Background Board) ───────────────────────────────────────────────
const overlaySelected = ref(false);
const overlayConfig = reactive({
    show: true,
    bgColor: '#081b32',
    opacity: 1,
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    bgType: 'solid',
    gradientStart: '#0d1b2a',
    gradientEnd: '#1b3a5c',
    gradientAngle: 135,
    bgImage: '',
});
const curtainStyle = computed(() => {
    let background;
    if (overlayConfig.bgType === 'gradient') {
        background = `linear-gradient(${overlayConfig.gradientAngle}deg, ${overlayConfig.gradientStart}, ${overlayConfig.gradientEnd})`;
    }
    else if (overlayConfig.bgType === 'image' && overlayConfig.bgImage) {
        background = `url(${overlayConfig.bgImage}) center/cover no-repeat, ${overlayConfig.bgColor}`;
    }
    else {
        background = overlayConfig.bgColor;
    }
    return {
        position: 'absolute',
        left: `${overlayConfig.x}px`,
        top: `${overlayConfig.y}px`,
        width: `${overlayConfig.w}px`,
        height: `${overlayConfig.h}px`,
        background,
        opacity: String(overlayConfig.opacity),
        zIndex: '1',
        pointerEvents: 'all',
        overflow: 'hidden',
    };
});
const loadOverlayFromConfig = () => {
    const saved = currentCanvasConfig.value.overlay;
    if (saved) {
        overlayConfig.show = true; // 背景版 always visible
        overlayConfig.bgColor = saved.bgColor ?? '#081b32';
        overlayConfig.opacity = saved.opacity ?? 1;
        overlayConfig.x = saved.x ?? 0;
        overlayConfig.y = saved.y ?? 0;
        overlayConfig.w = saved.w ?? currentCanvasConfig.value.width;
        overlayConfig.h = saved.h ?? currentCanvasConfig.value.height;
        overlayConfig.bgType = saved.bgType ?? 'solid';
        overlayConfig.gradientStart = saved.gradientStart ?? '#0d1b2a';
        overlayConfig.gradientEnd = saved.gradientEnd ?? '#1b3a5c';
        overlayConfig.gradientAngle = saved.gradientAngle ?? 135;
        overlayConfig.bgImage = saved.bgImage ?? '';
    }
    else {
        overlayConfig.show = true; // 背景版 always visible
        overlayConfig.bgColor = '#081b32';
        overlayConfig.w = currentCanvasConfig.value.width;
        overlayConfig.h = currentCanvasConfig.value.height;
    }
};
const saveOverlay = async () => {
    await updateCanvasConfig({
        overlay: {
            show: overlayConfig.show,
            bgColor: overlayConfig.bgColor,
            opacity: overlayConfig.opacity,
            x: overlayConfig.x,
            y: overlayConfig.y,
            w: overlayConfig.w,
            h: overlayConfig.h,
            bgType: overlayConfig.bgType,
            gradientStart: overlayConfig.gradientStart,
            gradientEnd: overlayConfig.gradientEnd,
            gradientAngle: overlayConfig.gradientAngle,
            bgImage: overlayConfig.bgImage,
        }
    });
};
const toggleOverlay = async () => {
    // 背景版 is now always visible; this just resets position
    overlayConfig.show = true;
    overlayConfig.x = 0;
    overlayConfig.y = 0;
    await saveOverlay();
};
// 幕布拖动
const startCurtainDrag = (e) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const oy = overlayConfig.y;
    const onMove = (ev) => {
        const scale = canvasScale.value || 1;
        overlayConfig.x = Math.max(0, Math.round(ox + (ev.clientX - startX) / scale));
        overlayConfig.y = Math.max(0, Math.round(oy + (ev.clientY - startY) / scale));
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveOverlay();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
// 幕布调整大小
const startCurtainResize = (e, handle) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const ow = overlayConfig.w;
    const oy = overlayConfig.y;
    const oh = overlayConfig.h;
    const onMove = (ev) => {
        const scale = canvasScale.value || 1;
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        if (handle.includes('e'))
            overlayConfig.w = Math.max(100, Math.round(ow + dx));
        if (handle.includes('s'))
            overlayConfig.h = Math.max(60, Math.round(oh + dy));
        if (handle.includes('w')) {
            const nx = Math.min(ox + ow - 100, Math.max(0, Math.round(ox + dx)));
            overlayConfig.w = ow - (nx - ox);
            overlayConfig.x = nx;
        }
        if (handle.includes('n')) {
            const ny = Math.min(oy + oh - 60, Math.max(0, Math.round(oy + dy)));
            overlayConfig.h = oh - (ny - oy);
            overlayConfig.y = ny;
        }
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveOverlay();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
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
    { label: '筛选按钮', value: 'filter_button' },
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
// 背景版 presets + size controls
const matchedBgPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === overlayConfig.w && item.height === overlayConfig.h)?.id ?? 'custom');
const canvasWorkWidth = computed(() => Math.max(overlayConfig.w + 400, 2400));
// ─── 缩放控制 ───────────────────────────────────────────────────────────
const canvasScale = ref(1);
const SCALE_MIN = 0.25;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const zoomIn = () => { canvasScale.value = Math.min(SCALE_MAX, +(canvasScale.value + SCALE_STEP).toFixed(2)); };
const zoomOut = () => { canvasScale.value = Math.max(SCALE_MIN, +(canvasScale.value - SCALE_STEP).toFixed(2)); };
const zoomReset = () => { canvasScale.value = 1; };
const zoomFit = () => {
    const scrollEl = document.querySelector('.screen-stage-scroll');
    if (!scrollEl)
        return;
    const fitW = (scrollEl.clientWidth - 40) / canvasWorkWidth.value;
    const fitH = (scrollEl.clientHeight - 40) / canvasMinHeight.value;
    canvasScale.value = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +Math.min(fitW, fitH).toFixed(2)));
};
const canvasMinHeight = computed(() => {
    const bgBottom = overlayConfig.y + overlayConfig.h + 200;
    const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0);
    return Math.max(currentCanvasConfig.value.height, bgBottom, 560, occupied);
});
const hRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasWorkWidth.value; i += 100)
        marks.push(i);
    return marks;
});
const vRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasMinHeight.value; i += 100)
        marks.push(i);
    return marks;
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
const getCardStyle = (component) => {
    const style = getComponentConfig(component).style;
    const shadow = style.shadowShow
        ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
        : undefined;
    return {
        left: `${component.posX}px`,
        top: `${component.posY}px`,
        width: `${component.width}px`,
        height: `${component.height}px`,
        zIndex: String(Math.max(2, component.zIndex ?? 2)),
        borderRadius: style.cardRadius != null ? `${style.cardRadius}px` : undefined,
        border: style.borderShow ? `${style.borderWidth}px solid ${style.borderColor}` : undefined,
        opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
        boxShadow: shadow,
        padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
    };
};
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
    overlaySelected.value = false;
    await loadComponents();
    loadOverlayFromConfig();
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
    const option = buildComponentOption(data, resolved.chart, resolved.style);
    postProcessChartOption(option, resolved.style, resolved.chart.name);
    chartInstance.setOption(option, true);
};
const isTableChart = (component) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType);
const isFilterButtonChart = (component) => getComponentChartConfig(component).chartType === 'filter_button';
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
    const scale = canvasScale.value || 1;
    const dx = (pendingPointer.x - interaction.startMouseX) / scale;
    const dy = (pendingPointer.y - interaction.startMouseY) / scale;
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
const applyBgPreset = async (presetId) => {
    if (presetId === 'custom')
        return;
    const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId);
    if (!preset)
        return;
    overlayConfig.w = preset.width;
    overlayConfig.h = preset.height;
    await saveOverlay();
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
const onBgWidthChange = async (value) => {
    const w = Math.max(640, Math.round(Number(value) || overlayConfig.w));
    if (w === overlayConfig.w)
        return;
    overlayConfig.w = w;
    await saveOverlay();
};
const onBgHeightChange = async (value) => {
    const h = Math.max(360, Math.round(Number(value) || overlayConfig.h));
    if (h === overlayConfig.h)
        return;
    overlayConfig.h = h;
    await saveOverlay();
};
const triggerBgImageUpload = () => {
    bgImgInputRef.value?.click();
};
const handleBgImageUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    bgImgUploading.value = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('bi_token') || '';
        const res = await fetch('/api/upload/image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        const json = await res.json();
        if (json.data?.url) {
            overlayConfig.bgImage = json.data.url;
            await saveOverlay();
            ElMessage.success('背景图片上传成功');
        }
        else {
            throw new Error('Upload failed');
        }
    }
    catch {
        ElMessage.error('图片上传失败');
    }
    finally {
        bgImgUploading.value = false;
        input.value = '';
    }
};
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
        // 无拖拽坐标时，放在背景板顶部中间
        const cx = Math.max(0, Math.round((overlayConfig.w - width) / 2) + overlayConfig.x);
        const cy = overlayConfig.y + 16;
        return { posX: cx, posY: cy, width, height };
    }
    const rect = canvasRef.value.getBoundingClientRect();
    const scale = canvasScale.value || 1;
    const posX = Math.max(0, Math.min(getCanvasWidth() - width, (point.clientX - rect.left) / scale - width / 2));
    const posY = Math.max(0, (point.clientY - rect.top) / scale - 28);
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
        width: chart.chartType === 'table' ? 760 : chart.chartType === 'filter_button' ? 200 : 520,
        height: chart.chartType === 'table' ? 340 : chart.chartType === 'filter_button' ? 60 : 320,
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
    draggingChartId.value = null;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', `template:${template.id}`);
    if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'copy';
};
const onTemplateDragEnd = () => {
    draggingTemplateId.value = null;
    stageDropActive.value = false;
};
const onChartDragStart = (event, chart) => {
    selectedChartId.value = chart.id;
    draggingChartId.value = chart.id;
    draggingTemplateId.value = null;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', `chart:${chart.id}`);
    if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'copy';
};
const onChartDragEnd = () => {
    draggingChartId.value = null;
    stageDropActive.value = false;
};
const onStageDragOver = (event) => {
    if (!draggingTemplateId.value && !draggingChartId.value)
        return;
    stageDropActive.value = true;
    if (event.dataTransfer)
        event.dataTransfer.dropEffect = 'copy';
};
const onStageDragLeave = (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget && event.currentTarget?.contains(nextTarget)) {
        return;
    }
    stageDropActive.value = false;
};
const onStageDrop = async (event) => {
    const raw = event.dataTransfer?.getData('text/plain') ?? '';
    stageDropActive.value = false;
    if (raw.startsWith('chart:') || draggingChartId.value) {
        const chartId = draggingChartId.value ?? Number(raw.replace('chart:', '') || 0);
        draggingChartId.value = null;
        draggingTemplateId.value = null;
        const chart = charts.value.find((item) => item.id === chartId);
        if (!chart)
            return;
        await addChartToScreen(chart, undefined, undefined, { clientX: event.clientX, clientY: event.clientY });
        return;
    }
    const templateId = draggingTemplateId.value ?? Number(raw.replace('template:', '') || raw || 0);
    draggingTemplateId.value = null;
    const template = templates.value.find((item) => item.id === templateId);
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
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input-number']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-zoom']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
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
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header--open']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__content']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tab-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card--builtin']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
// CSS variable injection 
__VLS_ctx.sidebarCollapsed ? '60px' : __VLS_ctx.leftPanelWidth + 'px';
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-root" },
    ...{ class: ({ 'screen-root--editor': __VLS_ctx.screenId }) },
});
if (__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ onMouseenter: (__VLS_ctx.hoverExpandSidebar) },
        ...{ onMouseleave: (__VLS_ctx.hoverCollapseSidebar) },
        ...{ class: "screen-left-panel" },
        ...{ class: ({ 'screen-left-panel--collapsed': __VLS_ctx.sidebarCollapsed }) },
        ...{ style: (__VLS_ctx.sidebarCollapsed ? {} : { width: __VLS_ctx.leftPanelWidth + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "lp-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleSidebar) },
        ...{ class: "lp-toggle-btn" },
        title: (__VLS_ctx.sidebarCollapsed ? '展开面板' : '收起面板'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "lp-toggle-icon" },
    });
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-title" },
            title: (__VLS_ctx.currentDashboard?.name ?? '编辑大屏'),
        });
        (__VLS_ctx.currentDashboard?.name ?? '编辑大屏');
    }
    if (__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-icon-menu" },
        });
        const __VLS_0 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            content: "模板库",
            placement: "right",
        }));
        const __VLS_2 = __VLS_1({
            content: "模板库",
            placement: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.libraryTab = 'templates';
                    __VLS_ctx.sidebarCollapsed = false;
                } },
            ...{ class: "lp-icon-item" },
            ...{ class: ({ active: __VLS_ctx.libraryTab === 'templates' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "18",
            height: "18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "3",
            y: "3",
            width: "8",
            height: "8",
            rx: "1",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "13",
            y: "3",
            width: "8",
            height: "8",
            rx: "1",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "3",
            y: "13",
            width: "8",
            height: "8",
            rx: "1",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "13",
            y: "13",
            width: "8",
            height: "8",
            rx: "1",
        });
        var __VLS_3;
        const __VLS_4 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            content: "图表源",
            placement: "right",
        }));
        const __VLS_6 = __VLS_5({
            content: "图表源",
            placement: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        __VLS_7.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.libraryTab = 'charts';
                    __VLS_ctx.sidebarCollapsed = false;
                } },
            ...{ class: "lp-icon-item" },
            ...{ class: ({ active: __VLS_ctx.libraryTab === 'charts' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "18",
            height: "18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "22 12 18 12 15 21 9 3 6 12 2 12",
        });
        var __VLS_7;
        for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.CHART_CATEGORIES))) {
            const __VLS_8 = {}.ElTooltip;
            /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                key: (cat.label),
                content: (cat.label),
                placement: "right",
            }));
            const __VLS_10 = __VLS_9({
                key: (cat.label),
                content: (cat.label),
                placement: "right",
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
            __VLS_11.slots.default;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.sidebarCollapsed = false;
                    } },
                ...{ class: "lp-icon-item" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (cat.types[0]?.svgIcon ?? '⬛') }, null, null);
            var __VLS_11;
        }
    }
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-search" },
        });
        const __VLS_12 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            modelValue: (__VLS_ctx.assetSearch),
            placeholder: "搜索组件名称...",
            clearable: true,
            size: "small",
            prefixIcon: (__VLS_ctx.Search),
        }));
        const __VLS_14 = __VLS_13({
            modelValue: (__VLS_ctx.assetSearch),
            placeholder: "搜索组件名称...",
            clearable: true,
            size: "small",
            prefixIcon: (__VLS_ctx.Search),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-cat-scroll" },
        });
        for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.CHART_CATEGORIES))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (cat.label),
                ...{ class: "lp-cat-section" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.toggleCategory(cat.label);
                    } },
                ...{ class: "lp-cat-header" },
                ...{ class: ({ 'lp-cat-header--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-cat-label" },
            });
            (cat.label);
            const __VLS_16 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                ...{ class: "lp-cat-arrow" },
                ...{ class: ({ 'lp-cat-arrow--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            }));
            const __VLS_18 = __VLS_17({
                ...{ class: "lp-cat-arrow" },
                ...{ class: ({ 'lp-cat-arrow--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            __VLS_19.slots.default;
            const __VLS_20 = {}.ArrowRight;
            /** @type {[typeof __VLS_components.ArrowRight, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
            const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
            var __VLS_19;
            if (__VLS_ctx.expandedCats.has(cat.label)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "lp-type-grid" },
                });
                for (const [item] of __VLS_getVForSourceType((cat.types))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.screenId))
                                    return;
                                if (!(!__VLS_ctx.sidebarCollapsed))
                                    return;
                                if (!(__VLS_ctx.expandedCats.has(cat.label)))
                                    return;
                                __VLS_ctx.assetType = item.type;
                            } },
                        key: (item.type),
                        ...{ class: "lp-type-chip" },
                        ...{ class: ({ 'lp-type-chip--active': __VLS_ctx.assetType === item.type }) },
                        title: (item.label),
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                        ...{ class: "lp-type-icon" },
                    });
                    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (item.svgIcon) }, null, null);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "lp-type-label" },
                    });
                    (item.label);
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-divider-text" },
        });
        (__VLS_ctx.assetType ? __VLS_ctx.chartTypeLabel(__VLS_ctx.assetType) : '全部组件');
        if (__VLS_ctx.assetType) {
            const __VLS_24 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
                ...{ style: {} },
            }));
            const __VLS_26 = __VLS_25({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
            let __VLS_28;
            let __VLS_29;
            let __VLS_30;
            const __VLS_31 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    if (!(__VLS_ctx.assetType))
                        return;
                    __VLS_ctx.assetType = '';
                }
            };
            __VLS_27.slots.default;
            var __VLS_27;
        }
        const __VLS_32 = {}.ElTabs;
        /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            modelValue: (__VLS_ctx.libraryTab),
            ...{ class: "lp-tabs" },
        }));
        const __VLS_34 = __VLS_33({
            modelValue: (__VLS_ctx.libraryTab),
            ...{ class: "lp-tabs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        const __VLS_36 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            label: "模板库",
            name: "templates",
        }));
        const __VLS_38 = __VLS_37({
            label: "模板库",
            name: "templates",
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_39.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-asset-scroll" },
        });
        for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.selectedTemplateId = template.id;
                    } },
                ...{ onDblclick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.quickAddTemplate(template);
                    } },
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.onTemplateDragStart($event, template);
                    } },
                ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
                key: (template.id),
                ...{ class: "lp-asset-card" },
                ...{ class: ({ 'lp-asset-card--selected': __VLS_ctx.selectedTemplateId === template.id, 'lp-asset-card--builtin': template.builtIn }) },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-name" },
            });
            (template.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-tags" },
            });
            if (template.builtIn) {
                const __VLS_40 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }));
                const __VLS_42 = __VLS_41({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_41));
                __VLS_43.slots.default;
                var __VLS_43;
            }
            const __VLS_44 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }));
            const __VLS_46 = __VLS_45({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_47.slots.default;
            (__VLS_ctx.chartTypeLabel(template.chartType));
            var __VLS_47;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-foot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-hint" },
            });
            (__VLS_ctx.getTemplateDatasetName(template));
            const __VLS_48 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }));
            const __VLS_50 = __VLS_49({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            let __VLS_52;
            let __VLS_53;
            let __VLS_54;
            const __VLS_55 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.quickAddTemplate(template);
                }
            };
            __VLS_51.slots.default;
            var __VLS_51;
        }
        if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
            const __VLS_56 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                description: "暂无匹配组件",
                imageSize: (42),
            }));
            const __VLS_58 = __VLS_57({
                description: "暂无匹配组件",
                imageSize: (42),
            }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        }
        var __VLS_39;
        const __VLS_60 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            label: "图表源",
            name: "charts",
        }));
        const __VLS_62 = __VLS_61({
            label: "图表源",
            name: "charts",
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-asset-scroll" },
        });
        for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.selectedChartId = chart.id;
                    } },
                ...{ onDblclick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.quickAddChart(chart);
                    } },
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.onChartDragStart($event, chart);
                    } },
                ...{ onDragend: (__VLS_ctx.onChartDragEnd) },
                key: (chart.id),
                ...{ class: "lp-asset-card" },
                ...{ class: ({ 'lp-asset-card--selected': __VLS_ctx.selectedChartId === chart.id }) },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-name" },
            });
            (chart.name);
            const __VLS_64 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }));
            const __VLS_66 = __VLS_65({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            __VLS_67.slots.default;
            (__VLS_ctx.chartTypeLabel(chart.chartType));
            var __VLS_67;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-foot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-hint" },
            });
            (__VLS_ctx.datasetMap.get(chart.datasetId)?.name ?? '未关联数据集');
            const __VLS_68 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }));
            const __VLS_70 = __VLS_69({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            let __VLS_72;
            let __VLS_73;
            let __VLS_74;
            const __VLS_75 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.quickAddChart(chart);
                }
            };
            __VLS_71.slots.default;
            var __VLS_71;
        }
        if (!__VLS_ctx.filteredCharts.length && !__VLS_ctx.loading) {
            const __VLS_76 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                description: "暂无匹配图表",
                imageSize: (42),
            }));
            const __VLS_78 = __VLS_77({
                description: "暂无匹配图表",
                imageSize: (42),
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        }
        var __VLS_63;
        var __VLS_35;
    }
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ onMousedown: (__VLS_ctx.startPanelResize) },
            ...{ class: "lp-resize-handle" },
        });
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
    const __VLS_80 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (__VLS_ctx.openCreateDashboard)
    };
    var __VLS_83;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-search-wrap" },
    });
    const __VLS_88 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }));
    const __VLS_90 = __VLS_89({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
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
        const __VLS_92 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onConfirm: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.handleDeleteDashboard(dashboard.id);
            }
        };
        __VLS_95.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_95.slots;
            const __VLS_100 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }));
            const __VLS_102 = __VLS_101({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
            let __VLS_104;
            let __VLS_105;
            let __VLS_106;
            const __VLS_107 = {
                onClick: () => { }
            };
            __VLS_103.slots.default;
            const __VLS_108 = {}.Delete;
            /** @type {[typeof __VLS_components.Delete, ]} */ ;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
            const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
            var __VLS_103;
        }
        var __VLS_95;
    }
    if (!__VLS_ctx.dashboards.length && !__VLS_ctx.loading) {
        const __VLS_112 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            description: "暂无大屏",
            imageSize: (60),
        }));
        const __VLS_114 = __VLS_113({
            description: "暂无大屏",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
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
    const __VLS_116 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        type: "success",
        effect: "plain",
    }));
    const __VLS_118 = __VLS_117({
        type: "success",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    var __VLS_119;
    const __VLS_120 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }));
    const __VLS_122 = __VLS_121({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        label: "组件库",
        name: "templates",
    }));
    const __VLS_126 = __VLS_125({
        label: "组件库",
        name: "templates",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_128 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }));
    const __VLS_130 = __VLS_129({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    const __VLS_132 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_134 = __VLS_133({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    const __VLS_136 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        label: "全部类型",
        value: "",
    }));
    const __VLS_138 = __VLS_137({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_140 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_142 = __VLS_141({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    }
    var __VLS_135;
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
            const __VLS_144 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
                size: "small",
                type: "success",
            }));
            const __VLS_146 = __VLS_145({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_145));
            __VLS_147.slots.default;
            var __VLS_147;
        }
        const __VLS_148 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
            size: "small",
            effect: "dark",
        }));
        const __VLS_150 = __VLS_149({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_149));
        __VLS_151.slots.default;
        (__VLS_ctx.chartTypeLabel(template.chartType));
        var __VLS_151;
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
        const __VLS_152 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_154 = __VLS_153({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        let __VLS_156;
        let __VLS_157;
        let __VLS_158;
        const __VLS_159 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.quickAddTemplate(template);
            }
        };
        __VLS_155.slots.default;
        var __VLS_155;
    }
    if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
        const __VLS_160 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }));
        const __VLS_162 = __VLS_161({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    }
    var __VLS_127;
    const __VLS_164 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
        label: "图表源",
        name: "charts",
    }));
    const __VLS_166 = __VLS_165({
        label: "图表源",
        name: "charts",
    }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    __VLS_167.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_168 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }));
    const __VLS_170 = __VLS_169({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    const __VLS_172 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_174 = __VLS_173({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
    __VLS_175.slots.default;
    const __VLS_176 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        label: "全部类型",
        value: "",
    }));
    const __VLS_178 = __VLS_177({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_180 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_182 = __VLS_181({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    }
    var __VLS_175;
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
        const __VLS_184 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            size: "small",
            effect: "dark",
        }));
        const __VLS_186 = __VLS_185({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_187.slots.default;
        (__VLS_ctx.chartTypeLabel(chart.chartType));
        var __VLS_187;
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
        const __VLS_188 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            description: "没有匹配的图表源",
            imageSize: (60),
        }));
        const __VLS_190 = __VLS_189({
            description: "没有匹配的图表源",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    }
    var __VLS_167;
    var __VLS_123;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "screen-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading || __VLS_ctx.compLoading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-empty-state" },
    });
    const __VLS_192 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }));
    const __VLS_194 = __VLS_193({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    const __VLS_196 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_198 = __VLS_197({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_199;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "screen-comp-count" },
    });
    (__VLS_ctx.components.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-actions" },
    });
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    var __VLS_203;
    const __VLS_208 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (__VLS_ctx.openPreview)
    };
    var __VLS_211;
    const __VLS_216 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }));
    const __VLS_218 = __VLS_217({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    let __VLS_220;
    let __VLS_221;
    let __VLS_222;
    const __VLS_223 = {
        onClick: (__VLS_ctx.exportScreenJson)
    };
    var __VLS_219;
    const __VLS_224 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        direction: "vertical",
    }));
    const __VLS_226 = __VLS_225({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    const __VLS_228 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }));
    const __VLS_230 = __VLS_229({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    let __VLS_232;
    let __VLS_233;
    let __VLS_234;
    const __VLS_235 = {
        onClick: (__VLS_ctx.openSaveAssetDialog)
    };
    __VLS_231.slots.default;
    var __VLS_231;
    const __VLS_236 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_238 = __VLS_237({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    let __VLS_240;
    let __VLS_241;
    let __VLS_242;
    const __VLS_243 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_239.slots.default;
    (__VLS_ctx.isPublished ? '发布管理' : '发布');
    var __VLS_239;
    const __VLS_244 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_246 = __VLS_245({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    let __VLS_248;
    let __VLS_249;
    let __VLS_250;
    const __VLS_251 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_247.slots.default;
    var __VLS_247;
    const __VLS_252 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }));
    const __VLS_254 = __VLS_253({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    let __VLS_256;
    let __VLS_257;
    let __VLS_258;
    const __VLS_259 = {
        onClick: (__VLS_ctx.handleAddSelectedAsset)
    };
    __VLS_255.slots.default;
    var __VLS_255;
    const __VLS_260 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        direction: "vertical",
    }));
    const __VLS_262 = __VLS_261({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    const __VLS_264 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_266 = __VLS_265({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    let __VLS_268;
    let __VLS_269;
    let __VLS_270;
    const __VLS_271 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.currentDashboard))
                return;
            __VLS_ctx.$emit('back');
        }
    };
    __VLS_267.slots.default;
    var __VLS_267;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-topbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-controls" },
    });
    const __VLS_272 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedBgPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_274 = __VLS_273({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedBgPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    let __VLS_276;
    let __VLS_277;
    let __VLS_278;
    const __VLS_279 = {
        onChange: (__VLS_ctx.applyBgPreset)
    };
    __VLS_275.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.SCREEN_CANVAS_PRESETS))) {
        const __VLS_280 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }));
        const __VLS_282 = __VLS_281({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    }
    const __VLS_284 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        label: "自定义",
        value: "custom",
    }));
    const __VLS_286 = __VLS_285({
        label: "自定义",
        value: "custom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    var __VLS_275;
    const __VLS_288 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_290 = __VLS_289({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    let __VLS_292;
    let __VLS_293;
    let __VLS_294;
    const __VLS_295 = {
        onChange: (__VLS_ctx.onBgWidthChange)
    };
    var __VLS_291;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-sep" },
    });
    const __VLS_296 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_298 = __VLS_297({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    let __VLS_300;
    let __VLS_301;
    let __VLS_302;
    const __VLS_303 = {
        onChange: (__VLS_ctx.onBgHeightChange)
    };
    var __VLS_299;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-tip" },
    });
    (__VLS_ctx.components.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-zoom" },
    });
    const __VLS_304 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        content: "缩小",
    }));
    const __VLS_306 = __VLS_305({
        content: "缩小",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    const __VLS_308 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale <= __VLS_ctx.SCALE_MIN),
    }));
    const __VLS_310 = __VLS_309({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale <= __VLS_ctx.SCALE_MIN),
    }, ...__VLS_functionalComponentArgsRest(__VLS_309));
    let __VLS_312;
    let __VLS_313;
    let __VLS_314;
    const __VLS_315 = {
        onClick: (__VLS_ctx.zoomOut)
    };
    __VLS_311.slots.default;
    var __VLS_311;
    var __VLS_307;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (__VLS_ctx.zoomReset) },
        ...{ class: "zoom-label" },
    });
    (Math.round(__VLS_ctx.canvasScale * 100));
    const __VLS_316 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        content: "放大",
    }));
    const __VLS_318 = __VLS_317({
        content: "放大",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    __VLS_319.slots.default;
    const __VLS_320 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale >= __VLS_ctx.SCALE_MAX),
    }));
    const __VLS_322 = __VLS_321({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale >= __VLS_ctx.SCALE_MAX),
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    let __VLS_324;
    let __VLS_325;
    let __VLS_326;
    const __VLS_327 = {
        onClick: (__VLS_ctx.zoomIn)
    };
    __VLS_323.slots.default;
    var __VLS_323;
    var __VLS_319;
    const __VLS_328 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        content: "适应屏幕",
    }));
    const __VLS_330 = __VLS_329({
        content: "适应屏幕",
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_331.slots.default;
    const __VLS_332 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
    }));
    const __VLS_334 = __VLS_333({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    let __VLS_336;
    let __VLS_337;
    let __VLS_338;
    const __VLS_339 = {
        onClick: (__VLS_ctx.zoomFit)
    };
    __VLS_335.slots.default;
    var __VLS_335;
    var __VLS_331;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-overlay-ctrl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
    const __VLS_340 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_342 = __VLS_341({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    let __VLS_344;
    let __VLS_345;
    let __VLS_346;
    const __VLS_347 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_343;
    const __VLS_348 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        content: "不透明度",
        placement: "bottom",
    }));
    const __VLS_350 = __VLS_349({
        content: "不透明度",
        placement: "bottom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    __VLS_351.slots.default;
    const __VLS_352 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        precision: (2),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_354 = __VLS_353({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        precision: (2),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_353));
    let __VLS_356;
    let __VLS_357;
    let __VLS_358;
    const __VLS_359 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_355;
    var __VLS_351;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-work-area" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-ruler-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-corner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-h-strip" },
    });
    for (const [m] of __VLS_getVForSourceType((__VLS_ctx.hRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (m),
            ...{ class: "ruler-h-mark" },
            ...{ style: ({ left: m + 'px' }) },
        });
        (m);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-main-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-v-strip" },
    });
    for (const [m] of __VLS_getVForSourceType((__VLS_ctx.vRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (m),
            ...{ class: "ruler-v-mark" },
            ...{ style: ({ top: m + 'px' }) },
        });
        (m);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-stage-scroll" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: (__VLS_ctx.onStageDragOver) },
        ...{ onDragleave: (__VLS_ctx.onStageDragLeave) },
        ...{ onDrop: (__VLS_ctx.onStageDrop) },
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.overlaySelected = false;
            } },
        ref: "canvasRef",
        ...{ class: "screen-stage" },
        ...{ class: ({ 'screen-stage--drop': __VLS_ctx.stageDropActive }) },
        ...{ style: ({ width: `${__VLS_ctx.canvasWorkWidth}px`, minHeight: `${__VLS_ctx.canvasMinHeight}px`, height: `${__VLS_ctx.canvasMinHeight}px`, transform: `scale(${__VLS_ctx.canvasScale})`, transformOrigin: '0 0' }) },
    });
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    if (__VLS_ctx.overlayConfig.show) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainDrag($event);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.overlaySelected = true;
                    __VLS_ctx.activeCompId = null;
                } },
            ...{ class: "canvas-curtain" },
            ...{ class: ({ 'canvas-curtain--selected': __VLS_ctx.overlaySelected }) },
            ...{ style: (__VLS_ctx.curtainStyle) },
        });
        if (__VLS_ctx.overlaySelected) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "curtain-badge" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'n');
                } },
            ...{ class: "resize-handle resize-handle--n" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 's');
                } },
            ...{ class: "resize-handle resize-handle--s" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'e');
                } },
            ...{ class: "resize-handle resize-handle--e" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'w');
                } },
            ...{ class: "resize-handle resize-handle--w" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'ne');
                } },
            ...{ class: "resize-handle resize-handle--ne" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'nw');
                } },
            ...{ class: "resize-handle resize-handle--nw" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'se');
                } },
            ...{ class: "resize-handle resize-handle--se" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'sw');
                } },
            ...{ class: "resize-handle resize-handle--sw" },
        });
    }
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
        const __VLS_360 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
            size: "small",
            type: "info",
        }));
        const __VLS_362 = __VLS_361({
            size: "small",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_361));
        __VLS_363.slots.default;
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
        var __VLS_363;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.datasetMap.get(Number(__VLS_ctx.getComponentChartConfig(component).datasetId) || -1)?.name ?? '未关联数据集');
        const __VLS_364 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
            ...{ 'onConfirm': {} },
            title: "从大屏移除此组件？",
        }));
        const __VLS_366 = __VLS_365({
            ...{ 'onConfirm': {} },
            title: "从大屏移除此组件？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_365));
        let __VLS_368;
        let __VLS_369;
        let __VLS_370;
        const __VLS_371 = {
            onConfirm: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.removeComponent(component.id);
            }
        };
        __VLS_367.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_367.slots;
            const __VLS_372 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
                ...{ class: "remove-btn" },
            }));
            const __VLS_374 = __VLS_373({
                ...{ class: "remove-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_373));
            __VLS_375.slots.default;
            const __VLS_376 = {}.Close;
            /** @type {[typeof __VLS_components.Close, ]} */ ;
            // @ts-ignore
            const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({}));
            const __VLS_378 = __VLS_377({}, ...__VLS_functionalComponentArgsRest(__VLS_377));
            var __VLS_375;
        }
        var __VLS_367;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-body" },
        });
        if (__VLS_ctx.isFilterButtonChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-button-wrapper" },
            });
            const __VLS_380 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }));
            const __VLS_382 = __VLS_381({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_381));
            __VLS_383.slots.default;
            const __VLS_384 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
                ...{ style: {} },
            }));
            const __VLS_386 = __VLS_385({
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_385));
            __VLS_387.slots.default;
            const __VLS_388 = {}.Filter;
            /** @type {[typeof __VLS_components.Filter, ]} */ ;
            // @ts-ignore
            const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({}));
            const __VLS_390 = __VLS_389({}, ...__VLS_functionalComponentArgsRest(__VLS_389));
            var __VLS_387;
            (__VLS_ctx.getComponentConfig(component).chart.name || '筛选');
            var __VLS_383;
        }
        else if (__VLS_ctx.isTableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-wrapper" },
            });
            const __VLS_392 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                showHeader: (true),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
            }));
            const __VLS_394 = __VLS_393({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                showHeader: (true),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
            }, ...__VLS_functionalComponentArgsRest(__VLS_393));
            __VLS_395.slots.default;
            if (__VLS_ctx.getComponentConfig(component).style.tableShowIndex) {
                const __VLS_396 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
                    type: "index",
                    width: "50",
                    label: "#",
                }));
                const __VLS_398 = __VLS_397({
                    type: "index",
                    width: "50",
                    label: "#",
                }, ...__VLS_functionalComponentArgsRest(__VLS_397));
            }
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.getTableColumns(component.id)))) {
                const __VLS_400 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }));
                const __VLS_402 = __VLS_401({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }, ...__VLS_functionalComponentArgsRest(__VLS_401));
            }
            var __VLS_395;
        }
        else if (__VLS_ctx.showNoField(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder warning" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(component)) {
            /** @type {[typeof ComponentDataFallback, ]} */ ;
            // @ts-ignore
            const __VLS_404 = __VLS_asFunctionalComponent(ComponentDataFallback, new ComponentDataFallback({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }));
            const __VLS_405 = __VLS_404({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_404));
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
        const __VLS_407 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }));
        const __VLS_409 = __VLS_408({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }, ...__VLS_functionalComponentArgsRest(__VLS_408));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "screen-inspector" },
});
if (__VLS_ctx.overlaySelected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-inspector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "bg-insp-title" },
    });
    const __VLS_411 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_412 = __VLS_asFunctionalComponent(__VLS_411, new __VLS_411({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }));
    const __VLS_413 = __VLS_412({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_412));
    let __VLS_415;
    let __VLS_416;
    let __VLS_417;
    const __VLS_418 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.overlaySelected))
                return;
            __VLS_ctx.overlaySelected = false;
        }
    };
    __VLS_414.slots.default;
    var __VLS_414;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_419 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_420 = __VLS_asFunctionalComponent(__VLS_419, new __VLS_419({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_421 = __VLS_420({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_420));
    let __VLS_423;
    let __VLS_424;
    let __VLS_425;
    const __VLS_426 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_422;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_427 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_429 = __VLS_428({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_428));
    let __VLS_431;
    let __VLS_432;
    let __VLS_433;
    const __VLS_434 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_430;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_435 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_436 = __VLS_asFunctionalComponent(__VLS_435, new __VLS_435({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.x),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_437 = __VLS_436({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.x),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_436));
    let __VLS_439;
    let __VLS_440;
    let __VLS_441;
    const __VLS_442 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_438;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_443 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_444 = __VLS_asFunctionalComponent(__VLS_443, new __VLS_443({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.y),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_445 = __VLS_444({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.y),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_444));
    let __VLS_447;
    let __VLS_448;
    let __VLS_449;
    const __VLS_450 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_446;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    const __VLS_451 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_452 = __VLS_asFunctionalComponent(__VLS_451, new __VLS_451({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgType),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_453 = __VLS_452({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgType),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_452));
    let __VLS_455;
    let __VLS_456;
    let __VLS_457;
    const __VLS_458 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    __VLS_454.slots.default;
    const __VLS_459 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_460 = __VLS_asFunctionalComponent(__VLS_459, new __VLS_459({
        value: "solid",
    }));
    const __VLS_461 = __VLS_460({
        value: "solid",
    }, ...__VLS_functionalComponentArgsRest(__VLS_460));
    __VLS_462.slots.default;
    var __VLS_462;
    const __VLS_463 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_464 = __VLS_asFunctionalComponent(__VLS_463, new __VLS_463({
        value: "gradient",
    }));
    const __VLS_465 = __VLS_464({
        value: "gradient",
    }, ...__VLS_functionalComponentArgsRest(__VLS_464));
    __VLS_466.slots.default;
    var __VLS_466;
    const __VLS_467 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_468 = __VLS_asFunctionalComponent(__VLS_467, new __VLS_467({
        value: "image",
    }));
    const __VLS_469 = __VLS_468({
        value: "image",
    }, ...__VLS_functionalComponentArgsRest(__VLS_468));
    __VLS_470.slots.default;
    var __VLS_470;
    var __VLS_454;
    if (__VLS_ctx.overlayConfig.bgType === 'solid') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_471 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_472 = __VLS_asFunctionalComponent(__VLS_471, new __VLS_471({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }));
        const __VLS_473 = __VLS_472({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_472));
        let __VLS_475;
        let __VLS_476;
        let __VLS_477;
        const __VLS_478 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_474;
    }
    else if (__VLS_ctx.overlayConfig.bgType === 'gradient') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-gradient-preview" },
            ...{ style: ({ background: `linear-gradient(${__VLS_ctx.overlayConfig.gradientAngle}deg, ${__VLS_ctx.overlayConfig.gradientStart}, ${__VLS_ctx.overlayConfig.gradientEnd})` }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_479 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_480 = __VLS_asFunctionalComponent(__VLS_479, new __VLS_479({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientStart),
            showAlpha: true,
        }));
        const __VLS_481 = __VLS_480({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientStart),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_480));
        let __VLS_483;
        let __VLS_484;
        let __VLS_485;
        const __VLS_486 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_482;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_487 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_488 = __VLS_asFunctionalComponent(__VLS_487, new __VLS_487({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
            showAlpha: true,
        }));
        const __VLS_489 = __VLS_488({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_488));
        let __VLS_491;
        let __VLS_492;
        let __VLS_493;
        const __VLS_494 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_490;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-slider-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.overlayConfig.gradientAngle);
        const __VLS_495 = {}.ElSlider;
        /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
        // @ts-ignore
        const __VLS_496 = __VLS_asFunctionalComponent(__VLS_495, new __VLS_495({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
            min: (0),
            max: (360),
            ...{ style: {} },
        }));
        const __VLS_497 = __VLS_496({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
            min: (0),
            max: (360),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_496));
        let __VLS_499;
        let __VLS_500;
        let __VLS_501;
        const __VLS_502 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_498;
    }
    else if (__VLS_ctx.overlayConfig.bgType === 'image') {
        if (__VLS_ctx.overlayConfig.bgImage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "bg-image-thumb" },
                ...{ style: ({ backgroundImage: `url(${__VLS_ctx.overlayConfig.bgImage})` }) },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-btn-row" },
        });
        const __VLS_503 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_504 = __VLS_asFunctionalComponent(__VLS_503, new __VLS_503({
            ...{ 'onClick': {} },
            size: "small",
            loading: (__VLS_ctx.bgImgUploading),
        }));
        const __VLS_505 = __VLS_504({
            ...{ 'onClick': {} },
            size: "small",
            loading: (__VLS_ctx.bgImgUploading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_504));
        let __VLS_507;
        let __VLS_508;
        let __VLS_509;
        const __VLS_510 = {
            onClick: (__VLS_ctx.triggerBgImageUpload)
        };
        __VLS_506.slots.default;
        var __VLS_506;
        if (__VLS_ctx.overlayConfig.bgImage) {
            const __VLS_511 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_512 = __VLS_asFunctionalComponent(__VLS_511, new __VLS_511({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                plain: true,
            }));
            const __VLS_513 = __VLS_512({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                plain: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_512));
            let __VLS_515;
            let __VLS_516;
            let __VLS_517;
            const __VLS_518 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.overlaySelected))
                        return;
                    if (!!(__VLS_ctx.overlayConfig.bgType === 'solid'))
                        return;
                    if (!!(__VLS_ctx.overlayConfig.bgType === 'gradient'))
                        return;
                    if (!(__VLS_ctx.overlayConfig.bgType === 'image'))
                        return;
                    if (!(__VLS_ctx.overlayConfig.bgImage))
                        return;
                    __VLS_ctx.overlayConfig.bgImage = '';
                    __VLS_ctx.saveOverlay();
                }
            };
            __VLS_514.slots.default;
            var __VLS_514;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.handleBgImageUpload) },
            ref: "bgImgInputRef",
            type: "file",
            accept: "image/*",
            ...{ style: {} },
        });
        /** @type {typeof __VLS_ctx.bgImgInputRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_519 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_520 = __VLS_asFunctionalComponent(__VLS_519, new __VLS_519({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }));
        const __VLS_521 = __VLS_520({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_520));
        let __VLS_523;
        let __VLS_524;
        let __VLS_525;
        const __VLS_526 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_522;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-slider-row" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (Math.round(__VLS_ctx.overlayConfig.opacity * 100));
    const __VLS_527 = {}.ElSlider;
    /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
    // @ts-ignore
    const __VLS_528 = __VLS_asFunctionalComponent(__VLS_527, new __VLS_527({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }));
    const __VLS_529 = __VLS_528({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_528));
    let __VLS_531;
    let __VLS_532;
    let __VLS_533;
    const __VLS_534 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_530;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "bg-insp-tip" },
    });
}
else {
    /** @type {[typeof EditorComponentInspector, ]} */ ;
    // @ts-ignore
    const __VLS_535 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
        ...{ 'onApplyLayout': {} },
        ...{ 'onBringFront': {} },
        ...{ 'onRemove': {} },
        ...{ 'onPreviewComponent': {} },
        ...{ 'onSaveComponent': {} },
        scene: "screen",
        component: (__VLS_ctx.activeComponent),
        chart: (__VLS_ctx.activeChart),
    }));
    const __VLS_536 = __VLS_535({
        ...{ 'onApplyLayout': {} },
        ...{ 'onBringFront': {} },
        ...{ 'onRemove': {} },
        ...{ 'onPreviewComponent': {} },
        ...{ 'onSaveComponent': {} },
        scene: "screen",
        component: (__VLS_ctx.activeComponent),
        chart: (__VLS_ctx.activeChart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_535));
    let __VLS_538;
    let __VLS_539;
    let __VLS_540;
    const __VLS_541 = {
        onApplyLayout: (__VLS_ctx.applyLayoutPatch)
    };
    const __VLS_542 = {
        onBringFront: (__VLS_ctx.bringComponentToFront)
    };
    const __VLS_543 = {
        onRemove: (__VLS_ctx.handleRemoveActiveComponent)
    };
    const __VLS_544 = {
        onPreviewComponent: (__VLS_ctx.previewActiveComponent)
    };
    const __VLS_545 = {
        onSaveComponent: (__VLS_ctx.saveActiveComponent)
    };
    var __VLS_537;
}
const __VLS_546 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_547 = __VLS_asFunctionalComponent(__VLS_546, new __VLS_546({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_548 = __VLS_547({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_547));
__VLS_549.slots.default;
const __VLS_550 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_551 = __VLS_asFunctionalComponent(__VLS_550, new __VLS_550({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_552 = __VLS_551({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_551));
__VLS_553.slots.default;
const __VLS_554 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_555 = __VLS_asFunctionalComponent(__VLS_554, new __VLS_554({
    label: "名称",
}));
const __VLS_556 = __VLS_555({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_555));
__VLS_557.slots.default;
const __VLS_558 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_559 = __VLS_asFunctionalComponent(__VLS_558, new __VLS_558({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}));
const __VLS_560 = __VLS_559({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_559));
var __VLS_557;
var __VLS_553;
{
    const { footer: __VLS_thisSlot } = __VLS_549.slots;
    const __VLS_562 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_563 = __VLS_asFunctionalComponent(__VLS_562, new __VLS_562({
        ...{ 'onClick': {} },
    }));
    const __VLS_564 = __VLS_563({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_563));
    let __VLS_566;
    let __VLS_567;
    let __VLS_568;
    const __VLS_569 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_565.slots.default;
    var __VLS_565;
    const __VLS_570 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_571 = __VLS_asFunctionalComponent(__VLS_570, new __VLS_570({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_572 = __VLS_571({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_571));
    let __VLS_574;
    let __VLS_575;
    let __VLS_576;
    const __VLS_577 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_573.slots.default;
    var __VLS_573;
}
var __VLS_549;
const __VLS_578 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_579 = __VLS_asFunctionalComponent(__VLS_578, new __VLS_578({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}));
const __VLS_580 = __VLS_579({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_579));
__VLS_581.slots.default;
const __VLS_582 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_583 = __VLS_asFunctionalComponent(__VLS_582, new __VLS_582({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}));
const __VLS_584 = __VLS_583({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_583));
__VLS_585.slots.default;
const __VLS_586 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_587 = __VLS_asFunctionalComponent(__VLS_586, new __VLS_586({
    label: "组件名称",
}));
const __VLS_588 = __VLS_587({
    label: "组件名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_587));
__VLS_589.slots.default;
const __VLS_590 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_591 = __VLS_asFunctionalComponent(__VLS_590, new __VLS_590({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}));
const __VLS_592 = __VLS_591({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_591));
var __VLS_589;
const __VLS_594 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_595 = __VLS_asFunctionalComponent(__VLS_594, new __VLS_594({
    label: "说明",
}));
const __VLS_596 = __VLS_595({
    label: "说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_595));
__VLS_597.slots.default;
const __VLS_598 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_599 = __VLS_asFunctionalComponent(__VLS_598, new __VLS_598({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}));
const __VLS_600 = __VLS_599({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_599));
var __VLS_597;
var __VLS_585;
{
    const { footer: __VLS_thisSlot } = __VLS_581.slots;
    const __VLS_602 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_603 = __VLS_asFunctionalComponent(__VLS_602, new __VLS_602({
        ...{ 'onClick': {} },
    }));
    const __VLS_604 = __VLS_603({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_603));
    let __VLS_606;
    let __VLS_607;
    let __VLS_608;
    const __VLS_609 = {
        onClick: (...[$event]) => {
            __VLS_ctx.templateSaveVisible = false;
        }
    };
    __VLS_605.slots.default;
    var __VLS_605;
    const __VLS_610 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_611 = __VLS_asFunctionalComponent(__VLS_610, new __VLS_610({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }));
    const __VLS_612 = __VLS_611({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_611));
    let __VLS_614;
    let __VLS_615;
    let __VLS_616;
    const __VLS_617 = {
        onClick: (__VLS_ctx.saveActiveComponentAsAsset)
    };
    __VLS_613.slots.default;
    var __VLS_613;
}
var __VLS_581;
const __VLS_618 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_619 = __VLS_asFunctionalComponent(__VLS_618, new __VLS_618({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_620 = __VLS_619({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_619));
__VLS_621.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_622 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_623 = __VLS_asFunctionalComponent(__VLS_622, new __VLS_622({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_624 = __VLS_623({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_623));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_626 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_627 = __VLS_asFunctionalComponent(__VLS_626, new __VLS_626({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_628 = __VLS_627({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_627));
}
{
    const { footer: __VLS_thisSlot } = __VLS_621.slots;
    const __VLS_630 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_631 = __VLS_asFunctionalComponent(__VLS_630, new __VLS_630({
        ...{ 'onClick': {} },
    }));
    const __VLS_632 = __VLS_631({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_631));
    let __VLS_634;
    let __VLS_635;
    let __VLS_636;
    const __VLS_637 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_633.slots.default;
    var __VLS_633;
    if (!__VLS_ctx.isPublished) {
        const __VLS_638 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_639 = __VLS_asFunctionalComponent(__VLS_638, new __VLS_638({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_640 = __VLS_639({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_639));
        let __VLS_642;
        let __VLS_643;
        let __VLS_644;
        const __VLS_645 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_641.slots.default;
        var __VLS_641;
    }
    else {
        const __VLS_646 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_647 = __VLS_asFunctionalComponent(__VLS_646, new __VLS_646({
            ...{ 'onClick': {} },
        }));
        const __VLS_648 = __VLS_647({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_647));
        let __VLS_650;
        let __VLS_651;
        let __VLS_652;
        const __VLS_653 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_649.slots.default;
        var __VLS_649;
        const __VLS_654 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_655 = __VLS_asFunctionalComponent(__VLS_654, new __VLS_654({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_656 = __VLS_655({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_655));
        let __VLS_658;
        let __VLS_659;
        let __VLS_660;
        const __VLS_661 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_657.slots.default;
        var __VLS_657;
    }
}
var __VLS_621;
const __VLS_662 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_663 = __VLS_asFunctionalComponent(__VLS_662, new __VLS_662({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_664 = __VLS_663({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_663));
__VLS_665.slots.default;
const __VLS_666 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_667 = __VLS_asFunctionalComponent(__VLS_666, new __VLS_666({
    labelWidth: "120px",
}));
const __VLS_668 = __VLS_667({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_667));
__VLS_669.slots.default;
const __VLS_670 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_671 = __VLS_asFunctionalComponent(__VLS_670, new __VLS_670({
    label: "发布状态",
}));
const __VLS_672 = __VLS_671({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_671));
__VLS_673.slots.default;
const __VLS_674 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_675 = __VLS_asFunctionalComponent(__VLS_674, new __VLS_674({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_676 = __VLS_675({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_675));
var __VLS_673;
const __VLS_678 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_679 = __VLS_asFunctionalComponent(__VLS_678, new __VLS_678({
    label: "允许匿名链接",
}));
const __VLS_680 = __VLS_679({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_679));
__VLS_681.slots.default;
const __VLS_682 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_683 = __VLS_asFunctionalComponent(__VLS_682, new __VLS_682({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_684 = __VLS_683({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_683));
var __VLS_681;
const __VLS_686 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_687 = __VLS_asFunctionalComponent(__VLS_686, new __VLS_686({
    label: "允许访问角色",
}));
const __VLS_688 = __VLS_687({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_687));
__VLS_689.slots.default;
const __VLS_690 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_691 = __VLS_asFunctionalComponent(__VLS_690, new __VLS_690({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_692 = __VLS_691({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_691));
__VLS_693.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_694 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_695 = __VLS_asFunctionalComponent(__VLS_694, new __VLS_694({
        key: (role),
        label: (role),
    }));
    const __VLS_696 = __VLS_695({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_695));
    __VLS_697.slots.default;
    (role);
    var __VLS_697;
}
var __VLS_693;
var __VLS_689;
const __VLS_698 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_699 = __VLS_asFunctionalComponent(__VLS_698, new __VLS_698({
    label: "正式分享链接",
}));
const __VLS_700 = __VLS_699({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_699));
__VLS_701.slots.default;
const __VLS_702 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_703 = __VLS_asFunctionalComponent(__VLS_702, new __VLS_702({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_704 = __VLS_703({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_703));
var __VLS_701;
var __VLS_669;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "share-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_665.slots;
    const __VLS_706 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_707 = __VLS_asFunctionalComponent(__VLS_706, new __VLS_706({
        ...{ 'onClick': {} },
    }));
    const __VLS_708 = __VLS_707({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_707));
    let __VLS_710;
    let __VLS_711;
    let __VLS_712;
    const __VLS_713 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_709.slots.default;
    var __VLS_709;
    const __VLS_714 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_715 = __VLS_asFunctionalComponent(__VLS_714, new __VLS_714({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_716 = __VLS_715({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_715));
    let __VLS_718;
    let __VLS_719;
    let __VLS_720;
    const __VLS_721 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_717.slots.default;
    var __VLS_717;
}
var __VLS_665;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-left-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-section']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-divider-text']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-add']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-add']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
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
/** @type {__VLS_StyleScopedClasses['screen-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-label']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-sep']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-zoom']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-label']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-overlay-ctrl']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-work-area']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-ruler-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-main-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain']} */ ;
/** @type {__VLS_StyleScopedClasses['curtain-badge']} */ ;
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
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header-main']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
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
/** @type {__VLS_StyleScopedClasses['bg-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-image-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-btn-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['share-block']} */ ;
/** @type {__VLS_StyleScopedClasses['share-label']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            CirclePlus: CirclePlus,
            Close: Close,
            Delete: Delete,
            Download: Download,
            Filter: Filter,
            Plus: Plus,
            Promotion: Promotion,
            Refresh: Refresh,
            Search: Search,
            Share: Share,
            View: View,
            ComponentDataFallback: ComponentDataFallback,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            SCREEN_CANVAS_PRESETS: SCREEN_CANVAS_PRESETS,
            CHART_CATEGORIES: CHART_CATEGORIES,
            expandedCats: expandedCats,
            toggleCategory: toggleCategory,
            sidebarCollapsed: sidebarCollapsed,
            toggleSidebar: toggleSidebar,
            hoverExpandSidebar: hoverExpandSidebar,
            hoverCollapseSidebar: hoverCollapseSidebar,
            leftPanelWidth: leftPanelWidth,
            startPanelResize: startPanelResize,
            loading: loading,
            compLoading: compLoading,
            dashboards: dashboards,
            currentDashboard: currentDashboard,
            components: components,
            datasetMap: datasetMap,
            componentDataMap: componentDataMap,
            canvasRef: canvasRef,
            activeCompId: activeCompId,
            dashboardSearch: dashboardSearch,
            shareVisible: shareVisible,
            publishVisible: publishVisible,
            publishSaving: publishSaving,
            canvasSaving: canvasSaving,
            bgImgInputRef: bgImgInputRef,
            bgImgUploading: bgImgUploading,
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
            overlaySelected: overlaySelected,
            overlayConfig: overlayConfig,
            curtainStyle: curtainStyle,
            saveOverlay: saveOverlay,
            startCurtainDrag: startCurtainDrag,
            startCurtainResize: startCurtainResize,
            chartTypeOptions: chartTypeOptions,
            filteredCharts: filteredCharts,
            filteredTemplates: filteredTemplates,
            selectedLibraryAsset: selectedLibraryAsset,
            filteredDashboards: filteredDashboards,
            isPublished: isPublished,
            shareLink: shareLink,
            draftPublishedLink: draftPublishedLink,
            roleOptions: roleOptions,
            activeComponent: activeComponent,
            activeChart: activeChart,
            getComponentConfig: getComponentConfig,
            getComponentChartConfig: getComponentChartConfig,
            matchedBgPreset: matchedBgPreset,
            canvasWorkWidth: canvasWorkWidth,
            canvasScale: canvasScale,
            SCALE_MIN: SCALE_MIN,
            SCALE_MAX: SCALE_MAX,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            zoomReset: zoomReset,
            zoomFit: zoomFit,
            canvasMinHeight: canvasMinHeight,
            hRulerMarks: hRulerMarks,
            vRulerMarks: vRulerMarks,
            setChartRef: setChartRef,
            getDashboardComponentCount: getDashboardComponentCount,
            getCardStyle: getCardStyle,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            isTableChart: isTableChart,
            isFilterButtonChart: isFilterButtonChart,
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
            applyBgPreset: applyBgPreset,
            onBgWidthChange: onBgWidthChange,
            onBgHeightChange: onBgHeightChange,
            triggerBgImageUpload: triggerBgImageUpload,
            handleBgImageUpload: handleBgImageUpload,
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
            onChartDragStart: onChartDragStart,
            onChartDragEnd: onChartDragEnd,
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
