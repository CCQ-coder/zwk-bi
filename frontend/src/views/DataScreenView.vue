<template>
  <div class="page-wrap">
    <TopNavBar active="screen" />

    <main class="page-main">
      <section class="hero-panel">
        <div>
          <div class="page-title">数据大屏</div>
          <div class="page-subtitle">统一查看封面、发布时间、组件规模和进入编辑器的主操作。</div>
        </div>

        <div class="hero-actions">
          <div class="hero-summary">
            <span>{{ totalScreens }} 个筛选结果</span>
            <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
            <span>{{ pageCoverReadyCount }} 个本页已生成封面</span>
          </div>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建数据大屏</el-button>
        </div>
      </section>

      <section class="toolbar-panel">
        <el-input v-model="keyword" placeholder="搜索大屏名称" clearable class="toolbar-search" />
        <el-select v-model="statusFilter" class="toolbar-select">
          <el-option label="全部状态" value="ALL" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="草稿" value="DRAFT" />
        </el-select>
      </section>

      <section v-loading="loading" class="screen-grid">
        <article v-for="screen in screens" :key="screen.id" class="screen-card" @click="openEditor(screen.id)">
          <div class="screen-card-thumb">
            <img v-if="coverUrl(screen)" :src="coverUrl(screen)" alt="大屏封面" class="screen-card-image" />
            <div v-else class="screen-thumb-empty">
              <el-icon class="thumb-icon"><Monitor /></el-icon>
              <span>未生成封面</span>
            </div>

            <div class="screen-card-status">
              <el-tag size="small" :type="publishState(screen) === 'PUBLISHED' ? 'success' : 'info'">
                {{ publishState(screen) === 'PUBLISHED' ? '已发布' : '草稿' }}
              </el-tag>
            </div>
          </div>

          <div class="screen-card-body">
            <div class="screen-card-head">
              <div>
                <div class="screen-card-name">{{ screen.name }}</div>
                <div class="screen-card-time">更新于 {{ formatDate(screen.createdAt) }}</div>
              </div>
              <div class="screen-card-canvas">{{ canvasLabel(screen) }}</div>
            </div>

            <div class="screen-card-meta">
              <span>{{ screen.componentCount ?? 0 }} 个组件</span>
              <span>{{ coverUrl(screen) ? '已配置封面' : '待生成封面' }}</span>
            </div>

            <div class="screen-card-actions" @click.stop>
              <el-button size="small" type="primary" plain @click="openEditor(screen.id)">进入编辑</el-button>
              <el-button size="small" plain @click="openPreview(screen.id)">预览</el-button>
              <el-popconfirm title="确认删除此大屏？" @confirm="handleDelete(screen.id)">
                <template #reference>
                  <el-button size="small" type="danger" plain>删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </article>

        <el-empty v-if="!loading && !screens.length" description="暂无符合条件的数据大屏，可直接新建或先在编辑器中生成封面" class="empty-state" />
      </section>

      <section v-if="totalScreens" class="pagination-panel">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="pageSizeOptions"
          :total="totalScreens"
        />
      </section>
    </main>

    <el-dialog v-model="createVisible" title="新建数据大屏" width="420px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入大屏名称" maxlength="50" show-word-limit />
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
import { Monitor, Plus } from '@element-plus/icons-vue'
import TopNavBar from '../components/TopNavBar.vue'
import {
  createDashboard,
  deleteDashboard,
  getDashboardPage,
  getDashboardList,
  type Dashboard,
} from '../api/dashboard'
import {
  buildReportConfig,
  normalizeCanvasConfig,
  normalizeCoverConfig,
  normalizePublishConfig,
  parseReportConfig,
  type PublishStatus,
} from '../utils/report-config'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const screens = ref<Dashboard[]>([])
const totalScreens = ref(0)
const createVisible = ref(false)
const keyword = ref('')
const statusFilter = ref<'ALL' | PublishStatus>('ALL')
const currentPage = ref(1)
const pageSize = ref(12)
const pageSizeOptions = [12, 24, 48]
const form = reactive({ name: '' })

const publishState = (screen: Dashboard): PublishStatus => {
  const cfg = parseReportConfig(screen.configJson)
  return normalizePublishConfig(cfg.publish).status
}

const coverUrl = (screen: Dashboard) => {
  const cfg = parseReportConfig(screen.configJson)
  return normalizeCoverConfig(cfg.cover).url
}

const canvasLabel = (screen: Dashboard) => {
  const cfg = parseReportConfig(screen.configJson)
  const canvas = normalizeCanvasConfig(cfg.canvas, 'screen')
  return `${canvas.width} × ${canvas.height}`
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalScreens.value / pageSize.value)))
const pageCoverReadyCount = computed(() => screens.value.filter((screen) => Boolean(coverUrl(screen))).length)

const formatDate = (iso: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadScreens = async () => {
  loading.value = true
  try {
    const pageData = await getDashboardPage({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      scene: 'screen',
      publishStatus: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
    })
    screens.value = pageData.items
    totalScreens.value = pageData.total
    const maxPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize))
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage
    }
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  form.name = ''
  createVisible.value = true
}

const handleCreate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入大屏名称')
    return
  }
  saving.value = true
  try {
    const screen = await createDashboard({ name: form.name.trim(), configJson: buildReportConfig(null, 'screen') })
    createVisible.value = false
    ElMessage.success('创建成功，即将跳转到编辑页面')
    router.push(`/home/screen/edit/${screen.id}`)
  } finally {
    saving.value = false
  }
}

const openEditor = (id: number) => {
  router.push(`/home/screen/edit/${id}`)
}

const openPreview = (id: number) => {
  window.open(`/preview/screen/${id}`, '_blank')
}

const handleDelete = async (id: number) => {
  await deleteDashboard(id)
  if (screens.value.length === 1 && currentPage.value > 1) {
    currentPage.value -= 1
  } else {
    await loadScreens()
  }
  ElMessage.success('已删除')
}

watch(
  () => [keyword.value.trim(), statusFilter.value, currentPage.value, pageSize.value] as const,
  ([nextKeyword, nextStatus, nextPage], previous) => {
    const prevKeyword = previous?.[0] ?? nextKeyword
    const prevStatus = previous?.[1] ?? nextStatus
    if ((nextKeyword !== prevKeyword || nextStatus !== prevStatus) && nextPage !== 1) {
      currentPage.value = 1
      return
    }
    loadScreens()
  }
  ,
  { immediate: true }
)
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef4fb 0%, #f6f9fc 48%, #edf3f8 100%);
}

.page-main {
  padding: 20px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-panel {
  border-radius: 26px;
  padding: 22px 24px;
  background: linear-gradient(135deg, #12345c 0%, #1e4f88 58%, #2d6db7 100%);
  color: #ffffff;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
}

.page-subtitle {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(224, 237, 255, 0.82);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hero-summary {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-summary span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
}

.toolbar-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar-search {
  max-width: 320px;
}

.toolbar-select {
  width: 140px;
}

.screen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  align-items: start;
}

.pagination-panel {
  display: flex;
  justify-content: flex-end;
}

.screen-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 22px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 14px 34px rgba(23, 45, 72, 0.08);
  border: 1px solid rgba(208, 220, 234, 0.92);
}

.screen-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(22, 63, 107, 0.14);
}

.screen-card-thumb {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #10243f 0%, #173964 62%, #234d81 100%);
}

.screen-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.screen-thumb-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.72);
}

.thumb-icon {
  font-size: 34px;
}

.screen-card-status {
  position: absolute;
  top: 12px;
  right: 12px;
}

.screen-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.screen-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.screen-card-name {
  font-size: 17px;
  font-weight: 700;
  color: #173255;
}

.screen-card-time,
.screen-card-meta {
  font-size: 13px;
  color: #6d85a2;
}

.screen-card-time {
  margin-top: 6px;
}

.screen-card-canvas {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef5ff;
  color: #2a5a94;
  font-size: 12px;
  white-space: nowrap;
}

.screen-card-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.screen-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 60px 0;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 22px;
  box-shadow: 0 12px 30px rgba(20, 44, 73, 0.06);
}

@media (max-width: 900px) {
  .page-main {
    padding: 14px;
  }

  .hero-panel,
  .toolbar-panel,
  .screen-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .toolbar-search,
  .toolbar-select {
    max-width: none;
    width: 100%;
  }
}
</style>
