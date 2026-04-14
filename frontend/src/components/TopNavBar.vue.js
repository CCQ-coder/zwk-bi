import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCurrentMenus } from '../api/menu';
import { clearAuthSession, getAuthDisplayName, getAuthMenus, hasAuthSession, saveAuthMenus, } from '../utils/auth-session';
const __VLS_props = defineProps();
const router = useRouter();
const route = useRoute();
const menus = ref(getAuthMenus());
const displayName = computed(() => getAuthDisplayName());
const avatarText = computed(() => displayName.value.slice(0, 1) || '用');
const navMenus = computed(() => menus.value.filter((item) => item.visible !== false && item.type === 'menu' && item.path && !item.parentId));
const go = (path) => {
    router.push(path);
};
const isMenuActive = (path) => route.path === path || (path !== '/home' && route.path.startsWith(`${path}/`));
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
    clearAuthSession();
    router.push('/login');
};
onMounted(loadMenus);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-items']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "top-nav" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav-items" },
});
for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.navMenus))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.go(menu.path);
            } },
        key: (menu.id),
        ...{ class: "nav-btn" },
        ...{ class: ({ 'nav-btn--active': __VLS_ctx.isMenuActive(menu.path) }) },
    });
    (menu.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-menu" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "user-avatar" },
});
(__VLS_ctx.avatarText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.displayName);
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    link: true,
    ...{ class: "logout-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.logout)
};
__VLS_3.slots.default;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['top-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-items']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['user-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['logout-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
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
