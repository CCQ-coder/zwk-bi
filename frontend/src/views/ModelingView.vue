<template>
  <div class="page-wrap">
    <TopNavBar active="modeling" />
    <main class="page-main">
      <ModelingPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNavBar from '../components/TopNavBar.vue'
import ModelingPanel from '../components/ModelingPanel.vue'
</script>

<style scoped>
.page-wrap { min-height: 100vh; background: #f0f2f5; display: flex; flex-direction: column; }
.page-main { flex: 1; overflow: hidden; }
</style>
