<template>
  <div class="preview-page" :class="{ 'preview-page--screen': scene === 'screen' }">
    <template v-if="scene !== 'screen'">
      <header class="preview-toolbar">
        <div>
          <div class="toolbar-title">仪表板预览</div>
          <div class="toolbar-subtitle">只读查看、分享、查询联动与导出</div>
        </div>
        <div class="toolbar-actions">
          <el-button @click="goBack">返回</el-button>
          <el-button v-if="canShareLink" @click="copyShareLink">复制链接</el-button>
          <el-button type="primary" @click="printReport">打印 / PDF</el-button>
        </div>
      </header>

      <main class="preview-body">
        <el-alert
          v-if="dashboard && accessResult.allowed"
          class="preview-banner"
          :title="publishBannerTitle"
          type="success"
          :closable="false"
          show-icon
        />
        <el-result
          v-if="!loading && !accessResult.allowed"
          icon="warning"
          title="无法访问该报告"
          :sub-title="accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'"
        >
          <template #extra>
            <el-button @click="goBack">返回</el-button>
          </template>
        </el-result>
        <ReportPreviewCanvas
          v-else-if="dashboard && accessResult.allowed"
          :dashboard-id="dashboardId"
          :scene="scene"
          :access-mode="accessMode"
          :share-token="token"
        />
      </main>
    </template>

    <main v-else class="preview-screen-body">
      <el-result
        v-if="!loading && !accessResult.allowed"
        icon="warning"
        title="无法访问该大屏"
        :sub-title="accessResult.reason || '请检查发布状态、访问角色或分享链接是否正确'"
      >
        <template #extra>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-result>
      <ReportPreviewCanvas
        v-else-if="dashboard && accessResult.allowed"
        :dashboard-id="dashboardId"
        :scene="scene"
        :access-mode="accessMode"
        :share-token="token"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getDashboardById, type Dashboard } from '../api/dashboard'
import { getPublicDashboardById } from '../api/report'
import ReportPreviewCanvas from '../components/ReportPreviewCanvas.vue'
import { buildPublishedLink, canAccessPublishedReport, normalizePublishConfig, parseReportConfig } from '../utils/report-config'
import { getAuthRole, hasAuthSession } from '../utils/auth-session'

const route = useRoute()
const router = useRouter()

const dashboardId = computed(() => Number(route.params.id || 0))
const scene = computed<'dashboard' | 'screen'>(() => String(route.meta.scene) === 'screen' ? 'screen' : 'dashboard')
const dashboard = ref<Dashboard | null>(null)
const loading = ref(false)
const accessReason = ref('')

const localRole = computed(() => getAuthRole())
const hasSession = computed(() => hasAuthSession())
const token = computed(() => String(route.query.token || ''))
const accessMode = computed<'private' | 'public'>(() => token.value ? 'public' : 'private')
const publishConfig = computed(() => normalizePublishConfig(parseReportConfig(dashboard.value?.configJson).publish))
const shareLink = computed(() => dashboard.value
  ? buildPublishedLink(scene.value, dashboard.value.id, publishConfig.value.shareToken)
  : '')
const accessResult = computed(() => {
  if (accessMode.value === 'public') {
    return {
      allowed: Boolean(dashboard.value) && !accessReason.value,
      reason: accessReason.value,
    }
  }
  if (!dashboard.value) {
    return {
      allowed: false,
      reason: accessReason.value || '未找到对应报告',
    }
  }
  return canAccessPublishedReport({
    configJson: dashboard.value?.configJson,
    localRole: localRole.value,
    hasSession: hasSession.value,
    token: token.value,
  })
})
const canShareLink = computed(() => publishConfig.value.status === 'PUBLISHED')
const publishBannerTitle = computed(() => publishConfig.value.status === 'PUBLISHED'
  ? `当前为正式发布版本，允许角色：${publishConfig.value.allowedRoles.join(' / ')}`
  : '当前为内部草稿预览')

const loadDashboard = async () => {
  loading.value = true
  accessReason.value = ''
  try {
    if (accessMode.value === 'public') {
      dashboard.value = await getPublicDashboardById(dashboardId.value, token.value)
      return
    }
    if (!hasSession.value) {
      dashboard.value = null
      accessReason.value = '请先登录，或使用有效的分享链接访问该报告'
      return
    }
    dashboard.value = await getDashboardById(dashboardId.value)
  } catch (error) {
    dashboard.value = null
    accessReason.value = error instanceof Error ? error.message : '无法访问该报告'
  } finally {
    loading.value = false
  }
}

const copyShareLink = async () => {
  if (!canShareLink.value) {
    ElMessage.warning('该报告尚未正式发布')
    return
  }
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('分享链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制地址栏链接')
  }
}

const printReport = () => {
  window.print()
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(scene.value === 'screen' ? '/home/screen' : '/home/dashboard')
}

onMounted(() => {
  loadDashboard()
  if (route.query.autoprint === '1') {
    window.setTimeout(() => window.print(), 600)
  }
})

watch(dashboardId, loadDashboard)
watch([dashboardId, token], loadDashboard)
</script>

<style scoped>
.preview-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%);
}

.preview-page--screen {
  height: 100vh;
  overflow: hidden;
  background: #050b14;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid #dce8f5;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.toolbar-title {
  font-size: 18px;
  font-weight: 700;
  color: #183153;
}

.toolbar-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #71829b;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.preview-body {
  padding: 22px;
}

.preview-screen-body {
  height: 100vh;
}

.preview-page--screen .preview-screen-body :deep(.el-result) {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-banner {
  margin-bottom: 16px;
}

@media print {
  .preview-toolbar {
    display: none;
  }

  .preview-body {
    padding: 0;
  }
}

@media (max-width: 768px) {
  .preview-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>