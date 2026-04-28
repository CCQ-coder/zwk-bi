<template>
  <el-card class="bi-page dataset-panel">
    <div class="panel-layout">
      <!-- 左侧文件夹树 -->
      <div class="folder-tree-panel">
        <div class="tree-header">
          <span class="tree-title">数据集</span>
          <div class="tree-actions">
            <el-tooltip content="新建文件夹">
              <el-button :icon="FolderAdd" circle size="small" @click="openCreateFolder(null)" />
            </el-tooltip>
            <el-tooltip content="新建数据集">
              <el-button :icon="Plus" circle size="small" type="primary" @click="openCreate(null)" />
            </el-tooltip>
          </div>
        </div>

        <div v-if="treeLoading" class="tree-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
        </div>
        <div v-else-if="!folderTree.length" class="tree-empty">暂无数据集</div>
        <div v-else class="tree-body">
          <TreeNode
            v-for="folder in folderTree"
            :key="folder.id"
            :node="folder"
            :selected-id="selectedDatasetId"
            @select="handleSelectDataset"
            @add-dataset="openCreate"
            @add-folder="openCreateFolder"
            @rename-folder="openRenameFolder"
            @delete-folder="handleDeleteFolder"
            @delete-dataset="handleDeleteDataset"
          />
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="main-content">
        <template v-if="selectedDataset">
          <div class="content-header">
            <span class="content-title">{{ selectedDataset.name }}</span>
            <div class="content-actions">
              <el-button type="primary" size="small" @click="openEdit(selectedDataset)">编辑</el-button>
              <el-popconfirm v-if="selectedDataset.datasourceId" title="确认删除？" @confirm="handleDeleteDataset(selectedDataset.id)">
                <template #reference>
                  <el-button type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
              <el-tag v-if="!selectedDataset.datasourceId" type="success" size="small">演示数据集</el-tag>
            </div>
          </div>
          <div class="content-info">
            <div class="info-row">
              <span class="info-label">数据源ID</span>
              <span class="info-val">{{ !selectedDataset.datasourceId ? '内置演示' : selectedDataset.datasourceId }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">SQL</span>
              <pre class="info-sql">{{ selectedDataset.sqlText }}</pre>
            </div>
            <div class="info-row">
              <span class="info-label">创建时间</span>
              <span class="info-val">{{ selectedDataset.createdAt }}</span>
            </div>
          </div>
          <!-- 数据预览 -->
          <div class="preview-section">
            <div class="preview-hd">
              <span>数据预览</span>
              <el-button size="small" :loading="previewLoading" @click="loadPreview">刷新预览</el-button>
            </div>
            <el-table v-if="preview.columns.length" :data="preview.rows" border max-height="320" size="small">
              <el-table-column
                v-for="col in preview.columns"
                :key="col"
                :prop="col"
                :label="col"
                min-width="120"
                show-overflow-tooltip
              />
            </el-table>
            <div v-else class="preview-empty">点击「刷新预览」查看数据</div>
          </div>
        </template>

        <div v-else class="content-empty">
          <el-empty description="请在左侧选择数据集" />
        </div>
      </div>
    </div>

    <!-- 新建/编辑数据集弹窗 -->
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
          <div v-else-if="!form.datasourceId" class="browser-tip">当前为演示数据集，可直接编写静态 SQL 标识，无需选择数据源。</div>
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

          <template v-if="selectedTable">
            <div class="column-header">
              <span>{{ selectedTable }} 的字段</span>
              <el-button link type="primary" size="small" @click="generateSql">生成 SELECT SQL</el-button>
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
            <el-form-item label="所属文件夹">
              <el-select v-model="form.folderId" placeholder="根目录（不选文件夹）" clearable style="width:100%">
                <el-option
                  v-for="f in allFoldersFlat"
                  :key="f.id"
                  :label="f.name"
                  :value="f.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="数据源" prop="datasourceId">
              <el-select
                v-model="form.datasourceId"
                placeholder="留空表示演示数据集"
                clearable
                style="width:100%"
                @change="onDatasourceChange"
              >
                <el-option
                  v-for="ds in datasources"
                  :key="ds.id"
                  :label="`${ds.name} (${ds.datasourceType || 'DATABASE'})`"
                  :value="ds.id"
                />
              </el-select>
              <div class="preview-empty" style="margin-top:6px;text-align:left">数据库数据集请选择数据库型数据源；演示 / 静态数据集可留空，直接使用内置静态数据标识。</div>
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

          <div v-if="formPreview.columns.length" class="preview-panel">
            <div class="preview-header">
              <span>预览结果</span>
              <span>最多展示 {{ formPreview.rowCount }} 行</span>
            </div>
            <el-table :data="formPreview.rows" border max-height="240">
              <el-table-column
                v-for="column in formPreview.columns"
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
        <el-button :loading="previewBtnLoading" @click="handlePreview">预览 SQL</el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 创建文件夹弹窗 -->
    <el-dialog v-model="folderDialogVisible" :title="folderEditId ? '重命名文件夹' : '新建文件夹'" width="400px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="folderName" placeholder="请输入文件夹名称" @keyup.enter="handleFolderSubmit" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="folderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="folderSaving" @click="handleFolderSubmit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, withDirectives, vShow, type VNode } from 'vue'
import { ElMessage, ElMessageBox, ElIcon, ElTooltip, ElButton } from 'element-plus'
import { ArrowRight, DataLine, Delete, Edit, Folder, FolderAdd, Grid, Loading, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createDataset,
  createDatasetFolder,
  deleteDataset,
  deleteDatasetFolder,
  getDatasetFolderTree,
  getDatasetPreviewData,
  previewDatasetSql,
  renameDatasetFolder,
  updateDataset,
  type Dataset,
  type DatasetFolder,
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

// ---- Tree Node Component (render function, no runtime compiler needed) ----
const TreeNode: ReturnType<typeof defineComponent> = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object as () => DatasetFolder, required: true },
    selectedId: { type: Number as unknown as () => number | null, default: null }
  },
  emits: ['select', 'add-dataset', 'add-folder', 'rename-folder', 'delete-folder', 'delete-dataset'],
  setup(props, { emit }) {
    const expanded = ref(true)
    const hover = ref(false)
    const hoverDataset = ref<number | null>(null)

    return () => {
      const node = props.node

      // Folder row
      const folderRow = h('div', {
        class: 'folder-row',
        onMouseenter: () => { hover.value = true },
        onMouseleave: () => { hover.value = false },
        onClick: () => { expanded.value = !expanded.value }
      }, [
        h(ElIcon, { class: 'expand-icon', style: { transform: expanded.value ? 'rotate(90deg)' : '' } }, () => h(ArrowRight)),
        h(ElIcon, { class: 'folder-icon', style: 'color:#e6a43c;margin-right:4px' }, () => h(Folder)),
        h('span', { class: 'folder-name' }, node.name),
        withDirectives(h('div', { class: 'node-actions', onClick: (e: Event) => e.stopPropagation() }, [
          h(ElTooltip, { content: '在此文件夹新建数据集' }, () =>
            h(ElButton, { link: true, icon: Plus, onClick: () => emit('add-dataset', node.id) })
          ),
          h(ElTooltip, { content: '新建子文件夹' }, () =>
            h(ElButton, { link: true, icon: FolderAdd, onClick: () => emit('add-folder', node.id) })
          ),
          h(ElTooltip, { content: '重命名' }, () =>
            h(ElButton, { link: true, icon: Edit, onClick: () => emit('rename-folder', node) })
          ),
          ...(node.id > 0 ? [
            h(ElTooltip, { content: '删除文件夹' }, () =>
              h(ElButton, { link: true, icon: Delete, style: 'color:#f56c6c', onClick: () => emit('delete-folder', node.id) })
            )
          ] : [])
        ]), [[vShow, hover.value]])
      ])

      // Child folders (recursive)
      const childFolders = (node.children || []).map((child: DatasetFolder) =>
        h(TreeNode, {
          key: child.id,
          node: child,
          selectedId: props.selectedId,
          onSelect: (id: number) => emit('select', id),
          'onAdd-dataset': (id: number) => emit('add-dataset', id),
          'onAdd-folder': (id: number) => emit('add-folder', id),
          'onRename-folder': (n: DatasetFolder) => emit('rename-folder', n),
          'onDelete-folder': (id: number) => emit('delete-folder', id),
          'onDelete-dataset': (id: number) => emit('delete-dataset', id),
        })
      )

      // Dataset rows
      const datasetRows = (node.datasets || []).map((ds: Dataset) =>
        h('div', {
          key: 'ds-' + ds.id,
          class: ['dataset-row', { selected: props.selectedId === ds.id }],
          onMouseenter: () => { hoverDataset.value = ds.id },
          onMouseleave: () => { hoverDataset.value = null },
          onClick: () => emit('select', ds.id)
        }, [
          h(ElIcon, { style: 'color:#409eff;margin-right:4px;font-size:12px' }, () => h(DataLine)),
          h('span', { class: 'dataset-name' }, ds.name),
          withDirectives(h('div', { class: 'node-actions', onClick: (e: Event) => e.stopPropagation() }, [
            h(ElTooltip, { content: '删除' }, () =>
              h(ElButton, { link: true, icon: Delete, style: 'color:#f56c6c', onClick: () => emit('delete-dataset', ds.id) })
            )
          ]), [[vShow, hoverDataset.value === ds.id && !!ds.datasourceId]])
        ])
      )

      // Empty folder hint
      const emptyHint = (!node.children?.length && !node.datasets?.length)
        ? [h('div', { class: 'empty-folder' }, '空文件夹')]
        : []

      // Children container
      const childrenContainer = withDirectives(
        h('div', { class: 'folder-children' }, [...childFolders, ...datasetRows, ...emptyHint]),
        [[vShow, expanded.value]]
      )

      return h('div', { class: 'tree-folder' }, [folderRow, childrenContainer])
    }
  }
})

const folderTree = ref<DatasetFolder[]>([])
const treeLoading = ref(false)
const datasources = ref<Datasource[]>([])
const selectedDatasetId = ref<number | null>(null)
const selectedDataset = ref<Dataset | null>(null)
const preview = reactive<DatasetPreviewResult>({ columns: [], rows: [], rowCount: 0 })
const previewLoading = ref(false)

// Dialog state
const dialogVisible = ref(false)
const saving = ref(false)
const previewBtnLoading = ref(false)
const editId = ref<number | null>(null)
const pendingFolderId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const formPreview = reactive<DatasetPreviewResult>({ columns: [], rows: [], rowCount: 0 })

// Table browser state
const tables = ref<TableInfo[]>([])
const tablesLoading = ref(false)
const tableSearch = ref('')
const selectedTable = ref('')
const tableColumns = ref<ColumnMeta[]>([])
const columnsLoading = ref(false)

// Folder dialog state
const folderDialogVisible = ref(false)
const folderName = ref('')
const folderSaving = ref(false)
const folderEditId = ref<number | null>(null)
const folderParentId = ref<number | null>(null)

const filteredTables = computed(() =>
  tableSearch.value
    ? tables.value.filter(t =>
        t.tableName.toLowerCase().includes(tableSearch.value.toLowerCase())
      )
    : tables.value
)

// Flatten all folders for the folder selector (exclude virtual "未分类" folder)
const allFoldersFlat = computed(() => {
  const result: DatasetFolder[] = []
  const flatten = (nodes: DatasetFolder[]) => {
    for (const n of nodes) {
      if (n.id > 0) result.push(n)
      if (n.children?.length) flatten(n.children)
    }
  }
  flatten(folderTree.value)
  return result
})

// All datasets flat (for selection lookup)
const allDatasetsFlat = computed(() => {
  const result: Dataset[] = []
  const collect = (nodes: DatasetFolder[]) => {
    for (const n of nodes) {
      if (n.datasets) result.push(...n.datasets)
      if (n.children) collect(n.children)
    }
  }
  collect(folderTree.value)
  return result
})

const emptyForm = (): DatasetForm => ({
  name: '',
  datasourceId: '',
  sqlText: '',
  folderId: null
})

const form = reactive<DatasetForm>(emptyForm())

const resolveDatasourceValue = (value: number | string | null | undefined) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null
}

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  sqlText: [{ required: true, message: '请输入 SQL', trigger: 'blur' }]
}

const loadTree = async () => {
  treeLoading.value = true
  try {
    const [tree, datasourceList] = await Promise.all([
      getDatasetFolderTree(),
      getDatasourceList()
    ])
    folderTree.value = tree
    datasources.value = datasourceList.filter((item) => (item.sourceKind || 'DATABASE') === 'DATABASE')
  } finally {
    treeLoading.value = false
  }
}

const handleSelectDataset = async (id: number) => {
  selectedDatasetId.value = id
  const ds = allDatasetsFlat.value.find(d => d.id === id)
  selectedDataset.value = ds ?? null
  Object.assign(preview, { columns: [], rows: [], rowCount: 0 })
}

const loadPreview = async () => {
  if (!selectedDataset.value) return
  previewLoading.value = true
  try {
    const result = await getDatasetPreviewData(selectedDataset.value.id)
    Object.assign(preview, result)
  } catch {
    ElMessage.error('预览失败')
  } finally {
    previewLoading.value = false
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
  const datasourceId = resolveDatasourceValue(form.datasourceId)
  if (datasourceId) loadTables(datasourceId)
}

const onDatasourceChange = (val: number | string) => {
  const datasourceId = resolveDatasourceValue(val)
  if (!datasourceId) {
    tables.value = []
    selectedTable.value = ''
    tableColumns.value = []
    return
  }
  loadTables(datasourceId)
}

const selectTable = async (tableName: string) => {
  selectedTable.value = tableName
  tableColumns.value = []
  const datasourceId = resolveDatasourceValue(form.datasourceId)
  if (!datasourceId) return
  columnsLoading.value = true
  try {
    tableColumns.value = await getTableColumns(datasourceId, tableName)
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

const openCreate = (folderId: number | null) => {
  editId.value = null
  Object.assign(form, emptyForm())
  form.folderId = folderId
  Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 })
  tables.value = []
  selectedTable.value = ''
  tableColumns.value = []
  tableSearch.value = ''
  dialogVisible.value = true
}

const openEdit = (row: Dataset) => {
  editId.value = row.id
  form.name = row.name
  form.datasourceId = resolveDatasourceValue(row.datasourceId) ?? ''
  form.sqlText = row.sqlText
  form.folderId = row.folderId
  Object.assign(formPreview, { columns: [], rows: [], rowCount: 0 })
  selectedTable.value = ''
  tableColumns.value = []
  tableSearch.value = ''
  dialogVisible.value = true
  if (row.datasourceId) loadTables(Number(row.datasourceId))
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload: DatasetForm = {
      name: form.name,
      datasourceId: resolveDatasourceValue(form.datasourceId),
      sqlText: form.sqlText,
      folderId: form.folderId,
    }
    if (editId.value) {
      await updateDataset(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createDataset(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadTree()
  } finally {
    saving.value = false
  }
}

const handleDeleteDataset = async (id: number) => {
  await ElMessageBox.confirm('确认删除该数据集？', '提示', { type: 'warning' })
  await deleteDataset(id)
  ElMessage.success('删除成功')
  if (selectedDatasetId.value === id) {
    selectedDatasetId.value = null
    selectedDataset.value = null
  }
  await loadTree()
}

const handlePreview = async () => {
  await formRef.value?.validateField(['sqlText'])
  previewBtnLoading.value = true
  try {
    const result = await previewDatasetSql({
      datasourceId: resolveDatasourceValue(form.datasourceId),
      sqlText: form.sqlText
    })
    Object.assign(formPreview, result)
    ElMessage.success('SQL 预览成功')
  } finally {
    previewBtnLoading.value = false
  }
}

// Folder operations
const openCreateFolder = (parentId: number | null) => {
  folderEditId.value = null
  folderParentId.value = parentId
  folderName.value = ''
  folderDialogVisible.value = true
}

const openRenameFolder = (node: DatasetFolder) => {
  folderEditId.value = node.id
  folderName.value = node.name
  folderDialogVisible.value = true
}

const handleFolderSubmit = async () => {
  if (!folderName.value.trim()) {
    ElMessage.warning('请输入文件夹名称')
    return
  }
  folderSaving.value = true
  try {
    if (folderEditId.value) {
      await renameDatasetFolder(folderEditId.value, folderName.value.trim())
      ElMessage.success('重命名成功')
    } else {
      await createDatasetFolder(folderName.value.trim(), folderParentId.value)
      ElMessage.success('创建成功')
    }
    folderDialogVisible.value = false
    await loadTree()
  } catch {
    // error already shown by request interceptor
  } finally {
    folderSaving.value = false
  }
}

const handleDeleteFolder = async (id: number) => {
  await ElMessageBox.confirm('删除文件夹将同时删除其中所有子文件夹，数据集将被保留至未分类。确认删除？', '提示', { type: 'warning' })
  await deleteDatasetFolder(id)
  ElMessage.success('已删除')
  await loadTree()
}

onMounted(loadTree)
</script>

<style scoped>
.dataset-panel :deep(.el-card__body) {
  padding: 0;
  height: 100%;
}

.panel-layout {
  display: flex;
  height: calc(100vh - 100px);
  min-height: 500px;
}

/* ---- 左侧树 ---- */
.folder-tree-panel {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px 10px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.tree-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.tree-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
  color: #909399;
  font-size: 20px;
}

.tree-empty {
  text-align: center;
  padding: 32px;
  color: #909399;
  font-size: 13px;
}

.tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

/* ---- 树节点样式 ---- */
:deep(.tree-folder) {
  user-select: none;
}

:deep(.folder-row) {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  font-size: 13px;
  color: #303133;
  transition: background 0.15s;
  position: relative;
}

:deep(.folder-row:hover) {
  background: #f5f7fa;
}

:deep(.expand-icon) {
  font-size: 10px;
  color: #909399;
  margin-right: 4px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

:deep(.folder-name) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.folder-children) {
  padding-left: 16px;
}

:deep(.dataset-row) {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  font-size: 12px;
  color: #606266;
  transition: background 0.15s;
}

:deep(.dataset-row:hover) {
  background: #f0f2f5;
}

:deep(.dataset-row.selected) {
  background: #ecf5ff;
  color: #409eff;
}

:deep(.dataset-name) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.node-actions) {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

:deep(.node-actions .el-button) {
  padding: 2px;
  font-size: 12px;
}

:deep(.empty-folder) {
  padding: 4px 12px;
  font-size: 12px;
  color: #c0c4cc;
}

/* ---- 右侧内容 ---- */
.main-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.content-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.content-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.content-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.content-info {
  background: #f8f9fc;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: #909399;
  min-width: 60px;
  flex-shrink: 0;
}

.info-val {
  color: #303133;
}

.info-sql {
  color: #303133;
  font-family: monospace;
  font-size: 12px;
  margin: 0;
  background: #eef0f5;
  padding: 6px 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
}

.preview-section {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
}

.preview-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.preview-empty {
  text-align: center;
  padding: 32px;
  color: #c0c4cc;
  font-size: 13px;
}

/* ---- dialog styles ---- */
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
