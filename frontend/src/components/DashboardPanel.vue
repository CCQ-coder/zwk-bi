<template>
  <div class="dash-root" :class="{ 'dash-root--editor': editorMode }">
    <!-- 左侧仪表板列表 -->
    <aside v-if="!editorMode" class="dash-sidebar" :class="{ 'dash-sidebar--collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed" class="sidebar-title">仪表板</span>
        <div class="sidebar-header-btns">
          <el-button v-if="!sidebarCollapsed" type="primary" size="small" :icon="Plus" @click="openCreateDashboard" />
          <el-button size="small" :icon="Fold" @click="sidebarCollapsed = !sidebarCollapsed" />
        </div>
      </div>
      <template v-if="!sidebarCollapsed">
      <div class="sidebar-search-wrap">
        <el-input v-model="dashboardSearch" :prefix-icon="Search" placeholder="检索目录" clearable />
      </div>
      <div class="sidebar-list">
        <div
          v-for="db in filteredDashboards"
          :key="db.id"
          class="sidebar-item"
          :class="{ active: currentDashboard?.id === db.id }"
          @click="selectDashboard(db)"
        >
          <el-icon class="sidebar-icon"><Grid /></el-icon>
          <div class="sidebar-copy">
            <span class="sidebar-name" :title="db.name">{{ db.name }}</span>
            <span class="sidebar-meta">{{ getDashboardComponentCount(db.id) }} 个组件 · {{ getDashboardStatusText(db) }}</span>
          </div>
          <el-popconfirm title="确认删除此仪表板？" @confirm.stop="handleDeleteDashboard(db.id)">
            <template #reference>
              <el-icon class="sidebar-del" @click.stop><Delete /></el-icon>
            </template>
          </el-popconfirm>
        </div>
        <div v-if="!dashboards.length" class="sidebar-empty">暂无仪表板</div>
      </div>
      </template>
    </aside>

    <!-- 主内容区 -->
    <main class="dash-main" v-loading="loading">
      <template v-if="!currentDashboard">
        <el-empty :description="editorMode ? '未找到对应仪表板' : '请在左侧选择或新建仪表板'" class="dash-empty" />
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
          <div class="section-title-wrap">
            <div class="section-title-block">
              <span class="section-title">{{ currentDashboard.name }}</span>
              <span class="section-subtext">{{ components.length }} 个组件 · {{ isPublished ? '已发布，可直接分享' : '草稿，建议完成后发布' }}</span>
            </div>
            <el-tag size="small" :type="isPublished ? 'success' : 'info'">{{ isPublished ? '已发布' : '草稿' }}</el-tag>
          </div>
          <div class="section-actions">
            <el-button size="small" :icon="Plus" type="primary" @click="openAddChart">添加图表</el-button>
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents">刷新</el-button>
            <el-button size="small" :icon="View" @click="openPreview">预览</el-button>
            <el-button size="small" :icon="Promotion" @click="openPublishDialog">{{ isPublished ? '发布设置' : '发布' }}</el-button>
            <el-button size="small" :icon="Share" @click="openShareDialog">分享</el-button>
            <el-button size="small" :icon="Download" @click="exportDashboardJson">导出</el-button>
            <el-button v-if="editorMode" size="small" :icon="ArrowLeft" @click="emit('back')">退出</el-button>
          </div>
        </div>

        <div class="layout-hint">拖动卡片标题可移动组件，拖动组件边框或四角可直接调整大小</div>

        <!-- 图表组件网格 -->
        <div ref="canvasRef" class="chart-grid" :style="{ minHeight: `${canvasMinHeight}px` }" v-loading="compLoading">
          <div
            v-for="comp in components"
            :key="comp.id"
            :ref="(el) => setCardRef(el as HTMLElement | null, comp.id)"
            class="chart-card"
            :class="{ active: activeCompId === comp.id }"
            :style="getCardStyle(comp)"
            @mousedown="focusComponent(comp)"
          >
            <div class="chart-card-header" @mousedown.stop.prevent="startDrag($event, comp)">
              <div class="chart-card-header-main">
                <span class="chart-card-name">{{ getComponentDisplayName(comp) }}</span>
                <span class="chart-card-subtitle">{{ chartTypeLabel(getComponentChartConfig(comp).chartType) }}</span>
              </div>
              <div class="chart-card-actions">
                <el-tag size="small" :type="getComponentStatus(comp).type" style="margin-right:6px">
                  {{ getComponentStatus(comp).label }}
                </el-tag>
                <el-popconfirm title="从仪表板移除此图表？" @confirm="removeComponent(comp.id)">
                  <template #reference>
                    <el-icon class="remove-btn"><Close /></el-icon>
                  </template>
                </el-popconfirm>
              </div>
            </div>
            <div v-if="isStaticWidget(comp)" class="chart-canvas">
              <ComponentStaticPreview
                :chart-type="getComponentChartConfig(comp).chartType"
                :chart-config="getComponentChartConfig(comp)"
                :style-config="getComponentConfig(comp).style"
                :show-title="getComponentConfig(comp).style.showTitle"
              />
            </div>
            <div
              v-else
              :ref="(el) => setChartRef(el as HTMLElement | null, comp.id)"
              class="chart-canvas"
            />
            <div v-if="showNoField(comp)" class="no-field-tip">
              尚未配置完整字段，请在右侧组件属性中补充后再预览
            </div>
            <div v-else-if="!isStaticWidget(comp) && !isRenderableChart(comp)" class="no-field-tip">
              当前仪表板暂未支持 {{ chartTypeLabel(getComponentChartConfig(comp).chartType) }} 的实时渲染
            </div>
            <div
              v-for="handle in resizeHandles"
              :key="handle"
              class="resize-handle"
              :class="`resize-handle--${handle}`"
              @mousedown.stop.prevent="startResize($event, comp, handle)"
            ></div>
          </div>
          <el-empty
            v-if="!components.length && !compLoading"
            description="暂无图表组件，点击「添加图表」将图表加入仪表板"
            class="grid-empty"
          />
        </div>
      </template>
    </main>

    <aside class="dash-inspector">
      <EditorComponentInspector
        scene="dashboard"
        :component="activeComponent"
        :chart="activeChart"
        @apply-layout="applyLayoutPatch"
        @bring-front="bringComponentToFront"
        @remove="handleRemoveActiveComponent"
        @preview-component="previewActiveComponent"
        @save-component="saveActiveComponent"
      />
    </aside>

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

    <el-dialog v-model="shareVisible" title="分享仪表板" width="520px" destroy-on-close>
      <div v-if="isPublished" class="share-block">
        <div class="share-label">只读预览链接</div>
        <el-input :model-value="shareLink" readonly />
        <div class="share-tip">分享对象可通过该链接预览仪表板，也可用于打印 / PDF 导出。</div>
      </div>
      <el-alert
        v-else
        title="当前仪表板尚未正式发布"
        type="warning"
        :closable="false"
        description="请先设置发布状态、允许访问角色和正式分享链接，再对外分享。"
      />
      <template #footer>
        <el-button @click="shareVisible = false">关闭</el-button>
        <el-button v-if="!isPublished" type="primary" @click="openPublishDialog">去发布</el-button>
        <template v-else>
          <el-button @click="openPreview(true)">打开预览</el-button>
          <el-button type="primary" @click="copyShareLink">复制链接</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog v-model="publishVisible" title="发布仪表板" width="560px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="发布状态">
          <el-switch v-model="publishForm.published" active-text="已发布" inactive-text="草稿" />
        </el-form-item>
        <el-form-item label="允许匿名链接">
          <el-switch v-model="publishForm.allowAnonymousAccess" active-text="允许" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="允许访问角色">
          <el-checkbox-group v-model="publishForm.allowedRoles">
            <el-checkbox v-for="role in roleOptions" :key="role" :label="role">{{ role }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="正式分享链接">
          <el-input :model-value="draftPublishedLink" readonly />
        </el-form-item>
      </el-form>
      <div class="publish-tip">
        发布后会生成固定分享链接。未登录访问时，需使用该正式链接；登录用户则按角色权限决定是否可查看。
      </div>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishSaving" @click="savePublishSettings">保存发布设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Close, Delete, Download, Fold, Grid, PieChart, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue'
import ComponentStaticPreview from './ComponentStaticPreview.vue'
import EditorComponentInspector from './EditorComponentInspector.vue'
import {
  addDashboardComponent,
  createDashboard,
  deleteDashboard,
  getDashboardById,
  getDashboardComponents,
  getDashboardList,
  getDefaultDashboard,
  removeDashboardComponent,
  updateDashboard,
  updateDashboardComponent,
  type Dashboard,
  type DashboardComponent
} from '../api/dashboard'
import { getChartData, getChartList, type Chart } from '../api/chart'
import {
  buildChartSnapshot,
  buildComponentConfig,
  buildComponentOption,
  chartTypeLabel,
  getMissingChartFields,
  isCanvasRenderableChartType,
  isStaticWidgetChartType,
  mergeComponentRequestFilters,
  normalizeRuntimeChartData,
  normalizeComponentConfig,
} from '../utils/component-config'
import { echarts, type ECharts } from '../utils/echarts'
import { buildPublishedLink, buildReportConfig, normalizePublishConfig, parseReportConfig, type PublishStatus } from '../utils/report-config'

const props = withDefaults(defineProps<{
  dashboardId?: number | null
}>(), {
  dashboardId: null,
})
const emit = defineEmits<{ (e: 'back'): void }>()

// ---- state ----
const loading    = ref(false)
const compLoading = ref(false)
const dashboards  = ref<Dashboard[]>([])
const currentDashboard = ref<Dashboard | null>(null)
const components  = ref<DashboardComponent[]>([])
const dashboardComponentCountMap = ref<Record<number, number>>({})
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
const sidebarCollapsed = ref(false)
const dashboardSearch = ref('')
const shareVisible = ref(false)
const publishVisible = ref(false)
const publishSaving = ref(false)
const publishForm = reactive({
  published: false,
  allowAnonymousAccess: true,
  allowedRoles: ['ADMIN', 'ANALYST'],
  shareToken: ''
})

// add chart dialog
const addChartVisible = ref(false)
const chartSearch = ref('')
const selectedChartId = ref<number | null>(null)
const addingChart = ref(false)

const requestedDashboardId = computed(() => {
  const id = Number(props.dashboardId ?? 0)
  return Number.isFinite(id) && id > 0 ? id : null
})
const editorMode = computed(() => requestedDashboardId.value !== null)

const filteredCharts = computed(() => {
  const q = chartSearch.value.toLowerCase()
  return q ? allCharts.value.filter(c => c.name.toLowerCase().includes(q)) : allCharts.value
})

const filteredDashboards = computed(() => {
  const q = dashboardSearch.value.trim().toLowerCase()
  return q ? dashboards.value.filter(d => d.name.toLowerCase().includes(q)) : dashboards.value
})

const getDashboardScene = (dashboard: Dashboard) => parseReportConfig(dashboard.configJson).scene === 'screen' ? 'screen' : 'dashboard'
const getDashboardPublishStatus = (dashboard: Dashboard): PublishStatus => normalizePublishConfig(parseReportConfig(dashboard.configJson).publish).status
const getDashboardComponentCount = (dashboardId: number) => dashboardComponentCountMap.value[dashboardId] ?? 0
const getDashboardStatusText = (dashboard: Dashboard) => getDashboardPublishStatus(dashboard) === 'PUBLISHED' ? '已发布' : '草稿'

const shareLink = computed(() => currentDashboard.value
  ? buildPublishedLink('dashboard', currentDashboard.value.id, currentPublishConfig.value.shareToken)
  : '')
const previewLink = computed(() => currentDashboard.value
  ? `${window.location.origin}/preview/dashboard/${currentDashboard.value.id}`
  : '')
const roleOptions = ['ADMIN', 'ANALYST', 'VIEWER']
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish))
const isPublished = computed(() => currentPublishConfig.value.status === 'PUBLISHED')
const draftPublishedLink = computed(() => currentDashboard.value
  ? buildPublishedLink('dashboard', currentDashboard.value.id, publishForm.shareToken || currentPublishConfig.value.shareToken)
  : '')
const activeComponent = computed(() => components.value.find((item) => item.id === activeCompId.value) ?? null)
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null)

const getComponentConfig = (comp: DashboardComponent) => normalizeComponentConfig(comp.configJson, chartMap.value.get(comp.chartId))
const getComponentChartConfig = (comp: DashboardComponent) => getComponentConfig(comp).chart
const getComponentDisplayName = (comp: DashboardComponent) => getComponentChartConfig(comp).name?.trim()
  || chartMap.value.get(comp.chartId)?.name
  || '未命名组件'
const isStaticWidget = (comp: DashboardComponent) => isStaticWidgetChartType(getComponentChartConfig(comp).chartType ?? '')
const showNoField = (comp: DashboardComponent) => isStaticWidget(comp) ? false : getMissingChartFields(getComponentChartConfig(comp)).length > 0
const isRenderableChart = (comp: DashboardComponent) => isCanvasRenderableChartType(getComponentChartConfig(comp).chartType ?? '')
const getComponentStatus = (comp: DashboardComponent) => {
  if (showNoField(comp)) {
    return { label: '待补字段', type: 'warning' as const }
  }
  if (!isStaticWidget(comp) && !isRenderableChart(comp)) {
    return { label: '预览受限', type: 'info' as const }
  }
  return { label: '可预览', type: 'success' as const }
}

// echarts instances
const cardRefs = new Map<number, HTMLElement>()
const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, ECharts>()

const setCardRef = (el: HTMLElement | null, compId: number) => {
  if (!el) {
    cardRefs.delete(compId)
    return
  }
  cardRefs.set(compId, el)
  if (interactionPreviewSnapshot?.compId === compId) {
    applyInteractionPreviewToCard(interactionPreviewSnapshot)
  }
}

const setChartRef = (el: HTMLElement | null, compId: number) => {
  if (el) chartRefs.set(compId, el)
  else chartRefs.delete(compId)
}

const waitForRenderFrame = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => resolve())
  })
})

const resolveChartHost = async (compId: number, attempt = 0): Promise<HTMLElement | null> => {
  const host = chartRefs.get(compId) ?? null
  if (!host) return null
  if (host.clientWidth > 0 && host.clientHeight > 0) return host
  if (attempt >= 6) return null
  await waitForRenderFrame()
  return resolveChartHost(compId, attempt + 1)
}

const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? 1200, MIN_CARD_WIDTH + 32)

const normalizeLayout = (comp: DashboardComponent) => {
  // Legacy conversion: only convert when BOTH width and height are in old grid units
  const isLegacy = comp.width <= 24 && comp.height <= 12
  if (isLegacy) {
    comp.width = Math.max(MIN_CARD_WIDTH, comp.width * LEGACY_GRID_COL_PX)
    comp.height = Math.max(MIN_CARD_HEIGHT, comp.height * LEGACY_GRID_ROW_PX)
    comp.posX = comp.posX * LEGACY_GRID_COL_PX
    comp.posY = comp.posY * LEGACY_GRID_ROW_PX
  }

  comp.posX = Math.max(0, Number(comp.posX) || 0)
  comp.posY = Math.max(0, Number(comp.posY) || 0)
  comp.width = Math.max(MIN_CARD_WIDTH, Number(comp.width) || MIN_CARD_WIDTH)
  comp.height = Math.max(MIN_CARD_HEIGHT, Number(comp.height) || MIN_CARD_HEIGHT)
  comp.zIndex = Number(comp.zIndex) || 0
}

const getCardStyle = (comp: DashboardComponent) => {
  const style = getComponentConfig(comp).style
  const shadow = style.shadowShow
    ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
    : undefined
  return {
    left: `${comp.posX}px`,
    top: `${comp.posY}px`,
    width: `${comp.width}px`,
    height: `${comp.height}px`,
    zIndex: String(comp.zIndex ?? 0),
    opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
    boxShadow: shadow,
    padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
  }
}

const canvasMinHeight = computed(() => {
  const occupied = components.value.reduce((max, c) => Math.max(max, (c.posY ?? 0) + (c.height ?? 0) + 20), 0)
  return Math.max(420, occupied)
})

const handleWindowResize = () => {
  chartInstances.forEach((instance) => instance.resize())
}

const getMaxZ = () => components.value.reduce((max, c) => Math.max(max, c.zIndex ?? 0), 0)

const focusComponent = (comp: DashboardComponent) => {
  activeCompId.value = comp.id
  const maxZ = getMaxZ()
  if ((comp.zIndex ?? 0) <= maxZ) comp.zIndex = maxZ + 1
}

const applyLayoutPatch = async (patch: Partial<DashboardComponent>) => {
  const comp = activeComponent.value
  if (!comp) return
  if (typeof patch.posX === 'number') comp.posX = Math.max(0, Math.round(patch.posX))
  if (typeof patch.posY === 'number') comp.posY = Math.max(0, Math.round(patch.posY))
  if (typeof patch.width === 'number') comp.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width))
  if (typeof patch.height === 'number') comp.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height))
  if (typeof patch.zIndex === 'number') comp.zIndex = Math.max(0, Math.round(patch.zIndex))
  normalizeLayout(comp)
  await nextTick()
  chartInstances.get(comp.id)?.resize()
  await persistLayout(comp)
}

const bringComponentToFront = async () => {
  const comp = activeComponent.value
  if (!comp) return
  await applyLayoutPatch({ zIndex: getMaxZ() + 1 })
}

const handleRemoveActiveComponent = async () => {
  if (!activeComponent.value) return
  await removeComponent(activeComponent.value.id)
}

const previewActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const comp = activeComponent.value
  if (!comp) return
  comp.chartId = payload.chartId
  comp.configJson = payload.configJson
  await nextTick()
  if (showNoField(comp)) {
    chartInstances.get(comp.id)?.clear()
    return
  }
  if (!isRenderableChart(comp)) {
    chartInstances.get(comp.id)?.clear()
    return
  }
  await renderChart(comp)
}

const saveActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const comp = activeComponent.value
  if (!comp || !currentDashboard.value) return
  await updateDashboardComponent(currentDashboard.value.id, comp.id, payload)
  comp.chartId = payload.chartId
  comp.configJson = payload.configJson
  await loadComponents()
  ElMessage.success('组件实例配置已保存')
}

// ---- load ----
const loadRequestedDashboard = async (dashboardId = requestedDashboardId.value) => {
  if (!dashboardId) {
    if (dashboards.value.length) {
      await selectDashboard(dashboards.value[0])
    } else {
      currentDashboard.value = null
      components.value = []
    }
    return
  }

  let target = dashboards.value.find((item) => item.id === dashboardId) ?? null
  if (!target) {
    try {
      const fetched = await getDashboardById(dashboardId)
      if (getDashboardScene(fetched) === 'dashboard') {
        target = fetched
        dashboards.value = [fetched, ...dashboards.value.filter((item) => item.id !== fetched.id)]
      }
    } catch {
      target = null
    }
  }

  if (!target) {
    currentDashboard.value = null
    components.value = []
    ElMessage.error('未找到对应仪表板')
    return
  }

  await selectDashboard(target)
}

const loadAll = async () => {
  loading.value = true
  try {
    const [dbList, charts, summary] = await Promise.all([
      getDashboardList(),
      getChartList(),
      getDefaultDashboard()
    ])
    dashboards.value = dbList.filter((item) => getDashboardScene(item) === 'dashboard')
    allCharts.value = charts
    kpi.value = summary.kpi
    chartMap.value = new Map(charts.map(c => [c.id, c]))
    const entries = await Promise.all(
      dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length] as const)
    )
    dashboardComponentCountMap.value = Object.fromEntries(entries)
    await loadRequestedDashboard()
  } finally {
    loading.value = false
  }
}

const selectDashboard = async (db: Dashboard) => {
  currentDashboard.value = db
  activeCompId.value = null
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
    dashboardComponentCountMap.value = {
      ...dashboardComponentCountMap.value,
      [currentDashboard.value.id]: components.value.length,
    }
    await nextTick()
    await Promise.all(components.value.map(async (comp) => {
      if (!showNoField(comp) && isRenderableChart(comp)) {
        await renderChart(comp)
      }
    }))
  } finally {
    compLoading.value = false
  }
}

// ---- render ----
const renderChart = async (comp: DashboardComponent) => {
  const el = await resolveChartHost(comp.id)
  if (!el) return
  if (!isRenderableChart(comp)) return
  try {
    const resolved = getComponentConfig(comp)
    const data = await getChartData(comp.chartId, {
      configJson: comp.configJson,
      filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
    })
    const materialized = normalizeRuntimeChartData(data, resolved.chart)
    let inst = chartInstances.get(comp.id)
    if (!inst) {
      inst = echarts.init(el)
      chartInstances.set(comp.id, inst)
    } else {
      inst.resize()
    }
    inst.setOption(buildComponentOption(materialized, resolved.chart, resolved.style), true)
  } catch { /* ignore */ }
}

// ---- drag & resize ----
type InteractionMode = 'move' | 'resize'
type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
interface InteractionState {
  mode: InteractionMode
  compId: number
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  handle?: ResizeHandle
}

interface InteractionPreview {
  compId: number
  nextX: number
  nextY: number
  nextWidth: number
  nextHeight: number
  transform: string
  transformOrigin: string
}

let interaction: InteractionState | null = null
let interactionPreviewSnapshot: InteractionPreview | null = null
let interactionFrame: number | null = null
let pendingPointer: { x: number; y: number } | null = null
const resizeHandles: ResizeHandle[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']

const findComp = (id: number) => components.value.find(c => c.id === id)

const getResizeTransformOrigin = (handle: ResizeHandle) => {
  const horizontal = handle.includes('w') ? 'right' : handle.includes('e') ? 'left' : 'center'
  const vertical = handle.includes('n') ? 'bottom' : handle.includes('s') ? 'top' : 'center'
  return `${horizontal} ${vertical}`
}

const applyInteractionPreviewToCard = (preview: InteractionPreview | null) => {
  if (!preview) return
  const card = cardRefs.get(preview.compId)
  if (!card) return
  card.style.transform = preview.transform
  card.style.transformOrigin = preview.transformOrigin
}

const clearInteractionPreviewFromCard = (componentId?: number) => {
  const targetId = componentId ?? interactionPreviewSnapshot?.compId
  if (!targetId) return
  const card = cardRefs.get(targetId)
  if (!card) return
  card.style.transform = ''
  card.style.transformOrigin = ''
}

const applyInteractionFrame = () => {
  interactionFrame = null
  if (!interaction || !pendingPointer) return
  const comp = findComp(interaction.compId)
  if (!comp) return

  const dx = pendingPointer.x - interaction.startMouseX
  const dy = pendingPointer.y - interaction.startMouseY

  if (interaction.mode === 'move') {
    const maxX = Math.max(0, getCanvasWidth() - interaction.startWidth)
    const nextX = Math.min(maxX, Math.max(0, interaction.startX + dx))
    const nextY = Math.max(0, interaction.startY + dy)
    const preview = {
      compId: comp.id,
      nextX: Math.round(nextX),
      nextY: Math.round(nextY),
      nextWidth: interaction.startWidth,
      nextHeight: interaction.startHeight,
      transform: `translate(${Math.round(nextX - interaction.startX)}px, ${Math.round(nextY - interaction.startY)}px)`,
      transformOrigin: 'left top',
    }
    interactionPreviewSnapshot = preview
    applyInteractionPreviewToCard(preview)
    return
  }

  const handle = interaction.handle ?? 'se'
  let nextX = interaction.startX
  let nextY = interaction.startY
  let nextWidth = interaction.startWidth
  let nextHeight = interaction.startHeight
  const canvasWidth = getCanvasWidth()

  if (handle.includes('e')) {
    nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX))
  }
  if (handle.includes('s')) {
    nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy)
  }
  if (handle.includes('w')) {
    const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH
    nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft)
    nextWidth = interaction.startWidth - (nextX - interaction.startX)
  }
  if (handle.includes('n')) {
    const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT
    nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop)
    nextHeight = interaction.startHeight - (nextY - interaction.startY)
  }

  const preview = {
    compId: comp.id,
    nextX: Math.round(nextX),
    nextY: Math.round(nextY),
    nextWidth: Math.round(nextWidth),
    nextHeight: Math.round(nextHeight),
    transform: `translate(${Math.round(nextX - interaction.startX)}px, ${Math.round(nextY - interaction.startY)}px) scale(${nextWidth / interaction.startWidth}, ${nextHeight / interaction.startHeight})`,
    transformOrigin: getResizeTransformOrigin(handle),
  }
  interactionPreviewSnapshot = preview
  applyInteractionPreviewToCard(preview)
}

const scheduleInteractionFrame = () => {
  if (interactionFrame !== null) return
  interactionFrame = window.requestAnimationFrame(applyInteractionFrame)
}

const cleanupInteractionFrame = (clearCardPreview = true) => {
  if (interactionFrame !== null) {
    window.cancelAnimationFrame(interactionFrame)
    interactionFrame = null
  }
  pendingPointer = null
  if (clearCardPreview) {
    clearInteractionPreviewFromCard()
    interactionPreviewSnapshot = null
  }
  document.body.classList.remove('canvas-interacting')
}

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
  pendingPointer = { x: evt.clientX, y: evt.clientY }
  document.body.classList.add('canvas-interacting')
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const startResize = (evt: MouseEvent, comp: DashboardComponent, handle: ResizeHandle = 'se') => {
  focusComponent(comp)
  interaction = {
    mode: 'resize',
    compId: comp.id,
    startMouseX: evt.clientX,
    startMouseY: evt.clientY,
    startX: comp.posX,
    startY: comp.posY,
    startWidth: comp.width,
    startHeight: comp.height,
    handle,
  }
  pendingPointer = { x: evt.clientX, y: evt.clientY }
  document.body.classList.add('canvas-interacting')
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const onPointerMove = (evt: MouseEvent) => {
  if (!interaction) return
  pendingPointer = { x: evt.clientX, y: evt.clientY }
  scheduleInteractionFrame()
}

const onPointerUp = async () => {
  if (!interaction) return
  const comp = findComp(interaction.compId)
  if (pendingPointer) {
    applyInteractionFrame()
  }
  const preview = interactionPreviewSnapshot?.compId === interaction.compId ? { ...interactionPreviewSnapshot } : null
  interaction = null
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame(false)
  if (comp) {
    if (preview) {
      clearInteractionPreviewFromCard(comp.id)
      interactionPreviewSnapshot = null
      comp.posX = preview.nextX
      comp.posY = preview.nextY
      comp.width = preview.nextWidth
      comp.height = preview.nextHeight
      normalizeLayout(comp)
    } else {
      clearInteractionPreviewFromCard(comp.id)
      interactionPreviewSnapshot = null
    }
    await nextTick()
    chartInstances.get(comp.id)?.resize()
    await persistLayout(comp)
  } else {
    clearInteractionPreviewFromCard()
    interactionPreviewSnapshot = null
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
    const newDb = await createDashboard({ name: dashForm.name, configJson: buildReportConfig(null, 'dashboard') })
    dashboards.value.unshift(newDb)
    dashboardComponentCountMap.value = {
      ...dashboardComponentCountMap.value,
      [newDb.id]: 0,
    }
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
  const nextCountMap = { ...dashboardComponentCountMap.value }
  delete nextCountMap[id]
  dashboardComponentCountMap.value = nextCountMap
  if (currentDashboard.value?.id === id) {
    currentDashboard.value = dashboards.value[0] ?? null
    if (currentDashboard.value) await loadComponents()
    else components.value = []
  }
  ElMessage.success('已删除')
}

const openPreview = (focusShare = false) => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择仪表板')
  window.open(focusShare && isPublished.value ? shareLink.value : previewLink.value, '_blank', 'noopener,noreferrer')
}

const openShareDialog = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择仪表板')
  shareVisible.value = true
}

const openPublishDialog = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择仪表板')
  const publish = currentPublishConfig.value
  publishForm.published = publish.status === 'PUBLISHED'
  publishForm.allowAnonymousAccess = publish.allowAnonymousAccess
  publishForm.allowedRoles = [...publish.allowedRoles]
  publishForm.shareToken = publish.shareToken
  publishVisible.value = true
}

const savePublishSettings = async () => {
  if (!currentDashboard.value) return
  publishSaving.value = true
  try {
    const configJson = buildReportConfig(currentDashboard.value.configJson, 'dashboard', {
      status: publishForm.published ? 'PUBLISHED' : 'DRAFT',
      allowAnonymousAccess: publishForm.allowAnonymousAccess,
      allowedRoles: publishForm.allowedRoles,
      shareToken: publishForm.shareToken,
      publishedAt: publishForm.published ? new Date().toISOString() : undefined,
    })
    const updated = await updateDashboard(currentDashboard.value.id, { configJson })
    currentDashboard.value = updated
    dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item)
    publishVisible.value = false
    ElMessage.success('发布设置已保存')
  } finally {
    publishSaving.value = false
  }
}

const copyShareLink = async () => {
  if (!isPublished.value) {
    ElMessage.warning('请先发布仪表板')
    return
  }
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('分享链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制链接')
  }
}

const exportDashboardJson = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择仪表板')
  const payload = {
    dashboard: currentDashboard.value,
    components: components.value,
    charts: components.value
      .map((comp) => chartMap.value.get(comp.chartId))
      .filter((chart): chart is Chart => Boolean(chart))
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${currentDashboard.value.name}-dashboard.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
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
    // auto pos: place below existing cards; flow into columns when space allows
    const cardW = 520
    const cardH = 320
    const gap = 12
    const canvasW = getCanvasWidth()
    const cols = Math.max(1, Math.floor((canvasW + gap) / (cardW + gap)))
    const count = components.value.length
    const col = count % cols
    const row = Math.floor(count / cols)
    const posX = gap + col * (cardW + gap)
    const posY = gap + row * (cardH + gap)
    const comp = await addDashboardComponent(currentDashboard.value.id, {
      chartId: selectedChartId.value,
      posX,
      posY,
      width: cardW,
      height: cardH,
      zIndex: getMaxZ() + 1,
      configJson: buildComponentConfig(chartMap.value.get(selectedChartId.value) ?? null, undefined, {
        chart: buildChartSnapshot(chartMap.value.get(selectedChartId.value) ?? null),
      })
    })
    normalizeLayout(comp)
    components.value.push(comp)
    dashboardComponentCountMap.value = {
      ...dashboardComponentCountMap.value,
      [currentDashboard.value.id]: components.value.length,
    }
    addChartVisible.value = false
    ElMessage.success('图表已添加到仪表板')
    await nextTick()
    if (!showNoField(comp) && isRenderableChart(comp)) await renderChart(comp)
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
  dashboardComponentCountMap.value = {
    ...dashboardComponentCountMap.value,
    [currentDashboard.value.id]: components.value.length,
  }
  if (activeCompId.value === compId) activeCompId.value = null
  ElMessage.success('已从仪表板移除')
}

watch(requestedDashboardId, (nextId, prevId) => {
  if (nextId === prevId) return
  void loadRequestedDashboard(nextId)
})

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  void loadAll()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame()
  window.removeEventListener('resize', handleWindowResize)
  chartInstances.forEach(i => i.dispose())
  chartInstances.clear()
  cardRefs.clear()
})
</script>

<style scoped>
.dash-root {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

.dash-root--editor {
  background: #eef3f8;
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
  transition: width 0.2s ease;
}
.dash-sidebar--collapsed {
  width: 48px;
}
.sidebar-header-btns {
  display: flex;
  gap: 4px;
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #ebeef5;
}
.sidebar-search-wrap { padding: 10px 10px 6px; border-bottom: 1px solid #f2f4f7; }
.sidebar-title { font-size: 13px; font-weight: 700; color: #303133; }
.sidebar-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: background .15s;
  border-radius: 10px;
  margin: 2px 6px;
}
.sidebar-item:hover { background: #f0f2f5; }
.sidebar-item.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
.sidebar-icon { flex-shrink: 0; color: #909399; }
.sidebar-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sidebar-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-meta { font-size: 11px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

.dash-inspector {
  width: 320px;
  flex-shrink: 0;
  padding: 16px 16px 16px 0;
  overflow-y: auto;
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
.section-title-wrap { display: flex; align-items: center; gap: 8px; }
.section-title-block { display: flex; flex-direction: column; gap: 4px; }
.section-title { font-size: 15px; font-weight: 700; color: #303133; }
.section-subtext { font-size: 12px; color: #909399; }
.section-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.layout-hint { color: #909399; font-size: 12px; margin-bottom: 8px; }

.share-block { display: flex; flex-direction: column; gap: 10px; }
.share-label { font-size: 13px; font-weight: 600; color: #303133; }
.share-tip { font-size: 12px; color: #909399; line-height: 1.6; }
.publish-tip { margin-top: 8px; font-size: 12px; line-height: 1.7; color: #909399; }

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
  will-change: transform, width, height;
}

:global(body.canvas-interacting) .chart-grid .chart-card,
:global(body.canvas-interacting) .chart-grid .chart-card * {
  transition: none !important;
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
.chart-card-header-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chart-card-name { font-size: 13px; font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-card-subtitle { font-size: 12px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-card-actions { display: flex; align-items: center; flex-shrink: 0; }
.remove-btn { color: #c0c4cc; cursor: pointer; }
.remove-btn:hover { color: #f56c6c; }
.chart-canvas { flex: 1; min-height: 140px; }
.no-field-tip { text-align: center; font-size: 12px; color: #c0c4cc; padding: 30px 0; }
.grid-empty { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; }
.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.chart-card:hover .resize-handle,
.chart-card.active .resize-handle {
  opacity: 1;
}

.resize-handle::before {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: #409eff;
  box-shadow: 0 0 0 2px #ffffff;
}

.resize-handle--n,
.resize-handle--s {
  left: 18px;
  right: 18px;
  height: 12px;
}

.resize-handle--n {
  top: -6px;
  cursor: ns-resize;
}

.resize-handle--s {
  bottom: -6px;
  cursor: ns-resize;
}

.resize-handle--n::before,
.resize-handle--s::before {
  left: 50%;
  top: 50%;
  width: 34px;
  height: 4px;
  transform: translate(-50%, -50%);
}

.resize-handle--e,
.resize-handle--w {
  top: 18px;
  bottom: 18px;
  width: 12px;
}

.resize-handle--e {
  right: -6px;
  cursor: ew-resize;
}

.resize-handle--w {
  left: -6px;
  cursor: ew-resize;
}

.resize-handle--e::before,
.resize-handle--w::before {
  left: 50%;
  top: 50%;
  width: 4px;
  height: 34px;
  transform: translate(-50%, -50%);
}

.resize-handle--ne,
.resize-handle--nw,
.resize-handle--se,
.resize-handle--sw {
  width: 16px;
  height: 16px;
}

.resize-handle--ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.resize-handle--nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

.resize-handle--se {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}

.resize-handle--sw {
  left: -6px;
  bottom: -6px;
  cursor: nesw-resize;
}

.resize-handle--ne::before,
.resize-handle--nw::before,
.resize-handle--se::before,
.resize-handle--sw::before {
  inset: 2px;
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

@media (max-width: 1200px) {
  .dash-root {
    flex-direction: column;
    height: auto;
  }

  .dash-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .dash-inspector {
    width: auto;
    padding: 0 16px 16px;
  }
}

@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}
</style>

