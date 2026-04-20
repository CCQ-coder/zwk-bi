import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getChartList } from '../api/chart';
import { getDashboardComponents, getDashboardList } from '../api/dashboard';
import { getDatasetList } from '../api/dataset';
import { getDatasourceList } from '../api/datasource';
import TopNavBar from '../components/TopNavBar.vue';
import { normalizeCanvasConfig, normalizeCoverConfig, normalizePublishConfig, parseReportConfig, } from '../utils/report-config';
import { flattenAuthMenus, getAuthDisplayName, getAuthMenus } from '../utils/auth-session';
const SOURCE_KIND_LABELS = {
    DATABASE: '数据库',
    API: 'API 接口',
    TABLE: '表格文件',
    JSON_STATIC: '静态 JSON',
};
const loading = ref(false);
const router = useRouter();
const datasourceList = ref([]);
const datasetList = ref([]);
const chartList = ref([]);
const reportList = ref([]);
const componentCountMap = ref({});
const displayName = computed(() => getAuthDisplayName());
const userId = computed(() => localStorage.getItem('bi_user_id') || '--');
const avatarText = computed(() => displayName.value.slice(0, 1) || '用');
const allowedPaths = computed(() => new Set(flattenAuthMenus(getAuthMenus()).map((item) => item.path).filter(Boolean)));
const canAccess = (path) => !allowedPaths.value.size
    || allowedPaths.value.has(path)
    || Array.from(allowedPaths.value).some((item) => path.startsWith(`${item}/`));
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
const dashboards = computed(() => sortByCreatedAt(reportList.value.filter((item) => getReportScene(item) === 'dashboard')));
const screens = computed(() => sortByCreatedAt(reportList.value.filter((item) => getReportScene(item) === 'screen')));
const publishedReportCount = computed(() => reportList.value.filter((item) => getPublishStatus(item) === 'PUBLISHED').length);
const publishProgress = computed(() => {
    if (!reportList.value.length)
        return 0;
    return Math.round((publishedReportCount.value / reportList.value.length) * 100);
});
const primaryAction = computed(() => {
    if (!datasourceList.value.length) {
        return { label: '先接入第一个数据源', path: '/home/prepare/datasource' };
    }
    if (!datasetList.value.length) {
        return { label: '继续创建数据集', path: '/home/prepare/dataset' };
    }
    const latestDraftScreen = screens.value.find((item) => getPublishStatus(item) === 'DRAFT');
    if (latestDraftScreen) {
        return { label: '继续编辑最近大屏', path: `/home/screen/edit/${latestDraftScreen.id}` };
    }
    return { label: '进入仪表板工作区', path: '/home/dashboard' };
});
const summaryMetrics = computed(() => [
    {
        label: '数据源',
        kicker: '接入层',
        value: datasourceList.value.length,
        note: datasourceList.value.length ? '已连接数据库、接口或文件' : '还没有任何数据接入',
    },
    {
        label: '数据集',
        kicker: '加工层',
        value: datasetList.value.length,
        note: datasetList.value.length ? '可直接供图表与报表使用' : '还没有沉淀可复用数据集',
    },
    {
        label: '图表组件',
        kicker: '分析层',
        value: chartList.value.length,
        note: chartList.value.length ? '图表模板已可复用' : '还没有完成图表设计',
    },
    {
        label: '仪表板',
        kicker: '业务视图',
        value: dashboards.value.length,
        note: dashboards.value.length ? `${dashboards.value.filter((item) => getPublishStatus(item) === 'PUBLISHED').length} 个已发布` : '尚未形成分析看板',
    },
    {
        label: '数据大屏',
        kicker: '展示层',
        value: screens.value.length,
        note: screens.value.length ? `${screens.value.filter((item) => Boolean(getCoverUrl(item))).length} 个已生成封面` : '尚未搭建展示大屏',
    },
]);
const onboardingSteps = computed(() => [
    {
        label: '接入至少一个数据源',
        tip: datasourceList.value.length ? `${datasourceList.value.length} 个数据源已接入` : '支持数据库、API、表格和静态 JSON',
        done: datasourceList.value.length > 0,
        path: '/home/prepare/datasource',
    },
    {
        label: '沉淀可复用数据集',
        tip: datasetList.value.length ? `${datasetList.value.length} 个数据集可直接复用` : '把原始数据整理成业务字段模型',
        done: datasetList.value.length > 0,
        path: '/home/prepare/dataset',
    },
    {
        label: '完成图表设计与组件装配',
        tip: chartList.value.length ? `${chartList.value.length} 个图表组件已创建` : '先设计图表组件，再进入仪表板或大屏',
        done: chartList.value.length > 0,
        path: '/home/prepare/components',
    },
    {
        label: '发布至少一个报告',
        tip: publishedReportCount.value ? `${publishedReportCount.value} 个报告已发布` : '让仪表板或大屏真正进入可分享状态',
        done: publishedReportCount.value > 0,
        path: screens.value.length ? '/home/screen' : '/home/dashboard',
    },
]);
const completedOnboardingCount = computed(() => onboardingSteps.value.filter((item) => item.done).length);
const onboardingProgress = computed(() => Math.round((completedOnboardingCount.value / onboardingSteps.value.length) * 100));
const quickActions = computed(() => ([
    {
        key: 'datasource',
        title: '接入数据源',
        description: '创建数据库、API、表格或静态 JSON 数据源',
        stat: `${datasourceList.value.length} 个已接入`,
        path: '/home/prepare/datasource',
    },
    {
        key: 'dataset',
        title: '加工数据集',
        description: '整理 SQL、字段和抽取逻辑，形成可复用数据模型',
        stat: `${datasetList.value.length} 个数据集`,
        path: '/home/prepare/dataset',
    },
    {
        key: 'chart',
        title: '设计图表组件',
        description: '进入组件设计页面，沉淀图表资产供后续复用',
        stat: `${chartList.value.length} 个图表`,
        path: '/home/prepare/components',
    },
    {
        key: 'dashboard',
        title: '管理仪表板',
        description: '查看仪表板布局、发布状态和组件构成',
        stat: `${dashboards.value.length} 个仪表板`,
        path: '/home/dashboard',
    },
    {
        key: 'screen',
        title: '管理数据大屏',
        description: '统一查看大屏封面、状态和进入编辑器',
        stat: `${screens.value.length} 个大屏`,
        path: '/home/screen',
    },
]).filter((item) => canAccess(item.path)));
const recentAssets = computed(() => {
    const datasourceAssets = datasourceList.value.map((item) => ({
        id: `datasource-${item.id}`,
        name: item.name,
        typeLabel: '数据源',
        secondary: `${SOURCE_KIND_LABELS[item.sourceKind]} · ${item.datasourceType || '未标注类型'}`,
        createdAt: item.createdAt,
        statusLabel: SOURCE_KIND_LABELS[item.sourceKind],
        statusType: 'info',
        path: '/home/prepare/datasource',
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
    }));
    const reportAssets = reportList.value.map((item) => ({
        id: `${getReportScene(item)}-${item.id}`,
        name: item.name,
        typeLabel: getReportScene(item) === 'screen' ? '数据大屏' : '仪表板',
        secondary: `${getComponentCount(item.id)} 个组件 · ${getCanvasLabel(item)}`,
        createdAt: item.createdAt,
        statusLabel: getPublishStatus(item) === 'PUBLISHED' ? '已发布' : '草稿',
        statusType: getPublishStatus(item) === 'PUBLISHED' ? 'success' : 'warning',
        path: getReportScene(item) === 'screen' ? `/home/screen/edit/${item.id}` : `/home/dashboard/edit/${item.id}`,
    }));
    return sortByCreatedAt([...datasourceAssets, ...datasetAssets, ...reportAssets]).slice(0, 8);
});
const recentScreens = computed(() => screens.value.slice(0, 3));
const recentDashboards = computed(() => dashboards.value.slice(0, 5));
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
const openDashboard = (id) => {
    router.push(`/home/dashboard/edit/${id}`);
};
const openScreen = (id) => {
    router.push(`/home/screen/edit/${id}`);
};
const loadData = async () => {
    loading.value = true;
    try {
        const [datasources, datasets, charts, dashboards] = await Promise.all([
            getDatasourceList(),
            getDatasetList(),
            getChartList(),
            getDashboardList(),
        ]);
        datasourceList.value = datasources;
        datasetList.value = datasets;
        chartList.value = charts;
        reportList.value = dashboards;
        const countEntries = await Promise.all(dashboards.map(async (item) => [item.id, (await getDashboardComponents(item.id)).length]));
        componentCountMap.value = Object.fromEntries(countEntries);
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
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['action-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['main-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-main']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['action-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-item']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-cover']} */ ;
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
    ...{ class: "hero-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hero-eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "hero-title" },
});
(__VLS_ctx.displayName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hero-description" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-actions" },
});
const __VLS_3 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}));
const __VLS_5 = __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    onClick: (...[$event]) => {
        __VLS_ctx.goTo(__VLS_ctx.primaryAction.path);
    }
};
__VLS_6.slots.default;
(__VLS_ctx.primaryAction.label);
var __VLS_6;
const __VLS_11 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    ...{ 'onClick': {} },
    size: "large",
}));
const __VLS_13 = __VLS_12({
    ...{ 'onClick': {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
let __VLS_15;
let __VLS_16;
let __VLS_17;
const __VLS_18 = {
    onClick: (...[$event]) => {
        __VLS_ctx.goTo('/home/prepare/datasource');
    }
};
__VLS_14.slots.default;
var __VLS_14;
const __VLS_19 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    size: "large",
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_23;
let __VLS_24;
let __VLS_25;
const __VLS_26 = {
    onClick: (...[$event]) => {
        __VLS_ctx.goTo('/home/screen');
    }
};
__VLS_22.slots.default;
var __VLS_22;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-highlight" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-value" },
});
(__VLS_ctx.publishedReportCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-meta" },
});
(__VLS_ctx.reportList.length);
const __VLS_27 = {}.ElProgress;
/** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    percentage: (__VLS_ctx.publishProgress),
    strokeWidth: (10),
    showText: (false),
    color: "#2f7cf6",
}));
const __VLS_29 = __VLS_28({
    percentage: (__VLS_ctx.publishProgress),
    strokeWidth: (10),
    showText: (false),
    color: "#2f7cf6",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-user" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "highlight-avatar" },
});
(__VLS_ctx.avatarText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-name" },
});
(__VLS_ctx.displayName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "highlight-id" },
});
(__VLS_ctx.userId);
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "metric-grid" },
});
for (const [metric] of __VLS_getVForSourceType((__VLS_ctx.summaryMetrics))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (metric.label),
        ...{ class: "metric-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "metric-kicker" },
    });
    (metric.kicker);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
        ...{ class: "metric-value" },
    });
    (metric.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "metric-label" },
    });
    (metric.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "metric-note" },
    });
    (metric.note);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "main-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-column" },
});
const __VLS_31 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ class: "surface-card" },
    shadow: "never",
}));
const __VLS_33 = __VLS_32({
    ...{ class: "surface-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_34.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_34.slots;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "section-number" },
    });
    (__VLS_ctx.completedOnboardingCount);
    (__VLS_ctx.onboardingSteps.length);
}
const __VLS_35 = {}.ElProgress;
/** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    percentage: (__VLS_ctx.onboardingProgress),
    strokeWidth: (12),
    showText: (false),
    color: "#1a9b88",
}));
const __VLS_37 = __VLS_36({
    percentage: (__VLS_ctx.onboardingProgress),
    strokeWidth: (12),
    showText: (false),
    color: "#1a9b88",
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workflow-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.onboardingSteps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.goTo(item.path);
            } },
        key: (item.label),
        ...{ class: "workflow-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "workflow-dot" },
        ...{ class: ({ 'workflow-dot--done': item.done }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "workflow-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "workflow-label" },
    });
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "workflow-tip" },
    });
    (item.tip);
    const __VLS_39 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: "small",
        type: (item.done ? 'success' : 'warning'),
    }));
    const __VLS_41 = __VLS_40({
        size: "small",
        type: (item.done ? 'success' : 'warning'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_42.slots.default;
    (item.done ? '已完成' : '待处理');
    var __VLS_42;
}
var __VLS_34;
const __VLS_43 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    ...{ class: "surface-card" },
    shadow: "never",
}));
const __VLS_45 = __VLS_44({
    ...{ class: "surface-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_46.slots;
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
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "action-grid" },
});
for (const [action] of __VLS_getVForSourceType((__VLS_ctx.quickActions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.goTo(action.path);
            } },
        key: (action.key),
        ...{ class: "action-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "action-stat" },
    });
    (action.stat);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
        ...{ class: "action-title" },
    });
    (action.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "action-desc" },
    });
    (action.description);
}
var __VLS_46;
const __VLS_47 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    ...{ class: "surface-card" },
    shadow: "never",
}));
const __VLS_49 = __VLS_48({
    ...{ class: "surface-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
__VLS_50.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_50.slots;
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
}
if (__VLS_ctx.recentAssets.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [asset] of __VLS_getVForSourceType((__VLS_ctx.recentAssets))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.recentAssets.length))
                        return;
                    __VLS_ctx.goTo(asset.path);
                } },
            key: (asset.id),
            ...{ class: "asset-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "asset-type" },
        });
        (asset.typeLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-name" },
        });
        (asset.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-secondary" },
        });
        (asset.secondary);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-meta" },
        });
        const __VLS_51 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            size: "small",
            type: (asset.statusType),
        }));
        const __VLS_53 = __VLS_52({
            size: "small",
            type: (asset.statusType),
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        __VLS_54.slots.default;
        (asset.statusLabel);
        var __VLS_54;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "asset-time" },
        });
        (__VLS_ctx.formatDate(asset.createdAt));
    }
}
else {
    const __VLS_55 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        description: "还没有可展示的资产，先从接入数据源开始",
    }));
    const __VLS_57 = __VLS_56({
        description: "还没有可展示的资产，先从接入数据源开始",
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
}
var __VLS_50;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-column" },
});
const __VLS_59 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    ...{ class: "surface-card spotlight-card" },
    shadow: "never",
}));
const __VLS_61 = __VLS_60({
    ...{ class: "surface-card spotlight-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_62.slots;
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
    const __VLS_63 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        ...{ 'onClick': {} },
        link: true,
    }));
    const __VLS_65 = __VLS_64({
        ...{ 'onClick': {} },
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    let __VLS_67;
    let __VLS_68;
    let __VLS_69;
    const __VLS_70 = {
        onClick: (...[$event]) => {
            __VLS_ctx.goTo('/home/screen');
        }
    };
    __VLS_66.slots.default;
    var __VLS_66;
}
if (__VLS_ctx.recentScreens.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spotlight-list" },
    });
    for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.recentScreens))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.recentScreens.length))
                        return;
                    __VLS_ctx.openScreen(screen.id);
                } },
            key: (screen.id),
            ...{ class: "spotlight-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spotlight-cover" },
        });
        if (__VLS_ctx.getCoverUrl(screen)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.getCoverUrl(screen)),
                alt: "大屏封面",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "spotlight-cover-fallback" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spotlight-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spotlight-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spotlight-name" },
        });
        (screen.name);
        const __VLS_71 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'),
        }));
        const __VLS_73 = __VLS_72({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        __VLS_74.slots.default;
        (__VLS_ctx.getPublishStatus(screen) === 'PUBLISHED' ? '已发布' : '草稿');
        var __VLS_74;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spotlight-meta" },
        });
        (__VLS_ctx.getComponentCount(screen.id));
        (__VLS_ctx.getCanvasLabel(screen));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "spotlight-time" },
        });
        (__VLS_ctx.formatDate(screen.createdAt));
    }
}
else {
    const __VLS_75 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        description: "还没有数据大屏，先创建一个新的大屏",
    }));
    const __VLS_77 = __VLS_76({
        description: "还没有数据大屏，先创建一个新的大屏",
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
}
var __VLS_62;
const __VLS_79 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    ...{ class: "surface-card" },
    shadow: "never",
}));
const __VLS_81 = __VLS_80({
    ...{ class: "surface-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
__VLS_82.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_82.slots;
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
    const __VLS_83 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        ...{ 'onClick': {} },
        link: true,
    }));
    const __VLS_85 = __VLS_84({
        ...{ 'onClick': {} },
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    let __VLS_87;
    let __VLS_88;
    let __VLS_89;
    const __VLS_90 = {
        onClick: (...[$event]) => {
            __VLS_ctx.goTo('/home/dashboard');
        }
    };
    __VLS_86.slots.default;
    var __VLS_86;
}
if (__VLS_ctx.recentDashboards.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-list" },
    });
    for (const [dashboard] of __VLS_getVForSourceType((__VLS_ctx.recentDashboards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.recentDashboards.length))
                        return;
                    __VLS_ctx.openDashboard(dashboard.id);
                } },
            key: (dashboard.id),
            ...{ class: "dashboard-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dashboard-name" },
        });
        (dashboard.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "dashboard-meta" },
        });
        (__VLS_ctx.getComponentCount(dashboard.id));
        (__VLS_ctx.formatDate(dashboard.createdAt));
        const __VLS_91 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(dashboard) === 'PUBLISHED' ? 'success' : 'info'),
        }));
        const __VLS_93 = __VLS_92({
            size: "small",
            type: (__VLS_ctx.getPublishStatus(dashboard) === 'PUBLISHED' ? 'success' : 'info'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        __VLS_94.slots.default;
        (__VLS_ctx.getPublishStatus(dashboard) === 'PUBLISHED' ? '已发布' : '草稿');
        var __VLS_94;
    }
}
else {
    const __VLS_95 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
        description: "还没有仪表板，先去添加图表组件",
    }));
    const __VLS_97 = __VLS_96({
        description: "还没有仪表板，先去添加图表组件",
    }, ...__VLS_functionalComponentArgsRest(__VLS_96));
}
var __VLS_82;
/** @type {__VLS_StyleScopedClasses['workbench-page']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-main']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-card']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-description']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-label']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-value']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-user']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-name']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-id']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-note']} */ ;
/** @type {__VLS_StyleScopedClasses['main-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['main-column']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['section-number']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-list']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-item']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-label']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['action-card']} */ ;
/** @type {__VLS_StyleScopedClasses['action-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['action-title']} */ ;
/** @type {__VLS_StyleScopedClasses['action-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-item']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-main']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-type']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-time']} */ ;
/** @type {__VLS_StyleScopedClasses['side-column']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-list']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-item']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-cover-fallback']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-body']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-head']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-name']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['spotlight-time']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-list']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-name']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-meta']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            loading: loading,
            reportList: reportList,
            displayName: displayName,
            userId: userId,
            avatarText: avatarText,
            getPublishStatus: getPublishStatus,
            getCoverUrl: getCoverUrl,
            getCanvasLabel: getCanvasLabel,
            getComponentCount: getComponentCount,
            publishedReportCount: publishedReportCount,
            publishProgress: publishProgress,
            primaryAction: primaryAction,
            summaryMetrics: summaryMetrics,
            onboardingSteps: onboardingSteps,
            completedOnboardingCount: completedOnboardingCount,
            onboardingProgress: onboardingProgress,
            quickActions: quickActions,
            recentAssets: recentAssets,
            recentScreens: recentScreens,
            recentDashboards: recentDashboards,
            formatDate: formatDate,
            goTo: goTo,
            openDashboard: openDashboard,
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
