<template>
  <div class="workbench-page" v-loading="loading">
    <TopNavBar active="workbench" />

    <main class="content-area">
      <section class="left-column">
        <el-card class="panel-card user-card" shadow="never">
          <div class="profile-line">
            <div class="profile-avatar">A</div>
            <div>
              <div class="profile-name">{{ displayName }}</div>
              <div class="profile-id">ID: {{ userId }}</div>
            </div>
          </div>
          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-label">仪表板</div>
              <div class="metric-value">{{ dashboardCount }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">数据大屏</div>
              <div class="metric-value">0</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">数据集</div>
              <div class="metric-value">{{ datasetCount }}</div>
            </div>
          </div>
        </el-card>

        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="card-head">快速创建</div>
          </template>
          <div class="quick-grid">
            <button class="quick-btn" @click="openModule('dashboard')">
              <span class="dot dot-blue"></span>
              <span>仪表板</span>
            </button>
            <button class="quick-btn" @click="openModule('chart')">
              <span class="dot dot-green"></span>
              <span>数据大屏</span>
            </button>
            <button class="quick-btn" @click="openModule('dataset')">
              <span class="dot dot-cyan"></span>
              <span>数据集</span>
            </button>
            <button class="quick-btn" @click="openModule('datasource')">
              <span class="dot dot-purple"></span>
              <span>数据源</span>
            </button>
          </div>
          <button class="template-btn">使用模板新建</button>
        </el-card>
      </section>

      <section class="right-column">
        <el-card class="panel-card" shadow="never">
          <template #header>
            <div class="head-row">
              <span class="card-head">模板中心</span>
              <div class="head-actions">
                <button class="text-btn">查看全部</button>
                <button class="text-btn">收起</button>
              </div>
            </div>
          </template>

          <div class="template-tabs">
            <button class="tab-chip tab-chip--active">推荐仪表板</button>
            <button class="tab-chip">数据大屏</button>
          </div>

          <div class="template-grid">
            <article v-for="item in templateCards" :key="item.name" class="template-card">
              <div class="template-thumb" :style="{ background: item.bg }"></div>
              <div class="template-name">{{ item.name }}</div>
            </article>
          </div>
        </el-card>

        <el-card class="panel-card" shadow="never">
          <div class="asset-tabs">
            <button
              class="asset-tab"
              :class="{ 'asset-tab--active': activeAssetTab === 'favorite' }"
              @click="activeAssetTab = 'favorite'"
            >
              我的收藏
            </button>
            <button
              class="asset-tab"
              :class="{ 'asset-tab--active': activeAssetTab === 'recent' }"
              @click="activeAssetTab = 'recent'"
            >
              最近使用
            </button>
            <button
              class="asset-tab"
              :class="{ 'asset-tab--active': activeAssetTab === 'shared' }"
              @click="activeAssetTab = 'shared'"
            >
              我的分享
            </button>
          </div>

          <div class="asset-toolbar">
            <el-select v-model="assetFilter" style="width: 140px">
              <el-option label="全部类型" value="all" />
              <el-option label="数据源" value="datasource" />
              <el-option label="数据集" value="dataset" />
              <el-option label="图表" value="chart" />
            </el-select>
            <el-input v-model="searchKeyword" placeholder="搜索关键词" style="width: 260px" clearable />
          </div>

          <el-table :data="filteredAssets" border empty-text="暂无数据">
            <el-table-column prop="name" label="名称" min-width="220" />
            <el-table-column prop="type" label="类型" width="140" />
            <el-table-column prop="creator" label="创建人" width="140" />
            <el-table-column prop="editor" label="最近编辑人" width="140" />
            <el-table-column prop="updateTime" label="最近编辑时间" width="180" />
            <el-table-column prop="operation" label="操作" width="120" />
          </el-table>
        </el-card>
      </section>
    </main>

    <el-dialog v-model="moduleDialogVisible" :title="moduleTitle" width="80%" top="4vh">
      <component :is="activeModuleComponent" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDatasourceList, type Datasource } from '../api/datasource'
import { getDatasetList, type Dataset } from '../api/dataset'
import { getChartList, type Chart } from '../api/chart'
import { getDefaultDashboard } from '../api/dashboard'
import DatasourcePanel from '../components/DatasourcePanel.vue'
import DatasetPanel from '../components/DatasetPanel.vue'
import ChartDesignerPanel from '../components/ChartDesignerPanel.vue'
import DashboardPanel from '../components/DashboardPanel.vue'
import TopNavBar from '../components/TopNavBar.vue'

type ModuleKey = 'datasource' | 'dataset' | 'chart' | 'dashboard'
type AssetTab = 'favorite' | 'recent' | 'shared'

const loading = ref(false)

const datasourceList = ref<Datasource[]>([])
const datasetList = ref<Dataset[]>([])
const chartList = ref<Chart[]>([])
const dashboardCount = ref(0)

const activeAssetTab = ref<AssetTab>('favorite')
const assetFilter = ref<'all' | 'datasource' | 'dataset' | 'chart'>('all')
const searchKeyword = ref('')

const moduleDialogVisible = ref(false)
const activeModule = ref<ModuleKey>('dashboard')

const displayName = computed(() => {
  return localStorage.getItem('bi_display_name') || localStorage.getItem('bi_username') || '未登录用户'
})

const userId = computed(() => {
  return localStorage.getItem('bi_user_id') || '--'
})

const templateCards = computed(() => {
  const colors = [
    'linear-gradient(135deg, #f9e5d1, #d9e8ff)',
    'linear-gradient(135deg, #d5e5ff, #e8f0ff)',
    'linear-gradient(135deg, #ffeccb, #edf4ff)',
    'linear-gradient(135deg, #d8f2ee, #e7ecff)'
  ]
  return chartList.value.slice(0, 4).map((chart, index) => ({
    name: chart.name,
    bg: colors[index % colors.length]
  }))
})

const moduleMap = {
  datasource: DatasourcePanel,
  dataset: DatasetPanel,
  chart: ChartDesignerPanel,
  dashboard: DashboardPanel
}

const moduleTitleMap: Record<ModuleKey, string> = {
  datasource: '数据源管理',
  dataset: '数据集 SQL',
  chart: '图表设计',
  dashboard: '仪表盘'
}

const activeModuleComponent = computed(() => moduleMap[activeModule.value])
const moduleTitle = computed(() => moduleTitleMap[activeModule.value])

const datasetCount = computed(() => datasetList.value.length)

const allAssets = computed(() => {
  const datasourceAssets = datasourceList.value.map((item) => ({
    name: item.name,
    type: 'datasource',
    creator: displayName.value,
    editor: displayName.value,
    updateTime: item.createdAt || '',
    operation: '查看'
  }))

  const datasetAssets = datasetList.value.map((item) => ({
    name: item.name,
    type: 'dataset',
    creator: displayName.value,
    editor: displayName.value,
    updateTime: item.createdAt || '',
    operation: '查看'
  }))

  const chartAssets = chartList.value.map((item) => ({
    name: item.name,
    type: 'chart',
    creator: displayName.value,
    editor: displayName.value,
    updateTime: item.createdAt || '',
    operation: '查看'
  }))

  return [...datasourceAssets, ...datasetAssets, ...chartAssets]
})

const filteredAssets = computed(() => {
  let list = allAssets.value
  if (assetFilter.value !== 'all') {
    list = list.filter((item) => item.type === assetFilter.value)
  }

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    list = list.filter((item) => item.name.toLowerCase().includes(keyword))
  }

  if (activeAssetTab.value === 'recent') {
    return list.slice().reverse()
  }

  if (activeAssetTab.value === 'shared') {
    return list.filter((item, index) => index % 2 === 0)
  }

  return list
})

const openModule = (module: ModuleKey) => {
  activeModule.value = module
  moduleDialogVisible.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    const [datasources, datasets, charts, dashboard] = await Promise.all([
      getDatasourceList(),
      getDatasetList(),
      getChartList(),
      getDefaultDashboard()
    ])
    datasourceList.value = datasources
    datasetList.value = datasets
    chartList.value = charts
    dashboardCount.value = dashboard.kpi.dashboardCount
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.workbench-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.content-area {
  padding: 14px;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 14px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-card {
  border-radius: 4px;
}

.user-card :deep(.el-card__body) {
  padding-top: 22px;
}

.profile-line {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, #6aa7ff, #2764db);
  color: #ffffff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-name {
  font-size: 28px;
  font-weight: 600;
}

.profile-id {
  margin-top: 4px;
  color: #6b7280;
}

.metrics-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.metric-label {
  color: #667085;
  font-size: 14px;
}

.metric-value {
  margin-top: 8px;
  font-size: 34px;
  font-weight: 700;
  color: #111827;
}

.card-head {
  font-size: 20px;
  font-weight: 600;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-btn {
  border: 1px solid #d6dbe8;
  background: #ffffff;
  border-radius: 6px;
  min-height: 58px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
  color: #30384d;
}

.quick-btn:hover {
  border-color: #9db6ff;
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: 5px;
}

.dot-blue {
  background: #2f6df6;
}

.dot-green {
  background: #14b8a6;
}

.dot-cyan {
  background: #22c1f1;
}

.dot-purple {
  background: #7c3aed;
}

.template-btn {
  margin-top: 14px;
  width: 100%;
  border: 1px solid #d6dbe8;
  background: #ffffff;
  border-radius: 6px;
  height: 54px;
  cursor: pointer;
  font-size: 15px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.head-actions {
  display: flex;
  gap: 12px;
}

.text-btn {
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.template-tabs {
  display: flex;
  gap: 8px;
}

.tab-chip {
  border: 1px solid #d0d7e7;
  background: #f5f7fb;
  color: #4b5563;
  border-radius: 6px;
  height: 30px;
  padding: 0 12px;
}

.tab-chip--active {
  background: #eaf0ff;
  color: #2f6df6;
  border-color: #b7c8f6;
}

.template-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.template-card {
  border: 1px solid #d6dbe8;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}

.template-thumb {
  height: 94px;
}

.template-name {
  font-size: 15px;
  padding: 8px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-tabs {
  display: flex;
  gap: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.asset-tab {
  border: none;
  background: transparent;
  height: 42px;
  color: #3f495c;
  cursor: pointer;
}

.asset-tab--active {
  color: #2f6df6;
  font-weight: 600;
  border-bottom: 2px solid #2f6df6;
}

.asset-toolbar {
  margin: 14px 0;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

@media (max-width: 1200px) {
  .content-area {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .template-grid {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }

  .asset-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
