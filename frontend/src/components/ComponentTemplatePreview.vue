<template>
  <div class="template-preview-shell">
    <div v-if="previewMode === 'chart'" ref="chartRef" class="template-preview-chart" />

    <div v-else-if="previewMode === 'table'" class="template-preview-table">
      <div class="template-preview-table-head">
        <span v-for="column in tableColumns" :key="column" class="template-preview-cell template-preview-cell--head">{{ column }}</span>
      </div>
      <div v-for="(row, index) in tableRows" :key="`row-${index}`" class="template-preview-table-row">
        <span v-for="column in tableColumns" :key="`${index}-${column}`" class="template-preview-cell">{{ formatCell(row[column]) }}</span>
      </div>
    </div>

    <div v-else-if="previewMode === 'filter'" class="template-preview-filter">
      <div class="template-preview-filter-label">{{ previewChartConfig.xField || '筛选字段' }}</div>
      <div class="template-preview-filter-grid">
        <span class="template-preview-chip template-preview-chip--active">全部</span>
        <span v-for="item in filterOptions" :key="item" class="template-preview-chip">{{ item }}</span>
      </div>
    </div>

    <ComponentDataFallback
      v-else
      :chart-type="previewChartConfig.chartType"
      :chart-config="previewChartConfig"
      :data="previewData"
      dark
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ChartDataResult } from '../api/chart'
import ComponentDataFallback from './ComponentDataFallback.vue'
import {
  DEFAULT_COMPONENT_STYLE,
  buildComponentOption,
  chartTypeLabel,
  getChartTypeMeta,
  isCanvasRenderableChartType,
  materializeChartData,
  postProcessChartOption,
  type ComponentChartConfig,
  type ComponentStyleConfig,
} from '../utils/component-config'
import { echarts, type ECharts } from '../utils/echarts'

const props = defineProps<{
  chartConfig: ComponentChartConfig
  styleConfig?: ComponentStyleConfig | null
}>()

const TABLE_PREVIEW_TYPES = new Set(['table', 'table_summary', 'table_pivot', 'table_rank'])
const GROUP_PREVIEW_TYPES = new Set([
  'bar_stack',
  'bar_percent',
  'bar_group',
  'bar_group_stack',
  'bar_horizontal_stack',
  'bar_horizontal_percent',
  'bar_horizontal_symmetric',
  'bar_combo',
  'bar_combo_group',
  'bar_combo_stack',
  'line_stack',
  'scatter',
  'radar',
  'heatmap',
])

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: ECharts | null = null

const previewChartConfig = computed<ComponentChartConfig>(() => {
  const next: ComponentChartConfig = {
    ...props.chartConfig,
    name: props.chartConfig.name || chartTypeLabel(props.chartConfig.chartType || 'bar'),
    chartType: props.chartConfig.chartType || 'bar',
    xField: props.chartConfig.xField || '',
    yField: props.chartConfig.yField || '',
    groupField: props.chartConfig.groupField || '',
  }
  const meta = getChartTypeMeta(next.chartType)

  if (!next.xField && (meta.requiresDimension || meta.allowsOptionalDimension || next.chartType === 'filter_button' || TABLE_PREVIEW_TYPES.has(next.chartType))) {
    next.xField = next.chartType === 'scatter' ? 'xValue' : 'category'
  }

  if (!next.yField && (meta.requiresMetric || TABLE_PREVIEW_TYPES.has(next.chartType))) {
    next.yField = next.chartType === 'scatter' ? 'yValue' : 'value'
  }

  if (!next.groupField && GROUP_PREVIEW_TYPES.has(next.chartType)) {
    next.groupField = next.chartType === 'heatmap' ? 'band' : 'series'
  }

  if (next.chartType === 'gauge' && !next.xField) {
    next.xField = 'label'
  }

  return next
})

const previewStyle = computed<ComponentStyleConfig>(() => ({
  ...DEFAULT_COMPONENT_STYLE,
  ...(props.styleConfig ?? {}),
  bgColor: 'rgba(0,0,0,0)',
  showTitle: false,
}))

const previewRows = computed<Record<string, unknown>[]>(() => buildPreviewRows(previewChartConfig.value))
const previewColumns = computed(() => Object.keys(previewRows.value[0] ?? {}))
const previewData = computed<ChartDataResult>(() => materializeChartData(previewRows.value, previewColumns.value, previewChartConfig.value))

const previewMode = computed<'chart' | 'table' | 'filter' | 'fallback'>(() => {
  const type = previewChartConfig.value.chartType
  if (TABLE_PREVIEW_TYPES.has(type)) return 'table'
  if (type === 'filter_button') return 'filter'
  if (!isCanvasRenderableChartType(type)) return 'fallback'
  if (!getChartTypeMeta(type).stablePreview || type === 'map') return 'fallback'
  return 'chart'
})

const tableColumns = computed(() => previewColumns.value.slice(0, 4))
const tableRows = computed(() => previewRows.value.slice(0, 4))
const filterOptions = computed(() => {
  const field = previewChartConfig.value.xField
  if (!field) return []
  return Array.from(new Set(previewRows.value.map((row) => String(row[field] ?? '')).filter(Boolean))).slice(0, 5)
})

const disposeChart = () => {
  if (!chartInstance) return
  chartInstance.dispose()
  chartInstance = null
}

const renderChart = async () => {
  if (previewMode.value !== 'chart') {
    disposeChart()
    return
  }

  await nextTick()
  if (!chartRef.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const option: any = buildComponentOption(previewData.value, previewChartConfig.value, previewStyle.value)
  postProcessChartOption(option, previewStyle.value, previewChartConfig.value.name)
  option.animation = false
  chartInstance.setOption(option, true)
  chartInstance.resize()
}

watch([previewMode, previewData, previewChartConfig, previewStyle], renderChart, { deep: true, immediate: true })

onBeforeUnmount(() => {
  disposeChart()
})

function buildPreviewRows(chartConfig: ComponentChartConfig) {
  const dimensionField = chartConfig.xField || 'category'
  const metricField = chartConfig.yField || 'value'
  const groupField = chartConfig.groupField || 'series'
  const categories = ['华东', '华南', '华北', '华中', '西南', '东北']
  const metricValues = [126, 168, 142, 195, 171, 214]
  const compareValues = [82, 116, 101, 148, 133, 162]
  const tertiaryValues = [64, 88, 79, 110, 98, 126]

  if (chartConfig.chartType === 'gauge') {
    return [{ [chartConfig.xField || 'label']: '达成率', [metricField]: 78 }]
  }

  if (chartConfig.chartType === 'scatter') {
    const points: Array<[number, number]> = [[14, 34], [22, 48], [28, 40], [36, 64], [44, 58], [52, 78]]
    return points.map(([x, y], index) => ({
      [dimensionField]: x,
      [metricField]: y,
      ...(chartConfig.groupField ? { [groupField]: index % 2 === 0 ? '计划' : '实际' } : {}),
    }))
  }

  if (chartConfig.chartType === 'heatmap') {
    const bands = ['周一', '周三', '周五']
    return categories.slice(0, 4).flatMap((category, categoryIndex) => (
      bands.map((band, bandIndex) => ({
        [dimensionField]: category,
        [groupField]: band,
        [metricField]: 42 + categoryIndex * 18 + bandIndex * 11,
      }))
    ))
  }

  if (TABLE_PREVIEW_TYPES.has(chartConfig.chartType)) {
    return categories.slice(0, 5).map((category, index) => ({
      [dimensionField]: category,
      [metricField]: metricValues[index],
      状态: index % 2 === 0 ? '正常' : '关注',
      同比: `${index % 2 === 0 ? '+' : '-'}${8 + index}%`,
    }))
  }

  if (chartConfig.chartType === 'filter_button') {
    return ['全部', '重点区域', '增长中', '预警中', '已完成'].map((item, index) => ({
      [dimensionField]: item,
      [metricField]: index + 1,
    }))
  }

  if (chartConfig.groupField) {
    const groups = ['计划', '实际', '预测']
    const seriesValues = [metricValues, compareValues, tertiaryValues]
    return categories.map((category, index) => groups.map((groupName, groupIndex) => ({
      [dimensionField]: category,
      [metricField]: seriesValues[groupIndex][index],
      [groupField]: groupName,
    }))).flat()
  }

  return categories.map((category, index) => ({
    [dimensionField]: category,
    [metricField]: metricValues[index],
  }))
}

function formatCell(value: unknown) {
  if (value == null) return '--'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}
</script>

<style scoped>
.template-preview-shell {
  display: flex;
  width: 100%;
  height: 100%;
}

.template-preview-chart,
.template-preview-table,
.template-preview-filter,
.template-preview-shell :deep(.fallback-widget) {
  width: 100%;
  height: 100%;
}

.template-preview-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.template-preview-table-head,
.template-preview-table-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.template-preview-cell {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(7, 24, 41, 0.68);
  border: 1px solid rgba(101, 184, 255, 0.12);
  color: rgba(228, 241, 255, 0.84);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-preview-cell--head {
  background: rgba(61, 143, 219, 0.16);
  color: #f4f8ff;
  font-weight: 700;
}

.template-preview-filter {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 18px;
}

.template-preview-filter-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(178, 211, 241, 0.68);
}

.template-preview-filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.template-preview-chip {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(111, 188, 255, 0.16);
  background: rgba(6, 23, 38, 0.72);
  color: rgba(224, 239, 255, 0.82);
  font-size: 12px;
}

.template-preview-chip--active {
  background: linear-gradient(135deg, rgba(58, 147, 255, 0.26), rgba(18, 88, 164, 0.6));
  border-color: rgba(111, 188, 255, 0.34);
  color: #f5fbff;
}
</style>