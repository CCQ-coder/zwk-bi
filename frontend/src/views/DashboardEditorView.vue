<template>
  <div class="editor-page">
    <ScreenDesignerPanel :screen-id="dashboardId" @back="handleBack" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenDesignerPanel from '../components/ScreenDesignerPanel.vue'

const route = useRoute()
const router = useRouter()

const dashboardId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : null
})

const handleBack = () => {
  router.push('/home/dashboard')
}
</script>

<style scoped>
.editor-page {
  height: 100vh;
  overflow: hidden;
}
</style>