<template>
  <div class="editor-page">
    <ScreenDesignerPanel :screen-id="screenId" @back="handleBack" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenDesignerPanel from '../components/ScreenDesignerPanel.vue'

const route = useRoute()
const router = useRouter()

const screenId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : null
})

const handleBack = () => {
  router.push('/home/screen')
}
</script>

<style scoped>
.editor-page {
  height: 100vh;
  overflow: hidden;
}
</style>
