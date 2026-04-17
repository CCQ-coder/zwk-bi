<template>
  <el-card class="bi-page datasource-panel">
    <div class="datasource-layout">
      <aside class="datasource-sidebar">
        <div class="sidebar-head">
          <div>
            <div class="sidebar-title">数据源</div>
            <div class="sidebar-subtitle">统一管理数据库、API、表格和 JSON 静态数据源</div>
          </div>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreate">新建</el-button>
        </div>

        <el-input
          v-model="searchKeyword"
          class="sidebar-search"
          placeholder="搜索数据源名称"
          clearable
        />

        <div class="datasource-list" v-loading="loading">
          <button
            v-for="item in filteredDatasources"
            :key="item.id"
            type="button"
            class="datasource-item"
            :class="{ 'datasource-item--active': selectedId === item.id }"
            @click="selectedId = item.id"
          >
            <div class="datasource-item-head">
              <span class="datasource-item-name">{{ item.name }}</span>
              <el-tag size="small" effect="plain">{{ sourceKindLabel(resolveSourceKind(item)) }}</el-tag>
            </div>
            <div class="datasource-item-meta">{{ datasourceSubtitle(item) }}</div>
          </button>

          <el-empty v-if="!loading && !filteredDatasources.length" description="暂无数据源" :image-size="56" />
        </div>
      </aside>

      <section class="datasource-main">
        <template v-if="selectedDatasource">
          <div class="detail-head">
            <div>
              <div class="detail-title-row">
                <h3>{{ selectedDatasource.name }}</h3>
                <el-tag effect="dark" size="small">{{ sourceKindLabel(resolveSourceKind(selectedDatasource)) }}</el-tag>
                <el-tag v-if="isDatabaseDatasource(selectedDatasource)" type="success" size="small">可用于数据集</el-tag>
              </div>
              <div class="detail-subtitle">{{ datasourceSubtitle(selectedDatasource) }}</div>
            </div>
            <div class="detail-actions">
              <el-button size="small" :icon="RefreshRight" @click="refreshSelectedDatasource">刷新</el-button>
              <el-button size="small" :icon="Edit" @click="openEdit(selectedDatasource)">编辑</el-button>
              <el-popconfirm title="确认删除此数据源？" @confirm="handleDelete(selectedDatasource.id)">
                <template #reference>
                  <el-button size="small" type="danger" plain :icon="Delete">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>

          <div class="detail-grid">
            <section class="detail-card">
              <div class="section-title">基础信息</div>
              <div class="detail-kv-grid">
                <div v-for="entry in selectedDatasourceInfo" :key="entry.label" class="detail-kv-item">
                  <span>{{ entry.label }}</span>
                  <strong>{{ entry.value || '-' }}</strong>
                </div>
              </div>

              <div class="config-preview">
                <div class="config-preview-head">来源配置</div>
                <pre>{{ selectedConfigPreview }}</pre>
              </div>
            </section>

            <section class="detail-card detail-card--data">
              <template v-if="isDatabaseDatasource(selectedDatasource)">
                <div class="section-head">
                  <div>
                    <div class="section-title">数据表浏览</div>
                    <div class="section-subtitle">数据集仅支持绑定数据库型数据源，这里可直接查看表和字段。</div>
                  </div>
                  <el-button size="small" :icon="RefreshRight" :loading="tablesLoading" @click="loadDatabaseTables(selectedDatasource.id)">刷新表</el-button>
                </div>

                <el-input
                  v-model="tableSearch"
                  placeholder="搜索表名"
                  clearable
                  class="table-search"
                />

                <div class="table-browser">
                  <div class="table-list" v-loading="tablesLoading">
                    <button
                      v-for="table in filteredTables"
                      :key="table.tableName"
                      type="button"
                      class="table-item"
                      :class="{ 'table-item--active': selectedTable === table.tableName }"
                      @click="selectTable(table.tableName)"
                    >
                      <div class="table-item-name">{{ table.tableName }}</div>
                      <div class="table-item-meta">{{ table.comment || table.tableType || 'TABLE' }}</div>
                    </button>
                    <div v-if="!tablesLoading && !filteredTables.length" class="table-empty">暂无可用数据表</div>
                  </div>

                  <div class="table-detail">
                    <template v-if="selectedTable">
                      <div class="section-head section-head--compact">
                        <div>
                          <div class="section-title">{{ selectedTable }}</div>
                          <div class="section-subtitle">字段和样例数据最多展示 20 行。</div>
                        </div>
                      </div>

                      <div class="column-list" v-loading="columnsLoading">
                        <div v-for="column in tableColumns" :key="column.columnName" class="column-item">
                          <div>
                            <div class="column-name">{{ column.columnName }}</div>
                            <div class="column-remark">{{ column.remarks || '无说明' }}</div>
                          </div>
                          <el-tag size="small">{{ column.dataType }}</el-tag>
                        </div>
                      </div>

                      <el-table
                        v-if="extractPreview.columns.length"
                        :data="extractPreview.rows"
                        border
                        size="small"
                        max-height="280"
                        class="preview-table"
                      >
                        <el-table-column
                          v-for="column in extractPreview.columns"
                          :key="column"
                          :prop="column"
                          :label="column"
                          min-width="140"
                          show-overflow-tooltip
                        />
                      </el-table>
                    </template>

                    <div v-else class="table-empty table-empty--detail">请选择左侧数据表查看字段和样例</div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="section-head">
                  <div>
                    <div class="section-title">数据预览</div>
                    <div class="section-subtitle">页面编写模式会在运行时读取此数据源，并可叠加页面级配置。</div>
                  </div>
                  <el-button size="small" :icon="RefreshRight" :loading="previewLoading" @click="loadStaticPreview(selectedDatasource.id)">刷新预览</el-button>
                </div>

                <div class="preview-summary">字段 {{ preview.columns.length }} 个 / 样例 {{ preview.rows.length }} 行 / 总计 {{ preview.rowCount }} 行</div>

                <el-table
                  v-if="preview.columns.length"
                  :data="preview.rows"
                  border
                  size="small"
                  max-height="520"
                  class="preview-table"
                >
                  <el-table-column
                    v-for="column in preview.columns"
                    :key="column"
                    :prop="column"
                    :label="column"
                    min-width="140"
                    show-overflow-tooltip
                  />
                </el-table>

                <el-empty v-else :image-size="72" description="当前数据源暂无可展示数据" />
              </template>
            </section>
          </div>
        </template>

        <div v-else class="main-empty">
          <el-empty description="请先选择或创建一个数据源" :image-size="88">
            <el-button type="primary" @click="openCreate">新建数据源</el-button>
          </el-empty>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建数据源' : '编辑数据源'"
      width="900px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="datasource-form">
        <div class="form-grid form-grid--basic">
          <el-form-item label="数据源名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入数据源名称" />
          </el-form-item>

          <el-form-item label="来源类型" prop="sourceKind">
            <el-radio-group v-model="form.sourceKind" class="source-kind-group">
              <el-radio-button v-for="item in SOURCE_KIND_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>

        <template v-if="form.sourceKind === 'DATABASE'">
          <div class="form-grid">
            <el-form-item label="数据库类型" prop="datasourceType">
              <el-select v-model="form.datasourceType" placeholder="请选择数据库类型" @change="handleDatabaseTypeChange">
                <el-option v-for="item in DATABASE_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>

            <el-form-item label="主机地址" prop="host">
              <el-input v-model="form.host" placeholder="例如 127.0.0.1" />
            </el-form-item>

            <el-form-item label="端口" prop="port">
              <el-input-number
                :model-value="form.port === '' ? undefined : Number(form.port)"
                :min="1"
                :max="65535"
                controls-position="right"
                @change="handlePortChange"
              />
            </el-form-item>

            <el-form-item label="数据库名称" prop="databaseName">
              <el-input v-model="form.databaseName" placeholder="请输入数据库名称" />
            </el-form-item>

            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入数据库账号" />
            </el-form-item>

            <el-form-item label="密码">
              <el-input v-model="form.password" type="password" show-password placeholder="编辑已有数据库时不修改可留空" />
            </el-form-item>
          </div>
          <div class="form-tip">数据库型数据源可被数据集绑定，也可以在大屏组件的页面编写模式中直接执行 SQL。</div>
        </template>

        <template v-else-if="form.sourceKind === 'API'">
          <div class="form-grid">
            <el-form-item label="请求地址" prop="apiUrl" class="form-item--full">
              <el-input v-model="form.apiUrl" placeholder="请输入完整 API 地址，例如 https://api.example.com/orders" />
            </el-form-item>

            <el-form-item label="请求方式">
              <el-select v-model="form.apiMethod">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="PATCH" value="PATCH" />
              </el-select>
            </el-form-item>

            <el-form-item label="结果路径" class="form-item--full">
              <el-input v-model="form.apiResultPath" placeholder="可选，例如 data.list" />
            </el-form-item>

            <el-form-item label="请求头 JSON" class="form-item--full">
              <el-input v-model="form.apiHeadersText" type="textarea" :rows="4" placeholder='例如 {"Authorization":"Bearer token"}' />
            </el-form-item>

            <el-form-item label="Query 参数 JSON" class="form-item--full">
              <el-input v-model="form.apiQueryText" type="textarea" :rows="4" placeholder='例如 {"page":1,"size":20}' />
            </el-form-item>

            <el-form-item label="请求体" class="form-item--full">
              <el-input v-model="form.apiBodyText" type="textarea" :rows="5" placeholder="可输入 JSON 或普通文本；GET 请求可留空" />
            </el-form-item>
          </div>
          <div class="form-tip">页面编写模式下可继续通过页面级 JSON 覆盖 query、headers、body 或 resultPath。</div>
        </template>

        <template v-else-if="form.sourceKind === 'TABLE'">
          <div class="form-grid">
            <el-form-item label="分隔格式">
              <el-radio-group v-model="form.tableDelimiter">
                <el-radio-button value="CSV">CSV</el-radio-button>
                <el-radio-button value="TSV">TSV</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="首行为表头">
              <el-switch v-model="form.tableHasHeader" active-text="是" inactive-text="否" />
            </el-form-item>

            <el-form-item label="表格内容" prop="tableText" class="form-item--full">
              <el-input
                v-model="form.tableText"
                type="textarea"
                :rows="12"
                placeholder="请输入 CSV 或 TSV 文本，页面编写时可通过运行时配置覆盖"
              />
            </el-form-item>
          </div>
        </template>

        <template v-else>
          <div class="form-grid">
            <el-form-item label="结果路径" class="form-item--full">
              <el-input v-model="form.jsonResultPath" placeholder="可选，例如 data.records" />
            </el-form-item>

            <el-form-item label="JSON 内容" prop="jsonText" class="form-item--full">
              <el-input
                v-model="form.jsonText"
                type="textarea"
                :rows="12"
                placeholder='请输入 JSON 数组或对象，例如 [{"name":"华东","value":120}]'
              />
            </el-form-item>
          </div>
          <div class="form-tip">静态 JSON 可直接作为页面编写的数据来源，也支持通过页面级 resultPath 或 jsonText 做实例覆盖。</div>
        </template>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <span class="dialog-hint">保存后会同步到数据集和大屏页面编写可选列表。</span>
          <div class="dialog-actions">
            <el-button :loading="testing" @click="handleTestConnection">测试连接</el-button>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Edit, Plus, RefreshRight } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createDatasource,
  deleteDatasource,
  getDatasourceList,
  getDatasourcePreviewData,
  getDatasourceTables,
  getTableColumns,
  previewExtract,
  testDatasourceConnection,
  updateDatasource,
  type ColumnMeta,
  type Datasource,
  type DatasourceForm,
  type DatasourcePreviewResult,
  type DatasourceSourceKind,
  type ExtractPreviewResult,
  type TableInfo,
} from '../api/datasource'

type DatabaseType = 'MYSQL' | 'POSTGRESQL' | 'CLICKHOUSE' | 'SQLSERVER' | 'ORACLE'
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'
type TableDelimiter = 'CSV' | 'TSV'

interface DatasourceEditorForm extends DatasourceForm {
  apiUrl: string
  apiMethod: ApiMethod
  apiHeadersText: string
  apiQueryText: string
  apiBodyText: string
  apiResultPath: string
  tableText: string
  tableDelimiter: TableDelimiter
  tableHasHeader: boolean
  jsonText: string
  jsonResultPath: string
}

const SOURCE_KIND_OPTIONS: Array<{ label: string; value: DatasourceSourceKind }> = [
  { label: '数据库', value: 'DATABASE' },
  { label: 'API 接口', value: 'API' },
  { label: '表格', value: 'TABLE' },
  { label: 'JSON 静态数据', value: 'JSON_STATIC' },
]

const DATABASE_TYPE_OPTIONS: Array<{ label: string; value: DatabaseType; defaultPort: number }> = [
  { label: 'MySQL', value: 'MYSQL', defaultPort: 3306 },
  { label: 'PostgreSQL', value: 'POSTGRESQL', defaultPort: 5432 },
  { label: 'ClickHouse', value: 'CLICKHOUSE', defaultPort: 8123 },
  { label: 'SQL Server', value: 'SQLSERVER', defaultPort: 1433 },
  { label: 'Oracle', value: 'ORACLE', defaultPort: 1521 },
]

const SOURCE_KIND_LABELS: Record<DatasourceSourceKind, string> = {
  DATABASE: '数据库',
  API: 'API 接口',
  TABLE: '表格',
  JSON_STATIC: 'JSON 静态数据',
}

const emptyPreview = (): DatasourcePreviewResult => ({ columns: [], rows: [], rowCount: 0 })
const emptyExtractPreview = (): ExtractPreviewResult => ({ sqlText: '', columns: [], rows: [], rowCount: 0 })

const createEmptyForm = (): DatasourceEditorForm => ({
  name: '',
  sourceKind: 'DATABASE',
  datasourceType: 'MYSQL',
  connectMode: 'DIRECT',
  host: '',
  port: 3306,
  databaseName: '',
  username: '',
  password: '',
  configJson: '{}',
  apiUrl: '',
  apiMethod: 'GET',
  apiHeadersText: '{}',
  apiQueryText: '{}',
  apiBodyText: '',
  apiResultPath: '',
  tableText: '',
  tableDelimiter: 'CSV',
  tableHasHeader: true,
  jsonText: '[]',
  jsonResultPath: '',
})

const loading = ref(false)
const datasources = ref<Datasource[]>([])
const searchKeyword = ref('')
const selectedId = ref<number | null>(null)

const previewLoading = ref(false)
const preview = reactive<DatasourcePreviewResult>(emptyPreview())
const tablesLoading = ref(false)
const tableSearch = ref('')
const tables = ref<TableInfo[]>([])
const selectedTable = ref('')
const columnsLoading = ref(false)
const tableColumns = ref<ColumnMeta[]>([])
const extractPreview = reactive<ExtractPreviewResult>(emptyExtractPreview())

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const dialogEditId = ref<number | null>(null)
const saving = ref(false)
const testing = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<DatasourceEditorForm>(createEmptyForm())

const selectedDatasource = computed(() => datasources.value.find((item) => item.id === selectedId.value) ?? null)
const filteredDatasources = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const list = [...datasources.value].sort((left, right) => right.id - left.id)
  if (!keyword) return list
  return list.filter((item) => item.name.toLowerCase().includes(keyword))
})
const filteredTables = computed(() => {
  const keyword = tableSearch.value.trim().toLowerCase()
  if (!keyword) return tables.value
  return tables.value.filter((item) => item.tableName.toLowerCase().includes(keyword))
})

const selectedDatasourceInfo = computed(() => {
  const datasource = selectedDatasource.value
  if (!datasource) return [] as Array<{ label: string; value: string }>
  const sourceKind = resolveSourceKind(datasource)
  const config = parseConfigJson(datasource.configJson)
  if (sourceKind === 'DATABASE') {
    return [
      { label: '数据库类型', value: datasource.datasourceType || '-' },
      { label: '主机地址', value: datasource.host || '-' },
      { label: '端口', value: datasource.port ? String(datasource.port) : '-' },
      { label: '数据库名称', value: datasource.databaseName || '-' },
      { label: '用户名', value: datasource.dbUsername || '-' },
      { label: '连接模式', value: datasource.connectMode || 'DIRECT' },
    ]
  }
  if (sourceKind === 'API') {
    return [
      { label: '请求地址', value: readString(config.apiUrl ?? config.url) || '-' },
      { label: '请求方式', value: readString(config.apiMethod ?? config.method) || 'GET' },
      { label: '结果路径', value: readString(config.apiResultPath ?? config.resultPath) || '-' },
      { label: '创建时间', value: datasource.createdAt || '-' },
    ]
  }
  if (sourceKind === 'TABLE') {
    return [
      { label: '分隔格式', value: readString(config.tableDelimiter ?? config.delimiter) || 'CSV' },
      { label: '首行为表头', value: readBoolean(config.tableHasHeader ?? config.hasHeader, true) ? '是' : '否' },
      { label: '内容行数', value: countLines(readString(config.tableText ?? config.text)) },
      { label: '创建时间', value: datasource.createdAt || '-' },
    ]
  }
  return [
    { label: '结果路径', value: readString(config.jsonResultPath ?? config.resultPath) || '-' },
    { label: 'JSON 长度', value: `${readString(config.jsonText ?? config.text).length} 字符` },
    { label: '创建时间', value: datasource.createdAt || '-' },
  ]
})

const selectedConfigPreview = computed(() => {
  const datasource = selectedDatasource.value
  if (!datasource) return '{}'
  return JSON.stringify(parseConfigJson(datasource.configJson), null, 2)
})

const rules: FormRules<DatasourceEditorForm> = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  datasourceType: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请选择数据库类型'), trigger: 'change' }],
  host: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入主机地址'), trigger: 'blur' }],
  port: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && (!value || Number(value) <= 0), '请输入合法端口'), trigger: 'change' }],
  databaseName: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入数据库名称'), trigger: 'blur' }],
  username: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'DATABASE' && !String(value).trim(), '请输入数据库账号'), trigger: 'blur' }],
  apiUrl: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'API' && !String(value).trim(), '请输入 API 地址'), trigger: 'blur' }],
  tableText: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'TABLE' && !String(value).trim(), '请输入表格内容'), trigger: 'blur' }],
  jsonText: [{ validator: (_rule, value, callback) => validateBySourceKind(callback, form.sourceKind === 'JSON_STATIC' && !String(value).trim(), '请输入 JSON 内容'), trigger: 'blur' }],
}

watch(selectedDatasource, async (datasource) => {
  Object.assign(preview, emptyPreview())
  Object.assign(extractPreview, emptyExtractPreview())
  tables.value = []
  tableColumns.value = []
  selectedTable.value = ''
  tableSearch.value = ''
  if (!datasource) return
  if (isDatabaseDatasource(datasource)) {
    await loadDatabaseTables(datasource.id)
    return
  }
  await loadStaticPreview(datasource.id)
}, { immediate: false })

watch(() => form.sourceKind, (sourceKind) => {
  form.connectMode = 'DIRECT'
  if (sourceKind === 'DATABASE') {
    if (!DATABASE_TYPE_OPTIONS.some((item) => item.value === form.datasourceType)) {
      form.datasourceType = 'MYSQL'
    }
    if (form.port === '') {
      form.port = DATABASE_TYPE_OPTIONS.find((item) => item.value === form.datasourceType)?.defaultPort ?? 3306
    }
    return
  }
  if (sourceKind === 'API') {
    form.datasourceType = 'REST_API'
    form.port = ''
    return
  }
  if (sourceKind === 'TABLE') {
    form.datasourceType = 'TABLE'
    form.port = ''
    return
  }
  form.datasourceType = 'JSON_STATIC'
  form.port = ''
})

const loadDatasources = async (preferredId?: number | null) => {
  loading.value = true
  try {
    const list = await getDatasourceList()
    datasources.value = list
    const nextId = preferredId && list.some((item) => item.id === preferredId)
      ? preferredId
      : selectedId.value && list.some((item) => item.id === selectedId.value)
        ? selectedId.value
        : list[0]?.id ?? null
    selectedId.value = nextId
  } finally {
    loading.value = false
  }
}

const refreshSelectedDatasource = async () => {
  await loadDatasources(selectedDatasource.value?.id ?? null)
}

const loadStaticPreview = async (datasourceId: number) => {
  previewLoading.value = true
  try {
    const result = await getDatasourcePreviewData(datasourceId)
    Object.assign(preview, result)
  } finally {
    previewLoading.value = false
  }
}

const loadDatabaseTables = async (datasourceId: number) => {
  tablesLoading.value = true
  try {
    const result = await getDatasourceTables(datasourceId)
    tables.value = result
    if (result.length) {
      const targetTable = result.some((item) => item.tableName === selectedTable.value)
        ? selectedTable.value
        : result[0].tableName
      await selectTable(targetTable)
    }
  } finally {
    tablesLoading.value = false
  }
}

const selectTable = async (tableName: string) => {
  if (!selectedDatasource.value) return
  selectedTable.value = tableName
  columnsLoading.value = true
  try {
    const [columns, previewResult] = await Promise.all([
      getTableColumns(selectedDatasource.value.id, tableName),
      previewExtract({ datasourceId: selectedDatasource.value.id, tableName, limit: 20 }),
    ])
    tableColumns.value = columns
    Object.assign(extractPreview, previewResult)
  } finally {
    columnsLoading.value = false
  }
}

const openCreate = () => {
  dialogMode.value = 'create'
  dialogEditId.value = null
  Object.assign(form, createEmptyForm())
  dialogVisible.value = true
}

const openEdit = (datasource: Datasource) => {
  dialogMode.value = 'edit'
  dialogEditId.value = datasource.id
  Object.assign(form, createEmptyForm())
  form.name = datasource.name
  form.sourceKind = resolveSourceKind(datasource)
  form.datasourceType = datasource.datasourceType || 'MYSQL'
  form.connectMode = datasource.connectMode || 'DIRECT'
  form.host = datasource.host || ''
  form.port = datasource.port || ''
  form.databaseName = datasource.databaseName || ''
  form.username = datasource.dbUsername || ''
  form.password = ''

  const config = parseConfigJson(datasource.configJson)
  if (form.sourceKind === 'API') {
    form.apiUrl = readString(config.apiUrl ?? config.url)
    form.apiMethod = (readString(config.apiMethod ?? config.method) || 'GET').toUpperCase() as ApiMethod
    form.apiHeadersText = JSON.stringify(readObject(config.apiHeaders ?? config.headers), null, 2)
    form.apiQueryText = JSON.stringify(readObject(config.apiQuery ?? config.query), null, 2)
    form.apiBodyText = stringifyUnknown(config.apiBody ?? config.body)
    form.apiResultPath = readString(config.apiResultPath ?? config.resultPath)
  } else if (form.sourceKind === 'TABLE') {
    form.tableText = readString(config.tableText ?? config.text)
    form.tableDelimiter = (readString(config.tableDelimiter ?? config.delimiter) || 'CSV').toUpperCase() as TableDelimiter
    form.tableHasHeader = readBoolean(config.tableHasHeader ?? config.hasHeader, true)
  } else if (form.sourceKind === 'JSON_STATIC') {
    form.jsonText = readString(config.jsonText ?? config.text) || '[]'
    form.jsonResultPath = readString(config.jsonResultPath ?? config.resultPath)
  }

  dialogVisible.value = true
}

const handleDatabaseTypeChange = (value: DatabaseType) => {
  const option = DATABASE_TYPE_OPTIONS.find((item) => item.value === value)
  if (!option) return
  if (!form.port || Number(form.port) <= 0) {
    form.port = option.defaultPort
  }
}

const handlePortChange = (value: number | null | undefined) => {
  form.port = value == null ? '' : value
}

const validateForm = async () => {
  try {
    await formRef.value?.validate()
    return true
  } catch {
    return false
  }
}

const handleTestConnection = async () => {
  const valid = await validateForm()
  if (!valid) return
  testing.value = true
  try {
    const payload = buildDatasourcePayload()
    const result = await testDatasourceConnection({
      sourceKind: payload.sourceKind,
      datasourceType: payload.datasourceType,
      host: payload.host,
      port: payload.port === '' ? '' : Number(payload.port),
      databaseName: payload.databaseName,
      username: payload.username,
      password: payload.password,
      configJson: payload.configJson,
    })
    ElMessage.success(result.message || '连接测试通过')
  } catch (error) {
    if (error instanceof Error && error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    testing.value = false
  }
}

const handleSubmit = async () => {
  const valid = await validateForm()
  if (!valid) return
  saving.value = true
  try {
    const payload = buildDatasourcePayload()
    const saved = dialogMode.value === 'create'
      ? await createDatasource(payload)
      : await updateDatasource(dialogEditId.value as number, payload)
    dialogVisible.value = false
    await loadDatasources(saved.id)
    ElMessage.success(dialogMode.value === 'create' ? '数据源创建成功' : '数据源更新成功')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await deleteDatasource(id)
  const remaining = datasources.value.filter((item) => item.id !== id)
  const nextSelected = remaining[0]?.id ?? null
  await loadDatasources(nextSelected)
  ElMessage.success('数据源已删除')
}

const buildDatasourcePayload = (): DatasourceForm => {
  if (form.sourceKind === 'DATABASE') {
    return {
      name: form.name.trim(),
      sourceKind: 'DATABASE',
      datasourceType: form.datasourceType,
      connectMode: 'DIRECT',
      host: form.host.trim(),
      port: form.port === '' ? '' : Number(form.port),
      databaseName: form.databaseName.trim(),
      username: form.username.trim(),
      password: form.password,
      configJson: '{}',
    }
  }

  if (form.sourceKind === 'API') {
    const headers = parseJsonObjectText(form.apiHeadersText, '请求头 JSON 必须是对象')
    const query = parseJsonObjectText(form.apiQueryText, 'Query 参数 JSON 必须是对象')
    const body = parseLooseJsonValue(form.apiBodyText)
    const config: Record<string, unknown> = {
      apiUrl: form.apiUrl.trim(),
      apiMethod: form.apiMethod,
    }
    if (Object.keys(headers).length) config.apiHeaders = headers
    if (Object.keys(query).length) config.apiQuery = query
    if (body !== undefined) config.apiBody = body
    if (form.apiResultPath.trim()) config.apiResultPath = form.apiResultPath.trim()
    return {
      name: form.name.trim(),
      sourceKind: 'API',
      datasourceType: 'REST_API',
      connectMode: 'DIRECT',
      host: '',
      port: '',
      databaseName: '',
      username: '',
      password: '',
      configJson: JSON.stringify(config),
    }
  }

  if (form.sourceKind === 'TABLE') {
    const config = {
      tableText: form.tableText,
      tableDelimiter: form.tableDelimiter,
      tableHasHeader: form.tableHasHeader,
    }
    return {
      name: form.name.trim(),
      sourceKind: 'TABLE',
      datasourceType: 'TABLE',
      connectMode: 'DIRECT',
      host: '',
      port: '',
      databaseName: '',
      username: '',
      password: '',
      configJson: JSON.stringify(config),
    }
  }

  parseJsonValueText(form.jsonText, 'JSON 静态数据内容不是合法 JSON')
  const config: Record<string, unknown> = {
    jsonText: form.jsonText,
  }
  if (form.jsonResultPath.trim()) config.jsonResultPath = form.jsonResultPath.trim()
  return {
    name: form.name.trim(),
    sourceKind: 'JSON_STATIC',
    datasourceType: 'JSON_STATIC',
    connectMode: 'DIRECT',
    host: '',
    port: '',
    databaseName: '',
    username: '',
    password: '',
    configJson: JSON.stringify(config),
  }
}

const sourceKindLabel = (kind: DatasourceSourceKind) => SOURCE_KIND_LABELS[kind] || kind
const resolveSourceKind = (datasource?: Datasource | null): DatasourceSourceKind => datasource?.sourceKind || 'DATABASE'
const isDatabaseDatasource = (datasource?: Datasource | null) => resolveSourceKind(datasource) === 'DATABASE'

const datasourceSubtitle = (datasource: Datasource) => {
  const sourceKind = resolveSourceKind(datasource)
  const config = parseConfigJson(datasource.configJson)
  if (sourceKind === 'DATABASE') {
    return `${datasource.datasourceType} · ${datasource.host}:${datasource.port}/${datasource.databaseName}`
  }
  if (sourceKind === 'API') {
    return readString(config.apiUrl ?? config.url) || '接口地址待配置'
  }
  if (sourceKind === 'TABLE') {
    const delimiter = readString(config.tableDelimiter ?? config.delimiter) || 'CSV'
    return `${delimiter} 文本源`
  }
  return 'JSON 静态数据源'
}

const parseConfigJson = (configJson?: string) => {
  if (!configJson) return {} as Record<string, unknown>
  try {
    const parsed = JSON.parse(configJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

const parseJsonObjectText = (jsonText: string, errorMessage: string) => {
  const trimmed = jsonText.trim()
  if (!trimmed) return {} as Record<string, unknown>
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(errorMessage)
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(errorMessage)
  }
}

const parseJsonValueText = (jsonText: string, errorMessage: string) => {
  try {
    return JSON.parse(jsonText)
  } catch {
    throw new Error(errorMessage)
  }
}

const parseLooseJsonValue = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

const readObject = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const readString = (value: unknown) => typeof value === 'string' ? value : ''
const readBoolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback
const countLines = (text: string) => text ? `${text.split(/\r?\n/).filter((item) => item.trim()).length} 行` : '0 行'
const stringifyUnknown = (value: unknown) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const validateBySourceKind = (callback: (error?: Error) => void, shouldFail: boolean, message: string) => {
  if (shouldFail) {
    callback(new Error(message))
    return
  }
  callback()
}

onMounted(async () => {
  await loadDatasources()
})
</script>

<style scoped>
.datasource-panel {
  height: 100%;
}

.datasource-panel :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.datasource-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: 100%;
  min-height: 720px;
}

.datasource-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid #e6eef8;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.sidebar-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px 14px;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  color: #183153;
}

.sidebar-subtitle {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #71829b;
}

.sidebar-search {
  padding: 0 18px 14px;
}

.datasource-list {
  flex: 1;
  overflow: auto;
  padding: 0 12px 16px;
}

.datasource-item {
  width: 100%;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px solid #dbe8f6;
  border-radius: 16px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.datasource-item:hover {
  transform: translateY(-1px);
  border-color: #9ec5eb;
  box-shadow: 0 10px 24px rgba(25, 74, 128, 0.08);
}

.datasource-item--active {
  border-color: #409eff;
  background: linear-gradient(180deg, #eff7ff 0%, #ffffff 100%);
}

.datasource-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.datasource-item-name {
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #183153;
}

.datasource-item-meta {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #71829b;
  word-break: break-all;
}

.datasource-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24px;
  background: #fbfdff;
}

.detail-head,
.section-head,
.section-head--compact,
.detail-title-row,
.detail-actions,
.dialog-footer,
.dialog-actions {
  display: flex;
  align-items: center;
}

.detail-head,
.section-head,
.dialog-footer {
  justify-content: space-between;
  gap: 12px;
}

.detail-title-row {
  gap: 10px;
  flex-wrap: wrap;
}

.detail-title-row h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  color: #183153;
}

.detail-subtitle,
.section-subtitle,
.preview-summary,
.form-tip,
.dialog-hint {
  font-size: 12px;
  line-height: 1.7;
  color: #71829b;
}

.detail-subtitle {
  margin-top: 8px;
}

.detail-actions,
.dialog-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
  min-height: 0;
}

.detail-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid #deebf7;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 57, 106, 0.06);
}

.detail-card--data {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #183153;
}

.detail-kv-grid {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.detail-kv-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f7fbff;
}

.detail-kv-item span {
  font-size: 12px;
  color: #71829b;
}

.detail-kv-item strong {
  min-width: 0;
  text-align: right;
  font-size: 13px;
  color: #183153;
  word-break: break-all;
}

.config-preview {
  margin-top: 16px;
}

.config-preview-head {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #183153;
}

.config-preview pre {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  padding: 12px;
  border-radius: 14px;
  background: #0f2138;
  color: #dce7f5;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.table-search {
  margin-top: 12px;
}

.table-browser {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  flex: 1;
}

.table-list,
.table-detail,
.column-list {
  min-height: 0;
  overflow: auto;
}

.table-list {
  padding-right: 4px;
}

.table-item {
  width: 100%;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid #dbe8f6;
  border-radius: 14px;
  background: #f9fbfe;
  text-align: left;
  cursor: pointer;
}

.table-item--active {
  border-color: #409eff;
  background: #eef6ff;
}

.table-item-name,
.column-name {
  font-size: 13px;
  font-weight: 700;
  color: #183153;
}

.table-item-meta,
.column-remark,
.table-empty {
  margin-top: 4px;
  font-size: 12px;
  color: #71829b;
}

.table-empty {
  padding: 18px 12px;
  border-radius: 14px;
  background: #f7fbff;
}

.table-empty--detail {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.column-list {
  display: grid;
  gap: 8px;
  margin: 12px 0 14px;
}

.column-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f7fbff;
}

.preview-table {
  width: 100%;
}

.main-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.datasource-form {
  padding-top: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid--basic {
  margin-bottom: 4px;
}

.form-item--full {
  grid-column: 1 / -1;
}

.source-kind-group {
  display: flex;
  flex-wrap: wrap;
}

.dialog-footer {
  width: 100%;
  padding-top: 8px;
}

@media (max-width: 1400px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .datasource-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .datasource-sidebar {
    border-right: none;
    border-bottom: 1px solid #e6eef8;
  }

  .table-browser,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>