<template>
  <div class="asset-panel">
    <div class="panel-toolbar">
      <div class="toolbar-left">
        <span class="panel-title">组件资产库</span>
        <el-input v-model="keyword" placeholder="搜索组件名称/描述" clearable size="small" class="toolbar-input" />
        <el-select v-model="typeFilter" size="small" class="toolbar-select">
          <el-option label="全部类型" value="ALL" />
          <el-option v-for="option in chartTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </div>
      <div class="toolbar-actions">
        <el-button size="small" @click="loadAll">刷新</el-button>
        <el-button type="primary" size="small" @click="openCreate">新增组件</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="filteredTemplates" border size="small" height="100%">
      <el-table-column prop="name" label="组件名称" min-width="180" />
      <el-table-column prop="chartType" label="类型" width="110">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ chartTypeLabel(row.chartType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源数据" min-width="180">
        <template #default="{ row }">
          {{ getTemplateSummary(row).datasetName }}
        </template>
      </el-table-column>
      <el-table-column label="画布尺寸" width="130">
        <template #default="{ row }">
          {{ getTemplateSummary(row).sizeText }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="来源类型" width="110">
        <template #default="{ row }">
          <el-tag :type="row.builtIn ? 'warning' : 'success'" size="small">
            {{ row.builtIn ? '默认组件' : '自定义组件' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdBy" label="创建人" width="110" />
      <el-table-column prop="createdAt" label="创建时间" min-width="165" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="cloneTemplate(row)">复制</el-button>
          <el-popconfirm
            :title="row.builtIn ? '默认组件不允许删除' : '确认删除该组件资产？'"
            :disabled="row.builtIn"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" :disabled="row.builtIn">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑组件资产' : '新增组件资产'" width="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="asset-form">
        <div class="form-grid">
          <el-form-item label="组件名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入组件名称" />
          </el-form-item>
          <el-form-item label="图表类型" prop="chartType">
            <el-select v-model="form.chartType" style="width: 100%">
              <el-option v-for="option in chartTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="导入图表">
            <el-select v-model="form.sourceChartId" clearable filterable style="width: 100%" @change="applySourceChart">
              <el-option
                v-for="chart in charts"
                :key="chart.id"
                :label="`${chart.name} · ${chartTypeLabel(chart.chartType)}`"
                :value="chart.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="数据集" prop="datasetId">
            <el-select v-model="form.datasetId" filterable style="width: 100%" @change="loadDatasetFields">
              <el-option v-for="dataset in datasets" :key="dataset.id" :label="dataset.name" :value="dataset.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="维度字段">
            <el-select v-model="form.xField" clearable filterable style="width: 100%">
              <el-option v-for="field in datasetFields" :key="field.fieldName" :label="field.fieldName" :value="field.fieldName" />
            </el-select>
          </el-form-item>
          <el-form-item label="度量字段">
            <el-select v-model="form.yField" clearable filterable style="width: 100%">
              <el-option v-for="field in datasetFields" :key="field.fieldName" :label="field.fieldName" :value="field.fieldName" />
            </el-select>
          </el-form-item>
          <el-form-item label="分组字段">
            <el-select v-model="form.groupField" clearable filterable style="width: 100%">
              <el-option v-for="field in datasetFields" :key="field.fieldName" :label="field.fieldName" :value="field.fieldName" />
            </el-select>
          </el-form-item>
          <el-form-item label="配色主题">
            <el-select v-model="form.theme" style="width: 100%">
              <el-option v-for="theme in themeOptions" :key="theme" :label="theme" :value="theme" />
            </el-select>
          </el-form-item>
          <el-form-item label="组件宽度" prop="width">
            <el-input-number v-model="form.width" :min="320" :max="1400" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="组件高度" prop="height">
            <el-input-number v-model="form.height" :min="220" :max="900" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="背景颜色">
            <el-color-picker v-model="form.bgColor" show-alpha />
          </el-form-item>
          <el-form-item label="说明" class="form-item-full">
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述该组件适用场景" />
          </el-form-item>
        </div>

        <div class="switch-row">
          <el-switch v-model="form.showLegend" active-text="显示图例" />
          <el-switch v-model="form.showLabel" active-text="显示标签" />
          <el-switch v-model="form.showGrid" active-text="显示网格" />
          <el-switch v-model="form.smooth" active-text="平滑曲线" :disabled="form.chartType !== 'line'" />
          <el-switch v-model="form.areaFill" active-text="面积填充" :disabled="form.chartType !== 'line'" />
        </div>

        <div class="preview-card">
          <div class="preview-title">配置预览</div>
          <pre>{{ previewConfigJson }}</pre>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { createTemplate, deleteTemplate, getTemplateList, updateTemplate, type ChartTemplate } from '../api/chart-template'
import { getChartList, type Chart } from '../api/chart'
import { getDatasetFields, getDatasetList, type Dataset, type DatasetField } from '../api/dataset'
import { COLOR_THEMES, chartTypeLabel, normalizeComponentAssetConfig } from '../utils/component-config'

interface TemplateFormState {
  name: string
  description: string
  sourceChartId: number | null
  datasetId: number | ''
  chartType: string
  xField: string
  yField: string
  groupField: string
  theme: string
  bgColor: string
  showLegend: boolean
  showLabel: boolean
  showGrid: boolean
  smooth: boolean
  areaFill: boolean
  width: number
  height: number
}

const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const typeFilter = ref('ALL')
const templates = ref<ChartTemplate[]>([])
const charts = ref<Chart[]>([])
const datasets = ref<Dataset[]>([])
const datasetFields = ref<DatasetField[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const currentTemplate = ref<ChartTemplate | null>(null)
const formRef = ref<FormInstance>()
const themeOptions = Object.keys(COLOR_THEMES)
const chartTypeOptions = [
  { label: '基础柱状图', value: 'bar' },
  { label: '堆叠柱状图', value: 'bar_stack' },
  { label: '百分比柱状图', value: 'bar_percent' },
  { label: '分组柱状图', value: 'bar_group' },
  { label: '基础条形图', value: 'bar_horizontal' },
  { label: '堆叠条形图', value: 'bar_horizontal_stack' },
  { label: '基础折线图', value: 'line' },
  { label: '面积图', value: 'area' },
  { label: '堆叠折线图', value: 'line_stack' },
  { label: '饼图', value: 'pie' },
  { label: '环图', value: 'doughnut' },
  { label: '玫瑰图', value: 'rose' },
  { label: '漏斗图', value: 'funnel' },
  { label: '仪表盘', value: 'gauge' },
  { label: '雷达图', value: 'radar' },
  { label: '散点图', value: 'scatter' },
  { label: '矩形树图', value: 'treemap' },
  { label: '表格', value: 'table' },
]

const form = reactive<TemplateFormState>({
  name: '',
  description: '',
  sourceChartId: null,
  datasetId: '',
  chartType: 'bar',
  xField: '',
  yField: '',
  groupField: '',
  theme: themeOptions[0] || '默认蓝',
  bgColor: '#ffffff',
  showLegend: true,
  showLabel: true,
  showGrid: true,
  smooth: false,
  areaFill: false,
  width: 520,
  height: 320,
})

const rules: FormRules<TemplateFormState> = {
  name: [{ required: true, message: '请输入组件名称', trigger: 'blur' }],
  chartType: [{ required: true, message: '请选择图表类型', trigger: 'change' }],
  datasetId: [{ required: true, message: '请选择数据集', trigger: 'change' }],
  width: [{ required: true, message: '请输入组件宽度', trigger: 'change' }],
  height: [{ required: true, message: '请输入组件高度', trigger: 'change' }],
}

const filteredTemplates = computed(() => templates.value.filter((item) => {
  const text = keyword.value.trim().toLowerCase()
  const byKeyword = !text
    || item.name.toLowerCase().includes(text)
    || item.description.toLowerCase().includes(text)
    || item.createdBy.toLowerCase().includes(text)
  const byType = typeFilter.value === 'ALL' || item.chartType === typeFilter.value
  return byKeyword && byType
}))

const previewConfigJson = computed(() => JSON.stringify(buildPayloadConfig(), null, 2))

const resetForm = () => {
  editingId.value = null
  currentTemplate.value = null
  datasetFields.value = []
  Object.assign(form, {
    name: '',
    description: '',
    sourceChartId: null,
    datasetId: '',
    chartType: 'bar',
    xField: '',
    yField: '',
    groupField: '',
    theme: themeOptions[0] || '默认蓝',
    bgColor: '#ffffff',
    showLegend: true,
    showLabel: true,
    showGrid: true,
    smooth: false,
    areaFill: false,
    width: 520,
    height: 320,
  })
}

const buildPayloadConfig = () => {
  const existing = currentTemplate.value ? normalizeComponentAssetConfig(currentTemplate.value.configJson) : null
  return {
    chart: {
      ...(existing?.chart ?? {}),
      name: form.name,
      datasetId: form.datasetId,
      chartType: form.chartType,
      xField: form.xField,
      yField: form.yField,
      groupField: form.groupField,
    },
    style: {
      ...(existing?.style ?? {}),
      theme: form.theme,
      bgColor: form.bgColor,
      showLegend: form.showLegend,
      showLabel: form.showLabel,
      showGrid: form.showGrid,
      smooth: form.chartType === 'line' ? form.smooth : false,
      areaFill: form.chartType === 'line' ? form.areaFill : false,
    },
    interaction: {
      ...(existing?.interaction ?? {}),
      clickAction: existing?.interaction.clickAction ?? 'filter',
      enableClickLinkage: existing?.interaction.enableClickLinkage ?? true,
      allowManualFilters: existing?.interaction.allowManualFilters ?? true,
      linkageFieldMode: existing?.interaction.linkageFieldMode ?? 'auto',
      linkageField: existing?.interaction.linkageField ?? '',
      dataFilters: existing?.interaction.dataFilters ?? [],
    },
    layout: {
      ...(existing?.layout ?? {}),
      width: form.width,
      height: form.height,
    },
  }
}

const getTemplateSummary = (item: ChartTemplate) => {
  const parsed = normalizeComponentAssetConfig(item.configJson)
  const dataset = datasets.value.find((entry) => entry.id === parsed.chart.datasetId)
  return {
    datasetName: dataset ? `${dataset.name} / ${parsed.chart.xField || '-'} → ${parsed.chart.yField || '-'}` : '未绑定数据集',
    sizeText: `${parsed.layout.width} x ${parsed.layout.height}`,
  }
}

const loadAll = async () => {
  loading.value = true
  try {
    const [templateList, chartList, datasetList] = await Promise.all([
      getTemplateList(),
      getChartList(),
      getDatasetList(),
    ])
    templates.value = templateList
    charts.value = chartList
    datasets.value = datasetList
  } finally {
    loading.value = false
  }
}

const loadDatasetFields = async (datasetId: number | '') => {
  datasetFields.value = []
  if (!datasetId) return
  datasetFields.value = await getDatasetFields(datasetId)
}

const applySourceChart = async (chartId: number | null) => {
  if (!chartId) return
  const selected = charts.value.find((item) => item.id === chartId)
  if (!selected) return
  form.datasetId = selected.datasetId
  form.chartType = selected.chartType
  form.xField = selected.xField
  form.yField = selected.yField
  form.groupField = selected.groupField
  if (!form.name) {
    form.name = `${selected.name} 资产组件`
  }
  await loadDatasetFields(selected.datasetId)
}

const openCreate = () => {
  resetForm()
  dialogVisible.value = true
}

const openEdit = async (item: ChartTemplate) => {
  resetForm()
  editingId.value = item.id
  currentTemplate.value = item
  const parsed = normalizeComponentAssetConfig(item.configJson)
  Object.assign(form, {
    name: parsed.chart.name || item.name,
    description: item.description,
    sourceChartId: null,
    datasetId: parsed.chart.datasetId,
    chartType: parsed.chart.chartType || item.chartType,
    xField: parsed.chart.xField,
    yField: parsed.chart.yField,
    groupField: parsed.chart.groupField,
    theme: parsed.style.theme,
    bgColor: parsed.style.bgColor,
    showLegend: parsed.style.showLegend,
    showLabel: parsed.style.showLabel,
    showGrid: parsed.style.showGrid,
    smooth: parsed.style.smooth,
    areaFill: parsed.style.areaFill,
    width: parsed.layout.width,
    height: parsed.layout.height,
  })
  await loadDatasetFields(parsed.chart.datasetId)
  dialogVisible.value = true
}

const cloneTemplate = async (item: ChartTemplate) => {
  await openEdit(item)
  editingId.value = null
  currentTemplate.value = null
  form.name = `${form.name} 副本`
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      chartType: form.chartType,
      configJson: JSON.stringify(buildPayloadConfig()),
    }
    if (editingId.value) {
      await updateTemplate(editingId.value, payload)
      ElMessage.success('组件资产已更新')
    } else {
      await createTemplate(payload)
      ElMessage.success('组件资产已创建')
    }
    dialogVisible.value = false
    await loadAll()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item: ChartTemplate) => {
  await deleteTemplate(item.id)
  ElMessage.success(`已删除组件资产：${item.name}`)
  await loadAll()
}

onMounted(loadAll)
</script>

<style scoped>
.asset-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
}

.panel-toolbar,
.toolbar-left,
.toolbar-actions,
.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-toolbar {
  justify-content: space-between;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.toolbar-input {
  width: 240px;
}

.toolbar-select {
  width: 150px;
}

.asset-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.form-item-full {
  grid-column: 1 / -1;
}

.preview-card {
  padding: 12px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid #e4e7ed;
}

.preview-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
}

.preview-card pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: #4b5563;
}

@media (max-width: 960px) {
  .panel-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-input,
  .toolbar-select {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>