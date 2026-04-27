/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Edit, Plus, RefreshRight } from '@element-plus/icons-vue';
import { createDatasource, deleteDatasource, getDatasourceList, getDatasourcePreviewData, getDatasourceTables, getTableColumns, previewExtract, testDatasourceConnection, updateDatasource, } from '../api/datasource';
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
const emptyExtractPreview = () => ({ sqlText: '', columns: [], rows: [], rowCount: 0 });
const createEmptyForm = () => ({
    name: '',
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
const searchKeyword = ref('');
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
const dialogVisible = ref(false);
const dialogMode = ref('create');
const dialogEditId = ref(null);
const saving = ref(false);
const testing = ref(false);
const formRef = ref();
const form = reactive(createEmptyForm());
const apiRuntimeForm = reactive(createEmptyApiRuntimeForm());
const apiRuntimeTab = ref('headers');
const selectedDatasource = computed(() => datasources.value.find((item) => item.id === selectedId.value) ?? null);
const filteredDatasources = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();
    const list = [...datasources.value].sort((left, right) => right.id - left.id);
    if (!keyword)
        return list;
    return list.filter((item) => item.name.toLowerCase().includes(keyword));
});
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
const selectedDatasourceInfo = computed(() => {
    const datasource = selectedDatasource.value;
    if (!datasource)
        return [];
    const sourceKind = resolveSourceKind(datasource);
    const config = parseConfigJson(datasource.configJson);
    if (sourceKind === 'DATABASE') {
        return [
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
            { label: '请求地址', value: readString(config.apiUrl ?? config.url) || '-' },
            { label: '请求方式', value: readString(config.apiMethod ?? config.method) || 'GET' },
            { label: '结果路径', value: readString(config.apiResultPath ?? config.resultPath) || '-' },
            { label: '创建时间', value: datasource.createdAt || '-' },
        ];
    }
    if (sourceKind === 'TABLE') {
        return [
            { label: '分隔格式', value: readString(config.tableDelimiter ?? config.delimiter) || 'CSV' },
            { label: '首行为表头', value: readBoolean(config.tableHasHeader ?? config.hasHeader, true) ? '是' : '否' },
            { label: '内容行数', value: countLines(readString(config.tableText ?? config.text)) },
            { label: '创建时间', value: datasource.createdAt || '-' },
        ];
    }
    return [
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
const loadDatasources = async (preferredId) => {
    loading.value = true;
    try {
        const list = await getDatasourceList();
        datasources.value = list;
        const nextId = preferredId && list.some((item) => item.id === preferredId)
            ? preferredId
            : selectedId.value && list.some((item) => item.id === selectedId.value)
                ? selectedId.value
                : list[0]?.id ?? null;
        selectedId.value = nextId;
    }
    catch {
        datasources.value = [];
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
const selectTable = async (tableName) => {
    if (!selectedDatasource.value)
        return;
    selectedTable.value = tableName;
    columnsLoading.value = true;
    try {
        const [columns, previewResult] = await Promise.all([
            getTableColumns(selectedDatasource.value.id, tableName),
            previewExtract({ datasourceId: selectedDatasource.value.id, tableName, limit: 20 }),
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
    }
};
const openCreate = () => {
    dialogMode.value = 'create';
    dialogEditId.value = null;
    Object.assign(form, createEmptyForm());
    resetApiRuntimeForm();
    dialogVisible.value = true;
};
const openEdit = (datasource) => {
    dialogMode.value = 'edit';
    dialogEditId.value = datasource.id;
    Object.assign(form, createEmptyForm());
    resetApiRuntimeForm();
    form.name = datasource.name;
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
const buildDatasourcePayload = () => {
    if (form.sourceKind === 'DATABASE') {
        return {
            name: form.name.trim(),
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
const __VLS_5 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}));
const __VLS_7 = __VLS_6({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    icon: (__VLS_ctx.Plus),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_9;
let __VLS_10;
let __VLS_11;
const __VLS_12 = {
    onClick: (__VLS_ctx.openCreate)
};
__VLS_8.slots.default;
var __VLS_8;
const __VLS_13 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    modelValue: (__VLS_ctx.searchKeyword),
    ...{ class: "sidebar-search" },
    placeholder: "搜索数据源名称",
    clearable: true,
}));
const __VLS_15 = __VLS_14({
    modelValue: (__VLS_ctx.searchKeyword),
    ...{ class: "sidebar-search" },
    placeholder: "搜索数据源名称",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
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
    const __VLS_17 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
        size: "small",
        effect: "plain",
    }));
    const __VLS_19 = __VLS_18({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    __VLS_20.slots.default;
    (__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(item)));
    var __VLS_20;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "datasource-item-meta" },
    });
    (__VLS_ctx.datasourceSubtitle(item));
}
if (!__VLS_ctx.loading && !__VLS_ctx.filteredDatasources.length) {
    const __VLS_21 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        description: "暂无数据源",
        imageSize: (56),
    }));
    const __VLS_23 = __VLS_22({
        description: "暂无数据源",
        imageSize: (56),
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
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
    const __VLS_25 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
        effect: "dark",
        size: "small",
    }));
    const __VLS_27 = __VLS_26({
        effect: "dark",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    __VLS_28.slots.default;
    (__VLS_ctx.sourceKindLabel(__VLS_ctx.resolveSourceKind(__VLS_ctx.selectedDatasource)));
    var __VLS_28;
    if (__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)) {
        const __VLS_29 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
            type: "success",
            size: "small",
        }));
        const __VLS_31 = __VLS_30({
            type: "success",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        __VLS_32.slots.default;
        var __VLS_32;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-subtitle" },
    });
    (__VLS_ctx.datasourceSubtitle(__VLS_ctx.selectedDatasource));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-actions" },
    });
    const __VLS_33 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.RefreshRight),
    }));
    const __VLS_35 = __VLS_34({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.RefreshRight),
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    let __VLS_37;
    let __VLS_38;
    let __VLS_39;
    const __VLS_40 = {
        onClick: (__VLS_ctx.refreshSelectedDatasource)
    };
    __VLS_36.slots.default;
    var __VLS_36;
    const __VLS_41 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }));
    const __VLS_43 = __VLS_42({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Edit),
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    let __VLS_45;
    let __VLS_46;
    let __VLS_47;
    const __VLS_48 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.selectedDatasource))
                return;
            __VLS_ctx.openEdit(__VLS_ctx.selectedDatasource);
        }
    };
    __VLS_44.slots.default;
    var __VLS_44;
    const __VLS_49 = {}.ElPopconfirm;
    /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
    // @ts-ignore
    const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
        ...{ 'onConfirm': {} },
        title: "确认删除此数据源？",
    }));
    const __VLS_51 = __VLS_50({
        ...{ 'onConfirm': {} },
        title: "确认删除此数据源？",
    }, ...__VLS_functionalComponentArgsRest(__VLS_50));
    let __VLS_53;
    let __VLS_54;
    let __VLS_55;
    const __VLS_56 = {
        onConfirm: (...[$event]) => {
            if (!(__VLS_ctx.selectedDatasource))
                return;
            __VLS_ctx.handleDelete(__VLS_ctx.selectedDatasource.id);
        }
    };
    __VLS_52.slots.default;
    {
        const { reference: __VLS_thisSlot } = __VLS_52.slots;
        const __VLS_57 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }));
        const __VLS_59 = __VLS_58({
            size: "small",
            type: "danger",
            plain: true,
            icon: (__VLS_ctx.Delete),
        }, ...__VLS_functionalComponentArgsRest(__VLS_58));
        __VLS_60.slots.default;
        var __VLS_60;
    }
    var __VLS_52;
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
        const __VLS_61 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.tablesLoading),
        }));
        const __VLS_63 = __VLS_62({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.tablesLoading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_62));
        let __VLS_65;
        let __VLS_66;
        let __VLS_67;
        const __VLS_68 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedDatasource))
                    return;
                if (!(__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)))
                    return;
                __VLS_ctx.loadDatabaseTables(__VLS_ctx.selectedDatasource.id);
            }
        };
        __VLS_64.slots.default;
        var __VLS_64;
        const __VLS_69 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
            modelValue: (__VLS_ctx.tableSearch),
            placeholder: "搜索表名",
            clearable: true,
            ...{ class: "table-search" },
        }));
        const __VLS_71 = __VLS_70({
            modelValue: (__VLS_ctx.tableSearch),
            placeholder: "搜索表名",
            clearable: true,
            ...{ class: "table-search" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_70));
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
                const __VLS_73 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
                    size: "small",
                }));
                const __VLS_75 = __VLS_74({
                    size: "small",
                }, ...__VLS_functionalComponentArgsRest(__VLS_74));
                __VLS_76.slots.default;
                (column.dataType);
                var __VLS_76;
            }
            if (__VLS_ctx.extractPreview.columns.length) {
                const __VLS_77 = {}.ElTable;
                /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
                // @ts-ignore
                const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
                    data: (__VLS_ctx.extractPreview.rows),
                    border: true,
                    size: "small",
                    maxHeight: "280",
                    ...{ class: "preview-table" },
                }));
                const __VLS_79 = __VLS_78({
                    data: (__VLS_ctx.extractPreview.rows),
                    border: true,
                    size: "small",
                    maxHeight: "280",
                    ...{ class: "preview-table" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_78));
                __VLS_80.slots.default;
                for (const [column] of __VLS_getVForSourceType((__VLS_ctx.extractPreview.columns))) {
                    const __VLS_81 = {}.ElTableColumn;
                    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                    // @ts-ignore
                    const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
                        key: (column),
                        prop: (column),
                        label: (column),
                        minWidth: "140",
                        showOverflowTooltip: true,
                    }));
                    const __VLS_83 = __VLS_82({
                        key: (column),
                        prop: (column),
                        label: (column),
                        minWidth: "140",
                        showOverflowTooltip: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
                }
                var __VLS_80;
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
        const __VLS_85 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.previewLoading),
        }));
        const __VLS_87 = __VLS_86({
            ...{ 'onClick': {} },
            size: "small",
            icon: (__VLS_ctx.RefreshRight),
            loading: (__VLS_ctx.previewLoading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        let __VLS_89;
        let __VLS_90;
        let __VLS_91;
        const __VLS_92 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedDatasource))
                    return;
                if (!!(__VLS_ctx.isDatabaseDatasource(__VLS_ctx.selectedDatasource)))
                    return;
                __VLS_ctx.loadStaticPreview(__VLS_ctx.selectedDatasource.id);
            }
        };
        __VLS_88.slots.default;
        var __VLS_88;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-summary" },
        });
        (__VLS_ctx.preview.columns.length);
        (__VLS_ctx.preview.rows.length);
        (__VLS_ctx.preview.rowCount);
        if (__VLS_ctx.preview.columns.length) {
            const __VLS_93 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
                data: (__VLS_ctx.preview.rows),
                border: true,
                size: "small",
                maxHeight: "520",
                ...{ class: "preview-table" },
            }));
            const __VLS_95 = __VLS_94({
                data: (__VLS_ctx.preview.rows),
                border: true,
                size: "small",
                maxHeight: "520",
                ...{ class: "preview-table" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_94));
            __VLS_96.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.preview.columns))) {
                const __VLS_97 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "140",
                    showOverflowTooltip: true,
                }));
                const __VLS_99 = __VLS_98({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "140",
                    showOverflowTooltip: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_98));
            }
            var __VLS_96;
        }
        else {
            const __VLS_101 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
                imageSize: (72),
                description: "当前数据源暂无可展示数据",
            }));
            const __VLS_103 = __VLS_102({
                imageSize: (72),
                description: "当前数据源暂无可展示数据",
            }, ...__VLS_functionalComponentArgsRest(__VLS_102));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "main-empty" },
    });
    const __VLS_105 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
        description: "请先选择或创建一个数据源",
        imageSize: (88),
    }));
    const __VLS_107 = __VLS_106({
        description: "请先选择或创建一个数据源",
        imageSize: (88),
    }, ...__VLS_functionalComponentArgsRest(__VLS_106));
    __VLS_108.slots.default;
    const __VLS_109 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_111 = __VLS_110({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    let __VLS_113;
    let __VLS_114;
    let __VLS_115;
    const __VLS_116 = {
        onClick: (__VLS_ctx.openCreate)
    };
    __VLS_112.slots.default;
    var __VLS_112;
    var __VLS_108;
}
const __VLS_117 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_118 = __VLS_asFunctionalComponent(__VLS_117, new __VLS_117({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogMode === 'create' ? '新建数据源' : '编辑数据源'),
    width: "900px",
    destroyOnClose: true,
}));
const __VLS_119 = __VLS_118({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.dialogMode === 'create' ? '新建数据源' : '编辑数据源'),
    width: "900px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_118));
__VLS_120.slots.default;
const __VLS_121 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "datasource-form" },
}));
const __VLS_123 = __VLS_122({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "datasource-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_122));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_125 = {};
__VLS_124.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid form-grid--basic" },
});
const __VLS_127 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
    label: "数据源名称",
    prop: "name",
}));
const __VLS_129 = __VLS_128({
    label: "数据源名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
__VLS_130.slots.default;
const __VLS_131 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据源名称",
}));
const __VLS_133 = __VLS_132({
    modelValue: (__VLS_ctx.form.name),
    placeholder: "请输入数据源名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
var __VLS_130;
const __VLS_135 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    label: "来源类型",
    prop: "sourceKind",
}));
const __VLS_137 = __VLS_136({
    label: "来源类型",
    prop: "sourceKind",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
__VLS_138.slots.default;
const __VLS_139 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    modelValue: (__VLS_ctx.form.sourceKind),
    ...{ class: "source-kind-group" },
}));
const __VLS_141 = __VLS_140({
    modelValue: (__VLS_ctx.form.sourceKind),
    ...{ class: "source-kind-group" },
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.SOURCE_KIND_OPTIONS))) {
    const __VLS_143 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
        key: (item.value),
        value: (item.value),
    }));
    const __VLS_145 = __VLS_144({
        key: (item.value),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_144));
    __VLS_146.slots.default;
    (item.label);
    var __VLS_146;
}
var __VLS_142;
var __VLS_138;
if (__VLS_ctx.form.sourceKind === 'DATABASE') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    const __VLS_147 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
        label: "数据库类型",
        prop: "datasourceType",
    }));
    const __VLS_149 = __VLS_148({
        label: "数据库类型",
        prop: "datasourceType",
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    __VLS_150.slots.default;
    const __VLS_151 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.datasourceType),
        placeholder: "请选择数据库类型",
    }));
    const __VLS_153 = __VLS_152({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.datasourceType),
        placeholder: "请选择数据库类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_152));
    let __VLS_155;
    let __VLS_156;
    let __VLS_157;
    const __VLS_158 = {
        onChange: (__VLS_ctx.handleDatabaseTypeChange)
    };
    __VLS_154.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.DATABASE_TYPE_OPTIONS))) {
        const __VLS_159 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_161 = __VLS_160({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    }
    var __VLS_154;
    var __VLS_150;
    const __VLS_163 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
        label: "主机地址",
        prop: "host",
    }));
    const __VLS_165 = __VLS_164({
        label: "主机地址",
        prop: "host",
    }, ...__VLS_functionalComponentArgsRest(__VLS_164));
    __VLS_166.slots.default;
    const __VLS_167 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
        modelValue: (__VLS_ctx.form.host),
        placeholder: "例如 127.0.0.1",
    }));
    const __VLS_169 = __VLS_168({
        modelValue: (__VLS_ctx.form.host),
        placeholder: "例如 127.0.0.1",
    }, ...__VLS_functionalComponentArgsRest(__VLS_168));
    var __VLS_166;
    const __VLS_171 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
        label: "端口",
        prop: "port",
    }));
    const __VLS_173 = __VLS_172({
        label: "端口",
        prop: "port",
    }, ...__VLS_functionalComponentArgsRest(__VLS_172));
    __VLS_174.slots.default;
    const __VLS_175 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.port === '' ? undefined : Number(__VLS_ctx.form.port)),
        min: (1),
        max: (65535),
        controlsPosition: "right",
    }));
    const __VLS_177 = __VLS_176({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.form.port === '' ? undefined : Number(__VLS_ctx.form.port)),
        min: (1),
        max: (65535),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_176));
    let __VLS_179;
    let __VLS_180;
    let __VLS_181;
    const __VLS_182 = {
        onChange: (__VLS_ctx.handlePortChange)
    };
    var __VLS_178;
    var __VLS_174;
    const __VLS_183 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
        label: "数据库名称",
        prop: "databaseName",
    }));
    const __VLS_185 = __VLS_184({
        label: "数据库名称",
        prop: "databaseName",
    }, ...__VLS_functionalComponentArgsRest(__VLS_184));
    __VLS_186.slots.default;
    const __VLS_187 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
        modelValue: (__VLS_ctx.form.databaseName),
        placeholder: "请输入数据库名称",
    }));
    const __VLS_189 = __VLS_188({
        modelValue: (__VLS_ctx.form.databaseName),
        placeholder: "请输入数据库名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    var __VLS_186;
    const __VLS_191 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
        label: "用户名",
        prop: "username",
    }));
    const __VLS_193 = __VLS_192({
        label: "用户名",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_192));
    __VLS_194.slots.default;
    const __VLS_195 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
        modelValue: (__VLS_ctx.form.username),
        placeholder: "请输入数据库账号",
    }));
    const __VLS_197 = __VLS_196({
        modelValue: (__VLS_ctx.form.username),
        placeholder: "请输入数据库账号",
    }, ...__VLS_functionalComponentArgsRest(__VLS_196));
    var __VLS_194;
    const __VLS_199 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
        label: "密码",
    }));
    const __VLS_201 = __VLS_200({
        label: "密码",
    }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    __VLS_202.slots.default;
    const __VLS_203 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
        modelValue: (__VLS_ctx.form.password),
        type: "password",
        showPassword: true,
        placeholder: "编辑已有数据库时不修改可留空",
    }));
    const __VLS_205 = __VLS_204({
        modelValue: (__VLS_ctx.form.password),
        type: "password",
        showPassword: true,
        placeholder: "编辑已有数据库时不修改可留空",
    }, ...__VLS_functionalComponentArgsRest(__VLS_204));
    var __VLS_202;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
else if (__VLS_ctx.form.sourceKind === 'API') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    const __VLS_207 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
        label: "请求地址",
        prop: "apiUrl",
        ...{ class: "form-item--full" },
    }));
    const __VLS_209 = __VLS_208({
        label: "请求地址",
        prop: "apiUrl",
        ...{ class: "form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
    __VLS_210.slots.default;
    const __VLS_211 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
        modelValue: (__VLS_ctx.form.apiUrl),
        placeholder: "请输入完整 API 地址，例如 https://api.example.com/orders",
    }));
    const __VLS_213 = __VLS_212({
        modelValue: (__VLS_ctx.form.apiUrl),
        placeholder: "请输入完整 API 地址，例如 https://api.example.com/orders",
    }, ...__VLS_functionalComponentArgsRest(__VLS_212));
    var __VLS_210;
    const __VLS_215 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        label: "请求方式",
    }));
    const __VLS_217 = __VLS_216({
        label: "请求方式",
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
    __VLS_218.slots.default;
    const __VLS_219 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        modelValue: (__VLS_ctx.form.apiMethod),
    }));
    const __VLS_221 = __VLS_220({
        modelValue: (__VLS_ctx.form.apiMethod),
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    __VLS_222.slots.default;
    const __VLS_223 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
        label: "GET",
        value: "GET",
    }));
    const __VLS_225 = __VLS_224({
        label: "GET",
        value: "GET",
    }, ...__VLS_functionalComponentArgsRest(__VLS_224));
    const __VLS_227 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
        label: "POST",
        value: "POST",
    }));
    const __VLS_229 = __VLS_228({
        label: "POST",
        value: "POST",
    }, ...__VLS_functionalComponentArgsRest(__VLS_228));
    const __VLS_231 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
        label: "PUT",
        value: "PUT",
    }));
    const __VLS_233 = __VLS_232({
        label: "PUT",
        value: "PUT",
    }, ...__VLS_functionalComponentArgsRest(__VLS_232));
    const __VLS_235 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
        label: "PATCH",
        value: "PATCH",
    }));
    const __VLS_237 = __VLS_236({
        label: "PATCH",
        value: "PATCH",
    }, ...__VLS_functionalComponentArgsRest(__VLS_236));
    var __VLS_222;
    var __VLS_218;
    const __VLS_239 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
        label: "结果路径",
        ...{ class: "form-item--full" },
    }));
    const __VLS_241 = __VLS_240({
        label: "结果路径",
        ...{ class: "form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_240));
    __VLS_242.slots.default;
    const __VLS_243 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
        modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
        placeholder: "可选，例如 data.list",
    }));
    const __VLS_245 = __VLS_244({
        modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
        placeholder: "可选，例如 data.list",
    }, ...__VLS_functionalComponentArgsRest(__VLS_244));
    var __VLS_242;
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
    const __VLS_247 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
        modelValue: (__VLS_ctx.apiRuntimeTab),
        ...{ class: "runtime-tabs" },
    }));
    const __VLS_249 = __VLS_248({
        modelValue: (__VLS_ctx.apiRuntimeTab),
        ...{ class: "runtime-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_248));
    __VLS_250.slots.default;
    const __VLS_251 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
        label: "请求头",
        name: "headers",
    }));
    const __VLS_253 = __VLS_252({
        label: "请求头",
        name: "headers",
    }, ...__VLS_functionalComponentArgsRest(__VLS_252));
    __VLS_254.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kv-editor-list" },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.headers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (row.id),
            ...{ class: "kv-editor-row" },
        });
        const __VLS_255 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
            modelValue: (row.key),
            placeholder: "名称，例如 Authorization",
        }));
        const __VLS_257 = __VLS_256({
            modelValue: (row.key),
            placeholder: "名称，例如 Authorization",
        }, ...__VLS_functionalComponentArgsRest(__VLS_256));
        const __VLS_259 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }));
        const __VLS_261 = __VLS_260({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }, ...__VLS_functionalComponentArgsRest(__VLS_260));
        const __VLS_263 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }));
        const __VLS_265 = __VLS_264({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_264));
        let __VLS_267;
        let __VLS_268;
        let __VLS_269;
        const __VLS_270 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                    return;
                if (!(__VLS_ctx.form.sourceKind === 'API'))
                    return;
                __VLS_ctx.removeApiRuntimeRow('headers', row.id);
            }
        };
        __VLS_266.slots.default;
        var __VLS_266;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row action-row--compact" },
    });
    const __VLS_271 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_273 = __VLS_272({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_272));
    let __VLS_275;
    let __VLS_276;
    let __VLS_277;
    const __VLS_278 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            __VLS_ctx.addApiRuntimeRow('headers');
        }
    };
    __VLS_274.slots.default;
    var __VLS_274;
    var __VLS_254;
    const __VLS_279 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
        label: "Query 参数",
        name: "query",
    }));
    const __VLS_281 = __VLS_280({
        label: "Query 参数",
        name: "query",
    }, ...__VLS_functionalComponentArgsRest(__VLS_280));
    __VLS_282.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kv-editor-list" },
    });
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.query))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (row.id),
            ...{ class: "kv-editor-row" },
        });
        const __VLS_283 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
            modelValue: (row.key),
            placeholder: "参数名，例如 page",
        }));
        const __VLS_285 = __VLS_284({
            modelValue: (row.key),
            placeholder: "参数名，例如 page",
        }, ...__VLS_functionalComponentArgsRest(__VLS_284));
        const __VLS_287 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }));
        const __VLS_289 = __VLS_288({
            modelValue: (row.value),
            placeholder: "值，支持 JSON 或纯文本",
        }, ...__VLS_functionalComponentArgsRest(__VLS_288));
        const __VLS_291 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }));
        const __VLS_293 = __VLS_292({
            ...{ 'onClick': {} },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_292));
        let __VLS_295;
        let __VLS_296;
        let __VLS_297;
        const __VLS_298 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                    return;
                if (!(__VLS_ctx.form.sourceKind === 'API'))
                    return;
                __VLS_ctx.removeApiRuntimeRow('query', row.id);
            }
        };
        __VLS_294.slots.default;
        var __VLS_294;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row action-row--compact" },
    });
    const __VLS_299 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_301 = __VLS_300({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_300));
    let __VLS_303;
    let __VLS_304;
    let __VLS_305;
    const __VLS_306 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.form.sourceKind === 'DATABASE'))
                return;
            if (!(__VLS_ctx.form.sourceKind === 'API'))
                return;
            __VLS_ctx.addApiRuntimeRow('query');
        }
    };
    __VLS_302.slots.default;
    var __VLS_302;
    var __VLS_282;
    const __VLS_307 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
        label: "请求体",
        name: "body",
    }));
    const __VLS_309 = __VLS_308({
        label: "请求体",
        name: "body",
    }, ...__VLS_functionalComponentArgsRest(__VLS_308));
    __VLS_310.slots.default;
    const __VLS_311 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
        modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
        type: "textarea",
        rows: (6),
        placeholder: "可输入 JSON 或普通文本；GET 请求可留空",
    }));
    const __VLS_313 = __VLS_312({
        modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
        type: "textarea",
        rows: (6),
        placeholder: "可输入 JSON 或普通文本；GET 请求可留空",
    }, ...__VLS_functionalComponentArgsRest(__VLS_312));
    var __VLS_310;
    var __VLS_250;
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
    const __VLS_315 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_317 = __VLS_316({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_316));
    let __VLS_319;
    let __VLS_320;
    let __VLS_321;
    const __VLS_322 = {
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
    __VLS_318.slots.default;
    var __VLS_318;
    const __VLS_323 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_325 = __VLS_324({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_324));
    let __VLS_327;
    let __VLS_328;
    let __VLS_329;
    const __VLS_330 = {
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
    __VLS_326.slots.default;
    var __VLS_326;
    const __VLS_331 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }));
    const __VLS_333 = __VLS_332({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_332));
    let __VLS_335;
    let __VLS_336;
    let __VLS_337;
    const __VLS_338 = {
        onClick: (__VLS_ctx.clearTableDraft)
    };
    __VLS_334.slots.default;
    var __VLS_334;
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
    const __VLS_339 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
        label: "分隔格式",
        ...{ class: "runtime-form-item" },
    }));
    const __VLS_341 = __VLS_340({
        label: "分隔格式",
        ...{ class: "runtime-form-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_340));
    __VLS_342.slots.default;
    const __VLS_343 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
        modelValue: (__VLS_ctx.form.tableDelimiter),
    }));
    const __VLS_345 = __VLS_344({
        modelValue: (__VLS_ctx.form.tableDelimiter),
    }, ...__VLS_functionalComponentArgsRest(__VLS_344));
    __VLS_346.slots.default;
    const __VLS_347 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
        value: "CSV",
    }));
    const __VLS_349 = __VLS_348({
        value: "CSV",
    }, ...__VLS_functionalComponentArgsRest(__VLS_348));
    __VLS_350.slots.default;
    var __VLS_350;
    const __VLS_351 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
        value: "TSV",
    }));
    const __VLS_353 = __VLS_352({
        value: "TSV",
    }, ...__VLS_functionalComponentArgsRest(__VLS_352));
    __VLS_354.slots.default;
    var __VLS_354;
    var __VLS_346;
    var __VLS_342;
    const __VLS_355 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
        label: "首行为表头",
        ...{ class: "runtime-form-item" },
    }));
    const __VLS_357 = __VLS_356({
        label: "首行为表头",
        ...{ class: "runtime-form-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_356));
    __VLS_358.slots.default;
    const __VLS_359 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
        modelValue: (__VLS_ctx.form.tableHasHeader),
        activeText: "是",
        inactiveText: "否",
    }));
    const __VLS_361 = __VLS_360({
        modelValue: (__VLS_ctx.form.tableHasHeader),
        activeText: "是",
        inactiveText: "否",
    }, ...__VLS_functionalComponentArgsRest(__VLS_360));
    var __VLS_358;
    const __VLS_363 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
        label: "表格内容",
        prop: "tableText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_365 = __VLS_364({
        label: "表格内容",
        prop: "tableText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_364));
    __VLS_366.slots.default;
    const __VLS_367 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_368 = __VLS_asFunctionalComponent(__VLS_367, new __VLS_367({
        modelValue: (__VLS_ctx.form.tableText),
        type: "textarea",
        rows: (12),
        placeholder: "请输入 CSV 或 TSV 文本，页面编写时可通过运行时配置覆盖",
    }));
    const __VLS_369 = __VLS_368({
        modelValue: (__VLS_ctx.form.tableText),
        type: "textarea",
        rows: (12),
        placeholder: "请输入 CSV 或 TSV 文本，页面编写时可通过运行时配置覆盖",
    }, ...__VLS_functionalComponentArgsRest(__VLS_368));
    var __VLS_366;
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
    const __VLS_371 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_373 = __VLS_372({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_372));
    let __VLS_375;
    let __VLS_376;
    let __VLS_377;
    const __VLS_378 = {
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
    __VLS_374.slots.default;
    var __VLS_374;
    const __VLS_379 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_380 = __VLS_asFunctionalComponent(__VLS_379, new __VLS_379({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_381 = __VLS_380({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_380));
    let __VLS_383;
    let __VLS_384;
    let __VLS_385;
    const __VLS_386 = {
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
    __VLS_382.slots.default;
    var __VLS_382;
    const __VLS_387 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_388 = __VLS_asFunctionalComponent(__VLS_387, new __VLS_387({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }));
    const __VLS_389 = __VLS_388({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_388));
    let __VLS_391;
    let __VLS_392;
    let __VLS_393;
    const __VLS_394 = {
        onClick: (__VLS_ctx.formatJsonDraft)
    };
    __VLS_390.slots.default;
    var __VLS_390;
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
    const __VLS_395 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_396 = __VLS_asFunctionalComponent(__VLS_395, new __VLS_395({
        label: "结果路径",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_397 = __VLS_396({
        label: "结果路径",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_396));
    __VLS_398.slots.default;
    const __VLS_399 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_400 = __VLS_asFunctionalComponent(__VLS_399, new __VLS_399({
        modelValue: (__VLS_ctx.form.jsonResultPath),
        placeholder: "可选，例如 data.records",
    }));
    const __VLS_401 = __VLS_400({
        modelValue: (__VLS_ctx.form.jsonResultPath),
        placeholder: "可选，例如 data.records",
    }, ...__VLS_functionalComponentArgsRest(__VLS_400));
    var __VLS_398;
    const __VLS_403 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_404 = __VLS_asFunctionalComponent(__VLS_403, new __VLS_403({
        label: "JSON 内容",
        prop: "jsonText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }));
    const __VLS_405 = __VLS_404({
        label: "JSON 内容",
        prop: "jsonText",
        ...{ class: "runtime-form-item runtime-form-item--full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_404));
    __VLS_406.slots.default;
    const __VLS_407 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
        modelValue: (__VLS_ctx.form.jsonText),
        type: "textarea",
        rows: (12),
        placeholder: '请输入 JSON 数组或对象，例如 [{"name":"华东","value":120}]',
    }));
    const __VLS_409 = __VLS_408({
        modelValue: (__VLS_ctx.form.jsonText),
        type: "textarea",
        rows: (12),
        placeholder: '请输入 JSON 数组或对象，例如 [{"name":"华东","value":120}]',
    }, ...__VLS_functionalComponentArgsRest(__VLS_408));
    var __VLS_406;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-tip" },
    });
}
var __VLS_124;
{
    const { footer: __VLS_thisSlot } = __VLS_120.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dialog-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "dialog-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dialog-actions" },
    });
    const __VLS_411 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_412 = __VLS_asFunctionalComponent(__VLS_411, new __VLS_411({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }));
    const __VLS_413 = __VLS_412({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.testing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_412));
    let __VLS_415;
    let __VLS_416;
    let __VLS_417;
    const __VLS_418 = {
        onClick: (__VLS_ctx.handleTestConnection)
    };
    __VLS_414.slots.default;
    var __VLS_414;
    const __VLS_419 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_420 = __VLS_asFunctionalComponent(__VLS_419, new __VLS_419({
        ...{ 'onClick': {} },
    }));
    const __VLS_421 = __VLS_420({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_420));
    let __VLS_423;
    let __VLS_424;
    let __VLS_425;
    const __VLS_426 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_422.slots.default;
    var __VLS_422;
    const __VLS_427 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_429 = __VLS_428({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_428));
    let __VLS_431;
    let __VLS_432;
    let __VLS_433;
    const __VLS_434 = {
        onClick: (__VLS_ctx.handleSubmit)
    };
    __VLS_430.slots.default;
    var __VLS_430;
}
var __VLS_120;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['bi-page']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['datasource-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-head']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-search']} */ ;
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
/** @type {__VLS_StyleScopedClasses['preview-table']} */ ;
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
/** @type {__VLS_StyleScopedClasses['dialog-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-actions']} */ ;
// @ts-ignore
var __VLS_126 = __VLS_125;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Delete: Delete,
            Edit: Edit,
            Plus: Plus,
            RefreshRight: RefreshRight,
            SOURCE_KIND_OPTIONS: SOURCE_KIND_OPTIONS,
            DATABASE_TYPE_OPTIONS: DATABASE_TYPE_OPTIONS,
            loading: loading,
            searchKeyword: searchKeyword,
            selectedId: selectedId,
            previewLoading: previewLoading,
            preview: preview,
            tablesLoading: tablesLoading,
            tableSearch: tableSearch,
            selectedTable: selectedTable,
            columnsLoading: columnsLoading,
            tableColumns: tableColumns,
            extractPreview: extractPreview,
            dialogVisible: dialogVisible,
            dialogMode: dialogMode,
            saving: saving,
            testing: testing,
            formRef: formRef,
            form: form,
            apiRuntimeForm: apiRuntimeForm,
            apiRuntimeTab: apiRuntimeTab,
            selectedDatasource: selectedDatasource,
            filteredDatasources: filteredDatasources,
            filteredTables: filteredTables,
            tableDraftStats: tableDraftStats,
            jsonDraftStats: jsonDraftStats,
            selectedDatasourceInfo: selectedDatasourceInfo,
            selectedConfigPreview: selectedConfigPreview,
            rules: rules,
            refreshSelectedDatasource: refreshSelectedDatasource,
            loadStaticPreview: loadStaticPreview,
            loadDatabaseTables: loadDatabaseTables,
            selectTable: selectTable,
            openCreate: openCreate,
            openEdit: openEdit,
            handleDatabaseTypeChange: handleDatabaseTypeChange,
            handlePortChange: handlePortChange,
            handleTestConnection: handleTestConnection,
            handleSubmit: handleSubmit,
            handleDelete: handleDelete,
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
