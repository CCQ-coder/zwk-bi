import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import { getDashboardById } from '../api/dashboard';
import { getPublicDashboardById } from '../api/report';
import ReportPreviewCanvas from '../components/ReportPreviewCanvas.vue';
import { canAccessPublishedReport, normalizePublishConfig, parseReportConfig } from '../utils/report-config';
import { getAuthRole, hasAuthSession } from '../utils/auth-session';
const route = useRoute();
const router = useRouter();
const dashboardId = computed(() => Number(route.params.id || 0));
const scene = computed(() => String(route.meta.scene) === 'screen' ? 'screen' : 'dashboard');
const shareLink = computed(() => `${window.location.origin}${route.fullPath.replace(/[?].*$/, '')}`);
const dashboard = ref(null);
const loading = ref(false);
const accessReason = ref('');
const localRole = computed(() => getAuthRole());
const hasSession = computed(() => hasAuthSession());
const token = computed(() => String(route.query.token || ''));
const accessMode = computed(() => !hasSession.value && Boolean(token.value) ? 'public' : 'private');
const publishConfig = computed(() => normalizePublishConfig(parseReportConfig(dashboard.value?.configJson).publish));
const accessResult = computed(() => {
    if (accessMode.value === 'public') {
        return {
            allowed: Boolean(dashboard.value) && !accessReason.value,
            reason: accessReason.value,
        };
    }
    if (!dashboard.value) {
        return {
            allowed: false,
            reason: accessReason.value || '未找到对应报告',
        };
    }
    return canAccessPublishedReport({
        configJson: dashboard.value?.configJson,
        localRole: localRole.value,
        hasSession: hasSession.value,
        token: token.value,
    });
});
const canShareLink = computed(() => publishConfig.value.status === 'PUBLISHED');
const publishBannerTitle = computed(() => publishConfig.value.status === 'PUBLISHED'
    ? `当前为正式发布版本，允许角色：${publishConfig.value.allowedRoles.join(' / ')}`
    : '当前为内部草稿预览');
const loadDashboard = async () => {
    loading.value = true;
    accessReason.value = '';
    try {
        if (accessMode.value === 'public') {
            dashboard.value = await getPublicDashboardById(dashboardId.value, token.value);
            return;
        }
        if (!hasSession.value) {
            dashboard.value = null;
            accessReason.value = '请先登录，或使用有效的分享链接访问该报告';
            return;
        }
        dashboard.value = await getDashboardById(dashboardId.value);
    }
    catch (error) {
        dashboard.value = null;
        accessReason.value = error instanceof Error ? error.message : '无法访问该报告';
    }
    finally {
        loading.value = false;
    }
};
const copyShareLink = async () => {
    if (!canShareLink.value) {
        ElMessage.warning('该报告尚未正式发布');
        return;
    }
    try {
        await navigator.clipboard.writeText(shareLink.value);
        ElMessage.success('分享链接已复制');
    }
    catch {
        ElMessage.warning('复制失败，请手动复制地址栏链接');
    }
};
const printReport = () => {
    window.print();
};
const goBack = () => {
    if (window.history.length > 1)
        router.back();
    else
        router.push(scene.value === 'screen' ? '/home/screen' : '/home/dashboard');
};
onMounted(() => {
    loadDashboard();
    if (route.query.autoprint === '1') {
        window.setTimeout(() => window.print(), 600);
    }
});
watch(dashboardId, loadDashboard);
watch([dashboardId, token, hasSession], loadDashboard);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['preview-page--screen']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-screen-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-page" },
    ...{ class: ({ 'preview-page--screen': __VLS_ctx.scene === 'screen' }) },
});
if (__VLS_ctx.scene !== 'screen') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "preview-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-actions" },
    });
    const __VLS_0 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.goBack)
    };
    __VLS_3.slots.default;
    var __VLS_3;
    if (__VLS_ctx.canShareLink) {
        const __VLS_8 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_12;
        let __VLS_13;
        let __VLS_14;
        const __VLS_15 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_11.slots.default;
        var __VLS_11;
    }
    const __VLS_16 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.printReport)
    };
    __VLS_19.slots.default;
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "preview-body" },
    });
    if (__VLS_ctx.dashboard && __VLS_ctx.accessResult.allowed) {
        const __VLS_24 = {}.ElAlert;
        /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ class: "preview-banner" },
            title: (__VLS_ctx.publishBannerTitle),
            type: "success",
            closable: (false),
            showIcon: true,
        }));
        const __VLS_26 = __VLS_25({
            ...{ class: "preview-banner" },
            title: (__VLS_ctx.publishBannerTitle),
            type: "success",
            closable: (false),
            showIcon: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    }
    if (!__VLS_ctx.loading && !__VLS_ctx.accessResult.allowed) {
        const __VLS_28 = {}.ElResult;
        /** @type {[typeof __VLS_components.ElResult, typeof __VLS_components.elResult, typeof __VLS_components.ElResult, typeof __VLS_components.elResult, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            icon: "warning",
            title: "无法访问该报告",
            subTitle: (__VLS_ctx.accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'),
        }));
        const __VLS_30 = __VLS_29({
            icon: "warning",
            title: "无法访问该报告",
            subTitle: (__VLS_ctx.accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_31.slots.default;
        {
            const { extra: __VLS_thisSlot } = __VLS_31.slots;
            const __VLS_32 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                ...{ 'onClick': {} },
            }));
            const __VLS_34 = __VLS_33({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            let __VLS_36;
            let __VLS_37;
            let __VLS_38;
            const __VLS_39 = {
                onClick: (__VLS_ctx.goBack)
            };
            __VLS_35.slots.default;
            var __VLS_35;
        }
        var __VLS_31;
    }
    else if (__VLS_ctx.dashboard && __VLS_ctx.accessResult.allowed) {
        /** @type {[typeof ReportPreviewCanvas, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(ReportPreviewCanvas, new ReportPreviewCanvas({
            dashboardId: (__VLS_ctx.dashboardId),
            scene: (__VLS_ctx.scene),
            accessMode: (__VLS_ctx.accessMode),
            shareToken: (__VLS_ctx.token),
        }));
        const __VLS_41 = __VLS_40({
            dashboardId: (__VLS_ctx.dashboardId),
            scene: (__VLS_ctx.scene),
            accessMode: (__VLS_ctx.accessMode),
            shareToken: (__VLS_ctx.token),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "preview-screen-body" },
    });
    if (!__VLS_ctx.loading && !__VLS_ctx.accessResult.allowed) {
        const __VLS_43 = {}.ElResult;
        /** @type {[typeof __VLS_components.ElResult, typeof __VLS_components.elResult, typeof __VLS_components.ElResult, typeof __VLS_components.elResult, ]} */ ;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
            icon: "warning",
            title: "无法访问该大屏",
            subTitle: (__VLS_ctx.accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'),
        }));
        const __VLS_45 = __VLS_44({
            icon: "warning",
            title: "无法访问该大屏",
            subTitle: (__VLS_ctx.accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_44));
        __VLS_46.slots.default;
        {
            const { extra: __VLS_thisSlot } = __VLS_46.slots;
            const __VLS_47 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
                ...{ 'onClick': {} },
            }));
            const __VLS_49 = __VLS_48({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_48));
            let __VLS_51;
            let __VLS_52;
            let __VLS_53;
            const __VLS_54 = {
                onClick: (__VLS_ctx.goBack)
            };
            __VLS_50.slots.default;
            var __VLS_50;
        }
        var __VLS_46;
    }
    else if (__VLS_ctx.dashboard && __VLS_ctx.accessResult.allowed) {
        /** @type {[typeof ReportPreviewCanvas, ]} */ ;
        // @ts-ignore
        const __VLS_55 = __VLS_asFunctionalComponent(ReportPreviewCanvas, new ReportPreviewCanvas({
            dashboardId: (__VLS_ctx.dashboardId),
            scene: (__VLS_ctx.scene),
            accessMode: (__VLS_ctx.accessMode),
            shareToken: (__VLS_ctx.token),
        }));
        const __VLS_56 = __VLS_55({
            dashboardId: (__VLS_ctx.dashboardId),
            scene: (__VLS_ctx.scene),
            accessMode: (__VLS_ctx.accessMode),
            shareToken: (__VLS_ctx.token),
        }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    }
}
/** @type {__VLS_StyleScopedClasses['preview-page']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-screen-body']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ReportPreviewCanvas: ReportPreviewCanvas,
            dashboardId: dashboardId,
            scene: scene,
            dashboard: dashboard,
            loading: loading,
            token: token,
            accessMode: accessMode,
            accessResult: accessResult,
            canShareLink: canShareLink,
            publishBannerTitle: publishBannerTitle,
            copyShareLink: copyShareLink,
            printReport: printReport,
            goBack: goBack,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
