import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Grid } from '@element-plus/icons-vue';
import { createDataset, deleteDataset, getDatasetList, previewDatasetSql, updateDataset } from '../api/dataset';
import { getDatasourceList, getDatasourceTables, getTableColumns } from '../api/datasource';
const rows = ref([]);
const datasources = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const previewLoading = ref(false);
const editId = ref(null);
const formRef = ref();
const preview = reactive({ columns: [], rows: [], rowCount: 0 });
// Table browser state
const tables = ref([]);
const tablesLoading = ref(false);
const tableSearch = ref('');
const selectedTable = ref('');
const tableColumns = ref([]);
const columnsLoading = ref(false);
const filteredTables = computed(() => tableSearch.value
    ? tables.value.filter(t => t.tableName.toLowerCase().includes(tableSearch.value.toLowerCase()))
    : tables.value);
const emptyForm = () => ({
    name: '',
    datasourceId: '',
    sqlText: ''
});
const form = reactive(emptyForm());
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    datasourceId: [{ required: true, message: '请选择数据源', trigger: 'change' }],
    sqlText: [{ required: true, message: '请输入 SQL', trigger: 'blur' }]
};
const loadList = async () => {
    loading.value = true;
    try {
        ;
        [rows.value, datasources.value] = await Promise.all([getDatasetList(), getDatasourceList()]);
    }
    finally {
        loading.value = false;
    }
};
const loadTables = async (dsId) => {
    tables.value = [];
    selectedTable.value = '';
    tableColumns.value = [];
    if (!dsId)
        return;
    tablesLoading.value = true;
    try {
        tables.value = await getDatasourceTables(dsId);
    }
    catch {
        ElMessage.error('获取数据表列表失败');
    }
    finally {
        tablesLoading.value = false;
    }
};
const refreshTables = () => {
    if (form.datasourceId)
        loadTables(Number(form.datasourceId));
};
const onDatasourceChange = (val) => {
    if (val)
        loadTables(Number(val));
};
const selectTable = async (tableName) => {
    selectedTable.value = tableName;
    tableColumns.value = [];
    if (!form.datasourceId)
        return;
    columnsLoading.value = true;
    try {
        tableColumns.value = await getTableColumns(Number(form.datasourceId), tableName);
    }
    catch {
        ElMessage.error('获取列信息失败');
    }
    finally {
        columnsLoading.value = false;
    }
};
const generateSql = () => {
    if (!tableColumns.value.length)
        return;
    const cols = tableColumns.value.map(c => c.columnName).join(', ');
    form.sqlText = `SELECT ${cols}\nFROM ${selectedTable.value}`;
};
const openCreate = () => {
    editId.value = null;
    Object.assign(form, emptyForm());
    Object.assign(preview, { columns: [], rows: [], rowCount: 0 });
    tables.value = [];
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
};
const openEdit = (row) => {
    editId.value = row.id;
    form.name = row.name;
    form.datasourceId = row.datasourceId;
    form.sqlText = row.sqlText;
    Object.assign(preview, { columns: [], rows: [], rowCount: 0 });
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
    // Load tables for the selected datasource
    if (row.datasourceId)
        loadTables(Number(row.datasourceId));
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        if (editId.value) {
            await updateDataset(editId.value, form);
            ElMessage.success('更新成功');
        }
        else {
            await createDataset(form);
            ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        await loadList();
    }
    finally {
        saving.value = false;
    }
};
const handleDelete = async (id) => {
    await deleteDataset(id);
    ElMessage.success('删除成功');
    await loadList();
};
const handlePreview = async () => {
    await formRef.value?.validateField(['datasourceId', 'sqlText']);
    previewLoading.value = true;
    try {
        const result = await previewDatasetSql({
            datasourceId: Number(form.datasourceId),
            sqlText: form.sqlText
        });
        Object.assign(preview, result);
        ElMessage.success('SQL 预览成功');
    }
    finally {
        previewLoading.value = false;
    }
};
onMounted(loadList);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "bi-page" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "bi-page" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bi-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "bi-card-title" },
});
const __VLS_5 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_8.slots.default;
var __VLS_8;
const __VLS_13 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    data: (__VLS_ctx.rows),
    border: true,
    ...{ style: {} },
}));
const __VLS_15 = __VLS_14({
    data: (__VLS_ctx.rows),
    border: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_16.slots.default;
const __VLS_17 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    prop: "name",
    label: "数据集名称",
    minWidth: "160",
}));
const __VLS_19 = __VLS_18({
    prop: "name",
    label: "数据集名称",
    minWidth: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
const __VLS_21 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    prop: "datasourceId",
    label: "数据源ID",
    width: "100",
}));
const __VLS_23 = __VLS_22({
    prop: "datasourceId",
    label: "数据源ID",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
const __VLS_25 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    prop: "sqlText",
    label: "SQL",
    showOverflowTooltip: true,
    minWidth: "280",
}));
const __VLS_27 = __VLS_26({
    prop: "sqlText",
    label: "SQL",
    showOverflowTooltip: true,
    minWidth: "280",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
const __VLS_29 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "170",
}));
const __VLS_31 = __VLS_30({
    prop: "createdAt",
    label: "创建时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
const __VLS_33 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    label: "操作",
    width: "140",
    fixed: "right",
}));
const __VLS_35 = __VLS_34({
    label: "操作",
    width: "140",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
__VLS_36.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_36.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_37 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_39 = __VLS_38({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    let __VLS_41;
    let __VLS_42;
    let __VLS_43;
    const __VLS_44 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEdit(row);
        }
    };
    __VLS_40.slots.default;
    var __VLS_40;
    const __VLS_45 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
        ...{ 'onConfirm': {} },
        title: "确认删除？",
    }));
    const __VLS_47 = __VLS_46({
        ...{ 'onConfirm': {} },
        title: "确认删除？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    let __VLS_49;
    let __VLS_50;
    let __VLS_51;
    const __VLS_52 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDelete(row.id);
        }
    };
    __VLS_48.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_48.slots;
        const __VLS_53 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
            link: true,
            type: "danger",
        }));
        const __VLS_55 = __VLS_54({
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_54));
        __VLS_56.slots.default;
        var __VLS_56;
    }
    var __VLS_48;
}
var __VLS_36;
var __VLS_16;
const __VLS_57 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}));
const __VLS_59 = __VLS_58({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
__VLS_60.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dialog-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "table-browser" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "browser-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_61 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
    loading: (__VLS_ctx.tablesLoading),
}));
const __VLS_63 = __VLS_62({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
    loading: (__VLS_ctx.tablesLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_62));
let __VLS_65;
let __VLS_66;
let __VLS_67;
const __VLS_68 = {
    onClick: (__VLS_ctx.refreshTables)
};
__VLS_64.slots.default;
var __VLS_64;
const __VLS_69 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
    modelValue: (__VLS_ctx.tableSearch),
    placeholder: "搜索表名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_71 = __VLS_70({
    modelValue: (__VLS_ctx.tableSearch),
    placeholder: "搜索表名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
if (__VLS_ctx.tablesLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
}
else if (!__VLS_ctx.form.datasourceId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
}
else if (!__VLS_ctx.filteredTables.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-list" },
    });
    for (const [t] of __VLS_getVForSourceType((__VLS_ctx.filteredTables))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.tablesLoading))
                        return;
                    if (!!(!__VLS_ctx.form.datasourceId))
                        return;
                    if (!!(!__VLS_ctx.filteredTables.length))
                        return;
                    __VLS_ctx.selectTable(t.tableName);
                } },
            key: (t.tableName),
            ...{ class: "table-item" },
            ...{ class: ({ active: __VLS_ctx.selectedTable === t.tableName }) },
        });
        const __VLS_73 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
            ...{ class: "table-icon" },
        }));
        const __VLS_75 = __VLS_74({
            ...{ class: "table-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_74));
        __VLS_76.slots.default;
        const __VLS_77 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({}));
        const __VLS_79 = __VLS_78({}, ...__VLS_functionalComponentArgsRest(__VLS_78));
        var __VLS_76;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "table-name" },
        });
        (t.tableName);
        if (t.tableType === 'VIEW') {
            const __VLS_81 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
                size: "small",
                type: "info",
            }));
            const __VLS_83 = __VLS_82({
                size: "small",
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_82));
            __VLS_84.slots.default;
            var __VLS_84;
        }
    }
}
if (__VLS_ctx.selectedTable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "column-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedTable);
    const __VLS_85 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }));
    const __VLS_87 = __VLS_86({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_86));
    let __VLS_89;
    let __VLS_90;
    let __VLS_91;
    const __VLS_92 = {
        onClick: (__VLS_ctx.generateSql)
    };
    __VLS_88.slots.default;
    var __VLS_88;
    if (__VLS_ctx.columnsLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "browser-tip" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "column-list" },
        });
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.tableColumns))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (col.columnName),
                ...{ class: "column-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "col-name" },
            });
            (col.columnName);
            const __VLS_93 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
                size: "small",
                ...{ class: "col-type" },
            }));
            const __VLS_95 = __VLS_94({
                size: "small",
                ...{ class: "col-type" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_94));
            __VLS_96.slots.default;
            (col.dataType);
            var __VLS_96;
            if (col.remarks) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "col-remark" },
                });
                (col.remarks);
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-area" },
});
const __VLS_97 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}));
const __VLS_99 = __VLS_98({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_101 = {};
__VLS_100.slots.default;
const __VLS_103 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    label: "名称",
    prop: "name",
}));
const __VLS_105 = __VLS_104({
    label: "名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
__VLS_106.slots.default;
const __VLS_107 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}));
const __VLS_109 = __VLS_108({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
var __VLS_106;
const __VLS_111 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    label: "数据源",
    prop: "datasourceId",
}));
const __VLS_113 = __VLS_112({
    label: "数据源",
    prop: "datasourceId",
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
__VLS_114.slots.default;
const __VLS_115 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "请选择",
    ...{ style: {} },
}));
const __VLS_117 = __VLS_116({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "请选择",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
let __VLS_119;
let __VLS_120;
let __VLS_121;
const __VLS_122 = {
    onChange: (__VLS_ctx.onDatasourceChange)
};
__VLS_118.slots.default;
for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.datasources))) {
    const __VLS_123 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
        key: (ds.id),
        label: (ds.name),
        value: (ds.id),
    }));
    const __VLS_125 = __VLS_124({
        key: (ds.id),
        label: (ds.name),
        value: (ds.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
}
var __VLS_118;
var __VLS_114;
const __VLS_127 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
    label: "SQL",
    prop: "sqlText",
}));
const __VLS_129 = __VLS_128({
    label: "SQL",
    prop: "sqlText",
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
__VLS_130.slots.default;
const __VLS_131 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    placeholder: "请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」",
}));
const __VLS_133 = __VLS_132({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    placeholder: "请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
var __VLS_130;
var __VLS_100;
if (__VLS_ctx.preview.columns.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.preview.rowCount);
    const __VLS_135 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
        data: (__VLS_ctx.preview.rows),
        border: true,
        maxHeight: "240",
    }));
    const __VLS_137 = __VLS_136({
        data: (__VLS_ctx.preview.rows),
        border: true,
        maxHeight: "240",
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    __VLS_138.slots.default;
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
        const __VLS_139 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }));
        const __VLS_141 = __VLS_140({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_140));
    }
    var __VLS_138;
}
{
    const { footer: __VLS_thisSlot } = __VLS_60.slots;
    const __VLS_143 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewLoading),
    }));
    const __VLS_145 = __VLS_144({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    let __VLS_147;
    let __VLS_148;
    let __VLS_149;
    const __VLS_150 = {
        onClick: (__VLS_ctx.handlePreview)
    };
    __VLS_146.slots.default;
    var __VLS_146;
    const __VLS_151 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
        ...{ 'onClick': {} },
    }));
    const __VLS_153 = __VLS_152({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    let __VLS_155;
    let __VLS_156;
    let __VLS_157;
    const __VLS_158 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_154.slots.default;
    var __VLS_154;
    const __VLS_159 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_161 = __VLS_160({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    let __VLS_163;
    let __VLS_164;
    let __VLS_165;
    const __VLS_166 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_162.slots.default;
    var __VLS_162;
}
var __VLS_60;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['bi-page']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-browser']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-header']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['table-list']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['table-name']} */ ;
/** @type {__VLS_StyleScopedClasses['column-header']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['column-list']} */ ;
/** @type {__VLS_StyleScopedClasses['column-item']} */ ;
/** @type {__VLS_StyleScopedClasses['col-name']} */ ;
/** @type {__VLS_StyleScopedClasses['col-type']} */ ;
/** @type {__VLS_StyleScopedClasses['col-remark']} */ ;
/** @type {__VLS_StyleScopedClasses['form-area']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
// @ts-ignore
var __VLS_102 = __VLS_101;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Grid: Grid,
            rows: rows,
            datasources: datasources,
            loading: loading,
            dialogVisible: dialogVisible,
            saving: saving,
            previewLoading: previewLoading,
            editId: editId,
            formRef: formRef,
            preview: preview,
            tablesLoading: tablesLoading,
            tableSearch: tableSearch,
            selectedTable: selectedTable,
            tableColumns: tableColumns,
            columnsLoading: columnsLoading,
            filteredTables: filteredTables,
            form: form,
            rules: rules,
            refreshTables: refreshTables,
            onDatasourceChange: onDatasourceChange,
            selectTable: selectTable,
            generateSql: generateSql,
            openCreate: openCreate,
            openEdit: openEdit,
            handleSubmit: handleSubmit,
            handleDelete: handleDelete,
            handlePreview: handlePreview,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
