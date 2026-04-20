<template>
  <!-- 左侧模型列表 + 右侧模型配置 -->
  <div class="model-layout">
    <!-- 左侧 -->
    <aside class="model-sidebar">
      <div class="model-sidebar-toolbar">
        <el-input v-model="sideSearch" size="small" placeholder="搜索" clearable style="flex:1" />
        <el-button type="primary" size="small" :icon="Plus" style="margin-left:6px;flex-shrink:0" @click="openCreate" />
      </div>
      <el-scrollbar>
        <div
          v-for="row in filteredRows"
          :key="row.id"
          class="model-list-item"
          :class="{ active: selectedId === row.id }"
          @click="selectedId = row.id"
        >
          <el-icon><DataAnalysis /></el-icon>
          <span class="model-item-name" :title="row.name">{{ row.name }}</span>
        </div>
        <div v-if="filteredRows.length === 0 && !loading" class="model-empty">暂无数据模型</div>
      </el-scrollbar>
    </aside>

    <!-- 右侧 -->
    <main class="model-main">
      <div v-if="!selected" class="model-empty-main">
        <el-empty description="请在左侧选择或新建数据模型" />
      </div>

      <template v-else>
        <!-- 标题栏 -->
        <div class="model-detail-header">
          <span class="model-detail-title">{{ selected.name }}</span>
          <div class="model-detail-actions">
            <el-button size="small" :icon="Edit" @click="openEdit(selected)">编辑</el-button>
            <el-popconfirm title="确认删除该数据模型？" @confirm="handleDelete(selected.id)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <!-- 模型详情 Tab -->
        <el-tabs class="model-tabs">
          <el-tab-pane label="基础信息" name="info">
            <el-descriptions border :column="2" size="small" style="padding:12px 0">
              <el-descriptions-item label="名称">{{ selected.name }}</el-descriptions-item>
              <el-descriptions-item label="描述">{{ selected.description || '—' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ selected.createdAt }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="表关联配置" name="joins">
            <div class="model-config-section">
              <ModelJoinConfig :config-json="selected!.configJson" @save="(json) => saveConfig(selected!.id, json)" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="计算字段" name="fields">
            <div class="model-config-section">
              <ModelCalcFields :config-json="selected!.configJson" @save="(json) => saveConfig(selected!.id, json)" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </main>
  </div>

  <!-- 新建 / 编辑对话框 -->
  <el-dialog v-model="dialogVisible" :title="editId ? '编辑数据模型' : '新建数据模型'" width="500px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="模型名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入模型名称" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, defineComponent, onMounted, reactive, ref } from 'vue'
import { ElButton, ElInput, ElMessage, ElOption, ElSelect, ElTable, ElTableColumn } from 'element-plus'
import { DataAnalysis, Edit, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createModel, deleteModel, getModelList, updateModel,
  type BiModel, type ModelForm
} from '../api/model'

// ─── Sub-components (inline for simplicity) ──────────────────────────────────
const ModelJoinConfig = defineComponent({
  components: { ElButton, ElInput, ElOption, ElSelect, ElTable, ElTableColumn },
  props: { configJson: String },
  emits: ['save'],
  setup(props, { emit }) {
    const config = computed(() => {
      try { return JSON.parse(props.configJson || '{}') } catch { return {} }
    })
    const joins = ref<{ leftTable: string; rightTable: string; leftField: string; rightField: string; joinType: string }[]>(
      config.value.joins ?? []
    )
    const addJoin = () => joins.value.push({ leftTable: '', rightTable: '', leftField: '', rightField: '', joinType: 'LEFT' })
    const removeJoin = (i: number) => joins.value.splice(i, 1)
    const save = () => emit('save', JSON.stringify({ ...config.value, joins: joins.value }))
    return { joins, addJoin, removeJoin, save }
  },
  template: `
    <div>
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:#606266">配置表之间的关联关系（JOIN）</span>
        <el-button size="small" type="primary" @click="addJoin">添加关联</el-button>
      </div>
      <el-table :data="joins" border size="small">
        <el-table-column label="左表" min-width="120">
          <template #default="{row}"><el-input v-model="row.leftTable" size="small" /></template>
        </el-table-column>
        <el-table-column label="左字段" min-width="120">
          <template #default="{row}"><el-input v-model="row.leftField" size="small" /></template>
        </el-table-column>
        <el-table-column label="JOIN类型" width="120">
          <template #default="{row}">
            <el-select v-model="row.joinType" size="small">
              <el-option value="INNER" label="INNER JOIN" />
              <el-option value="LEFT" label="LEFT JOIN" />
              <el-option value="RIGHT" label="RIGHT JOIN" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="右表" min-width="120">
          <template #default="{row}"><el-input v-model="row.rightTable" size="small" /></template>
        </el-table-column>
        <el-table-column label="右字段" min-width="120">
          <template #default="{row}"><el-input v-model="row.rightField" size="small" /></template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{$index}">
            <el-button link type="danger" @click="removeJoin($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;text-align:right">
        <el-button type="primary" size="small" @click="save">保存配置</el-button>
      </div>
    </div>`
})

const ModelCalcFields = defineComponent({
  components: { ElButton, ElInput, ElOption, ElSelect, ElTable, ElTableColumn },
  props: { configJson: String },
  emits: ['save'],
  setup(props, { emit }) {
    const config = computed(() => {
      try { return JSON.parse(props.configJson || '{}') } catch { return {} }
    })
    const fields = ref<{ fieldName: string; expression: string; fieldType: string }[]>(
      config.value.calcFields ?? []
    )
    const addField = () => fields.value.push({ fieldName: '', expression: '', fieldType: 'MEASURE' })
    const removeField = (i: number) => fields.value.splice(i, 1)
    const save = () => emit('save', JSON.stringify({ ...config.value, calcFields: fields.value }))
    return { fields, addField, removeField, save }
  },
  template: `
    <div>
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:#606266">定义计算字段（SQL 表达式）</span>
        <el-button size="small" type="primary" @click="addField">添加计算字段</el-button>
      </div>
      <el-table :data="fields" border size="small">
        <el-table-column label="字段名" width="160">
          <template #default="{row}"><el-input v-model="row.fieldName" size="small" placeholder="如 profit" /></template>
        </el-table-column>
        <el-table-column label="表达式" min-width="220">
          <template #default="{row}"><el-input v-model="row.expression" size="small" placeholder="如 price * quantity" /></template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{row}">
            <el-select v-model="row.fieldType" size="small">
              <el-option value="MEASURE" label="度量（数值）" />
              <el-option value="DIMENSION" label="维度（分类）" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{$index}">
            <el-button link type="danger" @click="removeField($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;text-align:right">
        <el-button type="primary" size="small" @click="save">保存配置</el-button>
      </div>
    </div>`
})

// ─── Main panel ───────────────────────────────────────────────────────────────
const rows      = ref<BiModel[]>([])
const loading   = ref(false)
const sideSearch = ref('')
const selectedId = ref<number | null>(null)
const selected   = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null)

const filteredRows = computed(() =>
  rows.value.filter((r) => !sideSearch.value || r.name.toLowerCase().includes(sideSearch.value.toLowerCase()))
)

const loadList = async () => {
  loading.value = true
  try {
    rows.value = await getModelList()
    if (!selectedId.value && rows.value.length) selectedId.value = rows.value[0].id
  } finally { loading.value = false }
}

const saveConfig = async (id: number, json: string) => {
  const row = rows.value.find((r) => r.id === id)
  if (!row) return
  await updateModel(id, { name: row.name, description: row.description, configJson: json })
  ElMessage.success('配置已保存')
  await loadList()
}

// ─── Create / Edit ─────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const saving        = ref(false)
const editId        = ref<number | null>(null)
const formRef       = ref<FormInstance>()
const emptyForm     = (): ModelForm => ({ name: '', description: '', configJson: '{}' })
const form          = reactive<ModelForm>(emptyForm())
const rules: FormRules = { name: [{ required: true, message: '请输入名称', trigger: 'blur' }] }

const openCreate = () => { editId.value = null; Object.assign(form, emptyForm()); dialogVisible.value = true }
const openEdit = (row: BiModel) => {
  editId.value = row.id
  form.name = row.name; form.description = row.description; form.configJson = row.configJson
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editId.value) {
      await updateModel(editId.value, form); ElMessage.success('更新成功')
    } else {
      const created = await createModel(form); ElMessage.success('创建成功')
      selectedId.value = created.id
    }
    dialogVisible.value = false
    await loadList()
  } finally { saving.value = false }
}

const handleDelete = async (id: number) => {
  await deleteModel(id); ElMessage.success('删除成功')
  if (selectedId.value === id) selectedId.value = null
  await loadList()
}

onMounted(loadList)
</script>

<style scoped>
.model-layout { display: flex; height: calc(100vh - 64px); overflow: hidden; background: #f5f7fa; }

.model-sidebar {
  width: 220px; min-width: 220px; background: #fff;
  border-right: 1px solid #e4e7ed; display: flex; flex-direction: column;
}
.model-sidebar-toolbar { padding: 10px 8px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; }
.model-list-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; cursor: pointer; font-size: 13px; color: #303133; transition: background .15s; }
.model-list-item:hover { background: #f5f7fa; }
.model-list-item.active { background: #ecf5ff; color: #409eff; font-weight: 500; }
.model-item-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.model-empty { text-align:center; padding:24px; color:#909399; font-size:13px; }

.model-main { flex:1; background:#fff; display:flex; flex-direction:column; overflow:hidden; }
.model-empty-main { flex:1; display:flex; align-items:center; justify-content:center; }

.model-detail-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 20px; border-bottom:1px solid #f0f0f0;
}
.model-detail-title { font-size:15px; font-weight:600; color:#303133; }
.model-detail-actions { display:flex; gap:8px; }

.model-tabs { flex:1; overflow:hidden; padding:0 20px; }
:deep(.el-tabs__content) { overflow:auto; }

.model-config-section { padding: 4px 0 12px; }
</style>
