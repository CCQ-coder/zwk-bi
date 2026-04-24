import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCurrentMenus } from '../api/menu';
import TopNavBar from '../components/TopNavBar.vue';
import { flattenAuthMenus, getAuthMenus, hasAuthSession, saveAuthMenus } from '../utils/auth-session';
const PublishGroupManager = defineAsyncComponent(() => import('../components/PublishGroupManager.vue'));
const PublishPanelDisplay = defineAsyncComponent(() => import('../components/PublishPanelDisplay.vue'));
const route = useRoute();
const router = useRouter();
const activeTab = ref('panels');
const menus = ref(getAuthMenus());
const tabs = [
    { name: 'groups', path: '/home/publish/groups' },
    { name: 'panels', path: '/home/publish/panels' },
];
const routeTabMap = {
    '/home/publish/groups': 'groups',
    '/home/publish/panels': 'panels',
};
const tabRouteMap = {
    groups: '/home/publish/groups',
    panels: '/home/publish/panels',
};
const authPaths = computed(() => new Set(flattenAuthMenus(menus.value).map((item) => item.path).filter(Boolean)));
const visibleTabs = computed(() => tabs.filter((tab) => authPaths.value.has(tab.path)));
const fallbackTab = computed(() => visibleTabs.value[0]?.name ?? 'panels');
const hasTab = (tabName) => visibleTabs.value.some((tab) => tab.name === tabName);
const loadMenus = async () => {
    if (!hasAuthSession()) {
        menus.value = [];
        return;
    }
    try {
        const latestMenus = await getCurrentMenus();
        menus.value = latestMenus;
        saveAuthMenus(latestMenus);
    }
    catch {
        menus.value = getAuthMenus();
    }
};
watch(() => route.path, (path) => {
    activeTab.value = routeTabMap[path] ?? fallbackTab.value;
}, { immediate: true });
watch(visibleTabs, (nextTabs) => {
    if (!nextTabs.length) {
        return;
    }
    if (!nextTabs.some((tab) => tab.name === activeTab.value)) {
        activeTab.value = nextTabs[0].name;
    }
}, { immediate: true });
watch(activeTab, (tab) => {
    const targetPath = tabRouteMap[tab];
    if (targetPath && route.path !== targetPath) {
        router.push(targetPath);
    }
});
onMounted(loadMenus);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['publish-hero__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero__title']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-wrap" },
});
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "publish",
}));
const __VLS_1 = __VLS_0({
    active: "publish",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "page-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "publish-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-hero__eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-hero__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-hero__subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-hero__tags" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (!__VLS_ctx.visibleTabs.length) {
    const __VLS_3 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        description: "当前账号没有 BI 发布平台菜单权限",
        ...{ class: "publish-empty" },
    }));
    const __VLS_5 = __VLS_4({
        description: "当前账号没有 BI 发布平台菜单权限",
        ...{ class: "publish-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
else {
    const __VLS_7 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        modelValue: (__VLS_ctx.activeTab),
        type: "border-card",
        ...{ class: "publish-tabs" },
    }));
    const __VLS_9 = __VLS_8({
        modelValue: (__VLS_ctx.activeTab),
        type: "border-card",
        ...{ class: "publish-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    __VLS_10.slots.default;
    if (__VLS_ctx.hasTab('groups')) {
        const __VLS_11 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
            label: "分组管理",
            name: "groups",
            lazy: true,
        }));
        const __VLS_13 = __VLS_12({
            label: "分组管理",
            name: "groups",
            lazy: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_12));
        __VLS_14.slots.default;
        const __VLS_15 = {}.PublishGroupManager;
        /** @type {[typeof __VLS_components.PublishGroupManager, ]} */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({}));
        const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
        var __VLS_14;
    }
    if (__VLS_ctx.hasTab('panels')) {
        const __VLS_19 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            label: "BI面板展示",
            name: "panels",
            lazy: true,
        }));
        const __VLS_21 = __VLS_20({
            label: "BI面板展示",
            name: "panels",
            lazy: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_22.slots.default;
        const __VLS_23 = {}.PublishPanelDisplay;
        /** @type {[typeof __VLS_components.PublishPanelDisplay, ]} */ ;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({}));
        const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
        var __VLS_22;
    }
    var __VLS_10;
}
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero__eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero__title']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero__subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-hero__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-tabs']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            PublishGroupManager: PublishGroupManager,
            PublishPanelDisplay: PublishPanelDisplay,
            activeTab: activeTab,
            visibleTabs: visibleTabs,
            hasTab: hasTab,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
