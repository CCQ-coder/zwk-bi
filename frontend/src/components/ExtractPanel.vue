<template>
  <el-card class="extract-page">
    <div class="extract-toolbar">
      <h3 class="extract-title">数据抽取预览</h3>
      <div class="extract-tip">基于真实数据源执行 SQL 预览（非模拟数据）</div>
    </div>

    <el-form :model="form" label-width="100px" class="extract-form" inline>
      <el-form-item label="数据源" required>
        <el-select v-model="form.datasourceId" placeholder="请选择数据源" style="width:220px" @change="onDatasourceChange">
          <el-option v-for="d in datasources" :key="d.id" :label="`${d.name} (${d.connectMode})`" :value="d.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="源表" required>
        <el-select
          v-model="form.tableName"
          filterable
          placeholder="请选择源表"
          style="width:260px"
          :disabled="!form.datasourceId"
        >
          <el-option v-for="t in tables" :key="t.tableName" :label="t.tableName" :value="t.tableName" />
        </el-select>
      </el-form-item>
      <el-form-item label="抽取行数">
        <el-input-number v-model="form.limit" :min="1" :max="500" style="width:130px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="previewLoading" @click="handlePreview">执行预览</el-button>
      </el-form-item>
    </el-form>

    <el-form :model="form" label-width="100px" style="margin-top:6px">
      <el-form-item label="筛选条件">
        <el-input
          v-model="form.whereClause"
          type="textarea"
          :rows="2"
          placeholder="可选，例如：order_date >= '2026-01-01' AND status = 'PAID'"
        />
      </el-form-item>
    </el-form>

    <div v-if="preview.sqlText" class="sql-box">
      <div class="sql-title">执行SQL</div>
      <pre>{{ preview.sqlText }}</pre>
    </div>

    <el-table v-loading="previewLoading" :data="preview.rows" border max-height="520" style="margin-top:12px">
      <el-table-column v-for="col in preview.columns" :key="col" :prop="col" :label="col" min-width="140" show-overflow-tooltip />
    </el-table>
    <div class="extract-foot">共 {{ preview.rowCount }} 行（仅预览）</div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getDatasourceList,
  getDatasourceTables,
  previewExtract,
  type Datasource,
  type ExtractPreviewResult,
  type TableInfo
} from '../api/datasource'

const datasources = ref<Datasource[]>([])
const tables = ref<TableInfo[]>([])
const previewLoading = ref(false)

const form = reactive({
  datasourceId: null as number | null,
  tableName: '',
  whereClause: '',
  limit: 20
})

const preview = reactive<ExtractPreviewResult>({
  sqlText: '',
  columns: [],
  rows: [],
  rowCount: 0
})

const loadDatasources = async () => {
  datasources.value = await getDatasourceList()
}

const onDatasourceChange = async (id: number) => {
  form.tableName = ''
  tables.value = []
  if (!id) return
  tables.value = await getDatasourceTables(id)
}

const handlePreview = async () => {
  if (!form.datasourceId) return ElMessage.warning('请选择数据源')
  if (!form.tableName) return ElMessage.warning('请选择源表')

  previewLoading.value = true
  try {
    const result = await previewExtract({
      datasourceId: form.datasourceId,
      tableName: form.tableName,
      whereClause: form.whereClause || undefined,
      limit: form.limit
    })
    Object.assign(preview, result)
    ElMessage.success('抽取预览成功')
  } finally {
    previewLoading.value = false
  }
}

onMounted(loadDatasources)
</script>

<style scoped>
.extract-page {
  height: calc(100vh - 120px);
  overflow: auto;
}
.extract-toolbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.extract-title {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}
.extract-tip {
  font-size: 12px;
  color: #6b7280;
}
.extract-form {
  margin-top: 14px;
}
.sql-box {
  margin-top: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}
.sql-title {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}
.sql-box pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.5;
}
.extract-foot {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  text-align: right;
}
</style>
