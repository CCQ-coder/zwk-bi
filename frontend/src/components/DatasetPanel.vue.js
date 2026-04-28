import { computed, defineComponent, h, onMounted, reactive, ref, withDirectives, vShow } from 'vue';
import { ElMessage, ElMessageBox, ElIcon, ElTooltip, ElButton } from 'element-plus';
import { ArrowRight, DataLine, Delete, Edit, Folder, FolderAdd, Grid, Loading, Plus } from '@element-plus/icons-vue';
import { createDataset, createDatasetFolder, deleteDataset, deleteDatasetFolder, getDatasetFields, getDatasetFolderTree, getDatasetPreviewData, previewDatasetSql, renameDatasetFolder, updateDataset } from '../api/dataset';
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
const selectedDatasetFields = ref([]);
const preview = reactive({ columns: [], rows: [], rowCount: 0 });
const previewLoading = ref(false);
const detailFilterPage = ref(1);
const detailFilterPageSize = ref(6);
const detailPreviewPage = ref(1);
const detailPreviewPageSize = ref(5);
// Dialog state
const dialogVisible = ref(false);
const saving = ref(false);
const previewBtnLoading = ref(false);
const editId = ref(null);
const pendingFolderId = ref(null);
const formRef = ref();
const formPreview = reactive({ columns: [], rows: [], rowCount: 0 });
const datasetFields = ref([]);
const selectedFilterFieldNames = ref([]);
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
const SOURCE_KIND_LABELS = {
    DATABASE: '数据库',
    API: 'API 接口',
    TABLE: '表格',
    JSON_STATIC: 'JSON 静态数据',
};
const form = reactive(emptyForm());
const availableFilterFields = computed(() => {
    const fieldMap = new Map(datasetFields.value.map((field) => [field.fieldName, field]));
    const orderedNames = formPreview.columns.length
        ? formPreview.columns
        : datasetFields.value.map((field) => field.fieldName);
    const seen = new Set();
    return orderedNames
        .map((fieldName) => fieldName.trim())
        .filter((fieldName) => {
        if (!fieldName || seen.has(fieldName)) {
            return false;
        }
        seen.add(fieldName);
        return true;
    })
        .map((fieldName) => ({
        fieldName,
        fieldType: fieldMap.get(fieldName)?.fieldType ?? inferPreviewFieldType(fieldName),
        samples: collectFieldSamples(fieldName),
    }));
});
const selectedFilterFieldCount = computed(() => {
    const allowed = new Set(availableFilterFields.value.map((field) => field.fieldName));
    return selectedFilterFieldNames.value.filter((fieldName) => allowed.has(fieldName)).length;
});
const configuredFilterFields = computed(() => selectedDatasetFields.value.filter((field) => field.filterable));
const paginatedConfiguredFilterFields = computed(() => {
    const start = (detailFilterPage.value - 1) * detailFilterPageSize.value;
    return configuredFilterFields.value.slice(start, start + detailFilterPageSize.value);
});
const paginatedPreviewRows = computed(() => {
    const start = (detailPreviewPage.value - 1) * detailPreviewPageSize.value;
    return preview.rows.slice(start, start + detailPreviewPageSize.value);
});
const resolveDatasourceValue = (value) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
};
const resolveSourceKind = (datasource) => datasource?.sourceKind || 'DATABASE';
const sourceKindLabel = (kind) => SOURCE_KIND_LABELS[kind] || kind;
const isDatabaseDatasource = (datasource) => resolveSourceKind(datasource) === 'DATABASE';
const formDatasource = computed(() => {
    const datasourceId = resolveDatasourceValue(form.datasourceId);
    return datasourceId ? datasources.value.find((item) => item.id === datasourceId) ?? null : null;
});
const showTableBrowser = computed(() => !!formDatasource.value && isDatabaseDatasource(formDatasource.value));
const requiresSqlText = computed(() => !formDatasource.value || isDatabaseDatasource(formDatasource.value));
const isReadonlySqlField = computed(() => !!formDatasource.value && !isDatabaseDatasource(formDatasource.value));
const formDatasourceKindLabel = computed(() => formDatasource.value ? sourceKindLabel(resolveSourceKind(formDatasource.value)) : '演示数据集');
const sqlFieldLabel = computed(() => requiresSqlText.value ? 'SQL' : '附加 SQL（可选）');
const sqlFieldPlaceholder = computed(() => {
    if (!formDatasource.value) {
        return '请输入演示数据标识，例如 demo_sales_monthly';
    }
    if (isDatabaseDatasource(formDatasource.value)) {
        return '请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」';
    }
    return `当前数据源为${formDatasourceKindLabel.value}，将直接复用数据源结果，通常无需填写`;
});
const rules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    sqlText: [{
            validator: (_rule, value, callback) => {
                if (!requiresSqlText.value || String(value ?? '').trim()) {
                    callback();
                    return;
                }
                callback(new Error(formDatasource.value ? '请输入 SQL' : '请输入演示数据标识'));
            },
            trigger: 'blur'
        }]
};
const loadTree = async () => {
    treeLoading.value = true;
    try {
        const [tree, datasourceList] = await Promise.all([
            getDatasetFolderTree(),
            getDatasourceList()
        ]);
        folderTree.value = tree;
        datasources.value = datasourceList;
    }
    finally {
        treeLoading.value = false;
    }
};
const syncSelectedDatasetFromTree = () => {
    selectedDataset.value = selectedDatasetId.value == null
        ? null
        : allDatasetsFlat.value.find((dataset) => dataset.id === selectedDatasetId.value) ?? null;
};
const loadSelectedDatasetFields = async (datasetId) => {
    selectedDatasetFields.value = [];
    detailFilterPage.value = 1;
    if (!datasetId)
        return;
    try {
        selectedDatasetFields.value = await getDatasetFields(datasetId);
    }
    catch {
        selectedDatasetFields.value = [];
    }
};
const loadPreviewForDataset = async (datasetId, showError = true) => {
    Object.assign(preview, { columns: [], rows: [], rowCount: 0 });
    detailPreviewPage.value = 1;
    if (!datasetId)
        return;
    previewLoading.value = true;
    try {
        const result = await getDatasetPreviewData(datasetId);
        Object.assign(preview, result);
    }
    catch {
        if (showError) {
            ElMessage.error('预览失败');
        }
    }
    finally {
        previewLoading.value = false;
    }
};
const handleSelectDataset = async (id) => {
    selectedDatasetId.value = id;
    syncSelectedDatasetFromTree();
    await Promise.all([
        loadSelectedDatasetFields(id),
        loadPreviewForDataset(id, false)
    ]);
};
const loadPreview = async () => {
    await loadPreviewForDataset(selectedDataset.value?.id ?? null);
};
const loadTables = async (dsId) => {
    tables.value = [];
    selectedTable.value = '';
    tableColumns.value = [];
    if (!dsId)
        return;
    const datasource = datasources.value.find((item) => item.id === dsId);
    if (!datasource || !isDatabaseDatasource(datasource))
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
    if (datasourceId && showTableBrowser.value)
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
    const datasource = datasources.value.find((item) => item.id === datasourceId);
    if (!datasource || !isDatabaseDatasource(datasource)) {
        form.sqlText = '';
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
    if (!showTableBrowser.value)
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
const inferPreviewFieldType = (fieldName) => {
    for (const row of formPreview.rows) {
        const value = row[fieldName];
        if (value == null)
            continue;
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'boolean')
            return 'boolean';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
            return 'datetime';
        return 'string';
    }
    return 'string';
};
const collectFieldSamples = (fieldName) => {
    const samples = new Set();
    for (const row of formPreview.rows) {
        const value = row[fieldName];
        if (value == null)
            continue;
        const text = String(value).trim();
        if (!text)
            continue;
        samples.add(text);
        if (samples.size >= 3)
            break;
    }
    return Array.from(samples);
};
const loadDatasetFieldConfig = async (datasetId) => {
    datasetFields.value = [];
    selectedFilterFieldNames.value = [];
    if (!datasetId)
        return;
    try {
        const fields = await getDatasetFields(datasetId);
        datasetFields.value = fields;
        selectedFilterFieldNames.value = fields.filter((field) => field.filterable).map((field) => field.fieldName);
    }
    catch {
        datasetFields.value = [];
        selectedFilterFieldNames.value = [];
    }
};
const resolveSelectedFilterFieldNames = () => {
    const allowed = new Set(availableFilterFields.value.map((field) => field.fieldName));
    return selectedFilterFieldNames.value.filter((fieldName) => allowed.has(fieldName));
};
const openCreate = (folderId) => {
    editId.value = null;
    Object.assign(form, emptyForm());
    form.folderId = folderId;
    Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 });
    datasetFields.value = [];
    selectedFilterFieldNames.value = [];
    tables.value = [];
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
};
const openEdit = async (row) => {
    editId.value = row.id;
    form.name = row.name;
    form.datasourceId = resolveDatasourceValue(row.datasourceId) ?? '';
    form.sqlText = row.sqlText;
    form.folderId = row.folderId;
    Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 });
    await loadDatasetFieldConfig(row.id);
    selectedTable.value = '';
    tableColumns.value = [];
    tableSearch.value = '';
    dialogVisible.value = true;
    const datasource = datasources.value.find((item) => item.id === Number(row.datasourceId));
    if (row.datasourceId && datasource && isDatabaseDatasource(datasource))
        loadTables(Number(row.datasourceId));
};
const handleSubmit = async () => {
    await formRef.value?.validate();
    saving.value = true;
    try {
        const payload = {
            name: form.name,
            datasourceId: resolveDatasourceValue(form.datasourceId),
            sqlText: requiresSqlText.value ? form.sqlText.trim() : '',
            folderId: form.folderId,
            filterFieldNames: resolveSelectedFilterFieldNames(),
        };
        const saved = editId.value
            ? await updateDataset(editId.value, payload)
            : await createDataset(payload);
        if (editId.value) {
            ElMessage.success('更新成功');
        }
        else {
            ElMessage.success('创建成功');
        }
        dialogVisible.value = false;
        await loadTree();
        await handleSelectDataset(saved.id);
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
        selectedDatasetFields.value = [];
        detailFilterPage.value = 1;
        detailPreviewPage.value = 1;
    }
    await loadTree();
};
const handlePreview = async () => {
    if (requiresSqlText.value) {
        await formRef.value?.validateField(['sqlText']);
    }
    previewBtnLoading.value = true;
    try {
        const result = await previewDatasetSql({
            datasourceId: resolveDatasourceValue(form.datasourceId),
            sqlText: requiresSqlText.value ? form.sqlText.trim() : ''
        });
        Object.assign(formPreview, result);
        selectedFilterFieldNames.value = resolveSelectedFilterFieldNames();
        ElMessage.success(requiresSqlText.value ? 'SQL 预览成功' : '数据预览成功');
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
/** @type {__VLS_StyleScopedClasses['detail-filter-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-card']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-list']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-filter-grid']} */ ;
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
        ...{ class: "detail-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "detail-meta" },
    });
    (__VLS_ctx.configuredFilterFields.length);
    if (__VLS_ctx.configuredFilterFields.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-filter-grid" },
        });
        for (const [field] of __VLS_getVForSourceType((__VLS_ctx.paginatedConfiguredFilterFields))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (field.fieldName),
                ...{ class: "detail-filter-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "detail-filter-card__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (field.fieldName);
            const __VLS_74 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
                size: "small",
                effect: "plain",
            }));
            const __VLS_76 = __VLS_75({
                size: "small",
                effect: "plain",
            }, ...__VLS_functionalComponentArgsRest(__VLS_75));
            __VLS_77.slots.default;
            (field.fieldType);
            var __VLS_77;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "detail-filter-card__meta" },
            });
            (field.fieldLabel || field.fieldName);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-empty preview-empty--compact" },
        });
    }
    if (__VLS_ctx.configuredFilterFields.length > __VLS_ctx.detailFilterPageSize) {
        const __VLS_78 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
            currentPage: (__VLS_ctx.detailFilterPage),
            pageSize: (__VLS_ctx.detailFilterPageSize),
            ...{ class: "detail-pagination" },
            background: true,
            layout: "total, sizes, prev, pager, next",
            pageSizes: ([6, 12, 24]),
            total: (__VLS_ctx.configuredFilterFields.length),
        }));
        const __VLS_80 = __VLS_79({
            currentPage: (__VLS_ctx.detailFilterPage),
            pageSize: (__VLS_ctx.detailFilterPageSize),
            ...{ class: "detail-pagination" },
            background: true,
            layout: "total, sizes, prev, pager, next",
            pageSizes: ([6, 12, 24]),
            total: (__VLS_ctx.configuredFilterFields.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-actions-inline" },
    });
    if (__VLS_ctx.preview.columns.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "detail-meta" },
        });
        (__VLS_ctx.paginatedPreviewRows.length);
        (__VLS_ctx.preview.rows.length);
    }
    const __VLS_82 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.previewLoading),
    }));
    const __VLS_84 = __VLS_83({
        ...{ 'onClick': {} },
        size: "small",
        loading: (__VLS_ctx.previewLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    let __VLS_86;
    let __VLS_87;
    let __VLS_88;
    const __VLS_89 = {
        onClick: (__VLS_ctx.loadPreview)
    };
    __VLS_85.slots.default;
    var __VLS_85;
    if (__VLS_ctx.preview.columns.length) {
        const __VLS_90 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
            data: (__VLS_ctx.paginatedPreviewRows),
            border: true,
            maxHeight: "320",
            size: "small",
        }));
        const __VLS_92 = __VLS_91({
            data: (__VLS_ctx.paginatedPreviewRows),
            border: true,
            maxHeight: "320",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_91));
        __VLS_93.slots.default;
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
            const __VLS_94 = {}.ElTableColumn;
            /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
            // @ts-ignore
            const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "120",
                showOverflowTooltip: true,
            }));
            const __VLS_96 = __VLS_95({
                key: (col),
                prop: (col),
                label: (col),
                minWidth: "120",
                showOverflowTooltip: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_95));
        }
        var __VLS_93;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-empty" },
        });
    }
    if (__VLS_ctx.preview.columns.length && __VLS_ctx.preview.rows.length > __VLS_ctx.detailPreviewPageSize) {
        const __VLS_98 = {}.ElPagination;
        /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
        // @ts-ignore
        const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
            currentPage: (__VLS_ctx.detailPreviewPage),
            pageSize: (__VLS_ctx.detailPreviewPageSize),
            ...{ class: "detail-pagination" },
            background: true,
            layout: "total, sizes, prev, pager, next",
            pageSizes: ([5, 10, 20]),
            total: (__VLS_ctx.preview.rows.length),
        }));
        const __VLS_100 = __VLS_99({
            currentPage: (__VLS_ctx.detailPreviewPage),
            pageSize: (__VLS_ctx.detailPreviewPageSize),
            ...{ class: "detail-pagination" },
            background: true,
            layout: "total, sizes, prev, pager, next",
            pageSizes: ([5, 10, 20]),
            total: (__VLS_ctx.preview.rows.length),
        }, ...__VLS_functionalComponentArgsRest(__VLS_99));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "content-empty" },
    });
    const __VLS_102 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
        description: "请在左侧选择数据集",
    }));
    const __VLS_104 = __VLS_103({
        description: "请在左侧选择数据集",
    }, ...__VLS_functionalComponentArgsRest(__VLS_103));
}
const __VLS_106 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}));
const __VLS_108 = __VLS_107({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editId ? '编辑数据集' : '新建数据集'),
    width: "900px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_107));
__VLS_109.slots.default;
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
(__VLS_ctx.showTableBrowser ? '数据表浏览' : '数据源说明');
if (__VLS_ctx.showTableBrowser) {
    const __VLS_110 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        loading: (__VLS_ctx.tablesLoading),
    }));
    const __VLS_112 = __VLS_111({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        loading: (__VLS_ctx.tablesLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_111));
    let __VLS_114;
    let __VLS_115;
    let __VLS_116;
    const __VLS_117 = {
        onClick: (__VLS_ctx.refreshTables)
    };
    __VLS_113.slots.default;
    var __VLS_113;
}
if (__VLS_ctx.showTableBrowser) {
    const __VLS_118 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        modelValue: (__VLS_ctx.tableSearch),
        placeholder: "搜索表名",
        size: "small",
        clearable: true,
        ...{ style: {} },
    }));
    const __VLS_120 = __VLS_119({
        modelValue: (__VLS_ctx.tableSearch),
        placeholder: "搜索表名",
        size: "small",
        clearable: true,
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
}
if (__VLS_ctx.showTableBrowser && __VLS_ctx.tablesLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
}
else if (!__VLS_ctx.form.datasourceId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
}
else if (!__VLS_ctx.showTableBrowser) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "browser-tip" },
    });
    (__VLS_ctx.formDatasourceKindLabel);
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
                    if (!!(__VLS_ctx.showTableBrowser && __VLS_ctx.tablesLoading))
                        return;
                    if (!!(!__VLS_ctx.form.datasourceId))
                        return;
                    if (!!(!__VLS_ctx.showTableBrowser))
                        return;
                    if (!!(!__VLS_ctx.filteredTables.length))
                        return;
                    __VLS_ctx.selectTable(t.tableName);
                } },
            key: (t.tableName),
            ...{ class: "table-item" },
            ...{ class: ({ active: __VLS_ctx.selectedTable === t.tableName }) },
        });
        const __VLS_122 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
            ...{ class: "table-icon" },
        }));
        const __VLS_124 = __VLS_123({
            ...{ class: "table-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_123));
        __VLS_125.slots.default;
        const __VLS_126 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({}));
        const __VLS_128 = __VLS_127({}, ...__VLS_functionalComponentArgsRest(__VLS_127));
        var __VLS_125;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "table-name" },
        });
        (t.tableName);
        if (t.tableType === 'VIEW') {
            const __VLS_130 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
                size: "small",
                type: "info",
            }));
            const __VLS_132 = __VLS_131({
                size: "small",
                type: "info",
            }, ...__VLS_functionalComponentArgsRest(__VLS_131));
            __VLS_133.slots.default;
            var __VLS_133;
        }
    }
}
if (__VLS_ctx.showTableBrowser && __VLS_ctx.selectedTable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "column-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedTable);
    const __VLS_134 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }));
    const __VLS_136 = __VLS_135({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    let __VLS_138;
    let __VLS_139;
    let __VLS_140;
    const __VLS_141 = {
        onClick: (__VLS_ctx.generateSql)
    };
    __VLS_137.slots.default;
    var __VLS_137;
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
            const __VLS_142 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
                size: "small",
                ...{ class: "col-type" },
            }));
            const __VLS_144 = __VLS_143({
                size: "small",
                ...{ class: "col-type" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_143));
            __VLS_145.slots.default;
            (col.dataType);
            var __VLS_145;
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
const __VLS_146 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}));
const __VLS_148 = __VLS_147({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_150 = {};
__VLS_149.slots.default;
const __VLS_152 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    label: "名称",
    prop: "name",
}));
const __VLS_154 = __VLS_153({
    label: "名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}));
const __VLS_158 = __VLS_157({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据集名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
var __VLS_155;
const __VLS_160 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "所属文件夹",
}));
const __VLS_162 = __VLS_161({
    label: "所属文件夹",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    modelValue: (__VLS_ctx.form.folderId),
    placeholder: "根目录（不选文件夹）",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_166 = __VLS_165({
    modelValue: (__VLS_ctx.form.folderId),
    placeholder: "根目录（不选文件夹）",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
for (const [f] of __VLS_getVForSourceType((__VLS_ctx.allFoldersFlat))) {
    const __VLS_168 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        key: (f.id),
        label: (f.name),
        value: (f.id),
    }));
    const __VLS_170 = __VLS_169({
        key: (f.id),
        label: (f.name),
        value: (f.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
}
var __VLS_167;
var __VLS_163;
const __VLS_172 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    label: "数据源",
    prop: "datasourceId",
}));
const __VLS_174 = __VLS_173({
    label: "数据源",
    prop: "datasourceId",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
__VLS_175.slots.default;
const __VLS_176 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "留空表示演示数据集",
    clearable: true,
    ...{ style: {} },
}));
const __VLS_178 = __VLS_177({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.form.datasourceId),
    placeholder: "留空表示演示数据集",
    clearable: true,
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_180;
let __VLS_181;
let __VLS_182;
const __VLS_183 = {
    onChange: (__VLS_ctx.onDatasourceChange)
};
__VLS_179.slots.default;
for (const [ds] of __VLS_getVForSourceType((__VLS_ctx.datasources))) {
    const __VLS_184 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        key: (ds.id),
        label: (`${ds.name} (${__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(ds))})`),
        value: (ds.id),
    }));
    const __VLS_186 = __VLS_185({
        key: (ds.id),
        label: (`${ds.name} (${__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(ds))})`),
        value: (ds.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
}
var __VLS_179;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-empty" },
    ...{ style: {} },
});
var __VLS_175;
const __VLS_188 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    label: (__VLS_ctx.sqlFieldLabel),
    prop: "sqlText",
}));
const __VLS_190 = __VLS_189({
    label: (__VLS_ctx.sqlFieldLabel),
    prop: "sqlText",
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
__VLS_191.slots.default;
const __VLS_192 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    disabled: (__VLS_ctx.isReadonlySqlField),
    placeholder: (__VLS_ctx.sqlFieldPlaceholder),
}));
const __VLS_194 = __VLS_193({
    modelValue: (__VLS_ctx.form.sqlText),
    type: "textarea",
    rows: (8),
    disabled: (__VLS_ctx.isReadonlySqlField),
    placeholder: (__VLS_ctx.sqlFieldPlaceholder),
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
var __VLS_191;
var __VLS_149;
if (__VLS_ctx.availableFilterFields.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.selectedFilterFieldCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-panel-tip" },
    });
    const __VLS_196 = {}.ElCheckboxGroup;
    /** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        modelValue: (__VLS_ctx.selectedFilterFieldNames),
        ...{ class: "filter-field-list" },
    }));
    const __VLS_198 = __VLS_197({
        modelValue: (__VLS_ctx.selectedFilterFieldNames),
        ...{ class: "filter-field-list" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    for (const [field] of __VLS_getVForSourceType((__VLS_ctx.availableFilterFields))) {
        const __VLS_200 = {}.ElCheckbox;
        /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
        // @ts-ignore
        const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
            key: (field.fieldName),
            label: (field.fieldName),
            ...{ class: "filter-field-card" },
        }));
        const __VLS_202 = __VLS_201({
            key: (field.fieldName),
            label: (field.fieldName),
            ...{ class: "filter-field-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_201));
        __VLS_203.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-field-card__head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (field.fieldName);
        const __VLS_204 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            size: "small",
            effect: "plain",
        }));
        const __VLS_206 = __VLS_205({
            size: "small",
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        __VLS_207.slots.default;
        (field.fieldType);
        var __VLS_207;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-field-card__meta" },
        });
        (field.samples.length ? `样例：${field.samples.join(' / ')}` : '执行预览后可查看样例值');
        var __VLS_203;
    }
    var __VLS_199;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-panel filter-panel--empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-panel-tip" },
    });
}
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
    const __VLS_208 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        data: (__VLS_ctx.formPreview.rows),
        border: true,
        maxHeight: "240",
    }));
    const __VLS_210 = __VLS_209({
        data: (__VLS_ctx.formPreview.rows),
        border: true,
        maxHeight: "240",
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    __VLS_211.slots.default;
    for (const [column] of __VLS_getVForSourceType((__VLS_ctx.formPreview.columns))) {
        const __VLS_212 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }));
        const __VLS_214 = __VLS_213({
            key: (column),
            prop: (column),
            label: (column),
            minWidth: "140",
            showOverflowTooltip: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    }
    var __VLS_211;
}
{
    const { footer: __VLS_thisSlot } = __VLS_109.slots;
    const __VLS_216 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewBtnLoading),
    }));
    const __VLS_218 = __VLS_217({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.previewBtnLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    let __VLS_220;
    let __VLS_221;
    let __VLS_222;
    const __VLS_223 = {
        onClick: (__VLS_ctx.handlePreview)
    };
    __VLS_219.slots.default;
    (__VLS_ctx.requiresSqlText ? '预览 SQL' : '预览数据');
    var __VLS_219;
    const __VLS_224 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        ...{ 'onClick': {} },
    }));
    const __VLS_226 = __VLS_225({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    let __VLS_228;
    let __VLS_229;
    let __VLS_230;
    const __VLS_231 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_227.slots.default;
    var __VLS_227;
    const __VLS_232 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_234 = __VLS_233({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    let __VLS_236;
    let __VLS_237;
    let __VLS_238;
    const __VLS_239 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_235.slots.default;
    var __VLS_235;
}
var __VLS_109;
const __VLS_240 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.folderDialogVisible),
    title: (__VLS_ctx.folderEditId ? '重命名文件夹' : '新建文件夹'),
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.folderDialogVisible),
    title: (__VLS_ctx.folderEditId ? '重命名文件夹' : '新建文件夹'),
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
const __VLS_244 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    labelWidth: "80px",
}));
const __VLS_246 = __VLS_245({
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
const __VLS_248 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    label: "名称",
}));
const __VLS_250 = __VLS_249({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
const __VLS_252 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.folderName),
    placeholder: "请输入文件夹名称",
}));
const __VLS_254 = __VLS_253({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.folderName),
    placeholder: "请输入文件夹名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
let __VLS_256;
let __VLS_257;
let __VLS_258;
const __VLS_259 = {
    onKeyup: (__VLS_ctx.handleFolderSubmit)
};
var __VLS_255;
var __VLS_251;
var __VLS_247;
{
    const { footer: __VLS_thisSlot } = __VLS_243.slots;
    const __VLS_260 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        ...{ 'onClick': {} },
    }));
    const __VLS_262 = __VLS_261({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    let __VLS_264;
    let __VLS_265;
    let __VLS_266;
    const __VLS_267 = {
        onClick: (...[$event]) => {
            __VLS_ctx.folderDialogVisible = false;
        }
    };
    __VLS_263.slots.default;
    var __VLS_263;
    const __VLS_268 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.folderSaving),
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.folderSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: (__VLS_ctx.handleFolderSubmit)
    };
    __VLS_271.slots.default;
    var __VLS_271;
}
var __VLS_243;
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
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-filter-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-filter-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-filter-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-filter-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-section']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['content-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-browser']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-header']} */ ;
/** @type {__VLS_StyleScopedClasses['browser-tip']} */ ;
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
/** @type {__VLS_StyleScopedClasses['filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-list']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-card']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-field-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel--empty']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-panel-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
// @ts-ignore
var __VLS_151 = __VLS_150;
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
            detailFilterPage: detailFilterPage,
            detailFilterPageSize: detailFilterPageSize,
            detailPreviewPage: detailPreviewPage,
            detailPreviewPageSize: detailPreviewPageSize,
            dialogVisible: dialogVisible,
            saving: saving,
            previewBtnLoading: previewBtnLoading,
            editId: editId,
            formRef: formRef,
            formPreview: formPreview,
            selectedFilterFieldNames: selectedFilterFieldNames,
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
            availableFilterFields: availableFilterFields,
            selectedFilterFieldCount: selectedFilterFieldCount,
            configuredFilterFields: configuredFilterFields,
            paginatedConfiguredFilterFields: paginatedConfiguredFilterFields,
            paginatedPreviewRows: paginatedPreviewRows,
            resolveSourceKind: resolveSourceKind,
            sourceKindLabel: sourceKindLabel,
            showTableBrowser: showTableBrowser,
            requiresSqlText: requiresSqlText,
            isReadonlySqlField: isReadonlySqlField,
            formDatasourceKindLabel: formDatasourceKindLabel,
            sqlFieldLabel: sqlFieldLabel,
            sqlFieldPlaceholder: sqlFieldPlaceholder,
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
