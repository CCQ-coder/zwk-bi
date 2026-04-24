<template>
  <div class="page-wrap">
    <TopNavBar active="publish" />

    <main class="page-main">
      <el-empty v-if="!visibleTabs.length" description="当前账号没有 BI 发布平台菜单权限" class="publish-empty" />

      <div v-else class="publish-shell">
        <aside class="publish-nav" :class="{ 'publish-nav--collapsed': navCollapsed }" :style="publishNavStyle">
          <div class="publish-nav__inner panel-card">
            <div class="publish-nav__head">
              <div v-if="!navCollapsed">
                <div class="publish-nav__title">BI发布</div>
              </div>
              <el-button text class="publish-nav__toggle" @click="toggleNavCollapsed">
                {{ navCollapsed ? '展开' : '折叠' }}
              </el-button>
            </div>

            <div v-if="!navCollapsed" class="publish-nav__section-label">导航</div>

            <div class="publish-nav__menu" :class="{ 'publish-nav__menu--compact': navCollapsed }">
              <button
                v-for="tab in visibleTabs"
                :key="tab.name"
                type="button"
                class="publish-nav__item"
                :class="{ 'publish-nav__item--active': activeTab === tab.name }"
                @click="activeTab = tab.name"
              >
                <div class="publish-nav__item-icon">
                  <el-icon><component :is="tab.icon" /></el-icon>
                </div>
                <template v-if="!navCollapsed">
                  <div class="publish-nav__item-copy">
                    <div class="publish-nav__item-title">{{ tab.label }}</div>
                  </div>
                </template>
              </button>
            </div>

          </div>
          <div class="publish-nav__resize" @mousedown.prevent="startNavResize" />
        </aside>

        <section class="publish-workspace">
          <section class="publish-workspace__body">
            <PublishGroupManager v-if="activeTab === 'groups' && hasTab('groups')" />
            <PublishPanelDisplay v-else-if="activeTab === 'panels' && hasTab('panels')" />
          </section>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { CollectionTag, Monitor } from '@element-plus/icons-vue'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentMenus } from '../api/menu'
import TopNavBar from '../components/TopNavBar.vue'
import { flattenAuthMenus, getAuthMenus, hasAuthSession, saveAuthMenus, type AuthMenuItem } from '../utils/auth-session'

const PublishGroupManager = defineAsyncComponent(() => import('../components/PublishGroupManager.vue'))
const PublishPanelDisplay = defineAsyncComponent(() => import('../components/PublishPanelDisplay.vue'))

const route = useRoute()
const router = useRouter()
const activeTab = ref('panels')
const menus = ref<AuthMenuItem[]>(getAuthMenus())
const navWidth = ref(264)
const navCollapsed = ref(false)
let stopNavResize: (() => void) | null = null

const tabs = [
  {
    name: 'groups',
    path: '/home/publish/groups',
    label: '分组管理',
    icon: CollectionTag,
  },
  {
    name: 'panels',
    path: '/home/publish/panels',
    label: 'BI面板展示',
    icon: Monitor,
  },
] as const

const routeTabMap: Record<string, 'groups' | 'panels'> = {
  '/home/publish/groups': 'groups',
  '/home/publish/panels': 'panels',
}

const tabRouteMap: Record<'groups' | 'panels', string> = {
  groups: '/home/publish/groups',
  panels: '/home/publish/panels',
}

const authPaths = computed(() => new Set(flattenAuthMenus(menus.value).map((item) => item.path).filter(Boolean)))
const visibleTabs = computed(() => tabs.filter((tab) => authPaths.value.has(tab.path)))
const fallbackTab = computed(() => visibleTabs.value[0]?.name ?? 'panels')
const publishNavStyle = computed(() => navCollapsed.value
  ? { width: '76px' }
  : { width: `${navWidth.value}px` })

const hasTab = (tabName: 'groups' | 'panels') => visibleTabs.value.some((tab) => tab.name === tabName)

const toggleNavCollapsed = () => {
  navCollapsed.value = !navCollapsed.value
}

const startNavResize = (event: MouseEvent) => {
  if (navCollapsed.value || window.innerWidth <= 960) {
    return
  }
  const startX = event.clientX
  const startWidth = navWidth.value
  const handleMouseMove = (moveEvent: MouseEvent) => {
    const nextWidth = startWidth + (moveEvent.clientX - startX)
    navWidth.value = Math.min(320, Math.max(220, nextWidth))
  }
  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    stopNavResize = null
  }
  stopNavResize = handleMouseUp
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

const loadMenus = async () => {
  if (!hasAuthSession()) {
    menus.value = []
    return
  }
  try {
    const latestMenus = await getCurrentMenus()
    menus.value = latestMenus
    saveAuthMenus(latestMenus)
  } catch {
    menus.value = getAuthMenus()
  }
}

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

onMounted(loadMenus)

onBeforeUnmount(() => {
  stopNavResize?.()
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
  padding: 14px 16px 18px;
}

.panel-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(208, 220, 234, 0.92);
  box-shadow: 0 12px 28px rgba(21, 58, 99, 0.06);
}

.publish-shell {
  height: 100%;
  min-height: calc(100vh - 86px);
  display: flex;
  gap: 12px;
}

.publish-nav {
  position: relative;
  flex: 0 0 auto;
  min-height: 0;
}

.publish-nav__inner {
  height: 100%;
  padding: 14px 12px 12px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(180deg, #152436 0%, #1b2d43 100%);
  border: 1px solid rgba(118, 154, 191, 0.2);
  box-shadow: 0 16px 34px rgba(12, 26, 42, 0.16);
  color: #f5f9ff;
}

.publish-nav__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(184, 208, 233, 0.12);
}

.publish-nav__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.publish-nav__toggle {
  min-height: 30px;
  padding-inline: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(184, 208, 233, 0.14);
  color: rgba(245, 249, 255, 0.92);
}

.publish-nav__section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(210, 225, 242, 0.52);
}

.publish-nav__menu {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.publish-nav__menu--compact {
  align-items: center;
}

.publish-nav__item {
  width: 100%;
  position: relative;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.publish-nav__item::before {
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

.publish-nav__item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(184, 208, 233, 0.08);
}

.publish-nav__item--active {
  background: rgba(47, 99, 164, 0.18);
  border-color: rgba(106, 157, 226, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.publish-nav__item--active::before {
  height: 24px;
  opacity: 1;
}

.publish-nav__item-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(184, 208, 233, 0.08);
  font-size: 16px;
}

.publish-nav__item--active .publish-nav__item-icon {
  background: rgba(55, 123, 206, 0.12);
  border-color: rgba(110, 171, 246, 0.18);
  color: #8abfff;
}

.publish-nav__item-copy {
  min-width: 0;
  flex: 1;
}

.publish-nav__item-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(247, 250, 255, 0.94);
}

.publish-nav__item--active .publish-nav__item-title {
  color: #8abfff;
}

.publish-nav__resize {
  position: absolute;
  top: 14px;
  right: -9px;
  width: 18px;
  height: calc(100% - 28px);
  cursor: col-resize;
}

.publish-nav__resize::before {
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

.publish-nav--collapsed .publish-nav__inner {
  align-items: center;
  padding-inline: 8px;
}

.publish-nav--collapsed .publish-nav__head {
  width: 100%;
  justify-content: center;
}

.publish-nav--collapsed .publish-nav__item {
  width: 44px;
  padding: 8px 0;
  justify-content: center;
}

.publish-workspace {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.publish-workspace__body {
  flex: 1;
  min-height: 0;
}

.publish-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(208, 220, 234, 0.86);
}

@media (max-width: 1080px) {
  .page-main {
    padding: 12px 12px 16px;
  }

  .publish-shell {
    flex-direction: column;
  }

  .publish-nav,
  .publish-nav--collapsed {
    width: 100% !important;
  }

  .publish-nav__resize {
    display: none;
  }

  .publish-nav__title {
    font-size: 24px;
  }
}

@media (max-width: 720px) {
  .publish-nav__head {
    align-items: center;
  }

  .publish-nav__menu {
    gap: 6px;
  }
}
</style>