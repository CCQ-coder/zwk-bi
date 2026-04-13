<template>
  <div class="screen-root">
    <aside class="screen-sidebar">
      <section class="side-panel">
        <div class="side-head">
          <div>
            <div class="side-title">数据大屏</div>
            <div class="side-subtitle">当前大屏来自仪表板数据表</div>
          </div>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreateDashboard" />
        </div>
        <div class="screen-list">
          <div
            v-for="dashboard in dashboards"
            :key="dashboard.id"
            class="screen-item"
            :class="{ active: currentDashboard?.id === dashboard.id }"
            @click="selectDashboard(dashboard)"
          >
            <div class="screen-item-main">
              <div class="screen-item-name">{{ dashboard.name }}</div>
              <div class="screen-item-meta">{{ getDashboardComponentCount(dashboard.id) }} 个组件</div>
            </div>
            <el-popconfirm title="确认删除此大屏？" @confirm.stop="handleDeleteDashboard(dashboard.id)">
              <template #reference>
                <el-icon class="screen-item-del" @click.stop><Delete /></el-icon>
              </template>
            </el-popconfirm>
          </div>
          <el-empty v-if="!dashboards.length && !loading" description="暂无大屏" :image-size="60" />
        </div>
      </section>

      <section class="side-panel library-panel">
        <div class="side-head">
          <div>
            <div class="side-title">组件库</div>
            <div class="side-subtitle">从数据库读取已保存组件</div>
          </div>
          <el-tag type="success" effect="plain">数据化</el-tag>
        </div>

        <el-tabs v-model="libraryTab" class="library-tabs">
          <el-tab-pane label="已保存组件" name="charts">
            <div class="library-toolbar">
              <el-input v-model="assetSearch" placeholder="搜索组件名称" clearable />
              <el-select v-model="assetType" placeholder="全部类型" clearable>
                <el-option label="全部类型" value="" />
                <el-option
                  v-for="item in chartTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>

            <div class="asset-list">
              <div
                v-for="chart in filteredCharts"
                :key="chart.id"
                class="asset-card"
                :class="{ selected: selectedAssetId === chart.id }"
                @click="selectedAssetId = chart.id"
                @dblclick="quickAddChart(chart)"
              >
                <div class="asset-card-top">
                  <div class="asset-card-name">{{ chart.name }}</div>
                  <el-tag size="small" effect="dark">{{ chartTypeLabel(chart.chartType) }}</el-tag>
                </div>
                <div class="asset-card-meta">数据集: {{ datasetMap.get(chart.datasetId)?.name ?? '未关联' }}</div>
                <div class="asset-card-fields">
                  <span>X: {{ chart.xField || '未设' }}</span>
                  <span>Y: {{ chart.yField || '未设' }}</span>
                </div>
              </div>
              <el-empty v-if="!filteredCharts.length && !loading" description="没有匹配的组件" :image-size="60" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="模板参考" name="templates">
            <div class="template-hint">参考图表模板筛选组件类型，实际加入大屏的仍是已保存图表组件。</div>
            <div class="asset-list template-list">
              <div
                v-for="template in templates"
                :key="template.id"
                class="asset-card template-card"
              >
                <div class="asset-card-top">
                  <div class="asset-card-name">{{ template.name }}</div>
                  <el-tag size="small" type="warning">{{ chartTypeLabel(template.chartType) }}</el-tag>
                </div>
                <div class="template-config">{{ summarizeTemplateConfig(template.configJson) }}</div>
                <el-button link type="primary" @click="applyTemplateFilter(template.chartType)">查看同类组件</el-button>
              </div>
              <el-empty v-if="!templates.length && !loading" description="暂无模板" :image-size="60" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </aside>

    <main class="screen-main" v-loading="loading || compLoading">
      <div v-if="!currentDashboard" class="screen-empty-state">
        <el-empty description="请先创建或选择一个数据大屏" :image-size="90" />
      </div>

      <template v-else>
        <div class="screen-toolbar">
          <div>
            <div class="screen-title">{{ currentDashboard.name }}</div>
            <div class="screen-subtitle">
              组件定义存于 bi_chart，当前大屏选用关系存于 bi_dashboard_component
            </div>
          </div>
          <div class="screen-actions">
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents">刷新画布</el-button>
            <el-button size="small" type="primary" :icon="CirclePlus" :disabled="!selectedAsset" @click="handleAddSelectedAsset">
              放入大屏
            </el-button>
          </div>
        </div>

        <div v-if="selectedAsset" class="selected-bar">
          <div class="selected-bar-title">当前待加入组件</div>
          <div class="selected-bar-content">
            <span>{{ selectedAsset.name }}</span>
            <el-tag size="small">{{ chartTypeLabel(selectedAsset.chartType) }}</el-tag>
            <span>数据集: {{ datasetMap.get(selectedAsset.datasetId)?.name ?? '未关联' }}</span>
          </div>
        </div>

        <div class="stage-panel">
          <div class="stage-head">
            <div>
              <div class="stage-title">大屏画布</div>
              <div class="stage-note">双击左侧组件可快速加入，拖动标题移动，拖动右下角缩放</div>
            </div>
            <div class="stage-stats">{{ components.length }} 个已选组件</div>
          </div>

          <div ref="canvasRef" class="screen-stage" :style="{ minHeight: `${canvasMinHeight}px` }">
            <div
              v-for="component in components"
              :key="component.id"
              class="stage-card"
              :class="{ active: activeCompId === component.id }"
              :style="getCardStyle(component)"
              @mousedown="focusComponent(component)"
            >
              <div class="stage-card-header" @mousedown.stop.prevent="startDrag($event, component)">
                <div class="stage-card-header-main">
                  <div class="stage-card-name">{{ chartMap.get(component.chartId)?.name ?? '未命名组件' }}</div>
                  <div class="stage-card-meta">
                    <el-tag size="small" type="info">{{ chartTypeLabel(chartMap.get(component.chartId)?.chartType ?? '') }}</el-tag>
                    <span>{{ datasetMap.get(chartMap.get(component.chartId)?.datasetId ?? -1)?.name ?? '未关联数据集' }}</span>
                  </div>
                </div>
                <el-popconfirm title="从大屏移除此组件？" @confirm="removeComponent(component.id)">
                  <template #reference>
                    <el-icon class="remove-btn"><Close /></el-icon>
                  </template>
                </el-popconfirm>
              </div>

              <div class="stage-card-body">
                <div v-if="isTableChart(component)" class="table-wrapper">
                  <el-table
                    :data="getTableRows(component.id)"
                    size="small"
                    border
                    height="100%"
                    empty-text="暂无数据"
                  >
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

                <div v-else-if="showNoField(component)" class="chart-placeholder warning">
                  未配置维度或度量字段，请先在图表设计中保存配置。
                </div>

                <div v-else-if="!isRenderableChart(component)" class="chart-placeholder">
                  当前大屏暂未支持 {{ chartTypeLabel(chartMap.get(component.chartId)?.chartType ?? '') }} 的渲染。
                </div>

                <div
                  v-else
                  :ref="(el) => setChartRef(el as HTMLElement | null, component.id)"
                  class="chart-canvas"
                />
              </div>

              <div class="resize-handle" @mousedown.stop.prevent="startResize($event, component)"></div>
            </div>

            <el-empty
              v-if="!components.length && !compLoading"
              description="从左侧组件库选择一个已保存组件加入当前大屏"
              class="stage-empty"
            />
          </div>
        </div>
      </template>
    </main>

    <el-dialog v-model="createDashVisible" title="新建数据大屏" width="420px" destroy-on-close>
      <el-form :model="dashForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dashForm.name" placeholder="请输入大屏名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDashVisible = false">取消</el-button>
        <el-button type="primary" :loading="dashSaving" @click="handleCreateDashboard">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CirclePlus, Close, Delete, Plus, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  addDashboardComponent,
  createDashboard,
  deleteDashboard,
  getDashboardComponents,
  getDashboardList,
  removeDashboardComponent,
  updateDashboardComponent,
  type Dashboard,
  type DashboardComponent
} from '../api/dashboard'
import { getChartData, getChartList, type Chart, type ChartDataResult } from '../api/chart'
import { getTemplateList, type ChartTemplate } from '../api/chart-template'
import { getDatasetList, type Dataset } from '../api/dataset'

const loading = ref(false)
const compLoading = ref(false)
const dashboards = ref<Dashboard[]>([])
const currentDashboard = ref<Dashboard | null>(null)
const components = ref<DashboardComponent[]>([])
const charts = ref<Chart[]>([])
const datasets = ref<Dataset[]>([])
const templates = ref<ChartTemplate[]>([])
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])))
const datasetMap = computed(() => new Map(datasets.value.map((item) => [item.id, item])))
const dashboardCounts = ref(new Map<number, number>())
const componentDataMap = ref(new Map<number, ChartDataResult>())
const canvasRef = ref<HTMLElement | null>(null)
const activeCompId = ref<number | null>(null)

const libraryTab = ref('charts')
const assetSearch = ref('')
const assetType = ref('')
const selectedAssetId = ref<number | null>(null)

const createDashVisible = ref(false)
const dashSaving = ref(false)
const dashForm = reactive({ name: '' })

const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, echarts.ECharts>()

const MIN_CARD_WIDTH = 320
const MIN_CARD_HEIGHT = 220
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70
const SUPPORTED_CHART_TYPES = new Set(['bar', 'bar_horizontal', 'line', 'pie', 'doughnut', 'funnel', 'gauge'])

const chartTypeOptions = [
  { label: '柱状图', value: 'bar' },
  { label: '条形图', value: 'bar_horizontal' },
  { label: '折线图', value: 'line' },
  { label: '饼图', value: 'pie' },
  { label: '环图', value: 'doughnut' },
  { label: '表格', value: 'table' },
  { label: '漏斗图', value: 'funnel' },
  { label: '仪表盘', value: 'gauge' },
  { label: '散点图', value: 'scatter' },
  { label: '雷达图', value: 'radar' },
]

const chartTypeLabel = (type: string) => ({
  bar: '柱状图',
  bar_horizontal: '条形图',
  line: '折线图',
  pie: '饼图',
  doughnut: '环图',
  table: '表格',
  funnel: '漏斗图',
  gauge: '仪表盘',
  scatter: '散点图',
  radar: '雷达图'
}[type] ?? (type || '未知类型'))

const filteredCharts = computed(() => {
  const keyword = assetSearch.value.trim().toLowerCase()
  return charts.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchType = !assetType.value || item.chartType === assetType.value
    return matchKeyword && matchType
  })
})

const selectedAsset = computed(() => charts.value.find((item) => item.id === selectedAssetId.value) ?? null)

const canvasMinHeight = computed(() => {
  const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0)
  return Math.max(560, occupied)
})

const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? 1280, MIN_CARD_WIDTH + 32)

const setChartRef = (el: HTMLElement | null, componentId: number) => {
  if (el) chartRefs.set(componentId, el)
  else chartRefs.delete(componentId)
}

const getDashboardComponentCount = (dashboardId: number) => dashboardCounts.value.get(dashboardId) ?? 0

const normalizeLayout = (component: DashboardComponent) => {
  if (component.width <= 24) component.width = Math.max(MIN_CARD_WIDTH, component.width * LEGACY_GRID_COL_PX)
  if (component.height <= 12) component.height = Math.max(MIN_CARD_HEIGHT, component.height * LEGACY_GRID_ROW_PX)
  if (component.posX <= 24 && component.width > 24) component.posX = component.posX * LEGACY_GRID_COL_PX
  if (component.posY <= 24 && component.height > 12) component.posY = component.posY * LEGACY_GRID_ROW_PX

  component.posX = Math.max(0, Number(component.posX) || 0)
  component.posY = Math.max(0, Number(component.posY) || 0)
  component.width = Math.max(MIN_CARD_WIDTH, Number(component.width) || MIN_CARD_WIDTH)
  component.height = Math.max(MIN_CARD_HEIGHT, Number(component.height) || MIN_CARD_HEIGHT)
  component.zIndex = Number(component.zIndex) || 0
}

const getCardStyle = (component: DashboardComponent) => ({
  left: `${component.posX}px`,
  top: `${component.posY}px`,
  width: `${component.width}px`,
  height: `${component.height}px`,
  zIndex: String(component.zIndex ?? 0),
})

const buildCounts = async () => {
  const entries = await Promise.all(
    dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length] as const)
  )
  dashboardCounts.value = new Map(entries)
}

const loadBaseData = async () => {
  loading.value = true
  try {
    const [dashboardList, chartList, datasetList, templateList] = await Promise.all([
      getDashboardList(),
      getChartList(),
      getDatasetList(),
      getTemplateList()
    ])
    dashboards.value = dashboardList
    charts.value = chartList
    datasets.value = datasetList
    templates.value = templateList
    if (!selectedAssetId.value && chartList.length) selectedAssetId.value = chartList[0].id
    await buildCounts()
    if (dashboardList.length) await selectDashboard(dashboardList[0])
  } finally {
    loading.value = false
  }
}

const disposeCharts = () => {
  chartInstances.forEach((instance) => instance.dispose())
  chartInstances.clear()
  chartRefs.clear()
}

const selectDashboard = async (dashboard: Dashboard) => {
  currentDashboard.value = dashboard
  await loadComponents()
}

const loadComponents = async () => {
  if (!currentDashboard.value) return
  compLoading.value = true
  disposeCharts()
  componentDataMap.value = new Map()
  try {
    const result = await getDashboardComponents(currentDashboard.value.id)
    result.forEach(normalizeLayout)
    components.value = result
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length)
    await nextTick()
    await Promise.all(result.map((component) => loadComponentData(component)))
  } finally {
    compLoading.value = false
  }
}

const loadComponentData = async (component: DashboardComponent) => {
  const chart = chartMap.value.get(component.chartId)
  if (!chart || showNoField(component)) return
  try {
    const data = await getChartData(component.chartId)
    const nextMap = new Map(componentDataMap.value)
    nextMap.set(component.id, data)
    componentDataMap.value = nextMap
    if (isRenderableChart(component)) renderChart(component, data)
  } catch {
    ElMessage.warning(`组件 ${chart.name} 数据加载失败`)
  }
}

const renderChart = (component: DashboardComponent, data: ChartDataResult) => {
  const el = chartRefs.get(component.id)
  if (!el) return
  let chartInstance = chartInstances.get(component.id)
  if (!chartInstance) {
    chartInstance = echarts.init(el)
    chartInstances.set(component.id, chartInstance)
  }
  chartInstance.setOption(buildOption(data), true)
}

const buildOption = (data: ChartDataResult) => {
  const { chartType, labels, series } = data
  if (chartType === 'pie' || chartType === 'doughnut') {
    const pieData = series[0]?.data.map((value, index) => ({ name: labels[index] ?? String(index), value })) ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{ type: 'pie', radius: chartType === 'doughnut' ? ['40%', '70%'] : '64%', data: pieData }]
    }
  }
  if (chartType === 'funnel') {
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'funnel',
        left: '8%',
        width: '84%',
        data: series[0]?.data.map((value, index) => ({ name: labels[index] ?? String(index), value })) ?? []
      }]
    }
  }
  if (chartType === 'gauge') {
    return {
      series: [{
        type: 'gauge',
        progress: { show: true, roundCap: true },
        detail: { formatter: '{value}' },
        data: [{ value: Number(series[0]?.data[0] ?? 0), name: labels[0] ?? '当前值' }]
      }]
    }
  }

  const horizontal = chartType === 'bar_horizontal'
  return {
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { top: 4 } : undefined,
    grid: { left: 24, right: 18, top: series.length > 1 ? 36 : 18, bottom: 20, containLabel: true },
    ...(horizontal
      ? {
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: labels },
        }
      : {
          xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 28 : 0 } },
          yAxis: { type: 'value' },
        }),
    series: series.map((item) => ({
      name: item.name,
      type: horizontal ? 'bar' : 'line',
      smooth: !horizontal,
      data: item.data,
      areaStyle: !horizontal ? { opacity: 0.12 } : undefined,
      itemStyle: horizontal ? { borderRadius: 6 } : undefined,
    }))
  }
}

const isTableChart = (component: DashboardComponent) => chartMap.value.get(component.chartId)?.chartType === 'table'

const isRenderableChart = (component: DashboardComponent) => {
  const type = chartMap.value.get(component.chartId)?.chartType ?? ''
  return SUPPORTED_CHART_TYPES.has(type)
}

const showNoField = (component: DashboardComponent) => {
  const chart = chartMap.value.get(component.chartId)
  if (!chart || chart.chartType === 'table') return false
  return !chart.xField || !chart.yField
}

const getTableColumns = (componentId: number) => componentDataMap.value.get(componentId)?.columns ?? []
const getTableRows = (componentId: number) => componentDataMap.value.get(componentId)?.rawRows ?? []

const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0)

const focusComponent = (component: DashboardComponent) => {
  activeCompId.value = component.id
  const nextZ = getMaxZ() + 1
  if ((component.zIndex ?? 0) < nextZ) component.zIndex = nextZ
}

const persistLayout = async (component: DashboardComponent) => {
  if (!currentDashboard.value) return
  try {
    await updateDashboardComponent(currentDashboard.value.id, component.id, {
      posX: Math.round(component.posX),
      posY: Math.round(component.posY),
      width: Math.round(component.width),
      height: Math.round(component.height),
      zIndex: component.zIndex,
    })
  } catch {
    ElMessage.warning('布局保存失败，请重试')
  }
}

type InteractionMode = 'move' | 'resize'
interface InteractionState {
  mode: InteractionMode
  compId: number
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
}

let interaction: InteractionState | null = null

const findComponent = (id: number) => components.value.find((item) => item.id === id)

const startDrag = (event: MouseEvent, component: DashboardComponent) => {
  focusComponent(component)
  interaction = {
    mode: 'move',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
  }
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const startResize = (event: MouseEvent, component: DashboardComponent) => {
  focusComponent(component)
  interaction = {
    mode: 'resize',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
  }
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const onPointerMove = (event: MouseEvent) => {
  if (!interaction) return
  const component = findComponent(interaction.compId)
  if (!component) return

  const dx = event.clientX - interaction.startMouseX
  const dy = event.clientY - interaction.startMouseY

  if (interaction.mode === 'move') {
    const maxX = Math.max(0, getCanvasWidth() - component.width)
    component.posX = Math.min(maxX, Math.max(0, interaction.startX + dx))
    component.posY = Math.max(0, interaction.startY + dy)
  } else {
    const maxWidth = Math.max(MIN_CARD_WIDTH, getCanvasWidth() - component.posX)
    component.width = Math.min(maxWidth, Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx))
    component.height = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy)
    chartInstances.get(component.id)?.resize()
  }
}

const onPointerUp = async () => {
  if (!interaction) return
  const component = findComponent(interaction.compId)
  interaction = null
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  if (component) {
    chartInstances.get(component.id)?.resize()
    await persistLayout(component)
  }
}

const openCreateDashboard = () => {
  dashForm.name = ''
  createDashVisible.value = true
}

const handleCreateDashboard = async () => {
  if (!dashForm.name.trim()) {
    ElMessage.warning('请输入大屏名称')
    return
  }
  dashSaving.value = true
  try {
    const dashboard = await createDashboard({ name: dashForm.name, configJson: '{"scene":"screen"}' })
    dashboards.value.unshift(dashboard)
    dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, 0)
    createDashVisible.value = false
    await selectDashboard(dashboard)
    ElMessage.success('数据大屏创建成功')
  } finally {
    dashSaving.value = false
  }
}

const handleDeleteDashboard = async (id: number) => {
  await deleteDashboard(id)
  dashboards.value = dashboards.value.filter((item) => item.id !== id)
  const nextCounts = new Map(dashboardCounts.value)
  nextCounts.delete(id)
  dashboardCounts.value = nextCounts
  if (currentDashboard.value?.id === id) {
    currentDashboard.value = dashboards.value[0] ?? null
    if (currentDashboard.value) await loadComponents()
    else components.value = []
  }
  ElMessage.success('已删除数据大屏')
}

const handleAddSelectedAsset = async () => {
  if (!selectedAsset.value) {
    ElMessage.warning('请先选择组件')
    return
  }
  await addChartToScreen(selectedAsset.value)
}

const quickAddChart = async (chart: Chart) => {
  selectedAssetId.value = chart.id
  await addChartToScreen(chart)
}

const addChartToScreen = async (chart: Chart) => {
  if (!currentDashboard.value) {
    ElMessage.warning('请先选择大屏')
    return
  }
  const lastY = components.value.reduce((max, item) => Math.max(max, item.posY + item.height), 0)
  const component = await addDashboardComponent(currentDashboard.value.id, {
    chartId: chart.id,
    posX: 16,
    posY: lastY + 16,
    width: chart.chartType === 'table' ? 760 : 520,
    height: chart.chartType === 'table' ? 340 : 320,
    zIndex: getMaxZ() + 1,
  })
  normalizeLayout(component)
  components.value.push(component)
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  await nextTick()
  await loadComponentData(component)
  ElMessage.success('组件已加入大屏')
}

const removeComponent = async (componentId: number) => {
  if (!currentDashboard.value) return
  await removeDashboardComponent(currentDashboard.value.id, componentId)
  chartInstances.get(componentId)?.dispose()
  chartInstances.delete(componentId)
  chartRefs.delete(componentId)
  const nextData = new Map(componentDataMap.value)
  nextData.delete(componentId)
  componentDataMap.value = nextData
  components.value = components.value.filter((item) => item.id !== componentId)
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  ElMessage.success('组件已移除')
}

const applyTemplateFilter = (chartType: string) => {
  libraryTab.value = 'charts'
  assetType.value = chartType
}

const summarizeTemplateConfig = (configJson: string) => {
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>
    return Object.entries(parsed)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' / ')
  } catch {
    return configJson
  }
}

const handleWindowResize = () => {
  chartInstances.forEach((instance) => instance.resize())
}

onMounted(async () => {
  window.addEventListener('resize', handleWindowResize)
  await loadBaseData()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('resize', handleWindowResize)
  disposeCharts()
})
</script>

<style scoped>
.screen-root {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 170px);
}

.screen-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.side-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #d7e5f5;
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(25, 74, 136, 0.08);
}

.library-panel {
  flex: 1;
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;
}

.side-title {
  font-size: 15px;
  font-weight: 700;
  color: #183153;
}

.side-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-list {
  padding: 0 10px 12px;
}

.screen-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e5edf7;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.screen-item:hover {
  transform: translateY(-1px);
  border-color: #b7d1ec;
  box-shadow: 0 8px 18px rgba(29, 93, 155, 0.08);
}

.screen-item.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #eff7ff 0%, #f7fbff 100%);
}

.screen-item-main {
  min-width: 0;
}

.screen-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.screen-item-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-item-del {
  color: #8fa2bb;
}

.screen-item-del:hover {
  color: #f56c6c;
}

.library-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
}

.library-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
}

.library-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.library-toolbar {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
  margin-bottom: 12px;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 360px);
  overflow: auto;
  padding-right: 2px;
}

.asset-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5edf7;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.asset-card:hover {
  transform: translateY(-1px);
  border-color: #bfd8f2;
  box-shadow: 0 8px 18px rgba(29, 93, 155, 0.08);
}

.asset-card.selected {
  border-color: #409eff;
  background: linear-gradient(180deg, #f0f8ff 0%, #ffffff 100%);
}

.asset-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.asset-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.asset-card-meta,
.asset-card-fields,
.template-config,
.template-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #6d7b91;
}

.asset-card-fields {
  display: flex;
  gap: 14px;
}

.screen-main {
  min-width: 0;
}

.screen-empty-state,
.stage-panel {
  min-height: 100%;
}

.screen-toolbar,
.selected-bar,
.stage-panel {
  background: linear-gradient(180deg, #fbfdff 0%, #ffffff 100%);
  border: 1px solid #d9e6f4;
  border-radius: 20px;
  box-shadow: 0 18px 38px rgba(21, 61, 112, 0.08);
}

.screen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
}

.screen-title {
  font-size: 22px;
  font-weight: 700;
  color: #163050;
}

.screen-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #71829b;
}

.screen-actions {
  display: flex;
  gap: 10px;
}

.selected-bar {
  margin-top: 14px;
  padding: 14px 18px;
}

.selected-bar-title {
  font-size: 12px;
  color: #6d7b91;
}

.selected-bar-content {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  color: #183153;
  flex-wrap: wrap;
}

.stage-panel {
  margin-top: 14px;
  padding: 18px;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.stage-title {
  font-size: 15px;
  font-weight: 700;
  color: #183153;
}

.stage-note,
.stage-stats {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-stage {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #dce8f5;
  background-color: #081b32;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(20, 116, 214, 0.18), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(66, 185, 131, 0.14), transparent 24%),
    linear-gradient(rgba(129, 170, 215, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 170, 215, 0.08) 1px, transparent 1px);
  background-size: auto, auto, 26px 26px, 26px 26px;
}

.stage-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(124, 170, 219, 0.18);
  background: linear-gradient(180deg, rgba(9, 30, 53, 0.95) 0%, rgba(7, 20, 36, 0.96) 100%);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(10px);
  user-select: none;
}

.stage-card.active {
  border-color: rgba(64, 158, 255, 0.92);
  box-shadow: 0 12px 28px rgba(64, 158, 255, 0.28);
}

.stage-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  cursor: move;
}

.stage-card-header-main {
  min-width: 0;
}

.stage-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #eef5ff;
}

.stage-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  min-width: 0;
  font-size: 12px;
  color: rgba(220, 232, 245, 0.76);
  flex-wrap: wrap;
}

.stage-card-body {
  flex: 1;
  min-height: 0;
}

.chart-canvas,
.table-wrapper {
  height: 100%;
}

.table-wrapper :deep(.el-table) {
  --el-table-bg-color: rgba(7, 22, 38, 0.72);
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(16, 41, 68, 0.94);
  --el-table-border-color: rgba(104, 148, 194, 0.22);
  --el-table-text-color: #e6eef8;
  --el-table-header-text-color: #d8e8fb;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed rgba(117, 154, 195, 0.35);
  text-align: center;
  color: rgba(229, 237, 247, 0.8);
  font-size: 12px;
  line-height: 1.7;
}

.chart-placeholder.warning {
  color: #ffd77d;
}

.remove-btn {
  color: rgba(219, 231, 246, 0.68);
  cursor: pointer;
}

.remove-btn:hover {
  color: #f56c6c;
}

.resize-handle {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 15px;
  height: 15px;
  cursor: nwse-resize;
}

.resize-handle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-right: 2px solid rgba(158, 193, 234, 0.82);
  border-bottom: 2px solid rgba(158, 193, 234, 0.82);
}

.stage-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1200px) {
  .screen-root {
    grid-template-columns: 1fr;
  }

  .asset-list {
    max-height: 420px;
  }
}

@media (max-width: 768px) {
  .screen-toolbar,
  .stage-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .screen-actions,
  .selected-bar-content,
  .library-toolbar {
    width: 100%;
  }

  .library-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>