<template>
  <div class="page-wrap">
    <TopNavBar active="screen" />
    <main class="page-main">
      <div class="list-header">
        <div class="list-title">
          <span class="list-title-text">数据大屏</span>
          <span class="list-subtitle">管理和设计数据可视化大屏</span>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建数据大屏</el-button>
      </div>

      <el-row v-loading="loading" :gutter="18" class="screen-grid">
        <el-col v-for="screen in screens" :key="screen.id" :xs="24" :sm="12" :md="8" :lg="6">
          <div class="screen-card" @click="openEditor(screen.id)">
            <div class="screen-card-thumb">
              <div class="screen-thumb-inner">
                <el-icon class="thumb-icon"><Monitor /></el-icon>
              </div>
              <div class="screen-card-status">
                <el-tag size="small" :type="publishState(screen) === '已发布' ? 'success' : 'info'">
                  {{ publishState(screen) }}
                </el-tag>
              </div>
            </div>
            <div class="screen-card-body">
              <div class="screen-card-name">{{ screen.name }}</div>
              <div class="screen-card-meta">
                <span>{{ countMap.get(screen.id) ?? 0 }} 个组件</span>
                <span>{{ formatDate(screen.createdAt) }}</span>
              </div>
              <div class="screen-card-actions" @click.stop>
                <el-button size="small" type="primary" plain @click="openEditor(screen.id)">编辑</el-button>
                <el-button size="small" plain @click="openPreview(screen.id)">预览</el-button>
                <el-popconfirm title="确认删除此大屏？" @confirm="handleDelete(screen.id)">
                  <template #reference>
                    <el-button size="small" type="danger" plain>删除</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </el-col>
        <el-col v-if="!loading && !screens.length" :span="24">
          <el-empty description="暂无数据大屏，点击右上角新建" :image-size="100" style="padding: 60px 0" />
        </el-col>
      </el-row>
    </main>

    <!-- 新建弹窗 -->
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
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Monitor, Plus } from '@element-plus/icons-vue'
import TopNavBar from '../components/TopNavBar.vue'
import {
  createDashboard,
  deleteDashboard,
  getDashboardComponents,
  getDashboardList,
  type Dashboard,
} from '../api/dashboard'
import { buildReportConfig, parseReportConfig } from '../utils/report-config'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const screens = ref<Dashboard[]>([])
const countMap = ref(new Map<number, number>())
const createVisible = ref(false)
const form = reactive({ name: '' })

const publishState = (screen: Dashboard) => {
  const cfg = parseReportConfig(screen.configJson)
  return cfg?.publish?.status === 'PUBLISHED' ? '已发布' : '草稿'
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadScreens = async () => {
  loading.value = true
  try {
    const list = await getDashboardList()
    screens.value = list
    const entries = await Promise.all(
      list.map(async (s) => [s.id, (await getDashboardComponents(s.id)).length] as const)
    )
    countMap.value = new Map(entries)
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
  screens.value = screens.value.filter((s) => s.id !== id)
  countMap.value.delete(id)
  ElMessage.success('已删除')
}

onMounted(loadScreens)
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background: #f0f2f5;
}

.page-main {
  padding: 20px 24px;
}

.list-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.list-title-text {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
}

.list-subtitle {
  font-size: 13px;
  color: #86909c;
  margin-left: 10px;
}

.screen-grid {
  min-height: 200px;
}

.screen-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  margin-bottom: 18px;
}

.screen-card:hover {
  box-shadow: 0 4px 16px rgba(28,120,255,0.16);
  transform: translateY(-2px);
}

.screen-card-thumb {
  position: relative;
  height: 140px;
  background: linear-gradient(135deg, #0d1b2a 0%, #1a2d4a 60%, #0e3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-thumb-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1.5px solid rgba(255,255,255,0.18);
}

.thumb-icon {
  font-size: 32px;
  color: rgba(255,255,255,0.7);
}

.screen-card-status {
  position: absolute;
  top: 10px;
  right: 10px;
}

.screen-card-body {
  padding: 14px 16px 12px;
}

.screen-card-name {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.screen-card-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #86909c;
  margin-bottom: 10px;
}

.screen-card-actions {
  display: flex;
  gap: 6px;
}
</style>
