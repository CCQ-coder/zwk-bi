import { computed, defineComponent, h, onMounted, reactive, ref, withDirectives, vShow } from 'vue';
import { ElMessage, ElMessageBox, ElIcon, ElTooltip, ElButton } from 'element-plus';
import { ArrowRight, DataLine, Delete, Edit, Folder, FolderAdd, Grid, Loading, Plus } from '@element-plus/icons-vue';
import { createDataset, createDatasetFolder, deleteDataset, deleteDatasetFolder, getDatasetFolderTree, getDatasetPreviewData, previewDatasetSql, renameDatasetFolder, updateDataset } from '../api/dataset';
import { getDatasourceList, getDatasourceTables, getTableColumns } from '../api/datasource';
// ---- Tree Node Component (render function, no runtime compiler needed) ----
const TreeNode = defineComponent({
    name: 'TreeNode',
    props: {
        node: { type: Object, required: true },
        selectedId: { type: Number, default: null }
    },
    emits: ['select', 'add-dataset', 'add-folder', 'rename-folder', 'delete-folder', 'delete-dataset'],
    setup(props, { emit }) {
        const expanded = ref(true);
        const hover = ref(false);
        const hoverDataset = ref(null);
        return () => {
            const node = props.node;
            // Folder row
            const folderRow = h('div', {
                class: 'folder-row',
                onMouseenter: () => { hover.value = true; },
                onMouseleave: () => { hover.value = false; },
                onClick: () => { expanded.value = !expanded.value; }
            }, [
                h(ElIcon, { class: 'expand-icon', style: { transform: expanded.value ? 'rotate(90deg)' : '' } }, () => h(ArrowRight)),
                h(ElIcon, { class: 'folder-icon', style: 'color:#e6a43c;margin-right:4px' }, () => h(Folder)),
                h('span', { class: 'folder-name' }, node.name),
                withDirectives(h('div', { class: 'node-actions', onClick: (e) => e.stopPropagation() }, [
                    h(ElTooltip, { content: '在此文件夹新建数据集' }, () => h(ElButton, { link: true, icon: Plus, onClick: () => emit('add-dataset', node.id) })),
                    h(ElTooltip, { content: '新建子文件夹' }, () => h(ElButton, { link: true, icon: FolderAdd, onClick: () => emit('add-folder', node.id) })),
                    h(ElTooltip, { content: '重命名' }, () => h(ElButton, { link: true, icon: Edit, onClick: () => emit('rename-folder', node) })),
                    ...(node.id > 0 ? [
                        h(ElTooltip, { content: '删除文件夹' }, () => h(ElButton, { link: true, icon: Delete, style: 'color:#f56c6c', onClick: () => emit('delete-folder', node.id) }))
                    ] : [])
                ]), [[vShow, hover.value]])
            ]);
            // Child folders (recursive)
            const childFolders = (node.children || []).map((child) => h(TreeNode, {
                key: child.id,
                node: child,
                selectedId: props.selectedId,
                onSelect: (id) => emit('select', id),
                'onAdd-dataset': (id) => emit('add-dataset', id),
                'onAdd-folder': (id) => emit('add-folder', id),
                'onRename-folder': (n) => emit('rename-folder', n),
                'onDelete-folder': (id) => emit('delete-folder', id),
                'onDelete-dataset': (id) => emit('delete-dataset', id),
            }));
            // Dataset rows
            const datasetRows = (node.datasets || []).map((ds) => h('div', {
                key: 'ds-' + ds.id,
                class: ['dataset-row', { selected: props.selectedId === ds.id }],
                onMouseenter: () => { hoverDataset.value = ds.id; },
                onMouseleave: () => { hoverDataset.value = null; },
                onClick: () => emit('select', ds.id)
            }, [
                h(ElIcon, { style: 'color:#409eff;margin-right:4px;font-size:12px' }, () => h(DataLine)),
                h('span', { class: 'dataset-name' }, ds.name),
                withDirectives(h('div', { class: 'node-actions', onClick: (e) => e.stopPropagation() }, [
                    h(ElTooltip, { content: '删除' }, () => h(ElButton, { link: true, icon: Delete, style: 'color:#f56c6c', onClick: () => emit('delete-dataset', ds.id) }))
                ]), [[vShow, hoverDataset.value === ds.id && !!ds.datasourceId]])
            ]));
            // Empty folder hint
            const emptyHint = (!node.children?.length && !node.datasets?.length)
                ? [h('div', { class: 'empty-folder' }, '空文件夹')]
                : [];
            // Children container
            const childrenContainer = withDirectives(h('div', { class: 'folder-children' }, [...childFolders, ...datasetRows, ...emptyHint]), [[vShow, expanded.value]]);
            return h('div', { class: 'tree-folder' }, [folderRow, childrenContainer]);
        };
    }
});
const folderTree = ref([]);
const treeLoading = ref(false);
const datasources = ref([]);
const selectedDatasetId = ref(null);
const selectedDataset = ref(null);
const preview = reactive({ columns: [], rows: [], rowCount: 0 });
const previewLoading = ref(false);
// Dialog state
const dialogVisible = ref(false);
const saving = ref(false);
const previewBtnLoading = ref(false);
const editId = ref(null);
const pendingFolderId = ref(null);
const formRef = ref();
const formPreview = reactive({ columns: [], rows: [], rowCount: 0 });
// Table browser state
const tables = ref([]);
const tablesLoading = ref(false);
const tableSearch = ref('');
const selectedTable = ref('');
const tableColumns = ref([]);
const columnsLoading = ref(false);
// Folder dialog state
const folderDialogVisible = ref(false);
const folderName = ref('');
const folderSaving = ref(false);
const folderEditId = ref(null);
const folderParentId = ref(null);
const filteredTables = computed(() => tableSearch.value
    ? tables.value.filter(t => t.tableName.toLowerCase().includes(tableSearch.value.toLowerCase()))
    : tables.value);
// Flatten all folders for the folder selector (exclude virtual "未分类" folder)
const allFoldersFlat = computed(() => {
    const result = [];
    const flatten = (nodes) => {
        for (const n of nodes) {
            if (n.id > 0)
                result.push(n);
            if (n.children?.length)
                flatten(n.children);
        }
    };
    flatten(folderTree.value);
    return result;
});
// All datasets flat (for selection lookup)
const allDatasetsFlat = computed(() => {
    const result = [];
    const collect = (nodes) => {
        for (const n of nodes) {
            if (n.datasets)
                result.push(...n.datasets);
            if (n.children)
                collect(n.children);
        }
    };
    collect(folderTree.value);
    return result;
});
const emptyForm = () => ({
    name: '',
    datasourceId: '',
    sqlText: '',
    folderId: null
});
const form = reactive(emptyForm());
const resolveDatasourceValue = (value) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
};
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    sqlText: [{ required: true, message: '请输入 SQL', trigger: 'blur' }]
};
const loadTree = async () => {
    treeLoading.value = true;
    try {
        const [tree, datasourceList] = await Promise.all([
            getDatasetFolderTree(),
            getDatasourceList()
        ]);
        folderTree.value = tree;
        datasources.value = datasourceList.filter((item) => (item.sourceKind || 'DATABASE') === 'DATABASE');
    }
    finally {
        treeLoading.value = false;
    }
};
const handleSelectDataset = async (id) => {
    selectedDatasetId.value = id;
    const ds = allDatasetsFlat.value.find(d => d.id === id);
    selectedDataset.value = ds ?? null;
    Object.assign(preview, { columns: [], rows: [], rowCount: 0 });
};
const loadPreview = async () => {
    if (!selectedDataset.value)
        return;
    previewLoading.value = true;
    try {
        const result = await getDatasetPreviewData(selectedDataset.value.id);
        Object.assign(preview, result);
    }
    catch {
        ElMessage.error('预览失败');
    }
    finally {
        previewLoading.value = false;
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
    const datasourceId = resolveDatasourceValue(form.datasourceId);
    if (datasourceId)
        loadTables(datasourceId);
};
const onDatasourceChange = (val) => {
    const datasourceId = resolveDatasourceValue(val);
    if (!datasourceId) {
        tables.value = [];
        selectedTable.value = '';
        tableColumns.value = [];
        return;
    }
    loadTables(datasourceId);
};
const selectTable = async (tableName) => {
    selectedTable.value = tableName;
    tableColumns.value = [];
    const datasourceId = resolveDatasourceValue(form.datasourceId);
    if (!datasourceId)
        return;
    columnsLoading.value = true;
    try {
        tableColumns.value = await getTableColumns(datasourceId, tableName);
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
const openCreate = (folderId) => {
    editId.value = null;
    Object.assign(form, emptyForm());
    form.folderId = folderId;
    Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 });
    tables.value = [];
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
};
const openEdit = (row) => {
    editId.value = row.id;
    form.name = row.name;
    form.datasourceId = resolveDatasourceValue(row.datasourceId) ?? '';
    form.sqlText = row.sqlText;
    form.folderId = row.folderId;
    Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 });
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
    if (row.datasourceId)
        loadTables(Number(row.datasourceId));
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        const payload = {
            name: form.name,
            datasourceId: resolveDatasourceValue(form.datasourceId),
            sqlText: form.sqlText,
            folderId: form.folderId,
        };
        if (editId.value) {
            await updateDataset(editId.value, payload);
            ElMessage.success('更新成功');
        }
        else {
            await createDataset(payload);
            ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        await loadTree();
    }
    finally {
        saving.value = false;
    }
};
const handleDeleteDataset = async (id) => {
    await ElMessageBox.confirm('确认删除该数据集？', '提示', { type: 'warning' });
    await deleteDataset(id);
    ElMessage.success('删除成功');
    if (selectedDatasetId.value === id) {
        selectedDatasetId.value = null;
        selectedDataset.value = null;
    }
    await loadTree();
};
const handlePreview = async () => {
    await formRef.value?.validateField(['sqlText']);
    previewBtnLoading.value = true;
    try {
        const result = await previewDatasetSql({
            datasourceId: resolveDatasourceValue(form.datasourceId),
            sqlText: form.sqlText
        });
        Object.assign(formPreview, result);
        ElMessage.success('SQL 预览成功');
    }
    finally {
        previewBtnLoading.value = false;
    }
};
// Folder operations
const openCreateFolder = (parentId) => {
    folderEditId.value = null;
    folderParentId.value = parentId;
    folderName.value = '';
    folderDialogVisible.value = true;
};
const openRenameFolder = (node) => {
    folderEditId.value = node.id;
    folderName.value = node.name;
    folderDialogVisible.value = true;
};
const handleFolderSubmit = async () => {
    if (!folderName.value.trim()) {
        ElMessage.warning('请输入文件夹名称');
        return;
    }
    folderSaving.value = true;
    try {
        if (folderEditId.value) {
            await renameDatasetFolder(folderEditId.value, folderName.value.trim());
            ElMessage.success('重命名成功');
        }
        else {
            await createDatasetFolder(folderName.value.trim(), folderParentId.value);
            ElMessage.success('创建成功');
        }
        folderDialogVisible.value = false;
        await loadTree();
    }
    catch {
        // error already shown by request interceptor
    }
    finally {
        folderSaving.value = false;
    }
};
const handleDeleteFolder = async (id) => {
    await ElMessageBox.confirm('删除文件夹将同时删除其中所有子文件夹，数据集将被保留至未分类。确认删除？', '提示', { type: 'warning' });
    await deleteDatasetFolder(id);
    ElMessage.success('已删除');
    await loadTree();
};
onMounted(loadTree);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['folder-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-row']} */ ;
/** @type {__VLS_StyleScopedClasses['node-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "bi-page dataset-panel" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "bi-page dataset-panel" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "folder-tree-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tree-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tree-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tree-actions" },
});
const __VLS_5 = {}.ElTooltip;
/** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    content: "新建文件夹",
}));
const __VLS_7 = __VLS_6({
    content: "新建文件夹",
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
const __VLS_9 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.FolderAdd),
    circle: true,
    size: "small",
}));
const __VLS_11 = __VLS_10({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.FolderAdd),
    circle: true,
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreateFolder(null);
    }
};
var __VLS_12;
var __VLS_8;
const __VLS_17 = {}.ElTooltip;
/** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    content: "新建数据集",
}));
const __VLS_19 = __VLS_18({
    content: "新建数据集",
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
__VLS_20.slots.default;
const __VLS_21 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Plus),
    circle: true,
    size: "small",
    type: "primary",
}));
const __VLS_23 = __VLS_22({
    ...{ 'onClick': {} },
    icon: (__VLS_ctx.Plus),
    circle: true,
    size: "small",
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_25;
let __VLS_26;
let __VLS_27;
const __VLS_28 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreate(null);
    }
};
var __VLS_24;
var __VLS_20;
if (__VLS_ctx.treeLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tree-loading" },
    });
    const __VLS_29 = {}.ElIcon;
    /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
        ...{ class: "is-loading" },
    }));
    const __VLS_31 = __VLS_30({
        ...{ class: "is-loading" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
    __VLS_32.slots.default;
    const __VLS_33 = {}.Loading;
    /** @type {[typeof __VLS_components.Loading, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({}));
    const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
    var __VLS_32;
}
else if (!__VLS_ctx.folderTree.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tree-empty" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tree-body" },
    });
    for (const [folder] of __VLS_getVForSourceType((__VLS_ctx.folderTree))) {
        const __VLS_37 = {}.TreeNode;
        /** @type {[typeof __VLS_components.TreeNode, ]} */ ;
        // @ts-ignore
        const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
            ...{ 'onSelect': {} },
            ...{ 'onAddDataset': {} },
            ...{ 'onAddFolder': {} },
            ...{ 'onRenameFolder': {} },
            ...{ 'onDeleteFolder': {} },
            ...{ 'onDeleteDataset': {} },
            key: (folder.id),
            node: (folder),
            selectedId: (__VLS_ctx.selectedDatasetId),
        }));
        const __VLS_39 = __VLS_38({
            ...{ 'onSelect': {} },
            ...{ 'onAddDataset': {} },
            ...{ 'onAddFolder': {} },
            ...{ 'onRenameFolder': {} },
            ...{ 'onDeleteFolder': {} },
            ...{ 'onDeleteDataset': {} },
            key: (folder.id),
            node: (folder),
            selectedId: (__VLS_ctx.selectedDatasetId),
        }, ...__VLS_functionalComponentArgsRest(__VLS_38));
        let __VLS_41;
        let __VLS_42;
        let __VLS_43;
        const __VLS_44 = {
            onSelect: (__VLS_ctx.handleSelectDataset)
        };
        const __VLS_45 = {
            onAddDataset: (__VLS_ctx.openCreate)
        };
        const __VLS_46 = {
            onAddFolder: (__VLS_ctx.openCreateFolder)
        };
        const __VLS_47 = {
            onRenameFolder: (__VLS_ctx.openRenameFolder)
        };
        const __VLS_48 = {
            onDeleteFolder: (__VLS_ctx.handleDeleteFolder)
        };
        const __VLS_49 = {
            onDeleteDataset: (__VLS_ctx.handleDeleteDataset)
        };
        var __VLS_40;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "main-content" },
});
if (__VLS_ctx.selectedDataset) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "content-title" },
    });
    (__VLS_ctx.selectedDataset.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-actions" },
    });
    const __VLS_50 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_54;
    let __VLS_55;
    let __VLS_56;
    const __VLS_57 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedDataset))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selectedDataset);
        }
    };
    __VLS_53.slots.default;
    var __VLS_53;
    if (__VLS_ctx.selectedDataset.datasourceId) {
        const __VLS_58 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
            ...{ 'onConfirm': {} },
            title: "确认删除？",
        }));
        const __VLS_60 = __VLS_59({
            ...{ 'onConfirm': {} },
            title: "确认删除？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_59));
        let __VLS_62;
        let __VLS_63;
        let __VLS_64;
        const __VLS_65 = {
            onConfirm: (...[$event]) => {
                if (!(__VLS_ctx.selectedDataset))
                    return;
                if (!(__VLS_ctx.selectedDataset.datasourceId))
                    return;
                __VLS_ctx.handleDeleteDataset(__VLS_ctx.selectedDataset.id);
            }
        };
        __VLS_61.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_61.slots;
            const __VLS_66 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
                type: "danger",
                size: "small",
            }));
            const __VLS_68 = __VLS_67({
                type: "danger",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_67));
            __VLS_69.slots.default;
            var __VLS_69;
        }
        var __VLS_61;
    }
    if (!__VLS_ctx.selectedDataset.datasourceId) {
        const __VLS_70 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
            type: "success",
            size: "small",
        }));
        const __VLS_72 = __VLS_71({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_71));
        __VLS_73.slots.default;
        var __VLS_73;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "info-val" },
    });
    (!__VLS_ctx.selectedDataset.datasourceId ? '内置演示' : __VLS_ctx.selectedDataset.datasourceId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "info-sql" },
    });
    (__VLS_ctx.selectedDataset.sqlText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "info-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "info-val" },
    });
    (__VLS_ctx.selectedDataset.createdAt);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_74 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.previewLoading),
    }));
    const __VLS_76 = __VLS_75({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.previewLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    let __VLS_78;
    let __VLS_79;
    let __VLS_80;
    const __VLS_81 = {
        onClick: (__VLS_ctx.loadPreview)
    };
    __VLS_77.slots.default;
    var __VLS_77;
    if (__VLS_ctx.preview.columns.length) {
        const __VLS_82 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
            data: (__VLS_ctx.preview.rows),
            border: true,
            maxHeight: "320",
            size: "small",
        }));
        const __VLS_84 = __VLS_83({
            data: (__VLS_ctx.preview.rows),
            border: true,
            maxHeight: "320",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_83));
        __VLS_85.slots.default;
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
            const __VLS_86 = {}.ElTableColumn;
            /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
            // @ts-ignore
            const __VLS_87 = __VLS_asFunctionalComponent(__VLS_86, new __VLS_86({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "120",
                showOverflowTooltip: true,
            }));
            const __VLS_88 = __VLS_87({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "120",
                showOverflowTooltip: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_87));
        }
        var __VLS_85;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-empty" },
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-empty" },
    });
    const __VLS_90 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        description: "请在左侧选择数据集",
    }));
    const __VLS_92 = __VLS_91({
        description: "请在左侧选择数据集",
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
}
const __VLS_94 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}));
const __VLS_96 = __VLS_95({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_95));
__VLS_97.slots.default;
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
const __VLS_98 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
    loading: (__VLS_ctx.tablesLoading),
}));
const __VLS_100 = __VLS_99({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
    loading: (__VLS_ctx.tablesLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
let __VLS_102;
let __VLS_103;
let __VLS_104;
const __VLS_105 = {
    onClick: (__VLS_ctx.refreshTables)
};
__VLS_101.slots.default;
var __VLS_101;
const __VLS_106 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    modelValue: (__VLS_ctx.tableSearch),
    placeholder: "搜索表名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_108 = __VLS_107({
    modelValue: (__VLS_ctx.tableSearch),
    placeholder: "搜索表名",
    size: "small",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
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
        const __VLS_110 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
            ...{ class: "table-icon" },
        }));
        const __VLS_112 = __VLS_111({
            ...{ class: "table-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_111));
        __VLS_113.slots.default;
        const __VLS_114 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({}));
        const __VLS_116 = __VLS_115({}, ...__VLS_functionalComponentArgsRest(__VLS_115));
        var __VLS_113;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "table-name" },
        });
        (t.tableName);
        if (t.tableType === 'VIEW') {
            const __VLS_118 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
                size: "small",
                type: "info",
            }));
            const __VLS_120 = __VLS_119({
                size: "small",
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_119));
            __VLS_121.slots.default;
            var __VLS_121;
        }
    }
}
if (__VLS_ctx.selectedTable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "column-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedTable);
    const __VLS_122 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }));
    const __VLS_124 = __VLS_123({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    let __VLS_126;
    let __VLS_127;
    let __VLS_128;
    const __VLS_129 = {
        onClick: (__VLS_ctx.generateSql)
    };
    __VLS_125.slots.default;
    var __VLS_125;
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
            const __VLS_130 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
                size: "small",
                ...{ class: "col-type" },
            }));
            const __VLS_132 = __VLS_131({
                size: "small",
                ...{ class: "col-type" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_131));
            __VLS_133.slots.default;
            (col.dataType);
            var __VLS_133;
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
const __VLS_134 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}));
const __VLS_136 = __VLS_135({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_138 = {};
__VLS_137.slots.default;
const __VLS_140 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    label: "名称",
    prop: "name",
}));
const __VLS_142 = __VLS_141({
    label: "名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
const __VLS_144 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}));
const __VLS_146 = __VLS_145({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
var __VLS_143;
const __VLS_148 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    label: "所属文件夹",
}));
const __VLS_150 = __VLS_149({
    label: "所属文件夹",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    modelValue: (__VLS_ctx.form.folderId),
    placeholder: "根目录（不选文件夹）",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_154 = __VLS_153({
    modelValue: (__VLS_ctx.form.folderId),
    placeholder: "根目录（不选文件夹）",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
for (const [f] of __VLS_getVForSourceType((__VLS_ctx.allFoldersFlat))) {
    const __VLS_156 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        key: (f.id),
        label: (f.name),
        value: (f.id),
    }));
    const __VLS_158 = __VLS_157({
        key: (f.id),
        label: (f.name),
        value: (f.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
}
var __VLS_155;
var __VLS_151;
const __VLS_160 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "数据源",
    prop: "datasourceId",
}));
const __VLS_162 = __VLS_161({
    label: "数据源",
    prop: "datasourceId",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "留空表示演示数据集",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_166 = __VLS_165({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "留空表示演示数据集",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
let __VLS_168;
let __VLS_169;
let __VLS_170;
const __VLS_171 = {
    onChange: (__VLS_ctx.onDatasourceChange)
};
__VLS_167.slots.default;
for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.datasources))) {
    const __VLS_172 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        key: (ds.id),
        label: (`${ds.name} (${ds.datasourceType || 'DATABASE'})`),
        value: (ds.id),
    }));
    const __VLS_174 = __VLS_173({
        key: (ds.id),
        label: (`${ds.name} (${ds.datasourceType || 'DATABASE'})`),
        value: (ds.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
}
var __VLS_167;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-empty" },
    ...{ style: {} },
});
var __VLS_163;
const __VLS_176 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "SQL",
    prop: "sqlText",
}));
const __VLS_178 = __VLS_177({
    label: "SQL",
    prop: "sqlText",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    placeholder: "请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」",
}));
const __VLS_182 = __VLS_181({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    placeholder: "请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
var __VLS_137;
if (__VLS_ctx.formPreview.columns.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formPreview.rowCount);
    const __VLS_184 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        data: (__VLS_ctx.formPreview.rows),
        border: true,
        maxHeight: "240",
    }));
    const __VLS_186 = __VLS_185({
        data: (__VLS_ctx.formPreview.rows),
        border: true,
        maxHeight: "240",
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    __VLS_187.slots.default;
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.formPreview.columns))) {
        const __VLS_188 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }));
        const __VLS_190 = __VLS_189({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    }
    var __VLS_187;
}
{
    const { footer: __VLS_thisSlot } = __VLS_97.slots;
    const __VLS_192 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewBtnLoading),
    }));
    const __VLS_194 = __VLS_193({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewBtnLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    let __VLS_196;
    let __VLS_197;
    let __VLS_198;
    const __VLS_199 = {
        onClick: (__VLS_ctx.handlePreview)
    };
    __VLS_195.slots.default;
    var __VLS_195;
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_203.slots.default;
    var __VLS_203;
    const __VLS_208 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_211.slots.default;
    var __VLS_211;
}
var __VLS_97;
const __VLS_216 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    modelValue: (__VLS_ctx.folderDialogVisible),
    title: (__VLS_ctx.folderEditId ? '重命名文件夹' : '新建文件夹'),
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_218 = __VLS_217({
    modelValue: (__VLS_ctx.folderDialogVisible),
    title: (__VLS_ctx.folderEditId ? '重命名文件夹' : '新建文件夹'),
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
__VLS_219.slots.default;
const __VLS_220 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    labelWidth: "80px",
}));
const __VLS_222 = __VLS_221({
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
__VLS_223.slots.default;
const __VLS_224 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    label: "名称",
}));
const __VLS_226 = __VLS_225({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
__VLS_227.slots.default;
const __VLS_228 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.folderName),
    placeholder: "请输入文件夹名称",
}));
const __VLS_230 = __VLS_229({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.folderName),
    placeholder: "请输入文件夹名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
let __VLS_232;
let __VLS_233;
let __VLS_234;
const __VLS_235 = {
    onKeyup: (__VLS_ctx.handleFolderSubmit)
};
var __VLS_231;
var __VLS_227;
var __VLS_223;
{
    const { footer: __VLS_thisSlot } = __VLS_219.slots;
    const __VLS_236 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        ...{ 'onClick': {} },
    }));
    const __VLS_238 = __VLS_237({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    let __VLS_240;
    let __VLS_241;
    let __VLS_242;
    const __VLS_243 = {
        onClick: (...[$event]) => {
            __VLS_ctx.folderDialogVisible = false;
        }
    };
    __VLS_239.slots.default;
    var __VLS_239;
    const __VLS_244 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.folderSaving),
    }));
    const __VLS_246 = __VLS_245({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.folderSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    let __VLS_248;
    let __VLS_249;
    let __VLS_250;
    const __VLS_251 = {
        onClick: (__VLS_ctx.handleFolderSubmit)
    };
    __VLS_247.slots.default;
    var __VLS_247;
}
var __VLS_219;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['bi-page']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['folder-tree-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-body']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['content-header']} */ ;
/** @type {__VLS_StyleScopedClasses['content-title']} */ ;
/** @type {__VLS_StyleScopedClasses['content-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['content-info']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-val']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-sql']} */ ;
/** @type {__VLS_StyleScopedClasses['info-row']} */ ;
/** @type {__VLS_StyleScopedClasses['info-label']} */ ;
/** @type {__VLS_StyleScopedClasses['info-val']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-section']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['content-empty']} */ ;
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
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
// @ts-ignore
var __VLS_139 = __VLS_138;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ElIcon: ElIcon,
            ElTooltip: ElTooltip,
            ElButton: ElButton,
            FolderAdd: FolderAdd,
            Grid: Grid,
            Loading: Loading,
            Plus: Plus,
            TreeNode: TreeNode,
            folderTree: folderTree,
            treeLoading: treeLoading,
            datasources: datasources,
            selectedDatasetId: selectedDatasetId,
            selectedDataset: selectedDataset,
            preview: preview,
            previewLoading: previewLoading,
            dialogVisible: dialogVisible,
            saving: saving,
            previewBtnLoading: previewBtnLoading,
            editId: editId,
            formRef: formRef,
            formPreview: formPreview,
            tablesLoading: tablesLoading,
            tableSearch: tableSearch,
            selectedTable: selectedTable,
            tableColumns: tableColumns,
            columnsLoading: columnsLoading,
            folderDialogVisible: folderDialogVisible,
            folderName: folderName,
            folderSaving: folderSaving,
            folderEditId: folderEditId,
            filteredTables: filteredTables,
            allFoldersFlat: allFoldersFlat,
            form: form,
            rules: rules,
            handleSelectDataset: handleSelectDataset,
            loadPreview: loadPreview,
            refreshTables: refreshTables,
            onDatasourceChange: onDatasourceChange,
            selectTable: selectTable,
            generateSql: generateSql,
            openCreate: openCreate,
            openEdit: openEdit,
            handleSubmit: handleSubmit,
            handleDeleteDataset: handleDeleteDataset,
            handlePreview: handlePreview,
            openCreateFolder: openCreateFolder,
            openRenameFolder: openRenameFolder,
            handleFolderSubmit: handleFolderSubmit,
            handleDeleteFolder: handleDeleteFolder,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
