import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getChartList } from '../api/chart';
import { getDashboardList } from '../api/dashboard';
import { getDatasetList } from '../api/dataset';
import { getDatasourceList } from '../api/datasource';
import request from '../api/request';
import TopNavBar from '../components/TopNavBar.vue';
import { normalizeCanvasConfig, normalizeCoverConfig, normalizePublishConfig, parseReportConfig, } from '../utils/report-config';
import { flattenAuthMenus, getAuthMenus, getAuthRole } from '../utils/auth-session';
const SOURCE_KIND_LABELS = {
    DATABASE: '数据库',
    API: 'API 接口',
    TABLE: '表格文件',
    JSON_STATIC: '静态 JSON',
};
const RECENT_ADDED_WINDOW_DAYS = 7;
const RECENT_SCREEN_PAGE_SIZE = 4;
const RESOURCE_PAGE_SIZE = 6;
const DASHBOARD_RING_CIRCUMFERENCE = 2 * Math.PI * 42;
const LOGIN_CHART_WIDTH = 320;
const LOGIN_CHART_HEIGHT = 160;
const LOGIN_CHART_PADDING_X = 18;
const LOGIN_CHART_PADDING_TOP = 14;
const LOGIN_CHART_PADDING_BOTTOM = 24;
const loading = ref(false);
const router = useRouter();
const datasourceList = ref([]);
const datasetList = ref([]);
const chartList = ref([]);
const reportList = ref([]);
const loginLogs = ref([]);
const recentScreenPage = ref(1);
const resourcePage = ref(1);
const activeResourceCategory = ref('datasource');
const componentCountMap = computed(() => Object.fromEntries(reportList.value.map((item) => [item.id, item.componentCount ?? 0])));
const allowedPaths = computed(() => new Set(flattenAuthMenus(getAuthMenus()).map((item) => item.path).filter(Boolean)));
const canAccess = (path) => !allowedPaths.value.size
    || allowedPaths.value.has(path)
    || Array.from(allowedPaths.value).some((item) => path.startsWith(`${item}/`));
const canLoadLoginLogs = computed(() => getAuthRole() === 'ADMIN' && canAccess('/home/system/login-logs'));
const getReportScene = (report) => {
    const config = parseReportConfig(report.configJson);
    return config.scene === 'screen' ? 'screen' : 'dashboard';
};
const getPublishStatus = (report) => {
    const config = parseReportConfig(report.configJson);
    return normalizePublishConfig(config.publish).status;
};
const getCoverUrl = (report) => {
    const config = parseReportConfig(report.configJson);
    return normalizeCoverConfig(config.cover).url;
};
const getCanvasLabel = (report) => {
    const scene = getReportScene(report);
    const config = parseReportConfig(report.configJson);
    const canvas = normalizeCanvasConfig(config.canvas, scene);
    return `${canvas.width} × ${canvas.height}`;
};
const getComponentCount = (dashboardId) => componentCountMap.value[dashboardId] ?? 0;
const sortByCreatedAt = (list) => [...list].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
});
const screens = computed(() => sortByCreatedAt(reportList.value.filter((item) => getReportScene(item) === 'screen')));
const publishedReportCount = computed(() => screens.value.filter((item) => getPublishStatus(item) === 'PUBLISHED').length);
const publishProgress = computed(() => {
    if (!screens.value.length)
        return 0;
    return Math.round((publishedReportCount.value / screens.value.length) * 100);
});
const isRecentWithinWindow = (value) => {
    if (!value)
        return false;
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp))
        return false;
    const now = Date.now();
    const diff = now - timestamp;
    return diff >= 0 && diff <= RECENT_ADDED_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};
const recentAddedDatasourceCount = computed(() => datasourceList.value.filter((item) => isRecentWithinWindow(item.createdAt)).length);
const recentAddedDatasetCount = computed(() => datasetList.value.filter((item) => isRecentWithinWindow(item.createdAt)).length);
const recentAddedChartCount = computed(() => chartList.value.filter((item) => isRecentWithinWindow(item.createdAt)).length);
const recentAddedScreenCount = computed(() => screens.value.filter((item) => isRecentWithinWindow(item.createdAt)).length);
const recentAddedTotal = computed(() => [
    recentAddedDatasourceCount.value,
    recentAddedDatasetCount.value,
    recentAddedChartCount.value,
    recentAddedScreenCount.value,
].reduce((sum, item) => sum + item, 0));
const recentLoginLogs = computed(() => loginLogs.value.filter((item) => isRecentWithinWindow(item.createdAt)));
const recentLoginSuccessCount = computed(() => recentLoginLogs.value.filter((item) => item.action === 'LOGIN_SUCCESS').length);
const recentLoginFailCount = computed(() => recentLoginLogs.value.filter((item) => item.action === 'LOGIN_FAIL').length);
const recentLoginActiveUserCount = computed(() => new Set(recentLoginLogs.value.map((item) => item.username).filter(Boolean)).size);
const recentAddedBars = computed(() => {
    const rawItems = [
        {
            key: 'datasource',
            label: '数据源',
            value: recentAddedDatasourceCount.value,
            accent: 'linear-gradient(180deg, #7dd0c6 0%, #55b0a3 100%)',
            color: '#55b0a3',
        },
        {
            key: 'dataset',
            label: '数据集',
            value: recentAddedDatasetCount.value,
            accent: 'linear-gradient(180deg, #90c7df 0%, #6ea8c7 100%)',
            color: '#6ea8c7',
        },
        {
            key: 'chart',
            label: '图表组件',
            value: recentAddedChartCount.value,
            accent: 'linear-gradient(180deg, #98bbe7 0%, #5f97cf 100%)',
            color: '#5f97cf',
        },
        {
            key: 'screen',
            label: '数据大屏',
            value: recentAddedScreenCount.value,
            accent: 'linear-gradient(180deg, #87c8b6 0%, #65b29e 100%)',
            color: '#65b29e',
        },
    ];
    const maxValue = Math.max(...rawItems.map((item) => item.value), 1);
    return rawItems.map((item) => ({
        ...item,
        percent: item.value > 0 ? Math.max(14, Math.round((item.value / maxValue) * 100)) : 0,
    }));
});
const recentAddedRingSegments = computed(() => {
    const ringItems = recentAddedBars.value.filter((item) => item.value > 0);
    if (!ringItems.length || recentAddedTotal.value <= 0) {
        return [{
                key: 'empty',
                color: '#d7e2e6',
                dasharray: `${DASHBOARD_RING_CIRCUMFERENCE} 0`,
                dashoffset: '0',
            }];
    }
    let offset = 0;
    return ringItems.map((item) => {
        const length = (item.value / recentAddedTotal.value) * DASHBOARD_RING_CIRCUMFERENCE;
        const segment = {
            key: item.key,
            color: item.color,
            dasharray: `${length} ${Math.max(DASHBOARD_RING_CIRCUMFERENCE - length, 0)}`,
            dashoffset: `${-offset}`,
        };
        offset += length;
        return segment;
    });
});
const recentLoginTrend = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: RECENT_ADDED_WINDOW_DAYS }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (RECENT_ADDED_WINDOW_DAYS - 1 - index));
        return {
            key: date.toISOString().slice(0, 10),
            label: `${date.getMonth() + 1}/${date.getDate()}`,
            success: 0,
            fail: 0,
            total: 0,
        };
    });
    const bucketMap = new Map(buckets.map((item) => [item.key, item]));
    recentLoginLogs.value.forEach((item) => {
        const date = new Date(item.createdAt);
        if (Number.isNaN(date.getTime()))
            return;
        date.setHours(0, 0, 0, 0);
        const bucket = bucketMap.get(date.toISOString().slice(0, 10));
        if (!bucket)
            return;
        if (item.action === 'LOGIN_SUCCESS') {
            bucket.success += 1;
        }
        else if (item.action === 'LOGIN_FAIL') {
            bucket.fail += 1;
        }
        bucket.total = bucket.success + bucket.fail;
    });
    return buckets.map((item) => ({
        key: item.key,
        label: item.label,
        success: item.success,
        fail: item.fail,
        total: item.total,
    }));
});
const hasRecentLoginData = computed(() => recentLoginTrend.value.some((item) => item.total > 0));
const loginChartMaxValue = computed(() => Math.max(...recentLoginTrend.value.flatMap((item) => [item.success, item.fail]), 1));
const loginChartPoints = computed(() => {
    const availableWidth = LOGIN_CHART_WIDTH - LOGIN_CHART_PADDING_X * 2;
    const availableHeight = LOGIN_CHART_HEIGHT - LOGIN_CHART_PADDING_TOP - LOGIN_CHART_PADDING_BOTTOM;
    const step = recentLoginTrend.value.length > 1 ? availableWidth / (recentLoginTrend.value.length - 1) : 0;
    const maxValue = loginChartMaxValue.value;
    const toY = (value) => LOGIN_CHART_PADDING_TOP + availableHeight - (value / maxValue) * availableHeight;
    return recentLoginTrend.value.map((item, index) => ({
        key: item.key,
        x: LOGIN_CHART_PADDING_X + step * index,
        successY: toY(item.success),
        failY: toY(item.fail),
    }));
});
const loginSuccessLinePoints = computed(() => loginChartPoints.value.map((item) => `${item.x},${item.successY}`).join(' '));
const loginFailLinePoints = computed(() => loginChartPoints.value.map((item) => `${item.x},${item.failY}`).join(' '));
const loginGuideLines = computed(() => {
    const availableHeight = LOGIN_CHART_HEIGHT - LOGIN_CHART_PADDING_TOP - LOGIN_CHART_PADDING_BOTTOM;
    return [0.25, 0.5, 0.75].map((ratio, index) => ({
        key: `guide-${index}`,
        y: LOGIN_CHART_PADDING_TOP + availableHeight * ratio,
    }));
});
const allResourceItems = computed(() => {
    const datasourceAssets = datasourceList.value.map((item) => ({
        id: `datasource-${item.id}`,
        name: item.name,
        typeLabel: '数据源',
        secondary: `${SOURCE_KIND_LABELS[item.sourceKind]} · ${item.datasourceType || '未标注类型'}`,
        createdAt: item.createdAt,
        statusLabel: SOURCE_KIND_LABELS[item.sourceKind],
        statusType: 'info',
        path: '/home/prepare/datasource',
        category: 'datasource',
    }));
    const datasetAssets = datasetList.value.map((item) => ({
        id: `dataset-${item.id}`,
        name: item.name,
        typeLabel: '数据集',
        secondary: item.datasourceId ? `来源数据源 #${item.datasourceId}` : '未绑定数据源',
        createdAt: item.createdAt,
        statusLabel: '可建模',
        statusType: 'success',
        path: '/home/prepare/dataset',
        category: 'dataset',
    }));
    const chartAssets = chartList.value.map((item) => ({
        id: `chart-${item.id}`,
        name: item.name,
        typeLabel: '图表组件',
        secondary: item.datasetId ? `来源数据集 #${item.datasetId} · ${item.chartType}` : `${item.chartType} · 未绑定数据集`,
        createdAt: item.createdAt,
        statusLabel: item.chartType,
        statusType: 'info',
        path: '/home/prepare/components',
        category: 'chart',
    }));
    const screenAssets = screens.value.map((item) => ({
        id: `screen-${item.id}`,
        name: item.name,
        typeLabel: '数据大屏',
        secondary: `${getComponentCount(item.id)} 个组件 · ${getCanvasLabel(item)}`,
        createdAt: item.createdAt,
        statusLabel: getPublishStatus(item) === 'PUBLISHED' ? '已发布' : '草稿',
        statusType: getPublishStatus(item) === 'PUBLISHED' ? 'success' : 'warning',
        path: `/home/screen/edit/${item.id}`,
        category: 'screen',
    }));
    return sortByCreatedAt([...datasourceAssets, ...datasetAssets, ...chartAssets, ...screenAssets]);
});
const resourceCategories = computed(() => {
    const categories = [
        {
            key: 'datasource',
            label: '数据源',
            count: allResourceItems.value.filter((item) => item.category === 'datasource').length,
            path: '/home/prepare/datasource',
        },
        {
            key: 'dataset',
            label: '数据集',
            count: allResourceItems.value.filter((item) => item.category === 'dataset').length,
            path: '/home/prepare/dataset',
        },
        {
            key: 'chart',
            label: '图表组件',
            count: allResourceItems.value.filter((item) => item.category === 'chart').length,
            path: '/home/prepare/components',
        },
        {
            key: 'screen',
            label: '数据大屏',
            count: allResourceItems.value.filter((item) => item.category === 'screen').length,
            path: '/home/screen',
        },
    ];
    return categories.filter((item) => canAccess(item.path));
});
const activeResourceMeta = computed(() => resourceCategories.value.find((item) => item.key === activeResourceCategory.value) || null);
const filteredResourceItems = computed(() => allResourceItems.value.filter((item) => item.category === activeResourceCategory.value));
const pagedResourceItems = computed(() => {
    const start = (resourcePage.value - 1) * RESOURCE_PAGE_SIZE;
    return filteredResourceItems.value.slice(start, start + RESOURCE_PAGE_SIZE);
});
const pagedRecentScreens = computed(() => {
    const start = (recentScreenPage.value - 1) * RECENT_SCREEN_PAGE_SIZE;
    return screens.value.slice(start, start + RECENT_SCREEN_PAGE_SIZE);
});
watch(resourceCategories, (categories) => {
    if (!categories.length) {
        return;
    }
    if (!categories.some((item) => item.key === activeResourceCategory.value)) {
        activeResourceCategory.value = categories[0].key;
    }
}, { immediate: true });
watch(activeResourceCategory, () => {
    resourcePage.value = 1;
});
watch(() => screens.value.length, (count) => {
    const maxPage = Math.max(1, Math.ceil(count / RECENT_SCREEN_PAGE_SIZE));
    if (recentScreenPage.value > maxPage) {
        recentScreenPage.value = maxPage;
    }
}, { immediate: true });
watch(() => filteredResourceItems.value.length, (count) => {
    const maxPage = Math.max(1, Math.ceil(count / RESOURCE_PAGE_SIZE));
    if (resourcePage.value > maxPage) {
        resourcePage.value = maxPage;
    }
}, { immediate: true });
const formatDate = (value) => {
    if (!value)
        return '刚刚';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};
const goTo = (path) => {
    router.push(path);
};
const openScreen = (id) => {
    router.push(`/home/screen/edit/${id}`);
};
const loadData = async () => {
    loading.value = true;
    try {
        const loginLogsPromise = canLoadLoginLogs.value
            ? request.get('/audit-logs/login').catch(() => [])
            : Promise.resolve([]);
        const [datasources, datasets, charts, dashboards, logs] = await Promise.all([
            getDatasourceList(),
            getDatasetList(),
            getChartList(),
            getDashboardList(),
            loginLogsPromise,
        ]);
        datasourceList.value = datasources;
        datasetList.value = datasets;
        chartList.value = charts;
        reportList.value = dashboards;
        loginLogs.value = logs;
    }
    finally {
        loading.value = false;
    }
};
onMounted(loadData);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['workbench-page']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-page']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-track']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-segment']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__cover']} */ ;
/** @type {__VLS_StyleScopedClasses['content-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard--single']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-main']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-card--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__title']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__columns']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__cover']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard--single']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line-labels']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__columns']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['section-pagination']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workbench-page" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "workbench",
}));
const __VLS_1 = __VLS_0({
    active: "workbench",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "workbench-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "overview-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-card overview-card--dashboard" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-side__head overview-side__head--dashboard" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "overview-side__label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-side__title" },
});
(__VLS_ctx.RECENT_ADDED_WINDOW_DAYS);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-side__caption" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "overview-side__badge" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard overview-dashboard--single" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-kicker" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-visual" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__ring-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    ...{ class: "overview-dashboard__ring-chart" },
    viewBox: "0 0 128 128",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    ...{ class: "overview-dashboard__ring-track" },
    cx: "64",
    cy: "64",
    r: "42",
});
for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.recentAddedRingSegments))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        key: (segment.key),
        ...{ class: "overview-dashboard__ring-segment" },
        cx: "64",
        cy: "64",
        r: "42",
        stroke: (segment.color),
        'stroke-dasharray': (segment.dasharray),
        'stroke-dashoffset': (segment.dashoffset),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__ring-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.recentAddedTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.RECENT_ADDED_WINDOW_DAYS);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-value" },
});
(__VLS_ctx.recentAddedTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-meta" },
});
(__VLS_ctx.RECENT_ADDED_WINDOW_DAYS);
(__VLS_ctx.recentAddedTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-legend" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.recentAddedBars))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (`ring-${item.key}`),
        ...{ class: "overview-dashboard__summary-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "overview-dashboard__summary-legend-dot" },
        ...{ style: ({ background: item.color }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.value);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__status-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__status-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.publishProgress);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__status-value" },
});
(__VLS_ctx.publishedReportCount);
(__VLS_ctx.screens.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__status-note" },
});
(__VLS_ctx.publishedReportCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__status-track" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "overview-dashboard__status-fill" },
    ...{ style: ({ width: `${__VLS_ctx.publishProgress}%` }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__summary-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__mini-fact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.resourceCategories.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__mini-fact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.recentAddedScreenCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__mini-fact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.recentLoginActiveUserCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__mini-fact" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.recentLoginFailCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-card overview-dashboard__chart-card--recent" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-unit" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__columns" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.recentAddedBars))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (item.key),
        ...{ class: "overview-dashboard__column-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__column-value" },
    });
    (item.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__column-track" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "overview-dashboard__column-bar" },
        ...{ style: ({ height: `${item.percent}%`, background: item.accent }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__column-label" },
    });
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__column-note" },
    });
    (__VLS_ctx.RECENT_ADDED_WINDOW_DAYS);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-card overview-dashboard__chart-card--login" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-subtitle" },
});
(__VLS_ctx.canLoadLoginLogs ? `最近 ${__VLS_ctx.RECENT_ADDED_WINDOW_DAYS} 天登录成功 / 失败趋势` : '当前账号无登录日志查看权限');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-dashboard__chart-unit" },
});
if (__VLS_ctx.canLoadLoginLogs) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__login-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__login-fact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.recentLoginSuccessCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__login-fact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.recentLoginFailCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__login-fact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.recentLoginActiveUserCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__legend" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "overview-dashboard__legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "overview-dashboard__legend-dot overview-dashboard__legend-dot--success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "overview-dashboard__legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "overview-dashboard__legend-dot overview-dashboard__legend-dot--fail" },
    });
    if (__VLS_ctx.hasRecentLoginData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overview-dashboard__line-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: "overview-dashboard__line-chart" },
            viewBox: "0 0 320 160",
            preserveAspectRatio: "none",
            'aria-hidden': "true",
        });
        for (const [guide] of __VLS_getVForSourceType((__VLS_ctx.loginGuideLines))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
                key: (guide.key),
                ...{ class: "overview-dashboard__line-guide" },
                x1: "18",
                x2: "302",
                y1: (guide.y),
                y2: (guide.y),
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            ...{ class: "overview-dashboard__line overview-dashboard__line--success" },
            points: (__VLS_ctx.loginSuccessLinePoints),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            ...{ class: "overview-dashboard__line overview-dashboard__line--fail" },
            points: (__VLS_ctx.loginFailLinePoints),
        });
        for (const [point] of __VLS_getVForSourceType((__VLS_ctx.loginChartPoints))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
                key: (point.key),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
                ...{ class: "overview-dashboard__point overview-dashboard__point--success" },
                cx: (point.x),
                cy: (point.successY),
                r: "4",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
                ...{ class: "overview-dashboard__point overview-dashboard__point--fail" },
                cx: (point.x),
                cy: (point.failY),
                r: "4",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overview-dashboard__line-labels" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.recentLoginTrend))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (`label-${item.key}`),
            });
            (item.label);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overview-dashboard__login-empty overview-dashboard__login-empty--inline" },
        });
        (__VLS_ctx.RECENT_ADDED_WINDOW_DAYS);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "overview-dashboard__login-empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "content-grid" },
});
const __VLS_3 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ class: "surface-card recent-card" },
    shadow: "never",
}));
const __VLS_5 = __VLS_4({
    ...{ class: "surface-card recent-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_6.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-subtitle" },
    });
    const __VLS_7 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        link: true,
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onClick: (...[$event]) => {
            __VLS_ctx.goTo('/home/screen');
        }
    };
    __VLS_10.slots.default;
    var __VLS_10;
}
if (__VLS_ctx.pagedRecentScreens.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "recent-screen-list" },
    });
    for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.pagedRecentScreens))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.pagedRecentScreens.length))
                        return;
                    __VLS_ctx.openScreen(screen.id);
                } },
            key: (screen.id),
            ...{ class: "recent-screen-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-screen-item__cover" },
        });
        if (__VLS_ctx.getCoverUrl(screen)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.getCoverUrl(screen)),
                alt: "大屏封面",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "recent-screen-item__cover-fallback" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-screen-item__body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-screen-item__head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            ...{ class: "recent-screen-item__name" },
        });
        (screen.name);
        const __VLS_15 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'),
        }));
        const __VLS_17 = __VLS_16({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_16));
        __VLS_18.slots.default;
        (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? '已发布' : '草稿');
        var __VLS_18;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-screen-item__meta" },
        });
        (__VLS_ctx.getComponentCount(screen.id));
        (__VLS_ctx.getCanvasLabel(screen));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-screen-item__time" },
        });
        (__VLS_ctx.formatDate(screen.createdAt));
    }
}
else {
    const __VLS_19 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        description: "还没有数据大屏，先创建一个新的大屏",
    }));
    const __VLS_21 = __VLS_20({
        description: "还没有数据大屏，先创建一个新的大屏",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
}
if (__VLS_ctx.screens.length > __VLS_ctx.RECENT_SCREEN_PAGE_SIZE) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-pagination" },
    });
    const __VLS_23 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        currentPage: (__VLS_ctx.recentScreenPage),
        layout: "prev, pager, next",
        pageSize: (__VLS_ctx.RECENT_SCREEN_PAGE_SIZE),
        total: (__VLS_ctx.screens.length),
        background: true,
    }));
    const __VLS_25 = __VLS_24({
        currentPage: (__VLS_ctx.recentScreenPage),
        layout: "prev, pager, next",
        pageSize: (__VLS_ctx.RECENT_SCREEN_PAGE_SIZE),
        total: (__VLS_ctx.screens.length),
        background: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
var __VLS_6;
const __VLS_27 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    ...{ class: "surface-card resource-card" },
    shadow: "never",
}));
const __VLS_29 = __VLS_28({
    ...{ class: "surface-card resource-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_30.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_30.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-subtitle" },
    });
    if (__VLS_ctx.activeResourceMeta) {
        const __VLS_31 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            ...{ 'onClick': {} },
            link: true,
        }));
        const __VLS_33 = __VLS_32({
            ...{ 'onClick': {} },
            link: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        let __VLS_35;
        let __VLS_36;
        let __VLS_37;
        const __VLS_38 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeResourceMeta))
                    return;
                __VLS_ctx.goTo(__VLS_ctx.activeResourceMeta.path);
            }
        };
        __VLS_34.slots.default;
        var __VLS_34;
    }
}
if (__VLS_ctx.resourceCategories.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "resource-toolbar" },
    });
    for (const [category] of __VLS_getVForSourceType((__VLS_ctx.resourceCategories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.resourceCategories.length))
                        return;
                    __VLS_ctx.activeResourceCategory = category.key;
                } },
            key: (category.key),
            ...{ class: "resource-tab" },
            ...{ class: ({ 'resource-tab--active': __VLS_ctx.activeResourceCategory === category.key }) },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (category.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "resource-tab__count" },
        });
        (category.count);
    }
}
if (__VLS_ctx.pagedResourceItems.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "resource-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.pagedResourceItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.pagedResourceItems.length))
                        return;
                    __VLS_ctx.goTo(item.path);
                } },
            key: (item.id),
            ...{ class: "resource-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resource-item__main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "resource-item__type" },
        });
        (item.typeLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resource-item__name" },
        });
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resource-item__secondary" },
        });
        (item.secondary);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "resource-item__meta" },
        });
        const __VLS_39 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            size: "small",
            type: (item.statusType),
        }));
        const __VLS_41 = __VLS_40({
            size: "small",
            type: (item.statusType),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_42.slots.default;
        (item.statusLabel);
        var __VLS_42;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "resource-item__time" },
        });
        (__VLS_ctx.formatDate(item.createdAt));
    }
}
else {
    const __VLS_43 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        description: "当前分类下还没有可展示的资源",
    }));
    const __VLS_45 = __VLS_44({
        description: "当前分类下还没有可展示的资源",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
}
if (__VLS_ctx.filteredResourceItems.length > __VLS_ctx.RESOURCE_PAGE_SIZE) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-pagination" },
    });
    const __VLS_47 = {}.ElPagination;
    /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        currentPage: (__VLS_ctx.resourcePage),
        layout: "prev, pager, next",
        pageSize: (__VLS_ctx.RESOURCE_PAGE_SIZE),
        total: (__VLS_ctx.filteredResourceItems.length),
        background: true,
    }));
    const __VLS_49 = __VLS_48({
        currentPage: (__VLS_ctx.resourcePage),
        layout: "prev, pager, next",
        pageSize: (__VLS_ctx.RESOURCE_PAGE_SIZE),
        total: (__VLS_ctx.filteredResourceItems.length),
        background: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
}
var __VLS_30;
/** @type {__VLS_StyleScopedClasses['workbench-page']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-main']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-card--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__head--dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__label']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__title']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__caption']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-side__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard--single']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-track']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-segment']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__ring-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-value']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-value']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-note']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-track']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__status-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__mini-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-card--recent']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__columns']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-value']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-track']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-label']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__column-note']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-card']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-card--login']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__chart-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-fact']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-dot--success']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__legend-dot--fail']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line-guide']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line--success']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line--fail']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__point']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__point--success']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__point']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__point--fail']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__line-labels']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-empty--inline']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-dashboard__login-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['content-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-list']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__cover']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__cover-fallback']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__body']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__head']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__name']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-screen-item__time']} */ ;
/** @type {__VLS_StyleScopedClasses['section-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-tab__count']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-list']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__main']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__type']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__name']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['resource-item__time']} */ ;
/** @type {__VLS_StyleScopedClasses['section-pagination']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            RECENT_ADDED_WINDOW_DAYS: RECENT_ADDED_WINDOW_DAYS,
            RECENT_SCREEN_PAGE_SIZE: RECENT_SCREEN_PAGE_SIZE,
            RESOURCE_PAGE_SIZE: RESOURCE_PAGE_SIZE,
            loading: loading,
            recentScreenPage: recentScreenPage,
            resourcePage: resourcePage,
            activeResourceCategory: activeResourceCategory,
            canLoadLoginLogs: canLoadLoginLogs,
            getPublishStatus: getPublishStatus,
            getCoverUrl: getCoverUrl,
            getCanvasLabel: getCanvasLabel,
            getComponentCount: getComponentCount,
            screens: screens,
            publishedReportCount: publishedReportCount,
            publishProgress: publishProgress,
            recentAddedScreenCount: recentAddedScreenCount,
            recentAddedTotal: recentAddedTotal,
            recentLoginSuccessCount: recentLoginSuccessCount,
            recentLoginFailCount: recentLoginFailCount,
            recentLoginActiveUserCount: recentLoginActiveUserCount,
            recentAddedBars: recentAddedBars,
            recentAddedRingSegments: recentAddedRingSegments,
            recentLoginTrend: recentLoginTrend,
            hasRecentLoginData: hasRecentLoginData,
            loginChartPoints: loginChartPoints,
            loginSuccessLinePoints: loginSuccessLinePoints,
            loginFailLinePoints: loginFailLinePoints,
            loginGuideLines: loginGuideLines,
            resourceCategories: resourceCategories,
            activeResourceMeta: activeResourceMeta,
            filteredResourceItems: filteredResourceItems,
            pagedResourceItems: pagedResourceItems,
            pagedRecentScreens: pagedRecentScreens,
            formatDate: formatDate,
            goTo: goTo,
            openScreen: openScreen,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
