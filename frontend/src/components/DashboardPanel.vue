<template>
  <div class="dash-root">
    <!-- 左侧仪表板列表 -->
    <aside class="dash-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">仪表板</span>
        <el-button type="primary" size="small" :icon="Plus" @click="openCreateDashboard" />
      </div>
      <div class="sidebar-list">
        <div
          v-for="db in dashboards"
          :key="db.id"
          class="sidebar-item"
          :class="{ active: currentDashboard?.id === db.id }"
          @click="selectDashboard(db)"
        >
          <el-icon class="sidebar-icon"><Grid /></el-icon>
          <span class="sidebar-name" :title="db.name">{{ db.name }}</span>
          <el-popconfirm title="确认删除此仪表板？" @confirm.stop="handleDeleteDashboard(db.id)">
            <template #reference>
              <el-icon class="sidebar-del" @click.stop><Delete /></el-icon>
            </template>
          </el-popconfirm>
        </div>
        <div v-if="!dashboards.length" class="sidebar-empty">暂无仪表板</div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="dash-main" v-loading="loading">
      <template v-if="!currentDashboard">
        <el-empty description="请在左侧选择或新建仪表板" class="dash-empty" />
      </template>

      <template v-else>
        <!-- KPI 统计条 -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">仪表板</div>
            <div class="kpi-value">{{ kpi.dashboardCount ?? '--' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">图表</div>
            <div class="kpi-value">{{ kpi.chartCount ?? '--' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">数据集</div>
            <div class="kpi-value">{{ kpi.datasetCount ?? '--' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">数据源</div>
            <div class="kpi-value">{{ kpi.datasourceCount ?? '--' }}</div>
          </div>
        </div>

        <!-- 工具栏 -->
        <div class="section-bar">
          <span class="section-title">{{ currentDashboard.name }}</span>
          <div class="section-actions">
            <el-button size="small" :icon="Plus" type="primary" @click="openAddChart">添加图表</el-button>
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents">刷新</el-button>
          </div>
        </div>

        <div class="layout-hint">拖动卡片标题可移动组件，拖动右下角可调整大小</div>

        <!-- 图表组件网格 -->
        <div ref="canvasRef" class="chart-grid" :style="{ minHeight: `${canvasMinHeight}px` }" v-loading="compLoading">
          <div
            v-for="comp in components"
            :key="comp.id"
            class="chart-card"
            :class="{ active: activeCompId === comp.id }"
            :style="getCardStyle(comp)"
            @mousedown="focusComponent(comp)"
          >
            <div class="chart-card-header" @mousedown.stop.prevent="startDrag($event, comp)">
              <span class="chart-card-name">{{ chartMap.get(comp.chartId)?.name ?? '图表' }}</span>
              <div class="chart-card-actions">
                <el-tag size="small" type="info" style="margin-right:6px">
                  {{ chartMap.get(comp.chartId)?.chartType ?? '' }}
                </el-tag>
                <el-popconfirm title="从仪表板移除此图表？" @confirm="removeComponent(comp.id)">
                  <template #reference>
                    <el-icon class="remove-btn"><Close /></el-icon>
                  </template>
                </el-popconfirm>
              </div>
            </div>
            <div
              :ref="(el) => setChartRef(el as HTMLElement | null, comp.id)"
              class="chart-canvas"
            />
            <div v-if="!chartMap.get(comp.chartId)?.xField || !chartMap.get(comp.chartId)?.yField" class="no-field-tip">
              尚未配置坐标字段，请前往「图表设计」配置
            </div>
            <div class="resize-handle" @mousedown.stop.prevent="startResize($event, comp)"></div>
          </div>
          <el-empty
            v-if="!components.length && !compLoading"
            description="暂无图表组件，点击「添加图表」将图表加入仪表板"
            class="grid-empty"
          />
        </div>
      </template>
    </main>

    <!-- 新建仪表板对话框 -->
    <el-dialog v-model="createDashVisible" title="新建仪表板" width="400px" destroy-on-close>
      <el-form :model="dashForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dashForm.name" placeholder="请输入仪表板名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDashVisible = false">取消</el-button>
        <el-button type="primary" :loading="dashSaving" @click="handleCreateDashboard">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加图表对话框 -->
    <el-dialog v-model="addChartVisible" title="添加图表到仪表板" width="500px" destroy-on-close>
      <el-input v-model="chartSearch" placeholder="搜索图表名称" clearable style="margin-bottom:12px" />
      <div class="chart-pick-list">
        <div
          v-for="c in filteredCharts"
          :key="c.id"
          class="chart-pick-item"
          :class="{ selected: selectedChartId === c.id }"
          @click="selectedChartId = c.id"
        >
          <el-icon><PieChart /></el-icon>
          <span class="pick-name">{{ c.name }}</span>
          <el-tag size="small" type="info">{{ c.chartType }}</el-tag>
        </div>
        <div v-if="!filteredCharts.length" style="color:#909399;font-size:13px;padding:12px 0">暂无图表</div>
      </div>
      <template #footer>
        <el-button @click="addChartVisible = false">取消</el-button>
        <el-button type="primary" :loading="addingChart" :disabled="!selectedChartId" @click="handleAddChart">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Delete, Grid, PieChart, Plus, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  addDashboardComponent,
  createDashboard,
  deleteDashboard,
  getDashboardComponents,
  getDashboardList,
  getDefaultDashboard,
  removeDashboardComponent,
  updateDashboardComponent,
  type Dashboard,
  type DashboardComponent
} from '../api/dashboard'
import { getChartData, getChartList, type Chart } from '../api/chart'

// ---- state ----
const loading    = ref(false)
const compLoading = ref(false)
const dashboards  = ref<Dashboard[]>([])
const currentDashboard = ref<Dashboard | null>(null)
const components  = ref<DashboardComponent[]>([])
const allCharts   = ref<Chart[]>([])
const chartMap    = ref(new Map<number, Chart>())
const kpi = ref<{ dashboardCount?: number; chartCount?: number; datasetCount?: number; datasourceCount?: number }>({})
const canvasRef = ref<HTMLElement | null>(null)
const activeCompId = ref<number | null>(null)

const MIN_CARD_WIDTH = 320
const MIN_CARD_HEIGHT = 220
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70

// create dashboard dialog
const createDashVisible = ref(false)
const dashSaving = ref(false)
const dashForm = reactive({ name: '' })

// add chart dialog
const addChartVisible = ref(false)
const chartSearch = ref('')
const selectedChartId = ref<number | null>(null)
const addingChart = ref(false)

const filteredCharts = computed(() => {
  const q = chartSearch.value.toLowerCase()
  return q ? allCharts.value.filter(c => c.name.toLowerCase().includes(q)) : allCharts.value
})

// echarts instances
const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, echarts.ECharts>()

const setChartRef = (el: HTMLElement | null, compId: number) => {
  if (el) chartRefs.set(compId, el)
}

const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? 1200, MIN_CARD_WIDTH + 32)

const normalizeLayout = (comp: DashboardComponent) => {
  if (comp.width <= 24) comp.width = Math.max(MIN_CARD_WIDTH, comp.width * LEGACY_GRID_COL_PX)
  if (comp.height <= 12) comp.height = Math.max(MIN_CARD_HEIGHT, comp.height * LEGACY_GRID_ROW_PX)
  if (comp.posX <= 24 && comp.width > 24) comp.posX = comp.posX * LEGACY_GRID_COL_PX
  if (comp.posY <= 24 && comp.height > 12) comp.posY = comp.posY * LEGACY_GRID_ROW_PX

  comp.posX = Math.max(0, Number(comp.posX) || 0)
  comp.posY = Math.max(0, Number(comp.posY) || 0)
  comp.width = Math.max(MIN_CARD_WIDTH, Number(comp.width) || MIN_CARD_WIDTH)
  comp.height = Math.max(MIN_CARD_HEIGHT, Number(comp.height) || MIN_CARD_HEIGHT)
  comp.zIndex = Number(comp.zIndex) || 0
}

const getCardStyle = (comp: DashboardComponent) => ({
  left: `${comp.posX}px`,
  top: `${comp.posY}px`,
  width: `${comp.width}px`,
  height: `${comp.height}px`,
  zIndex: String(comp.zIndex ?? 0),
})

const canvasMinHeight = computed(() => {
  const occupied = components.value.reduce((max, c) => Math.max(max, (c.posY ?? 0) + (c.height ?? 0) + 20), 0)
  return Math.max(420, occupied)
})

const getMaxZ = () => components.value.reduce((max, c) => Math.max(max, c.zIndex ?? 0), 0)

const focusComponent = (comp: DashboardComponent) => {
  activeCompId.value = comp.id
  const maxZ = getMaxZ()
  if ((comp.zIndex ?? 0) <= maxZ) comp.zIndex = maxZ + 1
}

// ---- load ----
const loadAll = async () => {
  loading.value = true
  try {
    const [dbList, charts, summary] = await Promise.all([
      getDashboardList(),
      getChartList(),
      getDefaultDashboard()
    ])
    dashboards.value = dbList
    allCharts.value = charts
    kpi.value = summary.kpi
    chartMap.value = new Map(charts.map(c => [c.id, c]))
    if (dbList.length) {
      await selectDashboard(dbList[0])
    }
  } finally {
    loading.value = false
  }
}

const selectDashboard = async (db: Dashboard) => {
  currentDashboard.value = db
  await loadComponents()
}

const loadComponents = async () => {
  if (!currentDashboard.value) return
  compLoading.value = true
  // dispose old instances
  chartInstances.forEach(i => i.dispose())
  chartInstances.clear()
  chartRefs.clear()
  try {
    components.value = await getDashboardComponents(currentDashboard.value.id)
    components.value.forEach(normalizeLayout)
    await nextTick()
    for (const comp of components.value) {
      const chart = chartMap.value.get(comp.chartId)
      if (chart?.xField && chart?.yField) renderChart(comp)
    }
  } finally {
    compLoading.value = false
  }
}

// ---- render ----
const buildOption = (data: ReturnType<typeof getChartData> extends Promise<infer T> ? T : never) => {
  const { chartType: type, labels, series } = data
  if (type === 'pie' || type === 'doughnut') {
    const pieData = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
      series: [{ type: 'pie', radius: type === 'doughnut' ? ['40%', '70%'] : '60%', data: pieData }]
    }
  }
  if (type === 'funnel') {
    return {
      tooltip: { trigger: 'item' },
      series: [{ type: 'funnel', data: series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? [] }]
    }
  }
  return {
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? {} : undefined,
    grid: { left: 30, right: 20, bottom: 20, top: series.length > 1 ? 36 : 16, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 30 : 0 } },
    yAxis: { type: 'value' },
    series: series.map(s => ({ name: s.name, type: type === 'bar_horizontal' ? 'bar' : type, data: s.data }))
  }
}

const renderChart = async (comp: DashboardComponent) => {
  const el = chartRefs.get(comp.id)
  if (!el) return
  try {
    const data = await getChartData(comp.chartId)
    let inst = chartInstances.get(comp.id)
    if (!inst) {
      inst = echarts.init(el)
      chartInstances.set(comp.id, inst)
      window.addEventListener('resize', () => inst?.resize())
    }
    inst.setOption(buildOption(data), true)
  } catch { /* ignore */ }
}

// ---- drag & resize ----
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

const findComp = (id: number) => components.value.find(c => c.id === id)

const persistLayout = async (comp: DashboardComponent) => {
  if (!currentDashboard.value) return
  try {
    await updateDashboardComponent(currentDashboard.value.id, comp.id, {
      posX: Math.round(comp.posX),
      posY: Math.round(comp.posY),
      width: Math.round(comp.width),
      height: Math.round(comp.height),
      zIndex: comp.zIndex
    })
  } catch {
    ElMessage.warning('布局保存失败，请重试')
  }
}

const startDrag = (evt: MouseEvent, comp: DashboardComponent) => {
  focusComponent(comp)
  interaction = {
    mode: 'move',
    compId: comp.id,
    startMouseX: evt.clientX,
    startMouseY: evt.clientY,
    startX: comp.posX,
    startY: comp.posY,
    startWidth: comp.width,
    startHeight: comp.height
  }
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const startResize = (evt: MouseEvent, comp: DashboardComponent) => {
  focusComponent(comp)
  interaction = {
    mode: 'resize',
    compId: comp.id,
    startMouseX: evt.clientX,
    startMouseY: evt.clientY,
    startX: comp.posX,
    startY: comp.posY,
    startWidth: comp.width,
    startHeight: comp.height
  }
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const onPointerMove = (evt: MouseEvent) => {
  if (!interaction) return
  const comp = findComp(interaction.compId)
  if (!comp) return

  const dx = evt.clientX - interaction.startMouseX
  const dy = evt.clientY - interaction.startMouseY

  if (interaction.mode === 'move') {
    const maxX = Math.max(0, getCanvasWidth() - comp.width)
    comp.posX = Math.min(maxX, Math.max(0, interaction.startX + dx))
    comp.posY = Math.max(0, interaction.startY + dy)
  } else {
    const maxWidth = Math.max(MIN_CARD_WIDTH, getCanvasWidth() - comp.posX)
    comp.width = Math.min(maxWidth, Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx))
    comp.height = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy)
    chartInstances.get(comp.id)?.resize()
  }
}

const onPointerUp = async () => {
  if (!interaction) return
  const comp = findComp(interaction.compId)
  interaction = null
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  if (comp) {
    chartInstances.get(comp.id)?.resize()
    await persistLayout(comp)
  }
}

// ---- dashboard CRUD ----
const openCreateDashboard = () => {
  dashForm.name = ''
  createDashVisible.value = true
}

const handleCreateDashboard = async () => {
  if (!dashForm.name.trim()) return ElMessage.warning('请输入仪表板名称')
  dashSaving.value = true
  try {
    const newDb = await createDashboard({ name: dashForm.name })
    dashboards.value.unshift(newDb)
    createDashVisible.value = false
    await selectDashboard(newDb)
    ElMessage.success('仪表板创建成功')
  } finally {
    dashSaving.value = false
  }
}

const handleDeleteDashboard = async (id: number) => {
  await deleteDashboard(id)
  dashboards.value = dashboards.value.filter(d => d.id !== id)
  if (currentDashboard.value?.id === id) {
    currentDashboard.value = dashboards.value[0] ?? null
    if (currentDashboard.value) await loadComponents()
    else components.value = []
  }
  ElMessage.success('已删除')
}

// ---- component CRUD ----
const openAddChart = () => {
  selectedChartId.value = null
  chartSearch.value = ''
  addChartVisible.value = true
}

const handleAddChart = async () => {
  if (!currentDashboard.value || !selectedChartId.value) return
  addingChart.value = true
  try {
    // auto pos: place below existing cards in canvas coordinates
    const lastY = components.value.reduce((max, c) => Math.max(max, c.posY + c.height), 0)
    const comp = await addDashboardComponent(currentDashboard.value.id, {
      chartId: selectedChartId.value,
      posX: 12,
      posY: lastY + 12,
      width: 520,
      height: 320,
      zIndex: getMaxZ() + 1
    })
    normalizeLayout(comp)
    components.value.push(comp)
    addChartVisible.value = false
    ElMessage.success('图表已添加到仪表板')
    await nextTick()
    const chart = chartMap.value.get(comp.chartId)
    if (chart?.xField && chart?.yField) renderChart(comp)
  } finally {
    addingChart.value = false
  }
}

const removeComponent = async (compId: number) => {
  if (!currentDashboard.value) return
  await removeDashboardComponent(currentDashboard.value.id, compId)
  const inst = chartInstances.get(compId)
  if (inst) { inst.dispose(); chartInstances.delete(compId) }
  components.value = components.value.filter(c => c.id !== compId)
  ElMessage.success('已从仪表板移除')
}

onMounted(loadAll)
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  chartInstances.forEach(i => i.dispose())
  chartInstances.clear()
})
</script>

<style scoped>
.dash-root {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

/* sidebar */
.dash-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #ebeef5;
}
.sidebar-title { font-size: 13px; font-weight: 700; color: #303133; }
.sidebar-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: background .15s;
  border-radius: 4px;
  margin: 2px 6px;
}
.sidebar-item:hover { background: #f0f2f5; }
.sidebar-item.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
.sidebar-icon { flex-shrink: 0; color: #909399; }
.sidebar-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-del { color: #c0c4cc; cursor: pointer; flex-shrink: 0; }
.sidebar-del:hover { color: #f56c6c; }
.sidebar-empty { color: #c0c4cc; font-size: 12px; text-align: center; padding: 20px 0; }

/* main */
.dash-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-width: 0;
}
.dash-empty { margin-top: 80px; }

/* KPI */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.kpi-label { font-size: 12px; color: #909399; }
.kpi-value { font-size: 26px; font-weight: 700; color: #409eff; margin-top: 4px; }

/* section bar */
.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title { font-size: 15px; font-weight: 700; color: #303133; }
.section-actions { display: flex; gap: 8px; }
.layout-hint { color: #909399; font-size: 12px; margin-bottom: 8px; }

/* chart grid — 24 column */
.chart-grid {
  position: relative;
  background: linear-gradient(0deg, rgba(238,242,247,0.9) 1px, transparent 1px),
              linear-gradient(90deg, rgba(238,242,247,0.9) 1px, transparent 1px);
  background-size: 24px 24px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
}
.chart-card {
  position: absolute;
  background: #fff;
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid transparent;
  user-select: none;
}
.chart-card.active {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, .18);
}
.chart-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  cursor: move;
}
.chart-card-name { font-size: 13px; font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-card-actions { display: flex; align-items: center; flex-shrink: 0; }
.remove-btn { color: #c0c4cc; cursor: pointer; }
.remove-btn:hover { color: #f56c6c; }
.chart-canvas { flex: 1; min-height: 140px; }
.no-field-tip { text-align: center; font-size: 12px; color: #c0c4cc; padding: 30px 0; }
.grid-empty { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; }
.resize-handle {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
.resize-handle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-right: 2px solid #b8c2d1;
  border-bottom: 2px solid #b8c2d1;
}

/* add chart picker */
.chart-pick-list { max-height: 320px; overflow-y: auto; border: 1px solid #ebeef5; border-radius: 4px; }
.chart-pick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  border-bottom: 1px solid #f5f5f5;
  transition: background .15s;
}
.chart-pick-item:last-child { border-bottom: none; }
.chart-pick-item:hover { background: #f5f7fa; }
.chart-pick-item.selected { background: #ecf5ff; color: #409eff; }
.pick-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

