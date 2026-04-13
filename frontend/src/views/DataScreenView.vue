<template>
  <div class="page-wrap">
    <TopNavBar active="screen" />
    <main class="page-main">
      <el-card shadow="never">
        <template #header>
          <div class="title">数据大屏组件库与画布设计</div>
        </template>
        <ScreenDesignerPanel />
      </el-card>
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNavBar from '../components/TopNavBar.vue'
import ScreenDesignerPanel from '../components/ScreenDesignerPanel.vue'
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background: #f0f2f5;
}

.page-main {
  padding: 14px;
}

.page-main :deep(.el-card__body) {
  padding: 18px;
}

.title {
  font-size: 16px;
  font-weight: 600;
}
</style>
