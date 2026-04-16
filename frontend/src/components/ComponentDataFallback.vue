<template>
  <div class="fallback-widget" :class="{ 'fallback-widget--dark': dark }">
    <div class="fallback-metrics">
      <div class="fallback-metric">
        <span class="fallback-metric-label">组件类型</span>
        <strong class="fallback-metric-value">{{ chartTypeLabel(chartType) }}</strong>
      </div>
      <div class="fallback-metric">
        <span class="fallback-metric-label">记录数</span>
        <strong class="fallback-metric-value">{{ rowCount }}</strong>
      </div>
      <div v-if="formattedSummaryMetricValue" class="fallback-metric">
        <span class="fallback-metric-label">{{ summaryMetricLabel }}</span>
        <strong class="fallback-metric-value">{{ formattedSummaryMetricValue }}</strong>
      </div>
    </div>

    <div v-if="topItems.length" class="fallback-list">
      <div class="fallback-list-title">{{ listTitle }}</div>
      <div v-for="item in topItems" :key="item.label" class="fallback-row">
        <div class="fallback-row-head">
          <span class="fallback-row-label">{{ item.label }}</span>
          <span class="fallback-row-value">{{ item.displayValue }}</span>
        </div>
        <div class="fallback-row-bar">
          <span class="fallback-row-bar-fill" :style="{ width: `${item.percent}%` }" />
        </div>
      </div>
    </div>
    <div v-else class="fallback-empty">暂无可展示的数据摘要</div>

    <div v-if="groupValues.length" class="fallback-tags">
      <span v-for="group in groupValues" :key="group" class="fallback-tag">{{ group }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChartDataResult } from '../api/chart'
import { chartTypeLabel, type ComponentChartConfig } from '../utils/component-config'

const props = withDefaults(defineProps<{
  chartType: string
  chartConfig: ComponentChartConfig
  data?: ChartDataResult | null
  dark?: boolean
}>(), {
  data: null,
  dark: false,
})

interface SummaryItem {
  label: string
  value: number
  displayValue: string
  percent: number
}

const formatNumber = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}

const rawRows = computed(() => props.data?.rawRows ?? [])

const rowCount = computed(() => rawRows.value.length || props.data?.labels.length || 0)

const summaryMetric = computed(() => {
  if (rawRows.value.length && props.chartConfig.yField) {
    const values = rawRows.value
      .map((row) => Number(row[props.chartConfig.yField]))
      .filter((value) => Number.isFinite(value))
    if (values.length) {
      return values.reduce((sum, value) => sum + value, 0)
    }
  }

  const values = (props.data?.series ?? [])
    .flatMap((series) => series.data)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0)
})

const formattedSummaryMetricValue = computed(() => (
  summaryMetric.value == null ? '' : formatNumber(summaryMetric.value)
))

const summaryMetricLabel = computed(() => props.chartConfig.yField || '汇总值')

const topItems = computed<SummaryItem[]>(() => {
  const buckets = new Map<string, number>()

  if (rawRows.value.length && props.chartConfig.xField) {
    rawRows.value.forEach((row) => {
      const label = String(row[props.chartConfig.xField] ?? '').trim()
      if (!label) return
      const numericValue = props.chartConfig.yField ? Number(row[props.chartConfig.yField]) : Number.NaN
      const nextValue = Number.isFinite(numericValue)
        ? (buckets.get(label) ?? 0) + numericValue
        : (buckets.get(label) ?? 0) + 1
      buckets.set(label, nextValue)
    })
  } else if (props.data?.labels.length) {
    const baseSeries = props.data.series[0]
    props.data.labels.forEach((label, index) => {
      const numericValue = Number(baseSeries?.data[index] ?? 0)
      buckets.set(String(label), Number.isFinite(numericValue) ? numericValue : 0)
    })
  }

  const ranked = Array.from(buckets.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.label)
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 6)

  const maxValue = Math.max(...ranked.map((item) => Math.abs(item.value)), 1)
  return ranked.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: formatNumber(item.value),
    percent: Math.max(8, Math.round((Math.abs(item.value) / maxValue) * 100)),
  }))
})

const groupValues = computed(() => {
  if (!props.chartConfig.groupField || !rawRows.value.length) return []
  const values = new Set<string>()
  rawRows.value.forEach((row) => {
    const value = row[props.chartConfig.groupField]
    if (value == null) return
    const normalized = String(value).trim()
    if (normalized) values.add(normalized)
  })
  return Array.from(values).slice(0, 6)
})

const listTitle = computed(() => {
  if (props.chartType === 'map') return '区域概览'
  if (props.chartType === 'bar_horizontal_range') return '区间概览'
  return '数据概览'
})
</script>

<style scoped>
.fallback-widget {
  --fallback-card-bg: rgba(255, 255, 255, 0.86);
  --fallback-card-border: rgba(191, 214, 239, 0.9);
  --fallback-text: #173250;
  --fallback-muted: #6a8099;
  --fallback-accent: #2a6fba;
  --fallback-track: rgba(42, 111, 186, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.fallback-widget--dark {
  --fallback-card-bg: rgba(9, 28, 48, 0.62);
  --fallback-card-border: rgba(102, 146, 196, 0.28);
  --fallback-text: #eef5ff;
  --fallback-muted: rgba(220, 232, 245, 0.74);
  --fallback-accent: #65c0ff;
  --fallback-track: rgba(101, 192, 255, 0.14);
}

.fallback-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.fallback-metric,
.fallback-list,
.fallback-empty {
  border: 1px solid var(--fallback-card-border);
  background: var(--fallback-card-bg);
  border-radius: 12px;
}

.fallback-metric {
  padding: 12px;
}

.fallback-metric-label,
.fallback-list-title,
.fallback-row-value,
.fallback-empty,
.fallback-tag {
  color: var(--fallback-muted);
}

.fallback-metric-label {
  display: block;
  font-size: 12px;
  line-height: 1.4;
}

.fallback-metric-value {
  display: block;
  margin-top: 8px;
  color: var(--fallback-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.fallback-list {
  padding: 12px;
}

.fallback-list-title {
  font-size: 12px;
  margin-bottom: 10px;
}

.fallback-row + .fallback-row {
  margin-top: 10px;
}

.fallback-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.fallback-row-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--fallback-text);
  font-size: 13px;
}

.fallback-row-value {
  font-size: 12px;
  white-space: nowrap;
}

.fallback-row-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--fallback-track);
  overflow: hidden;
}

.fallback-row-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--fallback-accent), rgba(42, 111, 186, 0.45));
}

.fallback-widget--dark .fallback-row-bar-fill {
  background: linear-gradient(90deg, var(--fallback-accent), rgba(101, 192, 255, 0.38));
}

.fallback-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px;
  font-size: 12px;
}

.fallback-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fallback-tag {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--fallback-card-bg);
  border: 1px solid var(--fallback-card-border);
  font-size: 12px;
}
</style>