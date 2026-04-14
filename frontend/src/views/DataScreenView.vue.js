import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Monitor, Plus } from '@element-plus/icons-vue';
import TopNavBar from '../components/TopNavBar.vue';
import { createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, } from '../api/dashboard';
import { buildReportConfig, parseReportConfig } from '../utils/report-config';
const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const screens = ref([]);
const countMap = ref(new Map());
const createVisible = ref(false);
const form = reactive({ name: '' });
const publishState = (screen) => {
    const cfg = parseReportConfig(screen.configJson);
    return cfg?.publish?.status === 'PUBLISHED' ? '已发布' : '草稿';
};
const formatDate = (iso) => {
    if (!iso)
        return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const loadScreens = async () => {
    loading.value = true;
    try {
        const list = await getDashboardList();
        screens.value = list;
        const entries = await Promise.all(list.map(async (s) => [s.id, (await getDashboardComponents(s.id)).length]));
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
    screens.value = screens.value.filter((s) => s.id !== id);
    countMap.value.delete(id);
    ElMessage.success('已删除');
};
onMounted(loadScreens);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['screen-card']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "list-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "list-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "list-title-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "list-subtitle" },
});
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
const __VLS_11 = {}.ElRow;
/** @type {[typeof __VLS_components.ElRow, typeof __VLS_components.elRow, typeof __VLS_components.ElRow, typeof __VLS_components.elRow, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    gutter: (18),
    ...{ class: "screen-grid" },
}));
const __VLS_13 = __VLS_12({
    gutter: (18),
    ...{ class: "screen-grid" },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_14.slots.default;
for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.screens))) {
    const __VLS_15 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        key: (screen.id),
        xs: (24),
        sm: (12),
        md: (8),
        lg: (6),
    }));
    const __VLS_17 = __VLS_16({
        key: (screen.id),
        xs: (24),
        sm: (12),
        md: (8),
        lg: (6),
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_18.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openEditor(screen.id);
            } },
        ...{ class: "screen-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-thumb" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-thumb-inner" },
    });
    const __VLS_19 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        ...{ class: "thumb-icon" },
    }));
    const __VLS_21 = __VLS_20({
        ...{ class: "thumb-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    __VLS_22.slots.default;
    const __VLS_23 = {}.Monitor;
    /** @type {[typeof __VLS_components.Monitor, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({}));
    const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
    var __VLS_22;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-status" },
    });
    const __VLS_27 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        size: "small",
        type: (__VLS_ctx.publishState(screen) === '已发布' ? 'success' : 'info'),
    }));
    const __VLS_29 = __VLS_28({
        size: "small",
        type: (__VLS_ctx.publishState(screen) === '已发布' ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    __VLS_30.slots.default;
    (__VLS_ctx.publishState(screen));
    var __VLS_30;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-name" },
    });
    (screen.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-card-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.countMap.get(screen.id) ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDate(screen.createdAt));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: () => { } },
        ...{ class: "screen-card-actions" },
    });
    const __VLS_31 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
    }));
    const __VLS_33 = __VLS_32({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    let __VLS_35;
    let __VLS_36;
    let __VLS_37;
    const __VLS_38 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditor(screen.id);
        }
    };
    __VLS_34.slots.default;
    var __VLS_34;
    const __VLS_39 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        ...{ 'onClick': {} },
        size: "small",
        plain: true,
    }));
    const __VLS_41 = __VLS_40({
        ...{ 'onClick': {} },
        size: "small",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    let __VLS_43;
    let __VLS_44;
    let __VLS_45;
    const __VLS_46 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openPreview(screen.id);
        }
    };
    __VLS_42.slots.default;
    var __VLS_42;
    const __VLS_47 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        ...{ 'onConfirm': {} },
        title: "确认删除此大屏？",
    }));
    const __VLS_49 = __VLS_48({
        ...{ 'onConfirm': {} },
        title: "确认删除此大屏？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    let __VLS_51;
    let __VLS_52;
    let __VLS_53;
    const __VLS_54 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDelete(screen.id);
        }
    };
    __VLS_50.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_50.slots;
        const __VLS_55 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
            size: "small",
            type: "danger",
            plain: true,
        }));
        const __VLS_57 = __VLS_56({
            size: "small",
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        __VLS_58.slots.default;
        var __VLS_58;
    }
    var __VLS_50;
    var __VLS_18;
}
if (!__VLS_ctx.loading && !__VLS_ctx.screens.length) {
    const __VLS_59 = {}.ElCol;
    /** @type {[typeof __VLS_components.ElCol, typeof __VLS_components.elCol, typeof __VLS_components.ElCol, typeof __VLS_components.elCol, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        span: (24),
    }));
    const __VLS_61 = __VLS_60({
        span: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    __VLS_62.slots.default;
    const __VLS_63 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        description: "暂无数据大屏，点击右上角新建",
        imageSize: (100),
        ...{ style: {} },
    }));
    const __VLS_65 = __VLS_64({
        description: "暂无数据大屏，点击右上角新建",
        imageSize: (100),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    var __VLS_62;
}
var __VLS_14;
const __VLS_67 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_69 = __VLS_68({
    modelValue: (__VLS_ctx.createVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
const __VLS_71 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}));
const __VLS_73 = __VLS_72({
    model: (__VLS_ctx.form),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
__VLS_74.slots.default;
const __VLS_75 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    label: "名称",
}));
const __VLS_77 = __VLS_76({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
__VLS_78.slots.default;
const __VLS_79 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入大屏名称",
    maxlength: "50",
    showWordLimit: true,
}));
const __VLS_81 = __VLS_80({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入大屏名称",
    maxlength: "50",
    showWordLimit: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
var __VLS_78;
var __VLS_74;
{
    const { footer: __VLS_thisSlot } = __VLS_70.slots;
    const __VLS_83 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        ...{ 'onClick': {} },
    }));
    const __VLS_85 = __VLS_84({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    let __VLS_87;
    let __VLS_88;
    let __VLS_89;
    const __VLS_90 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createVisible = false;
        }
    };
    __VLS_86.slots.default;
    var __VLS_86;
    const __VLS_91 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_93 = __VLS_92({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_92));
    let __VLS_95;
    let __VLS_96;
    let __VLS_97;
    const __VLS_98 = {
        onClick: (__VLS_ctx.handleCreate)
    };
    __VLS_94.slots.default;
    var __VLS_94;
}
var __VLS_70;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['list-header']} */ ;
/** @type {__VLS_StyleScopedClasses['list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['list-title-text']} */ ;
/** @type {__VLS_StyleScopedClasses['list-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-thumb-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['thumb-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-status']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-card-actions']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Monitor: Monitor,
            Plus: Plus,
            TopNavBar: TopNavBar,
            loading: loading,
            saving: saving,
            screens: screens,
            countMap: countMap,
            createVisible: createVisible,
            form: form,
            publishState: publishState,
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
