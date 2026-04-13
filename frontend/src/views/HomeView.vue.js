import { computed, onMounted, ref } from 'vue';
import { getDatasourceList } from '../api/datasource';
import { getDatasetList } from '../api/dataset';
import { getChartList } from '../api/chart';
import { getDefaultDashboard } from '../api/dashboard';
import DatasourcePanel from '../components/DatasourcePanel.vue';
import DatasetPanel from '../components/DatasetPanel.vue';
import ChartDesignerPanel from '../components/ChartDesignerPanel.vue';
import DashboardPanel from '../components/DashboardPanel.vue';
import TopNavBar from '../components/TopNavBar.vue';
const loading = ref(false);
const datasourceList = ref([]);
const datasetList = ref([]);
const chartList = ref([]);
const dashboardCount = ref(0);
const activeAssetTab = ref('favorite');
const assetFilter = ref('all');
const searchKeyword = ref('');
const moduleDialogVisible = ref(false);
const activeModule = ref('dashboard');
const displayName = computed(() => {
    return localStorage.getItem('bi_display_name') || localStorage.getItem('bi_username') || '未登录用户';
});
const userId = computed(() => {
    return localStorage.getItem('bi_user_id') || '--';
});
const templateCards = computed(() => {
    const colors = [
        'linear-gradient(135deg, #f9e5d1, #d9e8ff)',
        'linear-gradient(135deg, #d5e5ff, #e8f0ff)',
        'linear-gradient(135deg, #ffeccb, #edf4ff)',
        'linear-gradient(135deg, #d8f2ee, #e7ecff)'
    ];
    return chartList.value.slice(0, 4).map((chart, index) => ({
        name: chart.name,
        bg: colors[index % colors.length]
    }));
});
const moduleMap = {
    datasource: DatasourcePanel,
    dataset: DatasetPanel,
    chart: ChartDesignerPanel,
    dashboard: DashboardPanel
};
const moduleTitleMap = {
    datasource: '数据源管理',
    dataset: '数据集 SQL',
    chart: '图表设计',
    dashboard: '仪表盘'
};
const activeModuleComponent = computed(() => moduleMap[activeModule.value]);
const moduleTitle = computed(() => moduleTitleMap[activeModule.value]);
const datasetCount = computed(() => datasetList.value.length);
const allAssets = computed(() => {
    const datasourceAssets = datasourceList.value.map((item) => ({
        name: item.name,
        type: 'datasource',
        creator: displayName.value,
        editor: displayName.value,
        updateTime: item.createdAt || '',
        operation: '查看'
    }));
    const datasetAssets = datasetList.value.map((item) => ({
        name: item.name,
        type: 'dataset',
        creator: displayName.value,
        editor: displayName.value,
        updateTime: item.createdAt || '',
        operation: '查看'
    }));
    const chartAssets = chartList.value.map((item) => ({
        name: item.name,
        type: 'chart',
        creator: displayName.value,
        editor: displayName.value,
        updateTime: item.createdAt || '',
        operation: '查看'
    }));
    return [...datasourceAssets, ...datasetAssets, ...chartAssets];
});
const filteredAssets = computed(() => {
    let list = allAssets.value;
    if (assetFilter.value !== 'all') {
        list = list.filter((item) => item.type === assetFilter.value);
    }
    if (searchKeyword.value.trim()) {
        const keyword = searchKeyword.value.trim().toLowerCase();
        list = list.filter((item) => item.name.toLowerCase().includes(keyword));
    }
    if (activeAssetTab.value === 'recent') {
        return list.slice().reverse();
    }
    if (activeAssetTab.value === 'shared') {
        return list.filter((item, index) => index % 2 === 0);
    }
    return list;
});
const openModule = (module) => {
    activeModule.value = module;
    moduleDialogVisible.value = true;
};
onMounted(async () => {
    loading.value = true;
    try {
        const [datasources, datasets, charts, dashboard] = await Promise.all([
            getDatasourceList(),
            getDatasetList(),
            getChartList(),
            getDefaultDashboard()
        ]);
        datasourceList.value = datasources;
        datasetList.value = datasets;
        chartList.value = charts;
        dashboardCount.value = dashboard.kpi.dashboardCount;
    }
    finally {
        loading.value = false;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['quick-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['content-area']} */ ;
/** @type {__VLS_StyleScopedClasses['template-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['template-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-toolbar']} */ ;
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
    ...{ class: "content-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "left-column" },
});
const __VLS_3 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ class: "panel-card user-card" },
    shadow: "never",
}));
const __VLS_5 = __VLS_4({
    ...{ class: "panel-card user-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-line" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-avatar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-name" },
});
(__VLS_ctx.displayName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-id" },
});
(__VLS_ctx.userId);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metrics-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-value" },
});
(__VLS_ctx.dashboardCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-value" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metric-value" },
});
(__VLS_ctx.datasetCount);
var __VLS_6;
const __VLS_7 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ class: "panel-card" },
    shadow: "never",
}));
const __VLS_9 = __VLS_8({
    ...{ class: "panel-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_10.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-head" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openModule('dashboard');
        } },
    ...{ class: "quick-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "dot dot-blue" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openModule('chart');
        } },
    ...{ class: "quick-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "dot dot-green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openModule('dataset');
        } },
    ...{ class: "quick-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "dot dot-cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openModule('datasource');
        } },
    ...{ class: "quick-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "dot dot-purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "template-btn" },
});
var __VLS_10;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "right-column" },
});
const __VLS_11 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    ...{ class: "panel-card" },
    shadow: "never",
}));
const __VLS_13 = __VLS_12({
    ...{ class: "panel-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_14.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_14.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "head-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "card-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "head-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "text-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "text-btn" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "template-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "tab-chip tab-chip--active" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "tab-chip" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "template-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.templateCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.name),
        ...{ class: "template-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-thumb" },
        ...{ style: ({ background: item.bg }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-name" },
    });
    (item.name);
}
var __VLS_14;
const __VLS_15 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ class: "panel-card" },
    shadow: "never",
}));
const __VLS_17 = __VLS_16({
    ...{ class: "panel-card" },
    shadow: "never",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "asset-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeAssetTab = 'favorite';
        } },
    ...{ class: "asset-tab" },
    ...{ class: ({ 'asset-tab--active': __VLS_ctx.activeAssetTab === 'favorite' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeAssetTab = 'recent';
        } },
    ...{ class: "asset-tab" },
    ...{ class: ({ 'asset-tab--active': __VLS_ctx.activeAssetTab === 'recent' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeAssetTab = 'shared';
        } },
    ...{ class: "asset-tab" },
    ...{ class: ({ 'asset-tab--active': __VLS_ctx.activeAssetTab === 'shared' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "asset-toolbar" },
});
const __VLS_19 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    modelValue: (__VLS_ctx.assetFilter),
    ...{ style: {} },
}));
const __VLS_21 = __VLS_20({
    modelValue: (__VLS_ctx.assetFilter),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_22.slots.default;
const __VLS_23 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    label: "全部类型",
    value: "all",
}));
const __VLS_25 = __VLS_24({
    label: "全部类型",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
const __VLS_27 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    label: "数据源",
    value: "datasource",
}));
const __VLS_29 = __VLS_28({
    label: "数据源",
    value: "datasource",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
const __VLS_31 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    label: "数据集",
    value: "dataset",
}));
const __VLS_33 = __VLS_32({
    label: "数据集",
    value: "dataset",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
const __VLS_35 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    label: "图表",
    value: "chart",
}));
const __VLS_37 = __VLS_36({
    label: "图表",
    value: "chart",
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
var __VLS_22;
const __VLS_39 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索关键词",
    ...{ style: {} },
    clearable: true,
}));
const __VLS_41 = __VLS_40({
    modelValue: (__VLS_ctx.searchKeyword),
    placeholder: "搜索关键词",
    ...{ style: {} },
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
const __VLS_43 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    data: (__VLS_ctx.filteredAssets),
    border: true,
    emptyText: "暂无数据",
}));
const __VLS_45 = __VLS_44({
    data: (__VLS_ctx.filteredAssets),
    border: true,
    emptyText: "暂无数据",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
const __VLS_47 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    prop: "name",
    label: "名称",
    minWidth: "220",
}));
const __VLS_49 = __VLS_48({
    prop: "name",
    label: "名称",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
const __VLS_51 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    prop: "type",
    label: "类型",
    width: "140",
}));
const __VLS_53 = __VLS_52({
    prop: "type",
    label: "类型",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
const __VLS_55 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
    prop: "creator",
    label: "创建人",
    width: "140",
}));
const __VLS_57 = __VLS_56({
    prop: "creator",
    label: "创建人",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
const __VLS_59 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    prop: "editor",
    label: "最近编辑人",
    width: "140",
}));
const __VLS_61 = __VLS_60({
    prop: "editor",
    label: "最近编辑人",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
const __VLS_63 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    prop: "updateTime",
    label: "最近编辑时间",
    width: "180",
}));
const __VLS_65 = __VLS_64({
    prop: "updateTime",
    label: "最近编辑时间",
    width: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
const __VLS_67 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    prop: "operation",
    label: "操作",
    width: "120",
}));
const __VLS_69 = __VLS_68({
    prop: "operation",
    label: "操作",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
var __VLS_46;
var __VLS_18;
const __VLS_71 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    modelValue: (__VLS_ctx.moduleDialogVisible),
    title: (__VLS_ctx.moduleTitle),
    width: "80%",
    top: "4vh",
}));
const __VLS_73 = __VLS_72({
    modelValue: (__VLS_ctx.moduleDialogVisible),
    title: (__VLS_ctx.moduleTitle),
    width: "80%",
    top: "4vh",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
__VLS_74.slots.default;
const __VLS_75 = ((__VLS_ctx.activeModuleComponent));
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({}));
const __VLS_77 = __VLS_76({}, ...__VLS_functionalComponentArgsRest(__VLS_76));
var __VLS_74;
/** @type {__VLS_StyleScopedClasses['workbench-page']} */ ;
/** @type {__VLS_StyleScopedClasses['content-area']} */ ;
/** @type {__VLS_StyleScopedClasses['left-column']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['user-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-line']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-name']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-id']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-item']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-item']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-item']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-blue']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-green']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-purple']} */ ;
/** @type {__VLS_StyleScopedClasses['template-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['right-column']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['head-row']} */ ;
/** @type {__VLS_StyleScopedClasses['card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['head-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['text-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['text-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['template-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-chip--active']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['template-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['template-card']} */ ;
/** @type {__VLS_StyleScopedClasses['template-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['template-name']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-toolbar']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            loading: loading,
            dashboardCount: dashboardCount,
            activeAssetTab: activeAssetTab,
            assetFilter: assetFilter,
            searchKeyword: searchKeyword,
            moduleDialogVisible: moduleDialogVisible,
            displayName: displayName,
            userId: userId,
            templateCards: templateCards,
            activeModuleComponent: activeModuleComponent,
            moduleTitle: moduleTitle,
            datasetCount: datasetCount,
            filteredAssets: filteredAssets,
            openModule: openModule,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
