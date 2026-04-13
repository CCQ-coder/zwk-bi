<template>
  <div class="page-wrap">
    <TopNavBar active="prepare" />
    <main class="page-main">
      <el-tabs v-model="activeTab" type="border-card" class="prepare-tabs">
        <el-tab-pane label="数据源管理" name="datasource">
          <DatasourcePanel />
        </el-tab-pane>
        <el-tab-pane label="数据集管理" name="dataset">
          <DatasetPanel />
        </el-tab-pane>
        <el-tab-pane label="数据抽取" name="extract">
          <ExtractPanel />
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TopNavBar from '../components/TopNavBar.vue'
import DatasourcePanel from '../components/DatasourcePanel.vue'
import DatasetPanel from '../components/DatasetPanel.vue'
import ExtractPanel from '../components/ExtractPanel.vue'

const activeTab = ref('datasource')
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
