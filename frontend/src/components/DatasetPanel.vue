<template>
  <el-card class="bi-page">
    <div class="bi-toolbar">
      <h3 class="bi-card-title">数据集 SQL</h3>
      <el-button type="primary" @click="openCreate">新建数据集</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border style="margin-top: 12px">
      <el-table-column prop="name" label="数据集名称" min-width="160" />
      <el-table-column prop="datasourceId" label="数据源ID" width="100" />
      <el-table-column prop="sqlText" label="SQL" show-overflow-tooltip min-width="280" />
      <el-table-column prop="createdAt" label="创建时间" min-width="170" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editId ? '编辑数据集' : '新建数据集'"
      width="900px"
      destroy-on-close
    >
      <div class="dialog-body">
        <!-- 左侧：表浏览器 -->
        <div class="table-browser">
          <div class="browser-header">
            <span>数据表浏览</span>
            <el-button link type="primary" :loading="tablesLoading" @click="refreshTables">刷新</el-button>
          </div>

          <el-input
            v-model="tableSearch"
            placeholder="搜索表名"
            size="small"
            clearable
            style="margin-bottom: 8px"
          />

          <div v-if="tablesLoading" class="browser-tip">加载中...</div>
          <div v-else-if="!form.datasourceId" class="browser-tip">请先选择数据源</div>
          <div v-else-if="!filteredTables.length" class="browser-tip">暂无数据表</div>
          <div v-else class="table-list">
            <div
              v-for="t in filteredTables"
              :key="t.tableName"
              class="table-item"
              :class="{ active: selectedTable === t.tableName }"
              @click="selectTable(t.tableName)"
            >
              <el-icon class="table-icon"><Grid /></el-icon>
              <span class="table-name">{{ t.tableName }}</span>
              <el-tag v-if="t.tableType === 'VIEW'" size="small" type="info">VIEW</el-tag>
            </div>
          </div>

          <!-- 列信息面板 -->
          <template v-if="selectedTable">
            <div class="column-header">
              <span>{{ selectedTable }} 的字段</span>
              <el-button
                link
                type="primary"
                size="small"
                @click="generateSql"
              >生成 SELECT SQL</el-button>
            </div>
            <div v-if="columnsLoading" class="browser-tip">加载列信息...</div>
            <div v-else class="column-list">
              <div v-for="col in tableColumns" :key="col.columnName" class="column-item">
                <span class="col-name">{{ col.columnName }}</span>
                <el-tag size="small" class="col-type">{{ col.dataType }}</el-tag>
                <span v-if="col.remarks" class="col-remark">{{ col.remarks }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- 右侧：表单区域 -->
        <div class="form-area">
          <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入数据集名称" />
            </el-form-item>
            <el-form-item label="数据源" prop="datasourceId">
              <el-select
                v-model="form.datasourceId"
                placeholder="请选择"
                style="width:100%"
                @change="onDatasourceChange"
              >
                <el-option
                  v-for="ds in datasources"
                  :key="ds.id"
                  :label="ds.name"
                  :value="ds.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="SQL" prop="sqlText">
              <el-input
                v-model="form.sqlText"
                type="textarea"
                :rows="8"
                placeholder="请输入查询 SQL，或在左侧点击表名后点击「生成 SELECT SQL」"
              />
            </el-form-item>
          </el-form>

          <div v-if="preview.columns.length" class="preview-panel">
            <div class="preview-header">
              <span>预览结果</span>
              <span>最多展示 {{ preview.rowCount }} 行</span>
            </div>
            <el-table :data="preview.rows" border max-height="240">
              <el-table-column
                v-for="column in preview.columns"
                :key="column"
                :prop="column"
                :label="column"
                min-width="140"
                show-overflow-tooltip
              />
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button :loading="previewLoading" @click="handlePreview">预览 SQL</el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createDataset,
  deleteDataset,
  getDatasetList,
  previewDatasetSql,
  updateDataset,
  type Dataset,
  type DatasetForm,
  type DatasetPreviewResult
} from '../api/dataset'
import {
  getDatasourceList,
  getDatasourceTables,
  getTableColumns,
  type ColumnMeta,
  type Datasource,
  type TableInfo
} from '../api/datasource'

const rows = ref<Dataset[]>([])
const datasources = ref<Datasource[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const previewLoading = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const preview = reactive<DatasetPreviewResult>({ columns: [], rows: [], rowCount: 0 })

// Table browser state
const tables = ref<TableInfo[]>([])
const tablesLoading = ref(false)
const tableSearch = ref('')
const selectedTable = ref('')
const tableColumns = ref<ColumnMeta[]>([])
const columnsLoading = ref(false)

const filteredTables = computed(() =>
  tableSearch.value
    ? tables.value.filter(t =>
        t.tableName.toLowerCase().includes(tableSearch.value.toLowerCase())
      )
    : tables.value
)

const emptyForm = (): DatasetForm => ({
  name: '',
  datasourceId: '',
  sqlText: ''
})

const form = reactive<DatasetForm>(emptyForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  datasourceId: [{ required: true, message: '请选择数据源', trigger: 'change' }],
  sqlText: [{ required: true, message: '请输入 SQL', trigger: 'blur' }]
}

const loadList = async () => {
  loading.value = true
  try {
    ;[rows.value, datasources.value] = await Promise.all([getDatasetList(), getDatasourceList()])
  } finally {
    loading.value = false
  }
}

const loadTables = async (dsId: number) => {
  tables.value = []
  selectedTable.value = ''
  tableColumns.value = []
  if (!dsId) return
  tablesLoading.value = true
  try {
    tables.value = await getDatasourceTables(dsId)
  } catch {
    ElMessage.error('获取数据表列表失败')
  } finally {
    tablesLoading.value = false
  }
}

const refreshTables = () => {
  if (form.datasourceId) loadTables(Number(form.datasourceId))
}

const onDatasourceChange = (val: number | string) => {
  if (val) loadTables(Number(val))
}

const selectTable = async (tableName: string) => {
  selectedTable.value = tableName
  tableColumns.value = []
  if (!form.datasourceId) return
  columnsLoading.value = true
  try {
    tableColumns.value = await getTableColumns(Number(form.datasourceId), tableName)
  } catch {
    ElMessage.error('获取列信息失败')
  } finally {
    columnsLoading.value = false
  }
}

const generateSql = () => {
  if (!tableColumns.value.length) return
  const cols = tableColumns.value.map(c => c.columnName).join(', ')
  form.sqlText = `SELECT ${cols}\nFROM ${selectedTable.value}`
}

const openCreate = () => {
  editId.value = null
  Object.assign(form, emptyForm())
  Object.assign(preview, { columns: [], rows: [], rowCount: 0 })
  tables.value = []
  selectedTable.value = ''
  tableColumns.value = []
  tableSearch.value = ''
  dialogVisible.value = true
}

const openEdit = (row: Dataset) => {
  editId.value = row.id
  form.name = row.name
  form.datasourceId = row.datasourceId
  form.sqlText = row.sqlText
  Object.assign(preview, { columns: [], rows: [], rowCount: 0 })
  selectedTable.value = ''
  tableColumns.value = []
  tableSearch.value = ''
  dialogVisible.value = true
  // Load tables for the selected datasource
  if (row.datasourceId) loadTables(Number(row.datasourceId))
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editId.value) {
      await updateDataset(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await createDataset(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadList()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await deleteDataset(id)
  ElMessage.success('删除成功')
  await loadList()
}

const handlePreview = async () => {
  await formRef.value?.validateField(['datasourceId', 'sqlText'])
  previewLoading.value = true
  try {
    const result = await previewDatasetSql({
      datasourceId: Number(form.datasourceId),
      sqlText: form.sqlText
    })
    Object.assign(preview, result)
    ElMessage.success('SQL 预览成功')
  } finally {
    previewLoading.value = false
  }
}

onMounted(loadList)
</script>

<style scoped>
.bi-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-body {
  display: flex;
  gap: 16px;
  min-height: 420px;
}

.table-browser {
  width: 240px;
  flex-shrink: 0;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.browser-tip {
  font-size: 12px;
  color: #909399;
  text-align: center;
  padding: 12px 0;
}

.table-list {
  overflow-y: auto;
  max-height: 200px;
  margin-bottom: 8px;
}

.table-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #303133;
  transition: background 0.15s;
}

.table-item:hover {
  background: #f0f2f5;
}

.table-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.table-icon {
  color: #909399;
  font-size: 13px;
}

.table-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin: 8px 0 4px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
}

.column-list {
  overflow-y: auto;
  max-height: 160px;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  font-size: 12px;
}

.col-name {
  flex: 1;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-type {
  flex-shrink: 0;
}

.col-remark {
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-area {
  flex: 1;
  min-width: 0;
}

.preview-panel {
  margin-top: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}
</style>
