import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Monitor, Plus } from '@element-plus/icons-vue';
import TopNavBar from '../components/TopNavBar.vue';
import { createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, } from '../api/dashboard';
import { buildReportConfig, normalizeCanvasConfig, normalizeCoverConfig, normalizePublishConfig, parseReportConfig, } from '../utils/report-config';
const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const rawScreens = ref([]);
const countMap = ref(new Map());
const createVisible = ref(false);
const keyword = ref('');
const statusFilter = ref('ALL');
const form = reactive({ name: '' });
const screenScene = (screen) => parseReportConfig(screen.configJson).scene === 'screen';
const publishState = (screen) => {
    const cfg = parseReportConfig(screen.configJson);
    return normalizePublishConfig(cfg.publish).status;
};
const coverUrl = (screen) => {
    const cfg = parseReportConfig(screen.configJson);
    return normalizeCoverConfig(cfg.cover).url;
};
const canvasLabel = (screen) => {
    const cfg = parseReportConfig(screen.configJson);
    const canvas = normalizeCanvasConfig(cfg.canvas, 'screen');
    return `${canvas.width} × ${canvas.height}`;
};
const sortByCreatedAt = (list) => [...list].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
});
const allScreens = computed(() => sortByCreatedAt(rawScreens.value.filter((item) => screenScene(item))));
const screens = computed(() => allScreens.value.filter((screen) => {
    const nameMatched = !keyword.value.trim() || screen.name.toLowerCase().includes(keyword.value.trim().toLowerCase());
    const statusMatched = statusFilter.value === 'ALL' || publishState(screen) === statusFilter.value;
    return nameMatched && statusMatched;
}));
const publishedCount = computed(() => allScreens.value.filter((screen) => publishState(screen) === 'PUBLISHED').length);
const coverReadyCount = computed(() => allScreens.value.filter((screen) => Boolean(coverUrl(screen))).length);
const formatDate = (iso) => {
    if (!iso)
        return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return iso;
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};
const loadScreens = async () => {
    loading.value = true;
    try {
        const list = await getDashboardList();
        rawScreens.value = list;
        const entries = await Promise.all(list.filter((item) => screenScene(item)).map(async (screen) => [screen.id, (await getDashboardComponents(screen.id)).length]));
        countMap.value = new Map(entries);
    }
    finally {
        loading.value = false;
    }
};
const openCreate = () => {
    form.name = '';
    createVisible.value = true;
};
const handleCreate = async () => {
    if (!form.name.trim()) {
        ElMessage.warning('请输入大屏名称');
        return;
    }
    saving.value = true;
    try {
        const screen = await createDashboard({ name: form.name.trim(), configJson: buildReportConfig(null, 'screen') });
        createVisible.value = false;
        ElMessage.success('创建成功，即将跳转到编辑页面');
        router.push(`/home/screen/edit/${screen.id}`);
    }
    finally {
        saving.value = false;
    }
};
const openEditor = (id) => {
    router.push(`/home/screen/edit/${id}`);
};
const openPreview = (id) => {
    window.open(`/preview/screen/${id}`, '_blank');
};
const handleDelete = async (id) => {
    await deleteDashboard(id);
    rawScreens.value = rawScreens.value.filter((screen) => screen.id !== id);
    countMap.value.delete(id);
    ElMessage.success('已删除');
};
onMounted(loadScreens);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hero-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-time']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-search']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-wrap" },
});
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "screen",
}));
const __VLS_1 = __VLS_0({
    active: "screen",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "page-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "hero-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.allScreens.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.publishedCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.coverReadyCount);
const __VLS_3 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
}));
const __VLS_5 = __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_6.slots.default;
var __VLS_6;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "toolbar-panel" },
});
const __VLS_11 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索大屏名称",
    clearable: true,
    ...{ class: "toolbar-search" },
}));
const __VLS_13 = __VLS_12({
    modelValue: (__VLS_ctx.keyword),
    placeholder: "搜索大屏名称",
    clearable: true,
    ...{ class: "toolbar-search" },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
const __VLS_15 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    modelValue: (__VLS_ctx.statusFilter),
    ...{ class: "toolbar-select" },
}));
const __VLS_17 = __VLS_16({
    modelValue: (__VLS_ctx.statusFilter),
    ...{ class: "toolbar-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
const __VLS_19 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    label: "全部状态",
    value: "ALL",
}));
const __VLS_21 = __VLS_20({
    label: "全部状态",
    value: "ALL",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const __VLS_23 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    label: "已发布",
    value: "PUBLISHED",
}));
const __VLS_25 = __VLS_24({
    label: "已发布",
    value: "PUBLISHED",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
const __VLS_27 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    label: "草稿",
    value: "DRAFT",
}));
const __VLS_29 = __VLS_28({
    label: "草稿",
    value: "DRAFT",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
var __VLS_18;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "screen-grid" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.screens))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openEditor(screen.id);
            } },
        key: (screen.id),
        ...{ class: "screen-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-thumb" },
    });
    if (__VLS_ctx.coverUrl(screen)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.coverUrl(screen)),
            alt: "大屏封面",
            ...{ class: "screen-card-image" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-thumb-empty" },
        });
        const __VLS_31 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            ...{ class: "thumb-icon" },
        }));
        const __VLS_33 = __VLS_32({
            ...{ class: "thumb-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_34.slots.default;
        const __VLS_35 = {}.Monitor;
        /** @type {[typeof __VLS_components.Monitor, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({}));
        const __VLS_37 = __VLS_36({}, ...__VLS_functionalComponentArgsRest(__VLS_36));
        var __VLS_34;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-status" },
    });
    const __VLS_39 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        size: "small",
        type: (__VLS_ctx.publishState(screen) === 'PUBLISHED' ? 'success' : 'info'),
    }));
    const __VLS_41 = __VLS_40({
        size: "small",
        type: (__VLS_ctx.publishState(screen) === 'PUBLISHED' ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    __VLS_42.slots.default;
    (__VLS_ctx.publishState(screen) === 'PUBLISHED' ? '已发布' : '草稿');
    var __VLS_42;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-name" },
    });
    (screen.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-time" },
    });
    (__VLS_ctx.formatDate(screen.createdAt));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-canvas" },
    });
    (__VLS_ctx.canvasLabel(screen));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.countMap.get(screen.id) ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.coverUrl(screen) ? '已配置封面' : '待生成封面');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: () => { } },
        ...{ class: "screen-card-actions" },
    });
    const __VLS_43 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
    }));
    const __VLS_45 = __VLS_44({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    let __VLS_47;
    let __VLS_48;
    let __VLS_49;
    const __VLS_50 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditor(screen.id);
        }
    };
    __VLS_46.slots.default;
    var __VLS_46;
    const __VLS_51 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        ...{ 'onClick': {} },
        size: "small",
        plain: true,
    }));
    const __VLS_53 = __VLS_52({
        ...{ 'onClick': {} },
        size: "small",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    let __VLS_55;
    let __VLS_56;
    let __VLS_57;
    const __VLS_58 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openPreview(screen.id);
        }
    };
    __VLS_54.slots.default;
    var __VLS_54;
    const __VLS_59 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        ...{ 'onConfirm': {} },
        title: "确认删除此大屏？",
    }));
    const __VLS_61 = __VLS_60({
        ...{ 'onConfirm': {} },
        title: "确认删除此大屏？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    let __VLS_63;
    let __VLS_64;
    let __VLS_65;
    const __VLS_66 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDelete(screen.id);
        }
    };
    __VLS_62.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_62.slots;
        const __VLS_67 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            size: "small",
            type: "danger",
            plain: true,
        }));
        const __VLS_69 = __VLS_68({
            size: "small",
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        __VLS_70.slots.default;
        var __VLS_70;
    }
    var __VLS_62;
}
if (!__VLS_ctx.loading && !__VLS_ctx.screens.length) {
    const __VLS_71 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        description: "暂无符合条件的数据大屏，可直接新建或先在编辑器中生成封面",
        ...{ class: "empty-state" },
    }));
    const __VLS_73 = __VLS_72({
        description: "暂无符合条件的数据大屏，可直接新建或先在编辑器中生成封面",
        ...{ class: "empty-state" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
}
const __VLS_75 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_77 = __VLS_76({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
__VLS_78.slots.default;
const __VLS_79 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}));
const __VLS_81 = __VLS_80({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
__VLS_82.slots.default;
const __VLS_83 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    label: "名称",
}));
const __VLS_85 = __VLS_84({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
__VLS_86.slots.default;
const __VLS_87 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入大屏名称",
    maxlength: "50",
    showWordLimit: true,
}));
const __VLS_89 = __VLS_88({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入大屏名称",
    maxlength: "50",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_88));
var __VLS_86;
var __VLS_82;
{
    const { footer: __VLS_thisSlot } = __VLS_78.slots;
    const __VLS_91 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        ...{ 'onClick': {} },
    }));
    const __VLS_93 = __VLS_92({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    let __VLS_95;
    let __VLS_96;
    let __VLS_97;
    const __VLS_98 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createVisible = false;
        }
    };
    __VLS_94.slots.default;
    var __VLS_94;
    const __VLS_99 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_101 = __VLS_100({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    let __VLS_103;
    let __VLS_104;
    let __VLS_105;
    const __VLS_106 = {
        onClick: (__VLS_ctx.handleCreate)
    };
    __VLS_102.slots.default;
    var __VLS_102;
}
var __VLS_78;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-search']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-image']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-thumb-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['thumb-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-status']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-time']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Monitor: Monitor,
            Plus: Plus,
            TopNavBar: TopNavBar,
            loading: loading,
            saving: saving,
            countMap: countMap,
            createVisible: createVisible,
            keyword: keyword,
            statusFilter: statusFilter,
            form: form,
            publishState: publishState,
            coverUrl: coverUrl,
            canvasLabel: canvasLabel,
            allScreens: allScreens,
            screens: screens,
            publishedCount: publishedCount,
            coverReadyCount: coverReadyCount,
            formatDate: formatDate,
            openCreate: openCreate,
            handleCreate: handleCreate,
            openEditor: openEditor,
            openPreview: openPreview,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
