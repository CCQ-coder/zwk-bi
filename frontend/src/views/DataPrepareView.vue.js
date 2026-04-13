import { ref } from 'vue';
import TopNavBar from '../components/TopNavBar.vue';
import DatasourcePanel from '../components/DatasourcePanel.vue';
import DatasetPanel from '../components/DatasetPanel.vue';
import ExtractPanel from '../components/ExtractPanel.vue';
const activeTab = ref('datasource');
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
}));
const __VLS_9 = __VLS_8({
    label: "数据源管理",
    name: "datasource",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
/** @type {[typeof DatasourcePanel, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(DatasourcePanel, new DatasourcePanel({}));
const __VLS_12 = __VLS_11({}, ...__VLS_functionalComponentArgsRest(__VLS_11));
var __VLS_10;
const __VLS_14 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    label: "数据集管理",
    name: "dataset",
}));
const __VLS_16 = __VLS_15({
    label: "数据集管理",
    name: "dataset",
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
/** @type {[typeof DatasetPanel, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(DatasetPanel, new DatasetPanel({}));
const __VLS_19 = __VLS_18({}, ...__VLS_functionalComponentArgsRest(__VLS_18));
var __VLS_17;
const __VLS_21 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    label: "数据抽取",
    name: "extract",
}));
const __VLS_23 = __VLS_22({
    label: "数据抽取",
    name: "extract",
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
/** @type {[typeof ExtractPanel, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(ExtractPanel, new ExtractPanel({}));
const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_24;
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
