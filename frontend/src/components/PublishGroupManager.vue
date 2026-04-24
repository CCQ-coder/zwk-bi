<template>
  <div class="group-manager">
    <section class="stats-row">
      <article class="stat-card stat-card--accent">
        <div class="stat-card__label">分组总数</div>
        <div class="stat-card__value">{{ groups.length }}</div>
        <div class="stat-card__meta">已建立的发布分组目录</div>
      </article>
      <article class="stat-card">
        <div class="stat-card__label">显示中分组</div>
        <div class="stat-card__value">{{ visibleGroupCount }}</div>
        <div class="stat-card__meta">会在 BI 面板展示页中出现</div>
      </article>
      <article class="stat-card">
        <div class="stat-card__label">已发布大屏</div>
        <div class="stat-card__value">{{ screenOptions.length }}</div>
        <div class="stat-card__meta">可被分配到分组的大屏数量</div>
      </article>
      <article class="stat-card">
        <div class="stat-card__label">已分配大屏</div>
        <div class="stat-card__value">{{ assignedScreenCount }}</div>
        <div class="stat-card__meta">当前已挂到分组下的已发布大屏</div>
      </article>
    </section>

    <div class="workspace">
      <div class="group-list-shell" :style="listPanelStyle">
        <aside class="group-list-panel panel-card">
          <div class="panel-head">
            <div>
              <div class="panel-title">分组目录</div>
            </div>
            <el-button type="primary" :icon="Plus" @click="startCreate">新建分组</el-button>
          </div>

          <el-input v-model="groupKeyword" :prefix-icon="Search" placeholder="搜索分组名称" clearable class="panel-search" />

          <el-scrollbar class="group-list-scroll">
            <div class="group-list">
              <button
                v-for="group in filteredGroups"
                :key="group.id"
                type="button"
                class="group-item"
                :class="{ 'group-item--active': selectedGroupId === group.id && !creating }"
                @click="selectGroup(group.id)"
              >
                <div class="group-item__head">
                  <span class="group-item__name">{{ group.name }}</span>
                  <el-tag size="small" :type="group.visible ? 'success' : 'info'">{{ group.visible ? '显示' : '隐藏' }}</el-tag>
                </div>
                <div class="group-item__meta">{{ group.screenCount }} 个大屏 · 排序 {{ group.sort }}</div>
                <div v-if="group.description" class="group-item__desc">{{ group.description }}</div>
              </button>

              <el-empty v-if="!loading && !filteredGroups.length" description="暂无匹配分组" />
            </div>
          </el-scrollbar>

          <div class="group-list-panel__foot">拖拽右侧边缘可调整目录栏宽度</div>
        </aside>
        <div class="group-list-shell__resize" @mousedown.prevent="startListPanelResize" />
      </div>

      <section class="group-detail">
        <div v-loading="loading" class="detail-stack">
          <section class="panel-card detail-card">
            <div class="panel-head panel-head--detail">
              <div>
                <div class="panel-title">{{ persistedGroupId ? '编辑分组' : '新建分组' }}</div>
              </div>
              <div class="detail-chip">{{ persistedGroupId ? '已存在分组' : '草稿分组' }}</div>
            </div>

            <el-form :model="groupForm" label-position="top" class="group-form">
              <div class="group-form__grid">
                <el-form-item label="分组名称" required>
                  <el-input v-model="groupForm.name" maxlength="40" show-word-limit placeholder="例如 门店经营 / 区域战报" />
                </el-form-item>
                <el-form-item label="排序">
                  <el-input-number v-model="groupForm.sort" :min="1" :max="999" controls-position="right" style="width: 100%" />
                </el-form-item>
              </div>
              <el-form-item label="分组描述">
                <el-input v-model="groupForm.description" type="textarea" :rows="3" maxlength="120" show-word-limit placeholder="描述这个分组面向的场景或人群" />
              </el-form-item>
              <div class="group-form__foot">
                <el-switch v-model="groupForm.visible" active-text="展示页可见" inactive-text="展示页隐藏" />
                <div class="group-form__actions">
                  <el-button @click="resetEditor">重置</el-button>
                  <el-button type="primary" :loading="groupSaving" @click="saveGroup">保存分组</el-button>
                  <el-button v-if="persistedGroupId" type="danger" plain @click="removeGroup">删除分组</el-button>
                </div>
              </div>
            </el-form>
          </section>

          <section class="panel-card detail-card">
            <div class="panel-head panel-head--detail">
              <div>
                <div class="panel-title">分配已发布大屏</div>
              </div>
              <el-tag size="small" type="warning">已选 {{ assignedScreenIds.length }} 个</el-tag>
            </div>

            <template v-if="!persistedGroupId">
              <div class="placeholder-card">
                <el-icon><CollectionTag /></el-icon>
                <span>请先保存分组，再进行大屏分配。</span>
              </div>
            </template>
            <template v-else>
              <div class="screen-toolbar">
                <el-input v-model="screenKeyword" :prefix-icon="Search" placeholder="搜索已发布大屏" clearable />
                <div class="screen-toolbar__info">
                  <span v-if="movingScreenCount">将迁移 {{ movingScreenCount }} 个来自其他分组的大屏</span>
                  <span v-else>当前选择不会影响其他分组</span>
                </div>
              </div>

              <div v-if="!filteredScreenOptions.length" class="placeholder-card placeholder-card--compact">
                <el-icon><Tickets /></el-icon>
                <span>暂无已发布大屏，先去数据大屏页完成发布。</span>
              </div>

              <div v-else class="screen-options-grid">
                <button
                  v-for="screen in filteredScreenOptions"
                  :key="screen.id"
                  type="button"
                  class="screen-option"
                  :class="{
                    'screen-option--active': assignedScreenIds.includes(screen.id),
                    'screen-option--occupied': screen.groupId && screen.groupId !== persistedGroupId,
                  }"
                  @click="toggleScreen(screen.id)"
                >
                  <div class="screen-option__thumb" :style="screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined">
                    <span v-if="!screen.coverUrl">{{ screen.name.slice(0, 2) }}</span>
                  </div>
                  <div class="screen-option__copy">
                    <div class="screen-option__name">{{ screen.name }}</div>
                    <div class="screen-option__meta">{{ formatDate(screen.publishedAt || screen.createdAt) || '发布时间待补充' }}</div>
                    <div class="screen-option__tags">
                      <el-tag v-if="screen.groupId === persistedGroupId" size="small" type="success">当前分组</el-tag>
                      <el-tag v-else-if="screen.groupId" size="small" type="warning">原分组 {{ screen.groupName }}</el-tag>
                      <el-tag v-else size="small" effect="plain">未分配</el-tag>
                    </div>
                  </div>
                </button>
              </div>

              <div class="assignment-actions">
                <el-button @click="restoreAssignments">恢复已保存分配</el-button>
                <el-button type="primary" :loading="assignmentSaving" @click="saveAssignments">保存分配</el-button>
              </div>
            </template>
          </section>

          <section class="panel-card detail-card">
            <div class="panel-head panel-head--detail">
              <div>
                <div class="panel-title">当前分组预览</div>
              </div>
            </div>

            <div v-if="!previewScreens.length" class="placeholder-card placeholder-card--compact">
              <el-icon><FolderOpened /></el-icon>
              <span>{{ persistedGroupId ? '当前分组下还没有已分配大屏。' : '保存分组后可查看当前预览。' }}</span>
            </div>

            <div v-else class="preview-grid">
              <article v-for="screen in previewScreens" :key="screen.id" class="preview-card">
                <div class="preview-card__thumb" :style="screen.coverUrl ? { backgroundImage: `url(${screen.coverUrl})` } : undefined">
                  <span v-if="!screen.coverUrl">BI</span>
                </div>
                <div class="preview-card__copy">
                  <div class="preview-card__name">{{ screen.name }}</div>
                  <div class="preview-card__meta">{{ formatDate(screen.publishedAt || screen.createdAt) || '时间未记录' }}</div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CollectionTag, FolderOpened, Plus, Search, Tickets } from '@element-plus/icons-vue'
import {
  createPublishGroup,
  deletePublishGroup,
  getManagePublishGroups,
  getPublishedScreenOptions,
  updatePublishGroup,
  updatePublishGroupScreens,
  type PublishGroup,
  type PublishedScreenSummary,
} from '../api/publish'

const loading = ref(false)
const groupSaving = ref(false)
const assignmentSaving = ref(false)
const groups = ref<PublishGroup[]>([])
const screenOptions = ref<PublishedScreenSummary[]>([])
const groupKeyword = ref('')
const screenKeyword = ref('')
const selectedGroupId = ref<number | null>(null)
const creating = ref(false)
const assignedScreenIds = ref<number[]>([])
const listPanelWidth = ref(324)
let stopListPanelResize: (() => void) | null = null
const groupForm = reactive({
  name: '',
  description: '',
  sort: 100,
  visible: true,
})

const selectedGroup = computed(() => groups.value.find((group) => group.id === selectedGroupId.value) ?? null)
const persistedGroupId = computed(() => creating.value ? null : selectedGroup.value?.id ?? null)
const filteredGroups = computed(() => {
  const keyword = groupKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return groups.value
  }
  return groups.value.filter((group) => {
    return group.name.toLowerCase().includes(keyword)
      || group.description.toLowerCase().includes(keyword)
  })
})

const filteredScreenOptions = computed(() => {
  const keyword = screenKeyword.value.trim().toLowerCase()
  const list = [...screenOptions.value].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  if (!keyword) {
    return list
  }
  return list.filter((screen) => screen.name.toLowerCase().includes(keyword))
})

const screenOptionMap = computed(() => {
  const map = new Map<number, PublishedScreenSummary>()
  screenOptions.value.forEach((screen) => map.set(screen.id, screen))
  return map
})

const previewScreens = computed(() => {
  if (!persistedGroupId.value) {
    return assignedScreenIds.value.map((id) => screenOptionMap.value.get(id)).filter(Boolean) as PublishedScreenSummary[]
  }
  return assignedScreenIds.value.map((id) => screenOptionMap.value.get(id)).filter(Boolean) as PublishedScreenSummary[]
})

const visibleGroupCount = computed(() => groups.value.filter((group) => group.visible).length)
const assignedScreenCount = computed(() => screenOptions.value.filter((screen) => screen.groupId !== null).length)
const movingScreenCount = computed(() => assignedScreenIds.value.filter((id) => {
  const screen = screenOptionMap.value.get(id)
  return Boolean(screen?.groupId && screen.groupId !== persistedGroupId.value)
}).length)
const listPanelStyle = computed(() => ({ width: `${listPanelWidth.value}px` }))

const startListPanelResize = (event: MouseEvent) => {
  if (window.innerWidth <= 960) {
    return
  }
  const startX = event.clientX
  const startWidth = listPanelWidth.value
  const handleMouseMove = (moveEvent: MouseEvent) => {
    const nextWidth = startWidth + (moveEvent.clientX - startX)
    listPanelWidth.value = Math.min(420, Math.max(280, nextWidth))
  }
  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    stopListPanelResize = null
  }
  stopListPanelResize = handleMouseUp
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const applyGroup = (group: PublishGroup | null) => {
  if (!group) {
    groupForm.name = ''
    groupForm.description = ''
    groupForm.sort = 100
    groupForm.visible = true
    assignedScreenIds.value = []
    return
  }
  groupForm.name = group.name
  groupForm.description = group.description || ''
  groupForm.sort = group.sort ?? 100
  groupForm.visible = group.visible !== false
  assignedScreenIds.value = group.screens.map((screen) => screen.id)
}

const selectGroup = (groupId: number) => {
  creating.value = false
  selectedGroupId.value = groupId
  applyGroup(groups.value.find((group) => group.id === groupId) ?? null)
}

const startCreate = () => {
  creating.value = true
  selectedGroupId.value = null
  applyGroup(null)
}

const restoreAssignments = () => {
  assignedScreenIds.value = selectedGroup.value?.screens.map((screen) => screen.id) ?? []
}

const resetEditor = () => {
  if (creating.value) {
    applyGroup(null)
    return
  }
  applyGroup(selectedGroup.value)
}

const toggleScreen = (screenId: number) => {
  if (!persistedGroupId.value) {
    return
  }
  assignedScreenIds.value = assignedScreenIds.value.includes(screenId)
    ? assignedScreenIds.value.filter((id) => id !== screenId)
    : [...assignedScreenIds.value, screenId]
}

const loadData = async (preferredGroupId?: number | null) => {
  loading.value = true
  try {
    const [groupList, screens] = await Promise.all([
      getManagePublishGroups(),
      getPublishedScreenOptions(),
    ])
    groups.value = groupList
    screenOptions.value = screens

    if (preferredGroupId && groupList.some((group) => group.id === preferredGroupId)) {
      selectGroup(preferredGroupId)
      return
    }
    if (!creating.value && selectedGroupId.value && groupList.some((group) => group.id === selectedGroupId.value)) {
      selectGroup(selectedGroupId.value)
      return
    }
    if (!creating.value && groupList.length) {
      selectGroup(groupList[0].id)
      return
    }
    if (!groupList.length) {
      startCreate()
    }
  } finally {
    loading.value = false
  }
}

const saveGroup = async () => {
  const payload = {
    name: groupForm.name.trim(),
    description: groupForm.description.trim(),
    sort: Number(groupForm.sort || 100),
    visible: groupForm.visible,
  }
  if (!payload.name) {
    ElMessage.warning('请输入分组名称')
    return
  }

  groupSaving.value = true
  try {
    const saved = persistedGroupId.value
      ? await updatePublishGroup(persistedGroupId.value, payload)
      : await createPublishGroup(payload)
    creating.value = false
    ElMessage.success(persistedGroupId.value ? '分组已更新' : '分组已创建')
    await loadData(saved.id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分组保存失败')
  } finally {
    groupSaving.value = false
  }
}

const saveAssignments = async () => {
  if (!persistedGroupId.value) {
    ElMessage.warning('请先保存分组')
    return
  }
  assignmentSaving.value = true
  try {
    await updatePublishGroupScreens(persistedGroupId.value, assignedScreenIds.value)
    ElMessage.success('分组大屏分配已更新')
    await loadData(persistedGroupId.value)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分配保存失败')
  } finally {
    assignmentSaving.value = false
  }
}

const removeGroup = async () => {
  if (!persistedGroupId.value || !selectedGroup.value) {
    return
  }
  try {
    await ElMessageBox.confirm(`删除分组“${selectedGroup.value.name}”后，分配关系会一并清空，是否继续？`, '删除分组', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deletePublishGroup(persistedGroupId.value)
    ElMessage.success('分组已删除')
    creating.value = false
    selectedGroupId.value = null
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '删除分组失败')
    }
  }
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

onMounted(() => {
  loadData().catch(() => {
    ElMessage.error('发布分组数据加载失败')
  })
})

onBeforeUnmount(() => {
  stopListPanelResize?.()
})
</script>

<style scoped>
.group-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  border-radius: 22px;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(214, 223, 234, 0.92);
  box-shadow: 0 16px 34px rgba(20, 54, 90, 0.08);
}

.stat-card--accent {
  background: linear-gradient(135deg, #0f3e73 0%, #1666ad 60%, #2fa6c1 100%);
  color: #f7fbff;
  border-color: transparent;
}

.stat-card__label {
  font-size: 12px;
  color: inherit;
  opacity: 0.74;
}

.stat-card__value {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
}

.stat-card__meta {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: inherit;
  opacity: 0.78;
}

.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
}

.panel-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(209, 221, 233, 0.94);
  box-shadow: 0 18px 42px rgba(22, 60, 102, 0.08);
}

.group-list-shell {
  position: relative;
  flex: 0 0 auto;
  min-height: 0;
}

.group-list-panel {
  height: 100%;
  min-height: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(17, 33, 53, 0.98) 0%, rgba(23, 46, 73, 0.98) 48%, rgba(28, 56, 88, 0.96) 100%),
    linear-gradient(135deg, #20354a 0%, #314a63 100%);
  border-color: rgba(118, 154, 191, 0.18);
  box-shadow:
    0 28px 60px rgba(11, 25, 40, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.group-list-panel::before {
  content: '';
  position: absolute;
  inset: -20% auto auto -20%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(80, 137, 205, 0.18) 0%, rgba(80, 137, 205, 0) 72%);
  pointer-events: none;
}

.group-list-panel__foot {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(196, 214, 234, 0.62);
}

.group-list-shell__resize {
  position: absolute;
  top: 18px;
  right: -9px;
  width: 18px;
  height: calc(100% - 36px);
  cursor: col-resize;
}

.group-list-shell__resize::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 7px;
  width: 4px;
  height: 74px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(106, 157, 226, 0.08) 0%, rgba(106, 157, 226, 0.34) 100%);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head--detail {
  align-items: center;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #18324d;
}

.panel-subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #72839a;
}

.panel-search {
  margin-top: 14px;
}

.group-list-panel .panel-head {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(184, 208, 233, 0.12);
}

.group-list-panel .panel-title {
  color: #f3f7fd;
}

.group-list-panel .panel-subtitle {
  color: rgba(196, 214, 234, 0.72);
}

.group-list-panel :deep(.el-input__wrapper) {
  background: rgba(8, 18, 30, 0.26);
  box-shadow: inset 0 0 0 1px rgba(184, 208, 233, 0.12);
}

.group-list-panel :deep(.el-input__inner) {
  color: #eff5fd;
}

.group-list-panel :deep(.el-input__inner::placeholder) {
  color: rgba(191, 210, 231, 0.48);
}

.group-list-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 14px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item {
  width: 100%;
  position: relative;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.group-item::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 50%;
  width: 3px;
  height: 0;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, #72b6ff 0%, #3f86ff 100%);
  opacity: 0;
  transition: height 0.18s ease, opacity 0.18s ease;
}

.group-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(184, 208, 233, 0.1);
}

.group-item--active {
  border-color: rgba(106, 157, 226, 0.24);
  background: linear-gradient(180deg, rgba(11, 20, 32, 0.68) 0%, rgba(16, 31, 48, 0.92) 100%);
  box-shadow: 0 12px 24px rgba(7, 15, 26, 0.22);
}

.group-item--active::before {
  height: 34px;
  opacity: 1;
}

.group-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.group-item__name {
  font-size: 15px;
  font-weight: 700;
  color: rgba(244, 248, 253, 0.94);
}

.group-item__meta,
.group-item__desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(191, 210, 231, 0.66);
}

.group-item--active .group-item__name {
  color: #70b2ff;
}

.group-detail {
  flex: 1;
  min-height: 0;
}

.detail-stack {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-card {
  padding: 18px 20px;
}

.detail-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(20, 88, 168, 0.08);
  color: #1458a8;
  font-size: 12px;
  font-weight: 600;
}

.group-form {
  margin-top: 16px;
}

.group-form__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 14px;
}

.group-form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.group-form__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.screen-toolbar {
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 320px) 1fr;
  gap: 14px;
  align-items: center;
}

.screen-toolbar__info {
  font-size: 12px;
  color: #7a8a9f;
}

.screen-options-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.screen-option {
  border: 1px solid rgba(211, 223, 235, 0.94);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  padding: 14px;
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.screen-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(20, 63, 105, 0.12);
}

.screen-option--active {
  border-color: rgba(26, 132, 99, 0.48);
  box-shadow: 0 16px 30px rgba(27, 145, 109, 0.15);
}

.screen-option--occupied {
  background: linear-gradient(180deg, #fffaf5 0%, #fffdf9 100%);
}

.screen-option__thumb,
.preview-card__thumb {
  border-radius: 16px;
  background: linear-gradient(135deg, #143863 0%, #1f5b91 100%);
  background-size: cover;
  background-position: center;
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  font-weight: 700;
}

.screen-option__name,
.preview-card__name {
  font-size: 14px;
  font-weight: 700;
  color: #17314c;
}

.screen-option__meta,
.preview-card__meta {
  margin-top: 7px;
  font-size: 12px;
  color: #73849b;
}

.screen-option__tags {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.assignment-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.placeholder-card {
  margin-top: 18px;
  min-height: 160px;
  border-radius: 20px;
  border: 1px dashed rgba(182, 200, 220, 0.88);
  background: rgba(245, 249, 253, 0.86);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #7890a7;
}

.placeholder-card :deep(svg) {
  font-size: 24px;
}

.placeholder-card--compact {
  min-height: 112px;
}

.preview-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

.preview-card {
  border-radius: 18px;
  border: 1px solid rgba(214, 225, 236, 0.94);
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  padding: 12px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
}

.preview-card__thumb {
  min-height: 68px;
}

@media (max-width: 1280px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .workspace {
    flex-direction: column;
  }

  .group-list-shell {
    width: 100% !important;
  }

  .group-list-shell__resize {
    display: none;
  }

  .group-form__grid,
  .screen-toolbar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .group-list-panel,
  .detail-card {
    padding: 16px;
  }

  .screen-options-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .group-form__foot,
  .assignment-actions {
    align-items: stretch;
    justify-content: stretch;
    flex-direction: column;
  }

  .group-form__actions {
    justify-content: stretch;
  }
}
</style>