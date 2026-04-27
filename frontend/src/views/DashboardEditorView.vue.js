import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ScreenDesignerPanel from '../components/ScreenDesignerPanel.vue';
const route = useRoute();
const router = useRouter();
const dashboardId = computed(() => {
    const id = Number(route.params.id);
    return Number.isFinite(id) && id > 0 ? id : null;
});
const handleBack = () => {
    router.push('/home/dashboard');
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor-page" },
});
/** @type {[typeof ScreenDesignerPanel, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ScreenDesignerPanel, new ScreenDesignerPanel({
    ...{ 'onBack': {} },
    screenId: (__VLS_ctx.dashboardId),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onBack': {} },
    screenId: (__VLS_ctx.dashboardId),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onBack: (__VLS_ctx.handleBack)
};
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['editor-page']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ScreenDesignerPanel: ScreenDesignerPanel,
            dashboardId: dashboardId,
            handleBack: handleBack,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
