import type { Chart, ChartDataResult } from '../api/chart'

export interface ComponentChartConfig {
  name: string
  datasetId: number | '' | null
  sourceMode: 'DATASET' | 'PAGE_SQL'
  pageSourceKind: 'DATABASE' | 'API' | 'TABLE' | 'JSON_STATIC'
  datasourceId: number | '' | null
  sqlText: string
  runtimeConfigText: string
  chartType: string
  xField: string
  yField: string
  groupField: string
}

export interface ComponentStyleConfig {
  theme: string
  bgColor: string
  showLegend: boolean
  showLabel: boolean
  labelSize: number
  showXName: boolean
  showYName: boolean
  showGrid: boolean
  smooth: boolean
  areaFill: boolean
  barRadius: number
  barMaxWidth: number
  legendPos: 'top' | 'bottom' | 'right'
  // 标题
  showTitle: boolean
  titleText: string
  titleFontSize: number
  titleColor: string
  showTooltip: boolean
  // 卡片边框
  borderShow: boolean
  borderColor: string
  borderWidth: number
  cardRadius: number
  // 表格专属样式
  tableHeaderBg: string
  tableHeaderColor: string
  tableHeaderFontSize: number
  tableRowHeight: number
  tableOddRowBg: string
  tableEvenRowBg: string
  tableRowHoverBg: string
  tableBorderColor: string
  tableBorderWidth: number
  tableShowIndex: boolean
  tableEnableSort: boolean
  tableFontColor: string
  tableFontSize: number
  tableStriped: boolean
  // 指标组件专属
  metricValueFontSize: number
  metricValueColor: string
  metricPrefix: string
  metricSuffix: string
  metricTrendUpColor: string
  metricTrendDownColor: string
  // 词云专属
  wordCloudMinSize: number
  wordCloudMaxSize: number
  wordCloudRotation: number
  // 列表专属
  listItemGap: number
  listMaxItems: number
  listScrollAnimation: boolean
  // 筛选器专属
  filterBtnSize: 'small' | 'default' | 'large'
  filterActiveColor: string
  filterLayout: 'horizontal' | 'vertical'
  // 装饰组件专属
  decorAnimSpeed: number
  decorGlowColor: string
  // 图标组件专属
  iconSize: number
  iconStrokeColor: string
  iconFillColor: string
  // iframe 组件
  iframeUrl: string
  iframeTabs: Array<{ label: string; url: string }>
  // 文本组件
  textContent: string
  // 高级
  componentOpacity: number
  shadowShow: boolean
  shadowColor: string
  shadowBlur: number
  padding: number
}

export interface ComponentInteractionConfig {
  clickAction: 'none' | 'filter'
  enableClickLinkage: boolean
  allowManualFilters: boolean
  linkageFieldMode: 'auto' | 'dimension' | 'group' | 'custom'
  linkageField: string
  dataFilters: ComponentDataFilter[]
}

export interface ComponentDataFilter {
  field: string
  value: string
}

export interface ComponentInstanceConfig {
  chart: ComponentChartConfig
  style: ComponentStyleConfig
  interaction: ComponentInteractionConfig
}

export interface ComponentAssetLayout {
  width: number
  height: number
}

export interface ComponentAssetConfig extends ComponentInstanceConfig {
  layout: ComponentAssetLayout
}

export interface ChartTypeMeta {
  label: string
  description: string
  requiresDimension: boolean
  allowsOptionalDimension: boolean
  requiresMetric: boolean
  allowsGroup: boolean
  supportsLegend: boolean
  supportsAxisNames: boolean
  supportsGrid: boolean
  supportsSmooth: boolean
  supportsAreaFill: boolean
  supportsBarStyle: boolean
  stablePreview: boolean
}

export interface ComponentPreset {
  id: string
  name: string
  description: string
  chartType: string
}

export const COLOR_THEMES: Record<string, string[]> = {
  '默认蓝': ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
  '商务灰': ['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0', '#cbb0e3'],
  '暖橙色': ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc'],
  '紫霞粉': ['#9b59b6', '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#1abc9c', '#e67e22', '#95a5a6'],
  '海洋蓝': ['#1890ff', '#2fc25b', '#facc14', '#223273', '#8543e0', '#13c2c2', '#3436c7', '#f04864'],
  '海湾晨光': ['#1f7ae0', '#57c7ff', '#ffb347', '#2dbd85', '#7352ff', '#f56c6c', '#00a6a6', '#9b7bff'],
  '琥珀橙金': ['#ff9a3c', '#ffc857', '#ff6b6b', '#ff8a5b', '#cc7a00', '#ffa94d', '#ffcf7d', '#ff7f50'],
  '山岚青绿': ['#1f9d8b', '#62c370', '#88d498', '#4db6ac', '#3f8f74', '#86b971', '#aad576', '#5ac8a8'],
  '深海荧光': ['#0f4c81', '#00b8d9', '#3ddc97', '#7c4dff', '#00c2a8', '#4dd0e1', '#36cfc9', '#5b8ff9'],
  '暮光珊瑚': ['#ff7f6b', '#ffb997', '#ffd166', '#f4845f', '#f25f5c', '#ff9671', '#ffc75f', '#ff8fab'],
  '霓光星砂': ['#ff6f91', '#845ec2', '#2c73d2', '#00c9a7', '#f9f871', '#0089ba', '#d65db1', '#ff9671'],
}

export const DEFAULT_COMPONENT_STYLE: ComponentStyleConfig = {
  theme: '海湾晨光',
  bgColor: 'rgba(0,0,0,0)',
  showLegend: true,
  showLabel: false,
  labelSize: 12,
  showXName: false,
  showYName: false,
  showGrid: true,
  smooth: false,
  areaFill: false,
  barRadius: 4,
  barMaxWidth: 40,
  legendPos: 'bottom',
  showTitle: false,
  titleText: '',
  titleFontSize: 14,
  titleColor: '#e8f4ff',
  showTooltip: true,
  borderShow: false,
  borderColor: 'rgba(77,179,255,0.5)',
  borderWidth: 1,
  cardRadius: 12,
  // 表格样式默认值
  tableHeaderBg: '#1a2a3d',
  tableHeaderColor: '#c8e0f4',
  tableHeaderFontSize: 13,
  tableRowHeight: 36,
  tableOddRowBg: 'rgba(10,30,60,0.6)',
  tableEvenRowBg: 'rgba(20,45,80,0.5)',
  tableRowHoverBg: 'rgba(64,158,255,0.15)',
  tableBorderColor: 'rgba(77,155,219,0.2)',
  tableBorderWidth: 1,
  tableShowIndex: false,
  tableEnableSort: true,
  tableFontColor: '#c0d8f0',
  tableFontSize: 12,
  tableStriped: true,
  // 指标组件
  metricValueFontSize: 36,
  metricValueColor: '#4db3ff',
  metricPrefix: '',
  metricSuffix: '',
  metricTrendUpColor: '#2dbd85',
  metricTrendDownColor: '#f56c6c',
  // 词云
  wordCloudMinSize: 12,
  wordCloudMaxSize: 48,
  wordCloudRotation: 0,
  // 列表
  listItemGap: 8,
  listMaxItems: 10,
  listScrollAnimation: false,
  // 筛选器
  filterBtnSize: 'default' as const,
  filterActiveColor: '#409eff',
  filterLayout: 'horizontal' as const,
  // 装饰组件
  decorAnimSpeed: 3,
  decorGlowColor: '#4db3ff',
  // 图标组件
  iconSize: 48,
  iconStrokeColor: '#4db3ff',
  iconFillColor: 'rgba(77,179,255,0.15)',
  // iframe 组件
  iframeUrl: '',
  iframeTabs: [],
  // 文本组件
  textContent: '',
  // 高级
  componentOpacity: 1,
  shadowShow: false,
  shadowColor: 'rgba(0,0,0,0.4)',
  shadowBlur: 12,
  padding: 6,
}

export const DEFAULT_COMPONENT_INTERACTION: ComponentInteractionConfig = {
  clickAction: 'filter',
  enableClickLinkage: true,
  allowManualFilters: true,
  linkageFieldMode: 'auto',
  linkageField: '',
  dataFilters: [],
}

const DEFAULT_CHART_TYPE_META: ChartTypeMeta = {
  label: '图表',
  description: '标准分类对比图表，通常需要一个维度字段和一个度量字段。',
  requiresDimension: true,
  allowsOptionalDimension: false,
  requiresMetric: true,
  allowsGroup: false,
  supportsLegend: true,
  supportsAxisNames: true,
  supportsGrid: true,
  supportsSmooth: false,
  supportsAreaFill: false,
  supportsBarStyle: false,
  stablePreview: true,
}

const STATIC_NO_FIELD_META: ChartTypeMeta = {
  label: '静态组件',
  description: '不依赖数据字段，可直接作为大屏装饰或信息承载区使用。',
  requiresDimension: false,
  allowsOptionalDimension: false,
  requiresMetric: false,
  allowsGroup: false,
  supportsLegend: false,
  supportsAxisNames: false,
  supportsGrid: false,
  supportsSmooth: false,
  supportsAreaFill: false,
  supportsBarStyle: false,
  stablePreview: true,
}

const STATIC_DIMENSION_META: ChartTypeMeta = {
  ...STATIC_NO_FIELD_META,
  description: '依赖一个维度字段来展示主信息。',
  requiresDimension: true,
}

const STATIC_METRIC_META: ChartTypeMeta = {
  ...STATIC_NO_FIELD_META,
  description: '依赖一个度量字段来展示数值信息。',
  requiresMetric: true,
}

const STATIC_DIMENSION_METRIC_META: ChartTypeMeta = {
  ...STATIC_NO_FIELD_META,
  description: '同时依赖维度字段和度量字段展示排行或趋势内容。',
  requiresDimension: true,
  requiresMetric: true,
}

export const CHART_TYPE_META: Record<string, ChartTypeMeta> = {
  bar: {
    label: '柱状图',
    description: '适合做分类对比，可选系列分组。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_horizontal: {
    label: '条形图',
    description: '适合排行和长文本类别展示，可选系列分组。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  line: {
    label: '折线图',
    description: '适合时间趋势和连续变化分析，可选系列分组。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: true,
    supportsBarStyle: false,
    stablePreview: true,
  },
  pie: {
    label: '饼图',
    description: '适合结构占比分析，通常只需要一个分类字段和一个度量字段。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: true,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  doughnut: {
    label: '环图',
    description: '适合占比和进度类信息展示。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: true,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  funnel: {
    label: '漏斗图',
    description: '适合阶段转化展示，通常使用分类字段和度量字段。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  gauge: {
    label: '仪表盘',
    description: '更适合单指标完成率或告警值展示，只要求度量字段。',
    requiresDimension: false,
    allowsOptionalDimension: true,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  table: {
    label: '表格',
    description: '适合明细展示，不强制要求维度和度量字段。',
    requiresDimension: false,
    allowsOptionalDimension: false,
    requiresMetric: false,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  scatter: {
    label: '散点图',
    description: '适合关系分布分析，但当前画布实时预览支持有限。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: false,
  },
  radar: {
    label: '雷达图',
    description: '适合多指标对比，但当前画布实时预览支持有限。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: false,
  },
  area: {
    label: '面积图',
    description: '折线图变体，面积填充，适合时间趋势和连续变化。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  line_stack: {
    label: '堆叠折线图',
    description: '多系列折线图，数值堆叠展示累积趋势。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: true,
    supportsBarStyle: false,
    stablePreview: true,
  },
  bar_stack: {
    label: '堆叠柱状图',
    description: '多系列柱状图，数值堆叠展示结构累积。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_percent: {
    label: '百分比柱状图',
    description: '多系列柱状图，显示各系列百分比占比。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_group: {
    label: '分组柱状图',
    description: '强调分组对比，每个组别并排展示多系列。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_horizontal_stack: {
    label: '堆叠条形图',
    description: '水平方向堆叠，适合展示部分与整体的关系。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  rose: {
    label: '玫瑰图',
    description: '南丁格尔玫瑰图，饼图变体，扇形半径表示数据大小。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: true,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  treemap: {
    label: '矩形树图',
    description: '用面积展示层级结构和比例关系。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  table_summary: {
    label: '汇总表',
    description: '按维度字段分组聚合展示。',
    requiresDimension: false,
    allowsOptionalDimension: false,
    requiresMetric: false,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  table_pivot: {
    label: '透视表',
    description: '行列交叉聚合数据展示。',
    requiresDimension: false,
    allowsOptionalDimension: false,
    requiresMetric: false,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  bar_group_stack: {
    label: '分组堆叠柱状图',
    description: '在每组内进行堆叠，同时展示分组对比。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_waterfall: {
    label: '瀑布图',
    description: '展示数值的累计增减变化，适合财务分析。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_horizontal_percent: {
    label: '百分比条形图',
    description: '水平方向百分比堆叠，多系列占比分析。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_horizontal_range: {
    label: '区间条形图',
    description: '展示数值起终区间，适合甘特图类场景。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: false,
  },
  bar_horizontal_symmetric: {
    label: '对称条形图',
    description: '双向条形图，适合正负对比分析。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  bar_progress: {
    label: '进度条',
    description: '以条形展示进度或完成率。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  bar_combo: {
    label: '柱线组合图',
    description: '柱状图和折线图组合，适合双指标对比。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_combo_group: {
    label: '分组柱线组合图',
    description: '分组柱状图与折线图组合。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  bar_combo_stack: {
    label: '堆叠柱线组合图',
    description: '堆叠柱状图与折线图组合，展示累积趋势。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: true,
    supportsSmooth: true,
    supportsAreaFill: false,
    supportsBarStyle: true,
    stablePreview: true,
  },
  heatmap: {
    label: '热力图',
    description: '用颜色深浅展示矩阵中的数值密度。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: true,
    supportsLegend: true,
    supportsAxisNames: true,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  map: {
    label: '地图',
    description: '地理数据可视化，需要省市名称字段和度量字段。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: true,
    allowsGroup: false,
    supportsLegend: true,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: false,
  },
  filter_button: {
    label: '筛选按钮',
    description: '可绑定数据列的筛选控件，预览时点击弹出下拉选择。',
    requiresDimension: true,
    allowsOptionalDimension: false,
    requiresMetric: false,
    allowsGroup: false,
    supportsLegend: false,
    supportsAxisNames: false,
    supportsGrid: false,
    supportsSmooth: false,
    supportsAreaFill: false,
    supportsBarStyle: false,
    stablePreview: true,
  },
  decor_border_frame: {
    ...STATIC_NO_FIELD_META,
    label: '边框装饰',
    description: '基础外框装饰，适合承载标题区和模块边界。',
  },
  decor_border_corner: {
    ...STATIC_NO_FIELD_META,
    label: '角标边框',
    description: '带角标强调的边框装饰，适合重点模块。',
  },
  decor_border_glow: {
    ...STATIC_NO_FIELD_META,
    label: '霓虹边框',
    description: '带发光效果的边框装饰，适合深色大屏。',
  },
  decor_border_grid: {
    ...STATIC_NO_FIELD_META,
    label: '网格边框',
    description: '包含刻度与网格肌理的装饰边框。',
  },
  decor_border_stream: {
    ...STATIC_NO_FIELD_META,
    label: '流光边框',
    description: '带流光扫过效果的边框装饰。',
  },
  decor_border_pulse: {
    ...STATIC_NO_FIELD_META,
    label: '脉冲边框',
    description: '带节奏脉冲效果的高亮边框。',
  },
  decor_border_bracket: {
    ...STATIC_NO_FIELD_META,
    label: '支架边框',
    description: '强调结构边界的支架式边框装饰。',
  },
  decor_border_circuit: {
    ...STATIC_NO_FIELD_META,
    label: '电路边框',
    description: '适合科技主题大屏的链路式边框装饰。',
  },
  decor_title_plate: {
    ...STATIC_NO_FIELD_META,
    label: '标题牌',
    description: '适合做模块标题区、章节头和主题抬头。',
  },
  decor_divider_glow: {
    ...STATIC_NO_FIELD_META,
    label: '发光分隔条',
    description: '适合做版块间的分割线和节奏线。',
  },
  decor_target_ring: {
    ...STATIC_NO_FIELD_META,
    label: '目标环',
    description: '适合做雷达、锁定和重点聚焦装饰。',
  },
  decor_scan_panel: {
    ...STATIC_NO_FIELD_META,
    label: '扫描面板',
    description: '带扫描流光和网格纹理的科技面板。',
  },
  decor_hex_badge: {
    ...STATIC_NO_FIELD_META,
    label: '六边形徽记',
    description: '适合做标签、徽章和中心标识装饰。',
  },
  text_block: {
    ...STATIC_NO_FIELD_META,
    label: '文本组件',
    description: '用于展示标题、说明文案或公告信息。',
  },
  single_field: {
    ...STATIC_DIMENSION_META,
    label: '单字段组件',
    description: '提取单个字段值并放大显示。',
  },
  number_flipper: {
    ...STATIC_METRIC_META,
    label: '数字翻牌器',
    description: '适合核心指标的翻牌滚动展示。',
  },
  table_rank: {
    ...STATIC_DIMENSION_METRIC_META,
    label: '排名表格',
    description: '按维度和指标生成排序榜单。',
  },
  iframe_single: {
    ...STATIC_NO_FIELD_META,
    label: 'iframe窗口',
    description: '嵌入单个外部页面或业务系统窗口。',
  },
  iframe_tabs: {
    ...STATIC_NO_FIELD_META,
    label: '多iframe切换窗口',
    description: '支持多个 iframe 页签切换展示。',
  },
  hyperlink: {
    ...STATIC_NO_FIELD_META,
    label: '超级链接',
    description: '用于跳转外部链接或系统页面。',
  },
  image_list: {
    ...STATIC_DIMENSION_META,
    label: '图片列表',
    description: '适合图片卡片、轮播封面等场景。',
  },
  text_list: {
    ...STATIC_DIMENSION_META,
    label: '文字列表',
    description: '适合公告、消息和清单类信息展示。',
  },
  clock_display: {
    ...STATIC_NO_FIELD_META,
    label: '显示时间',
    description: '展示当前日期与时间。',
  },
  word_cloud: {
    ...STATIC_DIMENSION_METRIC_META,
    label: '词云图',
    description: '按词频或热度展示文字云。',
  },
  qr_code: {
    ...STATIC_NO_FIELD_META,
    label: '二维码',
    description: '展示二维码入口或扫码信息。',
  },
  business_trend: {
    ...STATIC_DIMENSION_METRIC_META,
    label: '业务趋势',
    description: '以轻量化趋势组件展示业务变化。',
  },
  metric_indicator: {
    ...STATIC_METRIC_META,
    label: '指标组件',
    description: '聚焦 KPI 数值及状态变化。',
  },
  icon_arrow_trend: {
    ...STATIC_NO_FIELD_META,
    label: '趋势箭头',
    description: '用于表达上涨、增长和方向趋势的矢量图标。',
  },
  icon_warning_badge: {
    ...STATIC_NO_FIELD_META,
    label: '告警徽标',
    description: '用于风险、提示和告警态展示。',
  },
  icon_location_pin: {
    ...STATIC_NO_FIELD_META,
    label: '定位图标',
    description: '用于地理位置和区域标记。',
  },
  icon_data_signal: {
    ...STATIC_NO_FIELD_META,
    label: '数据信号',
    description: '用于链路、波形和数据传输状态表现。',
  },
  icon_user_badge: {
    ...STATIC_NO_FIELD_META,
    label: '用户徽标',
    description: '用于身份、人员和角色识别。',
  },
  icon_chart_mark: {
    ...STATIC_NO_FIELD_META,
    label: '图表标识',
    description: '用于概括图表、指标和分析模块。',
  },
}

export const COMPONENT_PRESETS: ComponentPreset[] = [
  { id: 'trend-line', name: '时间趋势', description: '自动切为折线图，优先匹配时间列和指标列。', chartType: 'line' },
  { id: 'compare-bar', name: '分类对比', description: '自动切为柱状图，适合类别与指标对比。', chartType: 'bar' },
  { id: 'ranking-bar', name: '排行看板', description: '自动切为条形图，适合 TopN 排名。', chartType: 'bar_horizontal' },
  { id: 'share-doughnut', name: '占比分析', description: '自动切为环图，适合结构占比。', chartType: 'doughnut' },
  { id: 'metric-gauge', name: '单指标', description: '自动切为仪表盘，适合进度和完成率。', chartType: 'gauge' },
  { id: 'detail-table', name: '明细表', description: '自动切为表格，适合直接查看原始数据。', chartType: 'table' },
]

export const CANVAS_RENDERABLE_CHART_TYPES = new Set([
  'bar', 'bar_stack', 'bar_percent', 'bar_group', 'bar_group_stack',
  'bar_horizontal', 'bar_horizontal_stack', 'bar_horizontal_percent', 'bar_horizontal_symmetric',
  'bar_waterfall', 'bar_progress',
  'bar_combo', 'bar_combo_group', 'bar_combo_stack',
  'line', 'area', 'line_stack',
  'pie', 'doughnut', 'rose',
  'funnel', 'gauge', 'radar', 'scatter', 'treemap',
  'table_summary', 'table_pivot',
  'heatmap',
])

export const DECORATION_CHART_TYPES = new Set([
  'decor_border_frame', 'decor_border_corner', 'decor_border_glow', 'decor_border_grid',
  'decor_border_stream', 'decor_border_pulse', 'decor_border_bracket', 'decor_border_circuit',
  'decor_title_plate', 'decor_divider_glow', 'decor_target_ring', 'decor_scan_panel', 'decor_hex_badge',
])

export const TEXT_WIDGET_CHART_TYPES = new Set([
  'text_block', 'single_field', 'number_flipper', 'table_rank', 'iframe_single', 'iframe_tabs',
  'hyperlink', 'image_list', 'text_list', 'clock_display', 'word_cloud', 'qr_code',
  'business_trend', 'metric_indicator',
])

export const VECTOR_ICON_CHART_TYPES = new Set([
  'icon_arrow_trend', 'icon_warning_badge', 'icon_location_pin', 'icon_data_signal', 'icon_user_badge', 'icon_chart_mark',
])

export const PURE_STATIC_CHART_TYPES = new Set([
  ...DECORATION_CHART_TYPES,
  'hyperlink', 'clock_display', 'qr_code',
  ...VECTOR_ICON_CHART_TYPES,
])

export const DEFAULT_COMPONENT_ASSET_LAYOUT: ComponentAssetLayout = {
  width: 520,
  height: 320,
}

const TIME_KEYWORDS = ['date', 'time', 'day', 'month', 'year', '日期', '时间', '年月', '月份']
const DIMENSION_KEYWORDS = ['name', 'type', 'category', 'region', 'dept', 'city', 'product', '分类', '名称', '地区', '部门', '城市', '产品']
const METRIC_KEYWORDS = ['amount', 'total', 'count', 'num', 'qty', 'price', 'score', 'value', 'rate', 'percent', '金额', '总', '数量', '数', '价格', '值', '指标', '比率', '占比']

export const getChartTypeMeta = (type: string) => CHART_TYPE_META[type] ?? {
  ...DEFAULT_CHART_TYPE_META,
  label: chartTypeLabel(type),
}

export const isCanvasRenderableChartType = (type: string) => CANVAS_RENDERABLE_CHART_TYPES.has(type)
export const isDecorationChartType = (type: string) => DECORATION_CHART_TYPES.has(type)
export const isTextWidgetChartType = (type: string) => TEXT_WIDGET_CHART_TYPES.has(type)
export const isVectorIconChartType = (type: string) => VECTOR_ICON_CHART_TYPES.has(type)
export const isStaticWidgetChartType = (type: string) =>
  isDecorationChartType(type) || isTextWidgetChartType(type) || isVectorIconChartType(type)
export const canRenderStaticWithoutFields = (type: string) => PURE_STATIC_CHART_TYPES.has(type)

export const getMissingChartFields = (chartConfig: ComponentChartConfig) => {
  const meta = getChartTypeMeta(chartConfig.chartType)
  const issues: string[] = []
  if (meta.requiresDimension && !chartConfig.xField) issues.push('维度字段')
  if (meta.requiresMetric && !chartConfig.yField) issues.push('度量字段')
  return issues
}

const scoreColumn = (column: string, keywords: string[]) => {
  const normalized = column.toLowerCase()
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword.toLowerCase()) ? 2 : 0), 0)
}

const pickColumn = (columns: string[], keywords: string[], excluded: string[] = []) => {
  const excludeSet = new Set(excluded.filter(Boolean))
  const candidates = columns.filter((column) => !excludeSet.has(column))
  if (!candidates.length) return ''
  return candidates
    .map((column, index) => ({ column, index, score: scoreColumn(column, keywords) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.column ?? ''
}

export const suggestChartFields = (columns: string[], chartType: string): Partial<ComponentChartConfig> => {
  if (!columns.length) return {}
  const meta = getChartTypeMeta(chartType)
  const preferTime = chartType === 'line'
  const xField = (meta.requiresDimension || meta.allowsOptionalDimension)
    ? pickColumn(columns, preferTime ? [...TIME_KEYWORDS, ...DIMENSION_KEYWORDS] : DIMENSION_KEYWORDS) || columns[0]
    : ''
  const yField = meta.requiresMetric
    ? pickColumn(columns, chartType === 'gauge' ? [...METRIC_KEYWORDS, 'rate', '完成', '进度'] : METRIC_KEYWORDS, [xField]) || columns.find((column) => column !== xField) || ''
    : ''
  const groupField = meta.allowsGroup
    ? pickColumn(columns, ['group', 'series', 'type', 'category', '分类', '分组'], [xField, yField])
    : ''
  return {
    xField,
    yField,
    groupField,
  }
}

export const buildPresetChartConfig = (
  preset: ComponentPreset,
  columns: string[],
  currentChart?: Partial<ComponentChartConfig>,
): Partial<ComponentChartConfig> => {
  const suggested = suggestChartFields(columns, preset.chartType)
  return {
    name: currentChart?.name || preset.name,
    chartType: preset.chartType,
    xField: suggested.xField ?? currentChart?.xField ?? '',
    yField: suggested.yField ?? currentChart?.yField ?? '',
    groupField: suggested.groupField ?? '',
  }
}

export const buildChartSnapshot = (chart?: Chart | null): ComponentChartConfig => ({
  name: chart?.name ?? '',
  datasetId: chart?.datasetId ?? '',
  sourceMode: 'DATASET',
  pageSourceKind: 'DATABASE',
  datasourceId: '',
  sqlText: '',
  runtimeConfigText: '',
  chartType: chart?.chartType ?? '',
  xField: chart?.xField ?? '',
  yField: chart?.yField ?? '',
  groupField: chart?.groupField ?? '',
})

const parseRawComponentConfig = (configJson?: string | null): Record<string, any> => {
  if (!configJson) return {}
  try {
    const parsed = JSON.parse(configJson) as Record<string, any>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const parseComponentConfig = (configJson?: string | null): Partial<ComponentInstanceConfig> => {
  const parsed = parseRawComponentConfig(configJson)
  if (parsed.chart || parsed.style || parsed.interaction) {
    return parsed as Partial<ComponentInstanceConfig>
  }
  const chartPatch: Partial<ComponentChartConfig> = {}
  const stylePatch: Partial<ComponentStyleConfig> = {}
  if (typeof parsed.name === 'string') chartPatch.name = parsed.name
  if (typeof parsed.datasetId === 'number') chartPatch.datasetId = parsed.datasetId
  if (parsed.datasetId === null || parsed.datasetId === '') chartPatch.datasetId = ''
  if (parsed.sourceMode === 'DATASET' || parsed.sourceMode === 'PAGE_SQL') chartPatch.sourceMode = parsed.sourceMode
  if (parsed.pageSourceKind === 'DATABASE' || parsed.pageSourceKind === 'API' || parsed.pageSourceKind === 'TABLE' || parsed.pageSourceKind === 'JSON_STATIC') {
    chartPatch.pageSourceKind = parsed.pageSourceKind
  }
  if (typeof parsed.datasourceId === 'number') chartPatch.datasourceId = parsed.datasourceId
  if (parsed.datasourceId === null || parsed.datasourceId === '') chartPatch.datasourceId = ''
  if (typeof parsed.sqlText === 'string') chartPatch.sqlText = parsed.sqlText
  if (typeof parsed.runtimeConfigText === 'string') chartPatch.runtimeConfigText = parsed.runtimeConfigText
  if (typeof parsed.chartType === 'string') chartPatch.chartType = parsed.chartType
  if (typeof parsed.xField === 'string') chartPatch.xField = parsed.xField
  if (typeof parsed.yField === 'string') chartPatch.yField = parsed.yField
  if (typeof parsed.groupField === 'string') chartPatch.groupField = parsed.groupField
  if (typeof parsed.theme === 'string') stylePatch.theme = parsed.theme
  if (typeof parsed.bgColor === 'string') stylePatch.bgColor = parsed.bgColor
  if (typeof parsed.showLegend === 'boolean') stylePatch.showLegend = parsed.showLegend
  if (typeof parsed.showLabel === 'boolean') stylePatch.showLabel = parsed.showLabel
  if (typeof parsed.labelSize === 'number') stylePatch.labelSize = parsed.labelSize
  if (typeof parsed.showXName === 'boolean') stylePatch.showXName = parsed.showXName
  if (typeof parsed.showYName === 'boolean') stylePatch.showYName = parsed.showYName
  if (typeof parsed.showGrid === 'boolean') stylePatch.showGrid = parsed.showGrid
  if (typeof parsed.smooth === 'boolean') stylePatch.smooth = parsed.smooth
  if (typeof parsed.areaFill === 'boolean') stylePatch.areaFill = parsed.areaFill
  if (typeof parsed.barRadius === 'number') stylePatch.barRadius = parsed.barRadius
  if (typeof parsed.barMaxWidth === 'number') stylePatch.barMaxWidth = parsed.barMaxWidth
  if (typeof parsed.legendPos === 'string') stylePatch.legendPos = parsed.legendPos as ComponentStyleConfig['legendPos']
  return {
    chart: chartPatch,
    style: stylePatch,
  } as Partial<ComponentInstanceConfig>
}

export const normalizeComponentConfig = (configJson?: string | null, baseChart?: Chart | null): ComponentInstanceConfig => {
  const parsed = parseComponentConfig(configJson)
  const chart = { ...buildChartSnapshot(baseChart), ...(parsed.chart ?? {}) }
  const normalizedInteraction = {
    ...DEFAULT_COMPONENT_INTERACTION,
    ...(parsed.interaction ?? {}),
    dataFilters: normalizeComponentDataFilters(parsed.interaction?.dataFilters),
  }
  return {
    chart,
    style: { ...DEFAULT_COMPONENT_STYLE, ...(parsed.style ?? {}) },
    interaction: normalizedInteraction,
  }
}

export const normalizeComponentDataFilters = (filters?: ComponentDataFilter[] | null): ComponentDataFilter[] => {
  if (!Array.isArray(filters)) return []
  return filters
    .map((item) => ({
      field: String(item?.field ?? '').trim(),
      value: String(item?.value ?? '').trim(),
    }))
    .filter((item) => item.field && item.value)
}

export const buildComponentFilterRecord = (filters?: ComponentDataFilter[] | null) => {
  const record: Record<string, string> = {}
  normalizeComponentDataFilters(filters).forEach((item) => {
    record[item.field] = item.value
  })
  return record
}

export const mergeComponentRequestFilters = (
  defaultFilters?: ComponentDataFilter[] | null,
  runtimeFilters?: Record<string, string>
) => ({
  ...buildComponentFilterRecord(defaultFilters),
  ...(runtimeFilters ?? {}),
})

export const normalizeComponentAssetConfig = (configJson?: string | null, baseChart?: Chart | null): ComponentAssetConfig => {
  const parsed = parseRawComponentConfig(configJson)
  const config = normalizeComponentConfig(configJson, baseChart)
  return {
    ...config,
    layout: {
      ...DEFAULT_COMPONENT_ASSET_LAYOUT,
      ...(parsed.layout ?? {}),
    },
  }
}

export const buildComponentConfig = (
  baseChart?: Chart | null,
  originalConfigJson?: string | null,
  patch?: Partial<ComponentInstanceConfig>
) => {
  const current = normalizeComponentConfig(originalConfigJson, baseChart)
  const next: ComponentInstanceConfig = {
    chart: { ...current.chart, ...(patch?.chart ?? {}) },
    style: { ...current.style, ...(patch?.style ?? {}) },
    interaction: { ...current.interaction, ...(patch?.interaction ?? {}) },
  }
  return JSON.stringify(next)
}

export const buildComponentAssetConfig = (
  baseChart?: Chart | null,
  originalConfigJson?: string | null,
  patch?: Partial<ComponentInstanceConfig>,
  layoutPatch?: Partial<ComponentAssetLayout>
) => {
  const current = normalizeComponentAssetConfig(originalConfigJson, baseChart)
  return JSON.stringify({
    chart: { ...current.chart, ...(patch?.chart ?? {}) },
    style: { ...current.style, ...(patch?.style ?? {}) },
    interaction: { ...current.interaction, ...(patch?.interaction ?? {}) },
    layout: { ...current.layout, ...(layoutPatch ?? {}) },
  })
}

export const chartTypeLabel = (type: string) => ({
  bar: '柱状图',
  bar_stack: '堆叠柱状图',
  bar_percent: '百分比柱状图',
  bar_group: '分组柱状图',
  bar_group_stack: '分组堆叠柱状图',
  bar_waterfall: '瀑布图',
  bar_horizontal: '条形图',
  bar_horizontal_stack: '堆叠条形图',
  bar_horizontal_percent: '百分比条形图',
  bar_horizontal_range: '区间条形图',
  bar_horizontal_symmetric: '对称条形图',
  bar_progress: '进度条',
  bar_combo: '柱线组合图',
  bar_combo_group: '分组柱线组合图',
  bar_combo_stack: '堆叠柱线组合图',
  line: '折线图',
  area: '面积图',
  line_stack: '堆叠折线图',
  pie: '饼图',
  doughnut: '环图',
  rose: '玫瑰图',
  table: '表格',
  table_summary: '汇总表',
  table_pivot: '透视表',
  funnel: '漏斗图',
  gauge: '仪表盘',
  scatter: '散点图',
  radar: '雷达图',
  treemap: '矩形树图',
  heatmap: '热力图',
  map: '地图',
  filter_button: '筛选按钮',
  decor_border_frame: '边框装饰',
  decor_border_corner: '角标边框',
  decor_border_glow: '霓虹边框',
  decor_border_grid: '网格边框',
  decor_border_stream: '流光边框',
  decor_border_pulse: '脉冲边框',
  decor_border_bracket: '支架边框',
  decor_border_circuit: '电路边框',
  decor_title_plate: '标题牌',
  decor_divider_glow: '发光分隔条',
  decor_target_ring: '目标环',
  decor_scan_panel: '扫描面板',
  decor_hex_badge: '六边形徽记',
  text_block: '文本组件',
  single_field: '单字段组件',
  number_flipper: '数字翻牌器',
  table_rank: '排名表格',
  iframe_single: 'iframe窗口',
  iframe_tabs: '多iframe切换窗口',
  hyperlink: '超级链接',
  image_list: '图片列表',
  text_list: '文字列表',
  clock_display: '显示时间',
  word_cloud: '词云图',
  qr_code: '二维码',
  business_trend: '业务趋势',
  metric_indicator: '指标组件',
  icon_arrow_trend: '趋势箭头',
  icon_warning_badge: '告警徽标',
  icon_location_pin: '定位图标',
  icon_data_signal: '数据信号',
  icon_user_badge: '用户徽标',
  icon_chart_mark: '图表标识',
}[type] ?? (type || '未知类型'))

const sumValues = (left: unknown, right: unknown) => {
  const leftNumber = Number(left ?? 0)
  const rightNumber = Number(right ?? 0)
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber + rightNumber
  }
  return Number(right ?? 0)
}

export const materializeChartData = (
  rawRows: Record<string, unknown>[],
  columns: string[],
  chartConfig: ComponentChartConfig
): ChartDataResult => {
  const nextColumns = columns.length ? columns : Object.keys(rawRows[0] ?? {})
  const meta = getChartTypeMeta(chartConfig.chartType)
  if (chartConfig.chartType === 'table') {
    return {
      chartType: 'table',
      columns: nextColumns,
      labels: [],
      rawRows,
      series: [],
    }
  }

  if (chartConfig.chartType === 'gauge') {
    if (!chartConfig.yField) {
      return {
        chartType: chartConfig.chartType,
        columns: nextColumns,
        labels: [],
        rawRows,
        series: [],
      }
    }
    const total = rawRows.reduce((sum, row) => sumValues(sum, row[chartConfig.yField]), 0)
    const fallbackGaugeLabel = chartConfig.name || chartConfig.yField
    const gaugeLabel = chartConfig.xField
      ? String(rawRows[0]?.[chartConfig.xField] ?? fallbackGaugeLabel)
      : fallbackGaugeLabel
    return {
      chartType: chartConfig.chartType,
      columns: nextColumns,
      labels: [gaugeLabel],
      rawRows,
      series: [{ name: chartConfig.yField, data: [Number(total) || 0] }],
    }
  }

  if (chartConfig.chartType === 'scatter') {
    if (!chartConfig.xField || !chartConfig.yField) {
      return {
        chartType: chartConfig.chartType,
        columns: nextColumns,
        labels: [],
        rawRows,
        series: [],
      }
    }
    const grouped = new Map<string, Array<[number, number]>>()
    rawRows.forEach((row) => {
      const xValue = Number(row[chartConfig.xField])
      const yValue = Number(row[chartConfig.yField])
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) return
      const groupName = chartConfig.groupField ? String(row[chartConfig.groupField] ?? '未分组') : chartConfig.yField
      const seriesData = grouped.get(groupName) ?? []
      seriesData.push([xValue, yValue])
      grouped.set(groupName, seriesData)
    })
    return {
      chartType: chartConfig.chartType,
      columns: nextColumns,
      labels: [],
      rawRows,
      series: Array.from(grouped.entries()).map(([name, data]) => ({ name, data })),
    }
  }

  if ((meta.requiresDimension && !chartConfig.xField) || (meta.requiresMetric && !chartConfig.yField)) {
    return {
      chartType: chartConfig.chartType,
      columns: nextColumns,
      labels: [],
      rawRows,
      series: [],
    }
  }

  if (chartConfig.groupField) {
    const labels: string[] = []
    const grouped = new Map<string, Map<string, number>>()
    rawRows.forEach((row) => {
      const xValue = String(row[chartConfig.xField] ?? '')
      const groupValue = String(row[chartConfig.groupField] ?? '')
      if (!labels.includes(xValue)) labels.push(xValue)
      const bucket = grouped.get(groupValue) ?? new Map<string, number>()
      bucket.set(xValue, sumValues(bucket.get(xValue), row[chartConfig.yField]))
      grouped.set(groupValue, bucket)
    })
    return {
      chartType: chartConfig.chartType,
      columns: nextColumns,
      labels,
      rawRows,
      series: Array.from(grouped.entries()).map(([name, values]) => ({
        name,
        data: labels.map((label) => values.get(label) ?? 0),
      })),
    }
  }

  const labels: string[] = []
  const values = new Map<string, number>()
  rawRows.forEach((row) => {
    const xValue = String(row[chartConfig.xField] ?? '')
    if (!labels.includes(xValue)) labels.push(xValue)
    values.set(xValue, sumValues(values.get(xValue), row[chartConfig.yField]))
  })
  return {
    chartType: chartConfig.chartType,
    columns: nextColumns,
    labels,
    rawRows,
    series: [{ name: chartConfig.yField, data: labels.map((label) => values.get(label) ?? 0) }],
  }
}

export const buildComponentOption = (data: ChartDataResult, chartConfig: ComponentChartConfig, styleInput: ComponentStyleConfig) => {
  // Force transparent component board globally; charts only render data/decoration content.
  const style: ComponentStyleConfig = { ...styleInput, bgColor: 'rgba(0,0,0,0)' }
  const colors = COLOR_THEMES[style.theme] ?? COLOR_THEMES['默认蓝']
  if (data.chartType === 'pie' || data.chartType === 'doughnut' || data.chartType === 'rose') {
    const isRose = data.chartType === 'rose'
    const pieData = data.series[0]?.data.map((value, index) => ({ name: data.labels[index] ?? String(index), value })) ?? []
    const legend = style.legendPos === 'right'
      ? { orient: 'vertical' as const, right: 10, top: 'center' }
      : style.legendPos === 'top'
        ? { orient: 'horizontal' as const, top: 10 }
        : { orient: 'horizontal' as const, bottom: 0 }
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: style.showLegend ? legend : undefined,
      series: [{
        type: 'pie',
        radius: data.chartType === 'doughnut' ? ['40%', '68%'] : isRose ? ['12%', '68%'] : '64%',
        roseType: isRose ? ('area' as const) : undefined,
        data: pieData,
        label: style.showLabel ? { show: true, fontSize: style.labelSize, formatter: '{b}: {d}%' } : { show: false },
      }],
    }
  }

  if (data.chartType === 'treemap') {
    const treemapData = data.series[0]?.data.map((value, index) => ({
      name: data.labels[index] ?? String(index),
      value: Number(value) || 0,
    })) ?? []
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { formatter: '{b}: {c}' },
      series: [{
        type: 'treemap',
        data: treemapData,
        roam: false,
        leafDepth: 1,
        levels: [{ itemStyle: { gapWidth: 4 } }],
        label: style.showLabel ? { show: true, fontSize: style.labelSize } : { show: false },
      }],
    }
  }

  if (data.chartType === 'funnel') {
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'item' },
      series: [{
        type: 'funnel',
        left: '10%',
        width: '80%',
        label: style.showLabel ? { show: true, fontSize: style.labelSize } : { show: false },
        data: data.series[0]?.data.map((value, index) => ({ name: data.labels[index] ?? String(index), value })) ?? [],
      }],
    }
  }

  if (data.chartType === 'gauge') {
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { formatter: '{a}<br/>{b}: {c}' },
      series: [{
        type: 'gauge',
        radius: '84%',
        splitNumber: 5,
        progress: { show: true, roundCap: true, width: 14 },
        axisLine: { lineStyle: { width: 14, color: [[0.35, '#f56c6c'], [0.7, '#facc14'], [1, colors[0]]] } },
        pointer: { itemStyle: { color: colors[1] ?? colors[0] } },
        title: { show: style.showLabel, fontSize: 14, color: '#52637a', offsetCenter: [0, '72%'] },
        detail: { show: style.showLabel, formatter: '{value}', fontSize: 26, color: '#183153', offsetCenter: [0, '34%'] },
        data: [{ value: Number(data.series[0]?.data[0] ?? 0), name: data.labels[0] ?? chartConfig.name }],
      }],
    }
  }

  if (data.chartType === 'radar') {
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'item' },
      legend: style.showLegend && data.series.length ? { top: 6 } : undefined,
      radar: {
        radius: '66%',
        splitNumber: 4,
        indicator: data.labels.map((label) => ({ name: label, max: Math.max(...data.series.flatMap((item) => item.data.map((value) => Number(value) || 0)), 1) })),
        splitArea: { areaStyle: { color: ['rgba(31,122,224,0.02)', 'rgba(31,122,224,0.04)'] } },
      },
      series: [{
        type: 'radar',
        data: data.series.map((item) => ({ value: item.data, name: item.name })),
        label: style.showLabel ? { show: true, fontSize: style.labelSize } : { show: false },
        areaStyle: { opacity: 0.12 },
      }],
    }
  }

  if (data.chartType === 'scatter') {
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'item' },
      legend: style.showLegend && data.series.length ? { top: 6 } : undefined,
      grid: { left: 28, right: 20, bottom: 28, top: data.series.length > 1 ? 40 : 18, containLabel: true },
      xAxis: {
        type: 'value',
        name: style.showXName ? chartConfig.xField : '',
        splitLine: style.showGrid ? {} : { show: false },
      },
      yAxis: {
        type: 'value',
        name: style.showYName ? chartConfig.yField : '',
        splitLine: style.showGrid ? {} : { show: false },
      },
      series: data.series.map((item) => ({
        name: item.name,
        type: 'scatter',
        data: item.data,
        symbolSize: 16,
        label: style.showLabel ? { show: true, fontSize: style.labelSize, position: 'top' } : { show: false },
      })),
    }
  }

  // ─── 热力图 ────────────────────────────────────────────────────────────────
  if (data.chartType === 'heatmap') {
    const rawRows = data.rawRows ?? []
    if (!chartConfig.xField || !chartConfig.yField || !rawRows.length) {
      return { color: colors, backgroundColor: style.bgColor }
    }
    const yKey = chartConfig.groupField || chartConfig.xField
    const xCats: string[] = []
    const yCats: string[] = []
    const valueMap = new Map<string, number>()
    rawRows.forEach((row) => {
      const x = String(row[chartConfig.xField] ?? '')
      const y = String(row[yKey] ?? '')
      const v = Number(row[chartConfig.yField]) || 0
      if (!xCats.includes(x)) xCats.push(x)
      if (!yCats.includes(y)) yCats.push(y)
      valueMap.set(`${x}||${y}`, v)
    })
    const heatData: [number, number, number][] = []
    xCats.forEach((x, xi) => yCats.forEach((y, yi) => heatData.push([xi, yi, valueMap.get(`${x}||${y}`) ?? 0])))
    const allVals = heatData.map(([,, v]) => v)
    const maxVal = Math.max(...allVals, 1)
    const minVal = Math.min(...allVals, 0)
    const heatColors = colors.slice(0, 2).length >= 2 ? [colors[0], colors[1]] : ['#e0f3f8', '#4575b4']
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { position: 'top' },
      grid: { left: 60, right: 20, bottom: style.showLegend ? 52 : 22, top: 20 },
      xAxis: { type: 'category', data: xCats, splitArea: { show: true } },
      yAxis: { type: 'category', data: yCats, splitArea: { show: true } },
      visualMap: { min: minVal, max: maxVal, show: style.showLegend, orient: 'horizontal', left: 'center', bottom: 2, inRange: { color: heatColors } },
      series: [{ type: 'heatmap', data: heatData, label: style.showLabel ? { show: true, fontSize: style.labelSize } : { show: false }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' } } }],
    }
  }

  // ─── 柱线组合图 ──────────────────────────────────────────────────────────────
  if (data.chartType === 'bar_combo' || data.chartType === 'bar_combo_group' || data.chartType === 'bar_combo_stack') {
    if (!data.series.length) return { color: colors, backgroundColor: style.bgColor }
    const isComboStack = data.chartType === 'bar_combo_stack'
    const shouldShowLegend = style.showLegend && data.series.length > 0
    const legend = shouldShowLegend ? (style.legendPos === 'top' ? { top: 6 } : { bottom: 0 }) : undefined
    const gridSplit = style.showGrid ? {} : { splitLine: { show: false } }
    const midpoint = Math.max(1, Math.ceil(data.series.length / 2))
    const barSeries = data.series.slice(0, midpoint)
    const lineSeries = data.series.slice(midpoint)
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'axis' },
      legend,
      grid: { left: 24, right: 60, bottom: shouldShowLegend && style.legendPos === 'bottom' ? 32 : 22, top: shouldShowLegend && style.legendPos !== 'bottom' ? 42 : 18, containLabel: true },
      xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: data.labels.length > 8 ? 28 : 0 } },
      yAxis: [
        { type: 'value', ...gridSplit, name: style.showYName ? chartConfig.yField : '' },
        { type: 'value', splitLine: { show: false } },
      ],
      series: [
        ...barSeries.map((item) => ({ name: item.name, type: 'bar' as const, stack: isComboStack ? 'combo' : undefined, barMaxWidth: style.barMaxWidth, itemStyle: { borderRadius: [style.barRadius, style.barRadius, 0, 0] }, label: style.showLabel ? { show: true, position: 'top' as const, fontSize: style.labelSize } : { show: false }, data: item.data })),
        ...lineSeries.map((item) => ({ name: item.name, type: 'line' as const, yAxisIndex: 1, smooth: style.smooth, symbol: 'circle', symbolSize: 6, label: style.showLabel ? { show: true, position: 'top' as const, fontSize: style.labelSize } : { show: false }, data: item.data })),
      ],
    }
  }

  // ─── 瀑布图 ────────────────────────────────────────────────────────────────
  if (data.chartType === 'bar_waterfall') {
    if (!data.series.length) return { color: colors, backgroundColor: style.bgColor }
    const rawVals = data.series[0].data.map((v) => Number(v) || 0)
    const helpers: number[] = []
    const barVals: number[] = []
    let acc = 0
    rawVals.forEach((v) => { helpers.push(acc < 0 ? acc + Math.min(v, 0) : acc + Math.min(v, 0) + (v < 0 ? 0 : 0)); barVals.push(v); if (v >= 0) { helpers[helpers.length - 1] = acc } else { helpers[helpers.length - 1] = acc + v }; acc += v })
    // Simplified waterfall: helper = cumulative base, actual = delta
    const helper2: number[] = [0]
    const bar2: number[] = [rawVals[0]]
    let cum = rawVals[0]
    for (let i = 1; i < rawVals.length; i++) { helper2.push(cum >= 0 ? cum : 0); bar2.push(rawVals[i]); cum += rawVals[i] }
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'axis', formatter: (p: any[]) => `${p[1]?.axisValue}: ${p[1]?.value}` },
      grid: { left: 24, right: 18, bottom: 22, top: 18, containLabel: true },
      xAxis: { type: 'category', data: data.labels },
      yAxis: { type: 'value', splitLine: style.showGrid ? {} : { show: false } },
      series: [
        { type: 'bar', stack: 'wf', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent', borderColor: 'transparent' } }, data: helper2 },
        { type: 'bar', stack: 'wf', barMaxWidth: style.barMaxWidth, itemStyle: { borderRadius: [style.barRadius, style.barRadius, 0, 0], color: (p: any) => rawVals[p.dataIndex] >= 0 ? (colors[0] ?? '#5470c6') : (colors[2] ?? '#ee6666') as any }, label: style.showLabel ? { show: true, position: 'top' as const, fontSize: style.labelSize } : { show: false }, data: bar2 },
      ],
    }
  }

  // ─── 进度条 ────────────────────────────────────────────────────────────────
  if (data.chartType === 'bar_progress') {
    if (!data.series.length) return { color: colors, backgroundColor: style.bgColor }
    const maxVal = Math.max(...data.series[0].data.map((v) => Number(v) || 0), 1)
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 16, right: 16, bottom: 8, top: 8, containLabel: true },
      xAxis: { type: 'value', max: maxVal, splitLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false } },
      yAxis: { type: 'category', data: data.labels, axisTick: { show: false }, axisLine: { show: false } },
      series: [{ type: 'bar', data: data.series[0].data.map((v) => Number(v) || 0), barMaxWidth: 20, itemStyle: { borderRadius: 10, color: colors[0] ?? '#5470c6' }, label: style.showLabel ? { show: true, position: 'insideRight' as const, fontSize: style.labelSize, color: '#fff' } : { show: false }, showBackground: true, backgroundStyle: { color: 'rgba(200,200,200,0.15)', borderRadius: 10 } }],
    }
  }

  // ─── 对称条形图 ──────────────────────────────────────────────────────────────
  if (data.chartType === 'bar_horizontal_symmetric') {
    if (!data.series.length) return { color: colors, backgroundColor: style.bgColor }
    const leftData = data.series[0].data.map((v) => -Math.abs(Number(v) || 0))
    const rightData = (data.series[1] ?? data.series[0]).data.map((v) => Math.abs(Number(v) || 0))
    const shouldShowLegend = style.showLegend && data.series.length > 0
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: shouldShowLegend ? (style.legendPos === 'top' ? { top: 6 } : { bottom: 0 }) : undefined,
      grid: { left: 16, right: 16, bottom: shouldShowLegend && style.legendPos === 'bottom' ? 32 : 22, top: shouldShowLegend ? 42 : 22, containLabel: true },
      xAxis: { type: 'value', splitLine: style.showGrid ? {} : { show: false }, axisLabel: { formatter: (v: number) => Math.abs(v).toString() } },
      yAxis: { type: 'category', data: data.labels },
      series: [
        { name: data.series[0]?.name ?? '系列1', type: 'bar' as const, barMaxWidth: style.barMaxWidth, itemStyle: { borderRadius: [0, style.barRadius, style.barRadius, 0], color: colors[0] }, label: style.showLabel ? { show: true, position: 'left' as const, fontSize: style.labelSize, formatter: (p: any) => Math.abs(p.value).toString() } : { show: false }, data: leftData },
        { name: (data.series[1] ?? data.series[0])?.name ?? '系列2', type: 'bar' as const, barMaxWidth: style.barMaxWidth, itemStyle: { borderRadius: [style.barRadius, 0, 0, style.barRadius], color: colors[1] ?? colors[0] }, label: style.showLabel ? { show: true, position: 'right' as const, fontSize: style.labelSize } : { show: false }, data: rightData },
      ],
    }
  }

  // ─── 百分比条形图（水平） ────────────────────────────────────────────────────
  if (data.chartType === 'bar_horizontal_percent') {
    if (!data.series.length) return { color: colors, backgroundColor: style.bgColor }
    const totals = data.labels.map((_: string, idx: number) => data.series.reduce((s, ser) => s + (Number(ser.data[idx]) || 0), 0))
    const shouldShowLegend = style.showLegend && data.series.length > 0
    return {
      color: colors,
      backgroundColor: style.bgColor,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: shouldShowLegend ? (style.legendPos === 'top' ? { top: 6 } : { bottom: 0 }) : undefined,
      grid: { left: 24, right: 18, bottom: shouldShowLegend && style.legendPos === 'bottom' ? 32 : 22, top: shouldShowLegend && style.legendPos !== 'bottom' ? 42 : 18, containLabel: true },
      xAxis: { type: 'value', max: Math.max(...totals, 1), splitLine: style.showGrid ? {} : { show: false } },
      yAxis: { type: 'category', data: data.labels },
      series: data.series.map((item) => ({ name: item.name, type: 'bar' as const, stack: 'total', barMaxWidth: style.barMaxWidth, label: style.showLabel ? { show: true, fontSize: style.labelSize, formatter: (p: any) => `${((p.value / totals[p.dataIndex]) * 100).toFixed(1)}%` } : { show: false }, data: item.data })),
    }
  }

  const horizontal = data.chartType === 'bar_horizontal' || data.chartType === 'bar_horizontal_stack'
  const isStackType = ['bar_stack', 'bar_percent', 'line_stack', 'bar_horizontal_stack', 'bar_group_stack'].includes(data.chartType)
  const isPercent = data.chartType === 'bar_percent'
  const isAreaType = data.chartType === 'area'
  const baseType = (horizontal || data.chartType === 'bar' || data.chartType === 'bar_stack' || data.chartType === 'bar_percent' || data.chartType === 'bar_group') ? 'bar'
    : (data.chartType === 'line' || data.chartType === 'area' || data.chartType === 'line_stack') ? 'line'
    : data.chartType
  const gridSplitLine = style.showGrid ? {} : { splitLine: { show: false } }
  const shouldShowLegend = style.showLegend && data.series.length > 0
  const legend = shouldShowLegend
    ? (style.legendPos === 'right'
        ? { orient: 'vertical' as const, right: 8, top: 'center' }
        : style.legendPos === 'top'
          ? { top: 6 }
          : { bottom: 0 })
    : undefined
  return {
    color: colors,
    backgroundColor: style.bgColor,
    tooltip: { trigger: 'axis' },
    legend,
    grid: {
      left: 24,
      right: shouldShowLegend && style.legendPos === 'right' ? 80 : 18,
      bottom: shouldShowLegend && style.legendPos === 'bottom' ? 32 : 22,
      top: shouldShowLegend && style.legendPos !== 'bottom' ? 42 : 18,
      containLabel: true,
    },
    ...(horizontal
      ? {
          xAxis: { type: 'value', ...gridSplitLine, name: style.showXName ? chartConfig.yField : '' },
          yAxis: { type: 'category', data: data.labels, name: style.showYName ? chartConfig.xField : '' },
        }
      : {
          xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: data.labels.length > 8 ? 28 : 0 }, name: style.showXName ? chartConfig.xField : '' },
          yAxis: { type: 'value', ...gridSplitLine, name: style.showYName ? chartConfig.yField : '' },
        }),
    series: (() => {
      if (isPercent && data.series.length > 0) {
        const totals = data.labels.map((_: string, idx: number) =>
          data.series.reduce((sum, s) => sum + (Number(s.data[idx]) || 0), 0)
        )
        return data.series.map((item) => ({
          name: item.name,
          type: 'bar',
          stack: 'total',
          data: item.data.map((val, idx) => {
            const total = totals[idx] || 1
            return Number(((Number(val) / total) * 100).toFixed(1))
          }),
          itemStyle: { borderRadius: style.barRadius },
          barMaxWidth: style.barMaxWidth,
          label: { show: true, fontSize: style.labelSize, formatter: '{c}%', position: horizontal ? 'right' : 'inside' },
        }))
      }
      return data.series.map((item) => ({
        name: item.name,
        type: baseType,
        stack: isStackType ? 'total' : undefined,
        smooth: baseType === 'line' ? style.smooth : undefined,
        data: item.data,
        areaStyle: (baseType === 'line' && (style.areaFill || data.chartType === 'line_stack' || isAreaType)) ? { opacity: 0.22 } : undefined,
        itemStyle: baseType === 'bar' ? { borderRadius: style.barRadius } : undefined,
        barMaxWidth: baseType === 'bar' ? style.barMaxWidth : undefined,
        label: style.showLabel ? { show: true, fontSize: style.labelSize, position: horizontal ? 'right' : 'top' } : { show: false },
      }))
    })(),
  }
}

/**
 * 对 ECharts option 追加标题 / 提示框可见性后处理（就地修改）
 * 在 renderChart 调用 setOption 之前执行
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const postProcessChartOption = (option: any, style: ComponentStyleConfig, chartName: string): void => {
  // Force chart titles hidden for screen clean-room visual style.
  delete option.title
  if (!style.showTooltip) {
    delete option.tooltip
  }
}