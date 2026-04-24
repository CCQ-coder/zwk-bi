<template>
  <div class="publish-display">
    <div v-loading="loading" class="display-shell panel-shell">
      <el-empty v-if="!loading && !groups.length" description="暂无已分配到分组的已发布大屏，请先在分组管理里完成分配。" class="display-empty" />

      <template v-else>
        <aside class="display-sidebar panel-card" :style="sidebarStyle">
          <div class="display-sidebar__head">
            <div>
              <div class="display-sidebar__title">展示导航</div>
            </div>
            <el-tag size="small" type="primary">{{ currentScreen ? '已选大屏' : '待选择' }}</el-tag>
          </div>

          <div class="display-sidebar__sections">
            <section class="sidebar-section">
              <div class="sidebar-section__head">
                <div>
                  <div class="sidebar-section__title">分组</div>
                </div>
                <el-tag size="small" effect="plain">{{ groups.length }}</el-tag>
              </div>

              <div class="sidebar-section__list">
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
            </section>

            <section class="sidebar-section sidebar-section--screens">
              <div class="sidebar-section__head">
                <div>
                  <div class="sidebar-section__title">BI大屏</div>
                </div>
                <el-tag size="small" type="success">{{ currentGroup?.screens.length || 0 }}</el-tag>
              </div>

              <div v-if="!currentGroup?.screens.length" class="screen-rail__empty">
                当前分组没有可展示的大屏
              </div>

              <div v-else class="sidebar-section__list sidebar-section__list--screens">
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
            </section>
          </div>

          <div class="display-sidebar__resize" @mousedown.prevent="startSidebarResize" />
        </aside>

        <section class="preview-stage panel-card">
          <div class="preview-stage__toolbar">
            <div>
              <div class="preview-stage__title">{{ currentScreen?.name || '等待选择大屏' }}</div>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDisplayPublishGroups, type PublishGroup } from '../api/publish'

const loading = ref(false)
const iframeLoading = ref(true)
const groups = ref<PublishGroup[]>([])
const selectedGroupId = ref<number | null>(null)
const selectedScreenId = ref<number | null>(null)
const sidebarWidth = ref(332)
let stopSidebarResize: (() => void) | null = null

const currentGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? null)
const currentScreen = computed(() => currentGroup.value?.screens.find((screen) => screen.id === selectedScreenId.value) ?? null)
const sidebarStyle = computed(() => ({ width: `${sidebarWidth.value}px` }))
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

const startSidebarResize = (event: MouseEvent) => {
  if (window.innerWidth <= 960) {
    return
  }
  const startX = event.clientX
  const startWidth = sidebarWidth.value
  const handleMouseMove = (moveEvent: MouseEvent) => {
    const nextWidth = startWidth + (moveEvent.clientX - startX)
    sidebarWidth.value = Math.min(420, Math.max(280, nextWidth))
  }
  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    stopSidebarResize = null
  }
  stopSidebarResize = handleMouseUp
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
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

onBeforeUnmount(() => {
  stopSidebarResize?.()
})
</script>

<style scoped>
.publish-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(209, 221, 233, 0.94);
  box-shadow: 0 12px 28px rgba(22, 60, 102, 0.06);
}

.panel-shell {
  flex: 1;
  min-height: 0;
}

.display-shell {
  display: flex;
  gap: 12px;
}

.display-sidebar,
.preview-stage {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.display-sidebar {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
  background: linear-gradient(180deg, #152436 0%, #1b2d43 100%);
  border-color: rgba(118, 154, 191, 0.18);
  box-shadow: 0 16px 34px rgba(11, 25, 40, 0.16);
}

.display-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(184, 208, 233, 0.1);
}

.preview-stage__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(214, 225, 236, 0.9);
}

.display-sidebar__title {
  font-size: 16px;
  font-weight: 700;
  color: #f3f7fd;
}

.preview-stage__title {
  font-size: 16px;
  font-weight: 700;
  color: #18324d;
}

.display-sidebar__sections {
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: 12px;
}

.sidebar-section {
  min-height: 0;
  border-radius: 14px;
  border: 1px solid rgba(184, 208, 233, 0.08);
  background: rgba(8, 18, 30, 0.2);
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.sidebar-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar-section__title {
  font-size: 14px;
  font-weight: 700;
  color: #eff5fd;
}

.sidebar-section__list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.sidebar-section__list--screens {
  margin-top: 10px;
}

.group-pill,
.screen-row {
  width: 100%;
  position: relative;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.group-pill::before,
.screen-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 2px;
  height: 0;
  transform: translateY(-50%);
  border-radius: 999px;
  background: #6ea8eb;
  opacity: 0;
  transition: height 0.18s ease, opacity 0.18s ease;
}

.group-pill:hover,
.screen-row:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(184, 208, 233, 0.08);
}

.group-pill--active,
.screen-row--active {
  border-color: rgba(106, 157, 226, 0.18);
  background: rgba(47, 99, 164, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.group-pill--active::before,
.screen-row--active::before {
  height: 22px;
  opacity: 1;
}

.group-pill__name,
.screen-row__name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(244, 248, 253, 0.94);
}

.group-pill__meta,
.screen-row__meta {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(191, 210, 231, 0.66);
}

.group-pill--active .group-pill__name,
.screen-row--active .screen-row__name {
  color: #70b2ff;
}

.screen-row {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.display-sidebar__resize {
  position: absolute;
  top: 14px;
  right: -9px;
  width: 18px;
  height: calc(100% - 28px);
  cursor: col-resize;
}

.display-sidebar__resize::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 7px;
  width: 3px;
  height: 64px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(106, 157, 226, 0.06) 0%, rgba(106, 157, 226, 0.24) 100%);
}

.screen-row__thumb {
  min-height: 54px;
  border-radius: 12px;
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
  color: rgba(196, 214, 234, 0.68);
}

.preview-stage__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.preview-stage__canvas {
  margin-top: 12px;
  flex: 1;
  min-height: 520px;
  border-radius: 16px;
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
  min-height: 520px;
  border: none;
  background: #071525;
}

@media (max-width: 1080px) {
  .display-shell {
    flex-direction: column;
  }

  .display-sidebar {
    width: 100% !important;
  }

  .display-sidebar__resize {
    display: none;
  }

  .display-sidebar__sections {
    grid-template-rows: none;
  }
}

@media (max-width: 720px) {
  .display-sidebar,
  .preview-stage {
    padding: 12px;
  }

  .preview-stage__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-stage__canvas,
  .preview-stage__iframe {
    min-height: 400px;
  }
}
</style>