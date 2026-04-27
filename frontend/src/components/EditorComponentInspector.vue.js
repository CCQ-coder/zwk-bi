import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { queryChartDataset, queryChartPageSource } from '../api/chart';
import { getDatasourceList } from '../api/datasource';
import { getDatasetList } from '../api/dataset';
import { buildChartSnapshot, buildComponentConfig, chartTypeLabel, COMPONENT_PRESETS, COLOR_THEMES, DEFAULT_COMPONENT_INTERACTION, DEFAULT_COMPONENT_STYLE, buildPresetChartConfig, getChartFieldLabels, getChartTypeMeta, getMissingChartFields, isBarFamilyChartType, isDecorationChartType, isStaticWidgetChartType, normalizeComponentDataFilters, normalizeComponentConfig, resolveConfiguredTableColumns, suggestChartFields, TABLE_LIKE_CHART_TYPES, } from '../utils/component-config';
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
            { label: '边框1', value: 'decor_border_frame' },
            { label: '边框2', value: 'decor_border_corner' },
            { label: '边框3', value: 'decor_border_glow' },
            { label: '边框4', value: 'decor_border_grid' },
            { label: '边框5', value: 'decor_border_stream' },
            { label: '边框6', value: 'decor_border_pulse' },
            { label: '边框7', value: 'decor_border_bracket' },
            { label: '边框8', value: 'decor_border_circuit' },
            { label: '边框9', value: 'decor_border_panel' },
            { label: '标题牌', value: 'decor_title_plate' },
            { label: '发光分隔条', value: 'decor_divider_glow' },
            { label: '目标环', value: 'decor_target_ring' },
            { label: '扫描面板', value: 'decor_scan_panel' },
            { label: '六边形徽记', value: 'decor_hex_badge' },
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
        label: '小装饰',
        items: [
            { label: '趋势箭头图标', value: 'icon_arrow_trend' },
            { label: '预警图标', value: 'icon_warning_badge' },
            { label: '定位图标', value: 'icon_location_pin' },
            { label: '数据信号图标', value: 'icon_data_signal' },
            { label: '用户徽章图标', value: 'icon_user_badge' },
            { label: '图表标记图标', value: 'icon_chart_mark' },
            { label: '加号', value: 'icon_plus' },
            { label: '减号', value: 'icon_minus' },
            { label: '搜索', value: 'icon_search' },
            { label: '聚焦框', value: 'icon_focus_frame' },
            { label: '主页', value: 'icon_home_badge' },
            { label: '分享', value: 'icon_share_nodes' },
            { label: '链接', value: 'icon_link_chain' },
            { label: '消息', value: 'icon_message_chat' },
            { label: '可视', value: 'icon_eye_watch' },
            { label: '锁定', value: 'icon_lock_safe' },
            { label: '铃铛', value: 'icon_bell_notice' },
            { label: '用户', value: 'icon_user_profile' },
            { label: '勾选', value: 'icon_check_mark' },
            { label: '提醒', value: 'icon_alert_mark' },
            { label: '关闭', value: 'icon_close_mark' },
            { label: '设置', value: 'icon_settings_gear' },
            { label: '双箭头', value: 'icon_chevron_double' },
            { label: '轨道环', value: 'icon_orbit_ring' },
            { label: '星芒标', value: 'icon_compass_star' },
            { label: '数据仓', value: 'icon_database_stack' },
            { label: '安全盾牌', value: 'icon_shield_guard' },
            { label: '闪电', value: 'icon_lightning_bolt' },
            { label: '地球网格', value: 'icon_globe_grid' },
            { label: '雷达脉冲', value: 'icon_radar_pulse' },
            { label: '立方线框', value: 'icon_cube_wire' },
            { label: '波纹带', value: 'icon_wave_ribbon' },
        ],
    },
];
const METRIC_WIDGET_TYPES = new Set(['single_field', 'number_flipper', 'metric_indicator', 'business_trend']);
const CONTENT_WIDGET_TYPES = new Set(['text_block', 'hyperlink', 'iframe_single', 'iframe_tabs', 'image_list', 'text_list', 'clock_display', 'word_cloud', 'qr_code']);
const PURE_STATIC_NO_DATA_TYPES = new Set(['hyperlink', 'clock_display', 'qr_code']);
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
const tableFieldDrag = ref(null);
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
const createEmptyTableRuntimeForm = () => ({
    delimiter: '',
    hasHeader: '',
    text: '',
});
const createEmptyJsonRuntimeForm = () => ({
    resultPath: '',
    text: '',
});
const layoutForm = reactive({ posX: 0, posY: 0, width: 320, height: 220, zIndex: 0 });
const configForm = reactive({
    chart: buildChartSnapshot(null),
    style: { ...DEFAULT_COMPONENT_STYLE },
    interaction: { ...DEFAULT_COMPONENT_INTERACTION },
});
const apiRuntimeForm = reactive(createEmptyApiRuntimeForm());
const tableRuntimeForm = reactive(createEmptyTableRuntimeForm());
const jsonRuntimeForm = reactive(createEmptyJsonRuntimeForm());
const apiRuntimeTab = ref('headers');
const currentChartType = computed(() => configForm.chart.chartType || '');
const currentChartMeta = computed(() => getChartTypeMeta(configForm.chart.chartType));
const isDecorationComponentType = computed(() => isDecorationChartType(configForm.chart.chartType));
const isStaticComponentType = computed(() => isStaticWidgetChartType(configForm.chart.chartType));
const isVectorIconComponentType = computed(() => currentChartType.value.startsWith('icon_'));
const isTableComponentType = computed(() => TABLE_LIKE_CHART_TYPES.has(currentChartType.value));
const isFilterComponentType = computed(() => currentChartType.value === 'filter_button');
const isMetricComponentType = computed(() => METRIC_WIDGET_TYPES.has(currentChartType.value));
const isContentComponentType = computed(() => CONTENT_WIDGET_TYPES.has(currentChartType.value));
const isWordCloudType = computed(() => currentChartType.value === 'word_cloud');
const isListType = computed(() => currentChartType.value === 'text_list' || currentChartType.value === 'image_list');
const isIframeType = computed(() => currentChartType.value === 'iframe_single' || currentChartType.value === 'iframe_tabs');
const isTextBlockType = computed(() => currentChartType.value === 'text_block');
const isPureStaticNoDataComponentType = computed(() => (isDecorationComponentType.value || isVectorIconComponentType.value || PURE_STATIC_NO_DATA_TYPES.has(currentChartType.value)));
const componentKind = computed(() => {
    if (isDecorationComponentType.value)
        return 'decoration';
    if (isVectorIconComponentType.value)
        return 'icon';
    if (isFilterComponentType.value)
        return 'control';
    if (isTableComponentType.value)
        return 'table';
    if (isMetricComponentType.value)
        return 'metric';
    if (isContentComponentType.value)
        return 'content';
    return 'chart';
});
const componentKindLabel = computed(() => ({
    chart: '分析图表',
    table: '表格组件',
    metric: '指标组件',
    content: '信息组件',
    decoration: '装饰组件',
    icon: '小装饰',
    control: '筛选控件',
}[componentKind.value]));
const componentKindDescription = computed(() => {
    switch (componentKind.value) {
        case 'table':
            return '重点管理表头、行态、排序与容器边框，保留对数据结构的可读性。';
        case 'metric':
            return '以数值聚焦为主，突出标签、核心指标和卡片层级，不展示冗余图例。';
        case 'content':
            return '信息型组件优先关注容器层次与内容承载，字段绑定只保留必要项。';
        case 'decoration':
            return '装饰组件不参与取数，主要通过主题、边框、阴影与透明度塑造画面氛围。';
        case 'icon':
            return '小装饰不参与取数，只保留适合符号类组件的轮廓与光效设置。';
        case 'control':
            return '筛选控件只保留筛选字段与默认值绑定，交互逻辑由全局筛选系统接管。';
        default:
            return '分析图表保留完整的数据、图例、坐标轴和高级样式链路，适合 BI 可视化编排。';
    }
});
const componentCapabilityTags = computed(() => {
    switch (componentKind.value) {
        case 'table':
            return ['表头样式', '行态控制', '排序能力', '容器边框'];
        case 'metric':
            return ['指标聚焦', '标签可选', '卡片边框', '阴影层级'];
        case 'content':
            return ['信息承载', '内容字段', '容器样式', '透明度'];
        case 'decoration':
            return ['无数据依赖', '透明背景', '边框动画', '光效强调'];
        case 'icon':
            return ['无数据依赖', '符号化表达', '描边容器', '阴影增强'];
        case 'control':
            return ['字段筛选', '默认值', '页面联动', '轻交互'];
        default:
            return ['数据绑定', '图例控制', '坐标轴', '图表高级'];
    }
});
const styleCapabilityTags = computed(() => {
    switch (componentKind.value) {
        case 'table':
            return ['主题配色', '标题', '表头', '行样式', '功能设置', '容器高级'];
        case 'metric':
            return ['主题配色', '标题', '数值标签', '边框阴影', '容器高级'];
        case 'content':
            return ['主题配色', '标题', '边框描边', '透明度', '容器高级'];
        case 'decoration':
            return ['主题色', '透明容器', '边框描边', '光效阴影'];
        case 'icon':
            return ['主题色', '描边容器', '阴影发光', '透明度'];
        case 'control':
            return ['主题配色', '标题', '边框描边', '容器高级'];
        default:
            return ['主题配色', '标题', '图例', '标签', '坐标轴', '图表高级', '容器高级'];
    }
});
const showDataTab = computed(() => !isPureStaticNoDataComponentType.value);
const showInteractionTab = computed(() => showDataTab.value && !isFilterComponentType.value);
const showTitleSection = computed(() => !isDecorationComponentType.value && !isVectorIconComponentType.value);
const showLegendSection = computed(() => componentKind.value === 'chart' && currentChartMeta.value.supportsLegend);
const showLabelSection = computed(() => showDataTab.value && !isTableComponentType.value && !isFilterComponentType.value);
const showTooltipSection = computed(() => showDataTab.value && !isFilterComponentType.value);
const showAxisSections = computed(() => componentKind.value === 'chart' && currentChartMeta.value.supportsAxisNames);
const showChartAdvancedSection = computed(() => (componentKind.value === 'chart' && (currentChartMeta.value.supportsSmooth ||
    currentChartMeta.value.supportsAreaFill ||
    currentChartMeta.value.supportsBarStyle)));
const isUseDatasetMode = computed(() => configForm.chart.sourceMode !== 'PAGE_SQL');
const bindingEntryMode = computed(() => isUseDatasetMode.value ? 'DATASET' : 'PAGE_SQL');
const dataBindingMode = computed(() => configForm.chart.pageSourceKind);
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
const normalizeFieldRoleList = (fields) => Array.from(new Set(fields
    .map((field) => field.trim())
    .filter(Boolean)));
const createDraftTableColumn = (field = '', index = configForm.chart.tableCustomColumns.length) => ({
    id: `table-column-${Date.now()}-${index}`,
    field,
    label: field,
    width: 180,
    align: 'center',
});
const normalizeDraftTableColumns = (columns) => columns
    .map((column, index) => ({
    id: column.id || `table-column-${index + 1}`,
    field: String(column.field ?? '').trim(),
    label: String(column.label ?? '').trim(),
    width: Math.min(480, Math.max(80, Math.round(Number(column.width) || 180))),
    align: column.align === 'left' || column.align === 'right' || column.align === 'center' ? column.align : 'center',
}))
    .filter((column) => column.field)
    .map((column) => ({
    ...column,
    label: column.label || column.field,
}));
const syncTableColumnConfig = () => {
    configForm.chart.tableCustomColumns = normalizeDraftTableColumns(configForm.chart.tableCustomColumns ?? []);
    if (!isTableComponentType.value)
        return;
    configForm.chart.tableDimensionFields = [];
    configForm.chart.tableMetricFields = [];
    configForm.chart.xField = '';
    configForm.chart.yField = '';
    configForm.chart.groupField = '';
};
const previewVisibleColumns = computed(() => isTableComponentType.value
    ? resolveConfiguredTableColumns(configForm.chart, previewColumns.value).map((column) => column.field)
    : previewColumns.value);
const tablePreviewJson = computed(() => {
    if (!isTableComponentType.value || !previewColumns.value.length)
        return '';
    return JSON.stringify({
        columns: previewColumns.value,
        rows: previewRows.value,
        rowCount: previewRowCount.value,
    }, null, 2);
});
const previewColumnSummary = computed(() => {
    const visibleCount = previewVisibleColumns.value.length;
    const totalCount = previewColumns.value.length;
    if (isTableComponentType.value && totalCount && visibleCount !== totalCount) {
        return `展示 ${visibleCount} / 全部 ${totalCount} 个字段 / 样例 ${previewRows.value.length} 行 / 总计 ${previewRowCount.value} 行`;
    }
    return `字段 ${visibleCount} 个 / 样例 ${previewRows.value.length} 行 / 总计 ${previewRowCount.value} 行`;
});
const addTableColumn = () => {
    if (!previewColumns.value.length) {
        ElMessage.warning('请先预览数据，再新增表格列');
        return;
    }
    const usedFields = new Set(configForm.chart.tableCustomColumns.map((column) => column.field));
    const nextField = previewColumns.value.find((field) => !usedFields.has(field)) ?? previewColumns.value[0] ?? '';
    configForm.chart.tableCustomColumns = [...configForm.chart.tableCustomColumns, createDraftTableColumn(nextField)];
    syncTableColumnConfig();
};
const removeTableColumn = (index) => {
    configForm.chart.tableCustomColumns = configForm.chart.tableCustomColumns.filter((_, itemIndex) => itemIndex !== index);
    syncTableColumnConfig();
};
const handleTableColumnFieldChange = (index) => {
    const column = configForm.chart.tableCustomColumns[index];
    if (!column)
        return;
    if (!column.label.trim()) {
        column.label = column.field;
    }
    syncTableColumnConfig();
};
const onTableColumnDragStart = (sourceIndex) => {
    tableFieldDrag.value = { sourceIndex };
};
const clearTableColumnDrag = () => {
    tableFieldDrag.value = null;
};
const onTableColumnDrop = (targetIndex) => {
    const dragging = tableFieldDrag.value;
    if (!dragging || dragging.sourceIndex === targetIndex)
        return;
    const nextColumns = [...configForm.chart.tableCustomColumns];
    const [movedColumn] = nextColumns.splice(dragging.sourceIndex, 1);
    if (!movedColumn)
        return;
    nextColumns.splice(targetIndex, 0, movedColumn);
    configForm.chart.tableCustomColumns = nextColumns;
    clearTableColumnDrag();
    syncTableColumnConfig();
};
const suggestionSummary = computed(() => {
    const entries = [
        suggestedFields.value.xField ? `${chartFieldLabels.value.x} ${suggestedFields.value.xField}` : '',
        suggestedFields.value.yField ? `${chartFieldLabels.value.y} ${suggestedFields.value.yField}` : '',
        suggestedFields.value.groupField ? `分组 ${suggestedFields.value.groupField}` : '',
    ];
    return entries.filter(Boolean);
});
const dataModeTitle = computed(() => {
    switch (componentKind.value) {
        case 'table':
            return '表格型组件直接基于查询结果配置自定义列，不再区分维度和指标。';
        case 'metric':
            return '指标型组件以单一核心数值为主，可附加标签字段或对比字段强化语义。';
        case 'content':
            return '信息型组件只暴露必要绑定项，适合列表、词云等轻量数据组件。';
        case 'control':
            return '筛选控件只需要绑定筛选字段，页面运行时会自动接管联动逻辑。';
        default:
            return isBarFamilyComponentType.value
                ? '图表型组件支持完整数据接入链路，可按 X 轴、Y 轴、分组逐步映射。'
                : '图表型组件支持完整数据接入链路，可按维度、度量、分组逐步映射。';
    }
});
const dataModeDescription = computed(() => {
    if (bindingEntryMode.value === 'DATASET') {
        return '当前处于数据集模式，适合复用已有 SQL 与字段定义；字段映射会随样例数据自动推荐。';
    }
    return '当前处于在线编辑模式，可以按数据库、API、表格、JSON 四种来源直接绑定当前页面组件。';
});
const dataCapabilityTags = computed(() => {
    const tags = [bindingEntryMode.value === 'DATASET' ? '复用数据集' : '页面实时取数'];
    if (isTableComponentType.value) {
        tags.push('自定义列', '结果 JSON');
        return tags.slice(0, 4);
    }
    if (currentChartMeta.value.requiresDimension || isFilterComponentType.value || isMetricComponentType.value) {
        tags.push(isBarFamilyComponentType.value ? 'X轴映射' : '维度角色');
    }
    if (currentChartMeta.value.requiresMetric || isMetricComponentType.value) {
        tags.push(isBarFamilyComponentType.value ? 'Y轴映射' : '指标角色');
    }
    if (currentChartMeta.value.allowsGroup || isMetricComponentType.value) {
        tags.push('分组扩展');
    }
    return tags.slice(0, 4);
});
const chartFieldLabels = computed(() => getChartFieldLabels(configForm.chart.chartType));
const isBarFamilyComponentType = computed(() => isBarFamilyChartType(configForm.chart.chartType));
const dimensionFieldLabel = computed(() => {
    if (isFilterComponentType.value)
        return '筛选字段';
    if (isIframeType.value)
        return 'src字段';
    if (isMetricComponentType.value)
        return currentChartMeta.value.requiresDimension ? '标签字段' : '标签字段（可选）';
    return currentChartMeta.value.requiresDimension ? chartFieldLabels.value.x : `${chartFieldLabels.value.x}（可选）`;
});
const metricFieldLabel = computed(() => {
    if (isMetricComponentType.value)
        return '数值字段';
    return chartFieldLabels.value.y;
});
const groupFieldLabel = computed(() => {
    if (isMetricComponentType.value)
        return '对比字段';
    return chartFieldLabels.value.group;
});
const healthReadyText = computed(() => {
    switch (componentKind.value) {
        case 'decoration':
            return '当前组件无需绑定数据，适合直接调整边框、阴影和透明层级后保存。';
        case 'icon':
            return '当前图标组件无需绑定数据，建议重点调整主题色、容器边框和发光效果。';
        case 'content':
            return '当前配置满足信息组件的预览要求，可继续微调容器样式与内容承载方式。';
        case 'metric':
            return '当前指标组件已可预览，建议继续检查标签字段和数值字段是否表达清晰。';
        case 'table':
            return '当前表格组件已满足预览条件，可继续调整自定义列、表头样式和轮播设置。';
        case 'control':
            return '当前筛选控件已满足预览条件，可直接保存并用于页面全局筛选。';
        default:
            return '当前配置满足画布预览要求，可直接联动预览与保存。';
    }
});
const pageSourceRuntimeSignature = computed(() => JSON.stringify({
    api: {
        resultPath: apiRuntimeForm.resultPath,
        bodyText: apiRuntimeForm.bodyText,
        headers: apiRuntimeForm.headers.map((item) => ({ key: item.key, value: item.value })),
        query: apiRuntimeForm.query.map((item) => ({ key: item.key, value: item.value })),
    },
    table: { ...tableRuntimeForm },
    json: { ...jsonRuntimeForm },
}));
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
            refreshInterval: configForm.chart.dataRefreshInterval,
            chartId: props.component.chartId,
            dimensions: isTableComponentType.value ? [] : (configForm.chart.xField ? [configForm.chart.xField] : []),
            metrics: isTableComponentType.value ? [] : (configForm.chart.yField ? [configForm.chart.yField] : []),
            groups: isTableComponentType.value ? [] : (configForm.chart.groupField ? [configForm.chart.groupField] : []),
            table: isTableComponentType.value ? {
                loadLimit: configForm.chart.tableLoadLimit,
                visibleRows: configForm.chart.tableVisibleRows,
                carouselMode: configForm.chart.tableCarouselMode,
                carouselInterval: configForm.chart.tableCarouselInterval,
                columns: configForm.chart.tableCustomColumns,
            } : undefined,
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
    }, 300);
};
const resolveDatasourceKind = (datasource) => datasource?.sourceKind || 'DATABASE';
const readObject = (value) => (!value || typeof value !== 'object' || Array.isArray(value) ? {} : value);
const readString = (value) => typeof value === 'string' ? value : '';
const readBoolean = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;
const parseJsonObjectTextSafely = (jsonText) => {
    const trimmed = String(jsonText ?? '').trim();
    if (!trimmed)
        return {};
    try {
        const parsed = JSON.parse(trimmed);
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
const rowsFromObject = (value) => {
    const entries = Object.entries(readObject(value));
    return entries.length
        ? entries.map(([key, rowValue]) => createRuntimeRow({ key, value: stringifyUnknown(rowValue) }))
        : [createRuntimeRow()];
};
const resetPageSourceForms = () => {
    Object.assign(apiRuntimeForm, createEmptyApiRuntimeForm());
    Object.assign(tableRuntimeForm, createEmptyTableRuntimeForm());
    Object.assign(jsonRuntimeForm, createEmptyJsonRuntimeForm());
    apiRuntimeTab.value = 'headers';
};
const syncPageSourceFormsFromRuntime = (runtimeConfigText) => {
    resetPageSourceForms();
    const runtimeConfig = parseJsonObjectTextSafely(runtimeConfigText);
    apiRuntimeForm.headers = rowsFromObject(runtimeConfig.apiHeaders ?? runtimeConfig.headers);
    apiRuntimeForm.query = rowsFromObject(runtimeConfig.apiQuery ?? runtimeConfig.query);
    apiRuntimeForm.bodyText = stringifyUnknown(runtimeConfig.apiBody ?? runtimeConfig.body);
    apiRuntimeForm.resultPath = readString(runtimeConfig.apiResultPath ?? runtimeConfig.resultPath);
    tableRuntimeForm.delimiter = readString(runtimeConfig.tableDelimiter ?? runtimeConfig.delimiter).toUpperCase() || '';
    tableRuntimeForm.hasHeader = typeof (runtimeConfig.tableHasHeader ?? runtimeConfig.hasHeader) === 'boolean'
        ? String(readBoolean(runtimeConfig.tableHasHeader ?? runtimeConfig.hasHeader))
        : '';
    tableRuntimeForm.text = readString(runtimeConfig.tableText ?? runtimeConfig.text);
    jsonRuntimeForm.resultPath = readString(runtimeConfig.jsonResultPath ?? runtimeConfig.resultPath);
    jsonRuntimeForm.text = readString(runtimeConfig.jsonText ?? runtimeConfig.text);
};
const buildRuntimeKeyValueObject = (rows) => rows.reduce((result, row) => {
    const key = row.key.trim();
    if (!key)
        return result;
    const parsedValue = parseLooseJsonValue(row.value);
    result[key] = parsedValue === undefined ? '' : parsedValue;
    return result;
}, {});
const buildPageSourceRuntimeConfig = () => {
    if (configForm.chart.pageSourceKind === 'API') {
        const runtimeConfig = {};
        const headers = buildRuntimeKeyValueObject(apiRuntimeForm.headers);
        const query = buildRuntimeKeyValueObject(apiRuntimeForm.query);
        if (Object.keys(headers).length)
            runtimeConfig.apiHeaders = headers;
        if (Object.keys(query).length)
            runtimeConfig.apiQuery = query;
        const body = parseLooseJsonValue(apiRuntimeForm.bodyText);
        if (body !== undefined)
            runtimeConfig.apiBody = body;
        if (apiRuntimeForm.resultPath.trim())
            runtimeConfig.apiResultPath = apiRuntimeForm.resultPath.trim();
        return runtimeConfig;
    }
    if (configForm.chart.pageSourceKind === 'TABLE') {
        const runtimeConfig = {};
        if (tableRuntimeForm.delimiter)
            runtimeConfig.tableDelimiter = tableRuntimeForm.delimiter;
        if (tableRuntimeForm.hasHeader)
            runtimeConfig.tableHasHeader = tableRuntimeForm.hasHeader === 'true';
        if (tableRuntimeForm.text.trim())
            runtimeConfig.tableText = tableRuntimeForm.text;
        return runtimeConfig;
    }
    if (configForm.chart.pageSourceKind === 'JSON_STATIC') {
        const runtimeConfig = {};
        if (jsonRuntimeForm.resultPath.trim())
            runtimeConfig.jsonResultPath = jsonRuntimeForm.resultPath.trim();
        if (jsonRuntimeForm.text.trim())
            runtimeConfig.jsonText = jsonRuntimeForm.text;
        return runtimeConfig;
    }
    return {};
};
const syncRuntimeConfigTextFromForms = () => {
    if (configForm.chart.sourceMode !== 'PAGE_SQL' || configForm.chart.pageSourceKind === 'DATABASE') {
        configForm.chart.runtimeConfigText = '';
        return;
    }
    const runtimeConfig = buildPageSourceRuntimeConfig();
    configForm.chart.runtimeConfigText = Object.keys(runtimeConfig).length ? JSON.stringify(runtimeConfig, null, 2) : '';
};
const ensurePageSourceRuntimeValid = () => {
    if (configForm.chart.pageSourceKind === 'JSON_STATIC' && jsonRuntimeForm.text.trim()) {
        parseJsonValueText(jsonRuntimeForm.text, 'JSON 内容覆盖必须是合法 JSON');
    }
};
const clearPreviewData = () => {
    previewColumns.value = [];
    previewRows.value = [];
    previewRowCount.value = 0;
};
const clearChartDataBinding = () => {
    configForm.chart.datasetId = '';
    configForm.chart.datasourceId = '';
    configForm.chart.sqlText = '';
    configForm.chart.runtimeConfigText = '';
    configForm.chart.xField = '';
    configForm.chart.yField = '';
    configForm.chart.groupField = '';
    configForm.chart.tableDimensionFields = [];
    configForm.chart.tableMetricFields = [];
    configForm.chart.tableCustomColumns = [];
    resetPageSourceForms();
    clearPreviewData();
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
    syncTableColumnConfig();
    syncPageSourceFormsFromRuntime(configForm.chart.runtimeConfigText);
    syncRuntimeConfigTextFromForms();
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
// 用 JSON 签名代替 deep watch：只在序列化内容真正变化时才触发预览，
// 避免 60+ 属性对象的深度比较在滑块拖拽等连续操作中造成卡顿。
const configFormSignature = computed(() => JSON.stringify([configForm.chart, configForm.style, configForm.interaction, currentComponentChartId.value]));
watch(configFormSignature, queuePreview);
watch(pageSourceRuntimeSignature, () => {
    if (syncingFromProps.value || isUseDatasetMode.value)
        return;
    syncRuntimeConfigTextFromForms();
});
watch(isPureStaticNoDataComponentType, (disabled) => {
    if (!disabled || isDecorationComponentType.value)
        return;
    clearChartDataBinding();
    if (activeTab.value === 'data' || activeTab.value === 'interaction') {
        activeTab.value = 'style';
    }
});
watch(isDecorationComponentType, (isDecoration) => {
    if (!isDecoration)
        return;
    clearChartDataBinding();
    configForm.style.bgColor = 'rgba(0,0,0,0)';
    if (activeTab.value === 'data' || activeTab.value === 'interaction') {
        activeTab.value = 'style';
    }
});
watch(isFilterComponentType, (isFilter) => {
    if (!isFilter)
        return;
    configForm.interaction.enableClickLinkage = false;
    configForm.interaction.clickAction = 'none';
    configForm.interaction.linkageFieldMode = 'auto';
    configForm.interaction.linkageField = '';
    if (activeTab.value === 'interaction') {
        activeTab.value = 'data';
    }
});
watch(isTableComponentType, (isTable) => {
    if (!isTable)
        return;
    syncTableColumnConfig();
});
watch(previewColumns, (columns) => {
    if (!isTableComponentType.value || configForm.chart.tableCustomColumns.length || !columns.length)
        return;
    configForm.chart.tableCustomColumns = columns.map((field, index) => createDraftTableColumn(field, index));
    syncTableColumnConfig();
});
const loadMeta = async () => {
    try {
        const [datasetList, datasourceList] = await Promise.all([getDatasetList(), getDatasourceList()]);
        datasets.value = datasetList;
        datasources.value = datasourceList;
        if (props.component) {
            await syncFromProps();
        }
    }
    catch {
        datasets.value = [];
        datasources.value = [];
    }
};
const onBindingEntryModeChange = async (mode) => {
    if (mode === 'DATASET') {
        configForm.chart.sourceMode = 'DATASET';
        configForm.chart.datasourceId = '';
        configForm.chart.sqlText = '';
        resetPageSourceForms();
        syncRuntimeConfigTextFromForms();
        if (configForm.chart.datasetId) {
            await onDatasetChange(configForm.chart.datasetId);
            return;
        }
    }
    else {
        configForm.chart.sourceMode = 'PAGE_SQL';
        configForm.chart.datasetId = '';
        syncRuntimeConfigTextFromForms();
    }
    clearPreviewData();
};
const onDataBindingModeChange = async (mode) => {
    configForm.chart.sourceMode = 'PAGE_SQL';
    configForm.chart.pageSourceKind = mode;
    configForm.chart.datasetId = '';
    configForm.chart.datasourceId = '';
    configForm.chart.sqlText = '';
    resetPageSourceForms();
    syncRuntimeConfigTextFromForms();
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
const addApiRuntimeRow = (section) => {
    apiRuntimeForm[section] = [...apiRuntimeForm[section], createRuntimeRow()];
};
const removeApiRuntimeRow = (section, rowId) => {
    const nextRows = apiRuntimeForm[section].filter((item) => item.id !== rowId);
    apiRuntimeForm[section] = nextRows.length ? nextRows : [createRuntimeRow()];
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
        ensurePageSourceRuntimeValid();
        syncRuntimeConfigTextFromForms();
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
    if (isTableComponentType.value) {
        if (!configForm.chart.tableCustomColumns.length) {
            const suggestedColumns = resolveConfiguredTableColumns({
                ...configForm.chart,
                tableCustomColumns: [],
            }, previewColumns.value);
            if (suggestedColumns.length) {
                configForm.chart.tableCustomColumns = suggestedColumns;
            }
        }
        syncTableColumnConfig();
        return;
    }
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
            ensurePageSourceRuntimeValid();
            syncRuntimeConfigTextFromForms();
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
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-head']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input-number']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['el-radio-button__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['el-radio-button__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['health-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-field']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table__cell']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input-number']} */ ;
/** @type {__VLS_StyleScopedClasses['field-item']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group--mode']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group--submode']} */ ;
/** @type {__VLS_StyleScopedClasses['el-radio-button']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__header']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__nav-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['kv-editor-row']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__content']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-select']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input']} */ ;
/** @type {__VLS_StyleScopedClasses['table-basic-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item__grid']} */ ;
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
        label: "基础设置",
        name: "summary",
    }));
    const __VLS_10 = __VLS_9({
        label: "基础设置",
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-title" },
    });
    (__VLS_ctx.componentKindLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-desc" },
    });
    (__VLS_ctx.componentKindDescription);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-chip-list" },
    });
    for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.componentCapabilityTags))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (tag),
            ...{ class: "profile-chip" },
        });
        (tag);
    }
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
    if (__VLS_ctx.isTableComponentType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "inspector-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        const __VLS_48 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            labelPosition: "top",
            ...{ class: "chart-form summary-form" },
        }));
        const __VLS_50 = __VLS_49({
            labelPosition: "top",
            ...{ class: "chart-form summary-form" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-basic-grid" },
        });
        const __VLS_52 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            label: "最大加载量",
        }));
        const __VLS_54 = __VLS_53({
            label: "最大加载量",
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        __VLS_55.slots.default;
        const __VLS_56 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            modelValue: (__VLS_ctx.configForm.chart.tableLoadLimit),
            min: (1),
            max: (5000),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_58 = __VLS_57({
            modelValue: (__VLS_ctx.configForm.chart.tableLoadLimit),
            min: (1),
            max: (5000),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
        var __VLS_55;
        const __VLS_60 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
            label: "表行数",
        }));
        const __VLS_62 = __VLS_61({
            label: "表行数",
        }, ...__VLS_functionalComponentArgsRest(__VLS_61));
        __VLS_63.slots.default;
        const __VLS_64 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
            modelValue: (__VLS_ctx.configForm.chart.tableVisibleRows),
            min: (1),
            max: (200),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_66 = __VLS_65({
            modelValue: (__VLS_ctx.configForm.chart.tableVisibleRows),
            min: (1),
            max: (200),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
        var __VLS_63;
        const __VLS_68 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            label: "轮播方式",
        }));
        const __VLS_70 = __VLS_69({
            label: "轮播方式",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        __VLS_71.slots.default;
        const __VLS_72 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            modelValue: (__VLS_ctx.configForm.chart.tableCarouselMode),
            ...{ style: {} },
        }));
        const __VLS_74 = __VLS_73({
            modelValue: (__VLS_ctx.configForm.chart.tableCarouselMode),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        const __VLS_76 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            label: "单行滚动",
            value: "single",
        }));
        const __VLS_78 = __VLS_77({
            label: "单行滚动",
            value: "single",
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        const __VLS_80 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            label: "整页滚动",
            value: "page",
        }));
        const __VLS_82 = __VLS_81({
            label: "整页滚动",
            value: "page",
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        var __VLS_75;
        var __VLS_71;
        const __VLS_84 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            label: "轮播间隔时间",
        }));
        const __VLS_86 = __VLS_85({
            label: "轮播间隔时间",
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        const __VLS_88 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
            modelValue: (__VLS_ctx.configForm.chart.tableCarouselInterval),
            min: (1000),
            max: (120000),
            step: (1000),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_90 = __VLS_89({
            modelValue: (__VLS_ctx.configForm.chart.tableCarouselInterval),
            min: (1000),
            max: (120000),
            step: (1000),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_89));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
        var __VLS_87;
        var __VLS_51;
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
    const __VLS_92 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }));
    const __VLS_94 = __VLS_93({
        type: (__VLS_ctx.missingFields.length ? 'warning' : 'success'),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    (__VLS_ctx.missingFields.length ? '待补充' : '可预览');
    var __VLS_95;
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
        (__VLS_ctx.healthReadyText);
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
    const __VLS_96 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posX),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onChange: (__VLS_ctx.handlePosXChange)
    };
    var __VLS_99;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_104 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.posY),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onChange: (__VLS_ctx.handlePosYChange)
    };
    var __VLS_107;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_112 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (160),
        controlsPosition: "right",
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.width),
        min: (160),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_116;
    let __VLS_117;
    let __VLS_118;
    const __VLS_119 = {
        onChange: (__VLS_ctx.handleWidthChange)
    };
    var __VLS_115;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_120 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (120),
        controlsPosition: "right",
    }));
    const __VLS_122 = __VLS_121({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.height),
        min: (120),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    let __VLS_124;
    let __VLS_125;
    let __VLS_126;
    const __VLS_127 = {
        onChange: (__VLS_ctx.handleHeightChange)
    };
    var __VLS_123;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "field-item field-item--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_128 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }));
    const __VLS_130 = __VLS_129({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.layoutForm.zIndex),
        min: (0),
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    let __VLS_132;
    let __VLS_133;
    let __VLS_134;
    const __VLS_135 = {
        onChange: (__VLS_ctx.handleZIndexChange)
    };
    var __VLS_131;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "action-row" },
    });
    const __VLS_136 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_138 = __VLS_137({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    let __VLS_140;
    let __VLS_141;
    let __VLS_142;
    const __VLS_143 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('bring-front');
        }
    };
    __VLS_139.slots.default;
    var __VLS_139;
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        size: "small",
        type: "danger",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                return;
            __VLS_ctx.$emit('remove');
        }
    };
    __VLS_147.slots.default;
    var __VLS_147;
    var __VLS_11;
    if (__VLS_ctx.showDataTab) {
        const __VLS_152 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            label: "数据",
            name: "data",
        }));
        const __VLS_154 = __VLS_153({
            label: "数据",
            name: "data",
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        __VLS_155.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "inspector-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-card-kicker" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-card-title" },
        });
        (__VLS_ctx.dataModeTitle);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-card-desc" },
        });
        (__VLS_ctx.dataModeDescription);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mode-card-tags" },
        });
        for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.dataCapabilityTags))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (tag),
                ...{ class: "mode-card-tag" },
            });
            (tag);
        }
        const __VLS_156 = {}.ElForm;
        /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            labelPosition: "top",
            ...{ class: "chart-form" },
        }));
        const __VLS_158 = __VLS_157({
            labelPosition: "top",
            ...{ class: "chart-form" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
        __VLS_159.slots.default;
        const __VLS_160 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            label: "接入主模式",
        }));
        const __VLS_162 = __VLS_161({
            label: "接入主模式",
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        __VLS_163.slots.default;
        const __VLS_164 = {}.ElRadioGroup;
        /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.bindingEntryMode),
            ...{ class: "page-source-group page-source-group--mode" },
        }));
        const __VLS_166 = __VLS_165({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.bindingEntryMode),
            ...{ class: "page-source-group page-source-group--mode" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        let __VLS_168;
        let __VLS_169;
        let __VLS_170;
        const __VLS_171 = {
            onChange: (__VLS_ctx.onBindingEntryModeChange)
        };
        __VLS_167.slots.default;
        const __VLS_172 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            value: "DATASET",
        }));
        const __VLS_174 = __VLS_173({
            value: "DATASET",
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        __VLS_175.slots.default;
        var __VLS_175;
        const __VLS_176 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
            value: "PAGE_SQL",
        }));
        const __VLS_178 = __VLS_177({
            value: "PAGE_SQL",
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        __VLS_179.slots.default;
        var __VLS_179;
        var __VLS_167;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
        (__VLS_ctx.bindingEntryMode === 'DATASET'
            ? '数据库型组件可直接复用数据集；API、表格和 JSON 静态数据建议直接绑定页面数据源。'
            : '在线编辑模式会直接绑定当前页面数据源，并按数据库、API、表格、JSON 四种方式切换输入窗口。');
        var __VLS_163;
        if (__VLS_ctx.bindingEntryMode === 'PAGE_SQL') {
            const __VLS_180 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
                label: "在线编辑方式",
            }));
            const __VLS_182 = __VLS_181({
                label: "在线编辑方式",
            }, ...__VLS_functionalComponentArgsRest(__VLS_181));
            __VLS_183.slots.default;
            const __VLS_184 = {}.ElRadioGroup;
            /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
            // @ts-ignore
            const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.dataBindingMode),
                ...{ class: "page-source-group page-source-group--submode" },
            }));
            const __VLS_186 = __VLS_185({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.dataBindingMode),
                ...{ class: "page-source-group page-source-group--submode" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_185));
            let __VLS_188;
            let __VLS_189;
            let __VLS_190;
            const __VLS_191 = {
                onChange: (__VLS_ctx.onDataBindingModeChange)
            };
            __VLS_187.slots.default;
            for (const [item] of __VLS_getVForSourceType((__VLS_ctx.PAGE_SOURCE_OPTIONS))) {
                const __VLS_192 = {}.ElRadioButton;
                /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
                // @ts-ignore
                const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
                    key: (item.value),
                    value: (item.value),
                }));
                const __VLS_194 = __VLS_193({
                    key: (item.value),
                    value: (item.value),
                }, ...__VLS_functionalComponentArgsRest(__VLS_193));
                __VLS_195.slots.default;
                (item.label);
                var __VLS_195;
            }
            var __VLS_187;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
            var __VLS_183;
        }
        if (__VLS_ctx.bindingEntryMode === 'DATASET') {
            const __VLS_196 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
                label: "数据集",
            }));
            const __VLS_198 = __VLS_197({
                label: "数据集",
            }, ...__VLS_functionalComponentArgsRest(__VLS_197));
            __VLS_199.slots.default;
            const __VLS_200 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasetId),
                placeholder: "请选择数据集",
                ...{ style: {} },
                filterable: true,
                clearable: (__VLS_ctx.isStaticComponentType),
            }));
            const __VLS_202 = __VLS_201({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasetId),
                placeholder: "请选择数据集",
                ...{ style: {} },
                filterable: true,
                clearable: (__VLS_ctx.isStaticComponentType),
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            let __VLS_204;
            let __VLS_205;
            let __VLS_206;
            const __VLS_207 = {
                onChange: (__VLS_ctx.onDatasetChange)
            };
            __VLS_203.slots.default;
            for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.datasets))) {
                const __VLS_208 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
                    key: (dataset.id),
                    label: (dataset.name),
                    value: (dataset.id),
                }));
                const __VLS_210 = __VLS_209({
                    key: (dataset.id),
                    label: (dataset.name),
                    value: (dataset.id),
                }, ...__VLS_functionalComponentArgsRest(__VLS_209));
            }
            var __VLS_203;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
            (__VLS_ctx.isStaticComponentType ? '静态组件可不绑定数据集；需要数据驱动时再选择数据集即可。' : '数据集模式仅使用已配置好的数据库型数据源与 SQL。');
            var __VLS_199;
        }
        else {
            const __VLS_212 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
                label: (`${__VLS_ctx.pageSourceKindLabel}数据源`),
            }));
            const __VLS_214 = __VLS_213({
                label: (`${__VLS_ctx.pageSourceKindLabel}数据源`),
            }, ...__VLS_functionalComponentArgsRest(__VLS_213));
            __VLS_215.slots.default;
            const __VLS_216 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasourceId),
                placeholder: "请选择数据源",
                ...{ style: {} },
                filterable: true,
                clearable: true,
            }));
            const __VLS_218 = __VLS_217({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.configForm.chart.datasourceId),
                placeholder: "请选择数据源",
                ...{ style: {} },
                filterable: true,
                clearable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_217));
            let __VLS_220;
            let __VLS_221;
            let __VLS_222;
            const __VLS_223 = {
                onChange: (__VLS_ctx.onPageDatasourceChange)
            };
            __VLS_219.slots.default;
            for (const [source] of __VLS_getVForSourceType((__VLS_ctx.pageSourceDatasources))) {
                const __VLS_224 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
                    key: (source.id),
                    label: (source.name),
                    value: (source.id),
                }));
                const __VLS_226 = __VLS_225({
                    key: (source.id),
                    label: (source.name),
                    value: (source.id),
                }, ...__VLS_functionalComponentArgsRest(__VLS_225));
            }
            var __VLS_219;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
            (__VLS_ctx.pageSourceHelperText);
            var __VLS_215;
            if (__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE') {
                const __VLS_228 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
                    label: "页面编写 SQL",
                }));
                const __VLS_230 = __VLS_229({
                    label: "页面编写 SQL",
                }, ...__VLS_functionalComponentArgsRest(__VLS_229));
                __VLS_231.slots.default;
                const __VLS_232 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
                    modelValue: (__VLS_ctx.configForm.chart.sqlText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "请输入查询 SQL（仅支持查询语句）",
                }));
                const __VLS_234 = __VLS_233({
                    modelValue: (__VLS_ctx.configForm.chart.sqlText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "请输入查询 SQL（仅支持查询语句）",
                }, ...__VLS_functionalComponentArgsRest(__VLS_233));
                var __VLS_231;
            }
            else if (__VLS_ctx.configForm.chart.pageSourceKind === 'API') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-card" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "runtime-editor-tip" },
                });
                const __VLS_236 = {}.ElTabs;
                /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
                // @ts-ignore
                const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
                    modelValue: (__VLS_ctx.apiRuntimeTab),
                    ...{ class: "runtime-tabs" },
                }));
                const __VLS_238 = __VLS_237({
                    modelValue: (__VLS_ctx.apiRuntimeTab),
                    ...{ class: "runtime-tabs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_237));
                __VLS_239.slots.default;
                const __VLS_240 = {}.ElTabPane;
                /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
                // @ts-ignore
                const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
                    label: "请求头",
                    name: "headers",
                }));
                const __VLS_242 = __VLS_241({
                    label: "请求头",
                    name: "headers",
                }, ...__VLS_functionalComponentArgsRest(__VLS_241));
                __VLS_243.slots.default;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "kv-editor-list" },
                });
                for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.headers))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (row.id),
                        ...{ class: "kv-editor-row" },
                    });
                    const __VLS_244 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
                        modelValue: (row.key),
                        placeholder: "键",
                    }));
                    const __VLS_246 = __VLS_245({
                        modelValue: (row.key),
                        placeholder: "键",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
                    const __VLS_248 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
                        modelValue: (row.value),
                        placeholder: "值",
                    }));
                    const __VLS_250 = __VLS_249({
                        modelValue: (row.value),
                        placeholder: "值",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
                    const __VLS_252 = {}.ElButton;
                    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                    // @ts-ignore
                    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
                        ...{ 'onClick': {} },
                        text: true,
                        size: "small",
                    }));
                    const __VLS_254 = __VLS_253({
                        ...{ 'onClick': {} },
                        text: true,
                        size: "small",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
                    let __VLS_256;
                    let __VLS_257;
                    let __VLS_258;
                    const __VLS_259 = {
                        onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                                return;
                            if (!(__VLS_ctx.showDataTab))
                                return;
                            if (!!(__VLS_ctx.bindingEntryMode === 'DATASET'))
                                return;
                            if (!!(__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE'))
                                return;
                            if (!(__VLS_ctx.configForm.chart.pageSourceKind === 'API'))
                                return;
                            __VLS_ctx.removeApiRuntimeRow('headers', row.id);
                        }
                    };
                    __VLS_255.slots.default;
                    var __VLS_255;
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "action-row action-row--compact" },
                });
                const __VLS_260 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
                    ...{ 'onClick': {} },
                    size: "small",
                    link: true,
                    type: "primary",
                }));
                const __VLS_262 = __VLS_261({
                    ...{ 'onClick': {} },
                    size: "small",
                    link: true,
                    type: "primary",
                }, ...__VLS_functionalComponentArgsRest(__VLS_261));
                let __VLS_264;
                let __VLS_265;
                let __VLS_266;
                const __VLS_267 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.showDataTab))
                            return;
                        if (!!(__VLS_ctx.bindingEntryMode === 'DATASET'))
                            return;
                        if (!!(__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE'))
                            return;
                        if (!(__VLS_ctx.configForm.chart.pageSourceKind === 'API'))
                            return;
                        __VLS_ctx.addApiRuntimeRow('headers');
                    }
                };
                __VLS_263.slots.default;
                var __VLS_263;
                var __VLS_243;
                const __VLS_268 = {}.ElTabPane;
                /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
                // @ts-ignore
                const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
                    label: "QUERY 参数",
                    name: "query",
                }));
                const __VLS_270 = __VLS_269({
                    label: "QUERY 参数",
                    name: "query",
                }, ...__VLS_functionalComponentArgsRest(__VLS_269));
                __VLS_271.slots.default;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "kv-editor-list" },
                });
                for (const [row] of __VLS_getVForSourceType((__VLS_ctx.apiRuntimeForm.query))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (row.id),
                        ...{ class: "kv-editor-row" },
                    });
                    const __VLS_272 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
                        modelValue: (row.key),
                        placeholder: "键",
                    }));
                    const __VLS_274 = __VLS_273({
                        modelValue: (row.key),
                        placeholder: "键",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
                    const __VLS_276 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
                        modelValue: (row.value),
                        placeholder: "值",
                    }));
                    const __VLS_278 = __VLS_277({
                        modelValue: (row.value),
                        placeholder: "值",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
                    const __VLS_280 = {}.ElButton;
                    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                    // @ts-ignore
                    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
                        ...{ 'onClick': {} },
                        text: true,
                        size: "small",
                    }));
                    const __VLS_282 = __VLS_281({
                        ...{ 'onClick': {} },
                        text: true,
                        size: "small",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
                    let __VLS_284;
                    let __VLS_285;
                    let __VLS_286;
                    const __VLS_287 = {
                        onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                                return;
                            if (!(__VLS_ctx.showDataTab))
                                return;
                            if (!!(__VLS_ctx.bindingEntryMode === 'DATASET'))
                                return;
                            if (!!(__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE'))
                                return;
                            if (!(__VLS_ctx.configForm.chart.pageSourceKind === 'API'))
                                return;
                            __VLS_ctx.removeApiRuntimeRow('query', row.id);
                        }
                    };
                    __VLS_283.slots.default;
                    var __VLS_283;
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "action-row action-row--compact" },
                });
                const __VLS_288 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
                    ...{ 'onClick': {} },
                    size: "small",
                    link: true,
                    type: "primary",
                }));
                const __VLS_290 = __VLS_289({
                    ...{ 'onClick': {} },
                    size: "small",
                    link: true,
                    type: "primary",
                }, ...__VLS_functionalComponentArgsRest(__VLS_289));
                let __VLS_292;
                let __VLS_293;
                let __VLS_294;
                const __VLS_295 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.showDataTab))
                            return;
                        if (!!(__VLS_ctx.bindingEntryMode === 'DATASET'))
                            return;
                        if (!!(__VLS_ctx.configForm.chart.pageSourceKind === 'DATABASE'))
                            return;
                        if (!(__VLS_ctx.configForm.chart.pageSourceKind === 'API'))
                            return;
                        __VLS_ctx.addApiRuntimeRow('query');
                    }
                };
                __VLS_291.slots.default;
                var __VLS_291;
                var __VLS_271;
                const __VLS_296 = {}.ElTabPane;
                /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
                // @ts-ignore
                const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
                    label: "请求体",
                    name: "body",
                }));
                const __VLS_298 = __VLS_297({
                    label: "请求体",
                    name: "body",
                }, ...__VLS_functionalComponentArgsRest(__VLS_297));
                __VLS_299.slots.default;
                const __VLS_300 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
                    modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "可选。支持 JSON 或普通文本，留空则沿用数据源默认请求体。",
                }));
                const __VLS_302 = __VLS_301({
                    modelValue: (__VLS_ctx.apiRuntimeForm.bodyText),
                    type: "textarea",
                    rows: (5),
                    placeholder: "可选。支持 JSON 或普通文本，留空则沿用数据源默认请求体。",
                }, ...__VLS_functionalComponentArgsRest(__VLS_301));
                var __VLS_299;
                var __VLS_239;
                const __VLS_304 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
                    label: "结果路径覆盖（可选）",
                    ...{ class: "runtime-form-item" },
                }));
                const __VLS_306 = __VLS_305({
                    label: "结果路径覆盖（可选）",
                    ...{ class: "runtime-form-item" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_305));
                __VLS_307.slots.default;
                const __VLS_308 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
                    modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
                    placeholder: "例如 data.records",
                }));
                const __VLS_310 = __VLS_309({
                    modelValue: (__VLS_ctx.apiRuntimeForm.resultPath),
                    placeholder: "例如 data.records",
                }, ...__VLS_functionalComponentArgsRest(__VLS_309));
                var __VLS_307;
            }
            else if (__VLS_ctx.configForm.chart.pageSourceKind === 'TABLE') {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-card" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "runtime-editor-tip" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-form-grid" },
                });
                const __VLS_312 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
                    label: "分隔格式",
                    ...{ class: "runtime-form-item" },
                }));
                const __VLS_314 = __VLS_313({
                    label: "分隔格式",
                    ...{ class: "runtime-form-item" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_313));
                __VLS_315.slots.default;
                const __VLS_316 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
                    modelValue: (__VLS_ctx.tableRuntimeForm.delimiter),
                    placeholder: "沿用数据源",
                }));
                const __VLS_318 = __VLS_317({
                    modelValue: (__VLS_ctx.tableRuntimeForm.delimiter),
                    placeholder: "沿用数据源",
                }, ...__VLS_functionalComponentArgsRest(__VLS_317));
                __VLS_319.slots.default;
                const __VLS_320 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
                    label: "沿用数据源",
                    value: "",
                }));
                const __VLS_322 = __VLS_321({
                    label: "沿用数据源",
                    value: "",
                }, ...__VLS_functionalComponentArgsRest(__VLS_321));
                const __VLS_324 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
                    label: "CSV",
                    value: "CSV",
                }));
                const __VLS_326 = __VLS_325({
                    label: "CSV",
                    value: "CSV",
                }, ...__VLS_functionalComponentArgsRest(__VLS_325));
                const __VLS_328 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
                    label: "TSV",
                    value: "TSV",
                }));
                const __VLS_330 = __VLS_329({
                    label: "TSV",
                    value: "TSV",
                }, ...__VLS_functionalComponentArgsRest(__VLS_329));
                var __VLS_319;
                var __VLS_315;
                const __VLS_332 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
                    label: "首行设置",
                    ...{ class: "runtime-form-item" },
                }));
                const __VLS_334 = __VLS_333({
                    label: "首行设置",
                    ...{ class: "runtime-form-item" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_333));
                __VLS_335.slots.default;
                const __VLS_336 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
                    modelValue: (__VLS_ctx.tableRuntimeForm.hasHeader),
                    placeholder: "沿用数据源",
                }));
                const __VLS_338 = __VLS_337({
                    modelValue: (__VLS_ctx.tableRuntimeForm.hasHeader),
                    placeholder: "沿用数据源",
                }, ...__VLS_functionalComponentArgsRest(__VLS_337));
                __VLS_339.slots.default;
                const __VLS_340 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
                    label: "沿用数据源",
                    value: "",
                }));
                const __VLS_342 = __VLS_341({
                    label: "沿用数据源",
                    value: "",
                }, ...__VLS_functionalComponentArgsRest(__VLS_341));
                const __VLS_344 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
                    label: "首行为表头",
                    value: "true",
                }));
                const __VLS_346 = __VLS_345({
                    label: "首行为表头",
                    value: "true",
                }, ...__VLS_functionalComponentArgsRest(__VLS_345));
                const __VLS_348 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
                    label: "首行即数据",
                    value: "false",
                }));
                const __VLS_350 = __VLS_349({
                    label: "首行即数据",
                    value: "false",
                }, ...__VLS_functionalComponentArgsRest(__VLS_349));
                var __VLS_339;
                var __VLS_335;
                const __VLS_352 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
                    label: "表格内容覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }));
                const __VLS_354 = __VLS_353({
                    label: "表格内容覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_353));
                __VLS_355.slots.default;
                const __VLS_356 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
                    modelValue: (__VLS_ctx.tableRuntimeForm.text),
                    type: "textarea",
                    rows: (7),
                    placeholder: "可选。留空则直接使用数据源里的 CSV/TSV 内容。",
                }));
                const __VLS_358 = __VLS_357({
                    modelValue: (__VLS_ctx.tableRuntimeForm.text),
                    type: "textarea",
                    rows: (7),
                    placeholder: "可选。留空则直接使用数据源里的 CSV/TSV 内容。",
                }, ...__VLS_functionalComponentArgsRest(__VLS_357));
                var __VLS_355;
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-card" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-editor-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "runtime-editor-tip" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "runtime-form-grid" },
                });
                const __VLS_360 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
                    label: "结果路径覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }));
                const __VLS_362 = __VLS_361({
                    label: "结果路径覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_361));
                __VLS_363.slots.default;
                const __VLS_364 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
                    modelValue: (__VLS_ctx.jsonRuntimeForm.resultPath),
                    placeholder: "例如 data.records",
                }));
                const __VLS_366 = __VLS_365({
                    modelValue: (__VLS_ctx.jsonRuntimeForm.resultPath),
                    placeholder: "例如 data.records",
                }, ...__VLS_functionalComponentArgsRest(__VLS_365));
                var __VLS_363;
                const __VLS_368 = {}.ElFormItem;
                /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
                // @ts-ignore
                const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
                    label: "JSON 内容覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }));
                const __VLS_370 = __VLS_369({
                    label: "JSON 内容覆盖（可选）",
                    ...{ class: "runtime-form-item runtime-form-item--full" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_369));
                __VLS_371.slots.default;
                const __VLS_372 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
                    modelValue: (__VLS_ctx.jsonRuntimeForm.text),
                    type: "textarea",
                    rows: (7),
                    placeholder: '可选。留空则直接使用数据源里的 JSON 内容，例如 [{"region":"华东","value":120}]',
                }));
                const __VLS_374 = __VLS_373({
                    modelValue: (__VLS_ctx.jsonRuntimeForm.text),
                    type: "textarea",
                    rows: (7),
                    placeholder: '可选。留空则直接使用数据源里的 JSON 内容，例如 [{"region":"华东","value":120}]',
                }, ...__VLS_functionalComponentArgsRest(__VLS_373));
                var __VLS_371;
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "action-row" },
            });
            const __VLS_376 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                loading: (__VLS_ctx.previewLoading),
            }));
            const __VLS_378 = __VLS_377({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
                loading: (__VLS_ctx.previewLoading),
            }, ...__VLS_functionalComponentArgsRest(__VLS_377));
            let __VLS_380;
            let __VLS_381;
            let __VLS_382;
            const __VLS_383 = {
                onClick: (__VLS_ctx.onPageSourceQuery)
            };
            __VLS_379.slots.default;
            var __VLS_379;
        }
        if (__VLS_ctx.suggestionSummary.length && !__VLS_ctx.isTableComponentType) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_384 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }));
            const __VLS_386 = __VLS_385({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_385));
            let __VLS_388;
            let __VLS_389;
            let __VLS_390;
            const __VLS_391 = {
                onClick: (__VLS_ctx.applySuggestedFields)
            };
            __VLS_387.slots.default;
            var __VLS_387;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggestion-body" },
            });
            (__VLS_ctx.suggestionSummary.join(' · '));
        }
        const __VLS_392 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
            label: "刷新数据时间（秒）",
        }));
        const __VLS_394 = __VLS_393({
            label: "刷新数据时间（秒）",
        }, ...__VLS_functionalComponentArgsRest(__VLS_393));
        __VLS_395.slots.default;
        const __VLS_396 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
            modelValue: (__VLS_ctx.configForm.chart.dataRefreshInterval),
            min: (0),
            max: (86400),
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_398 = __VLS_397({
            modelValue: (__VLS_ctx.configForm.chart.dataRefreshInterval),
            min: (0),
            max: (86400),
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_397));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
        });
        var __VLS_395;
        if (__VLS_ctx.isTableComponentType) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-column-editor" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-column-editor__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_400 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }));
            const __VLS_402 = __VLS_401({
                ...{ 'onClick': {} },
                size: "small",
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_401));
            let __VLS_404;
            let __VLS_405;
            let __VLS_406;
            const __VLS_407 = {
                onClick: (__VLS_ctx.addTableColumn)
            };
            __VLS_403.slots.default;
            var __VLS_403;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-column-editor__hint" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-column-editor__list" },
            });
            if (!__VLS_ctx.configForm.chart.tableCustomColumns.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "table-column-editor__empty" },
                });
            }
            for (const [column, index] of __VLS_getVForSourceType((__VLS_ctx.configForm.chart.tableCustomColumns))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onDragstart: (...[$event]) => {
                            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                                return;
                            if (!(__VLS_ctx.showDataTab))
                                return;
                            if (!(__VLS_ctx.isTableComponentType))
                                return;
                            __VLS_ctx.onTableColumnDragStart(index);
                        } },
                    ...{ onDragend: (__VLS_ctx.clearTableColumnDrag) },
                    ...{ onDragover: () => { } },
                    ...{ onDrop: (...[$event]) => {
                            if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                                return;
                            if (!(__VLS_ctx.showDataTab))
                                return;
                            if (!(__VLS_ctx.isTableComponentType))
                                return;
                            __VLS_ctx.onTableColumnDrop(index);
                        } },
                    key: (column.id),
                    ...{ class: "table-column-item" },
                    draggable: "true",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "table-column-item__label" },
                });
                (index + 1);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "table-column-item__grid" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "table-column-field" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                const __VLS_408 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
                    ...{ 'onChange': {} },
                    modelValue: (column.field),
                    placeholder: "选择字段",
                    filterable: true,
                    clearable: true,
                    ...{ style: {} },
                }));
                const __VLS_410 = __VLS_409({
                    ...{ 'onChange': {} },
                    modelValue: (column.field),
                    placeholder: "选择字段",
                    filterable: true,
                    clearable: true,
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_409));
                let __VLS_412;
                let __VLS_413;
                let __VLS_414;
                const __VLS_415 = {
                    onChange: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.showDataTab))
                            return;
                        if (!(__VLS_ctx.isTableComponentType))
                            return;
                        __VLS_ctx.handleTableColumnFieldChange(index);
                    }
                };
                __VLS_411.slots.default;
                for (const [field] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                    const __VLS_416 = {}.ElOption;
                    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                    // @ts-ignore
                    const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({
                        key: (field),
                        label: (field),
                        value: (field),
                    }));
                    const __VLS_418 = __VLS_417({
                        key: (field),
                        label: (field),
                        value: (field),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_417));
                }
                var __VLS_411;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "table-column-field" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                const __VLS_420 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
                    modelValue: (column.label),
                    placeholder: "列名称(可修改)",
                }));
                const __VLS_422 = __VLS_421({
                    modelValue: (column.label),
                    placeholder: "列名称(可修改)",
                }, ...__VLS_functionalComponentArgsRest(__VLS_421));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "table-column-field" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                const __VLS_424 = {}.ElInputNumber;
                /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
                // @ts-ignore
                const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
                    modelValue: (column.width),
                    min: (80),
                    max: (480),
                    controlsPosition: "right",
                    ...{ style: {} },
                }));
                const __VLS_426 = __VLS_425({
                    modelValue: (column.width),
                    min: (80),
                    max: (480),
                    controlsPosition: "right",
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_425));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    ...{ class: "table-column-field" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                const __VLS_428 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
                    modelValue: (column.align),
                    ...{ style: {} },
                }));
                const __VLS_430 = __VLS_429({
                    modelValue: (column.align),
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_429));
                __VLS_431.slots.default;
                const __VLS_432 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
                    label: "居左对齐",
                    value: "left",
                }));
                const __VLS_434 = __VLS_433({
                    label: "居左对齐",
                    value: "left",
                }, ...__VLS_functionalComponentArgsRest(__VLS_433));
                const __VLS_436 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
                    label: "居中对齐",
                    value: "center",
                }));
                const __VLS_438 = __VLS_437({
                    label: "居中对齐",
                    value: "center",
                }, ...__VLS_functionalComponentArgsRest(__VLS_437));
                const __VLS_440 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
                    label: "居右对齐",
                    value: "right",
                }));
                const __VLS_442 = __VLS_441({
                    label: "居右对齐",
                    value: "right",
                }, ...__VLS_functionalComponentArgsRest(__VLS_441));
                var __VLS_431;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "table-column-item__actions" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "table-column-item__drag" },
                });
                const __VLS_444 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_445 = __VLS_asFunctionalComponent(__VLS_444, new __VLS_444({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }));
                const __VLS_446 = __VLS_445({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_445));
                let __VLS_448;
                let __VLS_449;
                let __VLS_450;
                const __VLS_451 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.showDataTab))
                            return;
                        if (!(__VLS_ctx.isTableComponentType))
                            return;
                        __VLS_ctx.removeTableColumn(index);
                    }
                };
                __VLS_447.slots.default;
                var __VLS_447;
            }
        }
        if (__VLS_ctx.currentChartMeta.requiresDimension || __VLS_ctx.currentChartMeta.allowsOptionalDimension || __VLS_ctx.isFilterComponentType || __VLS_ctx.isMetricComponentType) {
            const __VLS_452 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_453 = __VLS_asFunctionalComponent(__VLS_452, new __VLS_452({
                label: (__VLS_ctx.dimensionFieldLabel),
            }));
            const __VLS_454 = __VLS_453({
                label: (__VLS_ctx.dimensionFieldLabel),
            }, ...__VLS_functionalComponentArgsRest(__VLS_453));
            __VLS_455.slots.default;
            const __VLS_456 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
                modelValue: (__VLS_ctx.configForm.chart.xField),
                placeholder: (`选择${__VLS_ctx.dimensionFieldLabel}`),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_458 = __VLS_457({
                modelValue: (__VLS_ctx.configForm.chart.xField),
                placeholder: (`选择${__VLS_ctx.dimensionFieldLabel}`),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_457));
            __VLS_459.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_460 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_461 = __VLS_asFunctionalComponent(__VLS_460, new __VLS_460({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_462 = __VLS_461({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_461));
            }
            var __VLS_459;
            var __VLS_455;
        }
        if (__VLS_ctx.currentChartMeta.requiresMetric || __VLS_ctx.isMetricComponentType) {
            const __VLS_464 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
                label: (__VLS_ctx.metricFieldLabel),
            }));
            const __VLS_466 = __VLS_465({
                label: (__VLS_ctx.metricFieldLabel),
            }, ...__VLS_functionalComponentArgsRest(__VLS_465));
            __VLS_467.slots.default;
            const __VLS_468 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_469 = __VLS_asFunctionalComponent(__VLS_468, new __VLS_468({
                modelValue: (__VLS_ctx.configForm.chart.yField),
                placeholder: (`选择${__VLS_ctx.metricFieldLabel}`),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_470 = __VLS_469({
                modelValue: (__VLS_ctx.configForm.chart.yField),
                placeholder: (`选择${__VLS_ctx.metricFieldLabel}`),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_469));
            __VLS_471.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_472 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_474 = __VLS_473({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_473));
            }
            var __VLS_471;
            var __VLS_467;
        }
        if (__VLS_ctx.currentChartMeta.allowsGroup || __VLS_ctx.isMetricComponentType) {
            const __VLS_476 = {}.ElFormItem;
            /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
            // @ts-ignore
            const __VLS_477 = __VLS_asFunctionalComponent(__VLS_476, new __VLS_476({
                label: (__VLS_ctx.groupFieldLabel),
            }));
            const __VLS_478 = __VLS_477({
                label: (__VLS_ctx.groupFieldLabel),
            }, ...__VLS_functionalComponentArgsRest(__VLS_477));
            __VLS_479.slots.default;
            const __VLS_480 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
                modelValue: (__VLS_ctx.configForm.chart.groupField),
                placeholder: (__VLS_ctx.currentChartMeta.requiresGroup ? `选择${__VLS_ctx.groupFieldLabel}` : '可选'),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_482 = __VLS_481({
                modelValue: (__VLS_ctx.configForm.chart.groupField),
                placeholder: (__VLS_ctx.currentChartMeta.requiresGroup ? `选择${__VLS_ctx.groupFieldLabel}` : '可选'),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_481));
            __VLS_483.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_484 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_485 = __VLS_asFunctionalComponent(__VLS_484, new __VLS_484({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_486 = __VLS_485({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_485));
            }
            var __VLS_483;
            var __VLS_479;
        }
        var __VLS_159;
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
            (__VLS_ctx.previewColumnSummary);
            const __VLS_488 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({
                data: (__VLS_ctx.previewRows.slice(0, 5)),
                size: "small",
                maxHeight: "240",
                border: true,
            }));
            const __VLS_490 = __VLS_489({
                data: (__VLS_ctx.previewRows.slice(0, 5)),
                size: "small",
                maxHeight: "240",
                border: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_489));
            __VLS_491.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewVisibleColumns))) {
                const __VLS_492 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_493 = __VLS_asFunctionalComponent(__VLS_492, new __VLS_492({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                }));
                const __VLS_494 = __VLS_493({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    showOverflowTooltip: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_493));
            }
            var __VLS_491;
        }
        if (__VLS_ctx.isTableComponentType && __VLS_ctx.tablePreviewJson) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-card preview-card--json" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                ...{ class: "query-json-block" },
            });
            (__VLS_ctx.tablePreviewJson);
        }
        var __VLS_155;
    }
    const __VLS_496 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({
        label: "样式",
        name: "style",
    }));
    const __VLS_498 = __VLS_497({
        label: "样式",
        name: "style",
    }, ...__VLS_functionalComponentArgsRest(__VLS_497));
    __VLS_499.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-sections" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-family-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-family-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "style-family-badge" },
    });
    (__VLS_ctx.componentKindLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "style-family-tags" },
    });
    for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.styleCapabilityTags))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (tag),
            ...{ class: "style-family-tag" },
        });
        (tag);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_500 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_501 = __VLS_asFunctionalComponent(__VLS_500, new __VLS_500({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }));
    const __VLS_502 = __VLS_501({
        modelValue: (__VLS_ctx.configForm.style.theme),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_501));
    __VLS_503.slots.default;
    for (const [name] of __VLS_getVForSourceType((__VLS_ctx.themeNames))) {
        const __VLS_504 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_505 = __VLS_asFunctionalComponent(__VLS_504, new __VLS_504({
            key: (name),
            label: (name),
            value: (name),
        }));
        const __VLS_506 = __VLS_505({
            key: (name),
            label: (name),
            value: (name),
        }, ...__VLS_functionalComponentArgsRest(__VLS_505));
    }
    var __VLS_503;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    if (!__VLS_ctx.isDecorationComponentType) {
        const __VLS_508 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
            modelValue: (__VLS_ctx.configForm.style.bgColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_510 = __VLS_509({
            modelValue: (__VLS_ctx.configForm.style.bgColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_509));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "helper-text" },
        });
    }
    if (__VLS_ctx.showTitleSection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.showTitleSection))
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
        const __VLS_512 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showTitle),
            size: "small",
        }));
        const __VLS_514 = __VLS_513({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showTitle),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_513));
        let __VLS_516;
        let __VLS_517;
        let __VLS_518;
        const __VLS_519 = {
            onClick: () => { }
        };
        var __VLS_515;
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
        const __VLS_520 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
            modelValue: (__VLS_ctx.configForm.style.titleText),
            size: "small",
            placeholder: "默认用组件名",
        }));
        const __VLS_522 = __VLS_521({
            modelValue: (__VLS_ctx.configForm.style.titleText),
            size: "small",
            placeholder: "默认用组件名",
        }, ...__VLS_functionalComponentArgsRest(__VLS_521));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_524 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
            modelValue: (__VLS_ctx.configForm.style.titleFontSize),
            min: (10),
            max: (32),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_526 = __VLS_525({
            modelValue: (__VLS_ctx.configForm.style.titleFontSize),
            min: (10),
            max: (32),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_525));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_528 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
            modelValue: (__VLS_ctx.configForm.style.titleColor),
            size: "small",
        }));
        const __VLS_530 = __VLS_529({
            modelValue: (__VLS_ctx.configForm.style.titleColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_529));
    }
    if (__VLS_ctx.isIframeType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isIframeType))
                        return;
                    __VLS_ctx.toggleSection('iframe');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('iframe') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('iframe')) }, null, null);
        if (__VLS_ctx.currentChartType === 'iframe_single') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row ss-row--vertical" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_532 = {}.ElInput;
            /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
            // @ts-ignore
            const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({
                modelValue: (__VLS_ctx.configForm.style.iframeUrl),
                size: "small",
                placeholder: "https://example.com",
                clearable: true,
            }));
            const __VLS_534 = __VLS_533({
                modelValue: (__VLS_ctx.configForm.style.iframeUrl),
                size: "small",
                placeholder: "https://example.com",
                clearable: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_533));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row ss-row--vertical" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "iframe-tabs-list" },
            });
            for (const [tab, idx] of __VLS_getVForSourceType((__VLS_ctx.configForm.style.iframeTabs))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (idx),
                    ...{ class: "iframe-tab-row" },
                });
                const __VLS_536 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
                    modelValue: (tab.label),
                    size: "small",
                    placeholder: "页签名称",
                    ...{ style: {} },
                }));
                const __VLS_538 = __VLS_537({
                    modelValue: (tab.label),
                    size: "small",
                    placeholder: "页签名称",
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_537));
                const __VLS_540 = {}.ElInput;
                /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                // @ts-ignore
                const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({
                    modelValue: (tab.url),
                    size: "small",
                    placeholder: "https://example.com",
                    ...{ style: {} },
                }));
                const __VLS_542 = __VLS_541({
                    modelValue: (tab.url),
                    size: "small",
                    placeholder: "https://example.com",
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_541));
                const __VLS_544 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_545 = __VLS_asFunctionalComponent(__VLS_544, new __VLS_544({
                    ...{ 'onClick': {} },
                    link: true,
                    size: "small",
                    type: "danger",
                }));
                const __VLS_546 = __VLS_545({
                    ...{ 'onClick': {} },
                    link: true,
                    size: "small",
                    type: "danger",
                }, ...__VLS_functionalComponentArgsRest(__VLS_545));
                let __VLS_548;
                let __VLS_549;
                let __VLS_550;
                const __VLS_551 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.isIframeType))
                            return;
                        if (!!(__VLS_ctx.currentChartType === 'iframe_single'))
                            return;
                        __VLS_ctx.configForm.style.iframeTabs.splice(idx, 1);
                    }
                };
                __VLS_547.slots.default;
                var __VLS_547;
            }
            const __VLS_552 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_553 = __VLS_asFunctionalComponent(__VLS_552, new __VLS_552({
                ...{ 'onClick': {} },
                size: "small",
            }));
            const __VLS_554 = __VLS_553({
                ...{ 'onClick': {} },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_553));
            let __VLS_556;
            let __VLS_557;
            let __VLS_558;
            const __VLS_559 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isIframeType))
                        return;
                    if (!!(__VLS_ctx.currentChartType === 'iframe_single'))
                        return;
                    __VLS_ctx.configForm.style.iframeTabs.push({ label: `页签${__VLS_ctx.configForm.style.iframeTabs.length + 1}`, url: '' });
                }
            };
            __VLS_555.slots.default;
            var __VLS_555;
        }
    }
    if (__VLS_ctx.isTextBlockType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isTextBlockType))
                        return;
                    __VLS_ctx.toggleSection('textcontent');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('textcontent') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('textcontent')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row ss-row--vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_560 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_561 = __VLS_asFunctionalComponent(__VLS_560, new __VLS_560({
            modelValue: (__VLS_ctx.configForm.style.textContent),
            type: "textarea",
            rows: (4),
            size: "small",
            placeholder: "输入文本内容，也可绑定数据源动态展示",
        }));
        const __VLS_562 = __VLS_561({
            modelValue: (__VLS_ctx.configForm.style.textContent),
            type: "textarea",
            rows: (4),
            size: "small",
            placeholder: "输入文本内容，也可绑定数据源动态展示",
        }, ...__VLS_functionalComponentArgsRest(__VLS_561));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "helper-text" },
            ...{ style: {} },
        });
    }
    if (__VLS_ctx.showLegendSection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.showLegendSection))
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
        const __VLS_564 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_565 = __VLS_asFunctionalComponent(__VLS_564, new __VLS_564({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }));
        const __VLS_566 = __VLS_565({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLegend),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_565));
        let __VLS_568;
        let __VLS_569;
        let __VLS_570;
        const __VLS_571 = {
            onClick: () => { }
        };
        var __VLS_567;
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
        const __VLS_572 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_573 = __VLS_asFunctionalComponent(__VLS_572, new __VLS_572({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_574 = __VLS_573({
            modelValue: (__VLS_ctx.configForm.style.legendPos),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_573));
        __VLS_575.slots.default;
        const __VLS_576 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_577 = __VLS_asFunctionalComponent(__VLS_576, new __VLS_576({
            label: "底部",
            value: "bottom",
        }));
        const __VLS_578 = __VLS_577({
            label: "底部",
            value: "bottom",
        }, ...__VLS_functionalComponentArgsRest(__VLS_577));
        const __VLS_580 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_581 = __VLS_asFunctionalComponent(__VLS_580, new __VLS_580({
            label: "顶部",
            value: "top",
        }));
        const __VLS_582 = __VLS_581({
            label: "顶部",
            value: "top",
        }, ...__VLS_functionalComponentArgsRest(__VLS_581));
        const __VLS_584 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_585 = __VLS_asFunctionalComponent(__VLS_584, new __VLS_584({
            label: "右侧",
            value: "right",
        }));
        const __VLS_586 = __VLS_585({
            label: "右侧",
            value: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_585));
        var __VLS_575;
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
    const __VLS_588 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_589 = __VLS_asFunctionalComponent(__VLS_588, new __VLS_588({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }));
    const __VLS_590 = __VLS_589({
        ...{ 'onClick': {} },
        modelValue: (__VLS_ctx.configForm.style.borderShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_589));
    let __VLS_592;
    let __VLS_593;
    let __VLS_594;
    const __VLS_595 = {
        onClick: () => { }
    };
    var __VLS_591;
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
    const __VLS_596 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_597 = __VLS_asFunctionalComponent(__VLS_596, new __VLS_596({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_598 = __VLS_597({
        modelValue: (__VLS_ctx.configForm.style.borderColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_597));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_600 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_601 = __VLS_asFunctionalComponent(__VLS_600, new __VLS_600({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_602 = __VLS_601({
        modelValue: (__VLS_ctx.configForm.style.borderWidth),
        min: (1),
        max: (8),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_601));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_604 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_605 = __VLS_asFunctionalComponent(__VLS_604, new __VLS_604({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_606 = __VLS_605({
        modelValue: (__VLS_ctx.configForm.style.cardRadius),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_605));
    if (__VLS_ctx.showLabelSection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.showLabelSection))
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
        const __VLS_608 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_609 = __VLS_asFunctionalComponent(__VLS_608, new __VLS_608({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLabel),
            size: "small",
        }));
        const __VLS_610 = __VLS_609({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showLabel),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_609));
        let __VLS_612;
        let __VLS_613;
        let __VLS_614;
        const __VLS_615 = {
            onClick: () => { }
        };
        var __VLS_611;
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
        const __VLS_616 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_617 = __VLS_asFunctionalComponent(__VLS_616, new __VLS_616({
            modelValue: (__VLS_ctx.configForm.style.labelSize),
            min: (8),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_618 = __VLS_617({
            modelValue: (__VLS_ctx.configForm.style.labelSize),
            min: (8),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_617));
    }
    if (__VLS_ctx.showTooltipSection) {
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
        const __VLS_620 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_621 = __VLS_asFunctionalComponent(__VLS_620, new __VLS_620({
            modelValue: (__VLS_ctx.configForm.style.showTooltip),
            size: "small",
        }));
        const __VLS_622 = __VLS_621({
            modelValue: (__VLS_ctx.configForm.style.showTooltip),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_621));
    }
    if (__VLS_ctx.showAxisSections) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.showAxisSections))
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
        const __VLS_624 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_625 = __VLS_asFunctionalComponent(__VLS_624, new __VLS_624({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }));
        const __VLS_626 = __VLS_625({
            ...{ 'onClick': {} },
            modelValue: (__VLS_ctx.configForm.style.showXName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_625));
        let __VLS_628;
        let __VLS_629;
        let __VLS_630;
        const __VLS_631 = {
            onClick: () => { }
        };
        var __VLS_627;
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
        const __VLS_632 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_633 = __VLS_asFunctionalComponent(__VLS_632, new __VLS_632({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }));
        const __VLS_634 = __VLS_633({
            modelValue: (__VLS_ctx.configForm.style.showGrid),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_633));
    }
    if (__VLS_ctx.showAxisSections) {
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
        const __VLS_636 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_637 = __VLS_asFunctionalComponent(__VLS_636, new __VLS_636({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }));
        const __VLS_638 = __VLS_637({
            modelValue: (__VLS_ctx.configForm.style.showYName),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_637));
    }
    if (__VLS_ctx.showChartAdvancedSection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.showChartAdvancedSection))
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
            const __VLS_640 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_641 = __VLS_asFunctionalComponent(__VLS_640, new __VLS_640({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }));
            const __VLS_642 = __VLS_641({
                modelValue: (__VLS_ctx.configForm.style.smooth),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_641));
        }
        if (__VLS_ctx.currentChartMeta.supportsAreaFill) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_644 = {}.ElSwitch;
            /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
            // @ts-ignore
            const __VLS_645 = __VLS_asFunctionalComponent(__VLS_644, new __VLS_644({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }));
            const __VLS_646 = __VLS_645({
                modelValue: (__VLS_ctx.configForm.style.areaFill),
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_645));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_648 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_649 = __VLS_asFunctionalComponent(__VLS_648, new __VLS_648({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_650 = __VLS_649({
                modelValue: (__VLS_ctx.configForm.style.barRadius),
                min: (0),
                max: (20),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_649));
        }
        if (__VLS_ctx.currentChartMeta.supportsBarStyle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ss-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ss-key" },
            });
            const __VLS_652 = {}.ElInputNumber;
            /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_653 = __VLS_asFunctionalComponent(__VLS_652, new __VLS_652({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }));
            const __VLS_654 = __VLS_653({
                modelValue: (__VLS_ctx.configForm.style.barMaxWidth),
                min: (10),
                max: (80),
                size: "small",
                controlsPosition: "right",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_653));
        }
    }
    if (__VLS_ctx.isTableComponentType) {
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
                    if (!(__VLS_ctx.isTableComponentType))
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
        const __VLS_656 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_657 = __VLS_asFunctionalComponent(__VLS_656, new __VLS_656({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_658 = __VLS_657({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_657));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_660 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_661 = __VLS_asFunctionalComponent(__VLS_660, new __VLS_660({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }));
        const __VLS_662 = __VLS_661({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_661));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_664 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_665 = __VLS_asFunctionalComponent(__VLS_664, new __VLS_664({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_666 = __VLS_665({
            modelValue: (__VLS_ctx.configForm.style.tableHeaderFontSize),
            min: (10),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_665));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isTableComponentType))
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
        const __VLS_668 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_669 = __VLS_asFunctionalComponent(__VLS_668, new __VLS_668({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }));
        const __VLS_670 = __VLS_669({
            modelValue: (__VLS_ctx.configForm.style.tableStriped),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_669));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_672 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_673 = __VLS_asFunctionalComponent(__VLS_672, new __VLS_672({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_674 = __VLS_673({
            modelValue: (__VLS_ctx.configForm.style.tableOddRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_673));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_676 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_677 = __VLS_asFunctionalComponent(__VLS_676, new __VLS_676({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_678 = __VLS_677({
            modelValue: (__VLS_ctx.configForm.style.tableEvenRowBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_677));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_680 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_681 = __VLS_asFunctionalComponent(__VLS_680, new __VLS_680({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_682 = __VLS_681({
            modelValue: (__VLS_ctx.configForm.style.tableRowHoverBg),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_681));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_684 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_685 = __VLS_asFunctionalComponent(__VLS_684, new __VLS_684({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_686 = __VLS_685({
            modelValue: (__VLS_ctx.configForm.style.tableRowHeight),
            min: (24),
            max: (80),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_685));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_688 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_689 = __VLS_asFunctionalComponent(__VLS_688, new __VLS_688({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }));
        const __VLS_690 = __VLS_689({
            modelValue: (__VLS_ctx.configForm.style.tableFontColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_689));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_692 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_693 = __VLS_asFunctionalComponent(__VLS_692, new __VLS_692({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_694 = __VLS_693({
            modelValue: (__VLS_ctx.configForm.style.tableFontSize),
            min: (10),
            max: (20),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_693));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isTableComponentType))
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
        const __VLS_696 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_697 = __VLS_asFunctionalComponent(__VLS_696, new __VLS_696({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_698 = __VLS_697({
            modelValue: (__VLS_ctx.configForm.style.tableBorderColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_697));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_700 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_701 = __VLS_asFunctionalComponent(__VLS_700, new __VLS_700({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_702 = __VLS_701({
            modelValue: (__VLS_ctx.configForm.style.tableBorderWidth),
            min: (0),
            max: (4),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_701));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isTableComponentType))
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
        const __VLS_704 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_705 = __VLS_asFunctionalComponent(__VLS_704, new __VLS_704({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }));
        const __VLS_706 = __VLS_705({
            modelValue: (__VLS_ctx.configForm.style.tableShowIndex),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_705));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_708 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_709 = __VLS_asFunctionalComponent(__VLS_708, new __VLS_708({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }));
        const __VLS_710 = __VLS_709({
            modelValue: (__VLS_ctx.configForm.style.tableEnableSort),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_709));
    }
    if (__VLS_ctx.isMetricComponentType) {
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
                    if (!(__VLS_ctx.isMetricComponentType))
                        return;
                    __VLS_ctx.toggleSection('metric-value');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('metric-value') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('metric-value')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_712 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_713 = __VLS_asFunctionalComponent(__VLS_712, new __VLS_712({
            modelValue: (__VLS_ctx.configForm.style.metricValueFontSize),
            min: (16),
            max: (120),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_714 = __VLS_713({
            modelValue: (__VLS_ctx.configForm.style.metricValueFontSize),
            min: (16),
            max: (120),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_713));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_716 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_717 = __VLS_asFunctionalComponent(__VLS_716, new __VLS_716({
            modelValue: (__VLS_ctx.configForm.style.metricValueColor),
            size: "small",
        }));
        const __VLS_718 = __VLS_717({
            modelValue: (__VLS_ctx.configForm.style.metricValueColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_717));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_720 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_721 = __VLS_asFunctionalComponent(__VLS_720, new __VLS_720({
            modelValue: (__VLS_ctx.configForm.style.metricPrefix),
            size: "small",
            placeholder: "如 ¥ / %",
            ...{ style: {} },
        }));
        const __VLS_722 = __VLS_721({
            modelValue: (__VLS_ctx.configForm.style.metricPrefix),
            size: "small",
            placeholder: "如 ¥ / %",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_721));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_724 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_725 = __VLS_asFunctionalComponent(__VLS_724, new __VLS_724({
            modelValue: (__VLS_ctx.configForm.style.metricSuffix),
            size: "small",
            placeholder: "如 万元 / 件",
            ...{ style: {} },
        }));
        const __VLS_726 = __VLS_725({
            modelValue: (__VLS_ctx.configForm.style.metricSuffix),
            size: "small",
            placeholder: "如 万元 / 件",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_725));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                        return;
                    if (!(__VLS_ctx.isMetricComponentType))
                        return;
                    __VLS_ctx.toggleSection('metric-trend');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('metric-trend') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('metric-trend')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_728 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_729 = __VLS_asFunctionalComponent(__VLS_728, new __VLS_728({
            modelValue: (__VLS_ctx.configForm.style.metricTrendUpColor),
            size: "small",
        }));
        const __VLS_730 = __VLS_729({
            modelValue: (__VLS_ctx.configForm.style.metricTrendUpColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_729));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_732 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_733 = __VLS_asFunctionalComponent(__VLS_732, new __VLS_732({
            modelValue: (__VLS_ctx.configForm.style.metricTrendDownColor),
            size: "small",
        }));
        const __VLS_734 = __VLS_733({
            modelValue: (__VLS_ctx.configForm.style.metricTrendDownColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_733));
    }
    if (__VLS_ctx.isWordCloudType) {
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
                    if (!(__VLS_ctx.isWordCloudType))
                        return;
                    __VLS_ctx.toggleSection('wordcloud');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('wordcloud') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('wordcloud')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_736 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_737 = __VLS_asFunctionalComponent(__VLS_736, new __VLS_736({
            modelValue: (__VLS_ctx.configForm.style.wordCloudMinSize),
            min: (8),
            max: (32),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_738 = __VLS_737({
            modelValue: (__VLS_ctx.configForm.style.wordCloudMinSize),
            min: (8),
            max: (32),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_737));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_740 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_741 = __VLS_asFunctionalComponent(__VLS_740, new __VLS_740({
            modelValue: (__VLS_ctx.configForm.style.wordCloudMaxSize),
            min: (20),
            max: (120),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_742 = __VLS_741({
            modelValue: (__VLS_ctx.configForm.style.wordCloudMaxSize),
            min: (20),
            max: (120),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_741));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_744 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_745 = __VLS_asFunctionalComponent(__VLS_744, new __VLS_744({
            modelValue: (__VLS_ctx.configForm.style.wordCloudRotation),
            min: (0),
            max: (90),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_746 = __VLS_745({
            modelValue: (__VLS_ctx.configForm.style.wordCloudRotation),
            min: (0),
            max: (90),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_745));
    }
    if (__VLS_ctx.isListType) {
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
                    if (!(__VLS_ctx.isListType))
                        return;
                    __VLS_ctx.toggleSection('list-style');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('list-style') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('list-style')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_748 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_749 = __VLS_asFunctionalComponent(__VLS_748, new __VLS_748({
            modelValue: (__VLS_ctx.configForm.style.listItemGap),
            min: (0),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_750 = __VLS_749({
            modelValue: (__VLS_ctx.configForm.style.listItemGap),
            min: (0),
            max: (24),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_749));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_752 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_753 = __VLS_asFunctionalComponent(__VLS_752, new __VLS_752({
            modelValue: (__VLS_ctx.configForm.style.listMaxItems),
            min: (1),
            max: (50),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_754 = __VLS_753({
            modelValue: (__VLS_ctx.configForm.style.listMaxItems),
            min: (1),
            max: (50),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_753));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_756 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_757 = __VLS_asFunctionalComponent(__VLS_756, new __VLS_756({
            modelValue: (__VLS_ctx.configForm.style.listScrollAnimation),
            size: "small",
        }));
        const __VLS_758 = __VLS_757({
            modelValue: (__VLS_ctx.configForm.style.listScrollAnimation),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_757));
    }
    if (__VLS_ctx.isFilterComponentType) {
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
                    if (!(__VLS_ctx.isFilterComponentType))
                        return;
                    __VLS_ctx.toggleSection('filter-style');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('filter-style') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('filter-style')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_760 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_761 = __VLS_asFunctionalComponent(__VLS_760, new __VLS_760({
            modelValue: (__VLS_ctx.configForm.style.filterBtnSize),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_762 = __VLS_761({
            modelValue: (__VLS_ctx.configForm.style.filterBtnSize),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_761));
        __VLS_763.slots.default;
        const __VLS_764 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_765 = __VLS_asFunctionalComponent(__VLS_764, new __VLS_764({
            label: "小",
            value: "small",
        }));
        const __VLS_766 = __VLS_765({
            label: "小",
            value: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_765));
        const __VLS_768 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_769 = __VLS_asFunctionalComponent(__VLS_768, new __VLS_768({
            label: "默认",
            value: "default",
        }));
        const __VLS_770 = __VLS_769({
            label: "默认",
            value: "default",
        }, ...__VLS_functionalComponentArgsRest(__VLS_769));
        const __VLS_772 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_773 = __VLS_asFunctionalComponent(__VLS_772, new __VLS_772({
            label: "大",
            value: "large",
        }));
        const __VLS_774 = __VLS_773({
            label: "大",
            value: "large",
        }, ...__VLS_functionalComponentArgsRest(__VLS_773));
        var __VLS_763;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_776 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_777 = __VLS_asFunctionalComponent(__VLS_776, new __VLS_776({
            modelValue: (__VLS_ctx.configForm.style.filterActiveColor),
            size: "small",
        }));
        const __VLS_778 = __VLS_777({
            modelValue: (__VLS_ctx.configForm.style.filterActiveColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_777));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_780 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_781 = __VLS_asFunctionalComponent(__VLS_780, new __VLS_780({
            modelValue: (__VLS_ctx.configForm.style.filterLayout),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_782 = __VLS_781({
            modelValue: (__VLS_ctx.configForm.style.filterLayout),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_781));
        __VLS_783.slots.default;
        const __VLS_784 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_785 = __VLS_asFunctionalComponent(__VLS_784, new __VLS_784({
            label: "水平",
            value: "horizontal",
        }));
        const __VLS_786 = __VLS_785({
            label: "水平",
            value: "horizontal",
        }, ...__VLS_functionalComponentArgsRest(__VLS_785));
        const __VLS_788 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_789 = __VLS_asFunctionalComponent(__VLS_788, new __VLS_788({
            label: "垂直",
            value: "vertical",
        }));
        const __VLS_790 = __VLS_789({
            label: "垂直",
            value: "vertical",
        }, ...__VLS_functionalComponentArgsRest(__VLS_789));
        var __VLS_783;
    }
    if (__VLS_ctx.isDecorationComponentType) {
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
                    if (!(__VLS_ctx.isDecorationComponentType))
                        return;
                    __VLS_ctx.toggleSection('decor-style');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('decor-style') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('decor-style')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_792 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_793 = __VLS_asFunctionalComponent(__VLS_792, new __VLS_792({
            modelValue: (__VLS_ctx.configForm.style.decorAnimSpeed),
            min: (0.5),
            max: (20),
            step: (0.5),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_794 = __VLS_793({
            modelValue: (__VLS_ctx.configForm.style.decorAnimSpeed),
            min: (0.5),
            max: (20),
            step: (0.5),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_793));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_796 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_797 = __VLS_asFunctionalComponent(__VLS_796, new __VLS_796({
            modelValue: (__VLS_ctx.configForm.style.decorGlowColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_798 = __VLS_797({
            modelValue: (__VLS_ctx.configForm.style.decorGlowColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_797));
    }
    if (__VLS_ctx.isVectorIconComponentType) {
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
                    if (!(__VLS_ctx.isVectorIconComponentType))
                        return;
                    __VLS_ctx.toggleSection('icon-style');
                } },
            ...{ class: "ss-hd" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-chevron" },
            ...{ class: ({ open: __VLS_ctx.openSections.has('icon-style') }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-hd-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.openSections.has('icon-style')) }, null, null);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_800 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_801 = __VLS_asFunctionalComponent(__VLS_800, new __VLS_800({
            modelValue: (__VLS_ctx.configForm.style.iconSize),
            min: (16),
            max: (256),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_802 = __VLS_801({
            modelValue: (__VLS_ctx.configForm.style.iconSize),
            min: (16),
            max: (256),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_801));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_804 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_805 = __VLS_asFunctionalComponent(__VLS_804, new __VLS_804({
            modelValue: (__VLS_ctx.configForm.style.iconStrokeColor),
            size: "small",
        }));
        const __VLS_806 = __VLS_805({
            modelValue: (__VLS_ctx.configForm.style.iconStrokeColor),
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_805));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_808 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_809 = __VLS_asFunctionalComponent(__VLS_808, new __VLS_808({
            modelValue: (__VLS_ctx.configForm.style.iconFillColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_810 = __VLS_809({
            modelValue: (__VLS_ctx.configForm.style.iconFillColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_809));
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
    const __VLS_812 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_813 = __VLS_asFunctionalComponent(__VLS_812, new __VLS_812({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_814 = __VLS_813({
        modelValue: (__VLS_ctx.configForm.style.padding),
        min: (0),
        max: (40),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_813));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_816 = {}.ElSlider;
    /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
    // @ts-ignore
    const __VLS_817 = __VLS_asFunctionalComponent(__VLS_816, new __VLS_816({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }));
    const __VLS_818 = __VLS_817({
        modelValue: (__VLS_ctx.configForm.style.componentOpacity),
        min: (0.1),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_817));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ss-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "ss-key" },
    });
    const __VLS_820 = {}.ElSwitch;
    /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
    // @ts-ignore
    const __VLS_821 = __VLS_asFunctionalComponent(__VLS_820, new __VLS_820({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }));
    const __VLS_822 = __VLS_821({
        modelValue: (__VLS_ctx.configForm.style.shadowShow),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_821));
    if (__VLS_ctx.configForm.style.shadowShow) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_824 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_825 = __VLS_asFunctionalComponent(__VLS_824, new __VLS_824({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }));
        const __VLS_826 = __VLS_825({
            modelValue: (__VLS_ctx.configForm.style.shadowColor),
            showAlpha: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_825));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ss-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ss-key" },
        });
        const __VLS_828 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_829 = __VLS_asFunctionalComponent(__VLS_828, new __VLS_828({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }));
        const __VLS_830 = __VLS_829({
            modelValue: (__VLS_ctx.configForm.style.shadowBlur),
            min: (0),
            max: (40),
            size: "small",
            controlsPosition: "right",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_829));
    }
    var __VLS_499;
    if (__VLS_ctx.showInteractionTab) {
        const __VLS_832 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_833 = __VLS_asFunctionalComponent(__VLS_832, new __VLS_832({
            label: "交互",
            name: "interaction",
        }));
        const __VLS_834 = __VLS_833({
            label: "交互",
            name: "interaction",
        }, ...__VLS_functionalComponentArgsRest(__VLS_833));
        __VLS_835.slots.default;
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
        const __VLS_836 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_837 = __VLS_asFunctionalComponent(__VLS_836, new __VLS_836({
            modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
        }));
        const __VLS_838 = __VLS_837({
            modelValue: (__VLS_ctx.configForm.interaction.enableClickLinkage),
        }, ...__VLS_functionalComponentArgsRest(__VLS_837));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_840 = {}.ElSwitch;
        /** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
        // @ts-ignore
        const __VLS_841 = __VLS_asFunctionalComponent(__VLS_840, new __VLS_840({
            modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
        }));
        const __VLS_842 = __VLS_841({
            modelValue: (__VLS_ctx.configForm.interaction.allowManualFilters),
        }, ...__VLS_functionalComponentArgsRest(__VLS_841));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_844 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_845 = __VLS_asFunctionalComponent(__VLS_844, new __VLS_844({
            modelValue: (__VLS_ctx.configForm.interaction.clickAction),
            ...{ style: {} },
        }));
        const __VLS_846 = __VLS_845({
            modelValue: (__VLS_ctx.configForm.interaction.clickAction),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_845));
        __VLS_847.slots.default;
        const __VLS_848 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_849 = __VLS_asFunctionalComponent(__VLS_848, new __VLS_848({
            label: "不处理",
            value: "none",
        }));
        const __VLS_850 = __VLS_849({
            label: "不处理",
            value: "none",
        }, ...__VLS_functionalComponentArgsRest(__VLS_849));
        const __VLS_852 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_853 = __VLS_asFunctionalComponent(__VLS_852, new __VLS_852({
            label: "联动筛选",
            value: "filter",
        }));
        const __VLS_854 = __VLS_853({
            label: "联动筛选",
            value: "filter",
        }, ...__VLS_functionalComponentArgsRest(__VLS_853));
        var __VLS_847;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "field-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_856 = {}.ElSelect;
        /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
        // @ts-ignore
        const __VLS_857 = __VLS_asFunctionalComponent(__VLS_856, new __VLS_856({
            modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
            ...{ style: {} },
        }));
        const __VLS_858 = __VLS_857({
            modelValue: (__VLS_ctx.configForm.interaction.linkageFieldMode),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_857));
        __VLS_859.slots.default;
        const __VLS_860 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_861 = __VLS_asFunctionalComponent(__VLS_860, new __VLS_860({
            label: "自动识别",
            value: "auto",
        }));
        const __VLS_862 = __VLS_861({
            label: "自动识别",
            value: "auto",
        }, ...__VLS_functionalComponentArgsRest(__VLS_861));
        const __VLS_864 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_865 = __VLS_asFunctionalComponent(__VLS_864, new __VLS_864({
            label: "维度字段",
            value: "dimension",
        }));
        const __VLS_866 = __VLS_865({
            label: "维度字段",
            value: "dimension",
        }, ...__VLS_functionalComponentArgsRest(__VLS_865));
        const __VLS_868 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_869 = __VLS_asFunctionalComponent(__VLS_868, new __VLS_868({
            label: "分组字段",
            value: "group",
        }));
        const __VLS_870 = __VLS_869({
            label: "分组字段",
            value: "group",
        }, ...__VLS_functionalComponentArgsRest(__VLS_869));
        const __VLS_872 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_873 = __VLS_asFunctionalComponent(__VLS_872, new __VLS_872({
            label: "自定义字段",
            value: "custom",
        }));
        const __VLS_874 = __VLS_873({
            label: "自定义字段",
            value: "custom",
        }, ...__VLS_functionalComponentArgsRest(__VLS_873));
        var __VLS_859;
        if (__VLS_ctx.configForm.interaction.linkageFieldMode === 'custom') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "field-item field-item--full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_876 = {}.ElSelect;
            /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
            // @ts-ignore
            const __VLS_877 = __VLS_asFunctionalComponent(__VLS_876, new __VLS_876({
                modelValue: (__VLS_ctx.configForm.interaction.linkageField),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }));
            const __VLS_878 = __VLS_877({
                modelValue: (__VLS_ctx.configForm.interaction.linkageField),
                clearable: true,
                filterable: true,
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_877));
            __VLS_879.slots.default;
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                const __VLS_880 = {}.ElOption;
                /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                // @ts-ignore
                const __VLS_881 = __VLS_asFunctionalComponent(__VLS_880, new __VLS_880({
                    key: (column),
                    label: (column),
                    value: (column),
                }));
                const __VLS_882 = __VLS_881({
                    key: (column),
                    label: (column),
                    value: (column),
                }, ...__VLS_functionalComponentArgsRest(__VLS_881));
            }
            var __VLS_879;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-editor" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filter-editor-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_884 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_885 = __VLS_asFunctionalComponent(__VLS_884, new __VLS_884({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }));
        const __VLS_886 = __VLS_885({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_885));
        let __VLS_888;
        let __VLS_889;
        let __VLS_890;
        const __VLS_891 = {
            onClick: (__VLS_ctx.addDataFilter)
        };
        __VLS_887.slots.default;
        var __VLS_887;
        if (__VLS_ctx.configForm.interaction.dataFilters.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-editor-list" },
            });
            for (const [filter, index] of __VLS_getVForSourceType((__VLS_ctx.configForm.interaction.dataFilters))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (`filter-${index}`),
                    ...{ class: "filter-editor-row" },
                });
                const __VLS_892 = {}.ElSelect;
                /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                // @ts-ignore
                const __VLS_893 = __VLS_asFunctionalComponent(__VLS_892, new __VLS_892({
                    modelValue: (filter.field),
                    placeholder: "字段",
                    filterable: true,
                    clearable: true,
                }));
                const __VLS_894 = __VLS_893({
                    modelValue: (filter.field),
                    placeholder: "字段",
                    filterable: true,
                    clearable: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_893));
                __VLS_895.slots.default;
                for (const [column] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
                    const __VLS_896 = {}.ElOption;
                    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                    // @ts-ignore
                    const __VLS_897 = __VLS_asFunctionalComponent(__VLS_896, new __VLS_896({
                        key: (column),
                        label: (column),
                        value: (column),
                    }));
                    const __VLS_898 = __VLS_897({
                        key: (column),
                        label: (column),
                        value: (column),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_897));
                }
                var __VLS_895;
                if (__VLS_ctx.getFilterValueOptions(filter.field).length) {
                    const __VLS_900 = {}.ElSelect;
                    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
                    // @ts-ignore
                    const __VLS_901 = __VLS_asFunctionalComponent(__VLS_900, new __VLS_900({
                        modelValue: (filter.value),
                        placeholder: "值",
                        filterable: true,
                        clearable: true,
                    }));
                    const __VLS_902 = __VLS_901({
                        modelValue: (filter.value),
                        placeholder: "值",
                        filterable: true,
                        clearable: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_901));
                    __VLS_903.slots.default;
                    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.getFilterValueOptions(filter.field)))) {
                        const __VLS_904 = {}.ElOption;
                        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
                        // @ts-ignore
                        const __VLS_905 = __VLS_asFunctionalComponent(__VLS_904, new __VLS_904({
                            key: (`${filter.field}-${option}`),
                            label: (option),
                            value: (option),
                        }));
                        const __VLS_906 = __VLS_905({
                            key: (`${filter.field}-${option}`),
                            label: (option),
                            value: (option),
                        }, ...__VLS_functionalComponentArgsRest(__VLS_905));
                    }
                    var __VLS_903;
                }
                else {
                    const __VLS_908 = {}.ElInput;
                    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
                    // @ts-ignore
                    const __VLS_909 = __VLS_asFunctionalComponent(__VLS_908, new __VLS_908({
                        modelValue: (filter.value),
                        placeholder: "输入筛选值",
                    }));
                    const __VLS_910 = __VLS_909({
                        modelValue: (filter.value),
                        placeholder: "输入筛选值",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_909));
                }
                const __VLS_912 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_913 = __VLS_asFunctionalComponent(__VLS_912, new __VLS_912({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }));
                const __VLS_914 = __VLS_913({
                    ...{ 'onClick': {} },
                    size: "small",
                    text: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_913));
                let __VLS_916;
                let __VLS_917;
                let __VLS_918;
                const __VLS_919 = {
                    onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.component || !__VLS_ctx.chart))
                            return;
                        if (!(__VLS_ctx.showInteractionTab))
                            return;
                        if (!(__VLS_ctx.configForm.interaction.dataFilters.length))
                            return;
                        __VLS_ctx.removeDataFilter(index);
                    }
                };
                __VLS_915.slots.default;
                var __VLS_915;
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "helper-text" },
            });
        }
        var __VLS_835;
    }
    const __VLS_920 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_921 = __VLS_asFunctionalComponent(__VLS_920, new __VLS_920({
        label: "Schema",
        name: "schema",
    }));
    const __VLS_922 = __VLS_921({
        label: "Schema",
        name: "schema",
    }, ...__VLS_functionalComponentArgsRest(__VLS_921));
    __VLS_923.slots.default;
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
    var __VLS_923;
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
    const __VLS_924 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_925 = __VLS_asFunctionalComponent(__VLS_924, new __VLS_924({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_926 = __VLS_925({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_925));
    let __VLS_928;
    let __VLS_929;
    let __VLS_930;
    const __VLS_931 = {
        onClick: (__VLS_ctx.copySchema)
    };
    __VLS_927.slots.default;
    var __VLS_927;
    const __VLS_932 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_933 = __VLS_asFunctionalComponent(__VLS_932, new __VLS_932({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_934 = __VLS_933({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_933));
    let __VLS_936;
    let __VLS_937;
    let __VLS_938;
    const __VLS_939 = {
        onClick: (__VLS_ctx.saveComponentConfig)
    };
    __VLS_935.slots.default;
    var __VLS_935;
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
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-title']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-chip-list']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-form']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-form']} */ ;
/** @type {__VLS_StyleScopedClasses['table-basic-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
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
/** @type {__VLS_StyleScopedClasses['mode-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-card-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-card-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-card-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-form']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group--mode']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group']} */ ;
/** @type {__VLS_StyleScopedClasses['page-source-group--submode']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
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
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-card']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-head']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-editor-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['runtime-form-item--full']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-card']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-head']} */ ;
/** @type {__VLS_StyleScopedClasses['suggestion-body']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-editor__head']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-editor__hint']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-editor__list']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-editor__empty']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item__label']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-field']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-field']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-field']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-field']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['table-column-item__drag']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-card--json']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
/** @type {__VLS_StyleScopedClasses['query-json-block']} */ ;
/** @type {__VLS_StyleScopedClasses['style-sections']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-card']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-head']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['style-family-tag']} */ ;
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
/** @type {__VLS_StyleScopedClasses['ss-row--vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row--vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['iframe-tabs-list']} */ ;
/** @type {__VLS_StyleScopedClasses['iframe-tab-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-section']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-hd-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-row--vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['ss-key']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-text']} */ ;
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
            previewLoading: previewLoading,
            saving: saving,
            themeNames: themeNames,
            activeTab: activeTab,
            openSections: openSections,
            toggleSection: toggleSection,
            layoutForm: layoutForm,
            configForm: configForm,
            apiRuntimeForm: apiRuntimeForm,
            tableRuntimeForm: tableRuntimeForm,
            jsonRuntimeForm: jsonRuntimeForm,
            apiRuntimeTab: apiRuntimeTab,
            currentChartType: currentChartType,
            currentChartMeta: currentChartMeta,
            isDecorationComponentType: isDecorationComponentType,
            isStaticComponentType: isStaticComponentType,
            isVectorIconComponentType: isVectorIconComponentType,
            isTableComponentType: isTableComponentType,
            isFilterComponentType: isFilterComponentType,
            isMetricComponentType: isMetricComponentType,
            isWordCloudType: isWordCloudType,
            isListType: isListType,
            isIframeType: isIframeType,
            isTextBlockType: isTextBlockType,
            componentKindLabel: componentKindLabel,
            componentKindDescription: componentKindDescription,
            componentCapabilityTags: componentCapabilityTags,
            styleCapabilityTags: styleCapabilityTags,
            showDataTab: showDataTab,
            showInteractionTab: showInteractionTab,
            showTitleSection: showTitleSection,
            showLegendSection: showLegendSection,
            showLabelSection: showLabelSection,
            showTooltipSection: showTooltipSection,
            showAxisSections: showAxisSections,
            showChartAdvancedSection: showChartAdvancedSection,
            bindingEntryMode: bindingEntryMode,
            dataBindingMode: dataBindingMode,
            missingFields: missingFields,
            pageSourceDatasources: pageSourceDatasources,
            pageSourceKindLabel: pageSourceKindLabel,
            pageSourceHelperText: pageSourceHelperText,
            previewVisibleColumns: previewVisibleColumns,
            tablePreviewJson: tablePreviewJson,
            previewColumnSummary: previewColumnSummary,
            addTableColumn: addTableColumn,
            removeTableColumn: removeTableColumn,
            handleTableColumnFieldChange: handleTableColumnFieldChange,
            onTableColumnDragStart: onTableColumnDragStart,
            clearTableColumnDrag: clearTableColumnDrag,
            onTableColumnDrop: onTableColumnDrop,
            suggestionSummary: suggestionSummary,
            dataModeTitle: dataModeTitle,
            dataModeDescription: dataModeDescription,
            dataCapabilityTags: dataCapabilityTags,
            dimensionFieldLabel: dimensionFieldLabel,
            metricFieldLabel: metricFieldLabel,
            groupFieldLabel: groupFieldLabel,
            healthReadyText: healthReadyText,
            schemaPreview: schemaPreview,
            onBindingEntryModeChange: onBindingEntryModeChange,
            onDataBindingModeChange: onDataBindingModeChange,
            onDatasetChange: onDatasetChange,
            addApiRuntimeRow: addApiRuntimeRow,
            removeApiRuntimeRow: removeApiRuntimeRow,
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
