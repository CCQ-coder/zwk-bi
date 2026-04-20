<template>
  <div class="page-wrap">
    <TopNavBar active="prepare" />
    <main class="page-main">
      <el-tabs v-model="activeTab" type="border-card" class="prepare-tabs">
        <el-tab-pane label="数据源管理" name="datasource" lazy>
          <DatasourcePanel />
        </el-tab-pane>
        <el-tab-pane label="数据集管理" name="dataset" lazy>
          <DatasetPanel />
        </el-tab-pane>
        <el-tab-pane label="组件管理" name="components" lazy>
          <ComponentAssetPanel />
        </el-tab-pane>
        <el-tab-pane label="数据抽取" name="extract" lazy>
          <ExtractPanel />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopNavBar from '../components/TopNavBar.vue'

const DatasourcePanel = defineAsyncComponent(() => import('../components/DatasourcePanel.vue'))
const DatasetPanel = defineAsyncComponent(() => import('../components/DatasetPanel.vue'))
const ExtractPanel = defineAsyncComponent(() => import('../components/ExtractPanel.vue'))
const ComponentAssetPanel = defineAsyncComponent(() => import('../components/ComponentAssetPanel.vue'))

const route = useRoute()
const router = useRouter()
const activeTab = ref('datasource')

const tabRouteMap: Record<string, string> = {
  datasource: '/home/prepare/datasource',
  dataset: '/home/prepare/dataset',
  components: '/home/prepare/components',
  extract: '/home/prepare/extract',
}

const routeTabMap = computed<Record<string, string>>(() => ({
  '/home/prepare': 'datasource',
  '/home/prepare/datasource': 'datasource',
  '/home/prepare/dataset': 'dataset',
  '/home/prepare/components': 'components',
  '/home/prepare/extract': 'extract',
}))

watch(() => route.path, (path) => {
  activeTab.value = routeTabMap.value[path] ?? 'datasource'
}, { immediate: true })

watch(activeTab, (tab) => {
  const targetPath = tabRouteMap[tab]
  if (targetPath && targetPath !== route.path) {
    router.push(targetPath)
  }
})
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.prepare-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
