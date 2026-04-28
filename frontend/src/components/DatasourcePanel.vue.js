import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Edit, FolderAdd, Plus, RefreshRight } from '@element-plus/icons-vue';
import { createDatasourceGroup, createDatasource, deleteDatasourceGroup, deleteDatasource, getDatasourceGroups, getDatasourceList, previewDatasourceDraft, getDatasourcePreviewData, getDatasourceTables, getTableColumns, previewExtract, renameDatasourceGroup, testDatasourceConnection, updateDatasource, } from '../api/datasource';
const SOURCE_KIND_OPTIONS = [
    { label: '数据库', value: 'DATABASE' },
    { label: 'API 接口', value: 'API' },
    { label: '表格', value: 'TABLE' },
    { label: 'JSON 静态数据', value: 'JSON_STATIC' },
];
const DATABASE_TYPE_OPTIONS = [
    { label: 'MySQL', value: 'MYSQL', defaultPort: 3306 },
    { label: 'PostgreSQL', value: 'POSTGRESQL', defaultPort: 5432 },
    { label: 'ClickHouse', value: 'CLICKHOUSE', defaultPort: 8123 },
    { label: 'SQL Server', value: 'SQLSERVER', defaultPort: 1433 },
    { label: 'Oracle', value: 'ORACLE', defaultPort: 1521 },
];
const SOURCE_KIND_LABELS = {
    DATABASE: '数据库',
    API: 'API 接口',
    TABLE: '表格',
    JSON_STATIC: 'JSON 静态数据',
};
const emptyPreview = () => ({ columns: [], rows: [], rowCount: 0 });
const emptyExtractPreview = () => ({ sqlText: '', columns: [], rows: [], rowCount: 0, totalRows: 0, limit: 20, offset: 0 });
const createEmptyForm = () => ({
    name: '',
    groupId: null,
    sourceKind: 'DATABASE',
    datasourceType: 'MYSQL',
    connectMode: 'DIRECT',
    host: '',
    port: 3306,
    databaseName: '',
    username: '',
    password: '',
    configJson: '{}',
    apiUrl: '',
    apiMethod: 'GET',
    tableText: '',
    tableDelimiter: 'CSV',
    tableHasHeader: true,
    jsonText: '[]',
    jsonResultPath: '',
});
let runtimeRowSeed = 0;
const createRuntimeRow = (patch) => ({
    id: `runtime-row-${runtimeRowSeed++}`,
    key: patch?.key ?? '',
    value: patch?.value ?? '',
});
const createEmptyApiRuntimeForm = () => ({
    headers: [createRuntimeRow()],
    query: [createRuntimeRow()],
    bodyText: '',
    resultPath: '',
});
const loading = ref(false);
const datasources = ref([]);
const datasourceGroups = ref([]);
const searchKeyword = ref('');
const selectedGroupFilter = ref('ALL');
const selectedId = ref(null);
const previewLoading = ref(false);
const preview = reactive(emptyPreview());
const tablesLoading = ref(false);
const tableSearch = ref('');
const tables = ref([]);
const selectedTable = ref('');
const columnsLoading = ref(false);
const tableColumns = ref([]);
const extractPreview = reactive(emptyExtractPreview());
const extractPreviewLoading = ref(false);
const extractPreviewPage = ref(1);
const extractPreviewPageSize = ref(20);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const dialogEditId = ref(null);
const saving = ref(false);
const testing = ref(false);
const dialogPreviewLoading = ref(false);
const formRef = ref();
const form = reactive(createEmptyForm());
const apiRuntimeForm = reactive(createEmptyApiRuntimeForm());
const apiRuntimeTab = ref('headers');
const dialogPreview = reactive(emptyPreview());
const groupDialogVisible = ref(false);
const groupName = ref('');
const groupSaving = ref(false);
const groupEditId = ref(null);
const selectedDatasource = computed(() => datasources.value.find((item) => item.id === selectedId.value) ?? null);
const canPreviewDraft = computed(() => form.sourceKind !== 'DATABASE');
const activeGroupDraftId = computed(() => typeof selectedGroupFilter.value === 'number' ? selectedGroupFilter.value : null);
const groupNameMap = computed(() => new Map(datasourceGroups.value.map((item) => [item.id, item.name])));
const filteredDatasources = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();
    let list = [...datasources.value].sort((left, right) => right.id - left.id);
    if (selectedGroupFilter.value === 'UNGROUPED') {
        list = list.filter((item) => item.groupId == null);
    }
    else if (typeof selectedGroupFilter.value === 'number') {
        list = list.filter((item) => item.groupId === selectedGroupFilter.value);
    }
    if (!keyword)
        return list;
    return list.filter((item) => item.name.toLowerCase().includes(keyword));
});
const ungroupedDatasourceCount = computed(() => datasources.value.filter((item) => item.groupId == null).length);
const extractPreviewTotalRows = computed(() => extractPreview.totalRows ?? extractPreview.rowCount);
const filteredTables = computed(() => {
    const keyword = tableSearch.value.trim().toLowerCase();
    if (!keyword)
        return tables.value;
    return tables.value.filter((item) => item.tableName.toLowerCase().includes(keyword));
});
const tableDraftStats = computed(() => {
    const lines = form.tableText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const delimiterChar = form.tableDelimiter === 'TSV' ? '\t' : ',';
    const firstLine = lines[0] ?? '';
    const columnCount = firstLine ? firstLine.split(delimiterChar).length : 0;
    const rowCount = Math.max(lines.length - (form.tableHasHeader && lines.length ? 1 : 0), 0);
    return {
        rowCount,
        columnCount,
        headerLabel: form.tableHasHeader ? '首行为表头' : '首行即数据',
    };
});
const jsonDraftStats = computed(() => {
    const trimmed = form.jsonText.trim();
    if (!trimmed) {
        return { rootType: '未填写', itemCount: '0', statusText: '待输入' };
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return { rootType: '数组', itemCount: String(parsed.length), statusText: '合法 JSON' };
        }
        if (parsed && typeof parsed === 'object') {
            return { rootType: '对象', itemCount: String(Object.keys(parsed).length), statusText: '合法 JSON' };
        }
        return { rootType: typeof parsed, itemCount: '1', statusText: '合法 JSON' };
    }
    catch {
        return { rootType: '格式错误', itemCount: '-', statusText: '当前不是合法 JSON' };
    }
});
const datasourceCountByGroup = (groupId) => datasources.value.filter((item) => item.groupId === groupId).length;
const selectedDatasourceInfo = computed(() => {
    const datasource = selectedDatasource.value;
    if (!datasource)
        return [];
    const sourceKind = resolveSourceKind(datasource);
    const config = parseConfigJson(datasource.configJson);
    const groupLabel = datasource.groupId == null ? '未分组' : (groupNameMap.value.get(datasource.groupId) || `#${datasource.groupId}`);
    if (sourceKind === 'DATABASE') {
        return [
            { label: '所属分组', value: groupLabel },
            { label: '数据库类型', value: datasource.datasourceType || '-' },
            { label: '主机地址', value: datasource.host || '-' },
            { label: '端口', value: datasource.port ? String(datasource.port) : '-' },
            { label: '数据库名称', value: datasource.databaseName || '-' },
            { label: '用户名', value: datasource.dbUsername || '-' },
            { label: '连接模式', value: datasource.connectMode || 'DIRECT' },
        ];
    }
    if (sourceKind === 'API') {
        return [
            { label: '所属分组', value: groupLabel },
            { label: '请求地址', value: readString(config.apiUrl ?? config.url) || '-' },
            { label: '请求方式', value: readString(config.apiMethod ?? config.method) || 'GET' },
            { label: '结果路径', value: readString(config.apiResultPath ?? config.resultPath) || '-' },
            { label: '创建时间', value: datasource.createdAt || '-' },
        ];
    }
    if (sourceKind === 'TABLE') {
        return [
            { label: '所属分组', value: groupLabel },
            { label: '分隔格式', value: readString(config.tableDelimiter ?? config.delimiter) || 'CSV' },
            { label: '首行为表头', value: readBoolean(config.tableHasHeader ?? config.hasHeader, true) ? '是' : '否' },
            { label: '内容行数', value: countLines(readString(config.tableText ?? config.text)) },
            { label: '创建时间', value: datasource.createdAt || '-' },
        ];
    }
    return [
        { label: '所属分组', value: groupLabel },
        { label: '结果路径', value: readString(config.jsonResultPath ?? config.resultPath) || '-' },
        { label: 'JSON 长度', value: `${readString(config.jsonText ?? config.text).length} 字符` },
        { label: '创建时间', value: datasource.createdAt || '-' },
    ];
});
const selectedConfigPreview = computed(() => {
    const datasource = selectedDatasource.value;
    if (!datasource)
        return '{}';
    return JSON.stringify(parseConfigJson(datasource.configJson), null, 2);
});
const rules = {
    name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
    datasourceType: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请选择数据库类型'), trigger: 'change' }],
    host: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入主机地址'), trigger: 'blur' }],
    port: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && (!value || Number(value) <= 0), '请输入合法端口'), trigger: 'change' }],
    databaseName: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入数据库名称'), trigger: 'blur' }],
    username: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入数据库账号'), trigger: 'blur' }],
    apiUrl: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'API' && !String(value).trim(), '请输入 API 地址'), trigger: 'blur' }],
    tableText: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'TABLE' && !String(value).trim(), '请输入表格内容'), trigger: 'blur' }],
    jsonText: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'JSON_STATIC' && !String(value).trim(), '请输入 JSON 内容'), trigger: 'blur' }],
};
watch(selectedDatasource, async (datasource) => {
    Object.assign(preview, emptyPreview());
    Object.assign(extractPreview, emptyExtractPreview());
    extractPreviewPage.value = 1;
    tables.value = [];
    tableColumns.value = [];
    selectedTable.value = '';
    tableSearch.value = '';
    if (!datasource)
        return;
    if (isDatabaseDatasource(datasource)) {
        await loadDatabaseTables(datasource.id);
        return;
    }
    await loadStaticPreview(datasource.id);
}, { immediate: false });
watch(() => form.sourceKind, (sourceKind) => {
    resetDialogPreview();
    form.connectMode = 'DIRECT';
    if (sourceKind === 'DATABASE') {
        if (!DATABASE_TYPE_OPTIONS.some((item) => item.value === form.datasourceType)) {
            form.datasourceType = 'MYSQL';
        }
        if (form.port === '') {
            form.port = DATABASE_TYPE_OPTIONS.find((item) => item.value === form.datasourceType)?.defaultPort ?? 3306;
        }
        return;
    }
    if (sourceKind === 'API') {
        form.datasourceType = 'REST_API';
        form.port = '';
        return;
    }
    if (sourceKind === 'TABLE') {
        form.datasourceType = 'TABLE';
        form.port = '';
        return;
    }
    form.datasourceType = 'JSON_STATIC';
    form.port = '';
});
watch(filteredDatasources, (list) => {
    if (!list.length) {
        selectedId.value = null;
        return;
    }
    if (!list.some((item) => item.id === selectedId.value)) {
        selectedId.value = list[0].id;
    }
}, { immediate: true });
const loadDatasources = async (preferredId) => {
    loading.value = true;
    try {
        const [list, groups] = await Promise.all([
            getDatasourceList(),
            getDatasourceGroups(),
        ]);
        datasources.value = list;
        datasourceGroups.value = groups;
        if (typeof selectedGroupFilter.value === 'number' && !groups.some((item) => item.id === selectedGroupFilter.value)) {
            selectedGroupFilter.value = 'ALL';
        }
        const nextId = preferredId && list.some((item) => item.id === preferredId)
            ? preferredId
            : selectedId.value && list.some((item) => item.id === selectedId.value)
                ? selectedId.value
                : list[0]?.id ?? null;
        selectedId.value = nextId;
    }
    catch {
        datasources.value = [];
        datasourceGroups.value = [];
        selectedId.value = null;
    }
    finally {
        loading.value = false;
    }
};
const refreshSelectedDatasource = async () => {
    await loadDatasources(selectedDatasource.value?.id ?? null);
};
const loadStaticPreview = async (datasourceId) => {
    previewLoading.value = true;
    try {
        const result = await getDatasourcePreviewData(datasourceId);
        Object.assign(preview, result);
    }
    catch {
        Object.assign(preview, emptyPreview());
    }
    finally {
        previewLoading.value = false;
    }
};
const loadDatabaseTables = async (datasourceId) => {
    tablesLoading.value = true;
    try {
        const result = await getDatasourceTables(datasourceId);
        tables.value = result;
        extractPreviewPage.value = 1;
        if (result.length) {
            const targetTable = result.some((item) => item.tableName === selectedTable.value)
                ? selectedTable.value
                : result[0].tableName;
            await selectTable(targetTable);
        }
    }
    catch {
        tables.value = [];
        selectedTable.value = '';
        tableColumns.value = [];
        Object.assign(extractPreview, emptyExtractPreview());
    }
    finally {
        tablesLoading.value = false;
    }
};
const loadExtractPreview = async (tableName, page = extractPreviewPage.value) => {
    if (!selectedDatasource.value)
        return;
    extractPreviewLoading.value = true;
    try {
        const previewResult = await previewExtract({
            datasourceId: selectedDatasource.value.id,
            tableName,
            limit: extractPreviewPageSize.value,
            offset: (page - 1) * extractPreviewPageSize.value,
        });
        Object.assign(extractPreview, previewResult);
        extractPreviewPage.value = page;
    }
    catch {
        Object.assign(extractPreview, emptyExtractPreview());
    }
    finally {
        extractPreviewLoading.value = false;
    }
};
const selectTable = async (tableName) => {
    if (!selectedDatasource.value)
        return;
    selectedTable.value = tableName;
    columnsLoading.value = true;
    extractPreviewPage.value = 1;
    Object.assign(extractPreview, emptyExtractPreview());
    extractPreviewLoading.value = true;
    try {
        const [columns, previewResult] = await Promise.all([
            getTableColumns(selectedDatasource.value.id, tableName),
            previewExtract({ datasourceId: selectedDatasource.value.id, tableName, limit: extractPreviewPageSize.value, offset: 0 }),
        ]);
        tableColumns.value = columns;
        Object.assign(extractPreview, previewResult);
    }
    catch {
        tableColumns.value = [];
        Object.assign(extractPreview, emptyExtractPreview());
    }
    finally {
        columnsLoading.value = false;
        extractPreviewLoading.value = false;
    }
};
const handleExtractPreviewPageChange = async (page) => {
    if (!selectedTable.value)
        return;
    await loadExtractPreview(selectedTable.value, page);
};
const handleExtractPreviewPageSizeChange = async (pageSize) => {
    extractPreviewPageSize.value = pageSize;
    if (!selectedTable.value)
        return;
    await loadExtractPreview(selectedTable.value, 1);
};
const openCreate = (groupId = activeGroupDraftId.value) => {
    dialogMode.value = 'create';
    dialogEditId.value = null;
    Object.assign(form, createEmptyForm());
    form.groupId = groupId;
    resetApiRuntimeForm();
    resetDialogPreview();
    dialogVisible.value = true;
};
const openEdit = (datasource) => {
    dialogMode.value = 'edit';
    dialogEditId.value = datasource.id;
    Object.assign(form, createEmptyForm());
    resetApiRuntimeForm();
    resetDialogPreview();
    form.name = datasource.name;
    form.groupId = datasource.groupId ?? null;
    form.sourceKind = resolveSourceKind(datasource);
    form.datasourceType = datasource.datasourceType || 'MYSQL';
    form.connectMode = datasource.connectMode || 'DIRECT';
    form.host = datasource.host || '';
    form.port = datasource.port || '';
    form.databaseName = datasource.databaseName || '';
    form.username = datasource.dbUsername || '';
    form.password = '';
    const config = parseConfigJson(datasource.configJson);
    if (form.sourceKind === 'API') {
        form.apiUrl = readString(config.apiUrl ?? config.url);
        form.apiMethod = (readString(config.apiMethod ?? config.method) || 'GET').toUpperCase();
        syncApiRuntimeFormFromConfig(config);
    }
    else if (form.sourceKind === 'TABLE') {
        form.tableText = readString(config.tableText ?? config.text);
        form.tableDelimiter = (readString(config.tableDelimiter ?? config.delimiter) || 'CSV').toUpperCase();
        form.tableHasHeader = readBoolean(config.tableHasHeader ?? config.hasHeader, true);
    }
    else if (form.sourceKind === 'JSON_STATIC') {
        form.jsonText = readString(config.jsonText ?? config.text) || '[]';
        form.jsonResultPath = readString(config.jsonResultPath ?? config.resultPath);
    }
    dialogVisible.value = true;
};
const openCreateGroup = () => {
    groupEditId.value = null;
    groupName.value = '';
    groupDialogVisible.value = true;
};
const openRenameGroup = (group) => {
    groupEditId.value = group.id;
    groupName.value = group.name;
    groupDialogVisible.value = true;
};
const handleDatabaseTypeChange = (value) => {
    const option = DATABASE_TYPE_OPTIONS.find((item) => item.value === value);
    if (!option)
        return;
    if (!form.port || Number(form.port) <= 0) {
        form.port = option.defaultPort;
    }
};
const handlePortChange = (value) => {
    form.port = value == null ? '' : value;
};
const validateForm = async () => {
    try {
        await formRef.value?.validate();
        return true;
    }
    catch {
        return false;
    }
};
const handleTestConnection = async () => {
    const valid = await validateForm();
    if (!valid)
        return;
    testing.value = true;
    try {
        const payload = buildDatasourcePayload();
        const result = await testDatasourceConnection({
            sourceKind: payload.sourceKind,
            datasourceType: payload.datasourceType,
            host: payload.host,
            port: payload.port === '' ? '' : Number(payload.port),
            databaseName: payload.databaseName,
            username: payload.username,
            password: payload.password,
            configJson: payload.configJson,
        });
        ElMessage.success(result.message || '连接测试通过');
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
    finally {
        testing.value = false;
    }
};
const buildDatasourceDraftPreviewPayload = () => {
    const payload = buildDatasourcePayload();
    return {
        sourceKind: payload.sourceKind,
        datasourceType: payload.datasourceType,
        host: payload.host,
        port: payload.port,
        databaseName: payload.databaseName,
        username: payload.username,
        password: payload.password,
        configJson: payload.configJson,
    };
};
const handlePreviewDraft = async () => {
    if (!canPreviewDraft.value) {
        ElMessage.warning('数据库数据源请在数据集或页面 SQL 中预览');
        return;
    }
    dialogPreviewLoading.value = true;
    try {
        const result = await previewDatasourceDraft(buildDatasourceDraftPreviewPayload());
        Object.assign(dialogPreview, result);
        ElMessage.success('返回结果预览成功');
    }
    catch (error) {
        resetDialogPreview();
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
    finally {
        dialogPreviewLoading.value = false;
    }
};
const handleSubmit = async () => {
    const valid = await validateForm();
    if (!valid)
        return;
    saving.value = true;
    try {
        const payload = buildDatasourcePayload();
        const saved = dialogMode.value === 'create'
            ? await createDatasource(payload)
            : await updateDatasource(dialogEditId.value, payload);
        dialogVisible.value = false;
        await loadDatasources(saved.id);
        ElMessage.success(dialogMode.value === 'create' ? '数据源创建成功' : '数据源更新成功');
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
    finally {
        saving.value = false;
    }
};
const handleGroupSubmit = async () => {
    if (!groupName.value.trim()) {
        ElMessage.warning('请输入分组名称');
        return;
    }
    groupSaving.value = true;
    try {
        const saved = groupEditId.value
            ? await renameDatasourceGroup(groupEditId.value, groupName.value.trim())
            : await createDatasourceGroup(groupName.value.trim());
        groupDialogVisible.value = false;
        selectedGroupFilter.value = saved.id;
        await loadDatasources(selectedDatasource.value?.id ?? null);
        ElMessage.success(groupEditId.value ? '分组重命名成功' : '分组创建成功');
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
    finally {
        groupSaving.value = false;
    }
};
const handleDelete = async (id) => {
    try {
        await deleteDatasource(id);
        const remaining = datasources.value.filter((item) => item.id !== id);
        const nextSelected = remaining[0]?.id ?? null;
        await loadDatasources(nextSelected);
        ElMessage.success('数据源已删除');
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
};
const handleDeleteGroup = async (id) => {
    try {
        await deleteDatasourceGroup(id);
        if (selectedGroupFilter.value === id) {
            selectedGroupFilter.value = 'ALL';
        }
        await loadDatasources(selectedDatasource.value?.id ?? null);
        ElMessage.success('分组已删除');
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.error(error.message);
        }
    }
};
const buildDatasourcePayload = () => {
    if (form.sourceKind === 'DATABASE') {
        return {
            name: form.name.trim(),
            groupId: form.groupId ?? null,
            sourceKind: 'DATABASE',
            datasourceType: form.datasourceType,
            connectMode: 'DIRECT',
            host: form.host.trim(),
            port: form.port === '' ? '' : Number(form.port),
            databaseName: form.databaseName.trim(),
            username: form.username.trim(),
            password: form.password,
            configJson: '{}',
        };
    }
    if (form.sourceKind === 'API') {
        const headers = buildRuntimeKeyValueObject(apiRuntimeForm.headers);
        const query = buildRuntimeKeyValueObject(apiRuntimeForm.query);
        const body = parseLooseJsonValue(apiRuntimeForm.bodyText);
        const config = {
            apiUrl: form.apiUrl.trim(),
            apiMethod: form.apiMethod,
        };
        if (Object.keys(headers).length)
            config.apiHeaders = headers;
        if (Object.keys(query).length)
            config.apiQuery = query;
        if (body !== undefined)
            config.apiBody = body;
        if (apiRuntimeForm.resultPath.trim())
            config.apiResultPath = apiRuntimeForm.resultPath.trim();
        return {
            name: form.name.trim(),
            groupId: form.groupId ?? null,
            sourceKind: 'API',
            datasourceType: 'REST_API',
            connectMode: 'DIRECT',
            host: '',
            port: '',
            databaseName: '',
            username: '',
            password: '',
            configJson: JSON.stringify(config),
        };
    }
    if (form.sourceKind === 'TABLE') {
        const config = {
            tableText: form.tableText,
            tableDelimiter: form.tableDelimiter,
            tableHasHeader: form.tableHasHeader,
        };
        return {
            name: form.name.trim(),
            groupId: form.groupId ?? null,
            sourceKind: 'TABLE',
            datasourceType: 'TABLE',
            connectMode: 'DIRECT',
            host: '',
            port: '',
            databaseName: '',
            username: '',
            password: '',
            configJson: JSON.stringify(config),
        };
    }
    parseJsonValueText(form.jsonText, 'JSON 静态数据内容不是合法 JSON');
    const config = {
        jsonText: form.jsonText,
    };
    if (form.jsonResultPath.trim())
        config.jsonResultPath = form.jsonResultPath.trim();
    return {
        name: form.name.trim(),
        groupId: form.groupId ?? null,
        sourceKind: 'JSON_STATIC',
        datasourceType: 'JSON_STATIC',
        connectMode: 'DIRECT',
        host: '',
        port: '',
        databaseName: '',
        username: '',
        password: '',
        configJson: JSON.stringify(config),
    };
};
const sourceKindLabel = (kind) => SOURCE_KIND_LABELS[kind] || kind;
const resolveSourceKind = (datasource) => datasource?.sourceKind || 'DATABASE';
const isDatabaseDatasource = (datasource) => resolveSourceKind(datasource) === 'DATABASE';
const datasourceSubtitle = (datasource) => {
    const sourceKind = resolveSourceKind(datasource);
    const config = parseConfigJson(datasource.configJson);
    if (sourceKind === 'DATABASE') {
        return `${datasource.datasourceType} · ${datasource.host}:${datasource.port}/${datasource.databaseName}`;
    }
    if (sourceKind === 'API') {
        return readString(config.apiUrl ?? config.url) || '接口地址待配置';
    }
    if (sourceKind === 'TABLE') {
        const delimiter = readString(config.tableDelimiter ?? config.delimiter) || 'CSV';
        return `${delimiter} 文本源`;
    }
    return 'JSON 静态数据源';
};
const parseConfigJson = (configJson) => {
    if (!configJson)
        return {};
    try {
        const parsed = JSON.parse(configJson);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
};
const parseJsonValueText = (jsonText, errorMessage) => {
    try {
        return JSON.parse(jsonText);
    }
    catch {
        throw new Error(errorMessage);
    }
};
const parseLooseJsonValue = (text) => {
    const trimmed = text.trim();
    if (!trimmed)
        return undefined;
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return trimmed;
    }
};
const readObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return value;
};
const rowsFromObject = (value) => {
    const entries = Object.entries(readObject(value));
    return entries.length
        ? entries.map(([key, rowValue]) => createRuntimeRow({ key, value: stringifyUnknown(rowValue) }))
        : [createRuntimeRow()];
};
const readString = (value) => typeof value === 'string' ? value : '';
const readBoolean = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;
const countLines = (text) => text ? `${text.split(/\r?\n/).filter((item) => item.trim()).length} 行` : '0 行';
const stringifyUnknown = (value) => {
    if (value == null)
        return '';
    if (typeof value === 'string')
        return value;
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
};
const resetApiRuntimeForm = () => {
    Object.assign(apiRuntimeForm, createEmptyApiRuntimeForm());
    apiRuntimeTab.value = 'headers';
};
const resetDialogPreview = () => {
    Object.assign(dialogPreview, emptyPreview());
};
const syncApiRuntimeFormFromConfig = (config) => {
    resetApiRuntimeForm();
    apiRuntimeForm.headers = rowsFromObject(config.apiHeaders ?? config.headers);
    apiRuntimeForm.query = rowsFromObject(config.apiQuery ?? config.query);
    apiRuntimeForm.bodyText = stringifyUnknown(config.apiBody ?? config.body);
    apiRuntimeForm.resultPath = readString(config.apiResultPath ?? config.resultPath);
};
const buildRuntimeKeyValueObject = (rows) => rows.reduce((result, row) => {
    const key = row.key.trim();
    if (!key)
        return result;
    const parsedValue = parseLooseJsonValue(row.value);
    result[key] = parsedValue === undefined ? '' : parsedValue;
    return result;
}, {});
const addApiRuntimeRow = (section) => {
    apiRuntimeForm[section] = [...apiRuntimeForm[section], createRuntimeRow()];
};
const removeApiRuntimeRow = (section, rowId) => {
    const nextRows = apiRuntimeForm[section].filter((item) => item.id !== rowId);
    apiRuntimeForm[section] = nextRows.length ? nextRows : [createRuntimeRow()];
};
const applyTableExample = (delimiter) => {
    form.tableDelimiter = delimiter;
    form.tableHasHeader = true;
    form.tableText = delimiter === 'TSV'
        ? ['region\tvalue\ttrend', '华东\t120\t12%', '华南\t98\t8%', '西南\t76\t5%'].join('\n')
        : ['region,value,trend', '华东,120,12%', '华南,98,8%', '西南,76,5%'].join('\n');
};
const clearTableDraft = () => {
    form.tableText = '';
};
const applyJsonExample = (kind) => {
    form.jsonText = kind === 'array'
        ? JSON.stringify([
            { region: '华东', value: 120, trend: 12 },
            { region: '华南', value: 98, trend: 8 },
            { region: '西南', value: 76, trend: 5 },
        ], null, 2)
        : JSON.stringify({
            data: {
                summary: { total: 294, updatedAt: '2026-04-17 12:00:00' },
                records: [
                    { region: '华东', value: 120 },
                    { region: '华南', value: 98 },
                ],
            },
        }, null, 2);
};
const formatJsonDraft = () => {
    try {
        form.jsonText = JSON.stringify(parseJsonValueText(form.jsonText, 'JSON 静态数据内容不是合法 JSON'), null, 2);
    }
    catch (error) {
        if (error instanceof Error && error.message) {
            ElMessage.warning(error.message);
        }
    }
};
const validateBySourceKind = (callback, shouldFail, message) => {
    if (shouldFail) {
        callback(new Error(message));
        return;
    }
    callback();
};
onMounted(async () => {
    await loadDatasources();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['datasource-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-kv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-kv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['config-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['table-list']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['column-list']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['table-browser']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElCard;
/** @type {[typeof __VLS_components.ElCard, typeof __VLS_components.elCard, typeof __VLS_components.ElCard, typeof __VLS_components.elCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "bi-page datasource-panel" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "bi-page datasource-panel" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "datasource-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "datasource-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-actions" },
});
const __VLS_5 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    circle: true,
    size: "small",
    icon: (__VLS_ctx.FolderAdd),
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    circle: true,
    size: "small",
    icon: (__VLS_ctx.FolderAdd),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onClick: (__VLS_ctx.openCreateGroup)
};
var __VLS_8;
const __VLS_13 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_17;
let __VLS_18;
let __VLS_19;
const __VLS_20 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreate(__VLS_ctx.activeGroupDraftId);
    }
};
__VLS_16.slots.default;
var __VLS_16;
const __VLS_21 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
    modelValue: (__VLS_ctx.searchKeyword),
    ...{ class: "sidebar-search" },
    placeholder: "搜索数据源名称",
    clearable: true,
}));
const __VLS_23 = __VLS_22({
    modelValue: (__VLS_ctx.searchKeyword),
    ...{ class: "sidebar-search" },
    placeholder: "搜索数据源名称",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-section-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "group-section-meta" },
});
(__VLS_ctx.datasourceGroups.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "group-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.selectedGroupFilter = 'ALL';
        } },
    type: "button",
    ...{ class: "group-chip" },
    ...{ class: ({ 'group-chip--active': __VLS_ctx.selectedGroupFilter === 'ALL' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.datasources.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.selectedGroupFilter = 'UNGROUPED';
        } },
    type: "button",
    ...{ class: "group-chip" },
    ...{ class: ({ 'group-chip--active': __VLS_ctx.selectedGroupFilter === 'UNGROUPED' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.ungroupedDatasourceCount);
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.datasourceGroups))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (group.id),
        ...{ class: "group-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedGroupFilter = group.id;
            } },
        type: "button",
        ...{ class: "group-chip group-chip--row" },
        ...{ class: ({ 'group-chip--active': __VLS_ctx.selectedGroupFilter === group.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (group.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.datasourceCountByGroup(group.id));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "group-row-actions" },
    });
    const __VLS_25 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_27 = __VLS_26({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    let __VLS_29;
    let __VLS_30;
    let __VLS_31;
    const __VLS_32 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openRenameGroup(group);
        }
    };
    var __VLS_28;
    const __VLS_33 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
        ...{ 'onConfirm': {} },
        title: "确认删除此分组？删除后其中数据源会转为未分组。",
    }));
    const __VLS_35 = __VLS_34({
        ...{ 'onConfirm': {} },
        title: "确认删除此分组？删除后其中数据源会转为未分组。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    let __VLS_37;
    let __VLS_38;
    let __VLS_39;
    const __VLS_40 = {
        onConfirm: (...[$event]) => {
            __VLS_ctx.handleDeleteGroup(group.id);
        }
    };
    __VLS_36.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_36.slots;
        const __VLS_41 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
            ...{ 'onClick': {} },
            link: true,
            size: "small",
            type: "danger",
            icon: (__VLS_ctx.Delete),
        }));
        const __VLS_43 = __VLS_42({
            ...{ 'onClick': {} },
            link: true,
            size: "small",
            type: "danger",
            icon: (__VLS_ctx.Delete),
        }, ...__VLS_functionalComponentArgsRest(__VLS_42));
        let __VLS_45;
        let __VLS_46;
        let __VLS_47;
        const __VLS_48 = {
            onClick: () => { }
        };
        var __VLS_44;
    }
    var __VLS_36;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "datasource-list" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredDatasources))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedId = item.id;
            } },
        key: (item.id),
        type: "button",
        ...{ class: "datasource-item" },
        ...{ class: ({ 'datasource-item--active': __VLS_ctx.selectedId === item.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "datasource-item-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "datasource-item-name" },
    });
    (item.name);
    const __VLS_49 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
        size: "small",
        effect: "plain",
    }));
    const __VLS_51 = __VLS_50({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    __VLS_52.slots.default;
    (__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(item)));
    var __VLS_52;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "datasource-item-meta" },
    });
    (__VLS_ctx.datasourceSubtitle(item));
}
if (!__VLS_ctx.loading && !__VLS_ctx.filteredDatasources.length) {
    const __VLS_53 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
        description: "暂无数据源",
        imageSize: (56),
    }));
    const __VLS_55 = __VLS_54({
        description: "暂无数据源",
        imageSize: (56),
    }, ...__VLS_functionalComponentArgsRest(__VLS_54));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "datasource-main" },
});
if (__VLS_ctx.selectedDatasource) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-title-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedDatasource.name);
    const __VLS_57 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
        effect: "dark",
        size: "small",
    }));
    const __VLS_59 = __VLS_58({
        effect: "dark",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    __VLS_60.slots.default;
    (__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(__VLS_ctx.selectedDatasource)));
    var __VLS_60;
    if (__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)) {
        const __VLS_61 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
            type: "success",
            size: "small",
        }));
        const __VLS_63 = __VLS_62({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        __VLS_64.slots.default;
        var __VLS_64;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-subtitle" },
    });
    (__VLS_ctx.datasourceSubtitle(__VLS_ctx.selectedDatasource));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-actions" },
    });
    const __VLS_65 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.RefreshRight),
    }));
    const __VLS_67 = __VLS_66({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.RefreshRight),
    }, ...__VLS_functionalComponentArgsRest(__VLS_66));
    let __VLS_69;
    let __VLS_70;
    let __VLS_71;
    const __VLS_72 = {
        onClick: (__VLS_ctx.refreshSelectedDatasource)
    };
    __VLS_68.slots.default;
    var __VLS_68;
    const __VLS_73 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_75 = __VLS_74({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_74));
    let __VLS_77;
    let __VLS_78;
    let __VLS_79;
    const __VLS_80 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedDatasource))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selectedDatasource);
        }
    };
    __VLS_76.slots.default;
    var __VLS_76;
    const __VLS_81 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
        ...{ 'onConfirm': {} },
        title: "确认删除此数据源？",
    }));
    const __VLS_83 = __VLS_82({
        ...{ 'onConfirm': {} },
        title: "确认删除此数据源？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    let __VLS_85;
    let __VLS_86;
    let __VLS_87;
    const __VLS_88 = {
        onConfirm: (...[$event]) => {
            if (!(__VLS_ctx.selectedDatasource))
                return;
            __VLS_ctx.handleDelete(__VLS_ctx.selectedDatasource.id);
        }
    };
    __VLS_84.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_84.slots;
        const __VLS_89 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }));
        const __VLS_91 = __VLS_90({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }, ...__VLS_functionalComponentArgsRest(__VLS_90));
        __VLS_92.slots.default;
        var __VLS_92;
    }
    var __VLS_84;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-kv-grid" },
    });
    for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.selectedDatasourceInfo))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (entry.label),
            ...{ class: "detail-kv-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (entry.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (entry.value || '-');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "config-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "config-preview-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.selectedConfigPreview);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "detail-card detail-card--data" },
    });
    if (__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-subtitle" },
        });
        const __VLS_93 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.tablesLoading),
        }));
        const __VLS_95 = __VLS_94({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.tablesLoading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        let __VLS_97;
        let __VLS_98;
        let __VLS_99;
        const __VLS_100 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedDatasource))
                    return;
                if (!(__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)))
                    return;
                __VLS_ctx.loadDatabaseTables(__VLS_ctx.selectedDatasource.id);
            }
        };
        __VLS_96.slots.default;
        var __VLS_96;
        const __VLS_101 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
            modelValue: (__VLS_ctx.tableSearch),
            placeholder: "搜索表名",
            clearable: true,
            ...{ class: "table-search" },
        }));
        const __VLS_103 = __VLS_102({
            modelValue: (__VLS_ctx.tableSearch),
            placeholder: "搜索表名",
            clearable: true,
            ...{ class: "table-search" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_102));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-browser" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-list" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.tablesLoading) }, null, null);
        for (const [table] of __VLS_getVForSourceType((__VLS_ctx.filteredTables))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.selectedDatasource))
                            return;
                        if (!(__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)))
                            return;
                        __VLS_ctx.selectTable(table.tableName);
                    } },
                key: (table.tableName),
                type: "button",
                ...{ class: "table-item" },
                ...{ class: ({ 'table-item--active': __VLS_ctx.selectedTable === table.tableName }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-item-name" },
            });
            (table.tableName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-item-meta" },
            });
            (table.comment || table.tableType || 'TABLE');
        }
        if (!__VLS_ctx.tablesLoading && !__VLS_ctx.filteredTables.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-empty" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-detail" },
        });
        if (__VLS_ctx.selectedTable) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-head section-head--compact" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-title" },
            });
            (__VLS_ctx.selectedTable);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "section-subtitle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "column-list" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.columnsLoading) }, null, null);
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.tableColumns))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (column.columnName),
                    ...{ class: "column-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "column-name" },
                });
                (column.columnName);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "column-remark" },
                });
                (column.remarks || '无说明');
                const __VLS_105 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
                    size: "small",
                }));
                const __VLS_107 = __VLS_106({
                    size: "small",
                }, ...__VLS_functionalComponentArgsRest(__VLS_106));
                __VLS_108.slots.default;
                (column.dataType);
                var __VLS_108;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-summary" },
            });
            (__VLS_ctx.extractPreview.rows.length);
            (__VLS_ctx.extractPreviewTotalRows);
            if (__VLS_ctx.extractPreview.columns.length) {
                const __VLS_109 = {}.ElTable;
                /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
                // @ts-ignore
                const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
                    data: (__VLS_ctx.extractPreview.rows),
                    border: true,
                    size: "small",
                    maxHeight: "280",
                    ...{ class: "preview-table" },
                }));
                const __VLS_111 = __VLS_110({
                    data: (__VLS_ctx.extractPreview.rows),
                    border: true,
                    size: "small",
                    maxHeight: "280",
                    ...{ class: "preview-table" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_110));
                __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.extractPreviewLoading) }, null, null);
                __VLS_112.slots.default;
                for (const [column] of __VLS_getVForSourceType((__VLS_ctx.extractPreview.columns))) {
                    const __VLS_113 = {}.ElTableColumn;
                    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                    // @ts-ignore
                    const __VLS_114 = __VLS_asFunctionalComponent(__VLS_113, new __VLS_113({
                        key: (column),
                        prop: (column),
                        label: (column),
                        minWidth: "140",
                        showOverflowTooltip: true,
                    }));
                    const __VLS_115 = __VLS_114({
                        key: (column),
                        prop: (column),
                        label: (column),
                        minWidth: "140",
                        showOverflowTooltip: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_114));
                }
                var __VLS_112;
            }
            if (__VLS_ctx.extractPreviewTotalRows > __VLS_ctx.extractPreviewPageSize) {
                const __VLS_117 = {}.ElPagination;
                /** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
                // @ts-ignore
                const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
                    ...{ 'onCurrentChange': {} },
                    ...{ 'onSizeChange': {} },
                    currentPage: (__VLS_ctx.extractPreviewPage),
                    pageSize: (__VLS_ctx.extractPreviewPageSize),
                    ...{ class: "table-detail-pagination" },
                    background: true,
                    layout: "total, sizes, prev, pager, next",
                    pageSizes: ([20, 50, 100]),
                    total: (__VLS_ctx.extractPreviewTotalRows),
                }));
                const __VLS_119 = __VLS_118({
                    ...{ 'onCurrentChange': {} },
                    ...{ 'onSizeChange': {} },
                    currentPage: (__VLS_ctx.extractPreviewPage),
                    pageSize: (__VLS_ctx.extractPreviewPageSize),
                    ...{ class: "table-detail-pagination" },
                    background: true,
                    layout: "total, sizes, prev, pager, next",
                    pageSizes: ([20, 50, 100]),
                    total: (__VLS_ctx.extractPreviewTotalRows),
                }, ...__VLS_functionalComponentArgsRest(__VLS_118));
                let __VLS_121;
                let __VLS_122;
                let __VLS_123;
                const __VLS_124 = {
                    onCurrentChange: (__VLS_ctx.handleExtractPreviewPageChange)
                };
                const __VLS_125 = {
                    onSizeChange: (__VLS_ctx.handleExtractPreviewPageSizeChange)
                };
                var __VLS_120;
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-empty table-empty--detail" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-subtitle" },
        });
        const __VLS_126 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.previewLoading),
        }));
        const __VLS_128 = __VLS_127({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.previewLoading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_127));
        let __VLS_130;
        let __VLS_131;
        let __VLS_132;
        const __VLS_133 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedDatasource))
                    return;
                if (!!(__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)))
                    return;
                __VLS_ctx.loadStaticPreview(__VLS_ctx.selectedDatasource.id);
            }
        };
        __VLS_129.slots.default;
        var __VLS_129;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-summary" },
        });
        (__VLS_ctx.preview.columns.length);
        (__VLS_ctx.preview.rows.length);
        (__VLS_ctx.preview.rowCount);
        if (__VLS_ctx.preview.columns.length) {
            const __VLS_134 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
                data: (__VLS_ctx.preview.rows),
                border: true,
                size: "small",
                maxHeight: "520",
                ...{ class: "preview-table" },
            }));
            const __VLS_136 = __VLS_135({
                data: (__VLS_ctx.preview.rows),
                border: true,
                size: "small",
                maxHeight: "520",
                ...{ class: "preview-table" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_135));
            __VLS_137.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
                const __VLS_138 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "140",
                    showOverflowTooltip: true,
                }));
                const __VLS_140 = __VLS_139({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "140",
                    showOverflowTooltip: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_139));
            }
            var __VLS_137;
        }
        else {
            const __VLS_142 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
                imageSize: (72),
                description: "当前数据源暂无可展示数据",
            }));
            const __VLS_144 = __VLS_143({
                imageSize: (72),
                description: "当前数据源暂无可展示数据",
            }, ...__VLS_functionalComponentArgsRest(__VLS_143));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "main-empty" },
    });
    const __VLS_146 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
        description: "请先选择或创建一个数据源",
        imageSize: (88),
    }));
    const __VLS_148 = __VLS_147({
        description: "请先选择或创建一个数据源",
        imageSize: (88),
    }, ...__VLS_functionalComponentArgsRest(__VLS_147));
    __VLS_149.slots.default;
    const __VLS_150 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_152 = __VLS_151({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_151));
    let __VLS_154;
    let __VLS_155;
    let __VLS_156;
    const __VLS_157 = {
        onClick: (__VLS_ctx.openCreate)
    };
    __VLS_153.slots.default;
    var __VLS_153;
    var __VLS_149;
}
const __VLS_158 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogMode === 'create' ? '新建数据源' : '编辑数据源'),
    width: "900px",
    destroyOnClose: true,
}));
const __VLS_160 = __VLS_159({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogMode === 'create' ? '新建数据源' : '编辑数据源'),
    width: "900px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
__VLS_161.slots.default;
const __VLS_162 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "datasource-form" },
}));
const __VLS_164 = __VLS_163({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "datasource-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_166 = {};
__VLS_165.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid form-grid--basic" },
});
const __VLS_168 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "数据源名称",
    prop: "name",
}));
const __VLS_170 = __VLS_169({
    label: "数据源名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据源名称",
}));
const __VLS_174 = __VLS_173({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据源名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
var __VLS_171;
const __VLS_176 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "所属分组",
}));
const __VLS_178 = __VLS_177({
    label: "所属分组",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    modelValue: (__VLS_ctx.form.groupId),
    placeholder: "未分组",
    clearable: true,
}));
const __VLS_182 = __VLS_181({
    modelValue: (__VLS_ctx.form.groupId),
    placeholder: "未分组",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
__VLS_183.slots.default;
for (const [group] of __VLS_getVForSourceType((__VLS_ctx.datasourceGroups))) {
    const __VLS_184 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        key: (group.id),
        label: (group.name),
        value: (group.id),
    }));
    const __VLS_186 = __VLS_185({
        key: (group.id),
        label: (group.name),
        value: (group.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
}
var __VLS_183;
var __VLS_179;
const __VLS_188 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    label: "来源类型",
    prop: "sourceKind",
}));
const __VLS_190 = __VLS_189({
    label: "来源类型",
    prop: "sourceKind",
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
__VLS_191.slots.default;
const __VLS_192 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    modelValue: (__VLS_ctx.form.sourceKind),
    ...{ class: "source-kind-group" },
}));
const __VLS_194 = __VLS_193({
    modelValue: (__VLS_ctx.form.sourceKind),
    ...{ class: "source-kind-group" },
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.SOURCE_KIND_OPTIONS))) {
    const __VLS_196 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        key: (item.value),
        value: (item.value),
    }));
    const __VLS_198 = __VLS_197({
        key: (item.value),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    (item.label);
    var __VLS_199;
}
var __VLS_195;
var __VLS_191;
if (__VLS_ctx.form.sourceKind === 'DATABASE') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    const __VLS_200 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        label: "数据库类型",
        prop: "datasourceType",
    }));
    const __VLS_202 = __VLS_201({
        label: "数据库类型",
        prop: "datasourceType",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    __VLS_203.slots.default;
    const __VLS_204 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.datasourceType),
        placeholder: "请选择数据库类型",
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.datasourceType),
        placeholder: "请选择数据库类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onChange: (__VLS_ctx.handleDatabaseTypeChange)
    };
    __VLS_207.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.DATABASE_TYPE_OPTIONS))) {
        const __VLS_212 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_214 = __VLS_213({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    }
    var __VLS_207;
    var __VLS_203;
    const __VLS_216 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        label: "主机地址",
        prop: "host",
    }));
    const __VLS_218 = __VLS_217({
        label: "主机地址",
        prop: "host",
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_219.slots.default;
    const __VLS_220 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        modelValue: (__VLS_ctx.form.host),
        placeholder: "例如 127.0.0.1",
    }));
    const __VLS_222 = __VLS_221({
        modelValue: (__VLS_ctx.form.host),
        placeholder: "例如 127.0.0.1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    var __VLS_219;
    const __VLS_224 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        label: "端口",
        prop: "port",
    }));
    const __VLS_226 = __VLS_225({
        label: "端口",
        prop: "port",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    __VLS_227.slots.default;
    const __VLS_228 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.port === '' ? undefined : Number(__VLS_ctx.form.port)),
        min: (1),
        max: (65535),
        controlsPosition: "right",
    }));
    const __VLS_230 = __VLS_229({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.port === '' ? undefined : Number(__VLS_ctx.form.port)),
        min: (1),
        max: (65535),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    let __VLS_232;
    let __VLS_233;
    let __VLS_234;
    const __VLS_235 = {
        onChange: (__VLS_ctx.handlePortChange)
    };
    var __VLS_231;
    var __VLS_227;
    const __VLS_236 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
        label: "数据库名称",
        prop: "databaseName",
    }));
    const __VLS_238 = __VLS_237({
        label: "数据库名称",
        prop: "databaseName",
    }, ...__VLS_functionalComponentArgsRest(__VLS_237));
    __VLS_239.slots.default;
    const __VLS_240 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        modelValue: (__VLS_ctx.form.databaseName),
        placeholder: "请输入数据库名称",
    }));
    const __VLS_242 = __VLS_241({
        modelValue: (__VLS_ctx.form.databaseName),
        placeholder: "请输入数据库名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    var __VLS_239;
    const __VLS_244 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        label: "用户名",
        prop: "username",
    }));
    const __VLS_246 = __VLS_245({
        label: "用户名",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_247.slots.default;
    const __VLS_248 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        modelValue: (__VLS_ctx.form.username),
        placeholder: "请输入数据库账号",
    }));
    const __VLS_250 = __VLS_249({
        modelValue: (__VLS_ctx.form.username),
        placeholder: "请输入数据库账号",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    var __VLS_247;
    const __VLS_252 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        label: "密码",
    }));
    const __VLS_254 = __VLS_253({
        label: "密码",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    const __VLS_256 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        modelValue: (__VLS_ctx.form.password),
        type: "password",
        showPassword: true,
        placeholder: "编辑已有数据库时不修改可留空",
    }));
    const __VLS_258 = __VLS_257({
        modelValue: (__VLS_ctx.form.password),
        type: "password",
        showPassword: true,
        placeholder: "编辑已有数据库时不修改可留空",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    var __VLS_255;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
else if (__VLS_ctx.form.sourceKind === 'API') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    const __VLS_260 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        label: "请求地址",
        prop: "apiUrl",
        ...{ class: "form-item--full" },
    }));
    const __VLS_262 = __VLS_261({
        label: "请求地址",
        prop: "apiUrl",
        ...{ class: "form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_263.slots.default;
    const __VLS_264 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        modelValue: (__VLS_ctx.form.apiUrl),
        placeholder: "请输入完整 API 地址，例如 https://api.example.com/orders",
    }));
    const __VLS_266 = __VLS_265({
        modelValue: (__VLS_ctx.form.apiUrl),
        placeholder: "请输入完整 API 地址，例如 https://api.example.com/orders",
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    var __VLS_263;
    const __VLS_268 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        label: "请求方式",
    }));
    const __VLS_270 = __VLS_269({
        label: "请求方式",
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    __VLS_271.slots.default;
    const __VLS_272 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        modelValue: (__VLS_ctx.form.apiMethod),
    }));
    const __VLS_274 = __VLS_273({
        modelValue: (__VLS_ctx.form.apiMethod),
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_275.slots.default;
    const __VLS_276 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        label: "GET",
        value: "GET",
    }));
    const __VLS_278 = __VLS_277({
        label: "GET",
        value: "GET",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    const __VLS_280 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        label: "POST",
        value: "POST",
    }));
    const __VLS_282 = __VLS_281({
        label: "POST",
        value: "POST",
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    const __VLS_284 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        label: "PUT",
        value: "PUT",
    }));
    const __VLS_286 = __VLS_285({
        label: "PUT",
        value: "PUT",
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    const __VLS_288 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        label: "PATCH",
        value: "PATCH",
    }));
    const __VLS_290 = __VLS_289({
        label: "PATCH",
        value: "PATCH",
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    var __VLS_275;
    var __VLS_271;
    const __VLS_292 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        label: "结果路径",
        ...{ class: "form-item--full" },
    }));
    const __VLS_294 = __VLS_293({
        label: "结果路径",
        ...{ class: "form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    __VLS_295.slots.default;
    const __VLS_296 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
        placeholder: "可选，例如 data.list",
    }));
    const __VLS_298 = __VLS_297({
        modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
        placeholder: "可选，例如 data.list",
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    var __VLS_295;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-card form-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-tip" },
    });
    const __VLS_300 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        modelValue: (__VLS_ctx.apiRuntimeTab),
        ...{ class: "runtime-tabs" },
    }));
    const __VLS_302 = __VLS_301({
        modelValue: (__VLS_ctx.apiRuntimeTab),
        ...{ class: "runtime-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
    __VLS_303.slots.default;
    const __VLS_304 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        label: "请求头",
        name: "headers",
    }));
    const __VLS_306 = __VLS_305({
        label: "请求头",
        name: "headers",
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    __VLS_307.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kv-editor-list" },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.headers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (row.id),
            ...{ class: "kv-editor-row" },
        });
        const __VLS_308 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
            modelValue: (row.key),
            placeholder: "名称，例如 Authorization",
        }));
        const __VLS_310 = __VLS_309({
            modelValue: (row.key),
            placeholder: "名称，例如 Authorization",
        }, ...__VLS_functionalComponentArgsRest(__VLS_309));
        const __VLS_312 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }));
        const __VLS_314 = __VLS_313({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }, ...__VLS_functionalComponentArgsRest(__VLS_313));
        const __VLS_316 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }));
        const __VLS_318 = __VLS_317({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_317));
        let __VLS_320;
        let __VLS_321;
        let __VLS_322;
        const __VLS_323 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                    return;
                if (!(__VLS_ctx.form.sourceKind === 'API'))
                    return;
                __VLS_ctx.removeApiRuntimeRow('headers', row.id);
            }
        };
        __VLS_319.slots.default;
        var __VLS_319;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row action-row--compact" },
    });
    const __VLS_324 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_326 = __VLS_325({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    let __VLS_328;
    let __VLS_329;
    let __VLS_330;
    const __VLS_331 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            __VLS_ctx.addApiRuntimeRow('headers');
        }
    };
    __VLS_327.slots.default;
    var __VLS_327;
    var __VLS_307;
    const __VLS_332 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        label: "Query 参数",
        name: "query",
    }));
    const __VLS_334 = __VLS_333({
        label: "Query 参数",
        name: "query",
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    __VLS_335.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kv-editor-list" },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.query))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (row.id),
            ...{ class: "kv-editor-row" },
        });
        const __VLS_336 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
            modelValue: (row.key),
            placeholder: "参数名，例如 page",
        }));
        const __VLS_338 = __VLS_337({
            modelValue: (row.key),
            placeholder: "参数名，例如 page",
        }, ...__VLS_functionalComponentArgsRest(__VLS_337));
        const __VLS_340 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }));
        const __VLS_342 = __VLS_341({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }, ...__VLS_functionalComponentArgsRest(__VLS_341));
        const __VLS_344 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }));
        const __VLS_346 = __VLS_345({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_345));
        let __VLS_348;
        let __VLS_349;
        let __VLS_350;
        const __VLS_351 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                    return;
                if (!(__VLS_ctx.form.sourceKind === 'API'))
                    return;
                __VLS_ctx.removeApiRuntimeRow('query', row.id);
            }
        };
        __VLS_347.slots.default;
        var __VLS_347;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row action-row--compact" },
    });
    const __VLS_352 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_354 = __VLS_353({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_353));
    let __VLS_356;
    let __VLS_357;
    let __VLS_358;
    const __VLS_359 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            __VLS_ctx.addApiRuntimeRow('query');
        }
    };
    __VLS_355.slots.default;
    var __VLS_355;
    var __VLS_335;
    const __VLS_360 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
        label: "请求体",
        name: "body",
    }));
    const __VLS_362 = __VLS_361({
        label: "请求体",
        name: "body",
    }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    __VLS_363.slots.default;
    const __VLS_364 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
        type: "textarea",
        rows: (6),
        placeholder: "可输入 JSON 或普通文本；GET 请求可留空",
    }));
    const __VLS_366 = __VLS_365({
        modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
        type: "textarea",
        rows: (6),
        placeholder: "可输入 JSON 或普通文本；GET 请求可留空",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    var __VLS_363;
    var __VLS_303;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
else if (__VLS_ctx.form.sourceKind === 'TABLE') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-card form-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-tip" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-actions" },
    });
    const __VLS_368 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_370 = __VLS_369({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    let __VLS_372;
    let __VLS_373;
    let __VLS_374;
    const __VLS_375 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'TABLE'))
                return;
            __VLS_ctx.applyTableExample('CSV');
        }
    };
    __VLS_371.slots.default;
    var __VLS_371;
    const __VLS_376 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_378 = __VLS_377({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_377));
    let __VLS_380;
    let __VLS_381;
    let __VLS_382;
    const __VLS_383 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'TABLE'))
                return;
            __VLS_ctx.applyTableExample('TSV');
        }
    };
    __VLS_379.slots.default;
    var __VLS_379;
    const __VLS_384 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }));
    const __VLS_386 = __VLS_385({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    let __VLS_388;
    let __VLS_389;
    let __VLS_390;
    const __VLS_391 = {
        onClick: (__VLS_ctx.clearTableDraft)
    };
    __VLS_387.slots.default;
    var __VLS_387;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.form.tableDelimiter);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.tableDraftStats.headerLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.tableDraftStats.rowCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.tableDraftStats.columnCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-form-grid" },
    });
    const __VLS_392 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
        label: "分隔格式",
        ...{ class: "runtime-form-item" },
    }));
    const __VLS_394 = __VLS_393({
        label: "分隔格式",
        ...{ class: "runtime-form-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_393));
    __VLS_395.slots.default;
    const __VLS_396 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
        modelValue: (__VLS_ctx.form.tableDelimiter),
    }));
    const __VLS_398 = __VLS_397({
        modelValue: (__VLS_ctx.form.tableDelimiter),
    }, ...__VLS_functionalComponentArgsRest(__VLS_397));
    __VLS_399.slots.default;
    const __VLS_400 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
        value: "CSV",
    }));
    const __VLS_402 = __VLS_401({
        value: "CSV",
    }, ...__VLS_functionalComponentArgsRest(__VLS_401));
    __VLS_403.slots.default;
    var __VLS_403;
    const __VLS_404 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
        value: "TSV",
    }));
    const __VLS_406 = __VLS_405({
        value: "TSV",
    }, ...__VLS_functionalComponentArgsRest(__VLS_405));
    __VLS_407.slots.default;
    var __VLS_407;
    var __VLS_399;
    var __VLS_395;
    const __VLS_408 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
        label: "首行为表头",
        ...{ class: "runtime-form-item" },
    }));
    const __VLS_410 = __VLS_409({
        label: "首行为表头",
        ...{ class: "runtime-form-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_409));
    __VLS_411.slots.default;
    const __VLS_412 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
        modelValue: (__VLS_ctx.form.tableHasHeader),
        activeText: "是",
        inactiveText: "否",
    }));
    const __VLS_414 = __VLS_413({
        modelValue: (__VLS_ctx.form.tableHasHeader),
        activeText: "是",
        inactiveText: "否",
    }, ...__VLS_functionalComponentArgsRest(__VLS_413));
    var __VLS_411;
    const __VLS_416 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
        label: "表格内容",
        prop: "tableText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_418 = __VLS_417({
        label: "表格内容",
        prop: "tableText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_417));
    __VLS_419.slots.default;
    const __VLS_420 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
        modelValue: (__VLS_ctx.form.tableText),
        type: "textarea",
        rows: (12),
        placeholder: "请输入 CSV 或 TSV 文本，页面编写时可通过运行时配置覆盖",
    }));
    const __VLS_422 = __VLS_421({
        modelValue: (__VLS_ctx.form.tableText),
        type: "textarea",
        rows: (12),
        placeholder: "请输入 CSV 或 TSV 文本，页面编写时可通过运行时配置覆盖",
    }, ...__VLS_functionalComponentArgsRest(__VLS_421));
    var __VLS_419;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-card form-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-tip" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-editor-actions" },
    });
    const __VLS_424 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_426 = __VLS_425({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_425));
    let __VLS_428;
    let __VLS_429;
    let __VLS_430;
    const __VLS_431 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'TABLE'))
                return;
            __VLS_ctx.applyJsonExample('array');
        }
    };
    __VLS_427.slots.default;
    var __VLS_427;
    const __VLS_432 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_434 = __VLS_433({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_433));
    let __VLS_436;
    let __VLS_437;
    let __VLS_438;
    const __VLS_439 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            if (!!(__VLS_ctx.form.sourceKind === 'TABLE'))
                return;
            __VLS_ctx.applyJsonExample('object');
        }
    };
    __VLS_435.slots.default;
    var __VLS_435;
    const __VLS_440 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_442 = __VLS_441({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_441));
    let __VLS_444;
    let __VLS_445;
    let __VLS_446;
    const __VLS_447 = {
        onClick: (__VLS_ctx.formatJsonDraft)
    };
    __VLS_443.slots.default;
    var __VLS_443;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.jsonDraftStats.rootType);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.jsonDraftStats.itemCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.form.jsonResultPath.trim() || '直接读取根节点');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.jsonDraftStats.statusText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "runtime-form-grid" },
    });
    const __VLS_448 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
        label: "结果路径",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_450 = __VLS_449({
        label: "结果路径",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_449));
    __VLS_451.slots.default;
    const __VLS_452 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
        modelValue: (__VLS_ctx.form.jsonResultPath),
        placeholder: "可选，例如 data.records",
    }));
    const __VLS_454 = __VLS_453({
        modelValue: (__VLS_ctx.form.jsonResultPath),
        placeholder: "可选，例如 data.records",
    }, ...__VLS_functionalComponentArgsRest(__VLS_453));
    var __VLS_451;
    const __VLS_456 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
        label: "JSON 内容",
        prop: "jsonText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_458 = __VLS_457({
        label: "JSON 内容",
        prop: "jsonText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_457));
    __VLS_459.slots.default;
    const __VLS_460 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
        modelValue: (__VLS_ctx.form.jsonText),
        type: "textarea",
        rows: (12),
        placeholder: '请输入 JSON 数组或对象，例如 [{"name":"华东","value":120}]',
    }));
    const __VLS_462 = __VLS_461({
        modelValue: (__VLS_ctx.form.jsonText),
        type: "textarea",
        rows: (12),
        placeholder: '请输入 JSON 数组或对象，例如 [{"name":"华东","value":120}]',
    }, ...__VLS_functionalComponentArgsRest(__VLS_461));
    var __VLS_459;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
var __VLS_165;
if (__VLS_ctx.canPreviewDraft) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "draft-preview-card" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.dialogPreviewLoading) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-subtitle" },
    });
    const __VLS_464 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
        loading: (__VLS_ctx.dialogPreviewLoading),
    }));
    const __VLS_466 = __VLS_465({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        plain: true,
        loading: (__VLS_ctx.dialogPreviewLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_465));
    let __VLS_468;
    let __VLS_469;
    let __VLS_470;
    const __VLS_471 = {
        onClick: (__VLS_ctx.handlePreviewDraft)
    };
    __VLS_467.slots.default;
    var __VLS_467;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preview-summary" },
    });
    (__VLS_ctx.dialogPreview.columns.length);
    (__VLS_ctx.dialogPreview.rows.length);
    (__VLS_ctx.dialogPreview.rowCount);
    if (__VLS_ctx.dialogPreview.columns.length) {
        const __VLS_472 = {}.ElTable;
        /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
        // @ts-ignore
        const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({
            data: (__VLS_ctx.dialogPreview.rows),
            border: true,
            size: "small",
            maxHeight: "320",
            ...{ class: "preview-table" },
        }));
        const __VLS_474 = __VLS_473({
            data: (__VLS_ctx.dialogPreview.rows),
            border: true,
            size: "small",
            maxHeight: "320",
            ...{ class: "preview-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_473));
        __VLS_475.slots.default;
        for (const [column] of __VLS_getVForSourceType((__VLS_ctx.dialogPreview.columns))) {
            const __VLS_476 = {}.ElTableColumn;
            /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
            // @ts-ignore
            const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({
                key: (column),
                prop: (column),
                label: (column),
                minWidth: "140",
                showOverflowTooltip: true,
            }));
            const __VLS_478 = __VLS_477({
                key: (column),
                prop: (column),
                label: (column),
                minWidth: "140",
                showOverflowTooltip: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_477));
        }
        var __VLS_475;
    }
    else {
        const __VLS_480 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
            imageSize: (64),
            description: "点击“预览返回结果”查看当前配置的数据返回内容",
        }));
        const __VLS_482 = __VLS_481({
            imageSize: (64),
            description: "点击“预览返回结果”查看当前配置的数据返回内容",
        }, ...__VLS_functionalComponentArgsRest(__VLS_481));
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_161.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dialog-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "dialog-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dialog-actions" },
    });
    const __VLS_484 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }));
    const __VLS_486 = __VLS_485({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_485));
    let __VLS_488;
    let __VLS_489;
    let __VLS_490;
    const __VLS_491 = {
        onClick: (__VLS_ctx.handleTestConnection)
    };
    __VLS_487.slots.default;
    var __VLS_487;
    const __VLS_492 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({
        ...{ 'onClick': {} },
    }));
    const __VLS_494 = __VLS_493({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_493));
    let __VLS_496;
    let __VLS_497;
    let __VLS_498;
    const __VLS_499 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_495.slots.default;
    var __VLS_495;
    const __VLS_500 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_502 = __VLS_501({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_501));
    let __VLS_504;
    let __VLS_505;
    let __VLS_506;
    const __VLS_507 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_503.slots.default;
    var __VLS_503;
}
var __VLS_161;
const __VLS_508 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
    modelValue: (__VLS_ctx.groupDialogVisible),
    title: (__VLS_ctx.groupEditId ? '重命名分组' : '新建分组'),
    width: "400px",
    destroyOnClose: true,
}));
const __VLS_510 = __VLS_509({
    modelValue: (__VLS_ctx.groupDialogVisible),
    title: (__VLS_ctx.groupEditId ? '重命名分组' : '新建分组'),
    width: "400px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_509));
__VLS_511.slots.default;
const __VLS_512 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
    labelWidth: "80px",
}));
const __VLS_514 = __VLS_513({
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_513));
__VLS_515.slots.default;
const __VLS_516 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
    label: "分组名称",
}));
const __VLS_518 = __VLS_517({
    label: "分组名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_517));
__VLS_519.slots.default;
const __VLS_520 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.groupName),
    placeholder: "请输入分组名称",
}));
const __VLS_522 = __VLS_521({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.groupName),
    placeholder: "请输入分组名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_521));
let __VLS_524;
let __VLS_525;
let __VLS_526;
const __VLS_527 = {
    onKeyup: (__VLS_ctx.handleGroupSubmit)
};
var __VLS_523;
var __VLS_519;
var __VLS_515;
{
    const { footer: __VLS_thisSlot } = __VLS_511.slots;
    const __VLS_528 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
        ...{ 'onClick': {} },
    }));
    const __VLS_530 = __VLS_529({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_529));
    let __VLS_532;
    let __VLS_533;
    let __VLS_534;
    const __VLS_535 = {
        onClick: (...[$event]) => {
            __VLS_ctx.groupDialogVisible = false;
        }
    };
    __VLS_531.slots.default;
    var __VLS_531;
    const __VLS_536 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.groupSaving),
    }));
    const __VLS_538 = __VLS_537({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.groupSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_537));
    let __VLS_540;
    let __VLS_541;
    let __VLS_542;
    const __VLS_543 = {
        onClick: (__VLS_ctx.handleGroupSubmit)
    };
    __VLS_539.slots.default;
    var __VLS_539;
}
var __VLS_511;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['bi-page']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-head']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-search']} */ ;
/** @type {__VLS_StyleScopedClasses['group-section']} */ ;
/** @type {__VLS_StyleScopedClasses['group-section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['group-section-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['group-list']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-row']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['group-chip--row']} */ ;
/** @type {__VLS_StyleScopedClasses['group-row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-list']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-item']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-item-head']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-main']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-kv-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-kv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['config-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['config-preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-card--data']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['table-search']} */ ;
/** @type {__VLS_StyleScopedClasses['table-browser']} */ ;
/** @type {__VLS_StyleScopedClasses['table-list']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['table-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['column-list']} */ ;
/** @type {__VLS_StyleScopedClasses['column-item']} */ ;
/** @type {__VLS_StyleScopedClasses['column-name']} */ ;
/** @type {__VLS_StyleScopedClasses['column-remark']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-detail-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-empty--detail']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-table']} */ ;
/** @type {__VLS_StyleScopedClasses['main-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid--basic']} */ ;
/** @type {__VLS_StyleScopedClasses['source-kind-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-title']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-list']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-list']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['form-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-title']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-title']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['form-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['draft-preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-table']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-actions']} */ ;
// @ts-ignore
var __VLS_167 = __VLS_166;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Delete: Delete,
            Edit: Edit,
            FolderAdd: FolderAdd,
            Plus: Plus,
            RefreshRight: RefreshRight,
            SOURCE_KIND_OPTIONS: SOURCE_KIND_OPTIONS,
            DATABASE_TYPE_OPTIONS: DATABASE_TYPE_OPTIONS,
            loading: loading,
            datasources: datasources,
            datasourceGroups: datasourceGroups,
            searchKeyword: searchKeyword,
            selectedGroupFilter: selectedGroupFilter,
            selectedId: selectedId,
            previewLoading: previewLoading,
            preview: preview,
            tablesLoading: tablesLoading,
            tableSearch: tableSearch,
            selectedTable: selectedTable,
            columnsLoading: columnsLoading,
            tableColumns: tableColumns,
            extractPreview: extractPreview,
            extractPreviewLoading: extractPreviewLoading,
            extractPreviewPage: extractPreviewPage,
            extractPreviewPageSize: extractPreviewPageSize,
            dialogVisible: dialogVisible,
            dialogMode: dialogMode,
            saving: saving,
            testing: testing,
            dialogPreviewLoading: dialogPreviewLoading,
            formRef: formRef,
            form: form,
            apiRuntimeForm: apiRuntimeForm,
            apiRuntimeTab: apiRuntimeTab,
            dialogPreview: dialogPreview,
            groupDialogVisible: groupDialogVisible,
            groupName: groupName,
            groupSaving: groupSaving,
            groupEditId: groupEditId,
            selectedDatasource: selectedDatasource,
            canPreviewDraft: canPreviewDraft,
            activeGroupDraftId: activeGroupDraftId,
            filteredDatasources: filteredDatasources,
            ungroupedDatasourceCount: ungroupedDatasourceCount,
            extractPreviewTotalRows: extractPreviewTotalRows,
            filteredTables: filteredTables,
            tableDraftStats: tableDraftStats,
            jsonDraftStats: jsonDraftStats,
            datasourceCountByGroup: datasourceCountByGroup,
            selectedDatasourceInfo: selectedDatasourceInfo,
            selectedConfigPreview: selectedConfigPreview,
            rules: rules,
            refreshSelectedDatasource: refreshSelectedDatasource,
            loadStaticPreview: loadStaticPreview,
            loadDatabaseTables: loadDatabaseTables,
            selectTable: selectTable,
            handleExtractPreviewPageChange: handleExtractPreviewPageChange,
            handleExtractPreviewPageSizeChange: handleExtractPreviewPageSizeChange,
            openCreate: openCreate,
            openEdit: openEdit,
            openCreateGroup: openCreateGroup,
            openRenameGroup: openRenameGroup,
            handleDatabaseTypeChange: handleDatabaseTypeChange,
            handlePortChange: handlePortChange,
            handleTestConnection: handleTestConnection,
            handlePreviewDraft: handlePreviewDraft,
            handleSubmit: handleSubmit,
            handleGroupSubmit: handleGroupSubmit,
            handleDelete: handleDelete,
            handleDeleteGroup: handleDeleteGroup,
            sourceKindLabel: sourceKindLabel,
            resolveSourceKind: resolveSourceKind,
            isDatabaseDatasource: isDatabaseDatasource,
            datasourceSubtitle: datasourceSubtitle,
            addApiRuntimeRow: addApiRuntimeRow,
            removeApiRuntimeRow: removeApiRuntimeRow,
            applyTableExample: applyTableExample,
            clearTableDraft: clearTableDraft,
            applyJsonExample: applyJsonExample,
            formatJsonDraft: formatJsonDraft,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
