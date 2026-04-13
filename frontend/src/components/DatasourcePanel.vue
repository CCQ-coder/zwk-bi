<!-- DataEase 风格：左侧列表 + 右侧主从详情 -->
<template>
  <div class="ds-layout">
    <!-- ── 左侧数据源目录 ── -->
    <aside class="ds-sidebar">
      <div class="ds-sidebar-toolbar">
        <el-input
          v-model="sidebarSearch"
          placeholder="搜索"
          prefix-icon="Search"
          size="small"
          clearable
          style="flex:1"
        />
        <el-button
          type="primary"
          size="small"
          :icon="Plus"
          style="margin-left:6px;flex-shrink:0"
          @click="openStep1"
        />
      </div>
      <el-scrollbar class="ds-list">
        <div v-if="loading" class="ds-empty">加载中…</div>
        <div
          v-for="row in filteredRows"
          :key="row.id"
          class="ds-list-item"
          :class="{ active: selectedId === row.id }"
          @click="selectDatasource(row)"
        >
          <el-icon class="ds-icon"><DataLine /></el-icon>
          <span class="ds-name" :title="row.name">{{ row.name }}</span>
          <el-tag size="small" :type="typeTagColor(row.datasourceType)" style="flex-shrink:0;font-size:11px">
            {{ dbTypeLabel(row.datasourceType) }}
          </el-tag>
        </div>
        <div v-if="filteredRows.length === 0 && !loading" class="ds-empty">暂无数据源</div>
      </el-scrollbar>
    </aside>

    <!-- ── 右侧详情区 ── -->
    <main class="ds-main">
      <!-- 未选中任何数据源时的空状态 -->
      <div v-if="!selected" class="ds-empty-main">
        <el-empty description="请在左侧选择或新建数据源" />
      </div>

      <template v-else>
        <!-- 顶部标题 + 操作按钮 -->
        <div class="ds-detail-header">
          <div class="ds-detail-title">
            <el-icon><DataLine /></el-icon>
            <span>{{ selected.name }}</span>
            <span class="ds-creator">创建人：管理员</span>
          </div>
          <div class="ds-detail-actions">
            <el-button size="small" @click="openCreateDataset">新建数据集</el-button>
            <el-button size="small" :loading="verifying" @click="handleVerify">校验</el-button>
            <el-button size="small" type="primary" :icon="Edit" @click="openEdit(selected)">编辑</el-button>
            <el-popconfirm title="确认删除该数据源？" @confirm="handleDelete(selected.id)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <!-- Tab 切换 -->
        <el-tabs v-model="activeTab" class="ds-tabs">
          <!-- Tab 1：数据源配置 -->
          <el-tab-pane label="数据源配置" name="config">
            <div class="ds-config-section">
              <div class="ds-config-title">
                <el-icon><ArrowDown /></el-icon> 基础信息
              </div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="数据源名称">{{ selected.name }}</el-descriptions-item>
                <el-descriptions-item label="类型">
                  <el-tag size="small" :type="typeTagColor(selected.datasourceType)">
                    {{ dbTypeLabel(selected.datasourceType) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="主机名/IP地址">{{ selected.host }}</el-descriptions-item>
                <el-descriptions-item label="端口">{{ selected.port }}</el-descriptions-item>
                <el-descriptions-item label="数据库名称">{{ selected.databaseName }}</el-descriptions-item>
                <el-descriptions-item label="用户名">{{ selected.dbUsername }}</el-descriptions-item>
                <el-descriptions-item label="连接模式">
                  <el-tag size="small" :type="selected.connectMode === 'EXTRACT' ? 'warning' : 'success'">
                    {{ selected.connectMode === 'EXTRACT' ? '抽取' : '直连' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="JDBC 连接字符串">—</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- Tab 2：数据源表 -->
          <el-tab-pane label="数据源表" name="tables">
            <div class="ds-tables-toolbar">
              <el-input
                v-model="tableSearch"
                placeholder="搜索表名"
                prefix-icon="Search"
                size="small"
                clearable
                style="width:240px"
              />
              <el-button size="small" style="margin-left:8px" :loading="tablesLoading" @click="loadTables">刷新</el-button>
            </div>
            <el-table
              v-loading="tablesLoading"
              :data="filteredTableRows"
              border
              max-height="480"
              size="small"
            >
              <el-table-column prop="tableName" label="表名" min-width="300" />
              <el-table-column label="操作" width="110" align="right">
                <template #default="{ row: trow }">
                  <el-tooltip content="预览数据" placement="top">
                    <el-button link :icon="View" @click="openPreview(trow.tableName)" />
                  </el-tooltip>
                  <el-tooltip content="新建数据集" placement="top">
                    <el-button link :icon="DocumentAdd" @click="openCreateDataset(trow.tableName)" />
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
            <div class="ds-tables-pagination">共 {{ filteredTableRows.length }} 条</div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </main>
  </div>

  <!-- ─── 第一步：选择数据库类型 ─── -->
  <el-dialog v-model="step1Visible" title="创建数据源" width="660px" destroy-on-close>
    <el-steps :active="1" finish-status="success" simple style="margin-bottom:24px">
      <el-step title="选择数据源" />
      <el-step title="配置信息" />
    </el-steps>
    <div class="db-type-grid">
      <div
        v-for="t in dbTypeOptions"
        :key="t.value"
        class="db-type-card"
        :class="{ selected: step1Type === t.value }"
        @click="step1Type = t.value"
      >
        <span class="db-type-icon">{{ t.icon }}</span>
        <span class="db-type-label">{{ t.label }}</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="step1Visible = false">取消</el-button>
      <el-button type="primary" :disabled="!step1Type" @click="goStep2">下一步</el-button>
    </template>
  </el-dialog>

  <!-- ─── 第二步 / 编辑：配置数据源信息 ─── -->
  <el-dialog v-model="step2Visible" :title="editId ? '编辑数据源' : '创建数据源'" width="620px" destroy-on-close>
    <template v-if="!editId">
      <el-steps :active="2" finish-status="success" simple style="margin-bottom:16px">
        <el-step title="选择数据源" />
        <el-step title="配置信息" />
      </el-steps>
      <div style="margin-bottom:16px;font-size:15px;font-weight:600">
        {{ dbTypeLabel(form.datasourceType) }}
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" label-position="right">
      <el-form-item label="数据源名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="连接方式">
        <el-radio-group v-model="form.connectMode">
          <el-radio value="DIRECT">直连（主机名）</el-radio>
          <el-radio value="EXTRACT">抽取</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="主机名/IP地址" prop="host">
        <el-input v-model="form.host" placeholder="如 localhost" />
      </el-form-item>
      <el-form-item label="端口" prop="port">
        <el-input-number v-model="(form.port as number)" :min="1" :max="65535" style="width:100%" />
      </el-form-item>
      <el-form-item label="数据库名称" prop="databaseName">
        <el-input v-model="form.databaseName" placeholder="数据库名" />
      </el-form-item>
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="可选" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="可选（编辑时留空保持不变）" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button v-if="!editId" @click="backToStep1">上一步</el-button>
      <el-button @click="step2Visible = false">取消</el-button>
      <el-button :loading="testing" @click="handleTestConnection">校验连接</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>

  <!-- ─── 表数据预览 ─── -->
  <el-dialog v-model="previewVisible" :title="`预览：${previewTable}`" width="860px" destroy-on-close>
    <el-table
      v-loading="previewLoading"
      :data="previewRows"
      border
      max-height="420"
      size="small"
    >
      <el-table-column
        v-for="col in previewColumns"
        :key="col"
        :prop="col"
        :label="col"
        min-width="120"
        show-overflow-tooltip
      />
    </el-table>
    <div style="margin-top:8px;font-size:12px;color:#909399">共 {{ previewRows.length }} 行（最多 20 行）</div>
  </el-dialog>

  <el-dialog v-model="quickDatasetVisible" title="快速新建数据集" width="640px" destroy-on-close append-to-body>
    <el-form label-width="90px">
      <el-form-item label="数据源">
        <el-input :model-value="selected?.name || ''" disabled />
      </el-form-item>
      <el-form-item label="数据集名称">
        <el-input v-model="quickDatasetForm.name" placeholder="请输入数据集名称" />
      </el-form-item>
      <el-form-item label="SQL">
        <el-input v-model="quickDatasetForm.sqlText" type="textarea" :rows="6" placeholder="请输入查询SQL" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="quickDatasetVisible = false">取消</el-button>
      <el-button type="primary" :loading="quickDatasetSaving" @click="handleQuickCreateDataset">创建</el-button>
    </template>
  </el-dialog>

</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, DataLine, DocumentAdd, Edit, Plus, View } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createDatasource,
  deleteDatasource,
  getDatasourceList,
  getDatasourceTables,
  testDatasourceConnection,
  updateDatasource,
  type Datasource,
  type DatasourceForm,
  type TableInfo
} from '../api/datasource'
import { createDataset, previewDatasetSql } from '../api/dataset'

// ─── DB type options ─────────────────────────────────────────────────────────
const dbTypeOptions = [
  { label: 'MySQL',      value: 'MYSQL',      icon: '🐬' },
  { label: 'PostgreSQL', value: 'POSTGRESQL', icon: '🐘' },
  { label: 'ClickHouse', value: 'CLICKHOUSE', icon: '🖱' },
  { label: 'SQL Server', value: 'SQLSERVER',  icon: '🪟' },
  { label: 'Oracle',     value: 'ORACLE',     icon: '🔴' }
]

const defaultPorts: Record<string, number> = {
  MYSQL: 3306, POSTGRESQL: 5432, CLICKHOUSE: 8123, SQLSERVER: 1433, ORACLE: 1521
}

const dbTypeLabel = (v: string) =>
  dbTypeOptions.find((t) => t.value === v)?.label ?? v

const typeTagColor = (type: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    MYSQL: '', POSTGRESQL: 'success', CLICKHOUSE: 'warning', SQLSERVER: 'info', ORACLE: 'danger'
  }
  return map[type] ?? ''
}

// ─── Left sidebar list ───────────────────────────────────────────────────────
const rows         = ref<Datasource[]>([])
const loading      = ref(false)
const sidebarSearch = ref('')
const selectedId   = ref<number | null>(null)
const selected     = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null)

const filteredRows = computed(() =>
  rows.value.filter((r) =>
    !sidebarSearch.value || r.name.toLowerCase().includes(sidebarSearch.value.toLowerCase())
  )
)

const loadList = async () => {
  loading.value = true
  try {
    rows.value = await getDatasourceList()
    if (!selectedId.value && rows.value.length) selectDatasource(rows.value[0])
  } finally {
    loading.value = false
  }
}

const selectDatasource = (row: Datasource) => {
  selectedId.value = row.id
  activeTab.value = 'config'
}

// ─── Right panel tabs ────────────────────────────────────────────────────────
const activeTab = ref('config')
const verifying = ref(false)

const handleVerify = async () => {
  if (!selected.value) return
  verifying.value = true
  try {
    const result = await testDatasourceConnection({
      datasourceType: selected.value.datasourceType,
      host: selected.value.host,
      port: selected.value.port,
      databaseName: selected.value.databaseName,
      username: selected.value.dbUsername,
      password: ''
    })
    ElMessage.success(`校验成功：${result.databaseProductName} ${result.databaseProductVersion}`)
  } finally {
    verifying.value = false
  }
}

const openCreateDataset = (tableName?: string) => {
  if (!selected.value) return
  quickDatasetForm.name = tableName ? `${selected.value.name}-${tableName}` : `${selected.value.name}-数据集`
  quickDatasetForm.sqlText = tableName ? `SELECT * FROM \`${tableName}\` LIMIT 1000` : ''
  quickDatasetVisible.value = true
}

// ─── Quick create dataset ────────────────────────────────────────────────────
const quickDatasetVisible = ref(false)
const quickDatasetSaving = ref(false)
const quickDatasetForm = reactive({ name: '', sqlText: '' })

const handleQuickCreateDataset = async () => {
  if (!selected.value) return
  if (!quickDatasetForm.name.trim()) return ElMessage.warning('请输入数据集名称')
  if (!quickDatasetForm.sqlText.trim()) return ElMessage.warning('请输入 SQL')

  quickDatasetSaving.value = true
  try {
    await createDataset({
      name: quickDatasetForm.name.trim(),
      datasourceId: selected.value.id,
      sqlText: quickDatasetForm.sqlText.trim()
    })
    ElMessage.success('数据集创建成功')
    quickDatasetVisible.value = false
  } finally {
    quickDatasetSaving.value = false
  }
}

// ─── Tables tab ──────────────────────────────────────────────────────────────
const tablesLoading = ref(false)
const tableRows     = ref<TableInfo[]>([])
const tableSearch   = ref('')

const filteredTableRows = computed(() =>
  tableRows.value.filter((r) =>
    !tableSearch.value || r.tableName.toLowerCase().includes(tableSearch.value.toLowerCase())
  )
)

watch(activeTab, async (tab) => {
  if (tab === 'tables' && selected.value && tableRows.value.length === 0) await loadTables()
})

watch(selectedId, () => { tableRows.value = []; tableSearch.value = '' })

const loadTables = async () => {
  if (!selected.value) return
  tablesLoading.value = true
  try { tableRows.value = await getDatasourceTables(selected.value.id) }
  finally { tablesLoading.value = false }
}

// ─── Preview ─────────────────────────────────────────────────────────────────
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewTable   = ref('')
const previewColumns = ref<string[]>([])
const previewRows    = ref<Record<string, unknown>[]>([])

const openPreview = async (tableName: string) => {
  if (!selected.value) return
  previewTable.value = tableName
  previewColumns.value = []
  previewRows.value = []
  previewVisible.value = true
  previewLoading.value = true
  try {
    const result = await previewDatasetSql({
      datasourceId: selected.value.id,
      sqlText: `SELECT * FROM \`${tableName}\` LIMIT 20`
    })
    previewColumns.value = result.columns
    previewRows.value = result.rows as Record<string, unknown>[]
  } finally { previewLoading.value = false }
}

// ─── Step 1: choose DB type ──────────────────────────────────────────────────
const step1Visible = ref(false)
const step1Type    = ref('MYSQL')

const openStep1 = () => { step1Type.value = 'MYSQL'; step1Visible.value = true }

const goStep2 = () => {
  step1Visible.value = false
  editId.value = null
  Object.assign(form, emptyForm())
  form.datasourceType = step1Type.value
  form.port = defaultPorts[step1Type.value] ?? 3306
  step2Visible.value = true
}

const backToStep1 = () => { step2Visible.value = false; step1Visible.value = true }

// ─── Step2 / Edit form ───────────────────────────────────────────────────────
const step2Visible = ref(false)
const saving       = ref(false)
const testing      = ref(false)
const editId       = ref<number | null>(null)
const formRef      = ref<FormInstance>()

const emptyForm = (): DatasourceForm => ({
  name: '', datasourceType: 'MYSQL', connectMode: 'DIRECT',
  host: '', port: 3306, databaseName: '', username: '', password: ''
})

const form = reactive<DatasourceForm>(emptyForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机名/IP地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  databaseName: [{ required: true, message: '请输入数据库名称', trigger: 'blur' }]
}

const openEdit = (row: Datasource) => {
  editId.value = row.id
  Object.assign(form, emptyForm())
  form.name           = row.name
  form.datasourceType = row.datasourceType || 'MYSQL'
  form.connectMode    = row.connectMode || 'DIRECT'
  form.host           = row.host
  form.port           = row.port
  form.databaseName   = row.databaseName
  form.username       = row.dbUsername || ''
  form.password       = ''
  step2Visible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editId.value) {
      const updated = await updateDatasource(editId.value, form)
      ElMessage.success('更新成功'); step2Visible.value = false
      await loadList(); selectedId.value = updated.id
    } else {
      const created = await createDatasource(form)
      ElMessage.success('创建成功'); step2Visible.value = false
      await loadList(); selectedId.value = created.id
    }
  } finally { saving.value = false }
}

const handleTestConnection = async () => {
  await formRef.value?.validateField(['host', 'port', 'databaseName'])
  testing.value = true
  try {
    const result = await testDatasourceConnection({
      datasourceType: form.datasourceType, host: form.host,
      port: form.port, databaseName: form.databaseName,
      username: form.username, password: form.password
    })
    ElMessage.success(`${result.message}：${result.databaseProductName} ${result.databaseProductVersion}`)
  } finally { testing.value = false }
}

const handleDelete = async (id: number) => {
  await deleteDatasource(id)
  ElMessage.success('删除成功')
  if (selectedId.value === id) selectedId.value = null
  await loadList()
}

onMounted(loadList)
</script>

<style scoped>
/* ── layout ── */
.ds-layout {
  display: flex;
  height: calc(100vh - 80px);
  background: #f5f7fa;
  overflow: hidden;
}

/* ── sidebar ── */
.ds-sidebar {
  width: 220px;
  min-width: 220px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.ds-sidebar-toolbar {
  padding: 10px 8px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.ds-list { flex: 1; overflow-y: auto; padding: 4px 0; }

.ds-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  transition: background 0.15s;
}
.ds-list-item:hover { background: #f5f7fa; }
.ds-list-item.active { background: #ecf5ff; color: #409eff; font-weight: 500; }
.ds-icon { flex-shrink: 0; }
.ds-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ds-empty { text-align: center; padding: 24px; color: #909399; font-size: 13px; }

/* ── main ── */
.ds-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
.ds-empty-main { flex: 1; display: flex; align-items: center; justify-content: center; }

.ds-detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; border-bottom: 1px solid #f0f0f0;
}

.ds-detail-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #303133;
}
.ds-creator { font-size: 12px; color: #909399; font-weight: 400; margin-left: 8px; }
.ds-detail-actions { display: flex; gap: 8px; }

/* ── tabs ── */
.ds-tabs { flex: 1; overflow: hidden; padding: 0 20px; display: flex; flex-direction: column; }
:deep(.el-tabs__content) { flex: 1; overflow: auto; }

/* ── config tab ── */
.ds-config-section { padding: 4px 0 16px; }
.ds-config-title {
  display: flex; align-items: center; gap: 4px;
  font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #303133;
}

/* ── tables tab ── */
.ds-tables-toolbar { margin-bottom: 10px; display: flex; align-items: center; }
.ds-tables-pagination { margin-top: 8px; font-size: 12px; color: #909399; text-align: right; }

/* ── step1 db type grid ── */
.db-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 4px 0 8px; }

.db-type-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 16px 8px; border: 1px solid #dcdfe6; border-radius: 6px;
  cursor: pointer; transition: all 0.2s;
}
.db-type-card:hover { border-color: #409eff; background: #f0f7ff; }
.db-type-card.selected { border-color: #409eff; background: #ecf5ff; box-shadow: 0 0 0 2px rgba(64,158,255,.2); }
.db-type-icon { font-size: 28px; margin-bottom: 6px; }
.db-type-label { font-size: 12px; color: #303133; }
</style>

