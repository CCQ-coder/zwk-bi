/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CollectionTag, FolderOpened, Plus, Search, Tickets } from '@element-plus/icons-vue';
import { createPublishGroup, deletePublishGroup, getManagePublishGroups, getPublishedScreenOptions, updatePublishGroup, updatePublishGroupScreens, } from '../api/publish';
const loading = ref(false);
const groupSaving = ref(false);
const assignmentSaving = ref(false);
const groups = ref([]);
const screenOptions = ref([]);
const groupKeyword = ref('');
const screenKeyword = ref('');
const selectedGroupId = ref(null);
const creating = ref(false);
const assignedScreenIds = ref([]);
const listPanelWidth = ref(296);
let stopListPanelResize = null;
const groupForm = reactive({
    name: '',
    description: '',
    sort: 100,
    visible: true,
});
const selectedGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? null);
const persistedGroupId = computed(() => creating.value ? null : selectedGroup.value?.id ?? null);
const filteredGroups = computed(() => {
    const keyword = groupKeyword.value.trim().toLowerCase();
    if (!keyword) {
        return groups.value;
    }
    return groups.value.filter((group) => {
        return group.name.toLowerCase().includes(keyword)
            || group.description.toLowerCase().includes(keyword);
    });
});
const filteredScreenOptions = computed(() => {
    const keyword = screenKeyword.value.trim().toLowerCase();
    const list = [...screenOptions.value].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
    if (!keyword) {
        return list;
    }
    return list.filter((screen) => screen.name.toLowerCase().includes(keyword));
});
const screenOptionMap = computed(() => {
    const map = new Map();
    screenOptions.value.forEach((screen) => map.set(screen.id, screen));
    return map;
});
const previewScreens = computed(() => {
    if (!persistedGroupId.value) {
        return assignedScreenIds.value.map((id) => screenOptionMap.value.get(id)).filter(Boolean);
    }
    return assignedScreenIds.value.map((id) => screenOptionMap.value.get(id)).filter(Boolean);
});
const movingScreenCount = computed(() => assignedScreenIds.value.filter((id) => {
    const screen = screenOptionMap.value.get(id);
    return Boolean(screen?.groupId && screen.groupId !== persistedGroupId.value);
}).length);
const listPanelStyle = computed(() => ({ width: `${listPanelWidth.value}px` }));
const startListPanelResize = (event) => {
    if (window.innerWidth <= 960) {
        return;
    }
    const startX = event.clientX;
    const startWidth = listPanelWidth.value;
    const handleMouseMove = (moveEvent) => {
        const nextWidth = startWidth + (moveEvent.clientX - startX);
        listPanelWidth.value = Math.min(360, Math.max(256, nextWidth));
    };
    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        stopListPanelResize = null;
    };
    stopListPanelResize = handleMouseUp;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};
const applyGroup = (group) => {
    if (!group) {
        groupForm.name = '';
        groupForm.description = '';
        groupForm.sort = 100;
        groupForm.visible = true;
        assignedScreenIds.value = [];
        return;
    }
    groupForm.name = group.name;
    groupForm.description = group.description || '';
    groupForm.sort = group.sort ?? 100;
    groupForm.visible = group.visible !== false;
    assignedScreenIds.value = group.screens.map((screen) => screen.id);
};
const selectGroup = (groupId) => {
    creating.value = false;
    selectedGroupId.value = groupId;
    applyGroup(groups.value.find((group) => group.id === groupId) ?? null);
};
const startCreate = () => {
    creating.value = true;
    selectedGroupId.value = null;
    applyGroup(null);
};
const restoreAssignments = () => {
    assignedScreenIds.value = selectedGroup.value?.screens.map((screen) => screen.id) ?? [];
};
const resetEditor = () => {
    if (creating.value) {
        applyGroup(null);
        return;
    }
    applyGroup(selectedGroup.value);
};
const toggleScreen = (screenId) => {
    if (!persistedGroupId.value) {
        return;
    }
    assignedScreenIds.value = assignedScreenIds.value.includes(screenId)
        ? assignedScreenIds.value.filter((id) => id !== screenId)
        : [...assignedScreenIds.value, screenId];
};
const loadData = async (preferredGroupId) => {
    loading.value = true;
    try {
        const [groupList, screens] = await Promise.all([
            getManagePublishGroups(),
            getPublishedScreenOptions(),
        ]);
        groups.value = groupList;
        screenOptions.value = screens;
        if (preferredGroupId && groupList.some((group) => group.id === preferredGroupId)) {
            selectGroup(preferredGroupId);
            return;
        }
        if (!creating.value && selectedGroupId.value && groupList.some((group) => group.id === selectedGroupId.value)) {
            selectGroup(selectedGroupId.value);
            return;
        }
        if (!creating.value && groupList.length) {
            selectGroup(groupList[0].id);
            return;
        }
        if (!groupList.length) {
            startCreate();
        }
    }
    finally {
        loading.value = false;
    }
};
const saveGroup = async () => {
    const payload = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        sort: Number(groupForm.sort || 100),
        visible: groupForm.visible,
    };
    if (!payload.name) {
        ElMessage.warning('请输入分组名称');
        return;
    }
    groupSaving.value = true;
    try {
        const saved = persistedGroupId.value
            ? await updatePublishGroup(persistedGroupId.value, payload)
            : await createPublishGroup(payload);
        creating.value = false;
        ElMessage.success(persistedGroupId.value ? '分组已更新' : '分组已创建');
        await loadData(saved.id);
    }
    catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '分组保存失败');
    }
    finally {
        groupSaving.value = false;
    }
};
const saveAssignments = async () => {
    if (!persistedGroupId.value) {
        ElMessage.warning('请先保存分组');
        return;
    }
    assignmentSaving.value = true;
    try {
        await updatePublishGroupScreens(persistedGroupId.value, assignedScreenIds.value);
        ElMessage.success('分组大屏分配已更新');
        await loadData(persistedGroupId.value);
    }
    catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '分配保存失败');
    }
    finally {
        assignmentSaving.value = false;
    }
};
const removeGroup = async () => {
    if (!persistedGroupId.value || !selectedGroup.value) {
        return;
    }
    try {
        await ElMessageBox.confirm(`删除分组“${selectedGroup.value.name}”后，分配关系会一并清空，是否继续？`, '删除分组', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        });
        await deletePublishGroup(persistedGroupId.value);
        ElMessage.success('分组已删除');
        creating.value = false;
        selectedGroupId.value = null;
        await loadData();
    }
    catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error instanceof Error ? error.message : '删除分组失败');
        }
    }
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
onMounted(() => {
    loadData().catch(() => {
        ElMessage.error('发布分组数据加载失败');
    });
});
onBeforeUnmount(() => {
    stopListPanelResize?.();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['group-list-shell__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item__name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card__thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-shell__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-options-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__foot']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-manager" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-list-shell" },
    ...{ style: (__VLS_ctx.listPanelStyle) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "group-list-panel panel-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
    icon: (__VLS_ctx.Plus),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.startCreate)
};
__VLS_3.slots.default;
var __VLS_3;
const __VLS_8 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    modelValue: (__VLS_ctx.groupKeyword),
    prefixIcon: (__VLS_ctx.Search),
    placeholder: "搜索分组名称",
    clearable: true,
    ...{ class: "panel-search" },
}));
const __VLS_10 = __VLS_9({
    modelValue: (__VLS_ctx.groupKeyword),
    prefixIcon: (__VLS_ctx.Search),
    placeholder: "搜索分组名称",
    clearable: true,
    ...{ class: "panel-search" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_12 = {}.ElScrollbar;
/** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: "group-list-scroll" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "group-list-scroll" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-list" },
});
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.filteredGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectGroup(group.id);
            } },
        key: (group.id),
        type: "button",
        ...{ class: "group-item" },
        ...{ class: ({ 'group-item--active': __VLS_ctx.selectedGroupId === group.id && !__VLS_ctx.creating }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "group-item__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "group-item__name" },
    });
    (group.name);
    const __VLS_16 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: "small",
        type: (group.visible ? 'success' : 'info'),
    }));
    const __VLS_18 = __VLS_17({
        size: "small",
        type: (group.visible ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (group.visible ? '显示' : '隐藏');
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "group-item__meta" },
    });
    (group.screenCount);
    (group.sort);
    if (group.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "group-item__desc" },
        });
        (group.description);
    }
}
if (!__VLS_ctx.loading && !__VLS_ctx.filteredGroups.length) {
    const __VLS_20 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        description: "暂无匹配分组",
    }));
    const __VLS_22 = __VLS_21({
        description: "暂无匹配分组",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onMousedown: (__VLS_ctx.startListPanelResize) },
    ...{ class: "group-list-shell__resize" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "group-detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-stack" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-card detail-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head panel-head--detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
(__VLS_ctx.persistedGroupId ? '编辑分组' : '新建分组');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-chip" },
});
(__VLS_ctx.persistedGroupId ? '已存在分组' : '草稿分组');
const __VLS_24 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    model: (__VLS_ctx.groupForm),
    labelPosition: "top",
    ...{ class: "group-form" },
}));
const __VLS_26 = __VLS_25({
    model: (__VLS_ctx.groupForm),
    labelPosition: "top",
    ...{ class: "group-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-form__grid" },
});
const __VLS_28 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "分组名称",
    required: true,
}));
const __VLS_30 = __VLS_29({
    label: "分组名称",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.groupForm.name),
    maxlength: "40",
    showWordLimit: true,
    placeholder: "例如 门店经营 / 区域战报",
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.groupForm.name),
    maxlength: "40",
    showWordLimit: true,
    placeholder: "例如 门店经营 / 区域战报",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
var __VLS_31;
const __VLS_36 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "排序",
}));
const __VLS_38 = __VLS_37({
    label: "排序",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    modelValue: (__VLS_ctx.groupForm.sort),
    min: (1),
    max: (999),
    controlsPosition: "right",
    ...{ style: {} },
}));
const __VLS_42 = __VLS_41({
    modelValue: (__VLS_ctx.groupForm.sort),
    min: (1),
    max: (999),
    controlsPosition: "right",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
var __VLS_39;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "分组描述",
}));
const __VLS_46 = __VLS_45({
    label: "分组描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.groupForm.description),
    type: "textarea",
    rows: (3),
    maxlength: "120",
    showWordLimit: true,
    placeholder: "描述这个分组面向的场景或人群",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.groupForm.description),
    type: "textarea",
    rows: (3),
    maxlength: "120",
    showWordLimit: true,
    placeholder: "描述这个分组面向的场景或人群",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-form__foot" },
});
const __VLS_52 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    modelValue: (__VLS_ctx.groupForm.visible),
    activeText: "展示页可见",
    inactiveText: "展示页隐藏",
}));
const __VLS_54 = __VLS_53({
    modelValue: (__VLS_ctx.groupForm.visible),
    activeText: "展示页可见",
    inactiveText: "展示页隐藏",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-form__actions" },
});
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.resetEditor)
};
__VLS_59.slots.default;
var __VLS_59;
const __VLS_64 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.groupSaving),
}));
const __VLS_66 = __VLS_65({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.groupSaving),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_68;
let __VLS_69;
let __VLS_70;
const __VLS_71 = {
    onClick: (__VLS_ctx.saveGroup)
};
__VLS_67.slots.default;
var __VLS_67;
if (__VLS_ctx.persistedGroupId) {
    const __VLS_72 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        type: "danger",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (__VLS_ctx.removeGroup)
    };
    __VLS_75.slots.default;
    var __VLS_75;
}
var __VLS_27;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-card detail-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head panel-head--detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
const __VLS_80 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    size: "small",
    type: "warning",
}));
const __VLS_82 = __VLS_81({
    size: "small",
    type: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
(__VLS_ctx.assignedScreenIds.length);
var __VLS_83;
if (!__VLS_ctx.persistedGroupId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "placeholder-card" },
    });
    const __VLS_84 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
    const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.CollectionTag;
    /** @type {[typeof __VLS_components.CollectionTag, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
    const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
    var __VLS_87;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-toolbar" },
    });
    const __VLS_92 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        modelValue: (__VLS_ctx.screenKeyword),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "搜索已发布大屏",
        clearable: true,
    }));
    const __VLS_94 = __VLS_93({
        modelValue: (__VLS_ctx.screenKeyword),
        prefixIcon: (__VLS_ctx.Search),
        placeholder: "搜索已发布大屏",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-toolbar__info" },
    });
    if (__VLS_ctx.movingScreenCount) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.movingScreenCount);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    if (!__VLS_ctx.filteredScreenOptions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "placeholder-card placeholder-card--compact" },
        });
        const __VLS_96 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
        const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
        __VLS_99.slots.default;
        const __VLS_100 = {}.Tickets;
        /** @type {[typeof __VLS_components.Tickets, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({}));
        const __VLS_102 = __VLS_101({}, ...__VLS_functionalComponentArgsRest(__VLS_101));
        var __VLS_99;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-options-grid" },
        });
        for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.filteredScreenOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.persistedGroupId))
                            return;
                        if (!!(!__VLS_ctx.filteredScreenOptions.length))
                            return;
                        __VLS_ctx.toggleScreen(screen.id);
                    } },
                key: (screen.id),
                type: "button",
                ...{ class: "screen-option" },
                ...{ class: ({
                        'screen-option--active': __VLS_ctx.assignedScreenIds.includes(screen.id),
                        'screen-option--occupied': screen.groupId && screen.groupId !== __VLS_ctx.persistedGroupId,
                    }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-option__thumb" },
                ...{ style: (screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined) },
            });
            if (!screen.coverUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (screen.name.slice(0, 2));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-option__copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-option__name" },
            });
            (screen.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-option__meta" },
            });
            (__VLS_ctx.formatDate(screen.publishedAt || screen.createdAt) || '发布时间待补充');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "screen-option__tags" },
            });
            if (screen.groupId === __VLS_ctx.persistedGroupId) {
                const __VLS_104 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
                    size: "small",
                    type: "success",
                }));
                const __VLS_106 = __VLS_105({
                    size: "small",
                    type: "success",
                }, ...__VLS_functionalComponentArgsRest(__VLS_105));
                __VLS_107.slots.default;
                var __VLS_107;
            }
            else if (screen.groupId) {
                const __VLS_108 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
                    size: "small",
                    type: "warning",
                }));
                const __VLS_110 = __VLS_109({
                    size: "small",
                    type: "warning",
                }, ...__VLS_functionalComponentArgsRest(__VLS_109));
                __VLS_111.slots.default;
                (screen.groupName);
                var __VLS_111;
            }
            else {
                const __VLS_112 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
                    size: "small",
                    effect: "plain",
                }));
                const __VLS_114 = __VLS_113({
                    size: "small",
                    effect: "plain",
                }, ...__VLS_functionalComponentArgsRest(__VLS_113));
                __VLS_115.slots.default;
                var __VLS_115;
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assignment-actions" },
    });
    const __VLS_116 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_120;
    let __VLS_121;
    let __VLS_122;
    const __VLS_123 = {
        onClick: (__VLS_ctx.restoreAssignments)
    };
    __VLS_119.slots.default;
    var __VLS_119;
    const __VLS_124 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignmentSaving),
    }));
    const __VLS_126 = __VLS_125({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignmentSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    let __VLS_128;
    let __VLS_129;
    let __VLS_130;
    const __VLS_131 = {
        onClick: (__VLS_ctx.saveAssignments)
    };
    __VLS_127.slots.default;
    var __VLS_127;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel-card detail-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head panel-head--detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-title" },
});
if (!__VLS_ctx.previewScreens.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "placeholder-card placeholder-card--compact" },
    });
    const __VLS_132 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
    const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    const __VLS_136 = {}.FolderOpened;
    /** @type {[typeof __VLS_components.FolderOpened, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({}));
    const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
    var __VLS_135;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.persistedGroupId ? '当前分组下还没有已分配大屏。' : '保存分组后可查看当前预览。');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-grid" },
    });
    for (const [screen] of __VLS_getVForSourceType((__VLS_ctx.previewScreens))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (screen.id),
            ...{ class: "preview-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card__thumb" },
            ...{ style: (screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined) },
        });
        if (!screen.coverUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card__copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card__name" },
        });
        (screen.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-card__meta" },
        });
        (__VLS_ctx.formatDate(screen.publishedAt || screen.createdAt) || '时间未记录');
    }
}
/** @type {__VLS_StyleScopedClasses['group-manager']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-search']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item__head']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item__name']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['group-item__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list-shell__resize']} */ ;
/** @type {__VLS_StyleScopedClasses['group-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head--detail']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__foot']} */ ;
/** @type {__VLS_StyleScopedClasses['group-form__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head--detail']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar__info']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-options-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option__thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option__copy']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option__name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-option__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head--detail']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card__thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card__copy']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card__name']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card__meta']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CollectionTag: CollectionTag,
            FolderOpened: FolderOpened,
            Plus: Plus,
            Search: Search,
            Tickets: Tickets,
            loading: loading,
            groupSaving: groupSaving,
            assignmentSaving: assignmentSaving,
            groupKeyword: groupKeyword,
            screenKeyword: screenKeyword,
            selectedGroupId: selectedGroupId,
            creating: creating,
            assignedScreenIds: assignedScreenIds,
            groupForm: groupForm,
            persistedGroupId: persistedGroupId,
            filteredGroups: filteredGroups,
            filteredScreenOptions: filteredScreenOptions,
            previewScreens: previewScreens,
            movingScreenCount: movingScreenCount,
            listPanelStyle: listPanelStyle,
            startListPanelResize: startListPanelResize,
            selectGroup: selectGroup,
            startCreate: startCreate,
            restoreAssignments: restoreAssignments,
            resetEditor: resetEditor,
            toggleScreen: toggleScreen,
            saveGroup: saveGroup,
            saveAssignments: saveAssignments,
            removeGroup: removeGroup,
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
