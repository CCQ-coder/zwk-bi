import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import TopNavBar from '../components/TopNavBar.vue';
import request from '../api/request';
import { createUser, deleteUser, getUserList, updateUser } from '../api/user';
const activeTab = ref('users');
const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref('');
const userRoleFilter = ref('ALL');
const userDialogVisible = ref(false);
const userSaving = ref(false);
const editId = ref(null);
const userFormRef = ref();
const userForm = reactive({ username: '', displayName: '', role: 'ANALYST', email: '', password: '' });
const userRules = {
    username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
    displayName: [{ required: true, message: '显示名不能为空', trigger: 'blur' }],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }]
};
const loadUsers = async () => {
    usersLoading.value = true;
    try {
        users.value = await getUserList();
    }
    catch {
        users.value = [];
    }
    finally {
        usersLoading.value = false;
    }
};
const filteredUsers = computed(() => users.value.filter((u) => {
    const byRole = userRoleFilter.value === 'ALL' || u.role === userRoleFilter.value;
    const q = userSearch.value.trim();
    const byKeyword = !q || u.username.includes(q) || u.displayName.includes(q);
    return byRole && byKeyword;
}));
const openCreate = () => {
    editId.value = null;
    Object.assign(userForm, { username: '', displayName: '', role: 'ANALYST', email: '', password: '' });
    userDialogVisible.value = true;
};
const openEdit = (row) => {
    editId.value = row.id;
    Object.assign(userForm, { username: row.username, displayName: row.displayName, role: row.role, email: row.email, password: '' });
    userDialogVisible.value = true;
};
const handleUserSubmit = async () => {
    await userFormRef.value?.validate();
    userSaving.value = true;
    try {
        if (editId.value) {
            await updateUser(editId.value, userForm);
            ElMessage.success('更新成功');
        }
        else {
            await createUser(userForm);
            ElMessage.success('创建成功');
        }
        userDialogVisible.value = false;
        await loadUsers();
    }
    finally {
        userSaving.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteUser(id);
    ElMessage.success('删除成功');
    await loadUsers();
};
const roleLabel = (r) => ({ ADMIN: '管理员', ANALYST: '分析师', VIEWER: '查看者' }[r] ?? r);
const roleTagType = (r) => ({ ADMIN: 'danger', ANALYST: 'warning', VIEWER: 'info' }[r] ?? '');
const logs = ref([]);
const logsLoading = ref(false);
const logSearch = ref('');
const loginLogs = ref([]);
const loginLogsLoading = ref(false);
const loginLogSearch = ref('');
const loginActionFilter = ref('ALL');
const filteredLogs = computed(() => logs.value.filter(l => !logSearch.value ||
    (l.username ?? '').includes(logSearch.value) ||
    (l.action ?? '').includes(logSearch.value)));
const loadLogs = async () => {
    logsLoading.value = true;
    try {
        logs.value = await request.get('/audit-logs');
    }
    catch {
        logs.value = [];
    }
    finally {
        logsLoading.value = false;
    }
};
const loadLoginLogs = async () => {
    loginLogsLoading.value = true;
    try {
        loginLogs.value = await request.get('/audit-logs/login');
    }
    catch {
        loginLogs.value = [];
    }
    finally {
        loginLogsLoading.value = false;
    }
};
const filteredLoginLogs = computed(() => loginLogs.value.filter((l) => {
    const q = loginLogSearch.value.trim();
    const byName = !q || (l.username ?? '').includes(q);
    const byAction = loginActionFilter.value === 'ALL' || l.action === loginActionFilter.value;
    return byName && byAction;
}));
const actionTagType = (action) => {
    if (!action)
        return '';
    const a = action.toUpperCase();
    if (a.includes('DELETE'))
        return 'danger';
    if (a.includes('CREATE') || a.includes('INSERT'))
        return 'success';
    if (a.includes('UPDATE'))
        return 'warning';
    return 'info';
};
// ─── 系统监控 ─────────────────────────────────────────────────────────────────
const health = ref({ status: '', service: '' });
const loadHealth = async () => {
    try {
        const r = await request.get('/health');
        health.value = { status: r.status ?? '未知', service: r.service ?? '未知' };
    }
    catch { /* ignore */ }
};
onMounted(() => {
    loadUsers();
    loadLogs();
    loadLoginLogs();
    loadHealth();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-wrap" },
});
/** @type {[typeof TopNavBar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(TopNavBar, new TopNavBar({
    active: "system",
}));
const __VLS_1 = __VLS_0({
    active: "system",
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "page-main" },
});
const __VLS_3 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    modelValue: (__VLS_ctx.activeTab),
    type: "border-card",
    ...{ class: "system-tabs" },
}));
const __VLS_5 = __VLS_4({
    modelValue: (__VLS_ctx.activeTab),
    type: "border-card",
    ...{ class: "system-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
const __VLS_7 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    label: "用户管理",
    name: "users",
}));
const __VLS_9 = __VLS_8({
    label: "用户管理",
    name: "users",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tab-title" },
});
const __VLS_11 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    modelValue: (__VLS_ctx.userSearch),
    placeholder: "搜索用户名/显示名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_13 = __VLS_12({
    modelValue: (__VLS_ctx.userSearch),
    placeholder: "搜索用户名/显示名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
const __VLS_15 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    modelValue: (__VLS_ctx.userRoleFilter),
    size: "small",
    ...{ style: {} },
}));
const __VLS_17 = __VLS_16({
    modelValue: (__VLS_ctx.userRoleFilter),
    size: "small",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
const __VLS_19 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    value: "ALL",
    label: "全部角色",
}));
const __VLS_21 = __VLS_20({
    value: "ALL",
    label: "全部角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const __VLS_23 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    value: "ADMIN",
    label: "管理员",
}));
const __VLS_25 = __VLS_24({
    value: "ADMIN",
    label: "管理员",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
const __VLS_27 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    value: "ANALYST",
    label: "分析师",
}));
const __VLS_29 = __VLS_28({
    value: "ANALYST",
    label: "分析师",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
const __VLS_31 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    value: "VIEWER",
    label: "查看者",
}));
const __VLS_33 = __VLS_32({
    value: "VIEWER",
    label: "查看者",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
var __VLS_18;
const __VLS_35 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}));
const __VLS_37 = __VLS_36({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
let __VLS_39;
let __VLS_40;
let __VLS_41;
const __VLS_42 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_38.slots.default;
var __VLS_38;
const __VLS_43 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    data: (__VLS_ctx.filteredUsers),
    border: true,
    size: "small",
}));
const __VLS_45 = __VLS_44({
    data: (__VLS_ctx.filteredUsers),
    border: true,
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.usersLoading) }, null, null);
__VLS_46.slots.default;
const __VLS_47 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    prop: "id",
    label: "ID",
    width: "60",
}));
const __VLS_49 = __VLS_48({
    prop: "id",
    label: "ID",
    width: "60",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
const __VLS_51 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    prop: "username",
    label: "用户名",
    minWidth: "120",
}));
const __VLS_53 = __VLS_52({
    prop: "username",
    label: "用户名",
    minWidth: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
const __VLS_55 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
    prop: "displayName",
    label: "显示名",
    minWidth: "120",
}));
const __VLS_57 = __VLS_56({
    prop: "displayName",
    label: "显示名",
    minWidth: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
const __VLS_59 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    label: "角色",
    width: "100",
}));
const __VLS_61 = __VLS_60({
    label: "角色",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_62.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_63 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        type: (__VLS_ctx.roleTagType(row.role)),
        size: "small",
    }));
    const __VLS_65 = __VLS_64({
        type: (__VLS_ctx.roleTagType(row.role)),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    __VLS_66.slots.default;
    (__VLS_ctx.roleLabel(row.role));
    var __VLS_66;
}
var __VLS_62;
const __VLS_67 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    prop: "email",
    label: "邮箱",
    minWidth: "160",
    showOverflowTooltip: true,
}));
const __VLS_69 = __VLS_68({
    prop: "email",
    label: "邮箱",
    minWidth: "160",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
const __VLS_71 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "160",
}));
const __VLS_73 = __VLS_72({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
const __VLS_75 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    label: "操作",
    width: "140",
    fixed: "right",
}));
const __VLS_77 = __VLS_76({
    label: "操作",
    width: "140",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
__VLS_78.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_78.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_79 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_81 = __VLS_80({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    let __VLS_83;
    let __VLS_84;
    let __VLS_85;
    const __VLS_86 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEdit(row);
        }
    };
    __VLS_82.slots.default;
    var __VLS_82;
    const __VLS_87 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        ...{ 'onConfirm': {} },
        title: "确认删除？",
    }));
    const __VLS_89 = __VLS_88({
        ...{ 'onConfirm': {} },
        title: "确认删除？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    let __VLS_91;
    let __VLS_92;
    let __VLS_93;
    const __VLS_94 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDelete(row.id);
        }
    };
    __VLS_90.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_90.slots;
        const __VLS_95 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
            link: true,
            type: "danger",
        }));
        const __VLS_97 = __VLS_96({
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        __VLS_98.slots.default;
        var __VLS_98;
    }
    var __VLS_90;
}
var __VLS_78;
var __VLS_46;
const __VLS_99 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
    modelValue: (__VLS_ctx.userDialogVisible),
    title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
    width: "480px",
    destroyOnClose: true,
}));
const __VLS_101 = __VLS_100({
    modelValue: (__VLS_ctx.userDialogVisible),
    title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
    width: "480px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
__VLS_102.slots.default;
const __VLS_103 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    ref: "userFormRef",
    model: (__VLS_ctx.userForm),
    rules: (__VLS_ctx.userRules),
    labelWidth: "90px",
}));
const __VLS_105 = __VLS_104({
    ref: "userFormRef",
    model: (__VLS_ctx.userForm),
    rules: (__VLS_ctx.userRules),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
/** @type {typeof __VLS_ctx.userFormRef} */ ;
var __VLS_107 = {};
__VLS_106.slots.default;
const __VLS_109 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
    label: "用户名",
    prop: "username",
}));
const __VLS_111 = __VLS_110({
    label: "用户名",
    prop: "username",
}, ...__VLS_functionalComponentArgsRest(__VLS_110));
__VLS_112.slots.default;
const __VLS_113 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
    modelValue: (__VLS_ctx.userForm.username),
    disabled: (!!__VLS_ctx.editId),
    placeholder: "登录用户名",
}));
const __VLS_115 = __VLS_114({
    modelValue: (__VLS_ctx.userForm.username),
    disabled: (!!__VLS_ctx.editId),
    placeholder: "登录用户名",
}, ...__VLS_functionalComponentArgsRest(__VLS_114));
var __VLS_112;
const __VLS_117 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    label: "显示名",
    prop: "displayName",
}));
const __VLS_119 = __VLS_118({
    label: "显示名",
    prop: "displayName",
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
__VLS_120.slots.default;
const __VLS_121 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({
    modelValue: (__VLS_ctx.userForm.displayName),
    placeholder: "显示名称",
}));
const __VLS_123 = __VLS_122({
    modelValue: (__VLS_ctx.userForm.displayName),
    placeholder: "显示名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_122));
var __VLS_120;
const __VLS_125 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    label: "角色",
    prop: "role",
}));
const __VLS_127 = __VLS_126({
    label: "角色",
    prop: "role",
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
__VLS_128.slots.default;
const __VLS_129 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_130 = __VLS_asFunctionalComponent(__VLS_129, new __VLS_129({
    modelValue: (__VLS_ctx.userForm.role),
    ...{ style: {} },
}));
const __VLS_131 = __VLS_130({
    modelValue: (__VLS_ctx.userForm.role),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_130));
__VLS_132.slots.default;
const __VLS_133 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_134 = __VLS_asFunctionalComponent(__VLS_133, new __VLS_133({
    value: "ADMIN",
    label: "管理员",
}));
const __VLS_135 = __VLS_134({
    value: "ADMIN",
    label: "管理员",
}, ...__VLS_functionalComponentArgsRest(__VLS_134));
const __VLS_137 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(__VLS_137, new __VLS_137({
    value: "ANALYST",
    label: "分析师",
}));
const __VLS_139 = __VLS_138({
    value: "ANALYST",
    label: "分析师",
}, ...__VLS_functionalComponentArgsRest(__VLS_138));
const __VLS_141 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({
    value: "VIEWER",
    label: "查看者",
}));
const __VLS_143 = __VLS_142({
    value: "VIEWER",
    label: "查看者",
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
var __VLS_132;
var __VLS_128;
const __VLS_145 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({
    label: "邮箱",
}));
const __VLS_147 = __VLS_146({
    label: "邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
__VLS_148.slots.default;
const __VLS_149 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({
    modelValue: (__VLS_ctx.userForm.email),
    placeholder: "可选",
}));
const __VLS_151 = __VLS_150({
    modelValue: (__VLS_ctx.userForm.email),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_150));
var __VLS_148;
const __VLS_153 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
    label: (__VLS_ctx.editId ? '新密码' : '密码'),
}));
const __VLS_155 = __VLS_154({
    label: (__VLS_ctx.editId ? '新密码' : '密码'),
}, ...__VLS_functionalComponentArgsRest(__VLS_154));
__VLS_156.slots.default;
const __VLS_157 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    modelValue: (__VLS_ctx.userForm.password),
    type: "password",
    showPassword: true,
    placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
}));
const __VLS_159 = __VLS_158({
    modelValue: (__VLS_ctx.userForm.password),
    type: "password",
    showPassword: true,
    placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
var __VLS_156;
var __VLS_106;
{
    const { footer: __VLS_thisSlot } = __VLS_102.slots;
    const __VLS_161 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
        ...{ 'onClick': {} },
    }));
    const __VLS_163 = __VLS_162({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_162));
    let __VLS_165;
    let __VLS_166;
    let __VLS_167;
    const __VLS_168 = {
        onClick: (...[$event]) => {
            __VLS_ctx.userDialogVisible = false;
        }
    };
    __VLS_164.slots.default;
    var __VLS_164;
    const __VLS_169 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.userSaving),
    }));
    const __VLS_171 = __VLS_170({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.userSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_170));
    let __VLS_173;
    let __VLS_174;
    let __VLS_175;
    const __VLS_176 = {
        onClick: (__VLS_ctx.handleUserSubmit)
    };
    __VLS_172.slots.default;
    var __VLS_172;
}
var __VLS_102;
var __VLS_10;
const __VLS_177 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    label: "审计日志",
    name: "audit",
}));
const __VLS_179 = __VLS_178({
    label: "审计日志",
    name: "audit",
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
__VLS_180.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-toolbar" },
});
const __VLS_181 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
    modelValue: (__VLS_ctx.logSearch),
    placeholder: "搜索用户/操作",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_183 = __VLS_182({
    modelValue: (__VLS_ctx.logSearch),
    placeholder: "搜索用户/操作",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
const __VLS_185 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_187 = __VLS_186({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
let __VLS_189;
let __VLS_190;
let __VLS_191;
const __VLS_192 = {
    onClick: (__VLS_ctx.loadLogs)
};
__VLS_188.slots.default;
var __VLS_188;
const __VLS_193 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
    data: (__VLS_ctx.filteredLogs),
    border: true,
    size: "small",
    maxHeight: "520",
}));
const __VLS_195 = __VLS_194({
    data: (__VLS_ctx.filteredLogs),
    border: true,
    size: "small",
    maxHeight: "520",
}, ...__VLS_functionalComponentArgsRest(__VLS_194));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.logsLoading) }, null, null);
__VLS_196.slots.default;
const __VLS_197 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    prop: "createdAt",
    label: "时间",
    width: "165",
}));
const __VLS_199 = __VLS_198({
    prop: "createdAt",
    label: "时间",
    width: "165",
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
const __VLS_201 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    prop: "username",
    label: "用户",
    width: "100",
}));
const __VLS_203 = __VLS_202({
    prop: "username",
    label: "用户",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
const __VLS_205 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    label: "操作",
    width: "120",
}));
const __VLS_207 = __VLS_206({
    label: "操作",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
__VLS_208.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_208.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_209 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
        size: "small",
        type: (__VLS_ctx.actionTagType(row.action)),
    }));
    const __VLS_211 = __VLS_210({
        size: "small",
        type: (__VLS_ctx.actionTagType(row.action)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_210));
    __VLS_212.slots.default;
    (row.action);
    var __VLS_212;
}
var __VLS_208;
const __VLS_213 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    prop: "resourceType",
    label: "资源类型",
    width: "110",
}));
const __VLS_215 = __VLS_214({
    prop: "resourceType",
    label: "资源类型",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
const __VLS_217 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    prop: "resourceId",
    label: "资源ID",
    width: "80",
}));
const __VLS_219 = __VLS_218({
    prop: "resourceId",
    label: "资源ID",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
const __VLS_221 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    prop: "detail",
    label: "详情",
    minWidth: "180",
    showOverflowTooltip: true,
}));
const __VLS_223 = __VLS_222({
    prop: "detail",
    label: "详情",
    minWidth: "180",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
const __VLS_225 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    prop: "ipAddr",
    label: "IP",
    width: "130",
}));
const __VLS_227 = __VLS_226({
    prop: "ipAddr",
    label: "IP",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
var __VLS_196;
if (__VLS_ctx.filteredLogs.length === 0 && !__VLS_ctx.logsLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
var __VLS_180;
const __VLS_229 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    label: "登录日志",
    name: "loginLogs",
}));
const __VLS_231 = __VLS_230({
    label: "登录日志",
    name: "loginLogs",
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
__VLS_232.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
const __VLS_233 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    modelValue: (__VLS_ctx.loginLogSearch),
    placeholder: "搜索登录用户名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_235 = __VLS_234({
    modelValue: (__VLS_ctx.loginLogSearch),
    placeholder: "搜索登录用户名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
const __VLS_237 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    modelValue: (__VLS_ctx.loginActionFilter),
    size: "small",
    ...{ style: {} },
}));
const __VLS_239 = __VLS_238({
    modelValue: (__VLS_ctx.loginActionFilter),
    size: "small",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
__VLS_240.slots.default;
const __VLS_241 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    value: "ALL",
    label: "全部",
}));
const __VLS_243 = __VLS_242({
    value: "ALL",
    label: "全部",
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
const __VLS_245 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    value: "LOGIN_SUCCESS",
    label: "登录成功",
}));
const __VLS_247 = __VLS_246({
    value: "LOGIN_SUCCESS",
    label: "登录成功",
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
const __VLS_249 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    value: "LOGIN_FAIL",
    label: "登录失败",
}));
const __VLS_251 = __VLS_250({
    value: "LOGIN_FAIL",
    label: "登录失败",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
var __VLS_240;
const __VLS_253 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_255 = __VLS_254({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_254));
let __VLS_257;
let __VLS_258;
let __VLS_259;
const __VLS_260 = {
    onClick: (__VLS_ctx.loadLoginLogs)
};
__VLS_256.slots.default;
var __VLS_256;
const __VLS_261 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
    data: (__VLS_ctx.filteredLoginLogs),
    border: true,
    size: "small",
    maxHeight: "520",
}));
const __VLS_263 = __VLS_262({
    data: (__VLS_ctx.filteredLoginLogs),
    border: true,
    size: "small",
    maxHeight: "520",
}, ...__VLS_functionalComponentArgsRest(__VLS_262));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loginLogsLoading) }, null, null);
__VLS_264.slots.default;
const __VLS_265 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    prop: "createdAt",
    label: "时间",
    width: "170",
}));
const __VLS_267 = __VLS_266({
    prop: "createdAt",
    label: "时间",
    width: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
const __VLS_269 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
    prop: "username",
    label: "用户名",
    width: "140",
}));
const __VLS_271 = __VLS_270({
    prop: "username",
    label: "用户名",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_270));
const __VLS_273 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    label: "结果",
    width: "110",
}));
const __VLS_275 = __VLS_274({
    label: "结果",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
__VLS_276.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_276.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_277 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
        size: "small",
        type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
    }));
    const __VLS_279 = __VLS_278({
        size: "small",
        type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_278));
    __VLS_280.slots.default;
    (row.action === 'LOGIN_SUCCESS' ? '成功' : '失败');
    var __VLS_280;
}
var __VLS_276;
const __VLS_281 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    prop: "detail",
    label: "详情",
    minWidth: "220",
    showOverflowTooltip: true,
}));
const __VLS_283 = __VLS_282({
    prop: "detail",
    label: "详情",
    minWidth: "220",
    showOverflowTooltip: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
const __VLS_285 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    prop: "ipAddr",
    label: "IP",
    width: "140",
}));
const __VLS_287 = __VLS_286({
    prop: "ipAddr",
    label: "IP",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
var __VLS_264;
if (__VLS_ctx.filteredLoginLogs.length === 0 && !__VLS_ctx.loginLogsLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
}
var __VLS_232;
const __VLS_289 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
    label: "系统监控",
    name: "monitor",
}));
const __VLS_291 = __VLS_290({
    label: "系统监控",
    name: "monitor",
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
__VLS_292.slots.default;
const __VLS_293 = {}.ElDescriptions;
/** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
    title: "系统健康状态",
    border: true,
    column: (2),
    size: "small",
    ...{ style: {} },
}));
const __VLS_295 = __VLS_294({
    title: "系统健康状态",
    border: true,
    column: (2),
    size: "small",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
__VLS_296.slots.default;
const __VLS_297 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    label: "服务状态",
}));
const __VLS_299 = __VLS_298({
    label: "服务状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
__VLS_300.slots.default;
const __VLS_301 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
}));
const __VLS_303 = __VLS_302({
    type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
__VLS_304.slots.default;
(__VLS_ctx.health.status || '未知');
var __VLS_304;
var __VLS_300;
const __VLS_305 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    label: "服务名",
}));
const __VLS_307 = __VLS_306({
    label: "服务名",
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
(__VLS_ctx.health.service || '未知');
var __VLS_308;
var __VLS_296;
const __VLS_309 = {}.ElDescriptions;
/** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    title: "版本信息",
    border: true,
    column: (2),
    size: "small",
    ...{ style: {} },
}));
const __VLS_311 = __VLS_310({
    title: "版本信息",
    border: true,
    column: (2),
    size: "small",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
__VLS_312.slots.default;
const __VLS_313 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    label: "前端框架",
}));
const __VLS_315 = __VLS_314({
    label: "前端框架",
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
__VLS_316.slots.default;
var __VLS_316;
const __VLS_317 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
    label: "后端框架",
}));
const __VLS_319 = __VLS_318({
    label: "后端框架",
}, ...__VLS_functionalComponentArgsRest(__VLS_318));
__VLS_320.slots.default;
var __VLS_320;
const __VLS_321 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    label: "数据库",
}));
const __VLS_323 = __VLS_322({
    label: "数据库",
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
__VLS_324.slots.default;
var __VLS_324;
const __VLS_325 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    label: "数据同步",
}));
const __VLS_327 = __VLS_326({
    label: "数据同步",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
__VLS_328.slots.default;
var __VLS_328;
var __VLS_312;
const __VLS_329 = {}.ElDescriptions;
/** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
// @ts-ignore
const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
    title: "功能路线图",
    border: true,
    column: (1),
    size: "small",
}));
const __VLS_331 = __VLS_330({
    title: "功能路线图",
    border: true,
    column: (1),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_330));
__VLS_332.slots.default;
const __VLS_333 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    label: "RBAC 权限",
}));
const __VLS_335 = __VLS_334({
    label: "RBAC 权限",
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
__VLS_336.slots.default;
var __VLS_336;
const __VLS_337 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
    label: "行级安全",
}));
const __VLS_339 = __VLS_338({
    label: "行级安全",
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
__VLS_340.slots.default;
var __VLS_340;
const __VLS_341 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
    label: "定时任务",
}));
const __VLS_343 = __VLS_342({
    label: "定时任务",
}, ...__VLS_functionalComponentArgsRest(__VLS_342));
__VLS_344.slots.default;
var __VLS_344;
const __VLS_345 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
    label: "导出分享",
}));
const __VLS_347 = __VLS_346({
    label: "导出分享",
}, ...__VLS_functionalComponentArgsRest(__VLS_346));
__VLS_348.slots.default;
var __VLS_348;
const __VLS_349 = {}.ElDescriptionsItem;
/** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
// @ts-ignore
const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
    label: "告警通知",
}));
const __VLS_351 = __VLS_350({
    label: "告警通知",
}, ...__VLS_functionalComponentArgsRest(__VLS_350));
__VLS_352.slots.default;
var __VLS_352;
var __VLS_332;
var __VLS_292;
var __VLS_6;
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['system-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
// @ts-ignore
var __VLS_108 = __VLS_107;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            activeTab: activeTab,
            usersLoading: usersLoading,
            userSearch: userSearch,
            userRoleFilter: userRoleFilter,
            userDialogVisible: userDialogVisible,
            userSaving: userSaving,
            editId: editId,
            userFormRef: userFormRef,
            userForm: userForm,
            userRules: userRules,
            filteredUsers: filteredUsers,
            openCreate: openCreate,
            openEdit: openEdit,
            handleUserSubmit: handleUserSubmit,
            handleDelete: handleDelete,
            roleLabel: roleLabel,
            roleTagType: roleTagType,
            logsLoading: logsLoading,
            logSearch: logSearch,
            loginLogsLoading: loginLogsLoading,
            loginLogSearch: loginLogSearch,
            loginActionFilter: loginActionFilter,
            filteredLogs: filteredLogs,
            loadLogs: loadLogs,
            loadLoginLogs: loadLoginLogs,
            filteredLoginLogs: filteredLoginLogs,
            actionTagType: actionTagType,
            health: health,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
