/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { CollectionTag, Monitor } from '@element-plus/icons-vue';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
const navWidth = ref(264);
const navCollapsed = ref(false);
let stopNavResize = null;
const tabs = [
    {
        name: 'groups',
        path: '/home/publish/groups',
        label: '分组管理',
        icon: CollectionTag,
    },
    {
        name: 'panels',
        path: '/home/publish/panels',
        label: 'BI面板展示',
        icon: Monitor,
    },
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
const publishNavStyle = computed(() => navCollapsed.value
    ? { width: '76px' }
    : { width: `${navWidth.value}px` });
const hasTab = (tabName) => visibleTabs.value.some((tab) => tab.name === tabName);
const toggleNavCollapsed = () => {
    navCollapsed.value = !navCollapsed.value;
};
const startNavResize = (event) => {
    if (navCollapsed.value || window.innerWidth <= 960) {
        return;
    }
    const startX = event.clientX;
    const startWidth = navWidth.value;
    const handleMouseMove = (moveEvent) => {
        const nextWidth = startWidth + (moveEvent.clientX - startX);
        navWidth.value = Math.min(320, Math.max(220, nextWidth));
    };
    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        stopNavResize = null;
    };
    stopNavResize = handleMouseUp;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};
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
onBeforeUnmount(() => {
    stopNavResize?.();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['publish-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item-title']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav--collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__head']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav--collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav--collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__title']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__head']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__menu']} */ ;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "publish-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "publish-nav" },
        ...{ class: ({ 'publish-nav--collapsed': __VLS_ctx.navCollapsed }) },
        ...{ style: (__VLS_ctx.publishNavStyle) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "publish-nav__inner panel-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "publish-nav__head" },
    });
    if (!__VLS_ctx.navCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "publish-nav__title" },
        });
    }
    const __VLS_7 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        text: true,
        ...{ class: "publish-nav__toggle" },
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        text: true,
        ...{ class: "publish-nav__toggle" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onClick: (__VLS_ctx.toggleNavCollapsed)
    };
    __VLS_10.slots.default;
    (__VLS_ctx.navCollapsed ? '展开' : '折叠');
    var __VLS_10;
    if (!__VLS_ctx.navCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "publish-nav__section-label" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "publish-nav__menu" },
        ...{ class: ({ 'publish-nav__menu--compact': __VLS_ctx.navCollapsed }) },
    });
    for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.visibleTabs))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleTabs.length))
                        return;
                    __VLS_ctx.activeTab = tab.name;
                } },
            key: (tab.name),
            type: "button",
            ...{ class: "publish-nav__item" },
            ...{ class: ({ 'publish-nav__item--active': __VLS_ctx.activeTab === tab.name }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "publish-nav__item-icon" },
        });
        const __VLS_15 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({}));
        const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
        __VLS_18.slots.default;
        const __VLS_19 = ((tab.icon));
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({}));
        const __VLS_21 = __VLS_20({}, ...__VLS_functionalComponentArgsRest(__VLS_20));
        var __VLS_18;
        if (!__VLS_ctx.navCollapsed) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "publish-nav__item-copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "publish-nav__item-title" },
            });
            (tab.label);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.startNavResize) },
        ...{ class: "publish-nav__resize" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "publish-workspace" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "publish-workspace__body" },
    });
    if (__VLS_ctx.activeTab === 'groups' && __VLS_ctx.hasTab('groups')) {
        const __VLS_23 = {}.PublishGroupManager;
        /** @type {[typeof __VLS_components.PublishGroupManager, ]} */ ;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({}));
        const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
    }
    else if (__VLS_ctx.activeTab === 'panels' && __VLS_ctx.hasTab('panels')) {
        const __VLS_27 = {}.PublishPanelDisplay;
        /** @type {[typeof __VLS_components.PublishPanelDisplay, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({}));
        const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
    }
}
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__head']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__title']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__item-title']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-nav__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-workspace__body']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            PublishGroupManager: PublishGroupManager,
            PublishPanelDisplay: PublishPanelDisplay,
            activeTab: activeTab,
            navCollapsed: navCollapsed,
            visibleTabs: visibleTabs,
            publishNavStyle: publishNavStyle,
            hasTab: hasTab,
            toggleNavCollapsed: toggleNavCollapsed,
            startNavResize: startNavResize,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
