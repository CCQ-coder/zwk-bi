import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import TopNavBar from '../components/TopNavBar.vue';
import request from '../api/request';
import { createMenu, deleteMenu, getCurrentMenus, getMenuTree, updateMenu } from '../api/menu';
import { getRoleList, getRoleMenuIds, updateRoleMenuIds } from '../api/role';
import { createUser, deleteUser, getUserList, updateUser } from '../api/user';
import { saveAuthMenus } from '../utils/auth-session';
const route = useRoute();
const router = useRouter();
const SYSTEM_TABS = [
    { name: 'settings', label: '基础设置', path: '/home/system/settings' },
    { name: 'users', label: '用户管理', path: '/home/system/users' },
    { name: 'roles', label: '角色管理', path: '/home/system/roles' },
    { name: 'menus', label: '菜单权限管理', path: '/home/system/menus' },
    { name: 'audit', label: '审计日志', path: '/home/system/audit' },
    { name: 'loginLogs', label: '登录日志', path: '/home/system/login-logs' },
    { name: 'monitor', label: '系统监控', path: '/home/system/monitor' }
];
const SYSTEM_LABEL_MAP = SYSTEM_TABS.reduce((accumulator, item) => {
    accumulator[item.path] = item.label;
    return accumulator;
}, {});
const treeProps = { children: 'children', label: 'name' };
const activeTab = ref('settings');
const sessionMenus = ref([]);
const findMenuByPath = (menus, path) => {
    for (const item of menus) {
        if (item.path === path) {
            return item;
        }
        const childMatch = findMenuByPath(item.children ?? [], path);
        if (childMatch) {
            return childMatch;
        }
    }
    return undefined;
};
const visibleSystemTabs = computed(() => {
    const systemRoot = findMenuByPath(sessionMenus.value, '/home/system');
    const childPaths = new Set((systemRoot?.children ?? []).map((item) => item.path).filter(Boolean));
    if (!childPaths.size) {
        return SYSTEM_TABS;
    }
    return SYSTEM_TABS.filter((item) => childPaths.has(item.path));
});
const resolveActiveTab = (path) => {
    const matched = SYSTEM_TABS.find((item) => item.path === path);
    if (matched) {
        return matched.name;
    }
    return visibleSystemTabs.value[0]?.name ?? 'settings';
};
watch(() => route.path, (path) => {
    activeTab.value = resolveActiveTab(path);
    if (activeTab.value === 'roles') {
        void applyRoleTreeSelection();
    }
}, { immediate: true });
watch(visibleSystemTabs, (tabs) => {
    if (!tabs.length) {
        return;
    }
    if (!tabs.some((item) => item.name === activeTab.value)) {
        activeTab.value = tabs[0].name;
    }
});
const hasSystemTab = (name) => visibleSystemTabs.value.some((item) => item.name === name);
const handleTabChange = (name) => {
    const target = SYSTEM_TABS.find((item) => item.name === name);
    if (!target) {
        return;
    }
    if (route.path !== target.path) {
        void router.push(target.path);
    }
    if (target.name === 'roles') {
        void applyRoleTreeSelection();
    }
};
const refreshSessionMenus = async () => {
    try {
        const latest = await getCurrentMenus();
        sessionMenus.value = latest;
        saveAuthMenus(latest);
    }
    catch {
        sessionMenus.value = [];
    }
};
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
const roles = ref([]);
const rolesLoading = ref(false);
const roleMenuLoading = ref(false);
const roleMenuSaving = ref(false);
const selectedRoleId = ref(null);
const selectedRoleMenuIds = ref([]);
const roleMenuTreeRef = ref(null);
const menuTree = ref([]);
const menusLoading = ref(false);
const menuDialogVisible = ref(false);
const menuSaving = ref(false);
const editingMenuId = ref(null);
const menuFormRef = ref();
const menuForm = reactive({
    name: '',
    path: '',
    component: '',
    parentId: null,
    type: 'menu',
    permission: '',
    icon: '',
    sort: 100,
    visible: true,
    dashboardId: null
});
const menuRules = {
    name: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }]
};
const logs = ref([]);
const logsLoading = ref(false);
const logSearch = ref('');
const loginLogs = ref([]);
const loginLogsLoading = ref(false);
const loginLogSearch = ref('');
const loginActionFilter = ref('ALL');
const health = ref({ status: '', service: '' });
const roleLabel = (role) => ({ ADMIN: '管理员', ANALYST: '分析师', VIEWER: '查看者' }[role] ?? role);
const roleTagType = (role) => ({ ADMIN: 'danger', ANALYST: 'warning', VIEWER: 'info' }[role] ?? '');
const actionTagType = (action) => {
    if (!action) {
        return '';
    }
    const normalized = action.toUpperCase();
    if (normalized.includes('DELETE')) {
        return 'danger';
    }
    if (normalized.includes('CREATE') || normalized.includes('INSERT')) {
        return 'success';
    }
    if (normalized.includes('UPDATE')) {
        return 'warning';
    }
    return 'info';
};
const flattenMenuTree = (nodes) => nodes.flatMap((node) => [node, ...flattenMenuTree(node.children ?? [])]);
const menuDisplayLabel = (menu) => SYSTEM_LABEL_MAP[menu.path ?? ''] ?? menu.name;
const totalMenuCount = computed(() => flattenMenuTree(menuTree.value).length);
const visibleMenuCount = computed(() => flattenMenuTree(menuTree.value).filter((item) => item.visible !== false).length);
const rootMenuCount = computed(() => menuTree.value.length);
const selectedRole = computed(() => roles.value.find((item) => item.id === selectedRoleId.value) ?? null);
const filteredUsers = computed(() => users.value.filter((user) => {
    const keyword = userSearch.value.trim().toLowerCase();
    const roleMatched = userRoleFilter.value === 'ALL' || user.role === userRoleFilter.value;
    const keywordMatched = !keyword
        || user.username.toLowerCase().includes(keyword)
        || user.displayName.toLowerCase().includes(keyword);
    return roleMatched && keywordMatched;
}));
const filteredLogs = computed(() => {
    const keyword = logSearch.value.trim().toLowerCase();
    return logs.value.filter((log) => !keyword
        || (log.username ?? '').toLowerCase().includes(keyword)
        || (log.action ?? '').toLowerCase().includes(keyword));
});
const filteredLoginLogs = computed(() => {
    const keyword = loginLogSearch.value.trim().toLowerCase();
    return loginLogs.value.filter((log) => {
        const byName = !keyword || (log.username ?? '').toLowerCase().includes(keyword);
        const byAction = loginActionFilter.value === 'ALL' || log.action === loginActionFilter.value;
        return byName && byAction;
    });
});
const collectChildrenIds = (children, bucket) => {
    for (const child of children) {
        bucket.add(child.id);
        collectChildrenIds(child.children ?? [], bucket);
    }
};
const descendantIds = computed(() => {
    const bucket = new Set();
    if (!editingMenuId.value) {
        return bucket;
    }
    const stack = [...menuTree.value];
    while (stack.length) {
        const current = stack.pop();
        if (!current) {
            continue;
        }
        if (current.id === editingMenuId.value) {
            collectChildrenIds(current.children ?? [], bucket);
            break;
        }
        stack.push(...(current.children ?? []));
    }
    return bucket;
});
const parentMenuOptions = computed(() => {
    const walk = (nodes, depth) => nodes.flatMap((node) => {
        const currentLabel = `${'  '.repeat(depth)}${menuDisplayLabel(node)}${node.path ? ` (${node.path})` : ''}`;
        const children = walk(node.children ?? [], depth + 1);
        return [{ id: node.id, label: currentLabel }, ...children];
    });
    return walk(menuTree.value, 0).filter((item) => item.id !== editingMenuId.value && !descendantIds.value.has(item.id));
});
const roleRowClassName = ({ row }) => (row.id === selectedRoleId.value ? 'role-row--active' : '');
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
const loadRoles = async () => {
    rolesLoading.value = true;
    try {
        roles.value = await getRoleList();
    }
    catch {
        roles.value = [];
    }
    finally {
        rolesLoading.value = false;
    }
    if (!roles.value.length) {
        selectedRoleId.value = null;
        selectedRoleMenuIds.value = [];
        return;
    }
    const matchedRole = roles.value.find((item) => item.id === selectedRoleId.value) ?? roles.value[0];
    await handleRoleSelect(matchedRole);
};
const loadMenuTree = async () => {
    menusLoading.value = true;
    try {
        menuTree.value = await getMenuTree();
    }
    catch {
        menuTree.value = [];
    }
    finally {
        menusLoading.value = false;
    }
    await applyRoleTreeSelection();
};
const applyRoleTreeSelection = async () => {
    await nextTick();
    roleMenuTreeRef.value?.setCheckedKeys(selectedRoleMenuIds.value, false);
};
const handleRoleSelect = async (role) => {
    selectedRoleId.value = role.id;
    roleMenuLoading.value = true;
    try {
        selectedRoleMenuIds.value = await getRoleMenuIds(role.id);
    }
    catch {
        selectedRoleMenuIds.value = [];
    }
    finally {
        roleMenuLoading.value = false;
    }
    await applyRoleTreeSelection();
};
const normalizeTreeKeys = (keys) => Array.from(new Set(keys.map((value) => Number(value)).filter((value) => Number.isFinite(value))));
const handleRoleMenuSave = async () => {
    if (!selectedRoleId.value) {
        ElMessage.warning('请先选择角色');
        return;
    }
    roleMenuSaving.value = true;
    try {
        const checkedKeys = normalizeTreeKeys(roleMenuTreeRef.value?.getCheckedKeys(false) ?? []);
        const halfCheckedKeys = normalizeTreeKeys(roleMenuTreeRef.value?.getHalfCheckedKeys() ?? []);
        const mergedKeys = Array.from(new Set([...checkedKeys, ...halfCheckedKeys]));
        selectedRoleMenuIds.value = await updateRoleMenuIds(selectedRoleId.value, mergedKeys);
        await Promise.all([loadRoles(), refreshSessionMenus()]);
        ElMessage.success('角色菜单权限已更新');
    }
    finally {
        roleMenuSaving.value = false;
    }
};
const resetMenuForm = (overrides) => {
    Object.assign(menuForm, {
        name: '',
        path: '',
        component: '',
        parentId: null,
        type: 'menu',
        permission: '',
        icon: '',
        sort: 100,
        visible: true,
        dashboardId: null,
        ...overrides
    });
};
const openCreate = () => {
    editId.value = null;
    Object.assign(userForm, { username: '', displayName: '', role: 'ANALYST', email: '', password: '' });
    userDialogVisible.value = true;
};
const openEdit = (row) => {
    editId.value = row.id;
    Object.assign(userForm, {
        username: row.username,
        displayName: row.displayName,
        role: row.role,
        email: row.email,
        password: ''
    });
    userDialogVisible.value = true;
};
const handleUserSubmit = async () => {
    await userFormRef.value?.validate();
    userSaving.value = true;
    try {
        if (editId.value) {
            await updateUser(editId.value, userForm);
            ElMessage.success('用户已更新');
        }
        else {
            await createUser(userForm);
            ElMessage.success('用户已创建');
        }
        userDialogVisible.value = false;
        await Promise.all([loadUsers(), loadRoles()]);
    }
    finally {
        userSaving.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteUser(id);
    ElMessage.success('用户已删除');
    await Promise.all([loadUsers(), loadRoles()]);
};
const openCreateMenu = (parent) => {
    editingMenuId.value = null;
    resetMenuForm({
        parentId: parent?.id ?? null,
        component: parent?.component ?? '',
        sort: parent?.sort ? parent.sort + 1 : 100
    });
    menuDialogVisible.value = true;
};
const openEditMenu = (menu) => {
    editingMenuId.value = menu.id;
    resetMenuForm({
        name: menu.name,
        path: menu.path,
        component: menu.component,
        parentId: menu.parentId,
        type: menu.type === 'catalog' ? 'catalog' : 'menu',
        permission: menu.permission,
        icon: menu.icon,
        sort: menu.sort,
        visible: menu.visible !== false,
        dashboardId: menu.dashboardId
    });
    menuDialogVisible.value = true;
};
const handleMenuSubmit = async () => {
    await menuFormRef.value?.validate();
    if (menuForm.type === 'menu' && !menuForm.path.trim()) {
        ElMessage.error('菜单类型为 menu 时必须填写路由路径');
        return;
    }
    menuSaving.value = true;
    try {
        const payload = {
            ...menuForm,
            name: menuForm.name.trim(),
            path: menuForm.path.trim(),
            component: menuForm.component.trim(),
            permission: menuForm.permission.trim(),
            icon: menuForm.icon.trim(),
            parentId: menuForm.parentId ?? null,
            sort: menuForm.sort ?? 100,
            visible: menuForm.visible !== false,
            dashboardId: null
        };
        if (editingMenuId.value) {
            await updateMenu(editingMenuId.value, payload);
            ElMessage.success('菜单已更新');
        }
        else {
            await createMenu(payload);
            ElMessage.success('菜单已创建');
        }
        menuDialogVisible.value = false;
        await Promise.all([loadMenuTree(), loadRoles(), refreshSessionMenus()]);
    }
    finally {
        menuSaving.value = false;
    }
};
const handleMenuDelete = async (id) => {
    await deleteMenu(id);
    ElMessage.success('菜单已删除');
    await Promise.all([loadMenuTree(), loadRoles(), refreshSessionMenus()]);
};
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
const loadHealth = async () => {
    try {
        const response = await request.get('/health');
        health.value = { status: response.status ?? '未知', service: response.service ?? '未知' };
    }
    catch {
        health.value = { status: '', service: '' };
    }
};
onMounted(async () => {
    await Promise.all([
        refreshSessionMenus(),
        loadUsers(),
        loadMenuTree(),
        loadLogs(),
        loadLoginLogs(),
        loadHealth()
    ]);
    await loadRoles();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['role-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
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
if (!__VLS_ctx.visibleSystemTabs.length) {
    const __VLS_3 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        description: "当前账号没有系统管理菜单权限",
    }));
    const __VLS_5 = __VLS_4({
        description: "当前账号没有系统管理菜单权限",
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
else {
    const __VLS_7 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onTabChange': {} },
        modelValue: (__VLS_ctx.activeTab),
        type: "border-card",
        ...{ class: "system-tabs" },
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onTabChange': {} },
        modelValue: (__VLS_ctx.activeTab),
        type: "border-card",
        ...{ class: "system-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onTabChange: (__VLS_ctx.handleTabChange)
    };
    __VLS_10.slots.default;
    if (__VLS_ctx.hasSystemTab('settings')) {
        const __VLS_15 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
            label: "基础设置",
            name: "settings",
        }));
        const __VLS_17 = __VLS_16({
            label: "基础设置",
            name: "settings",
        }, ...__VLS_functionalComponentArgsRest(__VLS_16));
        __VLS_18.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overview-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__value" },
        });
        (__VLS_ctx.roles.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__value" },
        });
        (__VLS_ctx.users.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__value" },
        });
        (__VLS_ctx.totalMenuCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__meta" },
        });
        (__VLS_ctx.visibleMenuCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__value" },
        });
        (__VLS_ctx.visibleSystemTabs.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stat-card__meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-grid" },
        });
        const __VLS_19 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            shadow: "never",
        }));
        const __VLS_21 = __VLS_20({
            shadow: "never",
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_22.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_22.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_23 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
                type: "success",
                size: "small",
            }));
            const __VLS_25 = __VLS_24({
                type: "success",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            __VLS_26.slots.default;
            var __VLS_26;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "menu-chip-list" },
        });
        for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.visibleSystemTabs))) {
            const __VLS_27 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
                key: (tab.path),
                size: "small",
                effect: "plain",
            }));
            const __VLS_29 = __VLS_28({
                key: (tab.path),
                size: "small",
                effect: "plain",
            }, ...__VLS_functionalComponentArgsRest(__VLS_28));
            __VLS_30.slots.default;
            (tab.label);
            var __VLS_30;
        }
        const __VLS_31 = {}.ElAlert;
        /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            title: "系统页已拆分出角色管理和菜单权限管理入口，管理员可直接在本页完成角色授权与菜单维护。",
            type: "info",
            closable: (false),
            ...{ style: {} },
        }));
        const __VLS_33 = __VLS_32({
            title: "系统页已拆分出角色管理和菜单权限管理入口，管理员可直接在本页完成角色授权与菜单维护。",
            type: "info",
            closable: (false),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        var __VLS_22;
        const __VLS_35 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            shadow: "never",
        }));
        const __VLS_37 = __VLS_36({
            shadow: "never",
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        __VLS_38.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_38.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_39 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
                ...{ 'onClick': {} },
                size: "small",
            }));
            const __VLS_41 = __VLS_40({
                ...{ 'onClick': {} },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_40));
            let __VLS_43;
            let __VLS_44;
            let __VLS_45;
            const __VLS_46 = {
                onClick: (__VLS_ctx.refreshSessionMenus)
            };
            __VLS_42.slots.default;
            var __VLS_42;
        }
        const __VLS_47 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            border: true,
            column: (1),
            size: "small",
        }));
        const __VLS_49 = __VLS_48({
            border: true,
            column: (1),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        __VLS_50.slots.default;
        const __VLS_51 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            label: "菜单来源",
        }));
        const __VLS_53 = __VLS_52({
            label: "菜单来源",
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        __VLS_54.slots.default;
        var __VLS_54;
        const __VLS_55 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
            label: "当前服务",
        }));
        const __VLS_57 = __VLS_56({
            label: "当前服务",
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        __VLS_58.slots.default;
        (__VLS_ctx.health.service || '未知');
        var __VLS_58;
        const __VLS_59 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            label: "服务状态",
        }));
        const __VLS_61 = __VLS_60({
            label: "服务状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        __VLS_62.slots.default;
        const __VLS_63 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }));
        const __VLS_65 = __VLS_64({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        __VLS_66.slots.default;
        (__VLS_ctx.health.status || '未知');
        var __VLS_66;
        var __VLS_62;
        const __VLS_67 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            label: "当前系统根菜单",
        }));
        const __VLS_69 = __VLS_68({
            label: "当前系统根菜单",
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        __VLS_70.slots.default;
        (__VLS_ctx.rootMenuCount);
        var __VLS_70;
        var __VLS_50;
        var __VLS_38;
        var __VLS_18;
    }
    if (__VLS_ctx.hasSystemTab('users')) {
        const __VLS_71 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
            label: "用户管理",
            name: "users",
        }));
        const __VLS_73 = __VLS_72({
            label: "用户管理",
            name: "users",
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        __VLS_74.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-title" },
        });
        const __VLS_75 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            modelValue: (__VLS_ctx.userSearch),
            placeholder: "搜索用户名/显示名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_77 = __VLS_76({
            modelValue: (__VLS_ctx.userSearch),
            placeholder: "搜索用户名/显示名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        const __VLS_79 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
            modelValue: (__VLS_ctx.userRoleFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }));
        const __VLS_81 = __VLS_80({
            modelValue: (__VLS_ctx.userRoleFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_80));
        __VLS_82.slots.default;
        const __VLS_83 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
            value: "ALL",
            label: "全部角色",
        }));
        const __VLS_85 = __VLS_84({
            value: "ALL",
            label: "全部角色",
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        const __VLS_87 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
            value: "ADMIN",
            label: "管理员",
        }));
        const __VLS_89 = __VLS_88({
            value: "ADMIN",
            label: "管理员",
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        const __VLS_91 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            value: "ANALYST",
            label: "分析师",
        }));
        const __VLS_93 = __VLS_92({
            value: "ANALYST",
            label: "分析师",
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        const __VLS_95 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
            value: "VIEWER",
            label: "查看者",
        }));
        const __VLS_97 = __VLS_96({
            value: "VIEWER",
            label: "查看者",
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        var __VLS_82;
        const __VLS_99 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }));
        const __VLS_101 = __VLS_100({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        let __VLS_103;
        let __VLS_104;
        let __VLS_105;
        const __VLS_106 = {
            onClick: (__VLS_ctx.openCreate)
        };
        __VLS_102.slots.default;
        var __VLS_102;
        const __VLS_107 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
            data: (__VLS_ctx.filteredUsers),
            border: true,
            size: "small",
        }));
        const __VLS_109 = __VLS_108({
            data: (__VLS_ctx.filteredUsers),
            border: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.usersLoading) }, null, null);
        __VLS_110.slots.default;
        const __VLS_111 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
            prop: "id",
            label: "ID",
            width: "60",
        }));
        const __VLS_113 = __VLS_112({
            prop: "id",
            label: "ID",
            width: "60",
        }, ...__VLS_functionalComponentArgsRest(__VLS_112));
        const __VLS_115 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
            prop: "username",
            label: "用户名",
            minWidth: "120",
        }));
        const __VLS_117 = __VLS_116({
            prop: "username",
            label: "用户名",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_116));
        const __VLS_119 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
            prop: "displayName",
            label: "显示名",
            minWidth: "120",
        }));
        const __VLS_121 = __VLS_120({
            prop: "displayName",
            label: "显示名",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        const __VLS_123 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
            label: "角色",
            width: "110",
        }));
        const __VLS_125 = __VLS_124({
            label: "角色",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_124));
        __VLS_126.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_126.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_127 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
                type: (__VLS_ctx.roleTagType(row.role)),
                size: "small",
            }));
            const __VLS_129 = __VLS_128({
                type: (__VLS_ctx.roleTagType(row.role)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_128));
            __VLS_130.slots.default;
            (__VLS_ctx.roleLabel(row.role));
            var __VLS_130;
        }
        var __VLS_126;
        const __VLS_131 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
            prop: "email",
            label: "邮箱",
            minWidth: "160",
            showOverflowTooltip: true,
        }));
        const __VLS_133 = __VLS_132({
            prop: "email",
            label: "邮箱",
            minWidth: "160",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_132));
        const __VLS_135 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
            prop: "createdAt",
            label: "创建时间",
            minWidth: "160",
        }));
        const __VLS_137 = __VLS_136({
            prop: "createdAt",
            label: "创建时间",
            minWidth: "160",
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        const __VLS_139 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
            label: "操作",
            width: "140",
            fixed: "right",
        }));
        const __VLS_141 = __VLS_140({
            label: "操作",
            width: "140",
            fixed: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_140));
        __VLS_142.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_142.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_143 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_145 = __VLS_144({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_144));
            let __VLS_147;
            let __VLS_148;
            let __VLS_149;
            const __VLS_150 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.openEdit(row);
                }
            };
            __VLS_146.slots.default;
            var __VLS_146;
            const __VLS_151 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
                ...{ 'onConfirm': {} },
                title: "确认删除该用户？",
            }));
            const __VLS_153 = __VLS_152({
                ...{ 'onConfirm': {} },
                title: "确认删除该用户？",
            }, ...__VLS_functionalComponentArgsRest(__VLS_152));
            let __VLS_155;
            let __VLS_156;
            let __VLS_157;
            const __VLS_158 = {
                onConfirm: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.handleDelete(row.id);
                }
            };
            __VLS_154.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_154.slots;
                const __VLS_159 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
                    link: true,
                    type: "danger",
                }));
                const __VLS_161 = __VLS_160({
                    link: true,
                    type: "danger",
                }, ...__VLS_functionalComponentArgsRest(__VLS_160));
                __VLS_162.slots.default;
                var __VLS_162;
            }
            var __VLS_154;
        }
        var __VLS_142;
        var __VLS_110;
        const __VLS_163 = {}.ElDialog;
        /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
        // @ts-ignore
        const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
            modelValue: (__VLS_ctx.userDialogVisible),
            title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
            width: "480px",
            destroyOnClose: true,
        }));
        const __VLS_165 = __VLS_164({
            modelValue: (__VLS_ctx.userDialogVisible),
            title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
            width: "480px",
            destroyOnClose: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_164));
        __VLS_166.slots.default;
        const __VLS_167 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
            ref: "userFormRef",
            model: (__VLS_ctx.userForm),
            rules: (__VLS_ctx.userRules),
            labelWidth: "90px",
        }));
        const __VLS_169 = __VLS_168({
            ref: "userFormRef",
            model: (__VLS_ctx.userForm),
            rules: (__VLS_ctx.userRules),
            labelWidth: "90px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_168));
        /** @type {typeof __VLS_ctx.userFormRef} */ ;
        var __VLS_171 = {};
        __VLS_170.slots.default;
        const __VLS_173 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
            label: "用户名",
            prop: "username",
        }));
        const __VLS_175 = __VLS_174({
            label: "用户名",
            prop: "username",
        }, ...__VLS_functionalComponentArgsRest(__VLS_174));
        __VLS_176.slots.default;
        const __VLS_177 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
            modelValue: (__VLS_ctx.userForm.username),
            disabled: (!!__VLS_ctx.editId),
            placeholder: "登录用户名",
        }));
        const __VLS_179 = __VLS_178({
            modelValue: (__VLS_ctx.userForm.username),
            disabled: (!!__VLS_ctx.editId),
            placeholder: "登录用户名",
        }, ...__VLS_functionalComponentArgsRest(__VLS_178));
        var __VLS_176;
        const __VLS_181 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
            label: "显示名",
            prop: "displayName",
        }));
        const __VLS_183 = __VLS_182({
            label: "显示名",
            prop: "displayName",
        }, ...__VLS_functionalComponentArgsRest(__VLS_182));
        __VLS_184.slots.default;
        const __VLS_185 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
            modelValue: (__VLS_ctx.userForm.displayName),
            placeholder: "显示名称",
        }));
        const __VLS_187 = __VLS_186({
            modelValue: (__VLS_ctx.userForm.displayName),
            placeholder: "显示名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_186));
        var __VLS_184;
        const __VLS_189 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({
            label: "角色",
            prop: "role",
        }));
        const __VLS_191 = __VLS_190({
            label: "角色",
            prop: "role",
        }, ...__VLS_functionalComponentArgsRest(__VLS_190));
        __VLS_192.slots.default;
        const __VLS_193 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
            modelValue: (__VLS_ctx.userForm.role),
            ...{ style: {} },
        }));
        const __VLS_195 = __VLS_194({
            modelValue: (__VLS_ctx.userForm.role),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_194));
        __VLS_196.slots.default;
        const __VLS_197 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
            value: "ADMIN",
            label: "管理员",
        }));
        const __VLS_199 = __VLS_198({
            value: "ADMIN",
            label: "管理员",
        }, ...__VLS_functionalComponentArgsRest(__VLS_198));
        const __VLS_201 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
            value: "ANALYST",
            label: "分析师",
        }));
        const __VLS_203 = __VLS_202({
            value: "ANALYST",
            label: "分析师",
        }, ...__VLS_functionalComponentArgsRest(__VLS_202));
        const __VLS_205 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
            value: "VIEWER",
            label: "查看者",
        }));
        const __VLS_207 = __VLS_206({
            value: "VIEWER",
            label: "查看者",
        }, ...__VLS_functionalComponentArgsRest(__VLS_206));
        var __VLS_196;
        var __VLS_192;
        const __VLS_209 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
            label: "邮箱",
        }));
        const __VLS_211 = __VLS_210({
            label: "邮箱",
        }, ...__VLS_functionalComponentArgsRest(__VLS_210));
        __VLS_212.slots.default;
        const __VLS_213 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
            modelValue: (__VLS_ctx.userForm.email),
            placeholder: "可选",
        }));
        const __VLS_215 = __VLS_214({
            modelValue: (__VLS_ctx.userForm.email),
            placeholder: "可选",
        }, ...__VLS_functionalComponentArgsRest(__VLS_214));
        var __VLS_212;
        const __VLS_217 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
            label: (__VLS_ctx.editId ? '新密码' : '密码'),
        }));
        const __VLS_219 = __VLS_218({
            label: (__VLS_ctx.editId ? '新密码' : '密码'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_218));
        __VLS_220.slots.default;
        const __VLS_221 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
            modelValue: (__VLS_ctx.userForm.password),
            type: "password",
            showPassword: true,
            placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
        }));
        const __VLS_223 = __VLS_222({
            modelValue: (__VLS_ctx.userForm.password),
            type: "password",
            showPassword: true,
            placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_222));
        var __VLS_220;
        var __VLS_170;
        {
            const { footer: __VLS_thisSlot } = __VLS_166.slots;
            const __VLS_225 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
                ...{ 'onClick': {} },
            }));
            const __VLS_227 = __VLS_226({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_226));
            let __VLS_229;
            let __VLS_230;
            let __VLS_231;
            const __VLS_232 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.userDialogVisible = false;
                }
            };
            __VLS_228.slots.default;
            var __VLS_228;
            const __VLS_233 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.userSaving),
            }));
            const __VLS_235 = __VLS_234({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.userSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_234));
            let __VLS_237;
            let __VLS_238;
            let __VLS_239;
            const __VLS_240 = {
                onClick: (__VLS_ctx.handleUserSubmit)
            };
            __VLS_236.slots.default;
            var __VLS_236;
        }
        var __VLS_166;
        var __VLS_74;
    }
    if (__VLS_ctx.hasSystemTab('roles')) {
        const __VLS_241 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
            label: "角色管理",
            name: "roles",
        }));
        const __VLS_243 = __VLS_242({
            label: "角色管理",
            name: "roles",
        }, ...__VLS_functionalComponentArgsRest(__VLS_242));
        __VLS_244.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "role-layout" },
        });
        const __VLS_245 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
            shadow: "never",
            ...{ class: "role-list-card" },
        }));
        const __VLS_247 = __VLS_246({
            shadow: "never",
            ...{ class: "role-list-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_246));
        __VLS_248.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_248.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_249 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
                ...{ 'onClick': {} },
                size: "small",
            }));
            const __VLS_251 = __VLS_250({
                ...{ 'onClick': {} },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_250));
            let __VLS_253;
            let __VLS_254;
            let __VLS_255;
            const __VLS_256 = {
                onClick: (__VLS_ctx.loadRoles)
            };
            __VLS_252.slots.default;
            var __VLS_252;
        }
        const __VLS_257 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
            ...{ 'onRowClick': {} },
            data: (__VLS_ctx.roles),
            border: true,
            size: "small",
            highlightCurrentRow: true,
            rowClassName: (__VLS_ctx.roleRowClassName),
        }));
        const __VLS_259 = __VLS_258({
            ...{ 'onRowClick': {} },
            data: (__VLS_ctx.roles),
            border: true,
            size: "small",
            highlightCurrentRow: true,
            rowClassName: (__VLS_ctx.roleRowClassName),
        }, ...__VLS_functionalComponentArgsRest(__VLS_258));
        let __VLS_261;
        let __VLS_262;
        let __VLS_263;
        const __VLS_264 = {
            onRowClick: (__VLS_ctx.handleRoleSelect)
        };
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.rolesLoading) }, null, null);
        __VLS_260.slots.default;
        const __VLS_265 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
            prop: "name",
            label: "角色",
            minWidth: "120",
        }));
        const __VLS_267 = __VLS_266({
            prop: "name",
            label: "角色",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_266));
        __VLS_268.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_268.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_269 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
                type: (__VLS_ctx.roleTagType(row.name)),
                size: "small",
            }));
            const __VLS_271 = __VLS_270({
                type: (__VLS_ctx.roleTagType(row.name)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_270));
            __VLS_272.slots.default;
            (__VLS_ctx.roleLabel(row.name));
            var __VLS_272;
        }
        var __VLS_268;
        const __VLS_273 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
            prop: "userCount",
            label: "用户数",
            width: "90",
        }));
        const __VLS_275 = __VLS_274({
            prop: "userCount",
            label: "用户数",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_274));
        const __VLS_277 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
            prop: "menuCount",
            label: "菜单数",
            width: "90",
        }));
        const __VLS_279 = __VLS_278({
            prop: "menuCount",
            label: "菜单数",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_278));
        var __VLS_260;
        var __VLS_248;
        const __VLS_281 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
            shadow: "never",
            ...{ class: "role-permission-card" },
        }));
        const __VLS_283 = __VLS_282({
            shadow: "never",
            ...{ class: "role-permission-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_282));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.menusLoading || __VLS_ctx.roleMenuLoading) }, null, null);
        __VLS_284.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_284.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "tab-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
            (__VLS_ctx.selectedRole ? `${__VLS_ctx.roleLabel(__VLS_ctx.selectedRole.name)} 已关联 ${__VLS_ctx.selectedRole.menuCount} 个菜单` : '请选择角色后配置菜单权限');
            const __VLS_285 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
                disabled: (!__VLS_ctx.selectedRole),
                loading: (__VLS_ctx.roleMenuSaving),
            }));
            const __VLS_287 = __VLS_286({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
                disabled: (!__VLS_ctx.selectedRole),
                loading: (__VLS_ctx.roleMenuSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_286));
            let __VLS_289;
            let __VLS_290;
            let __VLS_291;
            const __VLS_292 = {
                onClick: (__VLS_ctx.handleRoleMenuSave)
            };
            __VLS_288.slots.default;
            var __VLS_288;
        }
        if (__VLS_ctx.selectedRole) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "role-summary" },
            });
            const __VLS_293 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
                type: (__VLS_ctx.roleTagType(__VLS_ctx.selectedRole.name)),
            }));
            const __VLS_295 = __VLS_294({
                type: (__VLS_ctx.roleTagType(__VLS_ctx.selectedRole.name)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_294));
            __VLS_296.slots.default;
            (__VLS_ctx.roleLabel(__VLS_ctx.selectedRole.name));
            var __VLS_296;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedRole.userCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedRoleMenuIds.length);
        }
        const __VLS_297 = {}.ElTree;
        /** @type {[typeof __VLS_components.ElTree, typeof __VLS_components.elTree, typeof __VLS_components.ElTree, typeof __VLS_components.elTree, ]} */ ;
        // @ts-ignore
        const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
            ref: "roleMenuTreeRef",
            data: (__VLS_ctx.menuTree),
            nodeKey: "id",
            showCheckbox: true,
            defaultExpandAll: true,
            checkOnClickNode: true,
            props: (__VLS_ctx.treeProps),
            ...{ class: "role-menu-tree" },
        }));
        const __VLS_299 = __VLS_298({
            ref: "roleMenuTreeRef",
            data: (__VLS_ctx.menuTree),
            nodeKey: "id",
            showCheckbox: true,
            defaultExpandAll: true,
            checkOnClickNode: true,
            props: (__VLS_ctx.treeProps),
            ...{ class: "role-menu-tree" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_298));
        /** @type {typeof __VLS_ctx.roleMenuTreeRef} */ ;
        var __VLS_301 = {};
        __VLS_300.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_300.slots;
            const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "tree-node" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.menuDisplayLabel(data));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tree-node__meta" },
            });
            (data.path || data.permission || '目录节点');
        }
        var __VLS_300;
        var __VLS_284;
        var __VLS_244;
    }
    if (__VLS_ctx.hasSystemTab('menus')) {
        const __VLS_303 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
            label: "菜单权限管理",
            name: "menus",
        }));
        const __VLS_305 = __VLS_304({
            label: "菜单权限管理",
            name: "menus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_304));
        __VLS_306.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-title" },
        });
        const __VLS_307 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
            size: "small",
            type: "info",
        }));
        const __VLS_309 = __VLS_308({
            size: "small",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_308));
        __VLS_310.slots.default;
        (__VLS_ctx.totalMenuCount);
        var __VLS_310;
        const __VLS_311 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
            size: "small",
            type: "success",
        }));
        const __VLS_313 = __VLS_312({
            size: "small",
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_312));
        __VLS_314.slots.default;
        (__VLS_ctx.visibleMenuCount);
        var __VLS_314;
        const __VLS_315 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }));
        const __VLS_317 = __VLS_316({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_316));
        let __VLS_319;
        let __VLS_320;
        let __VLS_321;
        const __VLS_322 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.visibleSystemTabs.length))
                    return;
                if (!(__VLS_ctx.hasSystemTab('menus')))
                    return;
                __VLS_ctx.openCreateMenu();
            }
        };
        __VLS_318.slots.default;
        var __VLS_318;
        const __VLS_323 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
            data: (__VLS_ctx.menuTree),
            border: true,
            size: "small",
            rowKey: "id",
            defaultExpandAll: true,
            treeProps: (__VLS_ctx.treeProps),
        }));
        const __VLS_325 = __VLS_324({
            data: (__VLS_ctx.menuTree),
            border: true,
            size: "small",
            rowKey: "id",
            defaultExpandAll: true,
            treeProps: (__VLS_ctx.treeProps),
        }, ...__VLS_functionalComponentArgsRest(__VLS_324));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.menusLoading) }, null, null);
        __VLS_326.slots.default;
        const __VLS_327 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
            label: "菜单名称",
            minWidth: "190",
        }));
        const __VLS_329 = __VLS_328({
            label: "菜单名称",
            minWidth: "190",
        }, ...__VLS_functionalComponentArgsRest(__VLS_328));
        __VLS_330.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_330.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "menu-name-cell" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.menuDisplayLabel(row));
            const __VLS_331 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
                size: "small",
                type: (row.type === 'catalog' ? 'warning' : 'success'),
            }));
            const __VLS_333 = __VLS_332({
                size: "small",
                type: (row.type === 'catalog' ? 'warning' : 'success'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_332));
            __VLS_334.slots.default;
            (row.type === 'catalog' ? '目录' : '菜单');
            var __VLS_334;
        }
        var __VLS_330;
        const __VLS_335 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_336 = __VLS_asFunctionalComponent(__VLS_335, new __VLS_335({
            prop: "path",
            label: "路由路径",
            minWidth: "200",
            showOverflowTooltip: true,
        }));
        const __VLS_337 = __VLS_336({
            prop: "path",
            label: "路由路径",
            minWidth: "200",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_336));
        const __VLS_339 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
            prop: "permission",
            label: "权限标识",
            minWidth: "160",
            showOverflowTooltip: true,
        }));
        const __VLS_341 = __VLS_340({
            prop: "permission",
            label: "权限标识",
            minWidth: "160",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_340));
        const __VLS_343 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
            prop: "component",
            label: "组件",
            minWidth: "140",
            showOverflowTooltip: true,
        }));
        const __VLS_345 = __VLS_344({
            prop: "component",
            label: "组件",
            minWidth: "140",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_344));
        const __VLS_347 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
            prop: "icon",
            label: "图标",
            width: "100",
        }));
        const __VLS_349 = __VLS_348({
            prop: "icon",
            label: "图标",
            width: "100",
        }, ...__VLS_functionalComponentArgsRest(__VLS_348));
        const __VLS_351 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
            prop: "sort",
            label: "排序",
            width: "80",
        }));
        const __VLS_353 = __VLS_352({
            prop: "sort",
            label: "排序",
            width: "80",
        }, ...__VLS_functionalComponentArgsRest(__VLS_352));
        const __VLS_355 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
            label: "可见",
            width: "90",
        }));
        const __VLS_357 = __VLS_356({
            label: "可见",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_356));
        __VLS_358.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_358.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_359 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
                size: "small",
                type: (row.visible === false ? 'info' : 'success'),
            }));
            const __VLS_361 = __VLS_360({
                size: "small",
                type: (row.visible === false ? 'info' : 'success'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_360));
            __VLS_362.slots.default;
            (row.visible === false ? '隐藏' : '显示');
            var __VLS_362;
        }
        var __VLS_358;
        const __VLS_363 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
            label: "操作",
            width: "220",
            fixed: "right",
        }));
        const __VLS_365 = __VLS_364({
            label: "操作",
            width: "220",
            fixed: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_364));
        __VLS_366.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_366.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_367 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_368 = __VLS_asFunctionalComponent(__VLS_367, new __VLS_367({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_369 = __VLS_368({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_368));
            let __VLS_371;
            let __VLS_372;
            let __VLS_373;
            const __VLS_374 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.openCreateMenu(row);
                }
            };
            __VLS_370.slots.default;
            var __VLS_370;
            const __VLS_375 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_376 = __VLS_asFunctionalComponent(__VLS_375, new __VLS_375({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_377 = __VLS_376({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_376));
            let __VLS_379;
            let __VLS_380;
            let __VLS_381;
            const __VLS_382 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.openEditMenu(row);
                }
            };
            __VLS_378.slots.default;
            var __VLS_378;
            const __VLS_383 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
                ...{ 'onConfirm': {} },
                title: "确认删除该菜单？",
            }));
            const __VLS_385 = __VLS_384({
                ...{ 'onConfirm': {} },
                title: "确认删除该菜单？",
            }, ...__VLS_functionalComponentArgsRest(__VLS_384));
            let __VLS_387;
            let __VLS_388;
            let __VLS_389;
            const __VLS_390 = {
                onConfirm: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.handleMenuDelete(row.id);
                }
            };
            __VLS_386.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_386.slots;
                const __VLS_391 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_392 = __VLS_asFunctionalComponent(__VLS_391, new __VLS_391({
                    link: true,
                    type: "danger",
                }));
                const __VLS_393 = __VLS_392({
                    link: true,
                    type: "danger",
                }, ...__VLS_functionalComponentArgsRest(__VLS_392));
                __VLS_394.slots.default;
                var __VLS_394;
            }
            var __VLS_386;
        }
        var __VLS_366;
        var __VLS_326;
        const __VLS_395 = {}.ElDialog;
        /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
        // @ts-ignore
        const __VLS_396 = __VLS_asFunctionalComponent(__VLS_395, new __VLS_395({
            modelValue: (__VLS_ctx.menuDialogVisible),
            title: (__VLS_ctx.editingMenuId ? '编辑菜单' : '新增菜单'),
            width: "560px",
            destroyOnClose: true,
        }));
        const __VLS_397 = __VLS_396({
            modelValue: (__VLS_ctx.menuDialogVisible),
            title: (__VLS_ctx.editingMenuId ? '编辑菜单' : '新增菜单'),
            width: "560px",
            destroyOnClose: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_396));
        __VLS_398.slots.default;
        const __VLS_399 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_400 = __VLS_asFunctionalComponent(__VLS_399, new __VLS_399({
            ref: "menuFormRef",
            model: (__VLS_ctx.menuForm),
            rules: (__VLS_ctx.menuRules),
            labelWidth: "100px",
        }));
        const __VLS_401 = __VLS_400({
            ref: "menuFormRef",
            model: (__VLS_ctx.menuForm),
            rules: (__VLS_ctx.menuRules),
            labelWidth: "100px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_400));
        /** @type {typeof __VLS_ctx.menuFormRef} */ ;
        var __VLS_403 = {};
        __VLS_402.slots.default;
        const __VLS_405 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_406 = __VLS_asFunctionalComponent(__VLS_405, new __VLS_405({
            label: "菜单名称",
            prop: "name",
        }));
        const __VLS_407 = __VLS_406({
            label: "菜单名称",
            prop: "name",
        }, ...__VLS_functionalComponentArgsRest(__VLS_406));
        __VLS_408.slots.default;
        const __VLS_409 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
            modelValue: (__VLS_ctx.menuForm.name),
            placeholder: "请输入菜单名称",
        }));
        const __VLS_411 = __VLS_410({
            modelValue: (__VLS_ctx.menuForm.name),
            placeholder: "请输入菜单名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_410));
        var __VLS_408;
        const __VLS_413 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
            label: "菜单类型",
        }));
        const __VLS_415 = __VLS_414({
            label: "菜单类型",
        }, ...__VLS_functionalComponentArgsRest(__VLS_414));
        __VLS_416.slots.default;
        const __VLS_417 = {}.ElRadioGroup;
        /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
        // @ts-ignore
        const __VLS_418 = __VLS_asFunctionalComponent(__VLS_417, new __VLS_417({
            modelValue: (__VLS_ctx.menuForm.type),
        }));
        const __VLS_419 = __VLS_418({
            modelValue: (__VLS_ctx.menuForm.type),
        }, ...__VLS_functionalComponentArgsRest(__VLS_418));
        __VLS_420.slots.default;
        const __VLS_421 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
            label: "menu",
        }));
        const __VLS_423 = __VLS_422({
            label: "menu",
        }, ...__VLS_functionalComponentArgsRest(__VLS_422));
        __VLS_424.slots.default;
        var __VLS_424;
        const __VLS_425 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_426 = __VLS_asFunctionalComponent(__VLS_425, new __VLS_425({
            label: "catalog",
        }));
        const __VLS_427 = __VLS_426({
            label: "catalog",
        }, ...__VLS_functionalComponentArgsRest(__VLS_426));
        __VLS_428.slots.default;
        var __VLS_428;
        var __VLS_420;
        var __VLS_416;
        const __VLS_429 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_430 = __VLS_asFunctionalComponent(__VLS_429, new __VLS_429({
            label: "上级菜单",
        }));
        const __VLS_431 = __VLS_430({
            label: "上级菜单",
        }, ...__VLS_functionalComponentArgsRest(__VLS_430));
        __VLS_432.slots.default;
        const __VLS_433 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_434 = __VLS_asFunctionalComponent(__VLS_433, new __VLS_433({
            modelValue: (__VLS_ctx.menuForm.parentId),
            clearable: true,
            placeholder: "顶级菜单",
            ...{ style: {} },
        }));
        const __VLS_435 = __VLS_434({
            modelValue: (__VLS_ctx.menuForm.parentId),
            clearable: true,
            placeholder: "顶级菜单",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_434));
        __VLS_436.slots.default;
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.parentMenuOptions))) {
            const __VLS_437 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_438 = __VLS_asFunctionalComponent(__VLS_437, new __VLS_437({
                key: (option.id),
                label: (option.label),
                value: (option.id),
            }));
            const __VLS_439 = __VLS_438({
                key: (option.id),
                label: (option.label),
                value: (option.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_438));
        }
        var __VLS_436;
        var __VLS_432;
        const __VLS_441 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_442 = __VLS_asFunctionalComponent(__VLS_441, new __VLS_441({
            label: "路由路径",
        }));
        const __VLS_443 = __VLS_442({
            label: "路由路径",
        }, ...__VLS_functionalComponentArgsRest(__VLS_442));
        __VLS_444.slots.default;
        const __VLS_445 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_446 = __VLS_asFunctionalComponent(__VLS_445, new __VLS_445({
            modelValue: (__VLS_ctx.menuForm.path),
            placeholder: "例如 /home/system/roles",
        }));
        const __VLS_447 = __VLS_446({
            modelValue: (__VLS_ctx.menuForm.path),
            placeholder: "例如 /home/system/roles",
        }, ...__VLS_functionalComponentArgsRest(__VLS_446));
        var __VLS_444;
        const __VLS_449 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_450 = __VLS_asFunctionalComponent(__VLS_449, new __VLS_449({
            label: "前端组件",
        }));
        const __VLS_451 = __VLS_450({
            label: "前端组件",
        }, ...__VLS_functionalComponentArgsRest(__VLS_450));
        __VLS_452.slots.default;
        const __VLS_453 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_454 = __VLS_asFunctionalComponent(__VLS_453, new __VLS_453({
            modelValue: (__VLS_ctx.menuForm.component),
            placeholder: "例如 SystemView",
        }));
        const __VLS_455 = __VLS_454({
            modelValue: (__VLS_ctx.menuForm.component),
            placeholder: "例如 SystemView",
        }, ...__VLS_functionalComponentArgsRest(__VLS_454));
        var __VLS_452;
        const __VLS_457 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_458 = __VLS_asFunctionalComponent(__VLS_457, new __VLS_457({
            label: "权限标识",
        }));
        const __VLS_459 = __VLS_458({
            label: "权限标识",
        }, ...__VLS_functionalComponentArgsRest(__VLS_458));
        __VLS_460.slots.default;
        const __VLS_461 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_462 = __VLS_asFunctionalComponent(__VLS_461, new __VLS_461({
            modelValue: (__VLS_ctx.menuForm.permission),
            placeholder: "例如 system:role",
        }));
        const __VLS_463 = __VLS_462({
            modelValue: (__VLS_ctx.menuForm.permission),
            placeholder: "例如 system:role",
        }, ...__VLS_functionalComponentArgsRest(__VLS_462));
        var __VLS_460;
        const __VLS_465 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_466 = __VLS_asFunctionalComponent(__VLS_465, new __VLS_465({
            label: "图标",
        }));
        const __VLS_467 = __VLS_466({
            label: "图标",
        }, ...__VLS_functionalComponentArgsRest(__VLS_466));
        __VLS_468.slots.default;
        const __VLS_469 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_470 = __VLS_asFunctionalComponent(__VLS_469, new __VLS_469({
            modelValue: (__VLS_ctx.menuForm.icon),
            placeholder: "例如 Menu / Setting",
        }));
        const __VLS_471 = __VLS_470({
            modelValue: (__VLS_ctx.menuForm.icon),
            placeholder: "例如 Menu / Setting",
        }, ...__VLS_functionalComponentArgsRest(__VLS_470));
        var __VLS_468;
        const __VLS_473 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_474 = __VLS_asFunctionalComponent(__VLS_473, new __VLS_473({
            label: "排序值",
        }));
        const __VLS_475 = __VLS_474({
            label: "排序值",
        }, ...__VLS_functionalComponentArgsRest(__VLS_474));
        __VLS_476.slots.default;
        const __VLS_477 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_478 = __VLS_asFunctionalComponent(__VLS_477, new __VLS_477({
            modelValue: (__VLS_ctx.menuForm.sort),
            min: (1),
            max: (999),
            ...{ style: {} },
        }));
        const __VLS_479 = __VLS_478({
            modelValue: (__VLS_ctx.menuForm.sort),
            min: (1),
            max: (999),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_478));
        var __VLS_476;
        const __VLS_481 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_482 = __VLS_asFunctionalComponent(__VLS_481, new __VLS_481({
            label: "显示状态",
        }));
        const __VLS_483 = __VLS_482({
            label: "显示状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_482));
        __VLS_484.slots.default;
        const __VLS_485 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_486 = __VLS_asFunctionalComponent(__VLS_485, new __VLS_485({
            modelValue: (__VLS_ctx.menuForm.visible),
            activeText: "显示",
            inactiveText: "隐藏",
        }));
        const __VLS_487 = __VLS_486({
            modelValue: (__VLS_ctx.menuForm.visible),
            activeText: "显示",
            inactiveText: "隐藏",
        }, ...__VLS_functionalComponentArgsRest(__VLS_486));
        var __VLS_484;
        var __VLS_402;
        {
            const { footer: __VLS_thisSlot } = __VLS_398.slots;
            const __VLS_489 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_490 = __VLS_asFunctionalComponent(__VLS_489, new __VLS_489({
                ...{ 'onClick': {} },
            }));
            const __VLS_491 = __VLS_490({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_490));
            let __VLS_493;
            let __VLS_494;
            let __VLS_495;
            const __VLS_496 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.menuDialogVisible = false;
                }
            };
            __VLS_492.slots.default;
            var __VLS_492;
            const __VLS_497 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_498 = __VLS_asFunctionalComponent(__VLS_497, new __VLS_497({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.menuSaving),
            }));
            const __VLS_499 = __VLS_498({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.menuSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_498));
            let __VLS_501;
            let __VLS_502;
            let __VLS_503;
            const __VLS_504 = {
                onClick: (__VLS_ctx.handleMenuSubmit)
            };
            __VLS_500.slots.default;
            var __VLS_500;
        }
        var __VLS_398;
        var __VLS_306;
    }
    if (__VLS_ctx.hasSystemTab('audit')) {
        const __VLS_505 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_506 = __VLS_asFunctionalComponent(__VLS_505, new __VLS_505({
            label: "审计日志",
            name: "audit",
        }));
        const __VLS_507 = __VLS_506({
            label: "审计日志",
            name: "audit",
        }, ...__VLS_functionalComponentArgsRest(__VLS_506));
        __VLS_508.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        const __VLS_509 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_510 = __VLS_asFunctionalComponent(__VLS_509, new __VLS_509({
            modelValue: (__VLS_ctx.logSearch),
            placeholder: "搜索用户/操作",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_511 = __VLS_510({
            modelValue: (__VLS_ctx.logSearch),
            placeholder: "搜索用户/操作",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_510));
        const __VLS_513 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_514 = __VLS_asFunctionalComponent(__VLS_513, new __VLS_513({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_515 = __VLS_514({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_514));
        let __VLS_517;
        let __VLS_518;
        let __VLS_519;
        const __VLS_520 = {
            onClick: (__VLS_ctx.loadLogs)
        };
        __VLS_516.slots.default;
        var __VLS_516;
        const __VLS_521 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_522 = __VLS_asFunctionalComponent(__VLS_521, new __VLS_521({
            data: (__VLS_ctx.filteredLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }));
        const __VLS_523 = __VLS_522({
            data: (__VLS_ctx.filteredLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }, ...__VLS_functionalComponentArgsRest(__VLS_522));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.logsLoading) }, null, null);
        __VLS_524.slots.default;
        const __VLS_525 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_526 = __VLS_asFunctionalComponent(__VLS_525, new __VLS_525({
            prop: "createdAt",
            label: "时间",
            width: "165",
        }));
        const __VLS_527 = __VLS_526({
            prop: "createdAt",
            label: "时间",
            width: "165",
        }, ...__VLS_functionalComponentArgsRest(__VLS_526));
        const __VLS_529 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_530 = __VLS_asFunctionalComponent(__VLS_529, new __VLS_529({
            prop: "username",
            label: "用户",
            width: "100",
        }));
        const __VLS_531 = __VLS_530({
            prop: "username",
            label: "用户",
            width: "100",
        }, ...__VLS_functionalComponentArgsRest(__VLS_530));
        const __VLS_533 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_534 = __VLS_asFunctionalComponent(__VLS_533, new __VLS_533({
            label: "操作",
            width: "120",
        }));
        const __VLS_535 = __VLS_534({
            label: "操作",
            width: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_534));
        __VLS_536.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_536.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_537 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_538 = __VLS_asFunctionalComponent(__VLS_537, new __VLS_537({
                size: "small",
                type: (__VLS_ctx.actionTagType(row.action)),
            }));
            const __VLS_539 = __VLS_538({
                size: "small",
                type: (__VLS_ctx.actionTagType(row.action)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_538));
            __VLS_540.slots.default;
            (row.action);
            var __VLS_540;
        }
        var __VLS_536;
        const __VLS_541 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_542 = __VLS_asFunctionalComponent(__VLS_541, new __VLS_541({
            prop: "resourceType",
            label: "资源类型",
            width: "110",
        }));
        const __VLS_543 = __VLS_542({
            prop: "resourceType",
            label: "资源类型",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_542));
        const __VLS_545 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_546 = __VLS_asFunctionalComponent(__VLS_545, new __VLS_545({
            prop: "resourceId",
            label: "资源ID",
            width: "80",
        }));
        const __VLS_547 = __VLS_546({
            prop: "resourceId",
            label: "资源ID",
            width: "80",
        }, ...__VLS_functionalComponentArgsRest(__VLS_546));
        const __VLS_549 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_550 = __VLS_asFunctionalComponent(__VLS_549, new __VLS_549({
            prop: "detail",
            label: "详情",
            minWidth: "180",
            showOverflowTooltip: true,
        }));
        const __VLS_551 = __VLS_550({
            prop: "detail",
            label: "详情",
            minWidth: "180",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_550));
        const __VLS_553 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_554 = __VLS_asFunctionalComponent(__VLS_553, new __VLS_553({
            prop: "ipAddr",
            label: "IP",
            width: "130",
        }));
        const __VLS_555 = __VLS_554({
            prop: "ipAddr",
            label: "IP",
            width: "130",
        }, ...__VLS_functionalComponentArgsRest(__VLS_554));
        var __VLS_524;
        if (__VLS_ctx.filteredLogs.length === 0 && !__VLS_ctx.logsLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
        }
        var __VLS_508;
    }
    if (__VLS_ctx.hasSystemTab('loginLogs')) {
        const __VLS_557 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_558 = __VLS_asFunctionalComponent(__VLS_557, new __VLS_557({
            label: "登录日志",
            name: "loginLogs",
        }));
        const __VLS_559 = __VLS_558({
            label: "登录日志",
            name: "loginLogs",
        }, ...__VLS_functionalComponentArgsRest(__VLS_558));
        __VLS_560.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        const __VLS_561 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_562 = __VLS_asFunctionalComponent(__VLS_561, new __VLS_561({
            modelValue: (__VLS_ctx.loginLogSearch),
            placeholder: "搜索登录用户名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_563 = __VLS_562({
            modelValue: (__VLS_ctx.loginLogSearch),
            placeholder: "搜索登录用户名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_562));
        const __VLS_565 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_566 = __VLS_asFunctionalComponent(__VLS_565, new __VLS_565({
            modelValue: (__VLS_ctx.loginActionFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }));
        const __VLS_567 = __VLS_566({
            modelValue: (__VLS_ctx.loginActionFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_566));
        __VLS_568.slots.default;
        const __VLS_569 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_570 = __VLS_asFunctionalComponent(__VLS_569, new __VLS_569({
            value: "ALL",
            label: "全部",
        }));
        const __VLS_571 = __VLS_570({
            value: "ALL",
            label: "全部",
        }, ...__VLS_functionalComponentArgsRest(__VLS_570));
        const __VLS_573 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_574 = __VLS_asFunctionalComponent(__VLS_573, new __VLS_573({
            value: "LOGIN_SUCCESS",
            label: "登录成功",
        }));
        const __VLS_575 = __VLS_574({
            value: "LOGIN_SUCCESS",
            label: "登录成功",
        }, ...__VLS_functionalComponentArgsRest(__VLS_574));
        const __VLS_577 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_578 = __VLS_asFunctionalComponent(__VLS_577, new __VLS_577({
            value: "LOGIN_FAIL",
            label: "登录失败",
        }));
        const __VLS_579 = __VLS_578({
            value: "LOGIN_FAIL",
            label: "登录失败",
        }, ...__VLS_functionalComponentArgsRest(__VLS_578));
        var __VLS_568;
        const __VLS_581 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_582 = __VLS_asFunctionalComponent(__VLS_581, new __VLS_581({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_583 = __VLS_582({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_582));
        let __VLS_585;
        let __VLS_586;
        let __VLS_587;
        const __VLS_588 = {
            onClick: (__VLS_ctx.loadLoginLogs)
        };
        __VLS_584.slots.default;
        var __VLS_584;
        const __VLS_589 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_590 = __VLS_asFunctionalComponent(__VLS_589, new __VLS_589({
            data: (__VLS_ctx.filteredLoginLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }));
        const __VLS_591 = __VLS_590({
            data: (__VLS_ctx.filteredLoginLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }, ...__VLS_functionalComponentArgsRest(__VLS_590));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loginLogsLoading) }, null, null);
        __VLS_592.slots.default;
        const __VLS_593 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_594 = __VLS_asFunctionalComponent(__VLS_593, new __VLS_593({
            prop: "createdAt",
            label: "时间",
            width: "170",
        }));
        const __VLS_595 = __VLS_594({
            prop: "createdAt",
            label: "时间",
            width: "170",
        }, ...__VLS_functionalComponentArgsRest(__VLS_594));
        const __VLS_597 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_598 = __VLS_asFunctionalComponent(__VLS_597, new __VLS_597({
            prop: "username",
            label: "用户名",
            width: "140",
        }));
        const __VLS_599 = __VLS_598({
            prop: "username",
            label: "用户名",
            width: "140",
        }, ...__VLS_functionalComponentArgsRest(__VLS_598));
        const __VLS_601 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_602 = __VLS_asFunctionalComponent(__VLS_601, new __VLS_601({
            label: "结果",
            width: "110",
        }));
        const __VLS_603 = __VLS_602({
            label: "结果",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_602));
        __VLS_604.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_604.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_605 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_606 = __VLS_asFunctionalComponent(__VLS_605, new __VLS_605({
                size: "small",
                type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
            }));
            const __VLS_607 = __VLS_606({
                size: "small",
                type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_606));
            __VLS_608.slots.default;
            (row.action === 'LOGIN_SUCCESS' ? '成功' : '失败');
            var __VLS_608;
        }
        var __VLS_604;
        const __VLS_609 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_610 = __VLS_asFunctionalComponent(__VLS_609, new __VLS_609({
            prop: "detail",
            label: "详情",
            minWidth: "220",
            showOverflowTooltip: true,
        }));
        const __VLS_611 = __VLS_610({
            prop: "detail",
            label: "详情",
            minWidth: "220",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_610));
        const __VLS_613 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_614 = __VLS_asFunctionalComponent(__VLS_613, new __VLS_613({
            prop: "ipAddr",
            label: "IP",
            width: "140",
        }));
        const __VLS_615 = __VLS_614({
            prop: "ipAddr",
            label: "IP",
            width: "140",
        }, ...__VLS_functionalComponentArgsRest(__VLS_614));
        var __VLS_592;
        if (__VLS_ctx.filteredLoginLogs.length === 0 && !__VLS_ctx.loginLogsLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
        }
        var __VLS_560;
    }
    if (__VLS_ctx.hasSystemTab('monitor')) {
        const __VLS_617 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_618 = __VLS_asFunctionalComponent(__VLS_617, new __VLS_617({
            label: "系统监控",
            name: "monitor",
        }));
        const __VLS_619 = __VLS_618({
            label: "系统监控",
            name: "monitor",
        }, ...__VLS_functionalComponentArgsRest(__VLS_618));
        __VLS_620.slots.default;
        const __VLS_621 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_622 = __VLS_asFunctionalComponent(__VLS_621, new __VLS_621({
            title: "系统健康状态",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_623 = __VLS_622({
            title: "系统健康状态",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_622));
        __VLS_624.slots.default;
        const __VLS_625 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_626 = __VLS_asFunctionalComponent(__VLS_625, new __VLS_625({
            label: "服务状态",
        }));
        const __VLS_627 = __VLS_626({
            label: "服务状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_626));
        __VLS_628.slots.default;
        const __VLS_629 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_630 = __VLS_asFunctionalComponent(__VLS_629, new __VLS_629({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }));
        const __VLS_631 = __VLS_630({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_630));
        __VLS_632.slots.default;
        (__VLS_ctx.health.status || '未知');
        var __VLS_632;
        var __VLS_628;
        const __VLS_633 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_634 = __VLS_asFunctionalComponent(__VLS_633, new __VLS_633({
            label: "服务名",
        }));
        const __VLS_635 = __VLS_634({
            label: "服务名",
        }, ...__VLS_functionalComponentArgsRest(__VLS_634));
        __VLS_636.slots.default;
        (__VLS_ctx.health.service || '未知');
        var __VLS_636;
        var __VLS_624;
        const __VLS_637 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_638 = __VLS_asFunctionalComponent(__VLS_637, new __VLS_637({
            title: "版本信息",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_639 = __VLS_638({
            title: "版本信息",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_638));
        __VLS_640.slots.default;
        const __VLS_641 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_642 = __VLS_asFunctionalComponent(__VLS_641, new __VLS_641({
            label: "前端框架",
        }));
        const __VLS_643 = __VLS_642({
            label: "前端框架",
        }, ...__VLS_functionalComponentArgsRest(__VLS_642));
        __VLS_644.slots.default;
        var __VLS_644;
        const __VLS_645 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_646 = __VLS_asFunctionalComponent(__VLS_645, new __VLS_645({
            label: "后端框架",
        }));
        const __VLS_647 = __VLS_646({
            label: "后端框架",
        }, ...__VLS_functionalComponentArgsRest(__VLS_646));
        __VLS_648.slots.default;
        var __VLS_648;
        const __VLS_649 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_650 = __VLS_asFunctionalComponent(__VLS_649, new __VLS_649({
            label: "数据库",
        }));
        const __VLS_651 = __VLS_650({
            label: "数据库",
        }, ...__VLS_functionalComponentArgsRest(__VLS_650));
        __VLS_652.slots.default;
        var __VLS_652;
        const __VLS_653 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_654 = __VLS_asFunctionalComponent(__VLS_653, new __VLS_653({
            label: "数据同步",
        }));
        const __VLS_655 = __VLS_654({
            label: "数据同步",
        }, ...__VLS_functionalComponentArgsRest(__VLS_654));
        __VLS_656.slots.default;
        var __VLS_656;
        var __VLS_640;
        const __VLS_657 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_658 = __VLS_asFunctionalComponent(__VLS_657, new __VLS_657({
            title: "功能路线图",
            border: true,
            column: (1),
            size: "small",
        }));
        const __VLS_659 = __VLS_658({
            title: "功能路线图",
            border: true,
            column: (1),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_658));
        __VLS_660.slots.default;
        const __VLS_661 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_662 = __VLS_asFunctionalComponent(__VLS_661, new __VLS_661({
            label: "RBAC 权限",
        }));
        const __VLS_663 = __VLS_662({
            label: "RBAC 权限",
        }, ...__VLS_functionalComponentArgsRest(__VLS_662));
        __VLS_664.slots.default;
        var __VLS_664;
        const __VLS_665 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_666 = __VLS_asFunctionalComponent(__VLS_665, new __VLS_665({
            label: "行级安全",
        }));
        const __VLS_667 = __VLS_666({
            label: "行级安全",
        }, ...__VLS_functionalComponentArgsRest(__VLS_666));
        __VLS_668.slots.default;
        var __VLS_668;
        const __VLS_669 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_670 = __VLS_asFunctionalComponent(__VLS_669, new __VLS_669({
            label: "调度能力",
        }));
        const __VLS_671 = __VLS_670({
            label: "调度能力",
        }, ...__VLS_functionalComponentArgsRest(__VLS_670));
        __VLS_672.slots.default;
        var __VLS_672;
        const __VLS_673 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_674 = __VLS_asFunctionalComponent(__VLS_673, new __VLS_673({
            label: "导出分享",
        }));
        const __VLS_675 = __VLS_674({
            label: "导出分享",
        }, ...__VLS_functionalComponentArgsRest(__VLS_674));
        __VLS_676.slots.default;
        var __VLS_676;
        const __VLS_677 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_678 = __VLS_asFunctionalComponent(__VLS_677, new __VLS_677({
            label: "告警通知",
        }));
        const __VLS_679 = __VLS_678({
            label: "告警通知",
        }, ...__VLS_functionalComponentArgsRest(__VLS_678));
        __VLS_680.slots.default;
        var __VLS_680;
        var __VLS_660;
        var __VLS_620;
    }
    var __VLS_10;
}
/** @type {__VLS_StyleScopedClasses['page-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-main']} */ ;
/** @type {__VLS_StyleScopedClasses['system-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-chip-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
/** @type {__VLS_StyleScopedClasses['role-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['role-list-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['role-permission-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['role-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['role-menu-tree']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-title']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-name-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-input']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-select']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
// @ts-ignore
var __VLS_172 = __VLS_171, __VLS_302 = __VLS_301, __VLS_404 = __VLS_403;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            TopNavBar: TopNavBar,
            treeProps: treeProps,
            activeTab: activeTab,
            visibleSystemTabs: visibleSystemTabs,
            hasSystemTab: hasSystemTab,
            handleTabChange: handleTabChange,
            refreshSessionMenus: refreshSessionMenus,
            users: users,
            usersLoading: usersLoading,
            userSearch: userSearch,
            userRoleFilter: userRoleFilter,
            userDialogVisible: userDialogVisible,
            userSaving: userSaving,
            editId: editId,
            userFormRef: userFormRef,
            userForm: userForm,
            userRules: userRules,
            roles: roles,
            rolesLoading: rolesLoading,
            roleMenuLoading: roleMenuLoading,
            roleMenuSaving: roleMenuSaving,
            selectedRoleMenuIds: selectedRoleMenuIds,
            roleMenuTreeRef: roleMenuTreeRef,
            menuTree: menuTree,
            menusLoading: menusLoading,
            menuDialogVisible: menuDialogVisible,
            menuSaving: menuSaving,
            editingMenuId: editingMenuId,
            menuFormRef: menuFormRef,
            menuForm: menuForm,
            menuRules: menuRules,
            logsLoading: logsLoading,
            logSearch: logSearch,
            loginLogsLoading: loginLogsLoading,
            loginLogSearch: loginLogSearch,
            loginActionFilter: loginActionFilter,
            health: health,
            roleLabel: roleLabel,
            roleTagType: roleTagType,
            actionTagType: actionTagType,
            menuDisplayLabel: menuDisplayLabel,
            totalMenuCount: totalMenuCount,
            visibleMenuCount: visibleMenuCount,
            rootMenuCount: rootMenuCount,
            selectedRole: selectedRole,
            filteredUsers: filteredUsers,
            filteredLogs: filteredLogs,
            filteredLoginLogs: filteredLoginLogs,
            parentMenuOptions: parentMenuOptions,
            roleRowClassName: roleRowClassName,
            loadRoles: loadRoles,
            handleRoleSelect: handleRoleSelect,
            handleRoleMenuSave: handleRoleMenuSave,
            openCreate: openCreate,
            openEdit: openEdit,
            handleUserSubmit: handleUserSubmit,
            handleDelete: handleDelete,
            openCreateMenu: openCreateMenu,
            openEditMenu: openEditMenu,
            handleMenuSubmit: handleMenuSubmit,
            handleMenuDelete: handleMenuDelete,
            loadLogs: loadLogs,
            loadLoginLogs: loadLoginLogs,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
