import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowDown, DataLine, DocumentAdd, Edit, Plus, View } from '@element-plus/icons-vue';
import { createDatasource, deleteDatasource, getDatasourceList, getDatasourceTables, testDatasourceConnection, updateDatasource } from '../api/datasource';
import { createDataset, previewDatasetSql } from '../api/dataset';
// ─── DB type options ─────────────────────────────────────────────────────────
const dbTypeOptions = [
    { label: 'MySQL', value: 'MYSQL', icon: '🐬' },
    { label: 'PostgreSQL', value: 'POSTGRESQL', icon: '🐘' },
    { label: 'ClickHouse', value: 'CLICKHOUSE', icon: '🖱' },
    { label: 'SQL Server', value: 'SQLSERVER', icon: '🪟' },
    { label: 'Oracle', value: 'ORACLE', icon: '🔴' }
];
const defaultPorts = {
    MYSQL: 3306, POSTGRESQL: 5432, CLICKHOUSE: 8123, SQLSERVER: 1433, ORACLE: 1521
};
const dbTypeLabel = (v) => dbTypeOptions.find((t) => t.value === v)?.label ?? v;
const typeTagColor = (type) => {
    const map = {
        MYSQL: '', POSTGRESQL: 'success', CLICKHOUSE: 'warning', SQLSERVER: 'info', ORACLE: 'danger'
    };
    return map[type] ?? '';
};
// ─── Left sidebar list ───────────────────────────────────────────────────────
const rows = ref([]);
const loading = ref(false);
const sidebarSearch = ref('');
const selectedId = ref(null);
const selected = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null);
const filteredRows = computed(() => rows.value.filter((r) => !sidebarSearch.value || r.name.toLowerCase().includes(sidebarSearch.value.toLowerCase())));
const loadList = async () => {
    loading.value = true;
    try {
        rows.value = await getDatasourceList();
        if (!selectedId.value && rows.value.length)
            selectDatasource(rows.value[0]);
    }
    finally {
        loading.value = false;
    }
};
const selectDatasource = (row) => {
    selectedId.value = row.id;
    activeTab.value = 'config';
};
// ─── Right panel tabs ────────────────────────────────────────────────────────
const activeTab = ref('config');
const verifying = ref(false);
const handleVerify = async () => {
    if (!selected.value)
        return;
    verifying.value = true;
    try {
        const result = await testDatasourceConnection({
            datasourceType: selected.value.datasourceType,
            host: selected.value.host,
            port: selected.value.port,
            databaseName: selected.value.databaseName,
            username: selected.value.dbUsername,
            password: ''
        });
        ElMessage.success(`校验成功：${result.databaseProductName} ${result.databaseProductVersion}`);
    }
    finally {
        verifying.value = false;
    }
};
const openCreateDataset = (tableName) => {
    if (!selected.value)
        return;
    quickDatasetForm.name = tableName ? `${selected.value.name}-${tableName}` : `${selected.value.name}-数据集`;
    quickDatasetForm.sqlText = tableName ? `SELECT * FROM \`${tableName}\` LIMIT 1000` : '';
    quickDatasetVisible.value = true;
};
// ─── Quick create dataset ────────────────────────────────────────────────────
const quickDatasetVisible = ref(false);
const quickDatasetSaving = ref(false);
const quickDatasetForm = reactive({ name: '', sqlText: '' });
const handleQuickCreateDataset = async () => {
    if (!selected.value)
        return;
    if (!quickDatasetForm.name.trim())
        return ElMessage.warning('请输入数据集名称');
    if (!quickDatasetForm.sqlText.trim())
        return ElMessage.warning('请输入 SQL');
    quickDatasetSaving.value = true;
    try {
        await createDataset({
            name: quickDatasetForm.name.trim(),
            datasourceId: selected.value.id,
            sqlText: quickDatasetForm.sqlText.trim()
        });
        ElMessage.success('数据集创建成功');
        quickDatasetVisible.value = false;
    }
    finally {
        quickDatasetSaving.value = false;
    }
};
// ─── Tables tab ──────────────────────────────────────────────────────────────
const tablesLoading = ref(false);
const tableRows = ref([]);
const tableSearch = ref('');
const filteredTableRows = computed(() => tableRows.value.filter((r) => !tableSearch.value || r.tableName.toLowerCase().includes(tableSearch.value.toLowerCase())));
watch(activeTab, async (tab) => {
    if (tab === 'tables' && selected.value && tableRows.value.length === 0)
        await loadTables();
});
watch(selectedId, () => { tableRows.value = []; tableSearch.value = ''; });
const loadTables = async () => {
    if (!selected.value)
        return;
    tablesLoading.value = true;
    try {
        tableRows.value = await getDatasourceTables(selected.value.id);
    }
    finally {
        tablesLoading.value = false;
    }
};
// ─── Preview ─────────────────────────────────────────────────────────────────
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewTable = ref('');
const previewColumns = ref([]);
const previewRows = ref([]);
const openPreview = async (tableName) => {
    if (!selected.value)
        return;
    previewTable.value = tableName;
    previewColumns.value = [];
    previewRows.value = [];
    previewVisible.value = true;
    previewLoading.value = true;
    try {
        const result = await previewDatasetSql({
            datasourceId: selected.value.id,
            sqlText: `SELECT * FROM \`${tableName}\` LIMIT 20`
        });
        previewColumns.value = result.columns;
        previewRows.value = result.rows;
    }
    finally {
        previewLoading.value = false;
    }
};
// ─── Step 1: choose DB type ──────────────────────────────────────────────────
const step1Visible = ref(false);
const step1Type = ref('MYSQL');
const openStep1 = () => { step1Type.value = 'MYSQL'; step1Visible.value = true; };
const goStep2 = () => {
    step1Visible.value = false;
    editId.value = null;
    Object.assign(form, emptyForm());
    form.datasourceType = step1Type.value;
    form.port = defaultPorts[step1Type.value] ?? 3306;
    step2Visible.value = true;
};
const backToStep1 = () => { step2Visible.value = false; step1Visible.value = true; };
// ─── Step2 / Edit form ───────────────────────────────────────────────────────
const step2Visible = ref(false);
const saving = ref(false);
const testing = ref(false);
const editId = ref(null);
const formRef = ref();
const emptyForm = () => ({
    name: '', datasourceType: 'MYSQL', connectMode: 'DIRECT',
    host: '', port: 3306, databaseName: '', username: '', password: ''
});
const form = reactive(emptyForm());
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    host: [{ required: true, message: '请输入主机名/IP地址', trigger: 'blur' }],
    port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
    databaseName: [{ required: true, message: '请输入数据库名称', trigger: 'blur' }]
};
const openEdit = (row) => {
    editId.value = row.id;
    Object.assign(form, emptyForm());
    form.name = row.name;
    form.datasourceType = row.datasourceType || 'MYSQL';
    form.connectMode = row.connectMode || 'DIRECT';
    form.host = row.host;
    form.port = row.port;
    form.databaseName = row.databaseName;
    form.username = row.dbUsername || '';
    form.password = '';
    step2Visible.value = true;
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        if (editId.value) {
            const updated = await updateDatasource(editId.value, form);
            ElMessage.success('更新成功');
            step2Visible.value = false;
            await loadList();
            selectedId.value = updated.id;
        }
        else {
            const created = await createDatasource(form);
            ElMessage.success('创建成功');
            step2Visible.value = false;
            await loadList();
            selectedId.value = created.id;
        }
    }
    finally {
        saving.value = false;
    }
};
const handleTestConnection = async () => {
    await formRef.value?.validateField(['host', 'port', 'databaseName']);
    testing.value = true;
    try {
        const result = await testDatasourceConnection({
            datasourceType: form.datasourceType, host: form.host,
            port: form.port, databaseName: form.databaseName,
            username: form.username, password: form.password
        });
        ElMessage.success(`${result.message}：${result.databaseProductName} ${result.databaseProductVersion}`);
    }
    finally {
        testing.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteDatasource(id);
    ElMessage.success('删除成功');
    if (selectedId.value === id)
        selectedId.value = null;
    await loadList();
};
onMounted(loadList);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ds-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-card']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ds-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "ds-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ds-sidebar-toolbar" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.sidebarSearch),
    placeholder: "搜索",
    prefixIcon: "Search",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.sidebarSearch),
    placeholder: "搜索",
    prefixIcon: "Search",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.openStep1)
};
var __VLS_7;
const __VLS_12 = {}.ElScrollbar;
/** @type {[typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, typeof __VLS_components.ElScrollbar, typeof __VLS_components.elScrollbar, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ class: "ds-list" },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "ds-list" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-empty" },
    });
}
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.filteredRows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectDatasource(row);
            } },
        key: (row.id),
        ...{ class: "ds-list-item" },
        ...{ class: ({ active: __VLS_ctx.selectedId === row.id }) },
    });
    const __VLS_16 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ class: "ds-icon" },
    }));
    const __VLS_18 = __VLS_17({
        ...{ class: "ds-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = {}.DataLine;
    /** @type {[typeof __VLS_components.DataLine, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
    const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ds-name" },
        title: (row.name),
    });
    (row.name);
    const __VLS_24 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: "small",
        type: (__VLS_ctx.typeTagColor(row.datasourceType)),
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        size: "small",
        type: (__VLS_ctx.typeTagColor(row.datasourceType)),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    (__VLS_ctx.dbTypeLabel(row.datasourceType));
    var __VLS_27;
}
if (__VLS_ctx.filteredRows.length === 0 && !__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-empty" },
    });
}
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "ds-main" },
});
if (!__VLS_ctx.selected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-empty-main" },
    });
    const __VLS_28 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        description: "请在左侧选择或新建数据源",
    }));
    const __VLS_30 = __VLS_29({
        description: "请在左侧选择或新建数据源",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-detail-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-detail-title" },
    });
    const __VLS_32 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
    const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.DataLine;
    /** @type {[typeof __VLS_components.DataLine, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({}));
    const __VLS_38 = __VLS_37({}, ...__VLS_functionalComponentArgsRest(__VLS_37));
    var __VLS_35;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selected.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ds-creator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-detail-actions" },
    });
    const __VLS_40 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (__VLS_ctx.openCreateDataset)
    };
    __VLS_43.slots.default;
    var __VLS_43;
    const __VLS_48 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.verifying),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.verifying),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.handleVerify)
    };
    __VLS_51.slots.default;
    var __VLS_51;
    const __VLS_56 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selected);
        }
    };
    __VLS_59.slots.default;
    var __VLS_59;
    const __VLS_64 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onConfirm': {} },
        title: "确认删除该数据源？",
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onConfirm': {} },
        title: "确认删除该数据源？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onConfirm: (...[$event]) => {
            if (!!(!__VLS_ctx.selected))
                return;
            __VLS_ctx.handleDelete(__VLS_ctx.selected.id);
        }
    };
    __VLS_67.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_67.slots;
        const __VLS_72 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            size: "small",
            type: "danger",
            plain: true,
        }));
        const __VLS_74 = __VLS_73({
            size: "small",
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        var __VLS_75;
    }
    var __VLS_67;
    const __VLS_76 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "ds-tabs" },
    }));
    const __VLS_78 = __VLS_77({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "ds-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    __VLS_79.slots.default;
    const __VLS_80 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        label: "数据源配置",
        name: "config",
    }));
    const __VLS_82 = __VLS_81({
        label: "数据源配置",
        name: "config",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-config-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-config-title" },
    });
    const __VLS_84 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({}));
    const __VLS_86 = __VLS_85({}, ...__VLS_functionalComponentArgsRest(__VLS_85));
    __VLS_87.slots.default;
    const __VLS_88 = {}.ArrowDown;
    /** @type {[typeof __VLS_components.ArrowDown, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
    const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
    var __VLS_87;
    const __VLS_92 = {}.ElDescriptions;
    /** @type {[typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, typeof __VLS_components.ElDescriptions, typeof __VLS_components.elDescriptions, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        column: (2),
        border: true,
        size: "small",
    }));
    const __VLS_94 = __VLS_93({
        column: (2),
        border: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    const __VLS_96 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        label: "数据源名称",
    }));
    const __VLS_98 = __VLS_97({
        label: "数据源名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    __VLS_99.slots.default;
    (__VLS_ctx.selected.name);
    var __VLS_99;
    const __VLS_100 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        label: "类型",
    }));
    const __VLS_102 = __VLS_101({
        label: "类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    __VLS_103.slots.default;
    const __VLS_104 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        size: "small",
        type: (__VLS_ctx.typeTagColor(__VLS_ctx.selected.datasourceType)),
    }));
    const __VLS_106 = __VLS_105({
        size: "small",
        type: (__VLS_ctx.typeTagColor(__VLS_ctx.selected.datasourceType)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    (__VLS_ctx.dbTypeLabel(__VLS_ctx.selected.datasourceType));
    var __VLS_107;
    var __VLS_103;
    const __VLS_108 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        label: "主机名/IP地址",
    }));
    const __VLS_110 = __VLS_109({
        label: "主机名/IP地址",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    (__VLS_ctx.selected.host);
    var __VLS_111;
    const __VLS_112 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        label: "端口",
    }));
    const __VLS_114 = __VLS_113({
        label: "端口",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    (__VLS_ctx.selected.port);
    var __VLS_115;
    const __VLS_116 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        label: "数据库名称",
    }));
    const __VLS_118 = __VLS_117({
        label: "数据库名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    (__VLS_ctx.selected.databaseName);
    var __VLS_119;
    const __VLS_120 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        label: "用户名",
    }));
    const __VLS_122 = __VLS_121({
        label: "用户名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    (__VLS_ctx.selected.dbUsername);
    var __VLS_123;
    const __VLS_124 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        label: "连接模式",
    }));
    const __VLS_126 = __VLS_125({
        label: "连接模式",
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_127.slots.default;
    const __VLS_128 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        size: "small",
        type: (__VLS_ctx.selected.connectMode === 'EXTRACT' ? 'warning' : 'success'),
    }));
    const __VLS_130 = __VLS_129({
        size: "small",
        type: (__VLS_ctx.selected.connectMode === 'EXTRACT' ? 'warning' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    (__VLS_ctx.selected.connectMode === 'EXTRACT' ? '抽取' : '直连');
    var __VLS_131;
    var __VLS_127;
    const __VLS_132 = {}.ElDescriptionsItem;
    /** @type {[typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, typeof __VLS_components.ElDescriptionsItem, typeof __VLS_components.elDescriptionsItem, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        label: "JDBC 连接字符串",
    }));
    const __VLS_134 = __VLS_133({
        label: "JDBC 连接字符串",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    var __VLS_135;
    var __VLS_95;
    var __VLS_83;
    const __VLS_136 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        label: "数据源表",
        name: "tables",
    }));
    const __VLS_138 = __VLS_137({
        label: "数据源表",
        name: "tables",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-tables-toolbar" },
    });
    const __VLS_140 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        modelValue: (__VLS_ctx.tableSearch),
        placeholder: "搜索表名",
        prefixIcon: "Search",
        size: "small",
        clearable: true,
        ...{ style: {} },
    }));
    const __VLS_142 = __VLS_141({
        modelValue: (__VLS_ctx.tableSearch),
        placeholder: "搜索表名",
        prefixIcon: "Search",
        size: "small",
        clearable: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        size: "small",
        ...{ style: {} },
        loading: (__VLS_ctx.tablesLoading),
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        size: "small",
        ...{ style: {} },
        loading: (__VLS_ctx.tablesLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (__VLS_ctx.loadTables)
    };
    __VLS_147.slots.default;
    var __VLS_147;
    const __VLS_152 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        data: (__VLS_ctx.filteredTableRows),
        border: true,
        maxHeight: "480",
        size: "small",
    }));
    const __VLS_154 = __VLS_153({
        data: (__VLS_ctx.filteredTableRows),
        border: true,
        maxHeight: "480",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.tablesLoading) }, null, null);
    __VLS_155.slots.default;
    const __VLS_156 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        prop: "tableName",
        label: "表名",
        minWidth: "300",
    }));
    const __VLS_158 = __VLS_157({
        prop: "tableName",
        label: "表名",
        minWidth: "300",
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    const __VLS_160 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        label: "操作",
        width: "110",
        align: "right",
    }));
    const __VLS_162 = __VLS_161({
        label: "操作",
        width: "110",
        align: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_163.slots;
        const { row: trow } = __VLS_getSlotParam(__VLS_thisSlot);
        const __VLS_164 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            content: "预览数据",
            placement: "top",
        }));
        const __VLS_166 = __VLS_165({
            content: "预览数据",
            placement: "top",
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        __VLS_167.slots.default;
        const __VLS_168 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            ...{ 'onClick': {} },
            link: true,
            icon: (__VLS_ctx.View),
        }));
        const __VLS_170 = __VLS_169({
            ...{ 'onClick': {} },
            link: true,
            icon: (__VLS_ctx.View),
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        let __VLS_172;
        let __VLS_173;
        let __VLS_174;
        const __VLS_175 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.selected))
                    return;
                __VLS_ctx.openPreview(trow.tableName);
            }
        };
        var __VLS_171;
        var __VLS_167;
        const __VLS_176 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
            content: "新建数据集",
            placement: "top",
        }));
        const __VLS_178 = __VLS_177({
            content: "新建数据集",
            placement: "top",
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        __VLS_179.slots.default;
        const __VLS_180 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            ...{ 'onClick': {} },
            link: true,
            icon: (__VLS_ctx.DocumentAdd),
        }));
        const __VLS_182 = __VLS_181({
            ...{ 'onClick': {} },
            link: true,
            icon: (__VLS_ctx.DocumentAdd),
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        let __VLS_184;
        let __VLS_185;
        let __VLS_186;
        const __VLS_187 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.selected))
                    return;
                __VLS_ctx.openCreateDataset(trow.tableName);
            }
        };
        var __VLS_183;
        var __VLS_179;
    }
    var __VLS_163;
    var __VLS_155;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ds-tables-pagination" },
    });
    (__VLS_ctx.filteredTableRows.length);
    var __VLS_139;
    var __VLS_79;
}
const __VLS_188 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    modelValue: (__VLS_ctx.step1Visible),
    title: "创建数据源",
    width: "660px",
    destroyOnClose: true,
}));
const __VLS_190 = __VLS_189({
    modelValue: (__VLS_ctx.step1Visible),
    title: "创建数据源",
    width: "660px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
__VLS_191.slots.default;
const __VLS_192 = {}.ElSteps;
/** @type {[typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    active: (1),
    finishStatus: "success",
    simple: true,
    ...{ style: {} },
}));
const __VLS_194 = __VLS_193({
    active: (1),
    finishStatus: "success",
    simple: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
const __VLS_196 = {}.ElStep;
/** @type {[typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    title: "选择数据源",
}));
const __VLS_198 = __VLS_197({
    title: "选择数据源",
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
const __VLS_200 = {}.ElStep;
/** @type {[typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    title: "配置信息",
}));
const __VLS_202 = __VLS_201({
    title: "配置信息",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
var __VLS_195;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "db-type-grid" },
});
for (const [t] of __VLS_getVForSourceType((__VLS_ctx.dbTypeOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.step1Type = t.value;
            } },
        key: (t.value),
        ...{ class: "db-type-card" },
        ...{ class: ({ selected: __VLS_ctx.step1Type === t.value }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "db-type-icon" },
    });
    (t.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "db-type-label" },
    });
    (t.label);
}
{
    const { footer: __VLS_thisSlot } = __VLS_191.slots;
    const __VLS_204 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClick': {} },
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClick: (...[$event]) => {
            __VLS_ctx.step1Visible = false;
        }
    };
    __VLS_207.slots.default;
    var __VLS_207;
    const __VLS_212 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (!__VLS_ctx.step1Type),
    }));
    const __VLS_214 = __VLS_213({
        ...{ 'onClick': {} },
        type: "primary",
        disabled: (!__VLS_ctx.step1Type),
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    let __VLS_216;
    let __VLS_217;
    let __VLS_218;
    const __VLS_219 = {
        onClick: (__VLS_ctx.goStep2)
    };
    __VLS_215.slots.default;
    var __VLS_215;
}
var __VLS_191;
const __VLS_220 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    modelValue: (__VLS_ctx.step2Visible),
    title: (__VLS_ctx.editId ? '编辑数据源' : '创建数据源'),
    width: "620px",
    destroyOnClose: true,
}));
const __VLS_222 = __VLS_221({
    modelValue: (__VLS_ctx.step2Visible),
    title: (__VLS_ctx.editId ? '编辑数据源' : '创建数据源'),
    width: "620px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_223.slots.default;
if (!__VLS_ctx.editId) {
    const __VLS_224 = {}.ElSteps;
    /** @type {[typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, typeof __VLS_components.ElSteps, typeof __VLS_components.elSteps, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        active: (2),
        finishStatus: "success",
        simple: true,
        ...{ style: {} },
    }));
    const __VLS_226 = __VLS_225({
        active: (2),
        finishStatus: "success",
        simple: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    const __VLS_228 = {}.ElStep;
    /** @type {[typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        title: "选择数据源",
    }));
    const __VLS_230 = __VLS_229({
        title: "选择数据源",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    const __VLS_232 = {}.ElStep;
    /** @type {[typeof __VLS_components.ElStep, typeof __VLS_components.elStep, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        title: "配置信息",
    }));
    const __VLS_234 = __VLS_233({
        title: "配置信息",
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    var __VLS_227;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    (__VLS_ctx.dbTypeLabel(__VLS_ctx.form.datasourceType));
}
const __VLS_236 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "140px",
    labelPosition: "right",
}));
const __VLS_238 = __VLS_237({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "140px",
    labelPosition: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_240 = {};
__VLS_239.slots.default;
const __VLS_242 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
    label: "数据源名称",
    prop: "name",
}));
const __VLS_244 = __VLS_243({
    label: "数据源名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_243));
__VLS_245.slots.default;
const __VLS_246 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入名称",
}));
const __VLS_248 = __VLS_247({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
var __VLS_245;
const __VLS_250 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    label: "连接方式",
}));
const __VLS_252 = __VLS_251({
    label: "连接方式",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
__VLS_253.slots.default;
const __VLS_254 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
    modelValue: (__VLS_ctx.form.connectMode),
}));
const __VLS_256 = __VLS_255({
    modelValue: (__VLS_ctx.form.connectMode),
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
__VLS_257.slots.default;
const __VLS_258 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_259 = __VLS_asFunctionalComponent(__VLS_258, new __VLS_258({
    value: "DIRECT",
}));
const __VLS_260 = __VLS_259({
    value: "DIRECT",
}, ...__VLS_functionalComponentArgsRest(__VLS_259));
__VLS_261.slots.default;
var __VLS_261;
const __VLS_262 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
    value: "EXTRACT",
}));
const __VLS_264 = __VLS_263({
    value: "EXTRACT",
}, ...__VLS_functionalComponentArgsRest(__VLS_263));
__VLS_265.slots.default;
var __VLS_265;
var __VLS_257;
var __VLS_253;
const __VLS_266 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    label: "主机名/IP地址",
    prop: "host",
}));
const __VLS_268 = __VLS_267({
    label: "主机名/IP地址",
    prop: "host",
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
__VLS_269.slots.default;
const __VLS_270 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
    modelValue: (__VLS_ctx.form.host),
    placeholder: "如 localhost",
}));
const __VLS_272 = __VLS_271({
    modelValue: (__VLS_ctx.form.host),
    placeholder: "如 localhost",
}, ...__VLS_functionalComponentArgsRest(__VLS_271));
var __VLS_269;
const __VLS_274 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
    label: "端口",
    prop: "port",
}));
const __VLS_276 = __VLS_275({
    label: "端口",
    prop: "port",
}, ...__VLS_functionalComponentArgsRest(__VLS_275));
__VLS_277.slots.default;
const __VLS_278 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
    modelValue: __VLS_ctx.form.port,
    min: (1),
    max: (65535),
    ...{ style: {} },
}));
const __VLS_280 = __VLS_279({
    modelValue: __VLS_ctx.form.port,
    min: (1),
    max: (65535),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_279));
var __VLS_277;
const __VLS_282 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_283 = __VLS_asFunctionalComponent(__VLS_282, new __VLS_282({
    label: "数据库名称",
    prop: "databaseName",
}));
const __VLS_284 = __VLS_283({
    label: "数据库名称",
    prop: "databaseName",
}, ...__VLS_functionalComponentArgsRest(__VLS_283));
__VLS_285.slots.default;
const __VLS_286 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_287 = __VLS_asFunctionalComponent(__VLS_286, new __VLS_286({
    modelValue: (__VLS_ctx.form.databaseName),
    placeholder: "数据库名",
}));
const __VLS_288 = __VLS_287({
    modelValue: (__VLS_ctx.form.databaseName),
    placeholder: "数据库名",
}, ...__VLS_functionalComponentArgsRest(__VLS_287));
var __VLS_285;
const __VLS_290 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
    label: "用户名",
}));
const __VLS_292 = __VLS_291({
    label: "用户名",
}, ...__VLS_functionalComponentArgsRest(__VLS_291));
__VLS_293.slots.default;
const __VLS_294 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_295 = __VLS_asFunctionalComponent(__VLS_294, new __VLS_294({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "可选",
}));
const __VLS_296 = __VLS_295({
    modelValue: (__VLS_ctx.form.username),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_295));
var __VLS_293;
const __VLS_298 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
    label: "密码",
}));
const __VLS_300 = __VLS_299({
    label: "密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_299));
__VLS_301.slots.default;
const __VLS_302 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_303 = __VLS_asFunctionalComponent(__VLS_302, new __VLS_302({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    showPassword: true,
    placeholder: "可选（编辑时留空保持不变）",
}));
const __VLS_304 = __VLS_303({
    modelValue: (__VLS_ctx.form.password),
    type: "password",
    showPassword: true,
    placeholder: "可选（编辑时留空保持不变）",
}, ...__VLS_functionalComponentArgsRest(__VLS_303));
var __VLS_301;
var __VLS_239;
{
    const { footer: __VLS_thisSlot } = __VLS_223.slots;
    if (!__VLS_ctx.editId) {
        const __VLS_306 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
            ...{ 'onClick': {} },
        }));
        const __VLS_308 = __VLS_307({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_307));
        let __VLS_310;
        let __VLS_311;
        let __VLS_312;
        const __VLS_313 = {
            onClick: (__VLS_ctx.backToStep1)
        };
        __VLS_309.slots.default;
        var __VLS_309;
    }
    const __VLS_314 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({
        ...{ 'onClick': {} },
    }));
    const __VLS_316 = __VLS_315({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_315));
    let __VLS_318;
    let __VLS_319;
    let __VLS_320;
    const __VLS_321 = {
        onClick: (...[$event]) => {
            __VLS_ctx.step2Visible = false;
        }
    };
    __VLS_317.slots.default;
    var __VLS_317;
    const __VLS_322 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_323 = __VLS_asFunctionalComponent(__VLS_322, new __VLS_322({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }));
    const __VLS_324 = __VLS_323({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_323));
    let __VLS_326;
    let __VLS_327;
    let __VLS_328;
    const __VLS_329 = {
        onClick: (__VLS_ctx.handleTestConnection)
    };
    __VLS_325.slots.default;
    var __VLS_325;
    const __VLS_330 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_332 = __VLS_331({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_331));
    let __VLS_334;
    let __VLS_335;
    let __VLS_336;
    const __VLS_337 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_333.slots.default;
    var __VLS_333;
}
var __VLS_223;
const __VLS_338 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_339 = __VLS_asFunctionalComponent(__VLS_338, new __VLS_338({
    modelValue: (__VLS_ctx.previewVisible),
    title: (`预览：${__VLS_ctx.previewTable}`),
    width: "860px",
    destroyOnClose: true,
}));
const __VLS_340 = __VLS_339({
    modelValue: (__VLS_ctx.previewVisible),
    title: (`预览：${__VLS_ctx.previewTable}`),
    width: "860px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_339));
__VLS_341.slots.default;
const __VLS_342 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_343 = __VLS_asFunctionalComponent(__VLS_342, new __VLS_342({
    data: (__VLS_ctx.previewRows),
    border: true,
    maxHeight: "420",
    size: "small",
}));
const __VLS_344 = __VLS_343({
    data: (__VLS_ctx.previewRows),
    border: true,
    maxHeight: "420",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_343));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.previewLoading) }, null, null);
__VLS_345.slots.default;
for (const [col] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
    const __VLS_346 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
        key: (col),
        prop: (col),
        label: (col),
        minWidth: "120",
        showOverflowTooltip: true,
    }));
    const __VLS_348 = __VLS_347({
        key: (col),
        prop: (col),
        label: (col),
        minWidth: "120",
        showOverflowTooltip: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_347));
}
var __VLS_345;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
(__VLS_ctx.previewRows.length);
var __VLS_341;
const __VLS_350 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
    modelValue: (__VLS_ctx.quickDatasetVisible),
    title: "快速新建数据集",
    width: "640px",
    destroyOnClose: true,
    appendToBody: true,
}));
const __VLS_352 = __VLS_351({
    modelValue: (__VLS_ctx.quickDatasetVisible),
    title: "快速新建数据集",
    width: "640px",
    destroyOnClose: true,
    appendToBody: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
__VLS_353.slots.default;
const __VLS_354 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
    labelWidth: "90px",
}));
const __VLS_356 = __VLS_355({
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_355));
__VLS_357.slots.default;
const __VLS_358 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
    label: "数据源",
}));
const __VLS_360 = __VLS_359({
    label: "数据源",
}, ...__VLS_functionalComponentArgsRest(__VLS_359));
__VLS_361.slots.default;
const __VLS_362 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({
    modelValue: (__VLS_ctx.selected?.name || ''),
    disabled: true,
}));
const __VLS_364 = __VLS_363({
    modelValue: (__VLS_ctx.selected?.name || ''),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_363));
var __VLS_361;
const __VLS_366 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
    label: "数据集名称",
}));
const __VLS_368 = __VLS_367({
    label: "数据集名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_367));
__VLS_369.slots.default;
const __VLS_370 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent(__VLS_370, new __VLS_370({
    modelValue: (__VLS_ctx.quickDatasetForm.name),
    placeholder: "请输入数据集名称",
}));
const __VLS_372 = __VLS_371({
    modelValue: (__VLS_ctx.quickDatasetForm.name),
    placeholder: "请输入数据集名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
var __VLS_369;
const __VLS_374 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
    label: "SQL",
}));
const __VLS_376 = __VLS_375({
    label: "SQL",
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
__VLS_377.slots.default;
const __VLS_378 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
    modelValue: (__VLS_ctx.quickDatasetForm.sqlText),
    type: "textarea",
    rows: (6),
    placeholder: "请输入查询SQL",
}));
const __VLS_380 = __VLS_379({
    modelValue: (__VLS_ctx.quickDatasetForm.sqlText),
    type: "textarea",
    rows: (6),
    placeholder: "请输入查询SQL",
}, ...__VLS_functionalComponentArgsRest(__VLS_379));
var __VLS_377;
var __VLS_357;
{
    const { footer: __VLS_thisSlot } = __VLS_353.slots;
    const __VLS_382 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
        ...{ 'onClick': {} },
    }));
    const __VLS_384 = __VLS_383({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_383));
    let __VLS_386;
    let __VLS_387;
    let __VLS_388;
    const __VLS_389 = {
        onClick: (...[$event]) => {
            __VLS_ctx.quickDatasetVisible = false;
        }
    };
    __VLS_385.slots.default;
    var __VLS_385;
    const __VLS_390 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.quickDatasetSaving),
    }));
    const __VLS_392 = __VLS_391({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.quickDatasetSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_391));
    let __VLS_394;
    let __VLS_395;
    let __VLS_396;
    const __VLS_397 = {
        onClick: (__VLS_ctx.handleQuickCreateDataset)
    };
    __VLS_393.slots.default;
    var __VLS_393;
}
var __VLS_353;
/** @type {__VLS_StyleScopedClasses['ds-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-sidebar-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-list']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-name']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-main']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-empty-main']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-detail-header']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-creator']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-config-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-tables-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['ds-tables-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-card']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['db-type-label']} */ ;
// @ts-ignore
var __VLS_241 = __VLS_240;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowDown: ArrowDown,
            DataLine: DataLine,
            DocumentAdd: DocumentAdd,
            Edit: Edit,
            Plus: Plus,
            View: View,
            dbTypeOptions: dbTypeOptions,
            dbTypeLabel: dbTypeLabel,
            typeTagColor: typeTagColor,
            loading: loading,
            sidebarSearch: sidebarSearch,
            selectedId: selectedId,
            selected: selected,
            filteredRows: filteredRows,
            selectDatasource: selectDatasource,
            activeTab: activeTab,
            verifying: verifying,
            handleVerify: handleVerify,
            openCreateDataset: openCreateDataset,
            quickDatasetVisible: quickDatasetVisible,
            quickDatasetSaving: quickDatasetSaving,
            quickDatasetForm: quickDatasetForm,
            handleQuickCreateDataset: handleQuickCreateDataset,
            tablesLoading: tablesLoading,
            tableSearch: tableSearch,
            filteredTableRows: filteredTableRows,
            loadTables: loadTables,
            previewVisible: previewVisible,
            previewLoading: previewLoading,
            previewTable: previewTable,
            previewColumns: previewColumns,
            previewRows: previewRows,
            openPreview: openPreview,
            step1Visible: step1Visible,
            step1Type: step1Type,
            openStep1: openStep1,
            goStep2: goStep2,
            backToStep1: backToStep1,
            step2Visible: step2Visible,
            saving: saving,
            testing: testing,
            editId: editId,
            formRef: formRef,
            form: form,
            rules: rules,
            openEdit: openEdit,
            handleSubmit: handleSubmit,
            handleTestConnection: handleTestConnection,
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
