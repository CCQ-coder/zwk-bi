import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, Expand, Fold, Operation, SwitchButton } from '@element-plus/icons-vue';
import { getCurrentMenus } from '../api/menu';
import { clearAuthSession, getAuthDisplayName, getAuthMenus, hasAuthSession, saveAuthMenus, } from '../utils/auth-session';
const __VLS_props = defineProps();
const NAV_COLLAPSED_STORAGE_KEY = 'bi_shell_nav_collapsed';
const MENU_HINTS = {
    '/home': '总览与最近大屏',
    '/home/screen': '进入大屏工作区',
    '/home/publish/groups': '发布与面板管理',
    '/home/publish/panels': '发布与面板管理',
    '/home/prepare': '接入与加工资源',
    '/home/prepare/datasource': '接入与加工资源',
    '/home/prepare/dataset': '接入与加工资源',
    '/home/prepare/components': '接入与加工资源',
    '/home/prepare/extract': '接入与加工资源',
    '/home/modeling': '模型设计与管理',
    '/home/system': '系统设置与权限',
};
const router = useRouter();
const route = useRoute();
const menus = ref(getAuthMenus());
const drawerVisible = ref(false);
const navCollapsed = ref(localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === '1');
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
const applyShellBodyClass = () => {
    const body = document.body;
    body.classList.toggle('bi-shell-nav-expanded', !navCollapsed.value);
    body.classList.toggle('bi-shell-nav-collapsed', navCollapsed.value);
};
const clearShellBodyClass = () => {
    document.body.classList.remove('bi-shell-nav-expanded', 'bi-shell-nav-collapsed');
};
const getMenuHint = (path) => MENU_HINTS[path] || '进入对应模块';
const go = (path) => {
    drawerVisible.value = false;
    router.push(path);
};
const toggleCollapse = () => {
    navCollapsed.value = !navCollapsed.value;
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
    clearShellBodyClass();
    router.push('/login');
};
watch(navCollapsed, (value) => {
    localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, value ? '1' : '0');
    applyShellBodyClass();
}, { immediate: true });
onMounted(async () => {
    applyShellBodyClass();
    await loadMenus();
});
onBeforeUnmount(() => {
    clearShellBodyClass();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav--collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav--collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__user']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-shell-nav-expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-shell-nav-collapsed']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-mobile-trigger']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.drawerVisible = true;
        } },
    ...{ class: "nav-mobile-trigger" },
    type: "button",
    'aria-label': "打开导航菜单",
});
const __VLS_0 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.Operation;
/** @type {[typeof __VLS_components.Operation, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "side-nav" },
    ...{ class: ({ 'side-nav--collapsed': __VLS_ctx.navCollapsed }) },
    'aria-label': "系统导航",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-nav__top" },
});
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
if (!__VLS_ctx.navCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-sub" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleCollapse) },
    ...{ class: "side-nav__toggle" },
    type: "button",
    'aria-label': (__VLS_ctx.navCollapsed ? '展开侧边栏' : '收起侧边栏'),
});
const __VLS_8 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = ((__VLS_ctx.navCollapsed ? __VLS_ctx.Expand : __VLS_ctx.Fold));
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({}));
const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "side-nav__menu" },
    'aria-label': "主导航",
});
for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.navMenus))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.go(menu.path);
            } },
        key: (menu.id),
        ...{ class: "side-nav__item" },
        ...{ class: ({ 'side-nav__item--active': __VLS_ctx.isMenuActive(menu) }) },
        title: (__VLS_ctx.navCollapsed ? menu.name : undefined),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "side-nav__item-mark" },
    });
    (menu.name.slice(0, 1));
    if (!__VLS_ctx.navCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "side-nav__item-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "side-nav__item-label" },
        });
        (menu.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "side-nav__item-tip" },
        });
        (__VLS_ctx.getMenuHint(menu.path));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-nav__footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-nav__user" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "user-avatar" },
});
(__VLS_ctx.avatarText);
if (!__VLS_ctx.navCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-nav__user-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "side-nav__user-name" },
    });
    (__VLS_ctx.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "side-nav__user-role" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.logout) },
    ...{ class: "side-nav__logout" },
    type: "button",
});
const __VLS_16 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.SwitchButton;
/** @type {[typeof __VLS_components.SwitchButton, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
var __VLS_19;
if (!__VLS_ctx.navCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.go('/home');
            } },
        ...{ class: "brand brand--drawer" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-mark" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "brand-sub" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "drawer-menu-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (menu.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.getMenuHint(menu.path));
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "drawer-user-role" },
});
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
/** @type {__VLS_StyleScopedClasses['nav-mobile-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__top']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-text']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__item-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__footer']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__user']} */ ;
/** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__user-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__user-role']} */ ;
/** @type {__VLS_StyleScopedClasses['side-nav__logout']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-head']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand--drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-text']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-menu-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-card']} */ ;
/** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-user-role']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowRight: ArrowRight,
            Expand: Expand,
            Fold: Fold,
            Operation: Operation,
            SwitchButton: SwitchButton,
            drawerVisible: drawerVisible,
            navCollapsed: navCollapsed,
            displayName: displayName,
            avatarText: avatarText,
            navMenus: navMenus,
            getMenuHint: getMenuHint,
            go: go,
            toggleCollapse: toggleCollapse,
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
