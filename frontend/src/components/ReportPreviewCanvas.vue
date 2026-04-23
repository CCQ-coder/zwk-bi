<template>
  <div class="preview-shell" :class="{ 'preview-shell--immersive': isImmersiveScreen }" v-loading="loading || chartLoading">
    <!-- 筛选条件 — 可折叠，仅在有筛选定义时显示 -->
    <div v-if="showFilterPanelOutside" class="filter-panel" :class="{ 'filter-panel--collapsed': filterCollapsed }">
      <div class="filter-head" @click="filterCollapsed = !filterCollapsed">
        <div class="filter-head-left">
          <span class="filter-toggle-icon">{{ filterCollapsed ? '▶' : '▼' }}</span>
          <span class="filter-title">筛选条件</span>
          <span v-if="activeFilterEntries.length" class="filter-active-badge">{{ activeFilterEntries.length }}</span>
        </div>
        <el-button v-if="!filterCollapsed && activeFilterEntries.length" link type="primary" size="small" @click.stop="clearFilters">清空</el-button>
      </div>
      <div v-show="!filterCollapsed" class="filter-body">
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
    </div>

    <el-empty v-if="!loading && !dashboard" description="未找到对应报告" :image-size="88" />

    <div v-else class="preview-stage-shell" :class="{ 'preview-stage-shell--immersive': isImmersiveScreen }">
      <div class="preview-stage-host" :style="stageHostStyle">
        <div
          ref="canvasRef"
          class="preview-stage"
          :class="[`preview-stage--${scene}`, { 'preview-stage--immersive': isImmersiveScreen }]"
          :style="stageStyle"
        >
      <div v-if="showFilterPanelInside" class="filter-panel filter-panel--floating" :class="{ 'filter-panel--collapsed': filterCollapsed }">
        <div class="filter-head" @click="filterCollapsed = !filterCollapsed">
          <div class="filter-head-left">
            <span class="filter-toggle-icon">{{ filterCollapsed ? '▶' : '▼' }}</span>
            <span class="filter-title">筛选条件</span>
            <span v-if="activeFilterEntries.length" class="filter-active-badge">{{ activeFilterEntries.length }}</span>
          </div>
          <el-button v-if="!filterCollapsed && activeFilterEntries.length" link type="primary" size="small" @click.stop="clearFilters">清空</el-button>
        </div>
        <div v-show="!filterCollapsed" class="filter-body">
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
      </div>

      <!-- 背景板（幕布） -->
      <div v-if="overlayStyle" :style="overlayStyle" />
      <div
        v-for="component in components"
        :key="component.id"
        class="preview-card"
        :style="getCardStyle(component)"
      >
        <div class="preview-card-body">
          <!-- 筛选按钮 -->
          <div v-if="isFilterButtonChart(component)" class="filter-button-preview">
            <el-select
              :model-value="activeFilters[getComponentChartConfig(component).xField] || ''"
              :placeholder="getComponentChartConfig(component).name || '筛选'"
              filterable
              clearable
              size="default"
              style="width:100%"
              @change="updateFilter(getComponentChartConfig(component).xField, $event)"
            >
              <el-option
                v-for="val in getFilterButtonOptions(component)"
                :key="val"
                :label="val"
                :value="val"
              />
            </el-select>
          </div>

          <div v-else-if="isTableChart(component)" class="table-wrapper" :style="getTableWrapperStyle(component)">
            <el-table
              :data="getTableRows(component)"
              :row-class-name="tableRowClassName"
              size="small"
              border
              height="100%"
              empty-text="暂无数据"
            >
              <el-table-column
                v-if="getComponentConfig(component).style.tableShowIndex"
                type="index"
                width="50"
                label="#"
              />
              <el-table-column
                v-for="column in getTableColumns(component)"
                :key="column.id"
                :prop="column.field"
                :label="column.label"
                :width="column.width"
                :align="column.align"
                :header-align="column.align"
                show-overflow-tooltip
                :sortable="getComponentConfig(component).style.tableEnableSort ? 'custom' : false"
              />
            </el-table>
          </div>

          <ComponentStaticPreview
            v-else-if="isStaticWidget(component)"
            :chart-type="getComponentChartConfig(component).chartType"
            :chart-config="getComponentChartConfig(component)"
            :data="componentDataMap.get(component.id) ?? null"
            :dark="scene === 'screen'"
            :show-title="getComponentConfig(component).style.showTitle"
          />

          <div v-else-if="showNoField(component)" class="preview-placeholder warning">
            该组件缺少必要字段，暂时无法生成预览内容。
          </div>

          <ComponentDataFallback
            v-else-if="!isRenderableChart(component)"
            :chart-type="getComponentChartConfig(component).chartType"
            :chart-config="getComponentChartConfig(component)"
            :data="componentDataMap.get(component.id) ?? null"
            :dark="scene === 'screen'"
          />

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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ComponentDataFallback from './ComponentDataFallback.vue'
import ComponentStaticPreview from './ComponentStaticPreview.vue'
import { getChartData, getChartList, type Chart, type ChartDataResult } from '../api/chart'
import { getDashboardById, getDashboardComponents, type Dashboard, type DashboardComponent } from '../api/dashboard'
import {
  getPublicChartList,
  getPublicComponentData,
  getPublicDashboardById,
  getPublicDashboardComponents,
} from '../api/report'
import {
  buildTableWrapperStyleVars,
  buildComponentOption,
  chartTypeLabel,
  getComponentTableRowClassName,
  getConfiguredTableRows,
  getConfiguredTableStepCount,
  getMissingChartFields,
  isCanvasRenderableChartType,
  isStaticWidgetChartType,
  materializeChartData,
  mergeComponentRequestFilters,
  normalizeComponentConfig,
  postProcessChartOption,
  resolveConfiguredTableColumns,
} from '../utils/component-config'
import { echarts, type ECharts } from '../utils/echarts'
import { normalizeCanvasConfig, parseReportConfig, type CanvasOverlay } from '../utils/report-config'

const props = defineProps<{
  dashboardId: number
  scene: 'dashboard' | 'screen'
  accessMode: 'private' | 'public'
  shareToken?: string
}>()

const loading = ref(false)
const chartLoading = ref(false)
const filterCollapsed = ref(props.scene === 'screen')
const dashboard = ref<Dashboard | null>(null)
const components = ref<DashboardComponent[]>([])
const charts = ref<Chart[]>([])
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])))
const componentDataMap = ref(new Map<number, ChartDataResult>())
const tableCarouselSteps = ref(new Map<number, number>())
const activeFilters = reactive<Record<string, string>>({})
const canvasRef = ref<HTMLElement | null>(null)
const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, ECharts>()
const viewportSize = reactive({
  width: typeof window === 'undefined' ? 1920 : window.innerWidth,
  height: typeof window === 'undefined' ? 1080 : window.innerHeight,
})

const MIN_CARD_WIDTH = 320
const MIN_CARD_HEIGHT = 220
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70
const renderedChartCount = computed(() => components.value.filter((item) => isRenderableChart(item)).length)
const isPublicPreview = computed(() => props.accessMode === 'public' && Boolean(props.shareToken))
const isImmersiveScreen = computed(() => props.scene === 'screen')
const getComponentConfig = (component: DashboardComponent) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId))
const getComponentChartConfig = (component: DashboardComponent) => getComponentConfig(component).chart
const getComponentInteractionConfig = (component: DashboardComponent) => getComponentConfig(component).interaction
const canvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(dashboard.value?.configJson).canvas, props.scene))

const overlayConfig = computed<CanvasOverlay | null>(() => {
  const overlay = canvasConfig.value.overlay
  if (!overlay || !overlay.show) return null
  return overlay
})

const overlayStyle = computed(() => {
  const ov = overlayConfig.value
  if (!ov) return null
  let background: string
  if (ov.bgType === 'gradient') {
    background = `linear-gradient(${ov.gradientAngle ?? 135}deg, ${ov.gradientStart ?? '#0d1b2a'}, ${ov.gradientEnd ?? '#1b3a5c'})`
  } else if (ov.bgType === 'image' && ov.bgImage) {
    background = `url(${ov.bgImage}) center/cover no-repeat, ${ov.bgColor}`
  } else {
    background = ov.bgColor
  }
  return {
    position: 'absolute' as const,
    left: `${isImmersiveScreen.value ? 0 : ov.x}px`,
    top: `${isImmersiveScreen.value ? 0 : ov.y}px`,
    width: `${ov.w}px`,
    height: `${ov.h}px`,
    background,
    opacity: String(ov.opacity),
    zIndex: '0',
    pointerEvents: 'none' as const,
    overflow: 'hidden' as const,
  }
})
const activeFilterEntries = computed(() => Object.entries(activeFilters)
  .filter(([, value]) => Boolean(value))
  .map(([field, value]) => ({ field, value })))

const hasFilterButtons = computed(() => components.value.some((c) => getComponentChartConfig(c).chartType === 'filter_button'))

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

const previewViewport = computed(() => {
  if (isImmersiveScreen.value) {
    const overlay = overlayConfig.value
    if (overlay) {
      return {
        left: overlay.x,
        top: overlay.y,
        width: overlay.w,
        height: overlay.h,
      }
    }

    return {
      left: 0,
      top: 0,
      width: canvasConfig.value.width,
      height: canvasConfig.value.height,
    }
  }

  return {
    left: 0,
    top: 0,
    width: canvasConfig.value.width,
    height: canvasMinHeight.value,
  }
})

const previewScale = computed(() => {
  if (!isImmersiveScreen.value) return 1
  const scaleX = viewportSize.width / Math.max(previewViewport.value.width, 1)
  const scaleY = viewportSize.height / Math.max(previewViewport.value.height, 1)
  const resolved = Math.min(scaleX, scaleY)
  return Number.isFinite(resolved) && resolved > 0 ? resolved : 1
})

const stageHostStyle = computed(() => {
  if (!isImmersiveScreen.value) return undefined
  return {
    width: `${Math.round(previewViewport.value.width * previewScale.value)}px`,
    height: `${Math.round(previewViewport.value.height * previewScale.value)}px`,
  }
})

const stageStyle = computed(() => {
  if (isImmersiveScreen.value) {
    return {
      width: `${previewViewport.value.width}px`,
      minHeight: `${previewViewport.value.height}px`,
      height: `${previewViewport.value.height}px`,
      transform: `scale(${previewScale.value})`,
      transformOrigin: 'top left',
    }
  }

  if (props.scene === 'screen') {
    return {
      width: `${canvasConfig.value.width}px`,
      minHeight: `${canvasMinHeight.value}px`,
      height: `${canvasMinHeight.value}px`,
    }
  }

  return {
    minHeight: `${canvasMinHeight.value}px`,
  }
})

const showFilterPanelOutside = computed(() => !isImmersiveScreen.value && filterDefinitions.value.length && !hasFilterButtons.value)
const showFilterPanelInside = computed(() => isImmersiveScreen.value && filterDefinitions.value.length && !hasFilterButtons.value)

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

const getCardStyle = (component: DashboardComponent) => {
  const style = getComponentConfig(component).style
  const shadow = style.shadowShow
    ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
    : undefined
  const offsetLeft = isImmersiveScreen.value ? previewViewport.value.left : 0
  const offsetTop = isImmersiveScreen.value ? previewViewport.value.top : 0
  return {
    left: `${component.posX - offsetLeft}px`,
    top: `${component.posY - offsetTop}px`,
    width: `${component.width}px`,
    height: `${component.height}px`,
    opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
    boxShadow: shadow,
    padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
  }
}

const setChartRef = (el: HTMLElement | null, componentId: number) => {
  if (el) chartRefs.set(componentId, el)
  else chartRefs.delete(componentId)
}

const isTableChart = (component: DashboardComponent) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType)

const isFilterButtonChart = (component: DashboardComponent) => getComponentChartConfig(component).chartType === 'filter_button'

const getFilterButtonOptions = (component: DashboardComponent): string[] => {
  const field = getComponentChartConfig(component).xField
  if (!field) return []
  const data = componentDataMap.value.get(component.id)
  if (!data) return []
  const values = new Set<string>()
  ;(data.rawRows ?? []).forEach((row) => {
    if (row[field] != null) values.add(String(row[field]))
  })
  data.labels.forEach((label) => values.add(String(label)))
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const isStaticWidget = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isStaticWidgetChartType(type)
}

const componentRequiresPreviewData = (component: DashboardComponent) => {
  const chart = getComponentChartConfig(component)
  const chartType = chart.chartType ?? ''
  if (showNoField(component)) return false
  if (isStaticWidgetChartType(chartType)) {
    return Boolean(
      chart.datasetId
      || chart.datasourceId
      || chart.sqlText?.trim()
      || chart.runtimeConfigText?.trim()
      || chart.xField
      || chart.yField
      || chart.groupField
    )
  }
  return true
}

const showNoField = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  if (isStaticWidgetChartType(type)) return false
  return getMissingChartFields(getComponentChartConfig(component)).length > 0
}

const isRenderableChart = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isCanvasRenderableChartType(type)
}

const componentRefreshTimers = new Map<number, number>()
const componentRefreshRuntimeSignatures = new Map<number, string>()
let componentRefreshSyncFrame: number | null = null

const stopComponentRefresh = (componentId: number) => {
  const timerId = componentRefreshTimers.get(componentId)
  if (timerId == null) return
  window.clearInterval(timerId)
  componentRefreshTimers.delete(componentId)
}

const stopAllComponentRefreshes = () => {
  Array.from(componentRefreshTimers.keys()).forEach((componentId) => stopComponentRefresh(componentId))
  componentRefreshRuntimeSignatures.clear()
}

const syncComponentRefreshTimers = () => {
  componentRefreshSyncFrame = null
  const activeComponentIds = new Set<number>()

  components.value.forEach((component) => {
    if (!componentRequiresPreviewData(component)) return
    const refreshInterval = Math.max(0, Number(getComponentChartConfig(component).dataRefreshInterval) || 0)
    if (refreshInterval <= 0) return
    activeComponentIds.add(component.id)
    const runtimeSignature = `${refreshInterval}:${component.chartId}:${component.configJson ?? ''}`
    if (componentRefreshRuntimeSignatures.get(component.id) === runtimeSignature && componentRefreshTimers.has(component.id)) {
      return
    }
    componentRefreshRuntimeSignatures.set(component.id, runtimeSignature)
    stopComponentRefresh(component.id)
    componentRefreshTimers.set(component.id, window.setInterval(() => {
      const current = components.value.find((item) => item.id === component.id)
      if (!current || !componentRequiresPreviewData(current)) return
      void reloadSingleComponentData(current)
    }, refreshInterval * 1000))
  })

  Array.from(componentRefreshTimers.keys()).forEach((componentId) => {
    if (!activeComponentIds.has(componentId)) stopComponentRefresh(componentId)
  })
  Array.from(componentRefreshRuntimeSignatures.keys()).forEach((componentId) => {
    if (!activeComponentIds.has(componentId)) componentRefreshRuntimeSignatures.delete(componentId)
  })
}

const scheduleComponentRefreshSync = () => {
  if (componentRefreshSyncFrame !== null) return
  componentRefreshSyncFrame = window.requestAnimationFrame(syncComponentRefreshTimers)
}

const tableCarouselTimers = new Map<number, number>()
const tableCarouselRuntimeSignatures = new Map<number, string>()
let tableCarouselSyncFrame: number | null = null

const scheduleTableCarouselSync = () => {
  if (tableCarouselSyncFrame !== null) return
  tableCarouselSyncFrame = window.requestAnimationFrame(() => {
    tableCarouselSyncFrame = null
    syncTableCarousels()
  })
}

const setTableCarouselStep = (componentId: number, step: number) => {
  tableCarouselSteps.value.set(componentId, step)
  tableCarouselSteps.value = new Map(tableCarouselSteps.value)
}

const clearTableCarouselStep = (componentId: number) => {
  if (!tableCarouselSteps.value.delete(componentId)) return
  tableCarouselSteps.value = new Map(tableCarouselSteps.value)
}

const stopTableCarousel = (componentId: number) => {
  const timerId = tableCarouselTimers.get(componentId)
  if (timerId == null) return
  window.clearInterval(timerId)
  tableCarouselTimers.delete(componentId)
}

const stopAllTableCarousels = () => {
  Array.from(tableCarouselTimers.keys()).forEach((componentId) => stopTableCarousel(componentId))
  tableCarouselRuntimeSignatures.clear()
  tableCarouselSteps.value = new Map()
}

const syncTableCarousels = () => {
  const activeTableIds = new Set<number>()
  components.value.forEach((component) => {
    if (!isTableChart(component)) return
    activeTableIds.add(component.id)
    const chartConfig = getComponentConfig(component).chart
    const rawRows = componentDataMap.value.get(component.id)?.rawRows ?? []
    const stepCount = getConfiguredTableStepCount(chartConfig, rawRows)
    const runtimeSignature = [
      chartConfig.tableLoadLimit,
      chartConfig.tableVisibleRows,
      chartConfig.tableCarouselMode,
      chartConfig.tableCarouselInterval,
      rawRows.length,
    ].join(':')
    const previousSignature = tableCarouselRuntimeSignatures.get(component.id)

    if (previousSignature === runtimeSignature && (stepCount <= 1 || tableCarouselTimers.has(component.id))) {
      if (stepCount <= 1 && (tableCarouselSteps.value.get(component.id) ?? 0) !== 0) {
        setTableCarouselStep(component.id, 0)
      }
      return
    }

    tableCarouselRuntimeSignatures.set(component.id, runtimeSignature)
    stopTableCarousel(component.id)
    if (stepCount <= 1) {
      setTableCarouselStep(component.id, 0)
      return
    }
    const currentStep = tableCarouselSteps.value.get(component.id) ?? 0
    setTableCarouselStep(component.id, currentStep >= stepCount ? 0 : currentStep)
    tableCarouselTimers.set(component.id, window.setInterval(() => {
      const nextStep = ((tableCarouselSteps.value.get(component.id) ?? 0) + 1) % stepCount
      setTableCarouselStep(component.id, nextStep)
    }, Math.max(1000, chartConfig.tableCarouselInterval || 20000)))
  })

  Array.from(tableCarouselTimers.keys()).forEach((componentId) => {
    if (!activeTableIds.has(componentId)) stopTableCarousel(componentId)
  })
  Array.from(tableCarouselRuntimeSignatures.keys()).forEach((componentId) => {
    if (!activeTableIds.has(componentId)) tableCarouselRuntimeSignatures.delete(componentId)
  })
  Array.from(tableCarouselSteps.value.keys()).forEach((componentId) => {
    if (!activeTableIds.has(componentId)) clearTableCarouselStep(componentId)
  })
}

const tableCarouselComponentSignature = computed(() => components.value
  .filter((component) => isTableChart(component))
  .map((component) => `${component.id}:${component.chartId}:${component.configJson ?? ''}`)
  .join('|'))

const componentRefreshSignature = computed(() => components.value
  .map((component) => `${component.id}:${component.chartId}:${component.configJson ?? ''}`)
  .join('|'))

watch(tableCarouselComponentSignature, () => {
  scheduleTableCarouselSync()
}, { immediate: true })

watch(componentRefreshSignature, () => {
  scheduleComponentRefreshSync()
}, { immediate: true })

const EMPTY_TABLE_COLUMNS: string[] = []
const EMPTY_TABLE_ROWS: Record<string, unknown>[] = []
type TableRenderStyle = Record<string, string>
const tableRowClassName = getComponentTableRowClassName

const tableColumnsCache = new Map<number, {
  chartConfig: ReturnType<typeof normalizeComponentConfig>['chart']
  availableColumns: string[]
  value: ReturnType<typeof resolveConfiguredTableColumns>
}>()

const tableRowsCache = new Map<number, {
  chartConfig: ReturnType<typeof normalizeComponentConfig>['chart']
  rawRows: Record<string, unknown>[]
  step: number
  value: Record<string, unknown>[]
}>()

const tableWrapperStyleCache = new Map<number, {
  styleConfig: ReturnType<typeof normalizeComponentConfig>['style']
  scene: 'dashboard' | 'screen'
  value: TableRenderStyle
}>()

const clearTableRenderCache = () => {
  tableColumnsCache.clear()
  tableRowsCache.clear()
  tableWrapperStyleCache.clear()
}

const getTableColumns = (component: DashboardComponent) => {
  const resolved = getComponentConfig(component)
  const availableColumns = componentDataMap.value.get(component.id)?.columns ?? EMPTY_TABLE_COLUMNS
  const cached = tableColumnsCache.get(component.id)
  if (cached && cached.chartConfig === resolved.chart && cached.availableColumns === availableColumns) {
    return cached.value
  }
  const value = resolveConfiguredTableColumns(resolved.chart, availableColumns)
  tableColumnsCache.set(component.id, {
    chartConfig: resolved.chart,
    availableColumns,
    value,
  })
  return value
}

const getTableRows = (component: DashboardComponent) => {
  const resolved = getComponentConfig(component)
  const rawRows = componentDataMap.value.get(component.id)?.rawRows ?? EMPTY_TABLE_ROWS
  const step = tableCarouselSteps.value.get(component.id) ?? 0
  const cached = tableRowsCache.get(component.id)
  if (cached && cached.chartConfig === resolved.chart && cached.rawRows === rawRows && cached.step === step) {
    return cached.value
  }
  const value = getConfiguredTableRows(resolved.chart, rawRows, step)
  tableRowsCache.set(component.id, {
    chartConfig: resolved.chart,
    rawRows,
    step,
    value,
  })
  return value
}

const getTableWrapperStyle = (component: DashboardComponent) => {
  const styleConfig = getComponentConfig(component).style
  const cached = tableWrapperStyleCache.get(component.id)
  if (cached && cached.styleConfig === styleConfig && cached.scene === props.scene) {
    return cached.value
  }
  const value = buildTableWrapperStyleVars(styleConfig, props.scene)
  tableWrapperStyleCache.set(component.id, {
    styleConfig,
    scene: props.scene,
    value,
  })
  return value
}

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
  const option = buildComponentOption(data, resolved.chart, resolved.style)
  postProcessChartOption(option, resolved.style, resolved.chart.name)
  instance.setOption(option, true)
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

const disposeChartInstance = (componentId: number) => {
  chartInstances.get(componentId)?.dispose()
  chartInstances.delete(componentId)
  chartRefs.delete(componentId)
}

const reloadSingleComponentData = async (component: DashboardComponent, targetMap?: Map<number, ChartDataResult>) => {
  const chart = getComponentChartConfig(component)
  const interaction = getComponentInteractionConfig(component)
  const nextMap = targetMap ?? new Map(componentDataMap.value)
  if (showNoField(component)) {
    nextMap.delete(component.id)
    disposeChartInstance(component.id)
    if (!targetMap) componentDataMap.value = nextMap
    return
  }
  try {
    const data = isPublicPreview.value
      ? await getPublicComponentData(props.dashboardId, component.id, props.shareToken || '', mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }))
      : await getChartData(component.chartId, {
        filters: mergeComponentRequestFilters(interaction.dataFilters, { ...activeFilters }),
        configJson: component.configJson,
      })
    const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart)
    nextMap.set(component.id, materialized)
    if (isRenderableChart(component)) renderChart(component, materialized)
    else disposeChartInstance(component.id)
    if (!targetMap) {
      componentDataMap.value = nextMap
      scheduleTableCarouselSync()
      scheduleComponentRefreshSync()
    }
  } catch {
    if (!targetMap) {
      scheduleComponentRefreshSync()
    }
  }
}

const reloadComponentData = async () => {
  chartLoading.value = true
  clearTableRenderCache()
  componentDataMap.value = new Map()
  stopAllComponentRefreshes()
  scheduleTableCarouselSync()
  try {
    await nextTick()
    const nextDataMap = new Map<number, ChartDataResult>()
    await Promise.all(components.value.map(async (component) => {
      await reloadSingleComponentData(component, nextDataMap)
    }))
    componentDataMap.value = nextDataMap
    scheduleTableCarouselSync()
    scheduleComponentRefreshSync()
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
  stopAllComponentRefreshes()
  disposeCharts()
  clearTableRenderCache()
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
  viewportSize.width = window.innerWidth
  viewportSize.height = window.innerHeight
  chartInstances.forEach((instance) => instance.resize())
}

watch(() => [props.dashboardId, props.accessMode, props.shareToken], loadAll)

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  stopAllComponentRefreshes()
  if (tableCarouselSyncFrame !== null) {
    window.cancelAnimationFrame(tableCarouselSyncFrame)
    tableCarouselSyncFrame = null
  }
  if (componentRefreshSyncFrame !== null) {
    window.cancelAnimationFrame(componentRefreshSyncFrame)
    componentRefreshSyncFrame = null
  }
  stopAllTableCarousels()
  disposeCharts()
})
</script>

<style scoped>
.preview-shell {
  min-height: 100%;
}

.preview-shell--immersive {
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  background: #050b14;
}

/* ─── 筛选条件栏 ─────────────────────────── */
.filter-panel {
  margin-bottom: 12px;
  border-radius: 14px;
  border: 1px solid #dce8f5;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 14px rgba(21, 61, 112, 0.06);
  overflow: hidden;
  transition: all 0.2s ease;
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}

.filter-panel:not(.filter-panel--collapsed) .filter-head {
  border-bottom-color: #dce8f5;
}

.filter-head:hover {
  background: rgba(68, 141, 217, 0.05);
}

.filter-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-toggle-icon {
  font-size: 10px;
  color: #6e8098;
  width: 14px;
  text-align: center;
}

.filter-title {
  font-size: 13px;
  font-weight: 600;
  color: #183153;
}

.filter-active-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #2a6fba;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.filter-body {
  padding: 12px 14px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.filter-item-label {
  margin-bottom: 5px;
  font-size: 12px;
  color: #50637b;
}

.filter-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
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

.preview-stage-shell--immersive {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 20%, rgba(52, 126, 215, 0.14), transparent 28%),
    radial-gradient(circle at 80% 10%, rgba(83, 196, 145, 0.12), transparent 24%),
    #050b14;
}

.preview-stage-host {
  position: relative;
  flex: 0 0 auto;
}

.preview-stage--dashboard {
  background: linear-gradient(180deg, #f7fafe 0%, #eff4fb 100%);
}

.preview-stage--screen {
  background-color: #081b32;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(20, 116, 214, 0.18), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(66, 185, 131, 0.14), transparent 24%);
}

.preview-stage--immersive {
  border: none;
  border-radius: 0;
  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.42);
}

.preview-stage--screen.preview-stage--immersive {
  background: transparent;
}

.preview-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border-radius: 0;
}

.preview-stage--dashboard .preview-card {
  background: transparent;
  border: none;
  box-shadow: none;
}

.preview-stage--screen .preview-card {
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.preview-card-body,
.chart-canvas,
.table-wrapper {
  height: 100%;
  min-height: 0;
}

.table-wrapper {
  --component-table-header-bg: rgba(16, 41, 68, 0.94);
  --component-table-header-color: #d8e8fb;
  --component-table-header-font-size: 13px;
  --component-table-row-height: 36px;
  --component-table-odd-row-bg: rgba(7, 22, 38, 0.72);
  --component-table-even-row-bg: rgba(7, 22, 38, 0.72);
  --component-table-row-hover-bg: rgba(64, 158, 255, 0.15);
  --component-table-border-color: rgba(104, 148, 194, 0.22);
  --component-table-border-width: 1px;
  --component-table-font-color: #e6eef8;
  --component-table-font-size: 12px;
}

.table-wrapper :deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--component-table-header-bg);
  --el-table-border-color: var(--component-table-border-color);
  --el-table-text-color: var(--component-table-font-color);
  --el-table-header-text-color: var(--component-table-header-color);
  --el-table-row-hover-bg-color: var(--component-table-row-hover-bg);
}

.table-wrapper :deep(.el-table th.el-table__cell) {
  background: var(--component-table-header-bg);
  color: var(--component-table-header-color);
  font-size: var(--component-table-header-font-size);
  border-bottom: var(--component-table-border-width) solid var(--component-table-border-color);
}

.table-wrapper :deep(.el-table td.el-table__cell) {
  color: var(--component-table-font-color);
  font-size: var(--component-table-font-size);
  height: var(--component-table-row-height);
  border-bottom: var(--component-table-border-width) solid var(--component-table-border-color);
  background: transparent;
  transition: background-color 0.18s ease;
}

.table-wrapper :deep(.el-table .cell) {
  line-height: calc(var(--component-table-row-height) - 2px);
}

.table-wrapper :deep(.el-table__row.component-table-row--odd > td.el-table__cell) {
  background: var(--component-table-odd-row-bg);
}

.table-wrapper :deep(.el-table__row.component-table-row--even > td.el-table__cell) {
  background: var(--component-table-even-row-bg);
}

.table-wrapper :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: var(--component-table-row-hover-bg) !important;
}

.table-wrapper :deep(.el-table--border::before),
.table-wrapper :deep(.el-table__inner-wrapper::before) {
  background-color: var(--component-table-border-color);
  height: var(--component-table-border-width);
}

.table-wrapper :deep(.el-table--border .el-table__cell) {
  border-right: var(--component-table-border-width) solid var(--component-table-border-color);
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

.filter-button-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  height: 100%;
}

.filter-panel--floating {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 12;
  width: min(360px, calc(100% - 40px));
  margin-bottom: 0;
  border-color: rgba(124, 170, 219, 0.24);
  background: rgba(7, 22, 38, 0.82);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
}

.filter-panel--floating .filter-head:hover {
  background: rgba(96, 174, 255, 0.08);
}

.filter-panel--floating .filter-title,
.filter-panel--floating .filter-item-label,
.filter-panel--floating .filter-toggle-icon {
  color: rgba(236, 245, 255, 0.82);
}

.filter-panel--floating :deep(.el-select__wrapper) {
  background: rgba(9, 28, 48, 0.72);
  box-shadow: 0 0 0 1px rgba(116, 166, 226, 0.16) inset;
}

.filter-panel--floating :deep(.el-select__placeholder),
.filter-panel--floating :deep(.el-select__selected-item) {
  color: #eef5ff;
}

.filter-panel--floating :deep(.el-tag) {
  border-color: rgba(116, 166, 226, 0.22);
  background: rgba(9, 28, 48, 0.72);
  color: #eef5ff;
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