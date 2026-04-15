<template>
  <div class="preview-shell" v-loading="loading || chartLoading">
    <div v-if="dashboard" class="preview-head">
      <div>
        <div class="preview-title">{{ dashboard.name }}</div>
        <div class="preview-subtitle">
          {{ scene === 'screen' ? '数据大屏只读预览' : '仪表板只读预览' }}
        </div>
      </div>
      <div class="preview-kpis">
        <div class="preview-kpi">
          <span>组件</span>
          <strong>{{ components.length }}</strong>
        </div>
        <div class="preview-kpi">
          <span>图表</span>
          <strong>{{ renderedChartCount }}</strong>
        </div>
      </div>
    </div>

    <div v-if="filterDefinitions.length" class="filter-panel">
      <div class="filter-head">
        <div>
          <div class="filter-title">查询组件</div>
          <div class="filter-note">筛选器会联动刷新整张报告；点击图表数据点也会自动生成联动条件。</div>
        </div>
        <el-button link type="primary" @click="clearFilters">清空筛选</el-button>
      </div>
      <div class="filter-grid">
        <div v-for="definition in filterDefinitions" :key="definition.field" class="filter-item">
          <div class="filter-item-label">{{ definition.field }}</div>
          <el-select
            :model-value="activeFilters[definition.field] || ''"
            placeholder="全部"
            clearable
            filterable
            @change="updateFilter(definition.field, $event)"
          >
            <el-option
              v-for="value in definition.values"
              :key="`${definition.field}-${value}`"
              :label="String(value)"
              :value="String(value)"
            />
          </el-select>
        </div>
      </div>
      <div v-if="activeFilterEntries.length" class="filter-tags">
        <el-tag
          v-for="entry in activeFilterEntries"
          :key="entry.field"
          closable
          effect="plain"
          @close="clearSingleFilter(entry.field)"
        >
          {{ entry.field }}: {{ entry.value }}
        </el-tag>
      </div>
    </div>

    <el-empty v-if="!loading && !dashboard" description="未找到对应报告" :image-size="88" />

    <div v-else class="preview-stage-shell">
      <div
        ref="canvasRef"
        class="preview-stage"
        :class="`preview-stage--${scene}`"
        :style="scene === 'screen'
          ? { width: `${canvasConfig.width}px`, minHeight: `${canvasMinHeight}px`, height: `${canvasMinHeight}px` }
          : { minHeight: `${canvasMinHeight}px` }"
      >
      <div
        v-for="component in components"
        :key="component.id"
        class="preview-card"
        :style="getCardStyle(component)"
      >
        <div class="preview-card-head">
          <div>
            <div class="preview-card-title">{{ getComponentChartConfig(component).name || '图表组件' }}</div>
            <div class="preview-card-meta">
              <el-tag size="small" type="info">{{ chartTypeLabel(getComponentChartConfig(component).chartType) }}</el-tag>
              <span>{{ getComponentChartConfig(component).datasetId ? `数据集 #${getComponentChartConfig(component).datasetId}` : '未关联数据集' }}</span>
            </div>
          </div>
        </div>

        <div class="preview-card-body">
          <div v-if="isTableChart(component)" class="table-wrapper">
            <el-table :data="getTableRows(component.id)" size="small" border height="100%" empty-text="暂无数据">
              <el-table-column
                v-for="column in getTableColumns(component.id)"
                :key="column"
                :prop="column"
                :label="column"
                min-width="120"
                show-overflow-tooltip
              />
            </el-table>
          </div>

          <div v-else-if="showNoField(component)" class="preview-placeholder warning">
            该组件缺少必要字段，暂时无法生成预览内容。
          </div>

          <div v-else-if="!isRenderableChart(component)" class="preview-placeholder">
            当前预览暂未支持 {{ chartTypeLabel(getComponentChartConfig(component).chartType) }} 的渲染。
          </div>

          <div
            v-else
            :ref="(el) => setChartRef(el as HTMLElement | null, component.id)"
            class="chart-canvas"
          />
        </div>
      </div>

      <el-empty
        v-if="!components.length && !chartLoading"
        description="当前报告暂无组件"
        class="preview-empty"
      />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getChartData, getChartList, type Chart, type ChartDataResult } from '../api/chart'
import { getDashboardById, getDashboardComponents, type Dashboard, type DashboardComponent } from '../api/dashboard'
import {
  getPublicChartList,
  getPublicComponentData,
  getPublicDashboardById,
  getPublicDashboardComponents,
} from '../api/report'
import {
  buildComponentOption,
  chartTypeLabel,
  getMissingChartFields,
  isCanvasRenderableChartType,
  materializeChartData,
  mergeComponentRequestFilters,
  normalizeComponentConfig,
} from '../utils/component-config'
import { normalizeCanvasConfig, parseReportConfig } from '../utils/report-config'

const props = defineProps<{
  dashboardId: number
  scene: 'dashboard' | 'screen'
  accessMode: 'private' | 'public'
  shareToken?: string
}>()

const loading = ref(false)
const chartLoading = ref(false)
const dashboard = ref<Dashboard | null>(null)
const components = ref<DashboardComponent[]>([])
const charts = ref<Chart[]>([])
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])))
const componentDataMap = ref(new Map<number, ChartDataResult>())
const activeFilters = reactive<Record<string, string>>({})
const canvasRef = ref<HTMLElement | null>(null)
const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, echarts.ECharts>()

const MIN_CARD_WIDTH = 320
const MIN_CARD_HEIGHT = 220
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70
const renderedChartCount = computed(() => components.value.filter((item) => isRenderableChart(item)).length)
const isPublicPreview = computed(() => props.accessMode === 'public' && Boolean(props.shareToken))
const getComponentConfig = (component: DashboardComponent) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId))
const getComponentChartConfig = (component: DashboardComponent) => getComponentConfig(component).chart
const getComponentInteractionConfig = (component: DashboardComponent) => getComponentConfig(component).interaction
const canvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(dashboard.value?.configJson).canvas, props.scene))
const activeFilterEntries = computed(() => Object.entries(activeFilters)
  .filter(([, value]) => Boolean(value))
  .map(([field, value]) => ({ field, value })))

const filterDefinitions = computed(() => {
  const definitions = new Map<string, Set<string>>()
  for (const component of components.value) {
    const chart = getComponentChartConfig(component)
    const interaction = getComponentInteractionConfig(component)
    const data = componentDataMap.value.get(component.id)
    if (!data || !interaction.allowManualFilters) continue
    for (const field of [chart.xField, chart.groupField].filter(Boolean)) {
      const values = definitions.get(field) ?? new Set<string>()
      if (field === chart.xField) {
        data.labels.forEach((label) => values.add(String(label)))
      }
      ;(data.rawRows ?? []).forEach((row) => {
        if (row[field] != null) values.add(String(row[field]))
      })
      definitions.set(field, values)
    }
  }
  return Array.from(definitions.entries()).map(([field, values]) => ({
    field,
    values: Array.from(values).sort((a, b) => a.localeCompare(b, 'zh-CN')),
  }))
})

const canvasMinHeight = computed(() => {
  const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0)
  return Math.max(props.scene === 'screen' ? canvasConfig.value.height : 620, occupied)
})

const normalizeLayout = (component: DashboardComponent) => {
  if (component.width <= 24) component.width = Math.max(MIN_CARD_WIDTH, component.width * LEGACY_GRID_COL_PX)
  if (component.height <= 12) component.height = Math.max(MIN_CARD_HEIGHT, component.height * LEGACY_GRID_ROW_PX)
  if (component.posX <= 24 && component.width > 24) component.posX = component.posX * LEGACY_GRID_COL_PX
  if (component.posY <= 24 && component.height > 12) component.posY = component.posY * LEGACY_GRID_ROW_PX

  component.posX = Math.max(0, Number(component.posX) || 0)
  component.posY = Math.max(0, Number(component.posY) || 0)
  component.width = Math.max(MIN_CARD_WIDTH, Number(component.width) || MIN_CARD_WIDTH)
  component.height = Math.max(MIN_CARD_HEIGHT, Number(component.height) || MIN_CARD_HEIGHT)
}

const getCardStyle = (component: DashboardComponent) => ({
  left: `${component.posX}px`,
  top: `${component.posY}px`,
  width: `${component.width}px`,
  height: `${component.height}px`,
})

const setChartRef = (el: HTMLElement | null, componentId: number) => {
  if (el) chartRefs.set(componentId, el)
  else chartRefs.delete(componentId)
}

const isTableChart = (component: DashboardComponent) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType)

const showNoField = (component: DashboardComponent) => getMissingChartFields(getComponentChartConfig(component)).length > 0

const isRenderableChart = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isCanvasRenderableChartType(type)
}

const getTableColumns = (componentId: number) => componentDataMap.value.get(componentId)?.columns ?? []
const getTableRows = (componentId: number) => componentDataMap.value.get(componentId)?.rawRows ?? []

const renderChart = (component: DashboardComponent, data: ChartDataResult) => {
  const el = chartRefs.get(component.id)
  if (!el) return
  let instance = chartInstances.get(component.id)
  if (!instance) {
    instance = echarts.init(el)
    chartInstances.set(component.id, instance)
    instance.on('click', (params) => handleChartClick(component.id, params))
  }
  const resolved = getComponentConfig(component)
  instance.setOption(buildComponentOption(data, resolved.chart, resolved.style), true)
}

const handleChartClick = (componentId: number, params: { name?: string; seriesName?: string }) => {
  const component = components.value.find((item) => item.id === componentId)
  if (!component) return
  const chart = getComponentChartConfig(component)
  const interaction = getComponentInteractionConfig(component)
  if (!interaction.enableClickLinkage || interaction.clickAction !== 'filter') return
  let changed = false
  const linkageField = interaction.linkageFieldMode === 'custom'
    ? interaction.linkageField
    : interaction.linkageFieldMode === 'group'
      ? chart.groupField
      : chart.xField
  if (linkageField && params.name) {
    activeFilters[linkageField] = String(params.name)
    changed = true
  }
  if (interaction.linkageFieldMode === 'auto' && chart.groupField && params.seriesName) {
    activeFilters[chart.groupField] = String(params.seriesName)
    changed = true
  }
  if (changed) {
    reloadComponentData()
  }
}

const disposeCharts = () => {
  chartInstances.forEach((instance) => instance.dispose())
  chartInstances.clear()
  chartRefs.clear()
}

const reloadComponentData = async () => {
  chartLoading.value = true
  componentDataMap.value = new Map()
  try {
    await nextTick()
    await Promise.all(components.value.map(async (component) => {
      const chart = getComponentChartConfig(component)
      const interaction = getComponentInteractionConfig(component)
      if (showNoField(component)) return
      try {
        const data = isPublicPreview.value
          ? await getPublicComponentData(props.dashboardId, component.id, props.shareToken || '', mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }))
          : await getChartData(component.chartId, {
            filters: mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }),
            configJson: component.configJson,
          })
        const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart)
        const nextMap = new Map(componentDataMap.value)
        nextMap.set(component.id, materialized)
        componentDataMap.value = nextMap
        if (isRenderableChart(component)) renderChart(component, materialized)
      } catch {
        // ignore individual chart failures to keep page usable
      }
    }))
  } finally {
    chartLoading.value = false
  }
}

const updateFilter = (field: string, value: string | undefined) => {
  if (!value) delete activeFilters[field]
  else activeFilters[field] = String(value)
  reloadComponentData()
}

const clearFilters = () => {
  Object.keys(activeFilters).forEach((key) => delete activeFilters[key])
  reloadComponentData()
}

const clearSingleFilter = (field: string) => {
  delete activeFilters[field]
  reloadComponentData()
}

const loadAll = async () => {
  loading.value = true
  disposeCharts()
  componentDataMap.value = new Map()
  try {
    const [dashboardDetail, componentList, chartList] = await Promise.all(isPublicPreview.value
      ? [
        getPublicDashboardById(props.dashboardId, props.shareToken || ''),
        getPublicDashboardComponents(props.dashboardId, props.shareToken || ''),
        getPublicChartList(props.dashboardId, props.shareToken || ''),
      ]
      : [
        getDashboardById(props.dashboardId),
        getDashboardComponents(props.dashboardId),
        getChartList(),
      ])
    dashboard.value = dashboardDetail
    charts.value = chartList
    componentList.forEach(normalizeLayout)
    components.value = componentList
    await nextTick()
    await reloadComponentData()
  } catch {
    dashboard.value = null
    components.value = []
  } finally {
    loading.value = false
    chartLoading.value = false
  }
}

const handleResize = () => {
  chartInstances.forEach((instance) => instance.resize())
}

watch(() => [props.dashboardId, props.accessMode, props.shareToken], loadAll)

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped>
.preview-shell {
  min-height: 100%;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.preview-title {
  font-size: 24px;
  font-weight: 700;
  color: #163050;
}

.preview-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #6e8098;
}

.preview-kpis {
  display: flex;
  gap: 10px;
}

.preview-kpi {
  min-width: 92px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f4f8fd 0%, #ffffff 100%);
  border: 1px solid #dce8f5;
}

.preview-kpi span {
  display: block;
  font-size: 12px;
  color: #6e8098;
}

.preview-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  color: #163050;
}

.filter-panel {
  margin-bottom: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid #dce8f5;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 28px rgba(21, 61, 112, 0.06);
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-title {
  font-size: 14px;
  font-weight: 700;
  color: #183153;
}

.filter-note {
  margin-top: 4px;
  font-size: 12px;
  color: #71829b;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.filter-item-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: #50637b;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.preview-stage {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid #dce8f5;
}

.preview-stage-shell {
  overflow: auto;
}

.preview-stage--dashboard {
  background: linear-gradient(180deg, #f7fafe 0%, #eff4fb 100%);
}

.preview-stage--screen {
  background-color: #081b32;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(20, 116, 214, 0.18), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(66, 185, 131, 0.14), transparent 24%),
    linear-gradient(rgba(129, 170, 215, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 170, 215, 0.08) 1px, transparent 1px);
  background-size: auto, auto, 26px 26px, 26px 26px;
}

.preview-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
}

.preview-stage--dashboard .preview-card {
  background: #fff;
  border: 1px solid #deebf7;
  box-shadow: 0 8px 20px rgba(29, 93, 155, 0.08);
}

.preview-stage--screen .preview-card {
  background: linear-gradient(180deg, rgba(9, 30, 53, 0.95) 0%, rgba(7, 20, 36, 0.96) 100%);
  border: 1px solid rgba(124, 170, 219, 0.18);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(10px);
}

.preview-card-head {
  margin-bottom: 10px;
}

.preview-card-title {
  font-size: 14px;
  font-weight: 600;
}

.preview-stage--dashboard .preview-card-title {
  color: #1d3555;
}

.preview-stage--screen .preview-card-title {
  color: #eef5ff;
}

.preview-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
}

.preview-stage--dashboard .preview-card-meta {
  color: #6e8098;
}

.preview-stage--screen .preview-card-meta {
  color: rgba(220, 232, 245, 0.76);
}

.preview-card-body,
.chart-canvas,
.table-wrapper {
  height: 100%;
  min-height: 0;
}

.table-wrapper :deep(.el-table) {
  --el-table-bg-color: rgba(7, 22, 38, 0.72);
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(16, 41, 68, 0.94);
  --el-table-border-color: rgba(104, 148, 194, 0.22);
  --el-table-text-color: #e6eef8;
  --el-table-header-text-color: #d8e8fb;
}

.preview-stage--dashboard .table-wrapper :deep(.el-table) {
  --el-table-bg-color: #ffffff;
  --el-table-tr-bg-color: #ffffff;
  --el-table-header-bg-color: #f6f9fd;
  --el-table-border-color: #deebf7;
  --el-table-text-color: #24384f;
  --el-table-header-text-color: #3f5570;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  line-height: 1.7;
  font-size: 12px;
}

.preview-stage--dashboard .preview-placeholder {
  border: 1px dashed #d5e3f2;
  color: #7588a0;
}

.preview-stage--screen .preview-placeholder {
  border: 1px dashed rgba(117, 154, 195, 0.35);
  color: rgba(229, 237, 247, 0.8);
}

.preview-placeholder.warning {
  color: #d39a12;
}

.preview-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .preview-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>