<template>
  <div class="publish-display">
    <section class="display-summary">
      <article class="summary-card summary-card--lead">
        <div class="summary-card__label">可展示分组</div>
        <div class="summary-card__value">{{ groups.length }}</div>
        <div class="summary-card__meta">仅展示已经分配了已发布大屏的分组</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">分组内大屏</div>
        <div class="summary-card__value">{{ totalScreens }}</div>
        <div class="summary-card__meta">左侧列表只显示属于对应分组的 BI 大屏</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">当前分组</div>
        <div class="summary-card__value summary-card__value--sm">{{ currentGroup?.name || '未选择' }}</div>
        <div class="summary-card__meta">切换分组后右侧 iframe 会同步切换</div>
      </article>
    </section>

    <div v-loading="loading" class="display-shell panel-shell">
      <el-empty v-if="!loading && !groups.length" description="暂无已分配到分组的已发布大屏，请先在分组管理里完成分配。" class="display-empty" />

      <template v-else>
        <aside class="group-rail panel-card">
          <div class="rail-head">
            <div>
              <div class="rail-title">分组</div>
              <div class="rail-subtitle">按分组筛选可展示的大屏</div>
            </div>
          </div>

          <div class="group-rail__list">
            <button
              v-for="group in groups"
              :key="group.id"
              type="button"
              class="group-pill"
              :class="{ 'group-pill--active': currentGroup?.id === group.id }"
              @click="selectGroup(group.id)"
            >
              <div class="group-pill__name">{{ group.name }}</div>
              <div class="group-pill__meta">{{ group.screenCount }} 个已发布大屏</div>
            </button>
          </div>
        </aside>

        <aside class="screen-rail panel-card">
          <div class="rail-head">
            <div>
              <div class="rail-title">BI大屏</div>
              <div class="rail-subtitle">只显示分配到当前分组的大屏名称</div>
            </div>
            <el-tag size="small" type="success">{{ currentGroup?.screens.length || 0 }} 个</el-tag>
          </div>

          <div v-if="!currentGroup?.screens.length" class="screen-rail__empty">
            当前分组没有可展示的大屏
          </div>

          <div v-else class="screen-rail__list">
            <button
              v-for="screen in currentGroup.screens"
              :key="screen.id"
              type="button"
              class="screen-row"
              :class="{ 'screen-row--active': currentScreen?.id === screen.id }"
              @click="selectScreen(screen.id)"
            >
              <div class="screen-row__thumb" :style="screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined">
                <span v-if="!screen.coverUrl">BI</span>
              </div>
              <div class="screen-row__copy">
                <div class="screen-row__name">{{ screen.name }}</div>
                <div class="screen-row__meta">{{ formatDate(screen.publishedAt || screen.createdAt) || '发布时间待补充' }}</div>
              </div>
            </button>
          </div>
        </aside>

        <section class="preview-stage panel-card">
          <div class="preview-stage__toolbar">
            <div>
              <div class="preview-stage__title">{{ currentScreen?.name || '等待选择大屏' }}</div>
              <div class="preview-stage__subtitle">右侧直接以 iframe 方式加载已发布大屏，适配当前页面宽高。</div>
            </div>
            <div class="preview-stage__actions">
              <el-tag v-if="currentGroup" size="small" effect="plain">{{ currentGroup.name }}</el-tag>
              <el-button v-if="currentScreenUrl" size="small" @click="openInNewWindow">新窗口打开</el-button>
            </div>
          </div>

          <div class="preview-stage__canvas">
            <el-empty v-if="!currentScreen" description="请选择一个 BI 大屏进行展示" />

            <template v-else>
              <div v-if="iframeLoading" class="preview-stage__loading">
                正在加载 {{ currentScreen.name }} ...
              </div>
              <iframe
                :key="currentScreenUrl"
                class="preview-stage__iframe"
                :src="currentScreenUrl"
                title="BI大屏展示"
                loading="lazy"
                @load="iframeLoading = false"
              />
            </template>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDisplayPublishGroups, type PublishGroup } from '../api/publish'

const loading = ref(false)
const iframeLoading = ref(true)
const groups = ref<PublishGroup[]>([])
const selectedGroupId = ref<number | null>(null)
const selectedScreenId = ref<number | null>(null)

const currentGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? null)
const currentScreen = computed(() => currentGroup.value?.screens.find((screen) => screen.id === selectedScreenId.value) ?? null)
const totalScreens = computed(() => groups.value.reduce((sum, group) => sum + group.screens.length, 0))
const currentScreenUrl = computed(() => {
  if (!currentScreen.value) {
    return ''
  }
  const basePath = `/preview/screen/${currentScreen.value.id}`
  return currentScreen.value.shareToken
    ? `${basePath}?token=${encodeURIComponent(currentScreen.value.shareToken)}`
    : basePath
})

const selectGroup = (groupId: number) => {
  selectedGroupId.value = groupId
}

const selectScreen = (screenId: number) => {
  selectedScreenId.value = screenId
}

const loadGroups = async () => {
  loading.value = true
  try {
    groups.value = await getDisplayPublishGroups()
  } finally {
    loading.value = false
  }
}

const openInNewWindow = () => {
  if (!currentScreenUrl.value) {
    return
  }
  window.open(currentScreenUrl.value, '_blank', 'noopener,noreferrer')
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(groups, (nextGroups) => {
  if (!nextGroups.length) {
    selectedGroupId.value = null
    selectedScreenId.value = null
    return
  }
  if (!nextGroups.some((group) => group.id === selectedGroupId.value)) {
    selectedGroupId.value = nextGroups[0].id
  }
}, { immediate: true })

watch(currentGroup, (group) => {
  if (!group?.screens.length) {
    selectedScreenId.value = null
    return
  }
  if (!group.screens.some((screen) => screen.id === selectedScreenId.value)) {
    selectedScreenId.value = group.screens[0].id
  }
}, { immediate: true })

watch(currentScreenUrl, (nextUrl) => {
  iframeLoading.value = Boolean(nextUrl)
})

onMounted(() => {
  loadGroups().catch(() => {
    ElMessage.error('BI 发布展示数据加载失败')
  })
})
</script>

<style scoped>
.publish-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.display-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  border-radius: 22px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(214, 223, 234, 0.94);
  box-shadow: 0 16px 34px rgba(20, 54, 90, 0.08);
}

.summary-card--lead {
  background: linear-gradient(135deg, #15365f 0%, #1f6da8 62%, #28b39a 100%);
  color: #f7fbff;
  border-color: transparent;
}

.summary-card__label {
  font-size: 12px;
  opacity: 0.76;
}

.summary-card__value {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
}

.summary-card__value--sm {
  font-size: 22px;
  line-height: 1.4;
}

.summary-card__meta {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.8;
}

.panel-shell {
  flex: 1;
  min-height: 0;
}

.display-shell {
  display: grid;
  grid-template-columns: 250px 320px minmax(0, 1fr);
  gap: 16px;
}

.panel-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(209, 221, 233, 0.94);
  box-shadow: 0 18px 42px rgba(22, 60, 102, 0.08);
}

.group-rail,
.screen-rail,
.preview-stage {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.rail-head,
.preview-stage__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rail-title,
.preview-stage__title {
  font-size: 18px;
  font-weight: 700;
  color: #18324d;
}

.rail-subtitle,
.preview-stage__subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #72839a;
}

.group-rail__list,
.screen-rail__list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.group-pill,
.screen-row {
  width: 100%;
  border: 1px solid rgba(214, 224, 235, 0.96);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.group-pill:hover,
.screen-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(27, 74, 122, 0.1);
}

.group-pill--active,
.screen-row--active {
  border-color: rgba(33, 125, 240, 0.48);
  box-shadow: 0 18px 34px rgba(32, 113, 212, 0.16);
}

.group-pill__name,
.screen-row__name {
  font-size: 15px;
  font-weight: 700;
  color: #17324c;
}

.group-pill__meta,
.screen-row__meta {
  margin-top: 7px;
  font-size: 12px;
  color: #73849b;
}

.screen-row {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.screen-row__thumb {
  min-height: 68px;
  border-radius: 16px;
  background: linear-gradient(135deg, #143863 0%, #1f5b91 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  font-weight: 700;
}

.screen-rail__empty,
.display-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7c8ba0;
}

.preview-stage__actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.preview-stage__canvas {
  margin-top: 16px;
  flex: 1;
  min-height: 560px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(208, 221, 233, 0.94);
  background:
    linear-gradient(180deg, rgba(8, 23, 42, 0.96) 0%, rgba(10, 31, 55, 0.92) 100%),
    #071525;
  position: relative;
}

.preview-stage__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(234, 242, 250, 0.78);
  font-size: 14px;
  z-index: 1;
  background: rgba(7, 21, 37, 0.48);
  backdrop-filter: blur(4px);
}

.preview-stage__iframe {
  width: 100%;
  height: 100%;
  min-height: 560px;
  border: none;
  background: #071525;
}

@media (max-width: 1280px) {
  .display-shell {
    grid-template-columns: 230px 280px minmax(0, 1fr);
  }
}

@media (max-width: 1080px) {
  .display-summary {
    grid-template-columns: 1fr;
  }

  .display-shell {
    grid-template-columns: 1fr 1fr;
  }

  .preview-stage {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .display-shell {
    grid-template-columns: 1fr;
  }

  .group-rail,
  .screen-rail,
  .preview-stage {
    padding: 16px;
  }

  .preview-stage__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-stage__canvas,
  .preview-stage__iframe {
    min-height: 420px;
  }
}
</style>