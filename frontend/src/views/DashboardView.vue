<template>
  <div class="dashboard-page">
    <TopNavBar active="dashboard" />

    <div class="dashboard-body">
      <!-- 左侧面板 -->
      <aside class="left-panel" :class="{ 'left-panel--collapsed': sidebarCollapsed }">
        <div class="panel-header">
          <span v-if="!sidebarCollapsed" class="panel-title">仪表板</span>
          <div class="panel-header-actions">
            <el-tooltip v-if="!sidebarCollapsed" content="新建仪表板" placement="top">
              <el-button :icon="Plus" size="small" type="primary" @click="openCreate" />
            </el-tooltip>
            <el-tooltip :content="sidebarCollapsed ? '展开面板' : '收起面板'" placement="top">
              <el-button :icon="sidebarCollapsed ? Expand : Fold" size="small" @click="sidebarCollapsed = !sidebarCollapsed" />
            </el-tooltip>
          </div>
        </div>

        <template v-if="!sidebarCollapsed">
          <div class="panel-search">
            <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索" clearable size="small" />
          </div>

          <!-- 已发布仪表板列表 -->
          <div class="panel-section-header">
            <el-icon class="panel-section-icon"><FolderOpened /></el-icon>
            <span class="panel-section-label">已发布</span>
          </div>
          <div class="panel-list" v-loading="dashboardLoading">
            <div
              v-for="db in publishedDashboards"
              :key="db.id"
              class="panel-item"
              :class="{ 'panel-item--active': selectedId === db.id }"
              @click="selectDashboard(db)"
            >
              <el-icon class="panel-item-icon"><Grid /></el-icon>
              <span class="panel-item-name" :title="db.name">{{ db.name }}</span>
            </div>
            <div v-if="!loading && !publishedDashboards.length" class="panel-empty">暂无已发布仪表板</div>
          </div>
          <div v-if="dashboardTotal > dashboardPageSize" class="panel-pagination">
            <el-pagination
              v-model:current-page="dashboardPage"
              small
              background
              layout="prev, pager, next"
              :page-size="dashboardPageSize"
              :total="dashboardTotal"
            />
          </div>

          <!-- 模板区块（已发布的数据大屏） -->
          <div class="panel-section-header">
            <el-icon class="panel-section-icon"><Monitor /></el-icon>
            <span class="panel-section-label">模板（大屏）</span>
          </div>
          <div class="panel-list panel-list--templates" v-loading="templateLoading">
            <div
              v-for="scr in screenTemplates"
              :key="'scr-' + scr.id"
              class="panel-item panel-item--template"
              :class="{ 'panel-item--active': selectedTemplateId === scr.id }"
              @click="selectScreenTemplate(scr)"
            >
              <el-icon class="panel-item-icon"><Monitor /></el-icon>
              <span class="panel-item-name" :title="scr.name">{{ scr.name }}</span>
            </div>
            <div v-if="!screenTemplates.length" class="panel-empty">暂无已发布大屏模板</div>
          </div>
          <div v-if="templateTotal > templatePageSize" class="panel-pagination panel-pagination--templates">
            <el-pagination
              v-model:current-page="templatePage"
              small
              background
              layout="prev, pager, next"
              :page-size="templatePageSize"
              :total="templateTotal"
            />
          </div>
        </template>
      </aside>

      <!-- 折叠切换按钮 -->
      <div class="collapse-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon><component :is="sidebarCollapsed ? ArrowRight : ArrowLeft" /></el-icon>
      </div>

      <!-- 右侧内容：工具栏 + 预览 -->
      <main class="right-content">
        <template v-if="selectedDashboard">
          <div class="content-toolbar">
            <div class="toolbar-left">
              <span class="toolbar-name">{{ selectedDashboard.name }}</span>
              <el-icon class="toolbar-star"><Star /></el-icon>
              <span class="toolbar-creator">创建人:管理员</span>
              <el-tag size="small" type="success" style="margin-left:8px">已发布</el-tag>
            </div>
            <div class="toolbar-right">
              <el-button size="small" :icon="FullScreen" @click="openFullscreen">全屏</el-button>
              <el-button size="small" :icon="View" @click="openPreview">预览</el-button>
              <el-button size="small" :icon="Share" @click="openPreview">分享</el-button>
              <el-button size="small" :icon="Edit" type="primary" @click="openEditor">编辑</el-button>
              <el-dropdown trigger="click">
                <el-button size="small" :icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="openPreview">在新窗口预览</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 仪表板预览区 -->
          <div class="content-preview" :key="selectedId ?? 0">
            <ReportPreviewCanvas
              :dashboard-id="selectedId as number"
              scene="dashboard"
              access-mode="private"
            />
          </div>
        </template>

        <!-- 大屏模板预览 -->
        <template v-else-if="selectedScreenTemplate">
          <div class="content-toolbar">
            <div class="toolbar-left">
              <span class="toolbar-name">{{ selectedScreenTemplate.name }}</span>
              <el-tag size="small" type="warning" style="margin-left:8px">大屏模板</el-tag>
            </div>
            <div class="toolbar-right">
              <el-button size="small" :icon="View" @click="previewScreen(selectedScreenTemplate)">预览大屏</el-button>
              <el-button size="small" type="primary" @click="useScreenTemplate(selectedScreenTemplate)">基于此大屏创建仪表板</el-button>
            </div>
          </div>
          <div class="template-preview">
            <div class="template-cover" v-if="getCoverUrl(selectedScreenTemplate)">
              <img :src="getCoverUrl(selectedScreenTemplate)" alt="大屏封面" />
            </div>
            <div class="template-info">
              <div class="template-info-item"><span class="template-label">大屏名称：</span>{{ selectedScreenTemplate.name }}</div>
              <div class="template-info-item"><span class="template-label">创建时间：</span>{{ selectedScreenTemplate.createdAt }}</div>
            </div>
          </div>
        </template>

        <el-empty v-else-if="!loading" description="请在左侧选择仪表板或模板" class="content-empty" />
      </main>
    </div>

    <!-- 新建仪表板对话框 -->
    <el-dialog v-model="createVisible" title="新建仪表板" width="420px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入仪表板名称" maxlength="50" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, ArrowRight, Edit, Expand, Fold,
  FolderOpened, FullScreen, Grid, Monitor, MoreFilled, Plus, Search, Share, Star, View,
} from '@element-plus/icons-vue'
import TopNavBar from '../components/TopNavBar.vue'
import ReportPreviewCanvas from '../components/ReportPreviewCanvas.vue'
import {
  createDashboard,
  getDashboardPage,
  type Dashboard,
} from '../api/dashboard'
import {
  buildReportConfig,
  normalizeCoverConfig,
  parseReportConfig,
} from '../utils/report-config'

const router = useRouter()
const dashboardLoading = ref(false)
const templateLoading = ref(false)
const loading = computed(() => dashboardLoading.value || templateLoading.value)
const saving = ref(false)
const publishedDashboards = ref<Dashboard[]>([])
const screenTemplates = ref<Dashboard[]>([])
const dashboardTotal = ref(0)
const templateTotal = ref(0)
const createVisible = ref(false)
const keyword = ref('')
const sidebarCollapsed = ref(false)
const selectedId = ref<number | null>(null)
const selectedTemplateId = ref<number | null>(null)
const dashboardPage = ref(1)
const templatePage = ref(1)
const dashboardPageSize = 12
const templatePageSize = 8
const form = reactive({ name: '' })

const getCoverUrl = (d: Dashboard) => normalizeCoverConfig(parseReportConfig(d.configJson).cover).url

const selectedDashboard = computed(() =>
  selectedId.value ? publishedDashboards.value.find(d => d.id === selectedId.value) ?? null : null
)

const selectedScreenTemplate = computed(() =>
  selectedTemplateId.value ? screenTemplates.value.find(d => d.id === selectedTemplateId.value) ?? null : null
)

const loadPublishedDashboards = async () => {
  dashboardLoading.value = true
  try {
    const pageData = await getDashboardPage({
      page: dashboardPage.value,
      pageSize: dashboardPageSize,
      keyword: keyword.value.trim() || undefined,
      scene: 'dashboard',
      publishStatus: 'PUBLISHED',
    })
    publishedDashboards.value = pageData.items
    dashboardTotal.value = pageData.total
    const maxPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize))
    if (dashboardPage.value > maxPage) {
      dashboardPage.value = maxPage
    }
  } finally {
    dashboardLoading.value = false
  }
}

const loadScreenTemplates = async () => {
  templateLoading.value = true
  try {
    const pageData = await getDashboardPage({
      page: templatePage.value,
      pageSize: templatePageSize,
      scene: 'screen',
      publishStatus: 'PUBLISHED',
    })
    screenTemplates.value = pageData.items
    templateTotal.value = pageData.total
    const maxPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize))
    if (templatePage.value > maxPage) {
      templatePage.value = maxPage
    }
  } finally {
    templateLoading.value = false
  }
}

// 自动选中当前页第一个已发布仪表板
watch(publishedDashboards, (list) => {
  if (list.length && (!selectedId.value || !list.find(d => d.id === selectedId.value))) {
    selectedId.value = list[0].id
    selectedTemplateId.value = null
  }
  if (!list.length && selectedId.value !== null) {
    selectedId.value = null
  }
}, { immediate: true })

watch(
  () => [keyword.value.trim(), dashboardPage.value] as const,
  ([nextKeyword, nextPage], previous) => {
    const prevKeyword = previous?.[0] ?? nextKeyword
    if (nextKeyword !== prevKeyword && nextPage !== 1) {
      dashboardPage.value = 1
      return
    }
    loadPublishedDashboards()
  },
  { immediate: true }
)

watch(
  () => templatePage.value,
  () => {
    loadScreenTemplates()
  },
  { immediate: true }
)

const selectDashboard = (db: Dashboard) => {
  selectedId.value = db.id
  selectedTemplateId.value = null
}

const selectScreenTemplate = (scr: Dashboard) => {
  selectedTemplateId.value = scr.id
  selectedId.value = null
}

const openCreate = () => {
  form.name = ''
  createVisible.value = true
}

const handleCreate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入仪表板名称')
    return
  }
  saving.value = true
  try {
    const d = await createDashboard({ name: form.name.trim(), configJson: buildReportConfig(null, 'dashboard') })
    createVisible.value = false
    ElMessage.success('创建成功，即将进入编辑页面')
    router.push(`/home/dashboard/edit/${d.id}`)
  } finally {
    saving.value = false
  }
}

const useScreenTemplate = async (scr: Dashboard) => {
  const name = `${scr.name} - 副本`
  saving.value = true
  try {
    const d = await createDashboard({ name, configJson: buildReportConfig(null, 'dashboard') })
    ElMessage.success('已基于大屏模板创建，即将进入编辑页面')
    router.push(`/home/dashboard/edit/${d.id}`)
  } finally {
    saving.value = false
  }
}

const previewScreen = (scr: Dashboard) => {
  window.open(`/preview/screen/${scr.id}`, '_blank')
}

const openEditor = () => {
  if (selectedId.value) router.push(`/home/dashboard/edit/${selectedId.value}`)
}

const openPreview = () => {
  if (selectedId.value) window.open(`/preview/dashboard/${selectedId.value}`, '_blank')
}

const openFullscreen = () => {
  if (selectedId.value) window.open(`/preview/dashboard/${selectedId.value}`, '_blank')
}
</script>

<style scoped>
.dashboard-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  overflow: hidden;
}

.dashboard-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* ---- 左侧面板 ---- */
.left-panel {
  width: 260px;
  min-width: 260px;
  background: #fff;
  border-right: 1px solid #e8edf2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.25s ease, min-width 0.25s ease;
}

.left-panel--collapsed {
  width: 0;
  min-width: 0;
  border-right: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 10px;
  border-bottom: 1px solid #eef1f5;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2b3a;
}

.panel-header-actions {
  display: flex;
  gap: 4px;
}

.panel-search {
  padding: 8px 12px;
}

.panel-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  border-bottom: 1px solid #f0f2f5;
}

.panel-list-label {
  font-size: 13px;
  color: #8a9ab5;
}

.panel-list-action {
  cursor: pointer;
  color: #8a9ab5;
  font-size: 14px;
}

.panel-list-action:hover {
  color: var(--el-color-primary);
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.panel-pagination {
  display: flex;
  justify-content: center;
  padding: 8px 12px 12px;
  border-top: 1px solid #f0f2f5;
}

.panel-pagination--templates {
  border-top: none;
  padding-top: 4px;
}

.panel-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.panel-item:hover {
  background: #f4f7fb;
}

.panel-item--active {
  background: #e8f0fe;
  color: var(--el-color-primary);
}

.panel-item-icon {
  font-size: 16px;
  color: #5a7a9e;
  flex-shrink: 0;
}

.panel-item--active .panel-item-icon {
  color: var(--el-color-primary);
}

.panel-item-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.panel-item--active .panel-item-name {
  font-weight: 600;
  color: var(--el-color-primary);
}

.panel-item-del {
  font-size: 14px;
  color: #c0c4cc;
  opacity: 0;
  transition: opacity 0.15s;
  cursor: pointer;
  flex-shrink: 0;
}

.panel-item:hover .panel-item-del {
  opacity: 1;
}

.panel-item-del:hover {
  color: var(--el-color-danger);
}

.panel-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #b0b8c8;
}

/* ---- 面板区块标题 ---- */
.panel-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px 4px;
  border-top: 1px solid #f0f2f5;
}

.panel-section-icon {
  font-size: 14px;
  color: #8a9ab5;
}

.panel-section-label {
  font-size: 12px;
  font-weight: 600;
  color: #8a9ab5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-list--templates {
  flex: none;
  max-height: 200px;
  overflow-y: auto;
}

.panel-item--template .panel-item-icon {
  color: #e6a23c;
}

/* ---- 模板预览 ---- */
.template-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #f5f7fa;
  gap: 24px;
}

.template-cover {
  max-width: 800px;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

.template-cover img {
  width: 100%;
  display: block;
}

.template-info {
  background: #fff;
  border-radius: 12px;
  padding: 32px 40px;
  min-width: 400px;
  max-width: 600px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.template-info-item {
  padding: 10px 0;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #f0f2f5;
}

.template-info-item:last-child {
  border-bottom: none;
}

.template-label {
  font-weight: 600;
  color: #606266;
}

/* ---- 折叠按钮 ---- */
.collapse-toggle {
  position: absolute;
  left: v-bind("sidebarCollapsed ? '0px' : '256px'");
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 18px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e0e6ee;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  box-shadow: 2px 0 6px rgba(0,0,0,0.06);
  font-size: 12px;
  color: #8a9ab5;
  transition: left 0.25s ease;
}

.collapse-toggle:hover {
  color: var(--el-color-primary);
  background: #f0f5ff;
}

/* ---- 右侧内容 ---- */
.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e8edf2;
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbar-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2b3a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.toolbar-star {
  font-size: 16px;
  color: #c0c4cc;
  cursor: pointer;
}

.toolbar-star:hover {
  color: #e6a23c;
}

.toolbar-creator {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.content-preview {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.content-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
