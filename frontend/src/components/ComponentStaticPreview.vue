<template>
  <div class="static-widget" :class="[`static-widget--${themeName}`, { 'static-widget--dark': dark }]">
    <template v-if="isDecorationChartType(chartType)">
      <div class="decor-shell" :class="`decor-shell--${chartType}`">
        <span class="decor-corner decor-corner--tl" />
        <span class="decor-corner decor-corner--tr" />
        <span class="decor-corner decor-corner--bl" />
        <span class="decor-corner decor-corner--br" />
      </div>
    </template>

    <template v-else-if="isVectorIconChartType(chartType)">
      <div class="icon-shell">
        <div class="icon-shell__stage" v-html="iconMarkup" />
        <template v-if="shouldShowTitle">
          <div class="icon-shell__label">{{ titleText }}</div>
          <div class="icon-shell__meta">{{ chartTypeLabel(chartType) }}</div>
        </template>
      </div>
    </template>

    <template v-else-if="chartType === 'clock_display'">
      <div class="time-shell">
        <div class="time-shell__date">{{ nowDate }}</div>
        <div class="time-shell__time">{{ nowTime }}</div>
        <div class="time-shell__meta">系统时间</div>
      </div>
    </template>

    <template v-else-if="chartType === 'qr_code'">
      <div class="qr-shell">
        <div class="qr-grid">
          <span
            v-for="cell in qrCells"
            :key="cell.key"
            class="qr-grid__cell"
            :class="{ 'qr-grid__cell--active': cell.active }"
          />
        </div>
        <div class="qr-shell__meta">扫码查看</div>
      </div>
    </template>

    <template v-else-if="chartType === 'hyperlink'">
      <div class="link-shell">
        <div v-if="shouldShowTitle" class="link-shell__title">{{ titleText }}</div>
        <a class="link-shell__url" href="javascript:void(0)">https://portal.example.com/overview</a>
        <div class="link-shell__hint">点击后可跳转业务页面</div>
      </div>
    </template>

    <template v-else-if="chartType === 'iframe_single' || chartType === 'iframe_tabs'">
      <div class="frame-shell">
        <div v-if="chartType === 'iframe_tabs'" class="frame-shell__tabs">
          <span class="frame-shell__tab frame-shell__tab--active">总览</span>
          <span class="frame-shell__tab">区域</span>
          <span class="frame-shell__tab">明细</span>
        </div>
        <div class="frame-shell__bar">
          <span class="frame-shell__dot" />
          <span class="frame-shell__dot" />
          <span class="frame-shell__dot" />
          <span class="frame-shell__address">embedded.business.local</span>
        </div>
        <div class="frame-shell__body">
          <div class="frame-shell__card" />
          <div class="frame-shell__card frame-shell__card--wide" />
          <div class="frame-shell__card" />
        </div>
      </div>
    </template>

    <template v-else-if="chartType === 'text_block'">
      <div class="text-shell">
        <div v-if="shouldShowTitle" class="text-shell__title">{{ titleText }}</div>
        <div class="text-shell__paragraph">本区域适合展示公告、提示信息、模块说明或重点摘要，支持作为独立文字组件进行视觉编排。</div>
      </div>
    </template>

    <template v-else-if="chartType === 'single_field' || chartType === 'metric_indicator' || chartType === 'number_flipper'">
      <div class="metric-shell">
        <div v-if="shouldShowTitle" class="metric-shell__title">{{ titleText }}</div>
        <div class="metric-shell__value" :class="{ 'metric-shell__value--flipper': chartType === 'number_flipper' }">{{ primaryMetric }}</div>
        <div class="metric-shell__trend">较昨日 <span>+12.6%</span></div>
      </div>
    </template>

    <template v-else-if="chartType === 'text_list' || chartType === 'image_list' || chartType === 'table_rank'">
      <div class="list-shell">
        <div v-if="shouldShowTitle" class="list-shell__title">{{ titleText }}</div>
        <div
          v-for="item in listItems"
          :key="item.key"
          class="list-shell__row"
          :class="{ 'list-shell__row--media': chartType === 'image_list' }"
        >
          <span class="list-shell__index">{{ item.index }}</span>
          <span v-if="chartType === 'image_list'" class="list-shell__thumb" />
          <span class="list-shell__label">{{ item.label }}</span>
          <span class="list-shell__value">{{ item.value }}</span>
        </div>
      </div>
    </template>

    <template v-else-if="chartType === 'word_cloud'">
      <div class="cloud-shell">
        <span v-for="item in cloudItems" :key="item.word" class="cloud-shell__word" :style="{ fontSize: item.size, opacity: item.opacity }">
          {{ item.word }}
        </span>
      </div>
    </template>

    <template v-else-if="chartType === 'business_trend'">
      <div class="trend-shell">
        <div v-if="shouldShowTitle" class="trend-shell__title">{{ titleText }}</div>
        <div class="trend-shell__bars">
          <span v-for="bar in trendBars" :key="bar.key" class="trend-shell__bar" :style="{ height: bar.height }" />
        </div>
        <div class="trend-shell__axis">
          <span v-for="bar in trendBars" :key="`${bar.key}-label`">{{ bar.label }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="text-shell">
        <div v-if="shouldShowTitle" class="text-shell__title">{{ titleText }}</div>
        <div class="text-shell__paragraph">{{ chartTypeLabel(chartType) }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ChartDataResult } from '../api/chart'
import {
  chartTypeLabel,
  isDecorationChartType,
  isVectorIconChartType,
  type ComponentChartConfig,
} from '../utils/component-config'

const props = withDefaults(defineProps<{
  chartType: string
  chartConfig: ComponentChartConfig
  data?: ChartDataResult | null
  dark?: boolean
  showTitle?: boolean
}>(), {
  data: null,
  dark: false,
  showTitle: false,
})

const now = ref(new Date())
let clockTimer: number | null = null

onMounted(() => {
  if (props.chartType !== 'clock_display') return
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer !== null) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
})

const titleText = computed(() => props.chartConfig.name || chartTypeLabel(props.chartType))
// Enforce hidden titles for static widgets in preview, per screen design requirement.
const shouldShowTitle = computed(() => false)
const rawRows = computed(() => props.data?.rawRows ?? [])

const primaryMetric = computed(() => {
  if (props.chartConfig.yField && rawRows.value.length) {
    const values = rawRows.value
      .map((row) => Number(row[props.chartConfig.yField]))
      .filter((value) => Number.isFinite(value))
    if (values.length) {
      return Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(values.reduce((sum, value) => sum + value, 0))
    }
  }
  const seriesValues = (props.data?.series ?? [])
    .flatMap((series) => series.data)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (seriesValues.length) {
    return Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(seriesValues.reduce((sum, value) => sum + value, 0))
  }
  return '128,560'
})

const listItems = computed(() => {
  const xField = props.chartConfig.xField
  const yField = props.chartConfig.yField
  if (xField && rawRows.value.length) {
    return rawRows.value.slice(0, 5).map((row, index) => ({
      key: `${index}-${String(row[xField] ?? '')}`,
      index: String(index + 1).padStart(2, '0'),
      label: String(row[xField] ?? `项目 ${index + 1}`),
      value: yField ? String(row[yField] ?? '--') : '查看',
    }))
  }
  return [
    { key: '1', index: '01', label: '华北大区', value: '98,120' },
    { key: '2', index: '02', label: '华东大区', value: '87,430' },
    { key: '3', index: '03', label: '华南大区', value: '79,540' },
    { key: '4', index: '04', label: '西南大区', value: '63,210' },
  ]
})

const cloudItems = computed(() => {
  const source = listItems.value.map((item, index) => ({
    word: item.label,
    size: `${28 - index * 3}px`,
    opacity: String(0.92 - index * 0.12),
  }))
  return source.length ? source : [
    { word: '销量', size: '28px', opacity: '0.95' },
    { word: '区域', size: '22px', opacity: '0.8' },
    { word: '订单', size: '18px', opacity: '0.7' },
  ]
})

const trendBars = computed(() => {
  const labels = props.data?.labels?.slice(0, 6) ?? ['1月', '2月', '3月', '4月', '5月', '6月']
  const series = props.data?.series?.[0]?.data?.slice(0, labels.length) ?? [18, 24, 20, 30, 34, 40]
  const numeric = series.map((value) => Number(value)).filter((value) => Number.isFinite(value))
  const max = Math.max(...numeric, 40)
  return labels.map((label, index) => ({
    key: `${label}-${index}`,
    label: String(label),
    height: `${Math.max(26, Math.round((Number(series[index] ?? 0) / max) * 100))}%`,
  }))
})

const nowDate = computed(() => now.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))
const nowTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))

const qrMatrix = [
  '111000111',
  '101010101',
  '111010111',
  '000111000',
  '110101011',
  '010111010',
  '111010111',
  '101000101',
  '111111111',
]
const qrCells = computed(() => qrMatrix.flatMap((row, rowIndex) => row.split('').map((cell, cellIndex) => ({
  key: `${rowIndex}-${cellIndex}`,
  active: cell === '1',
}))))

const iconMarkup = computed(() => ({
  icon_arrow_trend: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M22 84L48 58L66 74L98 38" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 38H98V58" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  icon_warning_badge: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 16L104 94H16L60 16Z" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><path d="M60 44V66" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><circle cx="60" cy="82" r="5" fill="currentColor"/></svg>',
  icon_location_pin: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M60 102C76 81 90 67 90 46C90 28 76 16 60 16C44 16 30 28 30 46C30 67 44 81 60 102Z" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><circle cx="60" cy="46" r="10" fill="none" stroke="currentColor" stroke-width="10"/></svg>',
  icon_data_signal: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="M18 72C30 72 30 48 42 48C54 48 54 84 66 84C78 84 78 36 90 36C98 36 102 48 102 48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="88" width="84" height="10" rx="5" fill="currentColor" opacity="0.25"/></svg>',
  icon_user_badge: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="10"/><path d="M30 96C34 78 46 68 60 68C74 68 86 78 90 96" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M92 24L100 32L112 20" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  icon_chart_mark: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="64" width="14" height="30" rx="4" fill="currentColor"/><rect x="42" y="48" width="14" height="46" rx="4" fill="currentColor" opacity="0.8"/><rect x="66" y="34" width="14" height="60" rx="4" fill="currentColor" opacity="0.65"/><path d="M18 28H100" stroke="currentColor" stroke-width="10" stroke-linecap="round" opacity="0.22"/></svg>',
}[props.chartType] ?? '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="28" fill="none" stroke="currentColor" stroke-width="10"/></svg>'))

const themeName = computed(() => {
  if (isDecorationChartType(props.chartType)) return 'decor'
  if (isVectorIconChartType(props.chartType)) return 'icon'
  return 'text'
})
</script>

<style scoped>
.static-widget {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  overflow: hidden;
  border-radius: 14px;
  background: transparent;
  color: #18324d;
}

.static-widget--dark {
  background: transparent;
  color: #eaf4ff;
}

.decor-shell,
.icon-shell,
.time-shell,
.qr-shell,
.link-shell,
.frame-shell,
.text-shell,
.metric-shell,
.list-shell,
.cloud-shell,
.trend-shell {
  width: 100%;
  height: 100%;
}

.decor-shell {
  position: relative;
  border-radius: 14px;
  border: 1px solid rgba(102, 183, 255, 0.24);
}

.decor-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #4db3ff;
}

.decor-corner--tl { top: 10px; left: 10px; border-top: 3px solid; border-left: 3px solid; }
.decor-corner--tr { top: 10px; right: 10px; border-top: 3px solid; border-right: 3px solid; }
.decor-corner--bl { bottom: 10px; left: 10px; border-bottom: 3px solid; border-left: 3px solid; }
.decor-corner--br { bottom: 10px; right: 10px; border-bottom: 3px solid; border-right: 3px solid; }

.decor-shell--decor_border_glow {
  box-shadow: inset 0 0 20px rgba(77, 179, 255, 0.14), 0 0 20px rgba(77, 179, 255, 0.1);
}

.decor-shell--decor_border_grid::after {
  content: '';
  position: absolute;
  inset: 18px;
  border: 1px dashed rgba(77, 179, 255, 0.22);
  background-image: linear-gradient(rgba(77, 179, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(77, 179, 255, 0.08) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.icon-shell,
.time-shell,
.qr-shell,
.link-shell,
.text-shell,
.metric-shell,
.list-shell,
.trend-shell {
  padding: 18px;
  box-sizing: border-box;
}

.icon-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.icon-shell__stage {
  width: 90px;
  height: 90px;
  color: #4db3ff;
}

.icon-shell__stage :deep(svg) {
  width: 100%;
  height: 100%;
}

.icon-shell__label {
  font-size: 16px;
  font-weight: 700;
}

.icon-shell__meta {
  font-size: 12px;
  opacity: 0.6;
}

.time-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.time-shell__date,
.time-shell__meta,
.link-shell__hint,
.frame-shell__address,
.list-shell__value {
  opacity: 0.68;
}

.time-shell__date {
  font-size: 14px;
}

.time-shell__time {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.qr-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.qr-grid {
  width: 120px;
  height: 120px;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 3px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
}

.qr-grid__cell {
  border-radius: 2px;
  background: rgba(11, 31, 53, 0.12);
}

.qr-grid__cell--active {
  background: #0b1f35;
}

.link-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.link-shell__title,
.text-shell__title,
.metric-shell__title,
.list-shell__title,
.trend-shell__title {
  font-size: 14px;
  font-weight: 700;
}

.link-shell__url {
  color: #4db3ff;
  font-size: 18px;
  font-weight: 700;
  text-decoration: underline;
}

.frame-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  box-sizing: border-box;
}

.frame-shell__tabs {
  display: flex;
  gap: 8px;
}

.frame-shell__tab {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(77, 179, 255, 0.08);
  font-size: 12px;
}

.frame-shell__tab--active {
  background: rgba(77, 179, 255, 0.18);
  color: #4db3ff;
}

.frame-shell__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
}

.frame-shell__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(77, 179, 255, 0.7);
}

.frame-shell__body {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.frame-shell__card {
  min-height: 52px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(77, 179, 255, 0.12), rgba(77, 179, 255, 0.04));
  border: 1px solid rgba(77, 179, 255, 0.16);
}

.frame-shell__card--wide {
  grid-column: span 2;
}

.text-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.text-shell__paragraph {
  font-size: 13px;
  line-height: 1.8;
  opacity: 0.76;
}

.metric-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.metric-shell__value {
  font-size: 34px;
  font-weight: 800;
  color: #4db3ff;
}

.metric-shell__value--flipper {
  letter-spacing: 0.08em;
}

.metric-shell__trend {
  font-size: 13px;
  opacity: 0.72;
}

.metric-shell__trend span {
  color: #29c27c;
  font-weight: 700;
}

.list-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-shell__row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.list-shell__row--media {
  grid-template-columns: 32px 34px minmax(0, 1fr) auto;
}

.list-shell__index {
  font-size: 12px;
  font-weight: 700;
  color: #4db3ff;
}

.list-shell__thumb {
  width: 34px;
  height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(77, 179, 255, 0.8), rgba(114, 92, 255, 0.72));
}

.list-shell__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cloud-shell {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 12px 16px;
  padding: 18px;
  box-sizing: border-box;
}

.cloud-shell__word {
  color: #4db3ff;
  font-weight: 700;
  line-height: 1;
}

.trend-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-shell__bars {
  flex: 1;
  display: flex;
  align-items: end;
  gap: 10px;
  min-height: 120px;
}

.trend-shell__bar {
  flex: 1;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, rgba(77, 179, 255, 0.92), rgba(77, 179, 255, 0.18));
}

.trend-shell__axis {
  display: flex;
  gap: 10px;
  font-size: 11px;
  opacity: 0.62;
}

.trend-shell__axis span {
  flex: 1;
  text-align: center;
}
</style>
