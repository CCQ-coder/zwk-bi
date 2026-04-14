import type { Chart, ChartDataResult } from '../api/chart'

export interface ComponentChartConfig {
  name: string
  datasetId: number | ''
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
  bgColor: '#f7fbff',
  showLegend: true,
  showLabel: true,
  labelSize: 12,
  showXName: false,
  showYName: false,
  showGrid: true,
  smooth: false,
  areaFill: false,
  barRadius: 6,
  barMaxWidth: 40,
  legendPos: 'bottom',
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
  'bar', 'bar_stack', 'bar_percent', 'bar_group',
  'bar_horizontal', 'bar_horizontal_stack',
  'line', 'area', 'line_stack',
  'pie', 'doughnut', 'rose',
  'funnel', 'gauge', 'radar', 'scatter', 'treemap',
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
  bar_horizontal: '条形图',
  bar_horizontal_stack: '堆叠条形图',
  line: '折线图',
  area: '面积图',
  line_stack: '堆叠折线图',
  pie: '饼图',
  doughnut: '环图',
  rose: '玫瑰图',
  table: '表格',
  funnel: '漏斗图',
  gauge: '仪表盘',
  scatter: '散点图',
  radar: '雷达图',
  treemap: '矩形树图',
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

export const buildComponentOption = (data: ChartDataResult, chartConfig: ComponentChartConfig, style: ComponentStyleConfig) => {
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

  const horizontal = data.chartType === 'bar_horizontal' || data.chartType === 'bar_horizontal_stack'
  const isStackType = ['bar_stack', 'bar_percent', 'line_stack', 'bar_horizontal_stack'].includes(data.chartType)
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