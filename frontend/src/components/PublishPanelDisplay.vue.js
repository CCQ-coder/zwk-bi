/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getDisplayPublishGroups } from '../api/publish';
const loading = ref(false);
const iframeLoading = ref(true);
const groups = ref([]);
const selectedGroupId = ref(null);
const selectedScreenId = ref(null);
const sidebarWidth = ref(332);
let stopSidebarResize = null;
const currentGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? null);
const currentScreen = computed(() => currentGroup.value?.screens.find((screen) => screen.id === selectedScreenId.value) ?? null);
const sidebarStyle = computed(() => ({ width: `${sidebarWidth.value}px` }));
const currentScreenUrl = computed(() => {
    if (!currentScreen.value) {
        return '';
    }
    const basePath = `/preview/screen/${currentScreen.value.id}`;
    return currentScreen.value.shareToken
        ? `${basePath}?token=${encodeURIComponent(currentScreen.value.shareToken)}`
        : basePath;
});
const selectGroup = (groupId) => {
    selectedGroupId.value = groupId;
};
const selectScreen = (screenId) => {
    selectedScreenId.value = screenId;
};
const startSidebarResize = (event) => {
    if (window.innerWidth <= 960) {
        return;
    }
    const startX = event.clientX;
    const startWidth = sidebarWidth.value;
    const handleMouseMove = (moveEvent) => {
        const nextWidth = startWidth + (moveEvent.clientX - startX);
        sidebarWidth.value = Math.min(420, Math.max(280, nextWidth));
    };
    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        stopSidebarResize = null;
    };
    stopSidebarResize = handleMouseUp;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};
const loadGroups = async () => {
    loading.value = true;
    try {
        groups.value = await getDisplayPublishGroups();
    }
    finally {
        loading.value = false;
    }
};
const openInNewWindow = () => {
    if (!currentScreenUrl.value) {
        return;
    }
    window.open(currentScreenUrl.value, '_blank', 'noopener,noreferrer');
};
const formatDate = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};
watch(groups, (nextGroups) => {
    if (!nextGroups.length) {
        selectedGroupId.value = null;
        selectedScreenId.value = null;
        return;
    }
    if (!nextGroups.some((group) => group.id === selectedGroupId.value)) {
        selectedGroupId.value = nextGroups[0].id;
    }
}, { immediate: true });
watch(currentGroup, (group) => {
    if (!group?.screens.length) {
        selectedScreenId.value = null;
        return;
    }
    if (!group.screens.some((screen) => screen.id === selectedScreenId.value)) {
        selectedScreenId.value = group.screens[0].id;
    }
}, { immediate: true });
watch(currentScreenUrl, (nextUrl) => {
    iframeLoading.value = Boolean(nextUrl);
});
onMounted(() => {
    loadGroups().catch(() => {
        ElMessage.error('BI 发布展示数据加载失败');
    });
});
onBeforeUnmount(() => {
    stopSidebarResize?.();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['display-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill--active']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row--active']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill--active']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill__name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row--active']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row__name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['display-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__sections']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__iframe']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "publish-display" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "display-shell panel-shell" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
if (!__VLS_ctx.loading && !__VLS_ctx.groups.length) {
    const __VLS_0 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: "暂无已分配到分组的已发布大屏，请先在分组管理里完成分配。",
        ...{ class: "display-empty" },
    }));
    const __VLS_2 = __VLS_1({
        description: "暂无已分配到分组的已发布大屏，请先在分组管理里完成分配。",
        ...{ class: "display-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "display-sidebar panel-card" },
        ...{ style: (__VLS_ctx.sidebarStyle) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "display-sidebar__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "display-sidebar__title" },
    });
    const __VLS_4 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: "small",
        type: "primary",
    }));
    const __VLS_6 = __VLS_5({
        size: "small",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    (__VLS_ctx.currentScreen ? '已选大屏' : '待选择');
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "display-sidebar__sections" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "sidebar-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-section__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-section__title" },
    });
    const __VLS_8 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: "small",
        effect: "plain",
    }));
    const __VLS_10 = __VLS_9({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    (__VLS_ctx.groups.length);
    var __VLS_11;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-section__list" },
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.groups))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.loading && !__VLS_ctx.groups.length))
                        return;
                    __VLS_ctx.selectGroup(group.id);
                } },
            key: (group.id),
            type: "button",
            ...{ class: "group-pill" },
            ...{ class: ({ 'group-pill--active': __VLS_ctx.currentGroup?.id === group.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "group-pill__name" },
        });
        (group.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "group-pill__meta" },
        });
        (group.screenCount);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "sidebar-section sidebar-section--screens" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-section__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar-section__title" },
    });
    const __VLS_12 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: "small",
        type: "success",
    }));
    const __VLS_14 = __VLS_13({
        size: "small",
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    (__VLS_ctx.currentGroup?.screens.length || 0);
    var __VLS_15;
    if (!__VLS_ctx.currentGroup?.screens.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-rail__empty" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sidebar-section__list sidebar-section__list--screens" },
        });
        for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.currentGroup.screens))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.loading && !__VLS_ctx.groups.length))
                            return;
                        if (!!(!__VLS_ctx.currentGroup?.screens.length))
                            return;
                        __VLS_ctx.selectScreen(screen.id);
                    } },
                key: (screen.id),
                type: "button",
                ...{ class: "screen-row" },
                ...{ class: ({ 'screen-row--active': __VLS_ctx.currentScreen?.id === screen.id }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-row__thumb" },
                ...{ style: (screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined) },
            });
            if (!screen.coverUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-row__copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-row__name" },
            });
            (screen.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-row__meta" },
            });
            (__VLS_ctx.formatDate(screen.publishedAt || screen.createdAt) || '发布时间待补充');
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.startSidebarResize) },
        ...{ class: "display-sidebar__resize" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "preview-stage panel-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage__toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage__title" },
    });
    (__VLS_ctx.currentScreen?.name || '等待选择大屏');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage__actions" },
    });
    if (__VLS_ctx.currentGroup) {
        const __VLS_16 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: "small",
            effect: "plain",
        }));
        const __VLS_18 = __VLS_17({
            size: "small",
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        (__VLS_ctx.currentGroup.name);
        var __VLS_19;
    }
    if (__VLS_ctx.currentScreenUrl) {
        const __VLS_20 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_24;
        let __VLS_25;
        let __VLS_26;
        const __VLS_27 = {
            onClick: (__VLS_ctx.openInNewWindow)
        };
        __VLS_23.slots.default;
        var __VLS_23;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-stage__canvas" },
    });
    if (!__VLS_ctx.currentScreen) {
        const __VLS_28 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            description: "请选择一个 BI 大屏进行展示",
        }));
        const __VLS_30 = __VLS_29({
            description: "请选择一个 BI 大屏进行展示",
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    }
    else {
        if (__VLS_ctx.iframeLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-stage__loading" },
            });
            (__VLS_ctx.currentScreen.name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe)({
            ...{ onLoad: (...[$event]) => {
                    if (!!(!__VLS_ctx.loading && !__VLS_ctx.groups.length))
                        return;
                    if (!!(!__VLS_ctx.currentScreen))
                        return;
                    __VLS_ctx.iframeLoading = false;
                } },
            key: (__VLS_ctx.currentScreenUrl),
            ...{ class: "preview-stage__iframe" },
            src: (__VLS_ctx.currentScreenUrl),
            title: "BI大屏展示",
            loading: "lazy",
        });
    }
}
/** @type {__VLS_StyleScopedClasses['publish-display']} */ ;
/** @type {__VLS_StyleScopedClasses['display-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['display-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__head']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__title']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__sections']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__list']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill__name']} */ ;
/** @type {__VLS_StyleScopedClasses['group-pill__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section--screens']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-rail__empty']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__list']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section__list--screens']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row__thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row__copy']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row__name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-row__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['display-sidebar__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__title']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__loading']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-stage__iframe']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            iframeLoading: iframeLoading,
            groups: groups,
            currentGroup: currentGroup,
            currentScreen: currentScreen,
            sidebarStyle: sidebarStyle,
            currentScreenUrl: currentScreenUrl,
            selectGroup: selectGroup,
            selectScreen: selectScreen,
            startSidebarResize: startSidebarResize,
            openInNewWindow: openInNewWindow,
            formatDate: formatDate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
