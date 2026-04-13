<template>
  <div class="page-wrap">
    <TopNavBar active="dashboard" />
    <main class="page-main">
      <DashboardPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNavBar from '../components/TopNavBar.vue'
import DashboardPanel from '../components/DashboardPanel.vue'
</script>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}

.page-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}
</style>
