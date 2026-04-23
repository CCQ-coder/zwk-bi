<template>
  <div class="page-wrap">
    <TopNavBar active="publish" />

    <main class="page-main">
      <section class="publish-hero">
        <div>
          <div class="publish-hero__eyebrow">BI Publish Hub</div>
          <div class="publish-hero__title">BI发布平台</div>
          <div class="publish-hero__subtitle">统一管理发布分组，并按分组通过 iframe 展示正式发布的大屏。</div>
        </div>
        <div class="publish-hero__tags">
          <span>分组控制</span>
          <span>已发布筛选</span>
          <span>iframe 展示</span>
        </div>
      </section>

      <el-empty v-if="!visibleTabs.length" description="当前账号没有 BI 发布平台菜单权限" class="publish-empty" />

      <el-tabs v-else v-model="activeTab" type="border-card" class="publish-tabs">
        <el-tab-pane v-if="hasTab('groups')" label="分组管理" name="groups" lazy>
          <PublishGroupManager />
        </el-tab-pane>
        <el-tab-pane v-if="hasTab('panels')" label="BI面板展示" name="panels" lazy>
          <PublishPanelDisplay />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNavBar from '../components/TopNavBar.vue'
import { flattenAuthMenus, getAuthMenus } from '../utils/auth-session'

const PublishGroupManager = defineAsyncComponent(() => import('../components/PublishGroupManager.vue'))
const PublishPanelDisplay = defineAsyncComponent(() => import('../components/PublishPanelDisplay.vue'))

const route = useRoute()
const router = useRouter()
const activeTab = ref('panels')

const tabs = [
  { name: 'groups', path: '/home/publish/groups' },
  { name: 'panels', path: '/home/publish/panels' },
] as const

const routeTabMap: Record<string, 'groups' | 'panels'> = {
  '/home/publish/groups': 'groups',
  '/home/publish/panels': 'panels',
}

const tabRouteMap: Record<'groups' | 'panels', string> = {
  groups: '/home/publish/groups',
  panels: '/home/publish/panels',
}

const authPaths = computed(() => new Set(flattenAuthMenus(getAuthMenus()).map((item) => item.path).filter(Boolean)))
const visibleTabs = computed(() => tabs.filter((tab) => authPaths.value.has(tab.path)))
const fallbackTab = computed(() => visibleTabs.value[0]?.name ?? 'panels')

const hasTab = (tabName: 'groups' | 'panels') => visibleTabs.value.some((tab) => tab.name === tabName)

watch(
  () => route.path,
  (path) => {
    activeTab.value = routeTabMap[path] ?? fallbackTab.value
  },
  { immediate: true }
)

watch(
  visibleTabs,
  (nextTabs) => {
    if (!nextTabs.length) {
      return
    }
    if (!nextTabs.some((tab) => tab.name === activeTab.value)) {
      activeTab.value = nextTabs[0].name
    }
  },
  { immediate: true }
)

watch(activeTab, (tab) => {
  const targetPath = tabRouteMap[tab as 'groups' | 'panels']
  if (targetPath && route.path !== targetPath) {
    router.push(targetPath)
  }
})
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(34, 140, 255, 0.12), transparent 26%),
    linear-gradient(180deg, #f4f8fc 0%, #eef4fb 54%, #e8f0f8 100%);
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 24px 28px;
}

.publish-hero {
  border-radius: 28px;
  padding: 24px 28px;
  background:
    linear-gradient(135deg, rgba(6, 30, 60, 0.96) 0%, rgba(13, 58, 112, 0.94) 55%, rgba(22, 105, 173, 0.92) 100%),
    linear-gradient(135deg, #0f2744 0%, #19416f 100%);
  color: #f7fbff;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  box-shadow: 0 18px 48px rgba(18, 50, 91, 0.18);
}

.publish-hero__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(205, 228, 255, 0.8);
}

.publish-hero__title {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
}

.publish-hero__subtitle {
  margin-top: 8px;
  max-width: 640px;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(224, 237, 255, 0.82);
}

.publish-hero__tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.publish-hero__tags span {
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  color: rgba(248, 251, 255, 0.92);
}

.publish-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  background: transparent;
}

.publish-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(208, 220, 234, 0.86);
}

:deep(.el-tabs__header) {
  margin-bottom: 14px;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
}

:deep(.el-tabs__nav-wrap) {
  padding: 12px 12px 0;
  background: rgba(255, 255, 255, 0.74);
  border-radius: 22px 22px 0 0;
}

:deep(.el-tabs__item) {
  height: 44px;
  font-weight: 600;
}

:deep(.el-tabs__item.is-active) {
  color: #1458a8;
}

:deep(.el-tabs__active-bar) {
  background: linear-gradient(90deg, #1b7df0 0%, #16b8a4 100%);
}

@media (max-width: 900px) {
  .page-main {
    padding: 16px 16px 24px;
  }

  .publish-hero {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
  }

  .publish-hero__title {
    font-size: 24px;
  }
}
</style>