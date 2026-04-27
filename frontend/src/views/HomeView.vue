<template>
  <div class="workbench-page" v-loading="loading">
    <TopNavBar active="workbench" />

    <main class="workbench-main">
      <section class="hero-card">
        <div class="hero-copy">
          <span class="hero-eyebrow">分析工作台</span>
          <h1 class="hero-title">{{ displayName }}，继续推进你的数据产品</h1>
          <p class="hero-description">
            把数据接入、加工、组件设计和大屏发布放到一条可执行链路里，不再依赖首页假入口和弹窗式模块切换。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" @click="goTo(primaryAction.path)">{{ primaryAction.label }}</el-button>
            <el-button size="large" @click="goTo('/home/prepare/datasource')">接入数据源</el-button>
            <el-button size="large" @click="goTo('/home/screen')">管理数据大屏</el-button>
          </div>
        </div>

        <div class="hero-highlight">
          <div class="highlight-label">发布完成度</div>
          <div class="highlight-value">{{ publishedReportCount }}</div>
          <div class="highlight-meta">已发布数据大屏 / 共 {{ screens.length }} 个数据大屏</div>
          <el-progress :percentage="publishProgress" :stroke-width="10" :show-text="false" color="#58b5ab" />

          <div class="highlight-user">
            <span class="highlight-avatar">{{ avatarText }}</span>
            <div>
              <div class="highlight-name">{{ displayName }}</div>
              <div class="highlight-id">账号 ID {{ userId }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="metric-grid">
        <article v-for="metric in summaryMetrics" :key="metric.label" class="metric-card">
          <span class="metric-kicker">{{ metric.kicker }}</span>
          <strong class="metric-value">{{ metric.value }}</strong>
          <span class="metric-label">{{ metric.label }}</span>
          <span class="metric-note">{{ metric.note }}</span>
        </article>
      </section>

      <section class="main-grid">
        <div class="main-column">
          <el-card class="surface-card" shadow="never">
            <template #header>
              <div class="section-head">
                <div>
                  <div class="section-title">本轮待推进</div>
                  <div class="section-subtitle">把接入、加工、构建和发布串成一条真实工作流</div>
                </div>
                <span class="section-number">{{ completedOnboardingCount }}/{{ onboardingSteps.length }}</span>
              </div>
            </template>

            <el-progress :percentage="onboardingProgress" :stroke-width="12" :show-text="false" color="#4b9f96" />

            <div class="workflow-list">
              <button
                v-for="item in onboardingSteps"
                :key="item.label"
                class="workflow-item"
                @click="goTo(item.path)"
              >
                <span class="workflow-dot" :class="{ 'workflow-dot--done': item.done }"></span>
                <div class="workflow-copy">
                  <span class="workflow-label">{{ item.label }}</span>
                  <span class="workflow-tip">{{ item.tip }}</span>
                </div>
                <el-tag size="small" :type="item.done ? 'success' : 'warning'">{{ item.done ? '已完成' : '待处理' }}</el-tag>
              </button>
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header>
              <div class="section-head">
                <div>
                  <div class="section-title">快捷入口</div>
                  <div class="section-subtitle">直接进入真实页面，而不是再用首页弹窗承载完整模块</div>
                </div>
              </div>
            </template>

            <div class="action-grid">
              <button
                v-for="action in quickActions"
                :key="action.key"
                class="action-card"
                @click="goTo(action.path)"
              >
                <span class="action-stat">{{ action.stat }}</span>
                <strong class="action-title">{{ action.title }}</strong>
                <span class="action-desc">{{ action.description }}</span>
              </button>
            </div>
          </el-card>

          <el-card class="surface-card" shadow="never">
            <template #header>
              <div class="section-head">
                <div>
                  <div class="section-title">最近资产</div>
                  <div class="section-subtitle">优先展示最近真实改动的数据资产和报告资产</div>
                </div>
              </div>
            </template>

            <div v-if="recentAssets.length" class="asset-list">
              <button
                v-for="asset in recentAssets"
                :key="asset.id"
                class="asset-item"
                @click="goTo(asset.path)"
              >
                <div class="asset-main">
                  <span class="asset-type">{{ asset.typeLabel }}</span>
                  <div class="asset-name">{{ asset.name }}</div>
                  <div class="asset-secondary">{{ asset.secondary }}</div>
                </div>

                <div class="asset-meta">
                  <el-tag size="small" :type="asset.statusType">{{ asset.statusLabel }}</el-tag>
                  <span class="asset-time">{{ formatDate(asset.createdAt) }}</span>
                </div>
              </button>
            </div>
            <el-empty v-else description="还没有可展示的资产，先从接入数据源开始" />
          </el-card>
        </div>

        <div class="side-column">
          <el-card class="surface-card spotlight-card" shadow="never">
            <template #header>
              <div class="section-head">
                <div>
                  <div class="section-title">最近大屏</div>
                  <div class="section-subtitle">封面、状态和组件数直接可见</div>
                </div>
                <el-button link @click="goTo('/home/screen')">查看全部</el-button>
              </div>
            </template>

            <div v-if="recentScreens.length" class="spotlight-list">
              <button
                v-for="screen in recentScreens"
                :key="screen.id"
                class="spotlight-item"
                @click="openScreen(screen.id)"
              >
                <div class="spotlight-cover">
                  <img v-if="getCoverUrl(screen)" :src="getCoverUrl(screen)" alt="大屏封面" />
                  <div v-else class="spotlight-cover-fallback">未生成封面</div>
                </div>

                <div class="spotlight-body">
                  <div class="spotlight-head">
                    <span class="spotlight-name">{{ screen.name }}</span>
                    <el-tag size="small" :type="getPublishStatus(screen) === 'PUBLISHED' ? 'success' : 'info'">
                      {{ getPublishStatus(screen) === 'PUBLISHED' ? '已发布' : '草稿' }}
                    </el-tag>
                  </div>
                  <div class="spotlight-meta">
                    {{ getComponentCount(screen.id) }} 个组件 · {{ getCanvasLabel(screen) }}
                  </div>
                  <div class="spotlight-time">最近更新 {{ formatDate(screen.createdAt) }}</div>
                </div>
              </button>
            </div>
            <el-empty v-else description="还没有数据大屏，先创建一个新的大屏" />
          </el-card>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChartList, type Chart } from '../api/chart'
import { getDashboardList, type Dashboard } from '../api/dashboard'
import { getDatasetList, type Dataset } from '../api/dataset'
import { getDatasourceList, type Datasource, type DatasourceSourceKind } from '../api/datasource'
import TopNavBar from '../components/TopNavBar.vue'
import {
  normalizeCanvasConfig,
  normalizeCoverConfig,
  normalizePublishConfig,
  parseReportConfig,
  type PublishStatus,
} from '../utils/report-config'
import { flattenAuthMenus, getAuthDisplayName, getAuthMenus } from '../utils/auth-session'

type AssetStatusType = 'success' | 'info' | 'warning'

interface WorkspaceAsset {
  id: string
  name: string
  typeLabel: string
  secondary: string
  createdAt: string
  statusLabel: string
  statusType: AssetStatusType
  path: string
}

interface QuickAction {
  key: string
  title: string
  description: string
  stat: string
  path: string
}

const SOURCE_KIND_LABELS: Record<DatasourceSourceKind, string> = {
  DATABASE: '数据库',
  API: 'API 接口',
  TABLE: '表格文件',
  JSON_STATIC: '静态 JSON',
}

const loading = ref(false)
const router = useRouter()

const datasourceList = ref<Datasource[]>([])
const datasetList = ref<Dataset[]>([])
const chartList = ref<Chart[]>([])
const reportList = ref<Dashboard[]>([])
const componentCountMap = computed<Record<number, number>>(() => Object.fromEntries(
  reportList.value.map((item) => [item.id, item.componentCount ?? 0])
))

const displayName = computed(() => getAuthDisplayName())
const userId = computed(() => localStorage.getItem('bi_user_id') || '--')
const avatarText = computed(() => displayName.value.slice(0, 1) || '用')

const allowedPaths = computed(() => new Set(
  flattenAuthMenus(getAuthMenus()).map((item) => item.path).filter(Boolean)
))

const canAccess = (path: string) => !allowedPaths.value.size
  || allowedPaths.value.has(path)
  || Array.from(allowedPaths.value).some((item) => path.startsWith(`${item}/`))

const getReportScene = (report: Dashboard): 'dashboard' | 'screen' => {
  const config = parseReportConfig(report.configJson)
  return config.scene === 'screen' ? 'screen' : 'dashboard'
}

const getPublishStatus = (report: Dashboard): PublishStatus => {
  const config = parseReportConfig(report.configJson)
  return normalizePublishConfig(config.publish).status
}

const getCoverUrl = (report: Dashboard) => {
  const config = parseReportConfig(report.configJson)
  return normalizeCoverConfig(config.cover).url
}

const getCanvasLabel = (report: Dashboard) => {
  const scene = getReportScene(report)
  const config = parseReportConfig(report.configJson)
  const canvas = normalizeCanvasConfig(config.canvas, scene)
  return `${canvas.width} × ${canvas.height}`
}

const getComponentCount = (dashboardId: number) => componentCountMap.value[dashboardId] ?? 0

const sortByCreatedAt = <T extends { createdAt: string }>(list: T[]) => [...list].sort((left, right) => {
  const leftTime = new Date(left.createdAt || 0).getTime()
  const rightTime = new Date(right.createdAt || 0).getTime()
  return rightTime - leftTime
})

const screens = computed(() => sortByCreatedAt(reportList.value.filter((item) => getReportScene(item) === 'screen')))
const publishedReportCount = computed(() => screens.value.filter((item) => getPublishStatus(item) === 'PUBLISHED').length)
const publishProgress = computed(() => {
  if (!screens.value.length) return 0
  return Math.round((publishedReportCount.value / screens.value.length) * 100)
})

const primaryAction = computed(() => {
  if (!datasourceList.value.length) {
    return { label: '先接入第一个数据源', path: '/home/prepare/datasource' }
  }
  if (!datasetList.value.length) {
    return { label: '继续创建数据集', path: '/home/prepare/dataset' }
  }
  const latestDraftScreen = screens.value.find((item) => getPublishStatus(item) === 'DRAFT')
  if (latestDraftScreen) {
    return { label: '继续编辑最近大屏', path: `/home/screen/edit/${latestDraftScreen.id}` }
  }
  return { label: '进入数据大屏工作区', path: '/home/screen' }
})

const summaryMetrics = computed(() => [
  {
    label: '数据源',
    kicker: '接入层',
    value: datasourceList.value.length,
    note: datasourceList.value.length ? '已连接数据库、接口或文件' : '还没有任何数据接入',
  },
  {
    label: '数据集',
    kicker: '加工层',
    value: datasetList.value.length,
    note: datasetList.value.length ? '可直接供图表与报表使用' : '还没有沉淀可复用数据集',
  },
  {
    label: '图表组件',
    kicker: '分析层',
    value: chartList.value.length,
    note: chartList.value.length ? '图表模板已可复用' : '还没有完成图表设计',
  },
  {
    label: '数据大屏',
    kicker: '展示层',
    value: screens.value.length,
    note: screens.value.length ? `${publishedReportCount.value} 个已发布` : '尚未搭建展示大屏',
  },
])

const onboardingSteps = computed(() => [
  {
    label: '接入至少一个数据源',
    tip: datasourceList.value.length ? `${datasourceList.value.length} 个数据源已接入` : '支持数据库、API、表格和静态 JSON',
    done: datasourceList.value.length > 0,
    path: '/home/prepare/datasource',
  },
  {
    label: '沉淀可复用数据集',
    tip: datasetList.value.length ? `${datasetList.value.length} 个数据集可直接复用` : '把原始数据整理成业务字段模型',
    done: datasetList.value.length > 0,
    path: '/home/prepare/dataset',
  },
  {
    label: '完成图表设计与组件装配',
    tip: chartList.value.length ? `${chartList.value.length} 个图表组件已创建` : '先设计图表组件，再进入数据大屏',
    done: chartList.value.length > 0,
    path: '/home/prepare/components',
  },
  {
    label: '发布至少一个报告',
    tip: publishedReportCount.value ? `${publishedReportCount.value} 个数据大屏已发布` : '让数据大屏真正进入可分享状态',
    done: publishedReportCount.value > 0,
    path: '/home/screen',
  },
])

const completedOnboardingCount = computed(() => onboardingSteps.value.filter((item) => item.done).length)
const onboardingProgress = computed(() => Math.round((completedOnboardingCount.value / onboardingSteps.value.length) * 100))

const quickActions = computed<QuickAction[]>(() => ([
  {
    key: 'datasource',
    title: '接入数据源',
    description: '创建数据库、API、表格或静态 JSON 数据源',
    stat: `${datasourceList.value.length} 个已接入`,
    path: '/home/prepare/datasource',
  },
  {
    key: 'dataset',
    title: '加工数据集',
    description: '整理 SQL、字段和抽取逻辑，形成可复用数据模型',
    stat: `${datasetList.value.length} 个数据集`,
    path: '/home/prepare/dataset',
  },
  {
    key: 'chart',
    title: '设计图表组件',
    description: '进入组件设计页面，沉淀图表资产供后续复用',
    stat: `${chartList.value.length} 个图表`,
    path: '/home/prepare/components',
  },
  {
    key: 'screen',
    title: '管理数据大屏',
    description: '统一查看大屏封面、状态和进入编辑器',
    stat: `${screens.value.length} 个大屏`,
    path: '/home/screen',
  },
]).filter((item) => canAccess(item.path)))

const recentAssets = computed<WorkspaceAsset[]>(() => {
  const datasourceAssets: WorkspaceAsset[] = datasourceList.value.map((item) => ({
    id: `datasource-${item.id}`,
    name: item.name,
    typeLabel: '数据源',
    secondary: `${SOURCE_KIND_LABELS[item.sourceKind]} · ${item.datasourceType || '未标注类型'}`,
    createdAt: item.createdAt,
    statusLabel: SOURCE_KIND_LABELS[item.sourceKind],
    statusType: 'info',
    path: '/home/prepare/datasource',
  }))

  const datasetAssets: WorkspaceAsset[] = datasetList.value.map((item) => ({
    id: `dataset-${item.id}`,
    name: item.name,
    typeLabel: '数据集',
    secondary: item.datasourceId ? `来源数据源 #${item.datasourceId}` : '未绑定数据源',
    createdAt: item.createdAt,
    statusLabel: '可建模',
    statusType: 'success',
    path: '/home/prepare/dataset',
  }))

  const reportAssets: WorkspaceAsset[] = reportList.value
    .filter((item) => getReportScene(item) === 'screen')
    .map((item) => ({
      id: `screen-${item.id}`,
      name: item.name,
      typeLabel: '数据大屏',
      secondary: `${getComponentCount(item.id)} 个组件 · ${getCanvasLabel(item)}`,
      createdAt: item.createdAt,
      statusLabel: getPublishStatus(item) === 'PUBLISHED' ? '已发布' : '草稿',
      statusType: getPublishStatus(item) === 'PUBLISHED' ? 'success' : 'warning',
      path: `/home/screen/edit/${item.id}`,
    }))

  return sortByCreatedAt([...datasourceAssets, ...datasetAssets, ...reportAssets]).slice(0, 8)
})

const recentScreens = computed(() => screens.value.slice(0, 3))

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

const loadData = async () => {
  loading.value = true
  try {
    const [datasources, datasets, charts, dashboards] = await Promise.all([
      getDatasourceList(),
      getDatasetList(),
      getChartList(),
      getDashboardList(),
    ])

    datasourceList.value = datasources
    datasetList.value = datasets
    chartList.value = charts
    reportList.value = dashboards
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr);
  gap: 22px;
  padding: 30px;
  border-radius: 32px;
  background:
    linear-gradient(135deg, rgba(62, 141, 147, 0.96) 0%, rgba(95, 162, 169, 0.94) 48%, rgba(169, 199, 208, 0.88) 100%),
    #6aafb2;
  border: 1px solid rgba(255, 255, 255, 0.48);
  color: #ffffff;
  box-shadow: 0 26px 56px rgba(55, 96, 111, 0.18);
}

.hero-card::after {
  content: '';
  position: absolute;
  right: -96px;
  bottom: -124px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 72%);
  pointer-events: none;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-eyebrow {
  display: inline-flex;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(247, 253, 252, 0.18);
  color: #f2fbfa;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.hero-title {
  margin: 0;
  font-size: 38px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero-description {
  margin: 0;
  max-width: 680px;
  font-size: 15px;
  line-height: 1.75;
  color: rgba(245, 251, 250, 0.9);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.hero-highlight {
  padding: 22px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 250, 251, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.highlight-label {
  font-size: 13px;
  color: #5d7c84;
  letter-spacing: 0.08em;
}

.highlight-value {
  font-size: 56px;
  line-height: 1;
  font-weight: 700;
  color: #173246;
}

.highlight-meta {
  font-size: 13px;
  color: #69818a;
}

.highlight-user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(103, 126, 133, 0.14);
}

.highlight-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #57b0a4 0%, #7aafd5 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  box-shadow: 0 12px 20px rgba(86, 158, 165, 0.22);
}

.highlight-name {
  font-size: 14px;
  font-weight: 600;
  color: #173246;
}

.highlight-id {
  font-size: 12px;
  color: #728793;
}

.hero-actions :deep(.el-button) {
  height: 44px;
  padding: 0 18px;
  border-radius: 14px;
  font-weight: 600;
}

.hero-actions :deep(.el-button--primary) {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(255, 255, 255, 0.94);
  color: #1c5258;
  box-shadow: 0 12px 24px rgba(63, 120, 124, 0.16);
}

.hero-actions :deep(.el-button--primary:hover) {
  background: #ffffff;
  border-color: #ffffff;
  color: #184247;
}

.hero-actions :deep(.el-button:not(.el-button--primary)) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.hero-actions :deep(.el-button:not(.el-button--primary):hover) {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.26);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(186, 206, 212, 0.78);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 36px rgba(42, 73, 81, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-kicker {
  font-size: 12px;
  color: #728894;
}

.metric-value {
  font-size: 34px;
  line-height: 1;
  color: #173246;
}

.metric-label {
  font-size: 15px;
  font-weight: 600;
  color: #173246;
}

.metric-note {
  font-size: 12px;
  line-height: 1.6;
  color: #6f8591;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.86fr);
  gap: 18px;
}

.main-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.surface-card {
  border: none;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 42px rgba(35, 66, 74, 0.08);
}

.surface-card :deep(.el-card__body) {
  padding-top: 18px;
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

.section-number {
  font-size: 28px;
  font-weight: 700;
  color: #2e7482;
}

.workflow-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workflow-item {
  width: 100%;
  border: 1px solid rgba(189, 207, 213, 0.82);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 251, 0.92));
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.workflow-item:hover {
  transform: translateY(-2px);
  border-color: rgba(88, 176, 164, 0.28);
  box-shadow: 0 14px 28px rgba(51, 93, 100, 0.08);
}

.workflow-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffbf66;
  flex: none;
}

.workflow-dot--done {
  background: #22a385;
}

.workflow-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.workflow-label {
  font-size: 14px;
  font-weight: 600;
  color: #173246;
}

.workflow-tip {
  font-size: 12px;
  color: #708792;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.action-card {
  border: 1px solid rgba(191, 208, 214, 0.78);
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(244, 249, 249, 0.92) 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  border-color: rgba(88, 176, 164, 0.3);
  box-shadow: 0 16px 30px rgba(43, 78, 86, 0.09);
}

.action-stat {
  font-size: 12px;
  color: #66909a;
}

.action-title {
  font-size: 18px;
  color: #173246;
}

.action-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #718792;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-item {
  width: 100%;
  border: 1px solid rgba(191, 208, 214, 0.78);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 251, 0.92));
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.asset-item:hover {
  transform: translateY(-2px);
  border-color: rgba(88, 176, 164, 0.26);
  box-shadow: 0 14px 28px rgba(47, 83, 91, 0.08);
}

.asset-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asset-type {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(224, 243, 239, 0.92);
  font-size: 12px;
  color: #2b6c72;
}

.asset-name {
  font-size: 16px;
  font-weight: 600;
  color: #173246;
}

.asset-secondary {
  font-size: 13px;
  line-height: 1.6;
  color: #708792;
}

.asset-meta {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.asset-time {
  font-size: 12px;
  color: #78909a;
}

.spotlight-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spotlight-item {
  width: 100%;
  border: 1px solid rgba(190, 207, 214, 0.8);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 251, 0.94));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.spotlight-item:hover {
  transform: translateY(-2px);
  border-color: rgba(88, 176, 164, 0.26);
  box-shadow: 0 18px 34px rgba(45, 80, 88, 0.1);
}

.spotlight-cover {
  height: 180px;
  background: linear-gradient(135deg, #5dabad 0%, #7aafd5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spotlight-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spotlight-cover-fallback {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.spotlight-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spotlight-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.spotlight-name {
  font-size: 16px;
  font-weight: 600;
  color: #173246;
}

.spotlight-meta,
.spotlight-time {
  font-size: 13px;
  color: #728792;
}

@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .workbench-main {
    padding: 14px;
  }

  .hero-card {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .hero-title {
    font-size: 28px;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .asset-item,
  .spotlight-head,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .asset-meta {
    align-items: flex-start;
  }

  .spotlight-cover {
    height: 150px;
  }
}
</style>
