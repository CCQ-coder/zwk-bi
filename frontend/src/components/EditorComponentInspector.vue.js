import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { queryChartDataset, queryChartPageSource } from '../api/chart';
import { getDatasourceList } from '../api/datasource';
import { getDatasetList } from '../api/dataset';
import { buildChartSnapshot, buildComponentConfig, chartTypeLabel, COMPONENT_PRESETS, COLOR_THEMES, DEFAULT_COMPONENT_INTERACTION, DEFAULT_COMPONENT_STYLE, buildPresetChartConfig, getChartTypeMeta, getMissingChartFields, isDecorationChartType, isStaticWidgetChartType, normalizeComponentDataFilters, normalizeComponentConfig, suggestChartFields, } from '../utils/component-config';
const props = defineProps();
const chartTypeGroups = [
    {
        label: '图表组件',
        items: [
            { label: '柱状图', value: 'bar' },
            { label: '堆叠柱状图', value: 'bar_stack' },
            { label: '百分比柱状图', value: 'bar_percent' },
            { label: '分组柱状图', value: 'bar_group' },
            { label: '分组堆叠柱图', value: 'bar_group_stack' },
            { label: '瀑布图', value: 'bar_waterfall' },
            { label: '条形图', value: 'bar_horizontal' },
            { label: '堆叠条形图', value: 'bar_horizontal_stack' },
            { label: '百分比条形图', value: 'bar_horizontal_percent' },
            { label: '区间条形图', value: 'bar_horizontal_range' },
            { label: '对称条形图', value: 'bar_horizontal_symmetric' },
            { label: '进度条', value: 'bar_progress' },
            { label: '柱线组合图', value: 'bar_combo' },
            { label: '分组柱线图', value: 'bar_combo_group' },
            { label: '堆叠柱线图', value: 'bar_combo_stack' },
            { label: '折线图', value: 'line' },
            { label: '面积图', value: 'area' },
            { label: '堆叠折线图', value: 'line_stack' },
            { label: '饼图', value: 'pie' },
            { label: '环图', value: 'doughnut' },
            { label: '玫瑰图', value: 'rose' },
            { label: '雷达图', value: 'radar' },
            { label: '漏斗图', value: 'funnel' },
            { label: '仪表盘', value: 'gauge' },
            { label: '散点图', value: 'scatter' },
            { label: '矩形树图', value: 'treemap' },
            { label: '热力图', value: 'heatmap' },
            { label: '地图', value: 'map' },
            { label: '表格', value: 'table' },
            { label: '汇总表', value: 'table_summary' },
            { label: '透视表', value: 'table_pivot' },
            { label: '筛选按钮', value: 'filter_button' },
        ],
    },
    {
        label: '装饰组件',
        items: [
            { label: '边框装饰', value: 'decor_border_frame' },
            { label: '角标边框', value: 'decor_border_corner' },
            { label: '霓虹边框', value: 'decor_border_glow' },
            { label: '网格边框', value: 'decor_border_grid' },
        ],
    },
    {
        label: '文字组件',
        items: [
            { label: '文本组件', value: 'text_block' },
            { label: '单字段组件', value: 'single_field' },
            { label: '数字翻牌器', value: 'number_flipper' },
            { label: '排名表格', value: 'table_rank' },
            { label: '单页 iframe', value: 'iframe_single' },
            { label: '页签 iframe', value: 'iframe_tabs' },
            { label: '超级链接', value: 'hyperlink' },
            { label: '图片列表', value: 'image_list' },
            { label: '文字列表', value: 'text_list' },
            { label: '显示时间', value: 'clock_display' },
            { label: '词云图', value: 'word_cloud' },
            { label: '二维码', value: 'qr_code' },
            { label: '业务趋势', value: 'business_trend' },
            { label: '指标组件', value: 'metric_indicator' },
        ],
    },
    {
        label: '矢量图标组件',
        items: [
            { label: '趋势箭头图标', value: 'icon_arrow_trend' },
            { label: '预警图标', value: 'icon_warning_badge' },
            { label: '定位图标', value: 'icon_location_pin' },
            { label: '数据信号图标', value: 'icon_data_signal' },
            { label: '用户徽章图标', value: 'icon_user_badge' },
            { label: '图表标记图标', value: 'icon_chart_mark' },
        ],
    },
];
const PAGE_SOURCE_OPTIONS = [
    { label: '数据库', value: 'DATABASE' },
    { label: 'API 接口', value: 'API' },
    { label: '表格', value: 'TABLE' },
    { label: 'JSON 静态数据', value: 'JSON_STATIC' },
];
const emit = defineEmits();
const datasets = ref([]);
const datasources = ref([]);
const previewColumns = ref([]);
const previewRows = ref([]);
const previewRowCount = ref(0);
const previewLoading = ref(false);
const saving = ref(false);
const themeNames = Object.keys(COLOR_THEMES);
const activeTab = ref('summary');
const syncingFromProps = ref(false);
const componentPresets = COMPONENT_PRESETS;
const openSections = ref(new Set(['legend', 'label']));
const toggleSection = (name) => {
    const next = new Set(openSections.value);
    if (next.has(name))
        next.delete(name);
    else
        next.add(name);
    openSections.value = next;
};
let previewTimer = null;
const layoutForm = reactive({ posX: 0, posY: 0, width: 320, height: 220, zIndex: 0 });
const configForm = reactive({
    chart: buildChartSnapshot(null),
    style: { ...DEFAULT_COMPONENT_STYLE },
    interaction: { ...DEFAULT_COMPONENT_INTERACTION },
});
const currentChartMeta = computed(() => getChartTypeMeta(configForm.chart.chartType));
const isDecorationComponentType = computed(() => isDecorationChartType(configForm.chart.chartType));
const isStaticComponentType = computed(() => isStaticWidgetChartType(configForm.chart.chartType));
const isUseDatasetMode = computed(() => configForm.chart.sourceMode !== 'PAGE_SQL');
const missingFields = computed(() => isStaticComponentType.value ? [] : getMissingChartFields(configForm.chart));
const suggestedFields = computed(() => suggestChartFields(previewColumns.value, configForm.chart.chartType));
const pageSourceDatasources = computed(() => datasources.value.filter((item) => resolveDatasourceKind(item) === configForm.chart.pageSourceKind));
const pageSourceKindLabel = computed(() => PAGE_SOURCE_OPTIONS.find((item) => item.value === configForm.chart.pageSourceKind)?.label ?? '页面');
const pageSourceHelperText = computed(() => {
    switch (configForm.chart.pageSourceKind) {
        case 'DATABASE':
            return '数据库模式会直接执行当前组件配置中的 SQL，请确保选择的是数据库型数据源。';
        case 'API':
            return '基础接口配置来自数据源，页面级 JSON 可覆盖 headers、query、body 或 resultPath。';
        case 'TABLE':
            return '基础表格文本保存在数据源中，页面级 JSON 可覆盖 tableText、tableDelimiter、tableHasHeader。';
        case 'JSON_STATIC':
            return '基础 JSON 保存在数据源中，页面级 JSON 可覆盖 jsonText 或 jsonResultPath。';
        default:
            return '';
    }
});
const pageSourceConfigPlaceholder = computed(() => {
    switch (configForm.chart.pageSourceKind) {
        case 'API':
            return '{\n  "apiQuery": { "page": 1 },\n  "apiHeaders": { "Authorization": "Bearer xxx" },\n  "apiBody": { "keyword": "tea" },\n  "apiResultPath": "data.records"\n}';
        case 'TABLE':
            return '{\n  "tableDelimiter": "CSV",\n  "tableHasHeader": true,\n  "tableText": "region,value\\n华东,120"\n}';
        case 'JSON_STATIC':
            return '{\n  "jsonText": "[{\\"region\\":\\"华东\\",\\"value\\":120}]",\n  "jsonResultPath": "data.list"\n}';
        default:
            return '';
    }
});
const suggestionSummary = computed(() => {
    const entries = [
        suggestedFields.value.xField ? `维度 ${suggestedFields.value.xField}` : '',
        suggestedFields.value.yField ? `度量 ${suggestedFields.value.yField}` : '',
        suggestedFields.value.groupField ? `分组 ${suggestedFields.value.groupField}` : '',
    ];
    return entries.filter(Boolean);
});
const currentComponentChartId = computed(() => props.component?.chartId ?? props.chart?.id ?? null);
const schemaPreview = computed(() => {
    if (!props.component)
        return '';
    return JSON.stringify({
        id: `comp_${props.component.id}`,
        type: configForm.chart.chartType,
        position: {
            x: props.component.posX,
            y: props.component.posY,
            w: props.component.width,
            h: props.component.height,
            zIndex: props.component.zIndex,
        },
        dataConfig: {
            sourceMode: configForm.chart.sourceMode,
            sourceId: configForm.chart.sourceMode === 'PAGE_SQL' ? configForm.chart.datasourceId : configForm.chart.datasetId,
            datasetId: configForm.chart.datasetId,
            datasourceId: configForm.chart.datasourceId,
            pageSourceKind: configForm.chart.pageSourceKind,
            sqlText: configForm.chart.sqlText,
            runtimeConfigText: configForm.chart.runtimeConfigText,
            chartId: props.component.chartId,
            dimensions: configForm.chart.xField ? [configForm.chart.xField] : [],
            metrics: configForm.chart.yField ? [configForm.chart.yField] : [],
            groups: configForm.chart.groupField ? [configForm.chart.groupField] : [],
            filters: configForm.interaction.dataFilters,
            mode: 'instance-override',
        },
        styleConfig: configForm.style,
        interactionConfig: configForm.interaction,
    }, null, 2);
});
const buildCurrentConfigJson = () => buildComponentConfig(props.chart, props.component?.configJson, {
    chart: { ...configForm.chart },
    style: { ...configForm.style },
    interaction: { ...configForm.interaction },
});
const queuePreview = () => {
    if (syncingFromProps.value || !props.component || !currentComponentChartId.value)
        return;
    if (previewTimer !== null) {
        window.clearTimeout(previewTimer);
    }
    previewTimer = window.setTimeout(() => {
        previewTimer = null;
        emit('preview-component', {
            chartId: currentComponentChartId.value,
            configJson: buildCurrentConfigJson(),
        });
    }, 160);
};
const resolveDatasourceKind = (datasource) => datasource?.sourceKind || 'DATABASE';
const clearPreviewData = () => {
    previewColumns.value = [];
    previewRows.value = [];
    previewRowCount.value = 0;
};
const ensureRuntimeConfigTextValid = () => {
    if (configForm.chart.pageSourceKind === 'DATABASE')
        return;
    const text = configForm.chart.runtimeConfigText.trim();
    if (!text)
        return;
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('页面级配置必须是 JSON 对象');
        }
    }
    catch {
        throw new Error('页面级配置必须是 JSON 对象');
    }
};
const ensurePageDatasourceMatched = () => {
    const datasourceId = Number(configForm.chart.datasourceId);
    if (!Number.isFinite(datasourceId) || datasourceId <= 0) {
        throw new Error(`请选择${pageSourceKindLabel.value}数据源`);
    }
    if (!pageSourceDatasources.value.some((item) => item.id === datasourceId)) {
        throw new Error(`当前组件应选择${pageSourceKindLabel.value}类型的数据源`);
    }
    return datasourceId;
};
const syncFromProps = async () => {
    syncingFromProps.value = true;
    layoutForm.posX = props.component?.posX ?? 0;
    layoutForm.posY = props.component?.posY ?? 0;
    layoutForm.width = props.component?.width ?? 320;
    layoutForm.height = props.component?.height ?? 220;
    layoutForm.zIndex = props.component?.zIndex ?? 0;
    const normalized = normalizeComponentConfig(props.component?.configJson, props.chart);
    configForm.chart = { ...normalized.chart };
    configForm.style = { ...normalized.style };
    configForm.interaction = { ...normalized.interaction };
    if (isUseDatasetMode.value && configForm.chart.datasetId) {
        await onDatasetChange(configForm.chart.datasetId);
    }
    else if (!isUseDatasetMode.value && configForm.chart.datasourceId && (configForm.chart.pageSourceKind !== 'DATABASE' || configForm.chart.sqlText.trim())) {
        if (pageSourceDatasources.value.some((item) => item.id === Number(configForm.chart.datasourceId))) {
            await onPageSourceQuery();
        }
        else {
            clearPreviewData();
        }
    }
    else {
        clearPreviewData();
    }
    await nextTick();
    syncingFromProps.value = false;
};
watch(() => [props.component?.id, props.component?.configJson, props.chart?.id], syncFromProps, { immediate: true });
watch(() => [configForm.chart, configForm.style, configForm.interaction, currentComponentChartId.value], queuePreview, { deep: true });
watch(isDecorationComponentType, (isDecoration) => {
    if (!isDecoration)
        return;
    configForm.chart.datasetId = '';
    configForm.chart.xField = '';
    configForm.chart.yField = '';
    configForm.chart.groupField = '';
    configForm.style.bgColor = 'rgba(0,0,0,0)';
    if (activeTab.value === 'data' || activeTab.value === 'interaction') {
        activeTab.value = 'style';
    }
});
const loadMeta = async () => {
    const [datasetList, datasourceList] = await Promise.all([getDatasetList(), getDatasourceList()]);
    datasets.value = datasetList;
    datasources.value = datasourceList;
    if (props.component) {
        await syncFromProps();
    }
};
const onSourceModeSwitch = async (useDataset) => {
    configForm.chart.sourceMode = useDataset ? 'DATASET' : 'PAGE_SQL';
    if (useDataset) {
        configForm.chart.datasourceId = '';
        configForm.chart.sqlText = '';
        configForm.chart.runtimeConfigText = '';
        if (configForm.chart.datasetId) {
            await onDatasetChange(configForm.chart.datasetId);
            return;
        }
    }
    else {
        configForm.chart.datasetId = '';
        clearPreviewData();
        return;
    }
    clearPreviewData();
};
const onDatasetChange = async (datasetId) => {
    if (!isUseDatasetMode.value)
        return;
    clearPreviewData();
    if (!datasetId)
        return;
    previewLoading.value = true;
    try {
        const preview = await queryChartDataset({ datasetId: Number(datasetId) });
        previewColumns.value = preview.columns;
        previewRows.value = preview.rows;
        previewRowCount.value = preview.rowCount;
    }
    finally {
        previewLoading.value = false;
    }
};
const onPageSourceKindChange = () => {
    configForm.chart.datasourceId = '';
    configForm.chart.sqlText = '';
    configForm.chart.runtimeConfigText = '';
    clearPreviewData();
};
const onPageDatasourceChange = () => {
    clearPreviewData();
};
const onPageSourceQuery = async () => {
    if (isUseDatasetMode.value)
        return;
    let datasourceId = 0;
    try {
        datasourceId = ensurePageDatasourceMatched();
        if (configForm.chart.pageSourceKind === 'DATABASE' && !configForm.chart.sqlText.trim()) {
            ElMessage.warning('请输入页面编写 SQL');
            return;
        }
        ensureRuntimeConfigTextValid();
    }
    catch (error) {
        ElMessage.warning(error instanceof Error ? error.message : '页面来源配置不正确');
        return;
    }
    clearPreviewData();
    previewLoading.value = true;
    try {
        const preview = await queryChartPageSource({
            datasourceId,
            sqlText: configForm.chart.pageSourceKind === 'DATABASE' ? configForm.chart.sqlText : undefined,
            runtimeConfigText: configForm.chart.pageSourceKind === 'DATABASE'
                ? undefined
                : (configForm.chart.runtimeConfigText.trim() || undefined),
        });
        previewColumns.value = preview.columns;
        previewRows.value = preview.rows;
        previewRowCount.value = preview.rowCount;
    }
    finally {
        previewLoading.value = false;
    }
};
const applyLayout = (field, value) => {
    if (!props.component || value == null)
        return;
    const nextValue = Math.round(Number(value));
    layoutForm[field] = nextValue;
    emit('apply-layout', { [field]: nextValue });
};
const handlePosXChange = (value) => applyLayout('posX', value);
const handlePosYChange = (value) => applyLayout('posY', value);
const handleWidthChange = (value) => applyLayout('width', value);
const handleHeightChange = (value) => applyLayout('height', value);
const handleZIndexChange = (value) => applyLayout('zIndex', value);
const applySuggestedFields = () => {
    if (suggestedFields.value.xField && !configForm.chart.xField) {
        configForm.chart.xField = suggestedFields.value.xField;
    }
    if (suggestedFields.value.yField && !configForm.chart.yField) {
        configForm.chart.yField = suggestedFields.value.yField;
    }
    if (suggestedFields.value.groupField && !configForm.chart.groupField) {
        configForm.chart.groupField = suggestedFields.value.groupField;
    }
};
const getFilterValueOptions = (field) => {
    if (!field)
        return [];
    return Array.from(new Set(previewRows.value
        .map((row) => row[field])
        .filter((value) => value != null && String(value).trim() !== '')
        .map((value) => String(value)))).slice(0, 50);
};
const addDataFilter = () => {
    configForm.interaction.dataFilters = [
        ...normalizeComponentDataFilters(configForm.interaction.dataFilters),
        { field: '', value: '' },
    ];
};
const removeDataFilter = (index) => {
    configForm.interaction.dataFilters = configForm.interaction.dataFilters.filter((_, itemIndex) => itemIndex !== index);
};
const applyPreset = (presetId) => {
    const preset = componentPresets.find((item) => item.id === presetId);
    if (!preset)
        return;
    const nextChart = buildPresetChartConfig(preset, previewColumns.value, configForm.chart);
    configForm.chart.name = nextChart.name ?? configForm.chart.name;
    configForm.chart.chartType = nextChart.chartType ?? configForm.chart.chartType;
    configForm.chart.xField = nextChart.xField ?? '';
    configForm.chart.yField = nextChart.yField ?? '';
    configForm.chart.groupField = nextChart.groupField ?? '';
};
const saveComponentConfig = async () => {
    if (!props.component)
        return;
    if (!configForm.chart.name.trim())
        return ElMessage.warning('请输入组件名称');
    if (!isStaticComponentType.value && isUseDatasetMode.value && !configForm.chart.datasetId) {
        return ElMessage.warning('请选择数据集');
    }
    if (!isStaticComponentType.value && !isUseDatasetMode.value) {
        try {
            ensurePageDatasourceMatched();
            if (configForm.chart.pageSourceKind === 'DATABASE' && !configForm.chart.sqlText.trim()) {
                return ElMessage.warning('请输入页面编写 SQL');
            }
            ensureRuntimeConfigTextValid();
        }
        catch (error) {
            return ElMessage.warning(error instanceof Error ? error.message : '页面来源配置不正确');
        }
    }
    if (!configForm.chart.chartType)
        return ElMessage.warning('请选择图表类型');
    if (missingFields.value.length)
        return ElMessage.warning(`请补充${missingFields.value.join('、')}`);
    if (!currentComponentChartId.value)
        return ElMessage.warning('当前组件缺少图表标识，无法保存');
    saving.value = true;
    try {
        if (previewTimer !== null) {
            window.clearTimeout(previewTimer);
            previewTimer = null;
        }
        emit('save-component', {
            chartId: currentComponentChartId.value,
            configJson: buildCurrentConfigJson(),
        });
    }
    finally {
        saving.value = false;
    }
};
const copySchema = async () => {
    if (!schemaPreview.value)
        return;
    try {
        await navigator.clipboard.writeText(schemaPreview.value);
        ElMessage.success('组件 Schema 已复制');
    }
    catch {
        ElMessage.warning('复制失败，请手动复制');
    }
};
onMounted(loadMeta);
onBeforeUnmount(() => {
    if (previewTimer !== null) {
        window.clearTimeout(previewTimer);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['health-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__content']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-subtitle" },
});
if (!__VLS_ctx.component || !__VLS_ctx.chart) {
    const __VLS_0 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        description: "请选择画布中的组件开始编辑。",
        imageSize: (72),
        ...{ class: "inspector-empty" },
    }));
    const __VLS_2 = __VLS_1({
        description: "请选择画布中的组件开始编辑。",
        imageSize: (72),
        ...{ class: "inspector-empty" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    const __VLS_4 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "inspector-tabs" },
        stretch: true,
    }));
    const __VLS_6 = __VLS_5({
        modelValue: (__VLS_ctx.activeTab),
        ...{ class: "inspector-tabs" },
        stretch: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    const __VLS_8 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        label: "概览",
        name: "summary",
    }));
    const __VLS_10 = __VLS_9({
        label: "概览",
        name: "summary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-name" },
    });
    (__VLS_ctx.configForm.chart.name || __VLS_ctx.chart.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-tags" },
    });
    const __VLS_12 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: "small",
        type: "info",
    }));
    const __VLS_14 = __VLS_13({
        size: "small",
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    (__VLS_ctx.chartTypeLabel(__VLS_ctx.configForm.chart.chartType));
    var __VLS_15;
    const __VLS_16 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: "small",
        effect: "plain",
    }));
    const __VLS_18 = __VLS_17({
        size: "small",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (__VLS_ctx.scene === 'screen' ? '大屏组件' : '仪表板组件');
    var __VLS_19;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-meta" },
    });
    (__VLS_ctx.component.id);
    (__VLS_ctx.component.chartId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    const __VLS_20 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        labelPosition: "top",
        ...{ class: "chart-form summary-form" },
    }));
    const __VLS_22 = __VLS_21({
        labelPosition: "top",
        ...{ class: "chart-form summary-form" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    const __VLS_24 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        label: "组件名称",
    }));
    const __VLS_26 = __VLS_25({
        label: "组件名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    const __VLS_28 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        modelValue: (__VLS_ctx.configForm.chart.name),
        placeholder: "请输入组件名称",
    }));
    const __VLS_30 = __VLS_29({
        modelValue: (__VLS_ctx.configForm.chart.name),
        placeholder: "请输入组件名称",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    var __VLS_27;
    const __VLS_32 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        label: "图表类型",
    }));
    const __VLS_34 = __VLS_33({
        label: "图表类型",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    const __VLS_36 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        modelValue: (__VLS_ctx.configForm.chart.chartType),
        placeholder: "请选择图表类型",
        ...{ style: {} },
    }));
    const __VLS_38 = __VLS_37({
        modelValue: (__VLS_ctx.configForm.chart.chartType),
        placeholder: "请选择图表类型",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.chartTypeGroups))) {
        const __VLS_40 = {}.ElOptionGroup;
        /** @type {[typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, typeof __VLS_components.ElOptionGroup, typeof __VLS_components.elOptionGroup, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            key: (group.label),
            label: (group.label),
        }));
        const __VLS_42 = __VLS_41({
            key: (group.label),
            label: (group.label),
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_43.slots.default;
        for (const [item] of __VLS_getVForSourceType((group.items))) {
            const __VLS_44 = {}.ElOption;
            /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                key: (item.value),
                label: (item.label),
                value: (item.value),
            }));
            const __VLS_46 = __VLS_45({
                key: (item.value),
                label: (item.label),
                value: (item.value),
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        }
        var __VLS_43;
    }
    var __VLS_39;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "helper-text" },
    });
    (__VLS_ctx.currentChartMeta.description);
    var __VLS_35;
    var __VLS_23;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "preset-grid" },
    });
    for (const [preset] of __VLS_getVForSourceType((__VLS_ctx.componentPresets))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    __VLS_ctx.applyPreset(preset.id);
                } },
            key: (preset.id),
            type: "button",
            ...{ class: "preset-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (preset.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (preset.description);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-card" },
        ...{ class: ({ 'health-card--warning': __VLS_ctx.missingFields.length }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.currentChartMeta.label);
    const __VLS_48 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }));
    const __VLS_50 = __VLS_49({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    (__VLS_ctx.missingFields.length ? '待补充' : '可预览');
    var __VLS_51;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "health-text" },
    });
    (__VLS_ctx.currentChartMeta.description);
    if (__VLS_ctx.missingFields.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "health-list" },
        });
        (__VLS_ctx.missingFields.join('、'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "health-list" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "layout-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_52 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_54 = __VLS_53({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    let __VLS_56;
    let __VLS_57;
    let __VLS_58;
    const __VLS_59 = {
        onChange: (__VLS_ctx.handlePosXChange)
    };
    var __VLS_55;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_60 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_62 = __VLS_61({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    let __VLS_64;
    let __VLS_65;
    let __VLS_66;
    const __VLS_67 = {
        onChange: (__VLS_ctx.handlePosYChange)
    };
    var __VLS_63;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_68 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (160),
        controlsPosition: "right",
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (160),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_72;
    let __VLS_73;
    let __VLS_74;
    const __VLS_75 = {
        onChange: (__VLS_ctx.handleWidthChange)
    };
    var __VLS_71;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_76 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (120),
        controlsPosition: "right",
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (120),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_80;
    let __VLS_81;
    let __VLS_82;
    const __VLS_83 = {
        onChange: (__VLS_ctx.handleHeightChange)
    };
    var __VLS_79;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item field-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_84 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_88;
    let __VLS_89;
    let __VLS_90;
    const __VLS_91 = {
        onChange: (__VLS_ctx.handleZIndexChange)
    };
    var __VLS_87;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_92 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('bring-front');
        }
    };
    __VLS_95.slots.default;
    var __VLS_95;
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('remove');
        }
    };
    __VLS_103.slots.default;
    var __VLS_103;
    var __VLS_11;
    if (!__VLS_ctx.isDecorationComponentType) {
        const __VLS_108 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            label: "数据",
            name: "data",
        }));
        const __VLS_110 = __VLS_109({
            label: "数据",
            name: "data",
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        __VLS_111.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "inspector-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        const __VLS_112 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            labelPosition: "top",
            ...{ class: "chart-form" },
        }));
        const __VLS_114 = __VLS_113({
            labelPosition: "top",
            ...{ class: "chart-form" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        __VLS_115.slots.default;
        const __VLS_116 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            label: "数据来源模式",
        }));
        const __VLS_118 = __VLS_117({
            label: "数据来源模式",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_119.slots.default;
        const __VLS_120 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.isUseDatasetMode),
            activeText: "采用数据集",
            inactiveText: "页面编写",
        }));
        const __VLS_122 = __VLS_121({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.isUseDatasetMode),
            activeText: "采用数据集",
            inactiveText: "页面编写",
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        let __VLS_124;
        let __VLS_125;
        let __VLS_126;
        const __VLS_127 = {
            onChange: (__VLS_ctx.onSourceModeSwitch)
        };
        var __VLS_123;
        var __VLS_119;
        if (__VLS_ctx.isUseDatasetMode) {
            const __VLS_128 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
                label: "数据集",
            }));
            const __VLS_130 = __VLS_129({
                label: "数据集",
            }, ...__VLS_functionalComponentArgsRest(__VLS_129));
            __VLS_131.slots.default;
            const __VLS_132 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasetId),
                placeholder: "请选择数据集",
                ...{ style: {} },
                filterable: true,
                clearable: (__VLS_ctx.isStaticComponentType),
            }));
            const __VLS_134 = __VLS_133({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasetId),
                placeholder: "请选择数据集",
                ...{ style: {} },
                filterable: true,
                clearable: (__VLS_ctx.isStaticComponentType),
            }, ...__VLS_functionalComponentArgsRest(__VLS_133));
            let __VLS_136;
            let __VLS_137;
            let __VLS_138;
            const __VLS_139 = {
                onChange: (__VLS_ctx.onDatasetChange)
            };
            __VLS_135.slots.default;
            for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
                const __VLS_140 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
                    key: (dataset.id),
                    label: (dataset.name),
                    value: (dataset.id),
                }));
                const __VLS_142 = __VLS_141({
                    key: (dataset.id),
                    label: (dataset.name),
                    value: (dataset.id),
                }, ...__VLS_functionalComponentArgsRest(__VLS_141));
            }
            var __VLS_135;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
            (__VLS_ctx.isStaticComponentType ? '静态组件可不绑定数据集；需要数据驱动时再选择数据集即可。' : '数据集模式仅使用已配置好的数据库型数据源与 SQL。');
            var __VLS_131;
        }
        else {
            const __VLS_144 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
                label: "页面来源类型",
            }));
            const __VLS_146 = __VLS_145({
                label: "页面来源类型",
            }, ...__VLS_functionalComponentArgsRest(__VLS_145));
            __VLS_147.slots.default;
            const __VLS_148 = {}.ElRadioGroup;
            /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
            // @ts-ignore
            const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.pageSourceKind),
                ...{ class: "page-source-group" },
            }));
            const __VLS_150 = __VLS_149({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.pageSourceKind),
                ...{ class: "page-source-group" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_149));
            let __VLS_152;
            let __VLS_153;
            let __VLS_154;
            const __VLS_155 = {
                onChange: (__VLS_ctx.onPageSourceKindChange)
            };
            __VLS_151.slots.default;
            for (const [item] of __VLS_getVForSourceType((__VLS_ctx.PAGE_SOURCE_OPTIONS))) {
                const __VLS_156 = {}.ElRadioButton;
                /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
                // @ts-ignore
                const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
                    key: (item.value),
                    value: (item.value),
                }));
                const __VLS_158 = __VLS_157({
                    key: (item.value),
                    value: (item.value),
                }, ...__VLS_functionalComponentArgsRest(__VLS_157));
                __VLS_159.slots.default;
                (item.label);
                var __VLS_159;
            }
            var __VLS_151;
            var __VLS_147;
            const __VLS_160 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
                label: (`${__VLS_ctx.pageSourceKindLabel}数据源`),
            }));
            const __VLS_162 = __VLS_161({
                label: (`${__VLS_ctx.pageSourceKindLabel}数据源`),
            }, ...__VLS_functionalComponentArgsRest(__VLS_161));
            __VLS_163.slots.default;
            const __VLS_164 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasourceId),
                placeholder: "请选择数据源",
                ...{ style: {} },
                filterable: true,
                clearable: true,
            }));
            const __VLS_166 = __VLS_165({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasourceId),
                placeholder: "请选择数据源",
                ...{ style: {} },
                filterable: true,
                clearable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_165));
            let __VLS_168;
            let __VLS_169;
            let __VLS_170;
            const __VLS_171 = {
                onChange: (__VLS_ctx.onPageDatasourceChange)
            };
            __VLS_167.slots.default;
            for (const [source] of __VLS_getVForSourceType((__VLS_ctx.pageSourceDatasources))) {
                const __VLS_172 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
                    key: (source.id),
                    label: (source.name),
                    value: (source.id),
                }));
                const __VLS_174 = __VLS_173({
                    key: (source.id),
                    label: (source.name),
                    value: (source.id),
                }, ...__VLS_functionalComponentArgsRest(__VLS_173));
            }
            var __VLS_167;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
            (__VLS_ctx.pageSourceHelperText);
            var __VLS_163;
            if (__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE') {
                const __VLS_176 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
                    label: "页面编写 SQL",
                }));
                const __VLS_178 = __VLS_177({
                    label: "页面编写 SQL",
                }, ...__VLS_functionalComponentArgsRest(__VLS_177));
                __VLS_179.slots.default;
                const __VLS_180 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
                    modelValue: (__VLS_ctx.configForm.chart.sqlText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "请输入查询 SQL（仅支持查询语句）",
                }));
                const __VLS_182 = __VLS_181({
                    modelValue: (__VLS_ctx.configForm.chart.sqlText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "请输入查询 SQL（仅支持查询语句）",
                }, ...__VLS_functionalComponentArgsRest(__VLS_181));
                var __VLS_179;
            }
            else {
                const __VLS_184 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
                    label: "页面级配置 JSON",
                }));
                const __VLS_186 = __VLS_185({
                    label: "页面级配置 JSON",
                }, ...__VLS_functionalComponentArgsRest(__VLS_185));
                __VLS_187.slots.default;
                const __VLS_188 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
                    modelValue: (__VLS_ctx.configForm.chart.runtimeConfigText),
                    type: "textarea",
                    rows: (6),
                    placeholder: (__VLS_ctx.pageSourceConfigPlaceholder),
                }));
                const __VLS_190 = __VLS_189({
                    modelValue: (__VLS_ctx.configForm.chart.runtimeConfigText),
                    type: "textarea",
                    rows: (6),
                    placeholder: (__VLS_ctx.pageSourceConfigPlaceholder),
                }, ...__VLS_functionalComponentArgsRest(__VLS_189));
                var __VLS_187;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "action-row" },
            });
            const __VLS_192 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                loading: (__VLS_ctx.previewLoading),
            }));
            const __VLS_194 = __VLS_193({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                loading: (__VLS_ctx.previewLoading),
            }, ...__VLS_functionalComponentArgsRest(__VLS_193));
            let __VLS_196;
            let __VLS_197;
            let __VLS_198;
            const __VLS_199 = {
                onClick: (__VLS_ctx.onPageSourceQuery)
            };
            __VLS_195.slots.default;
            var __VLS_195;
        }
        if (__VLS_ctx.suggestionSummary.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_200 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }));
            const __VLS_202 = __VLS_201({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            let __VLS_204;
            let __VLS_205;
            let __VLS_206;
            const __VLS_207 = {
                onClick: (__VLS_ctx.applySuggestedFields)
            };
            __VLS_203.slots.default;
            var __VLS_203;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-body" },
            });
            (__VLS_ctx.suggestionSummary.join(' · '));
        }
        if (__VLS_ctx.currentChartMeta.requiresDimension || __VLS_ctx.currentChartMeta.allowsOptionalDimension) {
            const __VLS_208 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
                label: (__VLS_ctx.currentChartMeta.requiresDimension ? '维度字段' : '维度字段（可选）'),
            }));
            const __VLS_210 = __VLS_209({
                label: (__VLS_ctx.currentChartMeta.requiresDimension ? '维度字段' : '维度字段（可选）'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_209));
            __VLS_211.slots.default;
            const __VLS_212 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
                modelValue: (__VLS_ctx.configForm.chart.xField),
                placeholder: "选择维度字段",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_214 = __VLS_213({
                modelValue: (__VLS_ctx.configForm.chart.xField),
                placeholder: "选择维度字段",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_213));
            __VLS_215.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_216 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_218 = __VLS_217({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_217));
            }
            var __VLS_215;
            var __VLS_211;
        }
        if (__VLS_ctx.currentChartMeta.requiresMetric) {
            const __VLS_220 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
                label: "度量字段",
            }));
            const __VLS_222 = __VLS_221({
                label: "度量字段",
            }, ...__VLS_functionalComponentArgsRest(__VLS_221));
            __VLS_223.slots.default;
            const __VLS_224 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
                modelValue: (__VLS_ctx.configForm.chart.yField),
                placeholder: "选择度量字段",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_226 = __VLS_225({
                modelValue: (__VLS_ctx.configForm.chart.yField),
                placeholder: "选择度量字段",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_225));
            __VLS_227.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_228 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_230 = __VLS_229({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_229));
            }
            var __VLS_227;
            var __VLS_223;
        }
        if (__VLS_ctx.currentChartMeta.allowsGroup) {
            const __VLS_232 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
                label: "分组字段",
            }));
            const __VLS_234 = __VLS_233({
                label: "分组字段",
            }, ...__VLS_functionalComponentArgsRest(__VLS_233));
            __VLS_235.slots.default;
            const __VLS_236 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
                modelValue: (__VLS_ctx.configForm.chart.groupField),
                placeholder: "可选",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_238 = __VLS_237({
                modelValue: (__VLS_ctx.configForm.chart.groupField),
                placeholder: "可选",
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_237));
            __VLS_239.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_240 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_242 = __VLS_241({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_241));
            }
            var __VLS_239;
            var __VLS_235;
        }
        var __VLS_115;
        if (__VLS_ctx.previewColumns.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "preview-meta" },
            });
            (__VLS_ctx.previewColumns.length);
            (__VLS_ctx.previewRows.length);
            (__VLS_ctx.previewRowCount);
            const __VLS_244 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
                data: (__VLS_ctx.previewRows.slice(0, 5)),
                size: "small",
                maxHeight: "240",
                border: true,
            }));
            const __VLS_246 = __VLS_245({
                data: (__VLS_ctx.previewRows.slice(0, 5)),
                size: "small",
                maxHeight: "240",
                border: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_245));
            __VLS_247.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_248 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                }));
                const __VLS_250 = __VLS_249({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_249));
            }
            var __VLS_247;
        }
        var __VLS_111;
    }
    const __VLS_252 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        label: "样式",
        name: "style",
    }));
    const __VLS_254 = __VLS_253({
        label: "样式",
        name: "style",
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_255.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-sections" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_256 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }));
    const __VLS_258 = __VLS_257({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    __VLS_259.slots.default;
    for (const [name] of __VLS_getVForSourceType((__VLS_ctx.themeNames))) {
        const __VLS_260 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
            key: (name),
            label: (name),
            value: (name),
        }));
        const __VLS_262 = __VLS_261({
            key: (name),
            label: (name),
            value: (name),
        }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    }
    var __VLS_259;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    if (!__VLS_ctx.isDecorationComponentType) {
        const __VLS_264 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
            modelValue: (__VLS_ctx.configForm.style.bgColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_266 = __VLS_265({
            modelValue: (__VLS_ctx.configForm.style.bgColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "helper-text" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('title');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('title') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_268 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showTitle),
        size: "small",
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showTitle),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: () => { }
    };
    var __VLS_271;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('title') && __VLS_ctx.configForm.style.showTitle) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_276 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        modelValue: (__VLS_ctx.configForm.style.titleText),
        size: "small",
        placeholder: "默认用组件名",
    }));
    const __VLS_278 = __VLS_277({
        modelValue: (__VLS_ctx.configForm.style.titleText),
        size: "small",
        placeholder: "默认用组件名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_280 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        modelValue: (__VLS_ctx.configForm.style.titleFontSize),
        min: (10),
        max: (32),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_282 = __VLS_281({
        modelValue: (__VLS_ctx.configForm.style.titleFontSize),
        min: (10),
        max: (32),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_284 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        modelValue: (__VLS_ctx.configForm.style.titleColor),
        size: "small",
    }));
    const __VLS_286 = __VLS_285({
        modelValue: (__VLS_ctx.configForm.style.titleColor),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    if (__VLS_ctx.currentChartMeta.supportsLegend) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsLegend))
                        return;
                    __VLS_ctx.toggleSection('legend');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('legend') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_288 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }));
        const __VLS_290 = __VLS_289({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_289));
        let __VLS_292;
        let __VLS_293;
        let __VLS_294;
        const __VLS_295 = {
            onClick: () => { }
        };
        var __VLS_291;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('legend') && __VLS_ctx.configForm.style.showLegend) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_296 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_298 = __VLS_297({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_297));
        __VLS_299.slots.default;
        const __VLS_300 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
            label: "底部",
            value: "bottom",
        }));
        const __VLS_302 = __VLS_301({
            label: "底部",
            value: "bottom",
        }, ...__VLS_functionalComponentArgsRest(__VLS_301));
        const __VLS_304 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
            label: "顶部",
            value: "top",
        }));
        const __VLS_306 = __VLS_305({
            label: "顶部",
            value: "top",
        }, ...__VLS_functionalComponentArgsRest(__VLS_305));
        const __VLS_308 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
            label: "右侧",
            value: "right",
        }));
        const __VLS_310 = __VLS_309({
            label: "右侧",
            value: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_309));
        var __VLS_299;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('border');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('border') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_312 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }));
    const __VLS_314 = __VLS_313({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    let __VLS_316;
    let __VLS_317;
    let __VLS_318;
    const __VLS_319 = {
        onClick: () => { }
    };
    var __VLS_315;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('border') && __VLS_ctx.configForm.style.borderShow) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_320 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_322 = __VLS_321({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_324 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_326 = __VLS_325({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_325));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_328 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_330 = __VLS_329({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('label');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('label') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_332 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showLabel),
        size: "small",
    }));
    const __VLS_334 = __VLS_333({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.showLabel),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_333));
    let __VLS_336;
    let __VLS_337;
    let __VLS_338;
    const __VLS_339 = {
        onClick: () => { }
    };
    var __VLS_335;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('label') && __VLS_ctx.configForm.style.showLabel) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_340 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        modelValue: (__VLS_ctx.configForm.style.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_342 = __VLS_341({
        modelValue: (__VLS_ctx.configForm.style.labelSize),
        min: (8),
        max: (24),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    const __VLS_344 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        modelValue: (__VLS_ctx.configForm.style.showTooltip),
        size: "small",
    }));
    const __VLS_346 = __VLS_345({
        modelValue: (__VLS_ctx.configForm.style.showTooltip),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    if (__VLS_ctx.currentChartMeta.supportsAxisNames) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsAxisNames))
                        return;
                    __VLS_ctx.toggleSection('xaxis');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('xaxis') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_348 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }));
        const __VLS_350 = __VLS_349({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_349));
        let __VLS_352;
        let __VLS_353;
        let __VLS_354;
        const __VLS_355 = {
            onClick: () => { }
        };
        var __VLS_351;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('xaxis')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_356 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }));
        const __VLS_358 = __VLS_357({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    }
    if (__VLS_ctx.currentChartMeta.supportsAxisNames) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        const __VLS_360 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }));
        const __VLS_362 = __VLS_361({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    }
    if (__VLS_ctx.currentChartMeta.supportsSmooth || __VLS_ctx.currentChartMeta.supportsAreaFill || __VLS_ctx.currentChartMeta.supportsBarStyle) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.currentChartMeta.supportsSmooth || __VLS_ctx.currentChartMeta.supportsAreaFill || __VLS_ctx.currentChartMeta.supportsBarStyle))
                        return;
                    __VLS_ctx.toggleSection('adv');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('adv') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('adv')) }, null, null);
        if (__VLS_ctx.currentChartMeta.supportsSmooth) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_364 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }));
            const __VLS_366 = __VLS_365({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_365));
        }
        if (__VLS_ctx.currentChartMeta.supportsAreaFill) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_368 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }));
            const __VLS_370 = __VLS_369({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_369));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_372 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_374 = __VLS_373({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_373));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_376 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_378 = __VLS_377({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_377));
        }
    }
    if (__VLS_ctx.configForm.chart.chartType === 'table') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-header');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-header') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-header')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_380 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_382 = __VLS_381({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_384 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }));
        const __VLS_386 = __VLS_385({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_385));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_388 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_390 = __VLS_389({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_389));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-rows');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-rows') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-rows')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_392 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }));
        const __VLS_394 = __VLS_393({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_393));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_396 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_398 = __VLS_397({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_397));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_400 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_402 = __VLS_401({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_401));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_404 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_406 = __VLS_405({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_405));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_408 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_410 = __VLS_409({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_409));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_412 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }));
        const __VLS_414 = __VLS_413({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_413));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_416 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_418 = __VLS_417({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_417));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-border');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-border') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-border')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_420 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_422 = __VLS_421({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_424 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_426 = __VLS_425({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_425));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.configForm.chart.chartType === 'table'))
                        return;
                    __VLS_ctx.toggleSection('table-func');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('table-func') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('table-func')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_428 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }));
        const __VLS_430 = __VLS_429({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_429));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_432 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }));
        const __VLS_434 = __VLS_433({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_433));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                    return;
                __VLS_ctx.toggleSection('comp-adv');
            } },
        ...{ class: "ss-hd" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-chevron" },
        ...{ class: ({ open: __VLS_ctx.openSections.has('comp-adv') }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-hd-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('comp-adv')) }, null, null);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_436 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_438 = __VLS_437({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_437));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_440 = {}.ElSlider;
    /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
    // @ts-ignore
    const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }));
    const __VLS_442 = __VLS_441({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_441));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_444 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }));
    const __VLS_446 = __VLS_445({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_445));
    if (__VLS_ctx.configForm.style.shadowShow) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_448 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_450 = __VLS_449({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_449));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_452 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_454 = __VLS_453({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_453));
    }
    var __VLS_255;
    if (!__VLS_ctx.isDecorationComponentType) {
        const __VLS_456 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
            label: "交互",
            name: "interaction",
        }));
        const __VLS_458 = __VLS_457({
            label: "交互",
            name: "interaction",
        }, ...__VLS_functionalComponentArgsRest(__VLS_457));
        __VLS_459.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "inspector-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "layout-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_460 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
            modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
        }));
        const __VLS_462 = __VLS_461({
            modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
        }, ...__VLS_functionalComponentArgsRest(__VLS_461));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_464 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
            modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
        }));
        const __VLS_466 = __VLS_465({
            modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
        }, ...__VLS_functionalComponentArgsRest(__VLS_465));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_468 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_469 = __VLS_asFunctionalComponent(__VLS_468, new __VLS_468({
            modelValue: (__VLS_ctx.configForm.interaction.clickAction),
            ...{ style: {} },
        }));
        const __VLS_470 = __VLS_469({
            modelValue: (__VLS_ctx.configForm.interaction.clickAction),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_469));
        __VLS_471.slots.default;
        const __VLS_472 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({
            label: "不处理",
            value: "none",
        }));
        const __VLS_474 = __VLS_473({
            label: "不处理",
            value: "none",
        }, ...__VLS_functionalComponentArgsRest(__VLS_473));
        const __VLS_476 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({
            label: "联动筛选",
            value: "filter",
        }));
        const __VLS_478 = __VLS_477({
            label: "联动筛选",
            value: "filter",
        }, ...__VLS_functionalComponentArgsRest(__VLS_477));
        var __VLS_471;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_480 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
            modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
            ...{ style: {} },
        }));
        const __VLS_482 = __VLS_481({
            modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_481));
        __VLS_483.slots.default;
        const __VLS_484 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
            label: "自动识别",
            value: "auto",
        }));
        const __VLS_486 = __VLS_485({
            label: "自动识别",
            value: "auto",
        }, ...__VLS_functionalComponentArgsRest(__VLS_485));
        const __VLS_488 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({
            label: "维度字段",
            value: "dimension",
        }));
        const __VLS_490 = __VLS_489({
            label: "维度字段",
            value: "dimension",
        }, ...__VLS_functionalComponentArgsRest(__VLS_489));
        const __VLS_492 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({
            label: "分组字段",
            value: "group",
        }));
        const __VLS_494 = __VLS_493({
            label: "分组字段",
            value: "group",
        }, ...__VLS_functionalComponentArgsRest(__VLS_493));
        const __VLS_496 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({
            label: "自定义字段",
            value: "custom",
        }));
        const __VLS_498 = __VLS_497({
            label: "自定义字段",
            value: "custom",
        }, ...__VLS_functionalComponentArgsRest(__VLS_497));
        var __VLS_483;
        if (__VLS_ctx.configForm.interaction.linkageFieldMode === 'custom') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field-item field-item--full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_500 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
                modelValue: (__VLS_ctx.configForm.interaction.linkageField),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_502 = __VLS_501({
                modelValue: (__VLS_ctx.configForm.interaction.linkageField),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_501));
            __VLS_503.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_504 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_505 = __VLS_asFunctionalComponent(__VLS_504, new __VLS_504({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_506 = __VLS_505({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_505));
            }
            var __VLS_503;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-editor" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-editor-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_508 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }));
        const __VLS_510 = __VLS_509({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_509));
        let __VLS_512;
        let __VLS_513;
        let __VLS_514;
        const __VLS_515 = {
            onClick: (__VLS_ctx.addDataFilter)
        };
        __VLS_511.slots.default;
        var __VLS_511;
        if (__VLS_ctx.configForm.interaction.dataFilters.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-editor-list" },
            });
            for (const [filter, index] of __VLS_getVForSourceType((__VLS_ctx.configForm.interaction.dataFilters))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`filter-${index}`),
                    ...{ class: "filter-editor-row" },
                });
                const __VLS_516 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
                    modelValue: (filter.field),
                    placeholder: "字段",
                    filterable: true,
                    clearable: true,
                }));
                const __VLS_518 = __VLS_517({
                    modelValue: (filter.field),
                    placeholder: "字段",
                    filterable: true,
                    clearable: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_517));
                __VLS_519.slots.default;
                for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                    const __VLS_520 = {}.ElOption;
                    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                    // @ts-ignore
                    const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
                        key: (column),
                        label: (column),
                        value: (column),
                    }));
                    const __VLS_522 = __VLS_521({
                        key: (column),
                        label: (column),
                        value: (column),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_521));
                }
                var __VLS_519;
                if (__VLS_ctx.getFilterValueOptions(filter.field).length) {
                    const __VLS_524 = {}.ElSelect;
                    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                    // @ts-ignore
                    const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
                        modelValue: (filter.value),
                        placeholder: "值",
                        filterable: true,
                        clearable: true,
                    }));
                    const __VLS_526 = __VLS_525({
                        modelValue: (filter.value),
                        placeholder: "值",
                        filterable: true,
                        clearable: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_525));
                    __VLS_527.slots.default;
                    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.getFilterValueOptions(filter.field)))) {
                        const __VLS_528 = {}.ElOption;
                        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                        // @ts-ignore
                        const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
                            key: (`${filter.field}-${option}`),
                            label: (option),
                            value: (option),
                        }));
                        const __VLS_530 = __VLS_529({
                            key: (`${filter.field}-${option}`),
                            label: (option),
                            value: (option),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_529));
                    }
                    var __VLS_527;
                }
                else {
                    const __VLS_532 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({
                        modelValue: (filter.value),
                        placeholder: "输入筛选值",
                    }));
                    const __VLS_534 = __VLS_533({
                        modelValue: (filter.value),
                        placeholder: "输入筛选值",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_533));
                }
                const __VLS_536 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }));
                const __VLS_538 = __VLS_537({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_537));
                let __VLS_540;
                let __VLS_541;
                let __VLS_542;
                const __VLS_543 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(!__VLS_ctx.isDecorationComponentType))
                            return;
                        if (!(__VLS_ctx.configForm.interaction.dataFilters.length))
                            return;
                        __VLS_ctx.removeDataFilter(index);
                    }
                };
                __VLS_539.slots.default;
                var __VLS_539;
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
        }
        var __VLS_459;
    }
    const __VLS_544 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_545 = __VLS_asFunctionalComponent(__VLS_544, new __VLS_544({
        label: "Schema",
        name: "schema",
    }));
    const __VLS_546 = __VLS_545({
        label: "Schema",
        name: "schema",
    }, ...__VLS_functionalComponentArgsRest(__VLS_545));
    __VLS_547.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "schema-block" },
    });
    (__VLS_ctx.schemaPreview);
    var __VLS_547;
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inspector-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hint-text" },
    });
    (__VLS_ctx.previewLoading ? '正在刷新字段列表...' : '属性修改会先在画布中实时预览，点击保存后才会持久化。');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_548 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_549 = __VLS_asFunctionalComponent(__VLS_548, new __VLS_548({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_550 = __VLS_549({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_549));
    let __VLS_552;
    let __VLS_553;
    let __VLS_554;
    const __VLS_555 = {
        onClick: (__VLS_ctx.copySchema)
    };
    __VLS_551.slots.default;
    var __VLS_551;
    const __VLS_556 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_557 = __VLS_asFunctionalComponent(__VLS_556, new __VLS_556({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_558 = __VLS_557({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_557));
    let __VLS_560;
    let __VLS_561;
    let __VLS_562;
    const __VLS_563 = {
        onClick: (__VLS_ctx.saveComponentConfig)
    };
    __VLS_559.slots.default;
    var __VLS_559;
}
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-head']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-title']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-name']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-form']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['health-card']} */ ;
/** @type {__VLS_StyleScopedClasses['health-head']} */ ;
/** @type {__VLS_StyleScopedClasses['health-text']} */ ;
/** @type {__VLS_StyleScopedClasses['health-list']} */ ;
/** @type {__VLS_StyleScopedClasses['health-list']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-card']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-body']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['style-sections']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-block']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-list']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['schema-block']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hint-text']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartTypeLabel: chartTypeLabel,
            chartTypeGroups: chartTypeGroups,
            PAGE_SOURCE_OPTIONS: PAGE_SOURCE_OPTIONS,
            datasets: datasets,
            previewColumns: previewColumns,
            previewRows: previewRows,
            previewRowCount: previewRowCount,
            previewLoading: previewLoading,
            saving: saving,
            themeNames: themeNames,
            activeTab: activeTab,
            componentPresets: componentPresets,
            openSections: openSections,
            toggleSection: toggleSection,
            layoutForm: layoutForm,
            configForm: configForm,
            currentChartMeta: currentChartMeta,
            isDecorationComponentType: isDecorationComponentType,
            isStaticComponentType: isStaticComponentType,
            isUseDatasetMode: isUseDatasetMode,
            missingFields: missingFields,
            pageSourceDatasources: pageSourceDatasources,
            pageSourceKindLabel: pageSourceKindLabel,
            pageSourceHelperText: pageSourceHelperText,
            pageSourceConfigPlaceholder: pageSourceConfigPlaceholder,
            suggestionSummary: suggestionSummary,
            schemaPreview: schemaPreview,
            onSourceModeSwitch: onSourceModeSwitch,
            onDatasetChange: onDatasetChange,
            onPageSourceKindChange: onPageSourceKindChange,
            onPageDatasourceChange: onPageDatasourceChange,
            onPageSourceQuery: onPageSourceQuery,
            handlePosXChange: handlePosXChange,
            handlePosYChange: handlePosYChange,
            handleWidthChange: handleWidthChange,
            handleHeightChange: handleHeightChange,
            handleZIndexChange: handleZIndexChange,
            applySuggestedFields: applySuggestedFields,
            getFilterValueOptions: getFilterValueOptions,
            addDataFilter: addDataFilter,
            removeDataFilter: removeDataFilter,
            applyPreset: applyPreset,
            saveComponentConfig: saveComponentConfig,
            copySchema: copySchema,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
