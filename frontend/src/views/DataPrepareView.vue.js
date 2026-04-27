/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TopNavBar from '../components/TopNavBar.vue';
const DatasourcePanel = defineAsyncComponent(() => import('../components/DatasourcePanel.vue'));
const DatasetPanel = defineAsyncComponent(() => import('../components/DatasetPanel.vue'));
const ExtractPanel = defineAsyncComponent(() => import('../components/ExtractPanel.vue'));
const ComponentAssetPanel = defineAsyncComponent(() => import('../components/ComponentAssetPanel.vue'));
const route = useRoute();
const router = useRouter();
const activeTab = ref('datasource');
const tabRouteMap = {
    datasource: '/home/prepare/datasource',
    dataset: '/home/prepare/dataset',
    components: '/home/prepare/components',
    extract: '/home/prepare/extract',
};
const routeTabMap = computed(() => ({
    '/home/prepare': 'datasource',
    '/home/prepare/datasource': 'datasource',
    '/home/prepare/dataset': 'dataset',
    '/home/prepare/components': 'components',
    '/home/prepare/extract': 'extract',
}));
watch(() => route.path, (path) => {
    activeTab.value = routeTabMap.value[path] ?? 'datasource';
}, { immediate: true });
watch(activeTab, (tab) => {
    const targetPath = tabRouteMap[tab];
    if (targetPath && targetPath !== route.path) {
        router.push(targetPath);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-wrap" },
});
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "prepare",
}));
const __VLS_1 = __VLS_0({
    active: "prepare",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "page-main" },
});
const __VLS_3 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    modelValue: (__VLS_ctx.activeTab),
    type: "border-card",
    ...{ class: "prepare-tabs" },
}));
const __VLS_5 = __VLS_4({
    modelValue: (__VLS_ctx.activeTab),
    type: "border-card",
    ...{ class: "prepare-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
const __VLS_7 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    label: "数据源管理",
    name: "datasource",
    lazy: true,
}));
const __VLS_9 = __VLS_8({
    label: "数据源管理",
    name: "datasource",
    lazy: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
const __VLS_11 = {}.DatasourcePanel;
/** @type {[typeof __VLS_components.DatasourcePanel, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({}));
const __VLS_13 = __VLS_12({}, ...__VLS_functionalComponentArgsRest(__VLS_12));
var __VLS_10;
const __VLS_15 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    label: "数据集管理",
    name: "dataset",
    lazy: true,
}));
const __VLS_17 = __VLS_16({
    label: "数据集管理",
    name: "dataset",
    lazy: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
const __VLS_19 = {}.DatasetPanel;
/** @type {[typeof __VLS_components.DatasetPanel, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({}));
const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
var __VLS_18;
const __VLS_23 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    label: "组件管理",
    name: "components",
    lazy: true,
}));
const __VLS_25 = __VLS_24({
    label: "组件管理",
    name: "components",
    lazy: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
__VLS_26.slots.default;
const __VLS_27 = {}.ComponentAssetPanel;
/** @type {[typeof __VLS_components.ComponentAssetPanel, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
var __VLS_26;
const __VLS_31 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    label: "数据抽取",
    name: "extract",
    lazy: true,
}));
const __VLS_33 = __VLS_32({
    label: "数据抽取",
    name: "extract",
    lazy: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_34.slots.default;
const __VLS_35 = {}.ExtractPanel;
/** @type {[typeof __VLS_components.ExtractPanel, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({}));
const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
var __VLS_34;
var __VLS_6;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['prepare-tabs']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            DatasourcePanel: DatasourcePanel,
            DatasetPanel: DatasetPanel,
            ExtractPanel: ExtractPanel,
            ComponentAssetPanel: ComponentAssetPanel,
            activeTab: activeTab,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
