import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import TopNavBar from '../components/TopNavBar.vue';
import request from '../api/request';
import { createMenu, deleteMenu, getCurrentMenus, getMenuTree, updateMenu } from '../api/menu';
import { getRoleList, getRoleMenuIds, updateRoleMenuIds } from '../api/role';
import { createUser, deleteUser, getUserList, updateUser } from '../api/user';
import { saveAuthMenus } from '../utils/auth-session';
import { DEFAULT_PLATFORM_SETTINGS, getPlatformSettings, resetPlatformSettings, savePlatformSettings } from '../utils/platform-settings';
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
// ─── 平台基础设置（品牌/主题/安全/数据默认） ─────────────────────────────────
const PRIMARY_PRESETS = ['#4a7dff', '#1ec7c0', '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#8b5cf6'];
const platformDraft = reactive(JSON.parse(JSON.stringify(getPlatformSettings())));
const settingsSaving = ref(false);
const browserInfo = computed(() => {
    if (typeof navigator === 'undefined')
        return '未知';
    const ua = navigator.userAgent;
    const match = ua.match(/(Edg|Chrome|Firefox|Safari)\/([\d.]+)/);
    return match ? `${match[1]} ${match[2].split('.')[0]}` : ua.slice(0, 40);
});
const screenInfo = computed(() => {
    if (typeof window === 'undefined')
        return '未知';
    return `${window.screen?.width ?? '?'} × ${window.screen?.height ?? '?'} @ ${window.devicePixelRatio || 1}x`;
});
const saveSettingsDraft = async () => {
    settingsSaving.value = true;
    try {
        savePlatformSettings(JSON.parse(JSON.stringify(platformDraft)));
        ElMessage.success('设置已保存，登录页与平台标识将同步更新');
    }
    finally {
        settingsSaving.value = false;
    }
};
const resetSettingsDraft = () => {
    const fresh = resetPlatformSettings();
    Object.assign(platformDraft.branding, fresh.branding);
    Object.assign(platformDraft.security, fresh.security);
    Object.assign(platformDraft.dataDefaults, fresh.dataDefaults);
    platformDraft.themeMode = fresh.themeMode;
    platformDraft.primaryColor = fresh.primaryColor;
    ElMessage.info('已恢复为默认设置');
};
// 默认值占位，避免 TS 报未使用
void DEFAULT_PLATFORM_SETTINGS;
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
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['color-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['color-dot']} */ ;
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
            ...{ class: "settings-card" },
        }));
        const __VLS_21 = __VLS_20({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_22.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_22.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
            const __VLS_23 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
                size: "small",
                type: "success",
            }));
            const __VLS_25 = __VLS_24({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_24));
            __VLS_26.slots.default;
            var __VLS_26;
        }
        const __VLS_27 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form" },
        }));
        const __VLS_29 = __VLS_28({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        __VLS_30.slots.default;
        const __VLS_31 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            label: "平台名称",
        }));
        const __VLS_33 = __VLS_32({
            label: "平台名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_34.slots.default;
        const __VLS_35 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            modelValue: (__VLS_ctx.platformDraft.branding.name),
            maxlength: "40",
            showWordLimit: true,
        }));
        const __VLS_37 = __VLS_36({
            modelValue: (__VLS_ctx.platformDraft.branding.name),
            maxlength: "40",
            showWordLimit: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        var __VLS_34;
        const __VLS_39 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            label: "平台标语",
        }));
        const __VLS_41 = __VLS_40({
            label: "平台标语",
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_42.slots.default;
        const __VLS_43 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
            modelValue: (__VLS_ctx.platformDraft.branding.slogan),
            maxlength: "60",
            showWordLimit: true,
        }));
        const __VLS_45 = __VLS_44({
            modelValue: (__VLS_ctx.platformDraft.branding.slogan),
            maxlength: "60",
            showWordLimit: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_44));
        var __VLS_42;
        const __VLS_47 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            label: "版权信息",
        }));
        const __VLS_49 = __VLS_48({
            label: "版权信息",
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        __VLS_50.slots.default;
        const __VLS_51 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            modelValue: (__VLS_ctx.platformDraft.branding.copyright),
        }));
        const __VLS_53 = __VLS_52({
            modelValue: (__VLS_ctx.platformDraft.branding.copyright),
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        var __VLS_50;
        const __VLS_55 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
            label: "版本号",
        }));
        const __VLS_57 = __VLS_56({
            label: "版本号",
        }, ...__VLS_functionalComponentArgsRest(__VLS_56));
        __VLS_58.slots.default;
        const __VLS_59 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            modelValue: (__VLS_ctx.platformDraft.branding.version),
        }));
        const __VLS_61 = __VLS_60({
            modelValue: (__VLS_ctx.platformDraft.branding.version),
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        var __VLS_58;
        var __VLS_30;
        var __VLS_22;
        const __VLS_63 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
            shadow: "never",
            ...{ class: "settings-card" },
        }));
        const __VLS_65 = __VLS_64({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_64));
        __VLS_66.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_66.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
        }
        const __VLS_67 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form" },
        }));
        const __VLS_69 = __VLS_68({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_68));
        __VLS_70.slots.default;
        const __VLS_71 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
            label: "主题模式",
        }));
        const __VLS_73 = __VLS_72({
            label: "主题模式",
        }, ...__VLS_functionalComponentArgsRest(__VLS_72));
        __VLS_74.slots.default;
        const __VLS_75 = {}.ElRadioGroup;
        /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
            modelValue: (__VLS_ctx.platformDraft.themeMode),
        }));
        const __VLS_77 = __VLS_76({
            modelValue: (__VLS_ctx.platformDraft.themeMode),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        __VLS_78.slots.default;
        const __VLS_79 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
            value: "light",
        }));
        const __VLS_81 = __VLS_80({
            value: "light",
        }, ...__VLS_functionalComponentArgsRest(__VLS_80));
        __VLS_82.slots.default;
        var __VLS_82;
        const __VLS_83 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
            value: "dark",
        }));
        const __VLS_85 = __VLS_84({
            value: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        __VLS_86.slots.default;
        var __VLS_86;
        const __VLS_87 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
            value: "auto",
        }));
        const __VLS_89 = __VLS_88({
            value: "auto",
        }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        __VLS_90.slots.default;
        var __VLS_90;
        var __VLS_78;
        var __VLS_74;
        const __VLS_91 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            label: "主色",
        }));
        const __VLS_93 = __VLS_92({
            label: "主色",
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        __VLS_94.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "color-row" },
        });
        const __VLS_95 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
            modelValue: (__VLS_ctx.platformDraft.primaryColor),
        }));
        const __VLS_97 = __VLS_96({
            modelValue: (__VLS_ctx.platformDraft.primaryColor),
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "color-presets" },
        });
        for (const [color] of __VLS_getVForSourceType((__VLS_ctx.PRIMARY_PRESETS))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.visibleSystemTabs.length))
                            return;
                        if (!(__VLS_ctx.hasSystemTab('settings')))
                            return;
                        __VLS_ctx.platformDraft.primaryColor = color;
                    } },
                key: (color),
                ...{ class: "color-dot" },
                ...{ class: ({ active: __VLS_ctx.platformDraft.primaryColor === color }) },
                ...{ style: ({ background: color }) },
            });
        }
        var __VLS_94;
        var __VLS_70;
        var __VLS_66;
        const __VLS_99 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
            shadow: "never",
            ...{ class: "settings-card" },
        }));
        const __VLS_101 = __VLS_100({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_100));
        __VLS_102.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_102.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
            const __VLS_103 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
                size: "small",
                type: "warning",
            }));
            const __VLS_105 = __VLS_104({
                size: "small",
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_104));
            __VLS_106.slots.default;
            var __VLS_106;
        }
        const __VLS_107 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form settings-form--grid" },
        }));
        const __VLS_109 = __VLS_108({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form settings-form--grid" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_108));
        __VLS_110.slots.default;
        const __VLS_111 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
            label: "密码最短长度",
        }));
        const __VLS_113 = __VLS_112({
            label: "密码最短长度",
        }, ...__VLS_functionalComponentArgsRest(__VLS_112));
        __VLS_114.slots.default;
        const __VLS_115 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
            modelValue: (__VLS_ctx.platformDraft.security.passwordMinLength),
            min: (4),
            max: (32),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_117 = __VLS_116({
            modelValue: (__VLS_ctx.platformDraft.security.passwordMinLength),
            min: (4),
            max: (32),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_116));
        var __VLS_114;
        const __VLS_119 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
            label: "密码强制混合字符",
        }));
        const __VLS_121 = __VLS_120({
            label: "密码强制混合字符",
        }, ...__VLS_functionalComponentArgsRest(__VLS_120));
        __VLS_122.slots.default;
        const __VLS_123 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
            modelValue: (__VLS_ctx.platformDraft.security.passwordRequireMixed),
            activeText: "开启",
            inactiveText: "关闭",
        }));
        const __VLS_125 = __VLS_124({
            modelValue: (__VLS_ctx.platformDraft.security.passwordRequireMixed),
            activeText: "开启",
            inactiveText: "关闭",
        }, ...__VLS_functionalComponentArgsRest(__VLS_124));
        var __VLS_122;
        const __VLS_127 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
            label: "登录失败锁定阈值",
        }));
        const __VLS_129 = __VLS_128({
            label: "登录失败锁定阈值",
        }, ...__VLS_functionalComponentArgsRest(__VLS_128));
        __VLS_130.slots.default;
        const __VLS_131 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
            modelValue: (__VLS_ctx.platformDraft.security.loginMaxFailures),
            min: (1),
            max: (20),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_133 = __VLS_132({
            modelValue: (__VLS_ctx.platformDraft.security.loginMaxFailures),
            min: (1),
            max: (20),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_132));
        var __VLS_130;
        const __VLS_135 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
            label: "锁定时长（分钟）",
        }));
        const __VLS_137 = __VLS_136({
            label: "锁定时长（分钟）",
        }, ...__VLS_functionalComponentArgsRest(__VLS_136));
        __VLS_138.slots.default;
        const __VLS_139 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
            modelValue: (__VLS_ctx.platformDraft.security.loginLockMinutes),
            min: (1),
            max: (1440),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_141 = __VLS_140({
            modelValue: (__VLS_ctx.platformDraft.security.loginLockMinutes),
            min: (1),
            max: (1440),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_140));
        var __VLS_138;
        const __VLS_143 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
            label: "会话超时（分钟）",
        }));
        const __VLS_145 = __VLS_144({
            label: "会话超时（分钟）",
        }, ...__VLS_functionalComponentArgsRest(__VLS_144));
        __VLS_146.slots.default;
        const __VLS_147 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
            modelValue: (__VLS_ctx.platformDraft.security.sessionTimeoutMinutes),
            min: (10),
            max: (2880),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_149 = __VLS_148({
            modelValue: (__VLS_ctx.platformDraft.security.sessionTimeoutMinutes),
            min: (10),
            max: (2880),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_148));
        var __VLS_146;
        var __VLS_110;
        var __VLS_102;
        const __VLS_151 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
            shadow: "never",
            ...{ class: "settings-card" },
        }));
        const __VLS_153 = __VLS_152({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_152));
        __VLS_154.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_154.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
        }
        const __VLS_155 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form settings-form--grid" },
        }));
        const __VLS_157 = __VLS_156({
            labelPosition: "top",
            size: "small",
            ...{ class: "settings-form settings-form--grid" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_156));
        __VLS_158.slots.default;
        const __VLS_159 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
            label: "数据预览行数上限",
        }));
        const __VLS_161 = __VLS_160({
            label: "数据预览行数上限",
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
        __VLS_162.slots.default;
        const __VLS_163 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.previewLimit),
            min: (10),
            max: (10000),
            step: (10),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_165 = __VLS_164({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.previewLimit),
            min: (10),
            max: (10000),
            step: (10),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_164));
        var __VLS_162;
        const __VLS_167 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
            label: "查询超时（秒）",
        }));
        const __VLS_169 = __VLS_168({
            label: "查询超时（秒）",
        }, ...__VLS_functionalComponentArgsRest(__VLS_168));
        __VLS_170.slots.default;
        const __VLS_171 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.queryTimeoutSeconds),
            min: (5),
            max: (600),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_173 = __VLS_172({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.queryTimeoutSeconds),
            min: (5),
            max: (600),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_172));
        var __VLS_170;
        const __VLS_175 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
            label: "启用查询缓存",
        }));
        const __VLS_177 = __VLS_176({
            label: "启用查询缓存",
        }, ...__VLS_functionalComponentArgsRest(__VLS_176));
        __VLS_178.slots.default;
        const __VLS_179 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.enableQueryCache),
            activeText: "开启",
            inactiveText: "关闭",
        }));
        const __VLS_181 = __VLS_180({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.enableQueryCache),
            activeText: "开启",
            inactiveText: "关闭",
        }, ...__VLS_functionalComponentArgsRest(__VLS_180));
        var __VLS_178;
        const __VLS_183 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
            label: "缓存有效期（分钟）",
        }));
        const __VLS_185 = __VLS_184({
            label: "缓存有效期（分钟）",
        }, ...__VLS_functionalComponentArgsRest(__VLS_184));
        __VLS_186.slots.default;
        const __VLS_187 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.cacheMinutes),
            min: (1),
            max: (1440),
            disabled: (!__VLS_ctx.platformDraft.dataDefaults.enableQueryCache),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_189 = __VLS_188({
            modelValue: (__VLS_ctx.platformDraft.dataDefaults.cacheMinutes),
            min: (1),
            max: (1440),
            disabled: (!__VLS_ctx.platformDraft.dataDefaults.enableQueryCache),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_188));
        var __VLS_186;
        var __VLS_158;
        var __VLS_154;
        const __VLS_191 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
            shadow: "never",
            ...{ class: "settings-card" },
        }));
        const __VLS_193 = __VLS_192({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_192));
        __VLS_194.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_194.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
            const __VLS_195 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
                type: "success",
                size: "small",
            }));
            const __VLS_197 = __VLS_196({
                type: "success",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_196));
            __VLS_198.slots.default;
            var __VLS_198;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "menu-chip-list" },
        });
        for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.visibleSystemTabs))) {
            const __VLS_199 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
                key: (tab.path),
                size: "small",
                effect: "plain",
            }));
            const __VLS_201 = __VLS_200({
                key: (tab.path),
                size: "small",
                effect: "plain",
            }, ...__VLS_functionalComponentArgsRest(__VLS_200));
            __VLS_202.slots.default;
            (tab.label);
            var __VLS_202;
        }
        const __VLS_203 = {}.ElAlert;
        /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
        // @ts-ignore
        const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
            title: "角色管理与菜单权限管理已拆分为独立 Tab，可在本页直接配置授权与菜单结构。",
            type: "info",
            closable: (false),
            ...{ style: {} },
        }));
        const __VLS_205 = __VLS_204({
            title: "角色管理与菜单权限管理已拆分为独立 Tab，可在本页直接配置授权与菜单结构。",
            type: "info",
            closable: (false),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_204));
        var __VLS_194;
        const __VLS_207 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
            shadow: "never",
            ...{ class: "settings-card" },
        }));
        const __VLS_209 = __VLS_208({
            shadow: "never",
            ...{ class: "settings-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_208));
        __VLS_210.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_210.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-subtitle" },
            });
            const __VLS_211 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
                ...{ 'onClick': {} },
                size: "small",
            }));
            const __VLS_213 = __VLS_212({
                ...{ 'onClick': {} },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_212));
            let __VLS_215;
            let __VLS_216;
            let __VLS_217;
            const __VLS_218 = {
                onClick: (__VLS_ctx.refreshSessionMenus)
            };
            __VLS_214.slots.default;
            var __VLS_214;
        }
        const __VLS_219 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
            border: true,
            column: (1),
            size: "small",
        }));
        const __VLS_221 = __VLS_220({
            border: true,
            column: (1),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_220));
        __VLS_222.slots.default;
        const __VLS_223 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
            label: "菜单来源",
        }));
        const __VLS_225 = __VLS_224({
            label: "菜单来源",
        }, ...__VLS_functionalComponentArgsRest(__VLS_224));
        __VLS_226.slots.default;
        var __VLS_226;
        const __VLS_227 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
            label: "当前服务",
        }));
        const __VLS_229 = __VLS_228({
            label: "当前服务",
        }, ...__VLS_functionalComponentArgsRest(__VLS_228));
        __VLS_230.slots.default;
        (__VLS_ctx.health.service || '未知');
        var __VLS_230;
        const __VLS_231 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
            label: "服务状态",
        }));
        const __VLS_233 = __VLS_232({
            label: "服务状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_232));
        __VLS_234.slots.default;
        const __VLS_235 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }));
        const __VLS_237 = __VLS_236({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        __VLS_238.slots.default;
        (__VLS_ctx.health.status || '未知');
        var __VLS_238;
        var __VLS_234;
        const __VLS_239 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
            label: "系统根菜单数",
        }));
        const __VLS_241 = __VLS_240({
            label: "系统根菜单数",
        }, ...__VLS_functionalComponentArgsRest(__VLS_240));
        __VLS_242.slots.default;
        (__VLS_ctx.rootMenuCount);
        var __VLS_242;
        const __VLS_243 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
            label: "浏览器",
        }));
        const __VLS_245 = __VLS_244({
            label: "浏览器",
        }, ...__VLS_functionalComponentArgsRest(__VLS_244));
        __VLS_246.slots.default;
        (__VLS_ctx.browserInfo);
        var __VLS_246;
        const __VLS_247 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
            label: "分辨率",
        }));
        const __VLS_249 = __VLS_248({
            label: "分辨率",
        }, ...__VLS_functionalComponentArgsRest(__VLS_248));
        __VLS_250.slots.default;
        (__VLS_ctx.screenInfo);
        var __VLS_250;
        var __VLS_222;
        var __VLS_210;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-actions" },
        });
        const __VLS_251 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
            ...{ 'onClick': {} },
        }));
        const __VLS_253 = __VLS_252({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_252));
        let __VLS_255;
        let __VLS_256;
        let __VLS_257;
        const __VLS_258 = {
            onClick: (__VLS_ctx.resetSettingsDraft)
        };
        __VLS_254.slots.default;
        var __VLS_254;
        const __VLS_259 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.settingsSaving),
        }));
        const __VLS_261 = __VLS_260({
            ...{ 'onClick': {} },
            type: "primary",
            loading: (__VLS_ctx.settingsSaving),
        }, ...__VLS_functionalComponentArgsRest(__VLS_260));
        let __VLS_263;
        let __VLS_264;
        let __VLS_265;
        const __VLS_266 = {
            onClick: (__VLS_ctx.saveSettingsDraft)
        };
        __VLS_262.slots.default;
        var __VLS_262;
        var __VLS_18;
    }
    if (__VLS_ctx.hasSystemTab('users')) {
        const __VLS_267 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
            label: "用户管理",
            name: "users",
        }));
        const __VLS_269 = __VLS_268({
            label: "用户管理",
            name: "users",
        }, ...__VLS_functionalComponentArgsRest(__VLS_268));
        __VLS_270.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-title" },
        });
        const __VLS_271 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
            modelValue: (__VLS_ctx.userSearch),
            placeholder: "搜索用户名/显示名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_273 = __VLS_272({
            modelValue: (__VLS_ctx.userSearch),
            placeholder: "搜索用户名/显示名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_272));
        const __VLS_275 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
            modelValue: (__VLS_ctx.userRoleFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }));
        const __VLS_277 = __VLS_276({
            modelValue: (__VLS_ctx.userRoleFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_276));
        __VLS_278.slots.default;
        const __VLS_279 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
            value: "ALL",
            label: "全部角色",
        }));
        const __VLS_281 = __VLS_280({
            value: "ALL",
            label: "全部角色",
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
        const __VLS_283 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
            value: "ADMIN",
            label: "管理员",
        }));
        const __VLS_285 = __VLS_284({
            value: "ADMIN",
            label: "管理员",
        }, ...__VLS_functionalComponentArgsRest(__VLS_284));
        const __VLS_287 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
            value: "ANALYST",
            label: "分析师",
        }));
        const __VLS_289 = __VLS_288({
            value: "ANALYST",
            label: "分析师",
        }, ...__VLS_functionalComponentArgsRest(__VLS_288));
        const __VLS_291 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
            value: "VIEWER",
            label: "查看者",
        }));
        const __VLS_293 = __VLS_292({
            value: "VIEWER",
            label: "查看者",
        }, ...__VLS_functionalComponentArgsRest(__VLS_292));
        var __VLS_278;
        const __VLS_295 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }));
        const __VLS_297 = __VLS_296({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_296));
        let __VLS_299;
        let __VLS_300;
        let __VLS_301;
        const __VLS_302 = {
            onClick: (__VLS_ctx.openCreate)
        };
        __VLS_298.slots.default;
        var __VLS_298;
        const __VLS_303 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
            data: (__VLS_ctx.filteredUsers),
            border: true,
            size: "small",
        }));
        const __VLS_305 = __VLS_304({
            data: (__VLS_ctx.filteredUsers),
            border: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_304));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.usersLoading) }, null, null);
        __VLS_306.slots.default;
        const __VLS_307 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
            prop: "id",
            label: "ID",
            width: "60",
        }));
        const __VLS_309 = __VLS_308({
            prop: "id",
            label: "ID",
            width: "60",
        }, ...__VLS_functionalComponentArgsRest(__VLS_308));
        const __VLS_311 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
            prop: "username",
            label: "用户名",
            minWidth: "120",
        }));
        const __VLS_313 = __VLS_312({
            prop: "username",
            label: "用户名",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_312));
        const __VLS_315 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
            prop: "displayName",
            label: "显示名",
            minWidth: "120",
        }));
        const __VLS_317 = __VLS_316({
            prop: "displayName",
            label: "显示名",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_316));
        const __VLS_319 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_320 = __VLS_asFunctionalComponent(__VLS_319, new __VLS_319({
            label: "角色",
            width: "110",
        }));
        const __VLS_321 = __VLS_320({
            label: "角色",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_320));
        __VLS_322.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_322.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_323 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
                type: (__VLS_ctx.roleTagType(row.role)),
                size: "small",
            }));
            const __VLS_325 = __VLS_324({
                type: (__VLS_ctx.roleTagType(row.role)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_324));
            __VLS_326.slots.default;
            (__VLS_ctx.roleLabel(row.role));
            var __VLS_326;
        }
        var __VLS_322;
        const __VLS_327 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
            prop: "email",
            label: "邮箱",
            minWidth: "160",
            showOverflowTooltip: true,
        }));
        const __VLS_329 = __VLS_328({
            prop: "email",
            label: "邮箱",
            minWidth: "160",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_328));
        const __VLS_331 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
            prop: "createdAt",
            label: "创建时间",
            minWidth: "160",
        }));
        const __VLS_333 = __VLS_332({
            prop: "createdAt",
            label: "创建时间",
            minWidth: "160",
        }, ...__VLS_functionalComponentArgsRest(__VLS_332));
        const __VLS_335 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_336 = __VLS_asFunctionalComponent(__VLS_335, new __VLS_335({
            label: "操作",
            width: "140",
            fixed: "right",
        }));
        const __VLS_337 = __VLS_336({
            label: "操作",
            width: "140",
            fixed: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_336));
        __VLS_338.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_338.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_339 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_341 = __VLS_340({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_340));
            let __VLS_343;
            let __VLS_344;
            let __VLS_345;
            const __VLS_346 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.openEdit(row);
                }
            };
            __VLS_342.slots.default;
            var __VLS_342;
            const __VLS_347 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
                ...{ 'onConfirm': {} },
                title: "确认删除该用户？",
            }));
            const __VLS_349 = __VLS_348({
                ...{ 'onConfirm': {} },
                title: "确认删除该用户？",
            }, ...__VLS_functionalComponentArgsRest(__VLS_348));
            let __VLS_351;
            let __VLS_352;
            let __VLS_353;
            const __VLS_354 = {
                onConfirm: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.handleDelete(row.id);
                }
            };
            __VLS_350.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_350.slots;
                const __VLS_355 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
                    link: true,
                    type: "danger",
                }));
                const __VLS_357 = __VLS_356({
                    link: true,
                    type: "danger",
                }, ...__VLS_functionalComponentArgsRest(__VLS_356));
                __VLS_358.slots.default;
                var __VLS_358;
            }
            var __VLS_350;
        }
        var __VLS_338;
        var __VLS_306;
        const __VLS_359 = {}.ElDialog;
        /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
        // @ts-ignore
        const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
            modelValue: (__VLS_ctx.userDialogVisible),
            title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
            width: "480px",
            destroyOnClose: true,
        }));
        const __VLS_361 = __VLS_360({
            modelValue: (__VLS_ctx.userDialogVisible),
            title: (__VLS_ctx.editId ? '编辑用户' : '新建用户'),
            width: "480px",
            destroyOnClose: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_360));
        __VLS_362.slots.default;
        const __VLS_363 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
            ref: "userFormRef",
            model: (__VLS_ctx.userForm),
            rules: (__VLS_ctx.userRules),
            labelWidth: "90px",
        }));
        const __VLS_365 = __VLS_364({
            ref: "userFormRef",
            model: (__VLS_ctx.userForm),
            rules: (__VLS_ctx.userRules),
            labelWidth: "90px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_364));
        /** @type {typeof __VLS_ctx.userFormRef} */ ;
        var __VLS_367 = {};
        __VLS_366.slots.default;
        const __VLS_369 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
            label: "用户名",
            prop: "username",
        }));
        const __VLS_371 = __VLS_370({
            label: "用户名",
            prop: "username",
        }, ...__VLS_functionalComponentArgsRest(__VLS_370));
        __VLS_372.slots.default;
        const __VLS_373 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
            modelValue: (__VLS_ctx.userForm.username),
            disabled: (!!__VLS_ctx.editId),
            placeholder: "登录用户名",
        }));
        const __VLS_375 = __VLS_374({
            modelValue: (__VLS_ctx.userForm.username),
            disabled: (!!__VLS_ctx.editId),
            placeholder: "登录用户名",
        }, ...__VLS_functionalComponentArgsRest(__VLS_374));
        var __VLS_372;
        const __VLS_377 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
            label: "显示名",
            prop: "displayName",
        }));
        const __VLS_379 = __VLS_378({
            label: "显示名",
            prop: "displayName",
        }, ...__VLS_functionalComponentArgsRest(__VLS_378));
        __VLS_380.slots.default;
        const __VLS_381 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
            modelValue: (__VLS_ctx.userForm.displayName),
            placeholder: "显示名称",
        }));
        const __VLS_383 = __VLS_382({
            modelValue: (__VLS_ctx.userForm.displayName),
            placeholder: "显示名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_382));
        var __VLS_380;
        const __VLS_385 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
            label: "角色",
            prop: "role",
        }));
        const __VLS_387 = __VLS_386({
            label: "角色",
            prop: "role",
        }, ...__VLS_functionalComponentArgsRest(__VLS_386));
        __VLS_388.slots.default;
        const __VLS_389 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
            modelValue: (__VLS_ctx.userForm.role),
            ...{ style: {} },
        }));
        const __VLS_391 = __VLS_390({
            modelValue: (__VLS_ctx.userForm.role),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_390));
        __VLS_392.slots.default;
        const __VLS_393 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_394 = __VLS_asFunctionalComponent(__VLS_393, new __VLS_393({
            value: "ADMIN",
            label: "管理员",
        }));
        const __VLS_395 = __VLS_394({
            value: "ADMIN",
            label: "管理员",
        }, ...__VLS_functionalComponentArgsRest(__VLS_394));
        const __VLS_397 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_398 = __VLS_asFunctionalComponent(__VLS_397, new __VLS_397({
            value: "ANALYST",
            label: "分析师",
        }));
        const __VLS_399 = __VLS_398({
            value: "ANALYST",
            label: "分析师",
        }, ...__VLS_functionalComponentArgsRest(__VLS_398));
        const __VLS_401 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_402 = __VLS_asFunctionalComponent(__VLS_401, new __VLS_401({
            value: "VIEWER",
            label: "查看者",
        }));
        const __VLS_403 = __VLS_402({
            value: "VIEWER",
            label: "查看者",
        }, ...__VLS_functionalComponentArgsRest(__VLS_402));
        var __VLS_392;
        var __VLS_388;
        const __VLS_405 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_406 = __VLS_asFunctionalComponent(__VLS_405, new __VLS_405({
            label: "邮箱",
        }));
        const __VLS_407 = __VLS_406({
            label: "邮箱",
        }, ...__VLS_functionalComponentArgsRest(__VLS_406));
        __VLS_408.slots.default;
        const __VLS_409 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
            modelValue: (__VLS_ctx.userForm.email),
            placeholder: "可选",
        }));
        const __VLS_411 = __VLS_410({
            modelValue: (__VLS_ctx.userForm.email),
            placeholder: "可选",
        }, ...__VLS_functionalComponentArgsRest(__VLS_410));
        var __VLS_408;
        const __VLS_413 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
            label: (__VLS_ctx.editId ? '新密码' : '密码'),
        }));
        const __VLS_415 = __VLS_414({
            label: (__VLS_ctx.editId ? '新密码' : '密码'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_414));
        __VLS_416.slots.default;
        const __VLS_417 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_418 = __VLS_asFunctionalComponent(__VLS_417, new __VLS_417({
            modelValue: (__VLS_ctx.userForm.password),
            type: "password",
            showPassword: true,
            placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
        }));
        const __VLS_419 = __VLS_418({
            modelValue: (__VLS_ctx.userForm.password),
            type: "password",
            showPassword: true,
            placeholder: (__VLS_ctx.editId ? '留空不修改' : '请输入密码'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_418));
        var __VLS_416;
        var __VLS_366;
        {
            const { footer: __VLS_thisSlot } = __VLS_362.slots;
            const __VLS_421 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
                ...{ 'onClick': {} },
            }));
            const __VLS_423 = __VLS_422({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_422));
            let __VLS_425;
            let __VLS_426;
            let __VLS_427;
            const __VLS_428 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('users')))
                        return;
                    __VLS_ctx.userDialogVisible = false;
                }
            };
            __VLS_424.slots.default;
            var __VLS_424;
            const __VLS_429 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_430 = __VLS_asFunctionalComponent(__VLS_429, new __VLS_429({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.userSaving),
            }));
            const __VLS_431 = __VLS_430({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.userSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_430));
            let __VLS_433;
            let __VLS_434;
            let __VLS_435;
            const __VLS_436 = {
                onClick: (__VLS_ctx.handleUserSubmit)
            };
            __VLS_432.slots.default;
            var __VLS_432;
        }
        var __VLS_362;
        var __VLS_270;
    }
    if (__VLS_ctx.hasSystemTab('roles')) {
        const __VLS_437 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_438 = __VLS_asFunctionalComponent(__VLS_437, new __VLS_437({
            label: "角色管理",
            name: "roles",
        }));
        const __VLS_439 = __VLS_438({
            label: "角色管理",
            name: "roles",
        }, ...__VLS_functionalComponentArgsRest(__VLS_438));
        __VLS_440.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "role-layout" },
        });
        const __VLS_441 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_442 = __VLS_asFunctionalComponent(__VLS_441, new __VLS_441({
            shadow: "never",
            ...{ class: "role-list-card" },
        }));
        const __VLS_443 = __VLS_442({
            shadow: "never",
            ...{ class: "role-list-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_442));
        __VLS_444.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_444.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_445 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_446 = __VLS_asFunctionalComponent(__VLS_445, new __VLS_445({
                ...{ 'onClick': {} },
                size: "small",
            }));
            const __VLS_447 = __VLS_446({
                ...{ 'onClick': {} },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_446));
            let __VLS_449;
            let __VLS_450;
            let __VLS_451;
            const __VLS_452 = {
                onClick: (__VLS_ctx.loadRoles)
            };
            __VLS_448.slots.default;
            var __VLS_448;
        }
        const __VLS_453 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_454 = __VLS_asFunctionalComponent(__VLS_453, new __VLS_453({
            ...{ 'onRowClick': {} },
            data: (__VLS_ctx.roles),
            border: true,
            size: "small",
            highlightCurrentRow: true,
            rowClassName: (__VLS_ctx.roleRowClassName),
        }));
        const __VLS_455 = __VLS_454({
            ...{ 'onRowClick': {} },
            data: (__VLS_ctx.roles),
            border: true,
            size: "small",
            highlightCurrentRow: true,
            rowClassName: (__VLS_ctx.roleRowClassName),
        }, ...__VLS_functionalComponentArgsRest(__VLS_454));
        let __VLS_457;
        let __VLS_458;
        let __VLS_459;
        const __VLS_460 = {
            onRowClick: (__VLS_ctx.handleRoleSelect)
        };
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.rolesLoading) }, null, null);
        __VLS_456.slots.default;
        const __VLS_461 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_462 = __VLS_asFunctionalComponent(__VLS_461, new __VLS_461({
            prop: "name",
            label: "角色",
            minWidth: "120",
        }));
        const __VLS_463 = __VLS_462({
            prop: "name",
            label: "角色",
            minWidth: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_462));
        __VLS_464.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_464.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_465 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_466 = __VLS_asFunctionalComponent(__VLS_465, new __VLS_465({
                type: (__VLS_ctx.roleTagType(row.name)),
                size: "small",
            }));
            const __VLS_467 = __VLS_466({
                type: (__VLS_ctx.roleTagType(row.name)),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_466));
            __VLS_468.slots.default;
            (__VLS_ctx.roleLabel(row.name));
            var __VLS_468;
        }
        var __VLS_464;
        const __VLS_469 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_470 = __VLS_asFunctionalComponent(__VLS_469, new __VLS_469({
            prop: "userCount",
            label: "用户数",
            width: "90",
        }));
        const __VLS_471 = __VLS_470({
            prop: "userCount",
            label: "用户数",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_470));
        const __VLS_473 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_474 = __VLS_asFunctionalComponent(__VLS_473, new __VLS_473({
            prop: "menuCount",
            label: "菜单数",
            width: "90",
        }));
        const __VLS_475 = __VLS_474({
            prop: "menuCount",
            label: "菜单数",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_474));
        var __VLS_456;
        var __VLS_444;
        const __VLS_477 = {}.ElCard;
        /** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
        // @ts-ignore
        const __VLS_478 = __VLS_asFunctionalComponent(__VLS_477, new __VLS_477({
            shadow: "never",
            ...{ class: "role-permission-card" },
        }));
        const __VLS_479 = __VLS_478({
            shadow: "never",
            ...{ class: "role-permission-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_478));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.menusLoading || __VLS_ctx.roleMenuLoading) }, null, null);
        __VLS_480.slots.default;
        {
            const { header: __VLS_thisSlot } = __VLS_480.slots;
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
            const __VLS_481 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_482 = __VLS_asFunctionalComponent(__VLS_481, new __VLS_481({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
                disabled: (!__VLS_ctx.selectedRole),
                loading: (__VLS_ctx.roleMenuSaving),
            }));
            const __VLS_483 = __VLS_482({
                ...{ 'onClick': {} },
                type: "primary",
                size: "small",
                disabled: (!__VLS_ctx.selectedRole),
                loading: (__VLS_ctx.roleMenuSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_482));
            let __VLS_485;
            let __VLS_486;
            let __VLS_487;
            const __VLS_488 = {
                onClick: (__VLS_ctx.handleRoleMenuSave)
            };
            __VLS_484.slots.default;
            var __VLS_484;
        }
        if (__VLS_ctx.selectedRole) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "role-summary" },
            });
            const __VLS_489 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_490 = __VLS_asFunctionalComponent(__VLS_489, new __VLS_489({
                type: (__VLS_ctx.roleTagType(__VLS_ctx.selectedRole.name)),
            }));
            const __VLS_491 = __VLS_490({
                type: (__VLS_ctx.roleTagType(__VLS_ctx.selectedRole.name)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_490));
            __VLS_492.slots.default;
            (__VLS_ctx.roleLabel(__VLS_ctx.selectedRole.name));
            var __VLS_492;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedRole.userCount);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedRoleMenuIds.length);
        }
        const __VLS_493 = {}.ElTree;
        /** @type {[typeof __VLS_components.ElTree, typeof __VLS_components.elTree, typeof __VLS_components.ElTree, typeof __VLS_components.elTree, ]} */ ;
        // @ts-ignore
        const __VLS_494 = __VLS_asFunctionalComponent(__VLS_493, new __VLS_493({
            ref: "roleMenuTreeRef",
            data: (__VLS_ctx.menuTree),
            nodeKey: "id",
            showCheckbox: true,
            defaultExpandAll: true,
            checkOnClickNode: true,
            props: (__VLS_ctx.treeProps),
            ...{ class: "role-menu-tree" },
        }));
        const __VLS_495 = __VLS_494({
            ref: "roleMenuTreeRef",
            data: (__VLS_ctx.menuTree),
            nodeKey: "id",
            showCheckbox: true,
            defaultExpandAll: true,
            checkOnClickNode: true,
            props: (__VLS_ctx.treeProps),
            ...{ class: "role-menu-tree" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_494));
        /** @type {typeof __VLS_ctx.roleMenuTreeRef} */ ;
        var __VLS_497 = {};
        __VLS_496.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_496.slots;
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
        var __VLS_496;
        var __VLS_480;
        var __VLS_440;
    }
    if (__VLS_ctx.hasSystemTab('menus')) {
        const __VLS_499 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_500 = __VLS_asFunctionalComponent(__VLS_499, new __VLS_499({
            label: "菜单权限管理",
            name: "menus",
        }));
        const __VLS_501 = __VLS_500({
            label: "菜单权限管理",
            name: "menus",
        }, ...__VLS_functionalComponentArgsRest(__VLS_500));
        __VLS_502.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tab-title" },
        });
        const __VLS_503 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_504 = __VLS_asFunctionalComponent(__VLS_503, new __VLS_503({
            size: "small",
            type: "info",
        }));
        const __VLS_505 = __VLS_504({
            size: "small",
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_504));
        __VLS_506.slots.default;
        (__VLS_ctx.totalMenuCount);
        var __VLS_506;
        const __VLS_507 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_508 = __VLS_asFunctionalComponent(__VLS_507, new __VLS_507({
            size: "small",
            type: "success",
        }));
        const __VLS_509 = __VLS_508({
            size: "small",
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_508));
        __VLS_510.slots.default;
        (__VLS_ctx.visibleMenuCount);
        var __VLS_510;
        const __VLS_511 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_512 = __VLS_asFunctionalComponent(__VLS_511, new __VLS_511({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }));
        const __VLS_513 = __VLS_512({
            ...{ 'onClick': {} },
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_512));
        let __VLS_515;
        let __VLS_516;
        let __VLS_517;
        const __VLS_518 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.visibleSystemTabs.length))
                    return;
                if (!(__VLS_ctx.hasSystemTab('menus')))
                    return;
                __VLS_ctx.openCreateMenu();
            }
        };
        __VLS_514.slots.default;
        var __VLS_514;
        const __VLS_519 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_520 = __VLS_asFunctionalComponent(__VLS_519, new __VLS_519({
            data: (__VLS_ctx.menuTree),
            border: true,
            size: "small",
            rowKey: "id",
            defaultExpandAll: true,
            treeProps: (__VLS_ctx.treeProps),
        }));
        const __VLS_521 = __VLS_520({
            data: (__VLS_ctx.menuTree),
            border: true,
            size: "small",
            rowKey: "id",
            defaultExpandAll: true,
            treeProps: (__VLS_ctx.treeProps),
        }, ...__VLS_functionalComponentArgsRest(__VLS_520));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.menusLoading) }, null, null);
        __VLS_522.slots.default;
        const __VLS_523 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_524 = __VLS_asFunctionalComponent(__VLS_523, new __VLS_523({
            label: "菜单名称",
            minWidth: "190",
        }));
        const __VLS_525 = __VLS_524({
            label: "菜单名称",
            minWidth: "190",
        }, ...__VLS_functionalComponentArgsRest(__VLS_524));
        __VLS_526.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_526.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "menu-name-cell" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.menuDisplayLabel(row));
            const __VLS_527 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_528 = __VLS_asFunctionalComponent(__VLS_527, new __VLS_527({
                size: "small",
                type: (row.type === 'catalog' ? 'warning' : 'success'),
            }));
            const __VLS_529 = __VLS_528({
                size: "small",
                type: (row.type === 'catalog' ? 'warning' : 'success'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_528));
            __VLS_530.slots.default;
            (row.type === 'catalog' ? '目录' : '菜单');
            var __VLS_530;
        }
        var __VLS_526;
        const __VLS_531 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_532 = __VLS_asFunctionalComponent(__VLS_531, new __VLS_531({
            prop: "path",
            label: "路由路径",
            minWidth: "200",
            showOverflowTooltip: true,
        }));
        const __VLS_533 = __VLS_532({
            prop: "path",
            label: "路由路径",
            minWidth: "200",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_532));
        const __VLS_535 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_536 = __VLS_asFunctionalComponent(__VLS_535, new __VLS_535({
            prop: "permission",
            label: "权限标识",
            minWidth: "160",
            showOverflowTooltip: true,
        }));
        const __VLS_537 = __VLS_536({
            prop: "permission",
            label: "权限标识",
            minWidth: "160",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_536));
        const __VLS_539 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_540 = __VLS_asFunctionalComponent(__VLS_539, new __VLS_539({
            prop: "component",
            label: "组件",
            minWidth: "140",
            showOverflowTooltip: true,
        }));
        const __VLS_541 = __VLS_540({
            prop: "component",
            label: "组件",
            minWidth: "140",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_540));
        const __VLS_543 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_544 = __VLS_asFunctionalComponent(__VLS_543, new __VLS_543({
            prop: "icon",
            label: "图标",
            width: "100",
        }));
        const __VLS_545 = __VLS_544({
            prop: "icon",
            label: "图标",
            width: "100",
        }, ...__VLS_functionalComponentArgsRest(__VLS_544));
        const __VLS_547 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_548 = __VLS_asFunctionalComponent(__VLS_547, new __VLS_547({
            prop: "sort",
            label: "排序",
            width: "80",
        }));
        const __VLS_549 = __VLS_548({
            prop: "sort",
            label: "排序",
            width: "80",
        }, ...__VLS_functionalComponentArgsRest(__VLS_548));
        const __VLS_551 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_552 = __VLS_asFunctionalComponent(__VLS_551, new __VLS_551({
            label: "可见",
            width: "90",
        }));
        const __VLS_553 = __VLS_552({
            label: "可见",
            width: "90",
        }, ...__VLS_functionalComponentArgsRest(__VLS_552));
        __VLS_554.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_554.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_555 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_556 = __VLS_asFunctionalComponent(__VLS_555, new __VLS_555({
                size: "small",
                type: (row.visible === false ? 'info' : 'success'),
            }));
            const __VLS_557 = __VLS_556({
                size: "small",
                type: (row.visible === false ? 'info' : 'success'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_556));
            __VLS_558.slots.default;
            (row.visible === false ? '隐藏' : '显示');
            var __VLS_558;
        }
        var __VLS_554;
        const __VLS_559 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_560 = __VLS_asFunctionalComponent(__VLS_559, new __VLS_559({
            label: "操作",
            width: "220",
            fixed: "right",
        }));
        const __VLS_561 = __VLS_560({
            label: "操作",
            width: "220",
            fixed: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_560));
        __VLS_562.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_562.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_563 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_564 = __VLS_asFunctionalComponent(__VLS_563, new __VLS_563({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_565 = __VLS_564({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_564));
            let __VLS_567;
            let __VLS_568;
            let __VLS_569;
            const __VLS_570 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.openCreateMenu(row);
                }
            };
            __VLS_566.slots.default;
            var __VLS_566;
            const __VLS_571 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_572 = __VLS_asFunctionalComponent(__VLS_571, new __VLS_571({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_573 = __VLS_572({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_572));
            let __VLS_575;
            let __VLS_576;
            let __VLS_577;
            const __VLS_578 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.openEditMenu(row);
                }
            };
            __VLS_574.slots.default;
            var __VLS_574;
            const __VLS_579 = {}.ElPopconfirm;
            /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_580 = __VLS_asFunctionalComponent(__VLS_579, new __VLS_579({
                ...{ 'onConfirm': {} },
                title: "确认删除该菜单？",
            }));
            const __VLS_581 = __VLS_580({
                ...{ 'onConfirm': {} },
                title: "确认删除该菜单？",
            }, ...__VLS_functionalComponentArgsRest(__VLS_580));
            let __VLS_583;
            let __VLS_584;
            let __VLS_585;
            const __VLS_586 = {
                onConfirm: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.handleMenuDelete(row.id);
                }
            };
            __VLS_582.slots.default;
            {
                const { reference: __VLS_thisSlot } = __VLS_582.slots;
                const __VLS_587 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_588 = __VLS_asFunctionalComponent(__VLS_587, new __VLS_587({
                    link: true,
                    type: "danger",
                }));
                const __VLS_589 = __VLS_588({
                    link: true,
                    type: "danger",
                }, ...__VLS_functionalComponentArgsRest(__VLS_588));
                __VLS_590.slots.default;
                var __VLS_590;
            }
            var __VLS_582;
        }
        var __VLS_562;
        var __VLS_522;
        const __VLS_591 = {}.ElDialog;
        /** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
        // @ts-ignore
        const __VLS_592 = __VLS_asFunctionalComponent(__VLS_591, new __VLS_591({
            modelValue: (__VLS_ctx.menuDialogVisible),
            title: (__VLS_ctx.editingMenuId ? '编辑菜单' : '新增菜单'),
            width: "560px",
            destroyOnClose: true,
        }));
        const __VLS_593 = __VLS_592({
            modelValue: (__VLS_ctx.menuDialogVisible),
            title: (__VLS_ctx.editingMenuId ? '编辑菜单' : '新增菜单'),
            width: "560px",
            destroyOnClose: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_592));
        __VLS_594.slots.default;
        const __VLS_595 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_596 = __VLS_asFunctionalComponent(__VLS_595, new __VLS_595({
            ref: "menuFormRef",
            model: (__VLS_ctx.menuForm),
            rules: (__VLS_ctx.menuRules),
            labelWidth: "100px",
        }));
        const __VLS_597 = __VLS_596({
            ref: "menuFormRef",
            model: (__VLS_ctx.menuForm),
            rules: (__VLS_ctx.menuRules),
            labelWidth: "100px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_596));
        /** @type {typeof __VLS_ctx.menuFormRef} */ ;
        var __VLS_599 = {};
        __VLS_598.slots.default;
        const __VLS_601 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_602 = __VLS_asFunctionalComponent(__VLS_601, new __VLS_601({
            label: "菜单名称",
            prop: "name",
        }));
        const __VLS_603 = __VLS_602({
            label: "菜单名称",
            prop: "name",
        }, ...__VLS_functionalComponentArgsRest(__VLS_602));
        __VLS_604.slots.default;
        const __VLS_605 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_606 = __VLS_asFunctionalComponent(__VLS_605, new __VLS_605({
            modelValue: (__VLS_ctx.menuForm.name),
            placeholder: "请输入菜单名称",
        }));
        const __VLS_607 = __VLS_606({
            modelValue: (__VLS_ctx.menuForm.name),
            placeholder: "请输入菜单名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_606));
        var __VLS_604;
        const __VLS_609 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_610 = __VLS_asFunctionalComponent(__VLS_609, new __VLS_609({
            label: "菜单类型",
        }));
        const __VLS_611 = __VLS_610({
            label: "菜单类型",
        }, ...__VLS_functionalComponentArgsRest(__VLS_610));
        __VLS_612.slots.default;
        const __VLS_613 = {}.ElRadioGroup;
        /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
        // @ts-ignore
        const __VLS_614 = __VLS_asFunctionalComponent(__VLS_613, new __VLS_613({
            modelValue: (__VLS_ctx.menuForm.type),
        }));
        const __VLS_615 = __VLS_614({
            modelValue: (__VLS_ctx.menuForm.type),
        }, ...__VLS_functionalComponentArgsRest(__VLS_614));
        __VLS_616.slots.default;
        const __VLS_617 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_618 = __VLS_asFunctionalComponent(__VLS_617, new __VLS_617({
            label: "menu",
        }));
        const __VLS_619 = __VLS_618({
            label: "menu",
        }, ...__VLS_functionalComponentArgsRest(__VLS_618));
        __VLS_620.slots.default;
        var __VLS_620;
        const __VLS_621 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_622 = __VLS_asFunctionalComponent(__VLS_621, new __VLS_621({
            label: "catalog",
        }));
        const __VLS_623 = __VLS_622({
            label: "catalog",
        }, ...__VLS_functionalComponentArgsRest(__VLS_622));
        __VLS_624.slots.default;
        var __VLS_624;
        var __VLS_616;
        var __VLS_612;
        const __VLS_625 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_626 = __VLS_asFunctionalComponent(__VLS_625, new __VLS_625({
            label: "上级菜单",
        }));
        const __VLS_627 = __VLS_626({
            label: "上级菜单",
        }, ...__VLS_functionalComponentArgsRest(__VLS_626));
        __VLS_628.slots.default;
        const __VLS_629 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_630 = __VLS_asFunctionalComponent(__VLS_629, new __VLS_629({
            modelValue: (__VLS_ctx.menuForm.parentId),
            clearable: true,
            placeholder: "顶级菜单",
            ...{ style: {} },
        }));
        const __VLS_631 = __VLS_630({
            modelValue: (__VLS_ctx.menuForm.parentId),
            clearable: true,
            placeholder: "顶级菜单",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_630));
        __VLS_632.slots.default;
        for (const [option] of __VLS_getVForSourceType((__VLS_ctx.parentMenuOptions))) {
            const __VLS_633 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_634 = __VLS_asFunctionalComponent(__VLS_633, new __VLS_633({
                key: (option.id),
                label: (option.label),
                value: (option.id),
            }));
            const __VLS_635 = __VLS_634({
                key: (option.id),
                label: (option.label),
                value: (option.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_634));
        }
        var __VLS_632;
        var __VLS_628;
        const __VLS_637 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_638 = __VLS_asFunctionalComponent(__VLS_637, new __VLS_637({
            label: "路由路径",
        }));
        const __VLS_639 = __VLS_638({
            label: "路由路径",
        }, ...__VLS_functionalComponentArgsRest(__VLS_638));
        __VLS_640.slots.default;
        const __VLS_641 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_642 = __VLS_asFunctionalComponent(__VLS_641, new __VLS_641({
            modelValue: (__VLS_ctx.menuForm.path),
            placeholder: "例如 /home/system/roles",
        }));
        const __VLS_643 = __VLS_642({
            modelValue: (__VLS_ctx.menuForm.path),
            placeholder: "例如 /home/system/roles",
        }, ...__VLS_functionalComponentArgsRest(__VLS_642));
        var __VLS_640;
        const __VLS_645 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_646 = __VLS_asFunctionalComponent(__VLS_645, new __VLS_645({
            label: "前端组件",
        }));
        const __VLS_647 = __VLS_646({
            label: "前端组件",
        }, ...__VLS_functionalComponentArgsRest(__VLS_646));
        __VLS_648.slots.default;
        const __VLS_649 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_650 = __VLS_asFunctionalComponent(__VLS_649, new __VLS_649({
            modelValue: (__VLS_ctx.menuForm.component),
            placeholder: "例如 SystemView",
        }));
        const __VLS_651 = __VLS_650({
            modelValue: (__VLS_ctx.menuForm.component),
            placeholder: "例如 SystemView",
        }, ...__VLS_functionalComponentArgsRest(__VLS_650));
        var __VLS_648;
        const __VLS_653 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_654 = __VLS_asFunctionalComponent(__VLS_653, new __VLS_653({
            label: "权限标识",
        }));
        const __VLS_655 = __VLS_654({
            label: "权限标识",
        }, ...__VLS_functionalComponentArgsRest(__VLS_654));
        __VLS_656.slots.default;
        const __VLS_657 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_658 = __VLS_asFunctionalComponent(__VLS_657, new __VLS_657({
            modelValue: (__VLS_ctx.menuForm.permission),
            placeholder: "例如 system:role",
        }));
        const __VLS_659 = __VLS_658({
            modelValue: (__VLS_ctx.menuForm.permission),
            placeholder: "例如 system:role",
        }, ...__VLS_functionalComponentArgsRest(__VLS_658));
        var __VLS_656;
        const __VLS_661 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_662 = __VLS_asFunctionalComponent(__VLS_661, new __VLS_661({
            label: "图标",
        }));
        const __VLS_663 = __VLS_662({
            label: "图标",
        }, ...__VLS_functionalComponentArgsRest(__VLS_662));
        __VLS_664.slots.default;
        const __VLS_665 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_666 = __VLS_asFunctionalComponent(__VLS_665, new __VLS_665({
            modelValue: (__VLS_ctx.menuForm.icon),
            placeholder: "例如 Menu / Setting",
        }));
        const __VLS_667 = __VLS_666({
            modelValue: (__VLS_ctx.menuForm.icon),
            placeholder: "例如 Menu / Setting",
        }, ...__VLS_functionalComponentArgsRest(__VLS_666));
        var __VLS_664;
        const __VLS_669 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_670 = __VLS_asFunctionalComponent(__VLS_669, new __VLS_669({
            label: "排序值",
        }));
        const __VLS_671 = __VLS_670({
            label: "排序值",
        }, ...__VLS_functionalComponentArgsRest(__VLS_670));
        __VLS_672.slots.default;
        const __VLS_673 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_674 = __VLS_asFunctionalComponent(__VLS_673, new __VLS_673({
            modelValue: (__VLS_ctx.menuForm.sort),
            min: (1),
            max: (999),
            ...{ style: {} },
        }));
        const __VLS_675 = __VLS_674({
            modelValue: (__VLS_ctx.menuForm.sort),
            min: (1),
            max: (999),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_674));
        var __VLS_672;
        const __VLS_677 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_678 = __VLS_asFunctionalComponent(__VLS_677, new __VLS_677({
            label: "显示状态",
        }));
        const __VLS_679 = __VLS_678({
            label: "显示状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_678));
        __VLS_680.slots.default;
        const __VLS_681 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_682 = __VLS_asFunctionalComponent(__VLS_681, new __VLS_681({
            modelValue: (__VLS_ctx.menuForm.visible),
            activeText: "显示",
            inactiveText: "隐藏",
        }));
        const __VLS_683 = __VLS_682({
            modelValue: (__VLS_ctx.menuForm.visible),
            activeText: "显示",
            inactiveText: "隐藏",
        }, ...__VLS_functionalComponentArgsRest(__VLS_682));
        var __VLS_680;
        var __VLS_598;
        {
            const { footer: __VLS_thisSlot } = __VLS_594.slots;
            const __VLS_685 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_686 = __VLS_asFunctionalComponent(__VLS_685, new __VLS_685({
                ...{ 'onClick': {} },
            }));
            const __VLS_687 = __VLS_686({
                ...{ 'onClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_686));
            let __VLS_689;
            let __VLS_690;
            let __VLS_691;
            const __VLS_692 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.visibleSystemTabs.length))
                        return;
                    if (!(__VLS_ctx.hasSystemTab('menus')))
                        return;
                    __VLS_ctx.menuDialogVisible = false;
                }
            };
            __VLS_688.slots.default;
            var __VLS_688;
            const __VLS_693 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_694 = __VLS_asFunctionalComponent(__VLS_693, new __VLS_693({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.menuSaving),
            }));
            const __VLS_695 = __VLS_694({
                ...{ 'onClick': {} },
                type: "primary",
                loading: (__VLS_ctx.menuSaving),
            }, ...__VLS_functionalComponentArgsRest(__VLS_694));
            let __VLS_697;
            let __VLS_698;
            let __VLS_699;
            const __VLS_700 = {
                onClick: (__VLS_ctx.handleMenuSubmit)
            };
            __VLS_696.slots.default;
            var __VLS_696;
        }
        var __VLS_594;
        var __VLS_502;
    }
    if (__VLS_ctx.hasSystemTab('audit')) {
        const __VLS_701 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_702 = __VLS_asFunctionalComponent(__VLS_701, new __VLS_701({
            label: "审计日志",
            name: "audit",
        }));
        const __VLS_703 = __VLS_702({
            label: "审计日志",
            name: "audit",
        }, ...__VLS_functionalComponentArgsRest(__VLS_702));
        __VLS_704.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        const __VLS_705 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_706 = __VLS_asFunctionalComponent(__VLS_705, new __VLS_705({
            modelValue: (__VLS_ctx.logSearch),
            placeholder: "搜索用户/操作",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_707 = __VLS_706({
            modelValue: (__VLS_ctx.logSearch),
            placeholder: "搜索用户/操作",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_706));
        const __VLS_709 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_710 = __VLS_asFunctionalComponent(__VLS_709, new __VLS_709({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_711 = __VLS_710({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_710));
        let __VLS_713;
        let __VLS_714;
        let __VLS_715;
        const __VLS_716 = {
            onClick: (__VLS_ctx.loadLogs)
        };
        __VLS_712.slots.default;
        var __VLS_712;
        const __VLS_717 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_718 = __VLS_asFunctionalComponent(__VLS_717, new __VLS_717({
            data: (__VLS_ctx.filteredLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }));
        const __VLS_719 = __VLS_718({
            data: (__VLS_ctx.filteredLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }, ...__VLS_functionalComponentArgsRest(__VLS_718));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.logsLoading) }, null, null);
        __VLS_720.slots.default;
        const __VLS_721 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_722 = __VLS_asFunctionalComponent(__VLS_721, new __VLS_721({
            prop: "createdAt",
            label: "时间",
            width: "165",
        }));
        const __VLS_723 = __VLS_722({
            prop: "createdAt",
            label: "时间",
            width: "165",
        }, ...__VLS_functionalComponentArgsRest(__VLS_722));
        const __VLS_725 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_726 = __VLS_asFunctionalComponent(__VLS_725, new __VLS_725({
            prop: "username",
            label: "用户",
            width: "100",
        }));
        const __VLS_727 = __VLS_726({
            prop: "username",
            label: "用户",
            width: "100",
        }, ...__VLS_functionalComponentArgsRest(__VLS_726));
        const __VLS_729 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_730 = __VLS_asFunctionalComponent(__VLS_729, new __VLS_729({
            label: "操作",
            width: "120",
        }));
        const __VLS_731 = __VLS_730({
            label: "操作",
            width: "120",
        }, ...__VLS_functionalComponentArgsRest(__VLS_730));
        __VLS_732.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_732.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_733 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_734 = __VLS_asFunctionalComponent(__VLS_733, new __VLS_733({
                size: "small",
                type: (__VLS_ctx.actionTagType(row.action)),
            }));
            const __VLS_735 = __VLS_734({
                size: "small",
                type: (__VLS_ctx.actionTagType(row.action)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_734));
            __VLS_736.slots.default;
            (row.action);
            var __VLS_736;
        }
        var __VLS_732;
        const __VLS_737 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_738 = __VLS_asFunctionalComponent(__VLS_737, new __VLS_737({
            prop: "resourceType",
            label: "资源类型",
            width: "110",
        }));
        const __VLS_739 = __VLS_738({
            prop: "resourceType",
            label: "资源类型",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_738));
        const __VLS_741 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_742 = __VLS_asFunctionalComponent(__VLS_741, new __VLS_741({
            prop: "resourceId",
            label: "资源ID",
            width: "80",
        }));
        const __VLS_743 = __VLS_742({
            prop: "resourceId",
            label: "资源ID",
            width: "80",
        }, ...__VLS_functionalComponentArgsRest(__VLS_742));
        const __VLS_745 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_746 = __VLS_asFunctionalComponent(__VLS_745, new __VLS_745({
            prop: "detail",
            label: "详情",
            minWidth: "180",
            showOverflowTooltip: true,
        }));
        const __VLS_747 = __VLS_746({
            prop: "detail",
            label: "详情",
            minWidth: "180",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_746));
        const __VLS_749 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_750 = __VLS_asFunctionalComponent(__VLS_749, new __VLS_749({
            prop: "ipAddr",
            label: "IP",
            width: "130",
        }));
        const __VLS_751 = __VLS_750({
            prop: "ipAddr",
            label: "IP",
            width: "130",
        }, ...__VLS_functionalComponentArgsRest(__VLS_750));
        var __VLS_720;
        if (__VLS_ctx.filteredLogs.length === 0 && !__VLS_ctx.logsLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
        }
        var __VLS_704;
    }
    if (__VLS_ctx.hasSystemTab('loginLogs')) {
        const __VLS_753 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_754 = __VLS_asFunctionalComponent(__VLS_753, new __VLS_753({
            label: "登录日志",
            name: "loginLogs",
        }));
        const __VLS_755 = __VLS_754({
            label: "登录日志",
            name: "loginLogs",
        }, ...__VLS_functionalComponentArgsRest(__VLS_754));
        __VLS_756.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tab-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "toolbar-group" },
        });
        const __VLS_757 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_758 = __VLS_asFunctionalComponent(__VLS_757, new __VLS_757({
            modelValue: (__VLS_ctx.loginLogSearch),
            placeholder: "搜索登录用户名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }));
        const __VLS_759 = __VLS_758({
            modelValue: (__VLS_ctx.loginLogSearch),
            placeholder: "搜索登录用户名",
            size: "small",
            clearable: true,
            ...{ class: "toolbar-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_758));
        const __VLS_761 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_762 = __VLS_asFunctionalComponent(__VLS_761, new __VLS_761({
            modelValue: (__VLS_ctx.loginActionFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }));
        const __VLS_763 = __VLS_762({
            modelValue: (__VLS_ctx.loginActionFilter),
            size: "small",
            ...{ class: "toolbar-select" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_762));
        __VLS_764.slots.default;
        const __VLS_765 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_766 = __VLS_asFunctionalComponent(__VLS_765, new __VLS_765({
            value: "ALL",
            label: "全部",
        }));
        const __VLS_767 = __VLS_766({
            value: "ALL",
            label: "全部",
        }, ...__VLS_functionalComponentArgsRest(__VLS_766));
        const __VLS_769 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_770 = __VLS_asFunctionalComponent(__VLS_769, new __VLS_769({
            value: "LOGIN_SUCCESS",
            label: "登录成功",
        }));
        const __VLS_771 = __VLS_770({
            value: "LOGIN_SUCCESS",
            label: "登录成功",
        }, ...__VLS_functionalComponentArgsRest(__VLS_770));
        const __VLS_773 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_774 = __VLS_asFunctionalComponent(__VLS_773, new __VLS_773({
            value: "LOGIN_FAIL",
            label: "登录失败",
        }));
        const __VLS_775 = __VLS_774({
            value: "LOGIN_FAIL",
            label: "登录失败",
        }, ...__VLS_functionalComponentArgsRest(__VLS_774));
        var __VLS_764;
        const __VLS_777 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_778 = __VLS_asFunctionalComponent(__VLS_777, new __VLS_777({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_779 = __VLS_778({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_778));
        let __VLS_781;
        let __VLS_782;
        let __VLS_783;
        const __VLS_784 = {
            onClick: (__VLS_ctx.loadLoginLogs)
        };
        __VLS_780.slots.default;
        var __VLS_780;
        const __VLS_785 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_786 = __VLS_asFunctionalComponent(__VLS_785, new __VLS_785({
            data: (__VLS_ctx.filteredLoginLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }));
        const __VLS_787 = __VLS_786({
            data: (__VLS_ctx.filteredLoginLogs),
            border: true,
            size: "small",
            maxHeight: "520",
        }, ...__VLS_functionalComponentArgsRest(__VLS_786));
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loginLogsLoading) }, null, null);
        __VLS_788.slots.default;
        const __VLS_789 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_790 = __VLS_asFunctionalComponent(__VLS_789, new __VLS_789({
            prop: "createdAt",
            label: "时间",
            width: "170",
        }));
        const __VLS_791 = __VLS_790({
            prop: "createdAt",
            label: "时间",
            width: "170",
        }, ...__VLS_functionalComponentArgsRest(__VLS_790));
        const __VLS_793 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_794 = __VLS_asFunctionalComponent(__VLS_793, new __VLS_793({
            prop: "username",
            label: "用户名",
            width: "140",
        }));
        const __VLS_795 = __VLS_794({
            prop: "username",
            label: "用户名",
            width: "140",
        }, ...__VLS_functionalComponentArgsRest(__VLS_794));
        const __VLS_797 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_798 = __VLS_asFunctionalComponent(__VLS_797, new __VLS_797({
            label: "结果",
            width: "110",
        }));
        const __VLS_799 = __VLS_798({
            label: "结果",
            width: "110",
        }, ...__VLS_functionalComponentArgsRest(__VLS_798));
        __VLS_800.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_800.slots;
            const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
            const __VLS_801 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_802 = __VLS_asFunctionalComponent(__VLS_801, new __VLS_801({
                size: "small",
                type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
            }));
            const __VLS_803 = __VLS_802({
                size: "small",
                type: (row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_802));
            __VLS_804.slots.default;
            (row.action === 'LOGIN_SUCCESS' ? '成功' : '失败');
            var __VLS_804;
        }
        var __VLS_800;
        const __VLS_805 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_806 = __VLS_asFunctionalComponent(__VLS_805, new __VLS_805({
            prop: "detail",
            label: "详情",
            minWidth: "220",
            showOverflowTooltip: true,
        }));
        const __VLS_807 = __VLS_806({
            prop: "detail",
            label: "详情",
            minWidth: "220",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_806));
        const __VLS_809 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_810 = __VLS_asFunctionalComponent(__VLS_809, new __VLS_809({
            prop: "ipAddr",
            label: "IP",
            width: "140",
        }));
        const __VLS_811 = __VLS_810({
            prop: "ipAddr",
            label: "IP",
            width: "140",
        }, ...__VLS_functionalComponentArgsRest(__VLS_810));
        var __VLS_788;
        if (__VLS_ctx.filteredLoginLogs.length === 0 && !__VLS_ctx.loginLogsLoading) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
        }
        var __VLS_756;
    }
    if (__VLS_ctx.hasSystemTab('monitor')) {
        const __VLS_813 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_814 = __VLS_asFunctionalComponent(__VLS_813, new __VLS_813({
            label: "系统监控",
            name: "monitor",
        }));
        const __VLS_815 = __VLS_814({
            label: "系统监控",
            name: "monitor",
        }, ...__VLS_functionalComponentArgsRest(__VLS_814));
        __VLS_816.slots.default;
        const __VLS_817 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_818 = __VLS_asFunctionalComponent(__VLS_817, new __VLS_817({
            title: "系统健康状态",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_819 = __VLS_818({
            title: "系统健康状态",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_818));
        __VLS_820.slots.default;
        const __VLS_821 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_822 = __VLS_asFunctionalComponent(__VLS_821, new __VLS_821({
            label: "服务状态",
        }));
        const __VLS_823 = __VLS_822({
            label: "服务状态",
        }, ...__VLS_functionalComponentArgsRest(__VLS_822));
        __VLS_824.slots.default;
        const __VLS_825 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_826 = __VLS_asFunctionalComponent(__VLS_825, new __VLS_825({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }));
        const __VLS_827 = __VLS_826({
            type: (__VLS_ctx.health.status === 'ok' || __VLS_ctx.health.status === 'UP' ? 'success' : 'danger'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_826));
        __VLS_828.slots.default;
        (__VLS_ctx.health.status || '未知');
        var __VLS_828;
        var __VLS_824;
        const __VLS_829 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_830 = __VLS_asFunctionalComponent(__VLS_829, new __VLS_829({
            label: "服务名",
        }));
        const __VLS_831 = __VLS_830({
            label: "服务名",
        }, ...__VLS_functionalComponentArgsRest(__VLS_830));
        __VLS_832.slots.default;
        (__VLS_ctx.health.service || '未知');
        var __VLS_832;
        var __VLS_820;
        const __VLS_833 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_834 = __VLS_asFunctionalComponent(__VLS_833, new __VLS_833({
            title: "版本信息",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_835 = __VLS_834({
            title: "版本信息",
            border: true,
            column: (2),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_834));
        __VLS_836.slots.default;
        const __VLS_837 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_838 = __VLS_asFunctionalComponent(__VLS_837, new __VLS_837({
            label: "前端框架",
        }));
        const __VLS_839 = __VLS_838({
            label: "前端框架",
        }, ...__VLS_functionalComponentArgsRest(__VLS_838));
        __VLS_840.slots.default;
        var __VLS_840;
        const __VLS_841 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_842 = __VLS_asFunctionalComponent(__VLS_841, new __VLS_841({
            label: "后端框架",
        }));
        const __VLS_843 = __VLS_842({
            label: "后端框架",
        }, ...__VLS_functionalComponentArgsRest(__VLS_842));
        __VLS_844.slots.default;
        var __VLS_844;
        const __VLS_845 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_846 = __VLS_asFunctionalComponent(__VLS_845, new __VLS_845({
            label: "数据库",
        }));
        const __VLS_847 = __VLS_846({
            label: "数据库",
        }, ...__VLS_functionalComponentArgsRest(__VLS_846));
        __VLS_848.slots.default;
        var __VLS_848;
        const __VLS_849 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_850 = __VLS_asFunctionalComponent(__VLS_849, new __VLS_849({
            label: "数据同步",
        }));
        const __VLS_851 = __VLS_850({
            label: "数据同步",
        }, ...__VLS_functionalComponentArgsRest(__VLS_850));
        __VLS_852.slots.default;
        var __VLS_852;
        var __VLS_836;
        const __VLS_853 = {}.ElDescriptions;
        /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
        // @ts-ignore
        const __VLS_854 = __VLS_asFunctionalComponent(__VLS_853, new __VLS_853({
            title: "功能路线图",
            border: true,
            column: (1),
            size: "small",
        }));
        const __VLS_855 = __VLS_854({
            title: "功能路线图",
            border: true,
            column: (1),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_854));
        __VLS_856.slots.default;
        const __VLS_857 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_858 = __VLS_asFunctionalComponent(__VLS_857, new __VLS_857({
            label: "RBAC 权限",
        }));
        const __VLS_859 = __VLS_858({
            label: "RBAC 权限",
        }, ...__VLS_functionalComponentArgsRest(__VLS_858));
        __VLS_860.slots.default;
        var __VLS_860;
        const __VLS_861 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_862 = __VLS_asFunctionalComponent(__VLS_861, new __VLS_861({
            label: "行级安全",
        }));
        const __VLS_863 = __VLS_862({
            label: "行级安全",
        }, ...__VLS_functionalComponentArgsRest(__VLS_862));
        __VLS_864.slots.default;
        var __VLS_864;
        const __VLS_865 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_866 = __VLS_asFunctionalComponent(__VLS_865, new __VLS_865({
            label: "调度能力",
        }));
        const __VLS_867 = __VLS_866({
            label: "调度能力",
        }, ...__VLS_functionalComponentArgsRest(__VLS_866));
        __VLS_868.slots.default;
        var __VLS_868;
        const __VLS_869 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_870 = __VLS_asFunctionalComponent(__VLS_869, new __VLS_869({
            label: "导出分享",
        }));
        const __VLS_871 = __VLS_870({
            label: "导出分享",
        }, ...__VLS_functionalComponentArgsRest(__VLS_870));
        __VLS_872.slots.default;
        var __VLS_872;
        const __VLS_873 = {}.ElDescriptionsItem;
        /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
        // @ts-ignore
        const __VLS_874 = __VLS_asFunctionalComponent(__VLS_873, new __VLS_873({
            label: "告警通知",
        }));
        const __VLS_875 = __VLS_874({
            label: "告警通知",
        }, ...__VLS_functionalComponentArgsRest(__VLS_874));
        __VLS_876.slots.default;
        var __VLS_876;
        var __VLS_856;
        var __VLS_816;
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
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form']} */ ;
/** @type {__VLS_StyleScopedClasses['color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-presets']} */ ;
/** @type {__VLS_StyleScopedClasses['color-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form--grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-form--grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-chip-list']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['card-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-actions']} */ ;
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
var __VLS_368 = __VLS_367, __VLS_498 = __VLS_497, __VLS_600 = __VLS_599;
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
            PRIMARY_PRESETS: PRIMARY_PRESETS,
            platformDraft: platformDraft,
            settingsSaving: settingsSaving,
            browserInfo: browserInfo,
            screenInfo: screenInfo,
            saveSettingsDraft: saveSettingsDraft,
            resetSettingsDraft: resetSettingsDraft,
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
