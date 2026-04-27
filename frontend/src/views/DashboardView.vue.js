import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, Edit, Expand, Fold, FolderOpened, FullScreen, Grid, Monitor, MoreFilled, Plus, Search, Share, Star, View, } from '@element-plus/icons-vue';
import TopNavBar from '../components/TopNavBar.vue';
import ReportPreviewCanvas from '../components/ReportPreviewCanvas.vue';
import { createDashboard, getDashboardPage, } from '../api/dashboard';
import { buildReportConfig, normalizeCoverConfig, parseReportConfig, } from '../utils/report-config';
const router = useRouter();
const dashboardLoading = ref(false);
const templateLoading = ref(false);
const loading = computed(() => dashboardLoading.value || templateLoading.value);
const saving = ref(false);
const publishedDashboards = ref([]);
const screenTemplates = ref([]);
const dashboardTotal = ref(0);
const templateTotal = ref(0);
const createVisible = ref(false);
const keyword = ref('');
const sidebarCollapsed = ref(false);
const selectedId = ref(null);
const selectedTemplateId = ref(null);
const dashboardPage = ref(1);
const templatePage = ref(1);
const dashboardPageSize = 12;
const templatePageSize = 8;
const form = reactive({ name: '' });
const getCoverUrl = (d) => normalizeCoverConfig(parseReportConfig(d.configJson).cover).url;
const selectedDashboard = computed(() => selectedId.value ? publishedDashboards.value.find(d => d.id === selectedId.value) ?? null : null);
const selectedScreenTemplate = computed(() => selectedTemplateId.value ? screenTemplates.value.find(d => d.id === selectedTemplateId.value) ?? null : null);
const loadPublishedDashboards = async () => {
    dashboardLoading.value = true;
    try {
        const pageData = await getDashboardPage({
            page: dashboardPage.value,
            pageSize: dashboardPageSize,
            keyword: keyword.value.trim() || undefined,
            scene: 'dashboard',
            publishStatus: 'PUBLISHED',
        });
        publishedDashboards.value = pageData.items;
        dashboardTotal.value = pageData.total;
        const maxPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
        if (dashboardPage.value > maxPage) {
            dashboardPage.value = maxPage;
        }
    }
    finally {
        dashboardLoading.value = false;
    }
};
const loadScreenTemplates = async () => {
    templateLoading.value = true;
    try {
        const pageData = await getDashboardPage({
            page: templatePage.value,
            pageSize: templatePageSize,
            scene: 'screen',
            publishStatus: 'PUBLISHED',
        });
        screenTemplates.value = pageData.items;
        templateTotal.value = pageData.total;
        const maxPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
        if (templatePage.value > maxPage) {
            templatePage.value = maxPage;
        }
    }
    finally {
        templateLoading.value = false;
    }
};
// 自动选中当前页第一个已发布仪表板
watch(publishedDashboards, (list) => {
    if (list.length && (!selectedId.value || !list.find(d => d.id === selectedId.value))) {
        selectedId.value = list[0].id;
        selectedTemplateId.value = null;
    }
    if (!list.length && selectedId.value !== null) {
        selectedId.value = null;
    }
}, { immediate: true });
watch(() => [keyword.value.trim(), dashboardPage.value], ([nextKeyword, nextPage], previous) => {
    const prevKeyword = previous?.[0] ?? nextKeyword;
    if (nextKeyword !== prevKeyword && nextPage !== 1) {
        dashboardPage.value = 1;
        return;
    }
    loadPublishedDashboards();
}, { immediate: true });
watch(() => templatePage.value, () => {
    loadScreenTemplates();
}, { immediate: true });
const selectDashboard = (db) => {
    selectedId.value = db.id;
    selectedTemplateId.value = null;
};
const selectScreenTemplate = (scr) => {
    selectedTemplateId.value = scr.id;
    selectedId.value = null;
};
const openCreate = () => {
    form.name = '';
    createVisible.value = true;
};
const handleCreate = async () => {
    if (!form.name.trim()) {
        ElMessage.warning('请输入仪表板名称');
        return;
    }
    saving.value = true;
    try {
        const d = await createDashboard({ name: form.name.trim(), configJson: buildReportConfig(null, 'dashboard') });
        createVisible.value = false;
        ElMessage.success('创建成功，即将进入编辑页面');
        router.push(`/home/dashboard/edit/${d.id}`);
    }
    finally {
        saving.value = false;
    }
};
const useScreenTemplate = async (scr) => {
    const name = `${scr.name} - 副本`;
    saving.value = true;
    try {
        const d = await createDashboard({ name, configJson: buildReportConfig(null, 'dashboard') });
        ElMessage.success('已基于大屏模板创建，即将进入编辑页面');
        router.push(`/home/dashboard/edit/${d.id}`);
    }
    finally {
        saving.value = false;
    }
};
const previewScreen = (scr) => {
    window.open(`/preview/screen/${scr.id}`, '_blank');
};
const openEditor = () => {
    if (selectedId.value)
        router.push(`/home/dashboard/edit/${selectedId.value}`);
};
const openPreview = () => {
    if (selectedId.value)
        window.open(`/preview/dashboard/${selectedId.value}`, '_blank');
};
const openFullscreen = () => {
    if (selectedId.value)
        window.open(`/preview/dashboard/${selectedId.value}`, '_blank');
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel-list-action']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['template-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['template-info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['collapse-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-star']} */ ;
// CSS variable injection 
__VLS_ctx.sidebarCollapsed ? '0px' : '256px';
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-page" },
});
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "dashboard",
}));
const __VLS_1 = __VLS_0({
    active: "dashboard",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "left-panel" },
    ...{ class: ({ 'left-panel--collapsed': __VLS_ctx.sidebarCollapsed }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header" },
});
if (!__VLS_ctx.sidebarCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "panel-title" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-header-actions" },
});
if (!__VLS_ctx.sidebarCollapsed) {
    const __VLS_3 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        content: "新建仪表板",
        placement: "top",
    }));
    const __VLS_5 = __VLS_4({
        content: "新建仪表板",
        placement: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    __VLS_6.slots.default;
    const __VLS_7 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Plus),
        size: "small",
        type: "primary",
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        icon: (__VLS_ctx.Plus),
        size: "small",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onClick: (__VLS_ctx.openCreate)
    };
    var __VLS_10;
    var __VLS_6;
}
const __VLS_15 = {}.ElTooltip;
/** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    content: (__VLS_ctx.sidebarCollapsed ? '展开面板' : '收起面板'),
    placement: "top",
}));
const __VLS_17 = __VLS_16({
    content: (__VLS_ctx.sidebarCollapsed ? '展开面板' : '收起面板'),
    placement: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
const __VLS_19 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.sidebarCollapsed ? __VLS_ctx.Expand : __VLS_ctx.Fold),
    size: "small",
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.sidebarCollapsed ? __VLS_ctx.Expand : __VLS_ctx.Fold),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_23;
let __VLS_24;
let __VLS_25;
const __VLS_26 = {
    onClick: (...[$event]) => {
        __VLS_ctx.sidebarCollapsed = !__VLS_ctx.sidebarCollapsed;
    }
};
var __VLS_22;
var __VLS_18;
if (!__VLS_ctx.sidebarCollapsed) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-search" },
    });
    const __VLS_27 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        modelValue: (__VLS_ctx.keyword),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "搜索",
        clearable: true,
        size: "small",
    }));
    const __VLS_29 = __VLS_28({
        modelValue: (__VLS_ctx.keyword),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "搜索",
        clearable: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-section-header" },
    });
    const __VLS_31 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        ...{ class: "panel-section-icon" },
    }));
    const __VLS_33 = __VLS_32({
        ...{ class: "panel-section-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    __VLS_34.slots.default;
    const __VLS_35 = {}.FolderOpened;
    /** @type {[typeof __VLS_components.FolderOpened, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({}));
    const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
    var __VLS_34;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "panel-section-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-list" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dashboardLoading) }, null, null);
    for (const [db] of __VLS_getVForSourceType((__VLS_ctx.publishedDashboards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.selectDashboard(db);
                } },
            key: (db.id),
            ...{ class: "panel-item" },
            ...{ class: ({ 'panel-item--active': __VLS_ctx.selectedId === db.id }) },
        });
        const __VLS_39 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            ...{ class: "panel-item-icon" },
        }));
        const __VLS_41 = __VLS_40({
            ...{ class: "panel-item-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_42.slots.default;
        const __VLS_43 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({}));
        const __VLS_45 = __VLS_44({}, ...__VLS_functionalComponentArgsRest(__VLS_44));
        var __VLS_42;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "panel-item-name" },
            title: (db.name),
        });
        (db.name);
    }
    if (!__VLS_ctx.loading && !__VLS_ctx.publishedDashboards.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-empty" },
        });
    }
    if (__VLS_ctx.dashboardTotal > __VLS_ctx.dashboardPageSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-pagination" },
        });
        const __VLS_47 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            currentPage: (__VLS_ctx.dashboardPage),
            small: true,
            background: true,
            layout: "prev, pager, next",
            pageSize: (__VLS_ctx.dashboardPageSize),
            total: (__VLS_ctx.dashboardTotal),
        }));
        const __VLS_49 = __VLS_48({
            currentPage: (__VLS_ctx.dashboardPage),
            small: true,
            background: true,
            layout: "prev, pager, next",
            pageSize: (__VLS_ctx.dashboardPageSize),
            total: (__VLS_ctx.dashboardTotal),
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-section-header" },
    });
    const __VLS_51 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        ...{ class: "panel-section-icon" },
    }));
    const __VLS_53 = __VLS_52({
        ...{ class: "panel-section-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    __VLS_54.slots.default;
    const __VLS_55 = {}.Monitor;
    /** @type {[typeof __VLS_components.Monitor, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({}));
    const __VLS_57 = __VLS_56({}, ...__VLS_functionalComponentArgsRest(__VLS_56));
    var __VLS_54;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "panel-section-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-list panel-list--templates" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.templateLoading) }, null, null);
    for (const [scr] of __VLS_getVForSourceType((__VLS_ctx.screenTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.selectScreenTemplate(scr);
                } },
            key: ('scr-' + scr.id),
            ...{ class: "panel-item panel-item--template" },
            ...{ class: ({ 'panel-item--active': __VLS_ctx.selectedTemplateId === scr.id }) },
        });
        const __VLS_59 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            ...{ class: "panel-item-icon" },
        }));
        const __VLS_61 = __VLS_60({
            ...{ class: "panel-item-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        __VLS_62.slots.default;
        const __VLS_63 = {}.Monitor;
        /** @type {[typeof __VLS_components.Monitor, ]} */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({}));
        const __VLS_65 = __VLS_64({}, ...__VLS_functionalComponentArgsRest(__VLS_64));
        var __VLS_62;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "panel-item-name" },
            title: (scr.name),
        });
        (scr.name);
    }
    if (!__VLS_ctx.screenTemplates.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-empty" },
        });
    }
    if (__VLS_ctx.templateTotal > __VLS_ctx.templatePageSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-pagination panel-pagination--templates" },
        });
        const __VLS_67 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            currentPage: (__VLS_ctx.templatePage),
            small: true,
            background: true,
            layout: "prev, pager, next",
            pageSize: (__VLS_ctx.templatePageSize),
            total: (__VLS_ctx.templateTotal),
        }));
        const __VLS_69 = __VLS_68({
            currentPage: (__VLS_ctx.templatePage),
            small: true,
            background: true,
            layout: "prev, pager, next",
            pageSize: (__VLS_ctx.templatePageSize),
            total: (__VLS_ctx.templateTotal),
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.sidebarCollapsed = !__VLS_ctx.sidebarCollapsed;
        } },
    ...{ class: "collapse-toggle" },
});
const __VLS_71 = {}.ElIcon;
/** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({}));
const __VLS_73 = __VLS_72({}, ...__VLS_functionalComponentArgsRest(__VLS_72));
__VLS_74.slots.default;
const __VLS_75 = ((__VLS_ctx.sidebarCollapsed ? __VLS_ctx.ArrowRight : __VLS_ctx.ArrowLeft));
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({}));
const __VLS_77 = __VLS_76({}, ...__VLS_functionalComponentArgsRest(__VLS_76));
var __VLS_74;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "right-content" },
});
if (__VLS_ctx.selectedDashboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "toolbar-name" },
    });
    (__VLS_ctx.selectedDashboard.name);
    const __VLS_79 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        ...{ class: "toolbar-star" },
    }));
    const __VLS_81 = __VLS_80({
        ...{ class: "toolbar-star" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    __VLS_82.slots.default;
    const __VLS_83 = {}.Star;
    /** @type {[typeof __VLS_components.Star, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({}));
    const __VLS_85 = __VLS_84({}, ...__VLS_functionalComponentArgsRest(__VLS_84));
    var __VLS_82;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "toolbar-creator" },
    });
    const __VLS_87 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        size: "small",
        type: "success",
        ...{ style: {} },
    }));
    const __VLS_89 = __VLS_88({
        size: "small",
        type: "success",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    __VLS_90.slots.default;
    var __VLS_90;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-right" },
    });
    const __VLS_91 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.FullScreen),
    }));
    const __VLS_93 = __VLS_92({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.FullScreen),
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    let __VLS_95;
    let __VLS_96;
    let __VLS_97;
    const __VLS_98 = {
        onClick: (__VLS_ctx.openFullscreen)
    };
    __VLS_94.slots.default;
    var __VLS_94;
    const __VLS_99 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }));
    const __VLS_101 = __VLS_100({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    let __VLS_103;
    let __VLS_104;
    let __VLS_105;
    const __VLS_106 = {
        onClick: (__VLS_ctx.openPreview)
    };
    __VLS_102.slots.default;
    var __VLS_102;
    const __VLS_107 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_109 = __VLS_108({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    let __VLS_111;
    let __VLS_112;
    let __VLS_113;
    const __VLS_114 = {
        onClick: (__VLS_ctx.openPreview)
    };
    __VLS_110.slots.default;
    var __VLS_110;
    const __VLS_115 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
        type: "primary",
    }));
    const __VLS_117 = __VLS_116({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_116));
    let __VLS_119;
    let __VLS_120;
    let __VLS_121;
    const __VLS_122 = {
        onClick: (__VLS_ctx.openEditor)
    };
    __VLS_118.slots.default;
    var __VLS_118;
    const __VLS_123 = {}.ElDropdown;
    /** @type {[typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, typeof __VLS_components.ElDropdown, typeof __VLS_components.elDropdown, ]} */ ;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
        trigger: "click",
    }));
    const __VLS_125 = __VLS_124({
        trigger: "click",
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
    __VLS_126.slots.default;
    const __VLS_127 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
        size: "small",
        icon: (__VLS_ctx.MoreFilled),
    }));
    const __VLS_129 = __VLS_128({
        size: "small",
        icon: (__VLS_ctx.MoreFilled),
    }, ...__VLS_functionalComponentArgsRest(__VLS_128));
    {
        const { dropdown: __VLS_thisSlot } = __VLS_126.slots;
        const __VLS_131 = {}.ElDropdownMenu;
        /** @type {[typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, typeof __VLS_components.ElDropdownMenu, typeof __VLS_components.elDropdownMenu, ]} */ ;
        // @ts-ignore
        const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({}));
        const __VLS_133 = __VLS_132({}, ...__VLS_functionalComponentArgsRest(__VLS_132));
        __VLS_134.slots.default;
        const __VLS_135 = {}.ElDropdownItem;
        /** @type {[typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, typeof __VLS_components.ElDropdownItem, typeof __VLS_components.elDropdownItem, ]} */ ;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
            ...{ 'onClick': {} },
        }));
        const __VLS_137 = __VLS_136({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        let __VLS_139;
        let __VLS_140;
        let __VLS_141;
        const __VLS_142 = {
            onClick: (__VLS_ctx.openPreview)
        };
        __VLS_138.slots.default;
        var __VLS_138;
        var __VLS_134;
    }
    var __VLS_126;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-preview" },
        key: (__VLS_ctx.selectedId ?? 0),
    });
    /** @type {[typeof ReportPreviewCanvas, ]} */ ;
    // @ts-ignore
    const __VLS_143 = __VLS_asFunctionalComponent(ReportPreviewCanvas, new ReportPreviewCanvas({
        dashboardId: __VLS_ctx.selectedId,
        scene: "dashboard",
        accessMode: "private",
    }));
    const __VLS_144 = __VLS_143({
        dashboardId: __VLS_ctx.selectedId,
        scene: "dashboard",
        accessMode: "private",
    }, ...__VLS_functionalComponentArgsRest(__VLS_143));
}
else if (__VLS_ctx.selectedScreenTemplate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "toolbar-name" },
    });
    (__VLS_ctx.selectedScreenTemplate.name);
    const __VLS_146 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        size: "small",
        type: "warning",
        ...{ style: {} },
    }));
    const __VLS_148 = __VLS_147({
        size: "small",
        type: "warning",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    __VLS_149.slots.default;
    var __VLS_149;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-right" },
    });
    const __VLS_150 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }));
    const __VLS_152 = __VLS_151({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    let __VLS_154;
    let __VLS_155;
    let __VLS_156;
    const __VLS_157 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.selectedDashboard))
                return;
            if (!(__VLS_ctx.selectedScreenTemplate))
                return;
            __VLS_ctx.previewScreen(__VLS_ctx.selectedScreenTemplate);
        }
    };
    __VLS_153.slots.default;
    var __VLS_153;
    const __VLS_158 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }));
    const __VLS_160 = __VLS_159({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_159));
    let __VLS_162;
    let __VLS_163;
    let __VLS_164;
    const __VLS_165 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.selectedDashboard))
                return;
            if (!(__VLS_ctx.selectedScreenTemplate))
                return;
            __VLS_ctx.useScreenTemplate(__VLS_ctx.selectedScreenTemplate);
        }
    };
    __VLS_161.slots.default;
    var __VLS_161;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-preview" },
    });
    if (__VLS_ctx.getCoverUrl(__VLS_ctx.selectedScreenTemplate)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "template-cover" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.getCoverUrl(__VLS_ctx.selectedScreenTemplate)),
            alt: "大屏封面",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "template-label" },
    });
    (__VLS_ctx.selectedScreenTemplate.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-info-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "template-label" },
    });
    (__VLS_ctx.selectedScreenTemplate.createdAt);
}
else if (!__VLS_ctx.loading) {
    const __VLS_166 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
        description: "请在左侧选择仪表板或模板",
        ...{ class: "content-empty" },
    }));
    const __VLS_168 = __VLS_167({
        description: "请在左侧选择仪表板或模板",
        ...{ class: "content-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_167));
}
const __VLS_170 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建仪表板",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_172 = __VLS_171({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建仪表板",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_173.slots.default;
const __VLS_174 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}));
const __VLS_176 = __VLS_175({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
__VLS_177.slots.default;
const __VLS_178 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    label: "名称",
}));
const __VLS_180 = __VLS_179({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
__VLS_181.slots.default;
const __VLS_182 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入仪表板名称",
    maxlength: "50",
    showWordLimit: true,
}));
const __VLS_184 = __VLS_183({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入仪表板名称",
    maxlength: "50",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
var __VLS_181;
var __VLS_177;
{
    const { footer: __VLS_thisSlot } = __VLS_173.slots;
    const __VLS_186 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
        ...{ 'onClick': {} },
    }));
    const __VLS_188 = __VLS_187({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_187));
    let __VLS_190;
    let __VLS_191;
    let __VLS_192;
    const __VLS_193 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createVisible = false;
        }
    };
    __VLS_189.slots.default;
    var __VLS_189;
    const __VLS_194 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_196 = __VLS_195({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_195));
    let __VLS_198;
    let __VLS_199;
    let __VLS_200;
    const __VLS_201 = {
        onClick: (__VLS_ctx.handleCreate)
    };
    __VLS_197.slots.default;
    var __VLS_197;
}
var __VLS_173;
/** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-body']} */ ;
/** @type {__VLS_StyleScopedClasses['left-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-search']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-list']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-list']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-list--templates']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item--template']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-pagination--templates']} */ ;
/** @type {__VLS_StyleScopedClasses['collapse-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['right-content']} */ ;
/** @type {__VLS_StyleScopedClasses['content-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-left']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-name']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-star']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-creator']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['content-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['content-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-left']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-name']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-right']} */ ;
/** @type {__VLS_StyleScopedClasses['template-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['template-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['template-info']} */ ;
/** @type {__VLS_StyleScopedClasses['template-info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['template-label']} */ ;
/** @type {__VLS_StyleScopedClasses['template-info-item']} */ ;
/** @type {__VLS_StyleScopedClasses['template-label']} */ ;
/** @type {__VLS_StyleScopedClasses['content-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            Edit: Edit,
            Expand: Expand,
            Fold: Fold,
            FolderOpened: FolderOpened,
            FullScreen: FullScreen,
            Grid: Grid,
            Monitor: Monitor,
            MoreFilled: MoreFilled,
            Plus: Plus,
            Search: Search,
            Share: Share,
            Star: Star,
            View: View,
            TopNavBar: TopNavBar,
            ReportPreviewCanvas: ReportPreviewCanvas,
            dashboardLoading: dashboardLoading,
            templateLoading: templateLoading,
            loading: loading,
            saving: saving,
            publishedDashboards: publishedDashboards,
            screenTemplates: screenTemplates,
            dashboardTotal: dashboardTotal,
            templateTotal: templateTotal,
            createVisible: createVisible,
            keyword: keyword,
            sidebarCollapsed: sidebarCollapsed,
            selectedId: selectedId,
            selectedTemplateId: selectedTemplateId,
            dashboardPage: dashboardPage,
            templatePage: templatePage,
            dashboardPageSize: dashboardPageSize,
            templatePageSize: templatePageSize,
            form: form,
            getCoverUrl: getCoverUrl,
            selectedDashboard: selectedDashboard,
            selectedScreenTemplate: selectedScreenTemplate,
            selectDashboard: selectDashboard,
            selectScreenTemplate: selectScreenTemplate,
            openCreate: openCreate,
            handleCreate: handleCreate,
            useScreenTemplate: useScreenTemplate,
            previewScreen: previewScreen,
            openEditor: openEditor,
            openPreview: openPreview,
            openFullscreen: openFullscreen,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
