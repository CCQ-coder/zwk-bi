<template>
  <div class="workbench-page" v-loading="loading">
    <TopNavBar active="workbench" />

    <main class="workbench-main">
      <section class="overview-shell">
        <div class="overview-card overview-card--dashboard">
          <div class="overview-side__head overview-side__head--dashboard">
            <div>
              <span class="overview-side__label">系统仪表盘</span>
              <div class="overview-side__title">最近 {{ RECENT_ADDED_WINDOW_DAYS }} 天新增概览</div>
              <div class="overview-side__caption">顶部改成紧凑仪表盘，同时展示最近新增资源和用户登录分析</div>
            </div>
            <span class="overview-side__badge">最近新增</span>
          </div>

          <div class="overview-dashboard overview-dashboard--single">
            <div class="overview-dashboard__summary-card">
              <div class="overview-dashboard__summary-kicker">新增总量</div>
              <div class="overview-dashboard__summary-visual">
                <div class="overview-dashboard__ring-wrap">
                  <svg class="overview-dashboard__ring-chart" viewBox="0 0 128 128" aria-hidden="true">
                    <circle class="overview-dashboard__ring-track" cx="64" cy="64" r="42" />
                    <circle
                      v-for="segment in recentAddedRingSegments"
                      :key="segment.key"
                      class="overview-dashboard__ring-segment"
                      cx="64"
                      cy="64"
                      r="42"
                      :stroke="segment.color"
                      :stroke-dasharray="segment.dasharray"
                      :stroke-dashoffset="segment.dashoffset"
                    />
                  </svg>
                  <div class="overview-dashboard__ring-copy">
                    <strong>{{ recentAddedTotal }}</strong>
                    <span>最近 {{ RECENT_ADDED_WINDOW_DAYS }} 天</span>
                  </div>
                </div>

                <div class="overview-dashboard__summary-copy">
                  <div class="overview-dashboard__summary-value">{{ recentAddedTotal }}</div>
                  <div class="overview-dashboard__summary-meta">最近 {{ RECENT_ADDED_WINDOW_DAYS }} 天共新增 {{ recentAddedTotal }} 个资源</div>
                  <div class="overview-dashboard__summary-legend">
                    <span v-for="item in recentAddedBars" :key="`ring-${item.key}`" class="overview-dashboard__summary-legend-item">
                      <i class="overview-dashboard__summary-legend-dot" :style="{ background: item.color }"></i>
                      <span>{{ item.label }}</span>
                      <strong>+{{ item.value }}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div class="overview-dashboard__status-panel">
                <div class="overview-dashboard__status-head">
                  <span>大屏发布状态</span>
                  <strong>{{ publishProgress }}%</strong>
                </div>
                <div class="overview-dashboard__status-value">{{ publishedReportCount }} / {{ screens.length }}</div>
                <div class="overview-dashboard__status-note">当前已发布 {{ publishedReportCount }} 个数据大屏</div>
                <div class="overview-dashboard__status-track">
                  <span class="overview-dashboard__status-fill" :style="{ width: `${publishProgress}%` }"></span>
                </div>
              </div>

              <div class="overview-dashboard__summary-grid">
                <div class="overview-dashboard__mini-fact">
                  <span>可见资源分类</span>
                  <strong>{{ resourceCategories.length }}</strong>
                </div>
                <div class="overview-dashboard__mini-fact">
                  <span>最近新增大屏</span>
                  <strong>{{ recentAddedScreenCount }}</strong>
                </div>
                <div class="overview-dashboard__mini-fact">
                  <span>活跃登录用户</span>
                  <strong>{{ recentLoginActiveUserCount }}</strong>
                </div>
                <div class="overview-dashboard__mini-fact">
                  <span>登录失败次数</span>
                  <strong>{{ recentLoginFailCount }}</strong>
                </div>
              </div>
            </div>

            <div class="overview-dashboard__chart-card overview-dashboard__chart-card--recent">
              <div class="overview-dashboard__chart-head">
                <div>
                  <div class="overview-dashboard__chart-title">最近新增个数</div>
                  <div class="overview-dashboard__chart-subtitle">按资源分类统计最近新增数量</div>
                </div>
                <div class="overview-dashboard__chart-unit">单位：个</div>
              </div>

              <div class="overview-dashboard__columns">
                <div v-for="item in recentAddedBars" :key="item.key" class="overview-dashboard__column-item">
                  <div class="overview-dashboard__column-value">+{{ item.value }}</div>
                  <div class="overview-dashboard__column-track">
                    <span class="overview-dashboard__column-bar" :style="{ height: `${item.percent}%`, background: item.accent }"></span>
                  </div>
                  <div class="overview-dashboard__column-label">{{ item.label }}</div>
                  <div class="overview-dashboard__column-note">最近 {{ RECENT_ADDED_WINDOW_DAYS }} 天</div>
                </div>
              </div>
            </div>

            <div class="overview-dashboard__chart-card overview-dashboard__chart-card--login">
              <div class="overview-dashboard__chart-head">
                <div>
                  <div class="overview-dashboard__chart-title">用户登录分析</div>
                  <div class="overview-dashboard__chart-subtitle">
                    {{ canLoadLoginLogs ? `最近 ${RECENT_ADDED_WINDOW_DAYS} 天登录成功 / 失败趋势` : '当前账号无登录日志查看权限' }}
                  </div>
                </div>
                <div class="overview-dashboard__chart-unit">单位：次</div>
              </div>

              <template v-if="canLoadLoginLogs">
                <div class="overview-dashboard__login-summary">
                  <div class="overview-dashboard__login-fact">
                    <span>登录成功</span>
                    <strong>{{ recentLoginSuccessCount }}</strong>
                  </div>
                  <div class="overview-dashboard__login-fact">
                    <span>登录失败</span>
                    <strong>{{ recentLoginFailCount }}</strong>
                  </div>
                  <div class="overview-dashboard__login-fact">
                    <span>活跃用户</span>
                    <strong>{{ recentLoginActiveUserCount }}</strong>
                  </div>
                </div>

                <div class="overview-dashboard__legend">
                  <span class="overview-dashboard__legend-item"><i class="overview-dashboard__legend-dot overview-dashboard__legend-dot--success"></i>登录成功</span>
                  <span class="overview-dashboard__legend-item"><i class="overview-dashboard__legend-dot overview-dashboard__legend-dot--fail"></i>登录失败</span>
                </div>

                <div v-if="hasRecentLoginData" class="overview-dashboard__line-panel">
                  <svg class="overview-dashboard__line-chart" viewBox="0 0 320 160" preserveAspectRatio="none" aria-hidden="true">
                    <line
                      v-for="guide in loginGuideLines"
                      :key="guide.key"
                      class="overview-dashboard__line-guide"
                      x1="18"
                      x2="302"
                      :y1="guide.y"
                      :y2="guide.y"
                    />
                    <polyline class="overview-dashboard__line overview-dashboard__line--success" :points="loginSuccessLinePoints" />
                    <polyline class="overview-dashboard__line overview-dashboard__line--fail" :points="loginFailLinePoints" />
                    <g v-for="point in loginChartPoints" :key="point.key">
                      <circle class="overview-dashboard__point overview-dashboard__point--success" :cx="point.x" :cy="point.successY" r="4" />
                      <circle class="overview-dashboard__point overview-dashboard__point--fail" :cx="point.x" :cy="point.failY" r="4" />
                    </g>
                  </svg>

                  <div class="overview-dashboard__line-labels">
                    <span v-for="item in recentLoginTrend" :key="`label-${item.key}`">{{ item.label }}</span>
                  </div>
                </div>

                <div v-else class="overview-dashboard__login-empty overview-dashboard__login-empty--inline">
                  最近 {{ RECENT_ADDED_WINDOW_DAYS }} 天暂无登录日志。
                </div>
              </template>

              <div v-else class="overview-dashboard__login-empty">
                登录日志仅管理员可见，当前仪表盘不加载用户登录分析数据。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="content-grid">
        <el-card class="surface-card recent-card" shadow="never">
          <template #header>
            <div class="section-head">
              <div>
                <div class="section-title">最近编辑的大屏</div>
                <div class="section-subtitle">按最近更新时间分页展示，直接进入大屏编辑页</div>
              </div>
              <el-button link @click="goTo('/home/screen')">查看全部</el-button>
            </div>
          </template>

          <div v-if="pagedRecentScreens.length" class="recent-screen-list">
            <button
              v-for="screen in pagedRecentScreens"
              :key="screen.id"
              class="recent-screen-item"
              @click="openScreen(screen.id)"
            >
              <div class="recent-screen-item__cover">
                <img v-if="getCoverUrl(screen)" :src="getCoverUrl(screen)" alt="大屏封面" />
                <div v-else class="recent-screen-item__cover-fallback">未生成封面</div>
              </div>

              <div class="recent-screen-item__body">
                <div class="recent-screen-item__head">
                  <strong class="recent-screen-item__name">{{ screen.name }}</strong>
                  <el-tag size="small" :type="getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'">
                    {{ getPublishStatus(screen) === 'PUBLISHED' ? '已发布' : '草稿' }}
                  </el-tag>
                </div>
                <div class="recent-screen-item__meta">
                  {{ getComponentCount(screen.id) }} 个组件 · {{ getCanvasLabel(screen) }}
                </div>
                <div class="recent-screen-item__time">最近更新 {{ formatDate(screen.createdAt) }}</div>
              </div>
            </button>
          </div>
          <el-empty v-else description="还没有数据大屏，先创建一个新的大屏" />

          <div v-if="screens.length > RECENT_SCREEN_PAGE_SIZE" class="section-pagination">
            <el-pagination
              v-model:current-page="recentScreenPage"
              layout="prev, pager, next"
              :page-size="RECENT_SCREEN_PAGE_SIZE"
              :total="screens.length"
              background
            />
          </div>
        </el-card>

        <el-card class="surface-card resource-card" shadow="never">
          <template #header>
            <div class="section-head">
              <div>
                <div class="section-title">系统资源</div>
                <div class="section-subtitle">按分类分页查看数据源、数据集、图表组件和大屏资产</div>
              </div>
              <el-button v-if="activeResourceMeta" link @click="goTo(activeResourceMeta.path)">进入分类</el-button>
            </div>
          </template>

          <div v-if="resourceCategories.length" class="resource-toolbar">
            <button
              v-for="category in resourceCategories"
              :key="category.key"
              class="resource-tab"
              :class="{ 'resource-tab--active': activeResourceCategory === category.key }"
              type="button"
              @click="activeResourceCategory = category.key"
            >
              <span>{{ category.label }}</span>
              <span class="resource-tab__count">{{ category.count }}</span>
            </button>
          </div>

          <div v-if="activeResourceLoading && !pagedResourceItems.length" class="resource-loading">
            正在按需加载当前分类资源...
          </div>
          <div v-else-if="pagedResourceItems.length" class="resource-list">
            <button
              v-for="item in pagedResourceItems"
              :key="item.id"
              class="resource-item"
              @click="goTo(item.path)"
            >
              <div class="resource-item__main">
                <span class="resource-item__type">{{ item.typeLabel }}</span>
                <div class="resource-item__name">{{ item.name }}</div>
                <div class="resource-item__secondary">{{ item.secondary }}</div>
              </div>

              <div class="resource-item__meta">
                <el-tag size="small" :type="item.statusType">{{ item.statusLabel }}</el-tag>
                <span class="resource-item__time">{{ formatDate(item.createdAt) }}</span>
              </div>
            </button>
          </div>
          <el-empty v-else description="当前分类下还没有可展示的资源" />

          <div v-if="filteredResourceItems.length > RESOURCE_PAGE_SIZE" class="section-pagination">
            <el-pagination
              v-model:current-page="resourcePage"
              layout="prev, pager, next"
              :page-size="RESOURCE_PAGE_SIZE"
              :total="filteredResourceItems.length"
              background
            />
          </div>
        </el-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getChartList, type Chart } from '../api/chart'
import { getDatasetList, type Dataset } from '../api/dataset'
import { getDatasourceList, type Datasource, type DatasourceSourceKind } from '../api/datasource'
import {
  getWorkbenchOverview,
  type WorkbenchLoginOverview,
  type WorkbenchLoginTrendItem,
  type WorkbenchOverview,
  type WorkbenchScreenSummary,
  type WorkbenchSummary,
} from '../api/workbench'
import TopNavBar from '../components/TopNavBar.vue'
import { flattenAuthMenus, getAuthMenus } from '../utils/auth-session'

type AssetStatusType = 'success' | 'info' | 'warning'
type ResourceCategoryKey = 'datasource' | 'dataset' | 'chart' | 'screen'

interface WorkspaceAsset {
  id: string
  name: string
  typeLabel: string
  secondary: string
  createdAt: string
  statusLabel: string
  statusType: AssetStatusType
  path: string
  category: ResourceCategoryKey
}

interface ResourceCategory {
  key: ResourceCategoryKey
  label: string
  count: number
  path: string
}

interface DashboardBarItem {
  key: ResourceCategoryKey
  label: string
  value: number
  percent: number
  accent: string
  color: string
}

interface DashboardRingSegment {
  key: string
  color: string
  dasharray: string
  dashoffset: string
}

interface LoginTrendItem {
  key: string
  label: string
  success: number
  fail: number
  total: number
}

interface LoginChartPoint {
  key: string
  x: number
  successY: number
  failY: number
}

const SOURCE_KIND_LABELS: Record<DatasourceSourceKind, string> = {
  DATABASE: '数据库',
  API: 'API 接口',
  TABLE: '表格文件',
  JSON_STATIC: '静态 JSON',
}

const RECENT_ADDED_WINDOW_DAYS = 7
const RECENT_SCREEN_PAGE_SIZE = 4
const RESOURCE_PAGE_SIZE = 6
const DASHBOARD_RING_CIRCUMFERENCE = 2 * Math.PI * 42
const LOGIN_CHART_WIDTH = 320
const LOGIN_CHART_HEIGHT = 160
const LOGIN_CHART_PADDING_X = 18
const LOGIN_CHART_PADDING_TOP = 14
const LOGIN_CHART_PADDING_BOTTOM = 24

const EMPTY_SUMMARY: WorkbenchSummary = {
  datasourceCount: 0,
  datasetCount: 0,
  chartCount: 0,
  screenCount: 0,
  publishedScreenCount: 0,
  recentAddedDatasourceCount: 0,
  recentAddedDatasetCount: 0,
  recentAddedChartCount: 0,
  recentAddedScreenCount: 0,
  recentAddedTotal: 0,
}

const EMPTY_LOGIN: WorkbenchLoginOverview = {
  enabled: false,
  successCount: 0,
  failCount: 0,
  activeUserCount: 0,
  trend: [],
}

const loading = ref(false)
const router = useRouter()
const overview = ref<WorkbenchOverview | null>(null)
const recentScreenPage = ref(1)
const resourcePage = ref(1)
const activeResourceCategory = ref<ResourceCategoryKey>('datasource')
const resourceItemsByCategory = reactive<Record<ResourceCategoryKey, WorkspaceAsset[]>>({
  datasource: [],
  dataset: [],
  chart: [],
  screen: [],
})
const loadedCategories = reactive<Record<ResourceCategoryKey, boolean>>({
  datasource: false,
  dataset: false,
  chart: false,
  screen: false,
})
const loadingCategories = reactive<Record<ResourceCategoryKey, boolean>>({
  datasource: false,
  dataset: false,
  chart: false,
  screen: false,
})

const allowedPaths = computed(() => new Set(
  flattenAuthMenus(getAuthMenus()).map((item) => item.path).filter(Boolean)
))

const canAccess = (path: string) => !allowedPaths.value.size
  || allowedPaths.value.has(path)
  || Array.from(allowedPaths.value).some((item) => path.startsWith(`${item}/`))

const summary = computed(() => overview.value?.summary ?? EMPTY_SUMMARY)
const loginOverview = computed(() => overview.value?.login ?? EMPTY_LOGIN)
const screens = computed(() => overview.value?.screens ?? [])
const componentCountMap = computed<Record<number, number>>(() => Object.fromEntries(
  screens.value.map((item) => [item.id, item.componentCount])
))
const canLoadLoginLogs = computed(() => loginOverview.value.enabled && canAccess('/home/system/login-logs'))

const getPublishStatus = (screen: WorkbenchScreenSummary) => screen.publishStatus

const getCoverUrl = (screen: WorkbenchScreenSummary) => screen.coverUrl

const getCanvasLabel = (screen: WorkbenchScreenSummary) => `${screen.canvasWidth} × ${screen.canvasHeight}`

const getComponentCount = (dashboardId: number) => componentCountMap.value[dashboardId] ?? 0

const sortByCreatedAt = <T extends { createdAt: string }>(list: T[]) => [...list].sort((left, right) => {
  const leftTime = new Date(left.createdAt || 0).getTime()
  const rightTime = new Date(right.createdAt || 0).getTime()
  return rightTime - leftTime
})

const publishedReportCount = computed(() => summary.value.publishedScreenCount)
const publishProgress = computed(() => {
  if (!screens.value.length) return 0
  return Math.round((publishedReportCount.value / screens.value.length) * 100)
})

const recentAddedDatasourceCount = computed(() => summary.value.recentAddedDatasourceCount)
const recentAddedDatasetCount = computed(() => summary.value.recentAddedDatasetCount)
const recentAddedChartCount = computed(() => summary.value.recentAddedChartCount)
const recentAddedScreenCount = computed(() => summary.value.recentAddedScreenCount)
const recentAddedTotal = computed(() => summary.value.recentAddedTotal)

const recentLoginSuccessCount = computed(() => loginOverview.value.successCount)
const recentLoginFailCount = computed(() => loginOverview.value.failCount)
const recentLoginActiveUserCount = computed(() => loginOverview.value.activeUserCount)

const recentAddedBars = computed<DashboardBarItem[]>(() => {
  const rawItems = [
    {
      key: 'datasource' as const,
      label: '数据源',
      value: recentAddedDatasourceCount.value,
      accent: 'linear-gradient(180deg, #7dd0c6 0%, #55b0a3 100%)',
      color: '#55b0a3',
    },
    {
      key: 'dataset' as const,
      label: '数据集',
      value: recentAddedDatasetCount.value,
      accent: 'linear-gradient(180deg, #90c7df 0%, #6ea8c7 100%)',
      color: '#6ea8c7',
    },
    {
      key: 'chart' as const,
      label: '图表组件',
      value: recentAddedChartCount.value,
      accent: 'linear-gradient(180deg, #98bbe7 0%, #5f97cf 100%)',
      color: '#5f97cf',
    },
    {
      key: 'screen' as const,
      label: '数据大屏',
      value: recentAddedScreenCount.value,
      accent: 'linear-gradient(180deg, #87c8b6 0%, #65b29e 100%)',
      color: '#65b29e',
    },
  ]

  const maxValue = Math.max(...rawItems.map((item) => item.value), 1)

  return rawItems.map((item) => ({
    ...item,
    percent: item.value > 0 ? Math.max(14, Math.round((item.value / maxValue) * 100)) : 0,
  }))
})

const recentAddedRingSegments = computed<DashboardRingSegment[]>(() => {
  const ringItems = recentAddedBars.value.filter((item) => item.value > 0)

  if (!ringItems.length || recentAddedTotal.value <= 0) {
    return [{
      key: 'empty',
      color: '#d7e2e6',
      dasharray: `${DASHBOARD_RING_CIRCUMFERENCE} 0`,
      dashoffset: '0',
    }]
  }

  let offset = 0
  return ringItems.map((item) => {
    const length = (item.value / recentAddedTotal.value) * DASHBOARD_RING_CIRCUMFERENCE
    const segment = {
      key: item.key,
      color: item.color,
      dasharray: `${length} ${Math.max(DASHBOARD_RING_CIRCUMFERENCE - length, 0)}`,
      dashoffset: `${-offset}`,
    }
    offset += length
    return segment
  })
})

const recentLoginTrend = computed<LoginTrendItem[]>(() =>
  (loginOverview.value.trend ?? []).map((item: WorkbenchLoginTrendItem) => ({
    key: item.key,
    label: item.label,
    success: item.success,
    fail: item.fail,
    total: item.total,
  })))

const hasRecentLoginData = computed(() => recentLoginTrend.value.some((item) => item.total > 0))
const loginChartMaxValue = computed(() => Math.max(
  ...recentLoginTrend.value.flatMap((item) => [item.success, item.fail]),
  1,
))

const loginChartPoints = computed<LoginChartPoint[]>(() => {
  const availableWidth = LOGIN_CHART_WIDTH - LOGIN_CHART_PADDING_X * 2
  const availableHeight = LOGIN_CHART_HEIGHT - LOGIN_CHART_PADDING_TOP - LOGIN_CHART_PADDING_BOTTOM
  const step = recentLoginTrend.value.length > 1 ? availableWidth / (recentLoginTrend.value.length - 1) : 0
  const maxValue = loginChartMaxValue.value
  const toY = (value: number) => LOGIN_CHART_PADDING_TOP + availableHeight - (value / maxValue) * availableHeight

  return recentLoginTrend.value.map((item, index) => ({
    key: item.key,
    x: LOGIN_CHART_PADDING_X + step * index,
    successY: toY(item.success),
    failY: toY(item.fail),
  }))
})

const loginSuccessLinePoints = computed(() => loginChartPoints.value.map((item) => `${item.x},${item.successY}`).join(' '))
const loginFailLinePoints = computed(() => loginChartPoints.value.map((item) => `${item.x},${item.failY}`).join(' '))
const loginGuideLines = computed(() => {
  const availableHeight = LOGIN_CHART_HEIGHT - LOGIN_CHART_PADDING_TOP - LOGIN_CHART_PADDING_BOTTOM
  return [0.25, 0.5, 0.75].map((ratio, index) => ({
    key: `guide-${index}`,
    y: LOGIN_CHART_PADDING_TOP + availableHeight * ratio,
  }))
})

const buildDatasourceAssets = (datasources: Datasource[]): WorkspaceAsset[] => sortByCreatedAt(datasources.map((item) => ({
  id: `datasource-${item.id}`,
  name: item.name,
  typeLabel: '数据源',
  secondary: `${SOURCE_KIND_LABELS[item.sourceKind]} · ${item.datasourceType || '未标注类型'}`,
  createdAt: item.createdAt,
  statusLabel: SOURCE_KIND_LABELS[item.sourceKind],
  statusType: 'info',
  path: '/home/prepare/datasource',
  category: 'datasource',
})))

const buildDatasetAssets = (datasets: Dataset[]): WorkspaceAsset[] => sortByCreatedAt(datasets.map((item) => ({
  id: `dataset-${item.id}`,
  name: item.name,
  typeLabel: '数据集',
  secondary: item.datasourceId ? `来源数据源 #${item.datasourceId}` : '未绑定数据源',
  createdAt: item.createdAt,
  statusLabel: '可建模',
  statusType: 'success',
  path: '/home/prepare/dataset',
  category: 'dataset',
})))

const buildChartAssets = (charts: Chart[]): WorkspaceAsset[] => sortByCreatedAt(charts.map((item) => ({
  id: `chart-${item.id}`,
  name: item.name,
  typeLabel: '图表组件',
  secondary: item.datasetId ? `来源数据集 #${item.datasetId} · ${item.chartType}` : `${item.chartType} · 未绑定数据集`,
  createdAt: item.createdAt,
  statusLabel: item.chartType,
  statusType: 'info',
  path: '/home/prepare/components',
  category: 'chart',
})))

const buildScreenAssets = (screenList: WorkbenchScreenSummary[]): WorkspaceAsset[] => sortByCreatedAt(screenList.map((item) => ({
  id: `screen-${item.id}`,
  name: item.name,
  typeLabel: '数据大屏',
  secondary: `${getComponentCount(item.id)} 个组件 · ${getCanvasLabel(item)}`,
  createdAt: item.createdAt,
  statusLabel: getPublishStatus(item) === 'PUBLISHED' ? '已发布' : '草稿',
  statusType: getPublishStatus(item) === 'PUBLISHED' ? 'success' : 'warning',
  path: `/home/screen/edit/${item.id}`,
  category: 'screen',
})))

const resourceCategories = computed<ResourceCategory[]>(() => {
  const categories: ResourceCategory[] = [
    {
      key: 'datasource',
      label: '数据源',
      count: summary.value.datasourceCount,
      path: '/home/prepare/datasource',
    },
    {
      key: 'dataset',
      label: '数据集',
      count: summary.value.datasetCount,
      path: '/home/prepare/dataset',
    },
    {
      key: 'chart',
      label: '图表组件',
      count: summary.value.chartCount,
      path: '/home/prepare/components',
    },
    {
      key: 'screen',
      label: '数据大屏',
      count: summary.value.screenCount,
      path: '/home/screen',
    },
  ]

  return categories.filter((item) => canAccess(item.path))
})

const activeResourceMeta = computed(() => resourceCategories.value.find((item) => item.key === activeResourceCategory.value) || null)
const filteredResourceItems = computed(() => resourceItemsByCategory[activeResourceCategory.value])
const pagedResourceItems = computed(() => {
  const start = (resourcePage.value - 1) * RESOURCE_PAGE_SIZE
  return filteredResourceItems.value.slice(start, start + RESOURCE_PAGE_SIZE)
})
const activeResourceLoading = computed(() => loadingCategories[activeResourceCategory.value])

const pagedRecentScreens = computed(() => {
  const start = (recentScreenPage.value - 1) * RECENT_SCREEN_PAGE_SIZE
  return screens.value.slice(start, start + RECENT_SCREEN_PAGE_SIZE)
})

watch(resourceCategories, (categories) => {
  if (!categories.length) {
    return
  }
  if (!categories.some((item) => item.key === activeResourceCategory.value)) {
    activeResourceCategory.value = categories[0].key
  }
}, { immediate: true })

watch(screens, (value) => {
  resourceItemsByCategory.screen = buildScreenAssets(value)
  loadedCategories.screen = true
}, { immediate: true })

watch(activeResourceCategory, (category) => {
  resourcePage.value = 1
  void ensureCategoryLoaded(category)
})

watch(() => screens.value.length, (count) => {
  const maxPage = Math.max(1, Math.ceil(count / RECENT_SCREEN_PAGE_SIZE))
  if (recentScreenPage.value > maxPage) {
    recentScreenPage.value = maxPage
  }
}, { immediate: true })

watch(() => filteredResourceItems.value.length, (count) => {
  const maxPage = Math.max(1, Math.ceil(count / RESOURCE_PAGE_SIZE))
  if (resourcePage.value > maxPage) {
    resourcePage.value = maxPage
  }
}, { immediate: true })

const formatDate = (value?: string) => {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const goTo = (path: string) => {
  router.push(path)
}

const openScreen = (id: number) => {
  router.push(`/home/screen/edit/${id}`)
}

const ensureCategoryLoaded = async (category: ResourceCategoryKey) => {
  if (loadedCategories[category] || loadingCategories[category]) {
    return
  }
  const categoryMeta = resourceCategories.value.find((item) => item.key === category)
  if (!categoryMeta || categoryMeta.count === 0) {
    resourceItemsByCategory[category] = []
    loadedCategories[category] = true
    return
  }
  if (category === 'screen') {
    resourceItemsByCategory.screen = buildScreenAssets(screens.value)
    loadedCategories.screen = true
    return
  }

  loadingCategories[category] = true
  try {
    if (category === 'datasource') {
      resourceItemsByCategory.datasource = buildDatasourceAssets(await getDatasourceList())
    } else if (category === 'dataset') {
      resourceItemsByCategory.dataset = buildDatasetAssets(await getDatasetList())
    } else if (category === 'chart') {
      resourceItemsByCategory.chart = buildChartAssets(await getChartList())
    }
    loadedCategories[category] = true
  } finally {
    loadingCategories[category] = false
  }
}

const warmupActiveCategory = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.setTimeout(() => {
    void ensureCategoryLoaded(activeResourceCategory.value)
  }, 0)
}

const loadOverview = async () => {
  loading.value = true
  try {
    overview.value = await getWorkbenchOverview()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadOverview()
  warmupActiveCategory()
})
</script>

<style scoped>
.workbench-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(88, 181, 171, 0.16), transparent 22%),
    radial-gradient(circle at 84% 18%, rgba(110, 174, 207, 0.14), transparent 24%),
    linear-gradient(180deg, #f7fbfa 0%, #eef4f4 46%, #edf2f6 100%);
}

.workbench-page::before {
  content: '';
  position: fixed;
  left: -120px;
  top: -120px;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(125, 198, 190, 0.26) 0%, rgba(125, 198, 190, 0) 72%);
  pointer-events: none;
}

.workbench-page::after {
  content: '';
  position: fixed;
  right: -160px;
  top: 84px;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 174, 216, 0.22) 0%, rgba(122, 174, 216, 0) 72%);
  pointer-events: none;
}

.workbench-main {
  position: relative;
  z-index: 1;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-shell {
  display: block;
}

.overview-card {
  position: relative;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.44);
  box-shadow: 0 26px 56px rgba(55, 96, 111, 0.16);
}

.overview-card--dashboard {
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 250, 250, 0.84));
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overview-side__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.overview-side__head--dashboard {
  align-items: flex-start;
}

.overview-side__label {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: #6a818b;
}

.overview-side__title {
  margin-top: 8px;
  font-size: 26px;
  line-height: 1.18;
  font-weight: 700;
  color: #173246;
}

.overview-side__caption {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #80949d;
}

.overview-side__badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(226, 244, 241, 0.94);
  color: #1d666b;
  font-size: 12px;
  font-weight: 600;
}

.overview-dashboard {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(249, 252, 253, 0.96), rgba(242, 247, 248, 0.92));
  border: 1px solid rgba(207, 219, 224, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.overview-dashboard--single {
  display: grid;
  grid-template-columns: minmax(248px, 0.72fr) minmax(0, 0.96fr) minmax(0, 1.04fr);
  gap: 14px;
}

.overview-dashboard__summary-card,
.overview-dashboard__chart-card {
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 250, 251, 0.82));
  border: 1px solid rgba(210, 220, 226, 0.84);
}

.overview-dashboard__chart-card {
  display: flex;
  flex-direction: column;
}

.overview-dashboard__summary-kicker {
  font-size: 12px;
  color: #708792;
  letter-spacing: 0.08em;
}

.overview-dashboard__summary-value {
  margin-top: 10px;
  font-size: 48px;
  line-height: 1;
  font-weight: 700;
  color: #173246;
}

.overview-dashboard__summary-visual {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.overview-dashboard__ring-wrap {
  position: relative;
  width: 128px;
  height: 128px;
}

.overview-dashboard__ring-chart {
  width: 128px;
  height: 128px;
}

.overview-dashboard__ring-track,
.overview-dashboard__ring-segment {
  fill: none;
  stroke-width: 14;
}

.overview-dashboard__ring-track {
  stroke: rgba(218, 227, 231, 0.92);
}

.overview-dashboard__ring-segment {
  transform: rotate(-90deg);
  transform-origin: 64px 64px;
}

.overview-dashboard__ring-copy {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.overview-dashboard__ring-copy strong {
  font-size: 30px;
  line-height: 1;
  color: #173246;
}

.overview-dashboard__ring-copy span {
  margin-top: 6px;
  font-size: 12px;
  color: #708792;
}

.overview-dashboard__summary-copy {
  min-width: 0;
}

.overview-dashboard__summary-meta {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #6f8591;
}

.overview-dashboard__summary-legend {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.overview-dashboard__summary-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: #6f8591;
}

.overview-dashboard__summary-legend-item strong {
  margin-left: auto;
  color: #173246;
}

.overview-dashboard__summary-legend-dot {
  width: 10px;
  height: 10px;
  flex: none;
}

.overview-dashboard__status-panel {
  margin-top: 18px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(240, 247, 248, 0.96), rgba(248, 251, 252, 0.9));
  border: 1px solid rgba(205, 217, 223, 0.82);
}

.overview-dashboard__status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #708792;
}

.overview-dashboard__status-head strong {
  font-size: 20px;
  color: #173246;
}

.overview-dashboard__status-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #173246;
}

.overview-dashboard__status-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #7a8f99;
}

.overview-dashboard__status-track {
  margin-top: 12px;
  height: 9px;
  border-radius: 999px;
  background: rgba(221, 230, 234, 0.8);
  overflow: hidden;
}

.overview-dashboard__status-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #58b5ab 0%, #7ab6d6 100%);
}

.overview-dashboard__summary-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-dashboard__mini-fact {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 252, 252, 0.94), rgba(239, 246, 246, 0.92));
  border: 1px solid rgba(186, 206, 212, 0.6);
}

.overview-dashboard__mini-fact span {
  display: block;
  font-size: 12px;
  color: #718793;
}

.overview-dashboard__mini-fact strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
  color: #173246;
}

.overview-dashboard__chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.overview-dashboard__chart-title {
  font-size: 20px;
  font-weight: 700;
  color: #173246;
}

.overview-dashboard__chart-subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #768b96;
}

.overview-dashboard__chart-unit {
  font-size: 12px;
  color: #7b909b;
}

.overview-dashboard__columns {
  margin-top: 18px;
  min-height: 220px;
  display: flex;
  justify-content: center;
  gap: 14px;
  align-items: end;
}

.overview-dashboard__column-item {
  width: 66px;
  max-width: 66px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.overview-dashboard__column-value {
  font-size: 16px;
  font-weight: 700;
  color: #173246;
}

.overview-dashboard__column-track {
  width: 52px;
  height: 152px;
  padding: 6px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(240, 246, 248, 0.94), rgba(232, 240, 243, 0.82));
  border: 1px solid rgba(211, 221, 226, 0.84);
  display: flex;
  align-items: flex-end;
}

.overview-dashboard__column-bar {
  display: block;
  width: 100%;
  min-height: 12px;
  border-radius: 16px 16px 14px 14px;
  box-shadow: 0 12px 20px rgba(103, 164, 185, 0.18);
}

.overview-dashboard__column-label {
  font-size: 13px;
  font-weight: 600;
  color: #173246;
  text-align: center;
}

.overview-dashboard__column-note {
  font-size: 11px;
  color: #78909a;
  text-align: center;
}

.overview-dashboard__login-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.overview-dashboard__login-fact {
  padding: 12px;
  border: 1px solid rgba(209, 220, 225, 0.84);
  background: linear-gradient(180deg, rgba(248, 252, 253, 0.94), rgba(242, 247, 248, 0.88));
}

.overview-dashboard__login-fact span {
  display: block;
  font-size: 12px;
  color: #728792;
}

.overview-dashboard__login-fact strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  color: #173246;
}

.overview-dashboard__legend {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #728792;
}

.overview-dashboard__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.overview-dashboard__legend-dot {
  width: 10px;
  height: 10px;
  display: inline-block;
}

.overview-dashboard__legend-dot--success {
  background: linear-gradient(180deg, #69c6b6 0%, #4fb2a2 100%);
}

.overview-dashboard__legend-dot--fail {
  background: linear-gradient(180deg, #7ca8d5 0%, #5f8ec7 100%);
}

.overview-dashboard__login-columns {
  margin-top: 18px;
  min-height: 220px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-end;
}

.overview-dashboard__login-column-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.overview-dashboard__login-total {
  font-size: 13px;
  font-weight: 700;
  color: #173246;
}

.overview-dashboard__login-track {
  width: 34px;
  height: 150px;
  padding: 6px;
  border: 1px solid rgba(211, 221, 226, 0.84);
  background: linear-gradient(180deg, rgba(240, 246, 248, 0.94), rgba(232, 240, 243, 0.82));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
}

.overview-dashboard__login-segment {
  display: block;
  width: 100%;
  min-height: 6px;
}

.overview-dashboard__login-segment--success {
  background: linear-gradient(180deg, #69c6b6 0%, #4fb2a2 100%);
}

.overview-dashboard__login-segment--fail {
  background: linear-gradient(180deg, #7ca8d5 0%, #5f8ec7 100%);
}

.overview-dashboard__login-label {
  font-size: 12px;
  color: #728792;
  text-align: center;
}

.overview-dashboard__login-empty {
  margin-top: 18px;
  min-height: 220px;
  border: 1px dashed rgba(204, 216, 222, 0.9);
  background: linear-gradient(180deg, rgba(248, 252, 253, 0.88), rgba(242, 247, 248, 0.84));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: #7c9099;
  text-align: center;
}

.overview-dashboard__login-empty--inline {
  min-height: 180px;
}

.overview-dashboard__line-panel {
  margin-top: 18px;
}

.overview-dashboard__line-chart {
  width: 100%;
  height: 180px;
  overflow: visible;
}

.overview-dashboard__line-guide {
  stroke: rgba(198, 211, 217, 0.88);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}

.overview-dashboard__line {
  fill: none;
  stroke-width: 3;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.overview-dashboard__line--success {
  stroke: #4fb2a2;
}

.overview-dashboard__line--fail {
  stroke: #5f8ec7;
}

.overview-dashboard__point {
  stroke: #ffffff;
  stroke-width: 2;
}

.overview-dashboard__point--success {
  fill: #4fb2a2;
}

.overview-dashboard__point--fail {
  fill: #5f8ec7;
}

.overview-dashboard__line-labels {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  font-size: 12px;
  color: #728792;
  text-align: center;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  gap: 12px;
}

.surface-card {
  border: none;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 42px rgba(35, 66, 74, 0.08);
}

.surface-card :deep(.el-card__body) {
  padding-top: 12px;
}

.surface-card :deep(.el-card__header) {
  padding-bottom: 0;
  border-bottom: none;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #173246;
}

.section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #718793;
}

.recent-screen-list,
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.resource-loading {
  padding: 18px;
  border: 1px dashed rgba(182, 203, 211, 0.88);
  border-radius: 20px;
  background: rgba(248, 251, 251, 0.84);
  color: #617b86;
  font-size: 14px;
}

.recent-screen-item,
.resource-item {
  width: 100%;
  border: 1px solid rgba(191, 208, 214, 0.78);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 251, 0.92));
  display: flex;
  gap: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.recent-screen-item {
  padding: 14px;
  align-items: center;
}

.resource-item {
  padding: 16px;
  align-items: center;
  justify-content: space-between;
}

.recent-screen-item:hover,
.resource-item:hover {
  transform: translateY(-2px);
  border-color: rgba(88, 176, 164, 0.26);
  box-shadow: 0 14px 28px rgba(47, 83, 91, 0.08);
}

.recent-screen-item__cover {
  width: 180px;
  height: 104px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, #5dabad 0%, #7aafd5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.recent-screen-item__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recent-screen-item__cover-fallback {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.recent-screen-item__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-screen-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-screen-item__name {
  font-size: 17px;
  color: #173246;
}

.recent-screen-item__meta,
.recent-screen-item__time {
  font-size: 13px;
  color: #728792;
}

.resource-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.resource-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(188, 205, 212, 0.72);
  background: rgba(245, 249, 249, 0.92);
  color: #5f7b86;
  cursor: pointer;
  transition: all 0.18s ease;
}

.resource-tab--active {
  border-color: rgba(85, 176, 163, 0.28);
  background: linear-gradient(180deg, rgba(227, 245, 241, 0.98), rgba(245, 251, 250, 0.92));
  color: #173246;
}

.resource-tab__count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.resource-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.resource-item__type {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(224, 243, 239, 0.92);
  font-size: 12px;
  color: #2b6c72;
}

.resource-item__name {
  font-size: 16px;
  font-weight: 600;
  color: #173246;
}

.resource-item__secondary {
  font-size: 13px;
  line-height: 1.6;
  color: #708792;
}

.resource-item__meta {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.resource-item__time {
  font-size: 12px;
  color: #78909a;
}

.section-pagination {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1380px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .overview-dashboard--single {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-dashboard__summary-card {
    grid-column: 1 / -1;
  }

  .overview-dashboard__summary-visual {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}

@media (max-width: 900px) {
  .workbench-main {
    padding: 14px;
  }

  .overview-card--dashboard {
    padding: 18px;
  }

  .overview-side__title {
    font-size: 24px;
  }

  .overview-dashboard__columns {
    min-height: 0;
    justify-content: space-between;
  }

  .overview-dashboard__login-summary {
    grid-template-columns: 1fr;
  }

  .overview-dashboard__login-columns {
    justify-content: space-between;
  }

  .recent-screen-item {
    flex-direction: column;
    align-items: stretch;
  }

  .recent-screen-item__cover {
    width: 100%;
    height: 180px;
  }
}

@media (max-width: 640px) {
  .overview-dashboard__summary-grid,
  .overview-dashboard--single {
    grid-template-columns: 1fr;
  }

  .overview-dashboard__summary-legend,
  .overview-dashboard__line-labels {
    grid-template-columns: 1fr;
  }

  .overview-dashboard__summary-card {
    grid-column: auto;
  }

  .overview-dashboard__columns,
  .overview-dashboard__login-columns {
    flex-wrap: wrap;
    justify-content: center;
  }

  .section-head,
  .resource-item,
  .resource-item__meta,
  .recent-screen-item__head,
  .overview-dashboard__chart-head {
    flex-direction: column;
    align-items: stretch;
  }

  .resource-item__meta {
    align-items: flex-start;
  }

  .section-pagination {
    justify-content: center;
  }
}
</style>
