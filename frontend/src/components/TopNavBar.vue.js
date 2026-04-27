/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, Operation } from '@element-plus/icons-vue';
import { getCurrentMenus } from '../api/menu';
import { clearAuthSession, getAuthDisplayName, getAuthMenus, hasAuthSession, saveAuthMenus, } from '../utils/auth-session';
const __VLS_props = defineProps();
const router = useRouter();
const route = useRoute();
const menus = ref(getAuthMenus());
const drawerVisible = ref(false);
const displayName = computed(() => getAuthDisplayName());
const avatarText = computed(() => displayName.value.slice(0, 1) || '用');
const sortMenus = (items) => [...items]
    .filter((item) => item.visible !== false)
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0));
const resolveMenuPath = (item) => {
    if (item.path && item.type === 'menu') {
        return item.path;
    }
    for (const child of sortMenus(item.children ?? [])) {
        const path = resolveMenuPath(child);
        if (path)
            return path;
    }
    return item.path || '';
};
const collectActivePaths = (item) => {
    const paths = new Set();
    if (item.path)
        paths.add(item.path);
    for (const child of sortMenus(item.children ?? [])) {
        collectActivePaths(child).forEach((path) => paths.add(path));
    }
    return Array.from(paths);
};
const isPathActive = (path) => route.path === path || (path !== '/home' && route.path.startsWith(`${path}/`));
const navMenus = computed(() => sortMenus(menus.value.filter((item) => !item.parentId)).map((item) => {
    const path = resolveMenuPath(item);
    if (!path)
        return null;
    return {
        id: item.id,
        name: item.name,
        path,
        activePaths: collectActivePaths(item),
    };
}).filter((item) => Boolean(item)));
const go = (path) => {
    drawerVisible.value = false;
    router.push(path);
};
const isMenuActive = (menu) => menu.activePaths.some((path) => isPathActive(path));
const loadMenus = async () => {
    if (!hasAuthSession())
        return;
    try {
        const latestMenus = await getCurrentMenus();
        menus.value = latestMenus;
        saveAuthMenus(latestMenus);
    }
    catch {
        menus.value = getAuthMenus();
    }
};
const logout = () => {
    drawerVisible.value = false;
    clearAuthSession();
    router.push('/login');
};
onMounted(loadMenus);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-items']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-mobile-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-items']} */ ;
/** @type {__VLS_StyleScopedClasses['user-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "top-nav" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "nav-brand-block" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "nav-mobile-trigger" },
    text: true,
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "nav-mobile-trigger" },
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.drawerVisible = true;
    }
};
__VLS_3.slots.default;
const __VLS_8 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.Operation;
/** @type {[typeof __VLS_components.Operation, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.go('/home');
        } },
    ...{ class: "brand" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "brand-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "brand-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav-items" },
    'aria-label': "主导航",
});
for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.navMenus))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.go(menu.path);
            } },
        key: (menu.id),
        ...{ class: "nav-btn" },
        ...{ class: ({ 'nav-btn--active': __VLS_ctx.isMenuActive(menu) }) },
    });
    (menu.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-menu" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "user-avatar" },
});
(__VLS_ctx.avatarText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "user-name" },
});
(__VLS_ctx.displayName);
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.logout)
};
__VLS_19.slots.default;
var __VLS_19;
const __VLS_24 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    modelValue: (__VLS_ctx.drawerVisible),
    direction: "ltr",
    size: "280px",
    ...{ class: "nav-drawer" },
}));
const __VLS_26 = __VLS_25({
    modelValue: (__VLS_ctx.drawerVisible),
    direction: "ltr",
    size: "280px",
    ...{ class: "nav-drawer" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_27.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "drawer-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "drawer-brand" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "drawer-menu" },
});
for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.navMenus))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.go(menu.path);
            } },
        key: (`drawer-${menu.id}`),
        ...{ class: "drawer-menu-btn" },
        ...{ class: ({ 'drawer-menu-btn--active': __VLS_ctx.isMenuActive(menu) }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (menu.name);
    const __VLS_28 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({}));
    const __VLS_30 = __VLS_29({}, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    const __VLS_32 = {}.ArrowRight;
    /** @type {[typeof __VLS_components.ArrowRight, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
    const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
    var __VLS_31;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "drawer-user-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "user-avatar" },
});
(__VLS_ctx.avatarText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "drawer-user-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "drawer-user-name" },
});
(__VLS_ctx.displayName);
const __VLS_36 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}));
const __VLS_38 = __VLS_37({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onClick: (__VLS_ctx.logout)
};
__VLS_39.slots.default;
var __VLS_39;
var __VLS_27;
/** @type {__VLS_StyleScopedClasses['top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-brand-block']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-mobile-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-text']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-items']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['user-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['user-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['user-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-head']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-card']} */ ;
/** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowRight: ArrowRight,
            Operation: Operation,
            drawerVisible: drawerVisible,
            displayName: displayName,
            avatarText: avatarText,
            navMenus: navMenus,
            go: go,
            isMenuActive: isMenuActive,
            logout: logout,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
