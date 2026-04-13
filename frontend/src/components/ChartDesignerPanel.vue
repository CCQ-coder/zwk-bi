<template>
  <!-- ───────────────────────────────────────── 主布局 ──────────────────────────── -->
  <div class="cdesigner-wrap">

    <!-- 左侧图表列表 -->
    <aside class="cdesigner-sidebar">
      <div class="cdesigner-sidebar-head">
        <el-input v-model="sideSearch" size="small" placeholder="搜索图表" clearable style="flex:1" />
        <el-button type="primary" size="small" :icon="Plus" style="margin-left:6px" @click="openCreate" />
      </div>
      <el-scrollbar class="cdesigner-sidebar-body">
        <div
          v-for="row in filteredRows" :key="row.id"
          class="cdesigner-chart-item"
          :class="{ active: selectedId === row.id }"
          @click="selectChart(row)"
        >
          <el-icon class="chart-type-icon"><component :is="chartTypeIcon(row.chartType)" /></el-icon>
          <div class="cdesigner-chart-info">
            <span class="cdesigner-chart-name" :title="row.name">{{ row.name }}</span>
            <el-tag size="small" :type="chartTagType(row.chartType)" class="cdesigner-chart-tag">
              {{ chartTypeLabel(row.chartType) }}
            </el-tag>
          </div>
        </div>
        <div v-if="filteredRows.length === 0 && !loading" class="cdesigner-empty">暂无图表</div>
      </el-scrollbar>
    </aside>

    <!-- 中间画布区 -->
    <main class="cdesigner-canvas">
      <div v-if="!selected" class="cdesigner-canvas-empty">
        <el-empty description="请在左侧选择或新建图表" :image-size="80" />
      </div>
      <template v-else>
        <!-- 工具栏 -->
        <div class="cdesigner-toolbar">
          <span class="cdesigner-chart-title">{{ selected.name }}</span>
          <div class="cdesigner-toolbar-actions">
            <el-button size="small" :icon="Edit" @click="openEdit(selected)">编辑配置</el-button>
            <el-button size="small" type="primary" :icon="RefreshRight" :loading="dataLoading" @click="loadChartData(selected.id)">刷新</el-button>
            <el-popconfirm title="确认删除此图表？" @confirm="handleDelete(selected.id)">
              <template #reference>
                <el-button size="small" type="danger" plain :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <!-- 字段信息条 -->
        <div class="cdesigner-meta-bar">
          <el-tag size="small" effect="plain" type="info">类型: {{ chartTypeLabel(selected.chartType) }}</el-tag>
          <el-tag size="small" effect="plain" type="success">X/维度: {{ selected.xField || '未设置' }}</el-tag>
          <el-tag size="small" effect="plain" type="warning">Y/度量: {{ selected.yField || '未设置' }}</el-tag>
          <el-tag v-if="selected.groupField" size="small" effect="plain">分组: {{ selected.groupField }}</el-tag>
        </div>

        <!-- 图表画布 -->
        <div class="cdesigner-canvas-body">
          <div v-if="!selected.xField || !selected.yField" class="cdesigner-no-field">
            <el-alert title="未配置字段" type="warning" show-icon :closable="false"
              description="点击工具栏「编辑配置」，设置 X 轴（维度）与 Y 轴（度量）字段后图表将自动渲染。" />
          </div>
          <div v-else ref="chartPreviewRef" class="cdesigner-echarts"></div>
        </div>
      </template>
    </main>

    <!-- 右侧属性面板 -->
    <aside v-if="selected" class="cdesigner-props">
      <el-tabs v-model="propsTab" size="small" class="props-tabs">
        <!-- 图表样式 -->
        <el-tab-pane label="样式" name="style">
          <el-scrollbar>
            <div class="props-section">
              <div class="props-section-title">主题色</div>
              <div class="props-colors">
                <div
                  v-for="(theme, name) in COLOR_THEMES"
                  :key="name"
                  class="props-theme-item"
                  :class="{ selected: styleConfig.theme === name }"
                  @click="applyTheme(name as string)"
                >
                  <div class="props-theme-swatches">
                    <span v-for="c in theme.slice(0,5)" :key="c" class="props-swatch" :style="{ background: c }" />
                  </div>
                  <span class="props-theme-name">{{ name }}</span>
                </div>
              </div>
            </div>

            <div class="props-section">
              <div class="props-section-title">图表背景</div>
              <div class="props-row">
                <span class="props-label">背景色</span>
                <el-color-picker v-model="styleConfig.bgColor" size="small" show-alpha @change="rerender" />
              </div>
            </div>

            <div class="props-section">
              <div class="props-section-title">值标签</div>
              <div class="props-row">
                <span class="props-label">显示标签</span>
                <el-switch v-model="styleConfig.showLabel" size="small" @change="rerender" />
              </div>
              <div class="props-row">
                <span class="props-label">字体大小</span>
                <el-input-number v-model="styleConfig.labelSize" :min="8" :max="24" size="small" controls-position="right" style="width:90px" @change="rerender" />
              </div>
            </div>

            <div class="props-section" v-if="!isPieType">
              <div class="props-section-title">坐标轴</div>
              <div class="props-row">
                <span class="props-label">X 轴名称</span>
                <el-switch v-model="styleConfig.showXName" size="small" @change="rerender" />
              </div>
              <div class="props-row">
                <span class="props-label">Y 轴名称</span>
                <el-switch v-model="styleConfig.showYName" size="small" @change="rerender" />
              </div>
              <div class="props-row">
                <span class="props-label">网格线</span>
                <el-switch v-model="styleConfig.showGrid" size="small" @change="rerender" />
              </div>
            </div>

            <div v-if="isBarType" class="props-section">
              <div class="props-section-title">柱形样式</div>
              <div class="props-row">
                <span class="props-label">圆角</span>
                <el-slider v-model="styleConfig.barRadius" :min="0" :max="20" size="small" style="flex:1;margin-left:8px" @change="rerender" />
              </div>
              <div class="props-row">
                <span class="props-label">最大宽度</span>
                <el-slider v-model="styleConfig.barMaxWidth" :min="10" :max="80" size="small" style="flex:1;margin-left:8px" @change="rerender" />
              </div>
            </div>

            <div v-if="isLineType" class="props-section">
              <div class="props-section-title">折线样式</div>
              <div class="props-row">
                <span class="props-label">平滑曲线</span>
                <el-switch v-model="styleConfig.smooth" size="small" @change="rerender" />
              </div>
              <div class="props-row">
                <span class="props-label">面积填充</span>
                <el-switch v-model="styleConfig.areaFill" size="small" @change="rerender" />
              </div>
            </div>

            <div v-if="isPieType" class="props-section">
              <div class="props-section-title">饼/环图</div>
              <div class="props-row">
                <span class="props-label">图例位置</span>
                <el-select v-model="styleConfig.legendPos" size="small" style="flex:1" @change="rerender">
                  <el-option value="bottom" label="底部" />
                  <el-option value="right" label="右侧" />
                  <el-option value="top" label="顶部" />
                </el-select>
              </div>
            </div>
          </el-scrollbar>
        </el-tab-pane>

        <!-- 数据信息 -->
        <el-tab-pane label="数据" name="data">
          <el-scrollbar>
            <div v-if="chartData" class="props-section">
              <div class="props-section-title">字段列表</div>
              <div v-for="col in chartData.columns" :key="col" class="props-field-row">
                <el-icon style="color:#909399"><DataLine /></el-icon>
                <span style="margin-left:6px;font-size:12px">{{ col }}</span>
              </div>
            </div>
            <div v-if="chartData" class="props-section">
              <div class="props-section-title">数据预览 (前5行)</div>
              <el-table :data="previewRows" size="small" border max-height="240" style="font-size:12px">
                <el-table-column
                  v-for="col in chartData.columns"
                  :key="col"
                  :prop="col"
                  :label="col"
                  min-width="80"
                  show-overflow-tooltip
                />
              </el-table>
            </div>
            <div v-if="!chartData" class="cdesigner-empty" style="margin-top:24px">
              请先刷新图表以加载数据
            </div>
          </el-scrollbar>
        </el-tab-pane>
      </el-tabs>
    </aside>
  </div>

  <!-- ─── 新建/编辑弹窗 ──────────────────────────────────────────────────────── -->
  <el-dialog v-model="dialogVisible" :title="editId ? '编辑图表' : '新建图表'" width="580px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="图表名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入图表名称" />
      </el-form-item>
      <el-form-item label="数据集" prop="datasetId">
        <el-select v-model="form.datasetId" placeholder="请选择" style="width:100%" @change="onDatasetChange">
          <el-option v-for="ds in datasets" :key="ds.id" :label="ds.name" :value="ds.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="图表类型" prop="chartType">
        <el-select v-model="form.chartType" placeholder="请选择" style="width:100%">
          <el-option-group label="比较类">
            <el-option label="柱状图" value="bar" />
            <el-option label="条形图" value="bar_horizontal" />
            <el-option label="折线图" value="line" />
            <el-option label="雷达图" value="radar" />
          </el-option-group>
          <el-option-group label="占比类">
            <el-option label="饼图" value="pie" />
            <el-option label="环形图" value="doughnut" />
          </el-option-group>
          <el-option-group label="关系类">
            <el-option label="散点图" value="scatter" />
          </el-option-group>
          <el-option-group label="高级">
            <el-option label="漏斗图" value="funnel" />
            <el-option label="仪表盘" value="gauge" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-divider content-position="left" style="margin:12px 0">字段配置</el-divider>
      <el-form-item label="X轴（维度）">
        <el-select v-model="form.xField" placeholder="选择列" clearable style="width:100%">
          <el-option v-for="col in previewColumns" :key="col" :label="col" :value="col" />
        </el-select>
      </el-form-item>
      <el-form-item label="Y轴（度量）">
        <el-select v-model="form.yField" placeholder="选择列" clearable style="width:100%">
          <el-option v-for="col in previewColumns" :key="col" :label="col" :value="col" />
        </el-select>
      </el-form-item>
      <el-form-item label="分组字段">
        <el-select v-model="form.groupField" placeholder="可选" clearable style="width:100%">
          <el-option v-for="col in previewColumns" :key="col" :label="col" :value="col" />
        </el-select>
      </el-form-item>
      <div v-if="previewLoading" style="text-align:center;color:#909399;font-size:12px;margin-bottom:8px">
        正在加载字段列表...
      </div>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DataLine, Delete, Edit, PieChart, TrendCharts, Histogram, Plus, RefreshRight } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import * as echarts from 'echarts'
import {
  createChart, deleteChart, getChartData, getChartList, updateChart,
  type Chart, type ChartForm
} from '../api/chart'
import { getDatasetList, previewDatasetSql, type Dataset } from '../api/dataset'

// ─── 颜色主题 ──────────────────────────────────────────────────────────────────
const COLOR_THEMES: Record<string, string[]> = {
  '默认蓝': ['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272','#fc8452','#9a60b4'],
  '商务灰': ['#516b91','#59c4e6','#edafda','#93b7e3','#a5e7f0','#cbb0e3'],
  '暖橙色': ['#dd6b66','#759aa0','#e69d87','#8dc1a9','#ea7e53','#eedd78','#73a373','#73b9bc'],
  '紫霞粉': ['#9b59b6','#2ecc71','#3498db','#e74c3c','#f39c12','#1abc9c','#e67e22','#95a5a6'],
  '海洋蓝': ['#1890ff','#2fc25b','#facc14','#223273','#8543e0','#13c2c2','#3436c7','#f04864'],
}

// ─── 样式配置状态 ──────────────────────────────────────────────────────────────
interface StyleConfig {
  theme: string
  bgColor: string
  showLabel: boolean
  labelSize: number
  showXName: boolean
  showYName: boolean
  showGrid: boolean
  smooth: boolean
  areaFill: boolean
  barRadius: number
  barMaxWidth: number
  legendPos: string
}

const styleConfig = reactive<StyleConfig>({
  theme: '默认蓝',
  bgColor: '#ffffff',
  showLabel: true,
  labelSize: 12,
  showXName: false,
  showYName: false,
  showGrid: true,
  smooth: false,
  areaFill: false,
  barRadius: 2,
  barMaxWidth: 40,
  legendPos: 'bottom',
})

const propsTab = ref('style')

// ─── 图表类型辅助 ──────────────────────────────────────────────────────────────
const chartTypeLabel = (t: string) => ({
  bar: '柱状图', bar_horizontal: '条形图', line: '折线图', pie: '饼图',
  doughnut: '环形图', scatter: '散点图', funnel: '漏斗图', gauge: '仪表盘', radar: '雷达图'
}[t] ?? t)

const chartTypeIcon = (t: string) => {
  if (t === 'pie' || t === 'doughnut') return PieChart
  if (t === 'line') return TrendCharts
  return Histogram
}

const chartTagType = (t: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
  if (t === 'pie' || t === 'doughnut') return 'warning'
  if (t === 'line') return 'success'
  if (t === 'funnel') return 'danger'
  return ''
}

const isPieType  = computed(() => selected.value?.chartType === 'pie' || selected.value?.chartType === 'doughnut')
const isBarType  = computed(() => selected.value?.chartType === 'bar' || selected.value?.chartType === 'bar_horizontal')
const isLineType = computed(() => selected.value?.chartType === 'line')

// ─── 列表 ──────────────────────────────────────────────────────────────────────
const rows        = ref<Chart[]>([])
const loading     = ref(false)
const sideSearch  = ref('')
const selectedId  = ref<number | null>(null)
const selected    = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null)
const filteredRows = computed(() =>
  rows.value.filter((r) => !sideSearch.value || r.name.toLowerCase().includes(sideSearch.value.toLowerCase()))
)

const datasets       = ref<Dataset[]>([])
const previewColumns = ref<string[]>([])
const previewLoading = ref(false)

const loadList = async () => {
  loading.value = true
  try {
    ;[rows.value, datasets.value] = await Promise.all([getChartList(), getDatasetList()])
    if (!selectedId.value && rows.value.length) selectChart(rows.value[0])
  } finally {
    loading.value = false
  }
}

const selectChart = async (row: Chart) => {
  chartData.value = null
  selectedId.value = row.id
  await nextTick()
  if (row.xField && row.yField) loadChartData(row.id)
}

// ─── 图表渲染 ──────────────────────────────────────────────────────────────────
const chartPreviewRef = ref<HTMLDivElement | null>(null)
const dataLoading = ref(false)
let echart: echarts.ECharts | null = null

interface ChartDataType {
  chartType: string
  labels: string[]
  columns: string[]
  rawRows?: Record<string, unknown>[]
  series: { name: string; data: (number | string)[] }[]
}
const chartData = ref<ChartDataType | null>(null)
const previewRows = computed(() => (chartData.value?.rawRows ?? chartData.value?.labels.map((lbl, i) => {
  const row: Record<string, unknown> = {}
  if (selected.value?.xField) row[selected.value.xField] = lbl
  chartData.value?.series.forEach(s => { if (selected.value?.yField) row[selected.value.yField] = s.data[i] })
  return row
}) ?? []).slice(0, 5))

const loadChartData = async (id: number) => {
  if (!chartPreviewRef.value) return
  dataLoading.value = true
  try {
    const data = await getChartData(id) as ChartDataType
    chartData.value = data
    if (!echart) {
      echart = echarts.init(chartPreviewRef.value, null, { renderer: 'canvas' })
      window.addEventListener('resize', () => echart?.resize())
    }
    echart.setOption(buildEChartsOption(data), true)
  } catch {
    ElMessage.error('图表数据加载失败')
  } finally {
    dataLoading.value = false
  }
}

const rerender = () => {
  if (!echart || !chartData.value) return
  echart.setOption(buildEChartsOption(chartData.value), true)
}

const applyTheme = (name: string) => {
  styleConfig.theme = name
  rerender()
}

watch(chartPreviewRef, (el) => {
  if (!el && echart) { echart.dispose(); echart = null }
})

const buildEChartsOption = (data: ChartDataType) => {
  const { chartType: type, labels, series } = data
  const colors = COLOR_THEMES[styleConfig.theme] ?? COLOR_THEMES['默认蓝']
  const labelOpt = {
    show: styleConfig.showLabel,
    fontSize: styleConfig.labelSize,
    color: '#333',
  }

  if (type === 'pie' || type === 'doughnut') {
    const pieData = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? []
    const legendOrient = styleConfig.legendPos === 'right' ? 'vertical' : 'horizontal'
    const legendPos = styleConfig.legendPos === 'right'
      ? { orient: 'vertical' as const, right: 10, top: 'center' }
      : styleConfig.legendPos === 'top'
        ? { orient: 'horizontal' as const, top: 10 }
        : { orient: 'horizontal' as const, bottom: 0 }
    return {
      color: colors,
      backgroundColor: styleConfig.bgColor,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', ...legendPos },
      series: [{
        type: 'pie',
        radius: type === 'doughnut' ? ['38%', '65%'] : '60%',
        data: pieData,
        label: { ...labelOpt, formatter: '{b}: {d}%' },
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
      }]
    }
  }

  if (type === 'funnel') {
    const fd = series[0]?.data.map((v, i) => ({ name: labels[i] ?? String(i), value: v })) ?? []
    return {
      color: colors,
      backgroundColor: styleConfig.bgColor,
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{ type: 'funnel', left: '10%', width: '80%', label: { ...labelOpt }, data: fd }]
    }
  }

  if (type === 'gauge') {
    const val = Number(series[0]?.data[0] ?? 0)
    return {
      color: colors,
      backgroundColor: styleConfig.bgColor,
      series: [{ type: 'gauge', detail: { formatter: '{value}' }, data: [{ value: val, name: labels[0] ?? '' }] }]
    }
  }

  const isH = type === 'bar_horizontal'
  const gridSplitLine = styleConfig.showGrid ? {} : { splitLine: { show: false } }

  const seriesArr = series.map((s) => {
    const base: Record<string, unknown> = {
      name: s.name,
      type: isH ? 'bar' : type === 'scatter' ? 'scatter' : type,
      data: s.data,
    }
    if (styleConfig.showLabel) {
      base.label = { show: true, fontSize: styleConfig.labelSize,
        position: isH ? 'right' : 'top' }
    }
    if (type === 'bar' || type === 'bar_horizontal') {
      base.itemStyle = { borderRadius: styleConfig.barRadius }
      base.barMaxWidth = styleConfig.barMaxWidth
    }
    if (type === 'line') {
      base.smooth = styleConfig.smooth
      if (styleConfig.areaFill) base.areaStyle = { opacity: 0.3 }
    }
    return base
  })

  return {
    color: colors,
    backgroundColor: styleConfig.bgColor,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { type: 'scroll', top: 4 } : undefined,
    grid: { left: 16, right: 16, bottom: 8, top: series.length > 1 ? 36 : 24, containLabel: true },
    ...(isH
      ? { xAxis: { type: 'value', ...gridSplitLine, name: styleConfig.showXName ? (selected.value?.yField ?? '') : '' },
          yAxis: { type: 'category', data: labels, name: styleConfig.showYName ? (selected.value?.xField ?? '') : '' } }
      : { xAxis: { type: 'category', data: labels,
              axisLabel: { rotate: labels.length > 8 ? 30 : 0 },
              name: styleConfig.showXName ? (selected.value?.xField ?? '') : '' },
          yAxis: { type: 'value', ...gridSplitLine, name: styleConfig.showYName ? (selected.value?.yField ?? '') : '' } }),
    series: seriesArr
  }
}

// ─── 弹窗 CRUD ──────────────────────────────────────────────────────────────────
const dialogVisible = ref(false)
const saving        = ref(false)
const editId        = ref<number | null>(null)
const formRef       = ref<FormInstance>()
const emptyForm = (): ChartForm => ({ name: '', datasetId: '', chartType: '', xField: '', yField: '', groupField: '' })
const form = reactive<ChartForm>(emptyForm())

const rules: FormRules = {
  name:      [{ required: true, message: '请输入名称', trigger: 'blur' }],
  datasetId: [{ required: true, message: '请选择数据集', trigger: 'change' }],
  chartType: [{ required: true, message: '请选择图表类型', trigger: 'change' }]
}

const onDatasetChange = async (dsId: number | '') => {
  previewColumns.value = []
  if (!dsId) return
  previewLoading.value = true
  try {
    const ds = datasets.value.find((d) => d.id === dsId)
    if (ds) {
      const r = await previewDatasetSql({ datasourceId: ds.datasourceId, sqlText: ds.sqlText })
      previewColumns.value = r.columns
    }
  } catch { /* ignore */ } finally {
    previewLoading.value = false
  }
}

const openCreate = () => {
  editId.value = null
  Object.assign(form, emptyForm())
  previewColumns.value = []
  dialogVisible.value = true
}

const openEdit = (row: Chart) => {
  editId.value = row.id
  form.name       = row.name
  form.datasetId  = row.datasetId
  form.chartType  = row.chartType
  form.xField     = row.xField ?? ''
  form.yField     = row.yField ?? ''
  form.groupField = row.groupField ?? ''
  previewColumns.value = []
  dialogVisible.value = true
  onDatasetChange(row.datasetId)
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editId.value) {
      const updated = await updateChart(editId.value, form)
      ElMessage.success('更新成功')
      dialogVisible.value = false
      await loadList()
      selectedId.value = updated.id
      if (updated.xField && updated.yField) loadChartData(updated.id)
    } else {
      const created = await createChart(form)
      ElMessage.success('创建成功')
      dialogVisible.value = false
      await loadList()
      selectedId.value = created.id
      if (created.xField && created.yField) loadChartData(created.id)
    }
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await deleteChart(id)
  ElMessage.success('删除成功')
  selectedId.value = null
  chartData.value = null
  await loadList()
}

onMounted(loadList)
onBeforeUnmount(() => { echart?.dispose() })
</script>

<style scoped>
/* ─── 整体布局 ─────────────────────────────── */
.cdesigner-wrap {
  display: flex;
  height: calc(100vh - 120px);
  overflow: hidden;
  background: #f0f2f5;
}

/* ─── 左侧图表列表 ──────────────────────────── */
.cdesigner-sidebar {
  width: 216px;
  min-width: 216px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}
.cdesigner-sidebar-head {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.cdesigner-sidebar-body { flex: 1; overflow: hidden; }
.cdesigner-chart-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid #f5f5f5;
}
.cdesigner-chart-item:hover { background: #f5f7fa; }
.cdesigner-chart-item.active { background: #ecf5ff; }
.chart-type-icon { font-size: 16px; color: #909399; flex-shrink: 0; }
.cdesigner-chart-item.active .chart-type-icon { color: #409eff; }
.cdesigner-chart-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cdesigner-chart-name {
  font-size: 13px; color: #303133; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cdesigner-chart-item.active .cdesigner-chart-name { color: #409eff; }
.cdesigner-chart-tag { align-self: flex-start; }
.cdesigner-empty { text-align: center; padding: 24px 12px; color: #909399; font-size: 12px; }

/* ─── 中间画布 ──────────────────────────────── */
.cdesigner-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}
.cdesigner-canvas-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
}
.cdesigner-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
}
.cdesigner-chart-title { font-size: 14px; font-weight: 600; color: #303133; }
.cdesigner-toolbar-actions { display: flex; gap: 6px; }
.cdesigner-meta-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px 16px;
  border-bottom: 1px solid #f5f5f5;
  flex-shrink: 0;
  background: #fafafa;
}
.cdesigner-canvas-body {
  flex: 1;
  overflow: hidden;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}
.cdesigner-echarts {
  flex: 1;
  min-height: 300px;
  border-radius: 6px;
  overflow: hidden;
}
.cdesigner-no-field { padding: 20px 0; }

/* ─── 右侧属性面板 ──────────────────────────── */
.cdesigner-props {
  width: 248px;
  min-width: 248px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.props-tabs { height: 100%; overflow: hidden; }
:deep(.props-tabs .el-tabs__content) {
  height: calc(100% - 40px);
  overflow: hidden;
  padding: 0;
}
:deep(.props-tabs .el-scrollbar) { height: 100%; }
:deep(.props-tabs .el-scrollbar__wrap) { overflow-x: hidden; }
.props-section { padding: 10px 12px 4px; border-bottom: 1px solid #f5f5f5; }
.props-section-title {
  font-size: 12px; font-weight: 600; color: #606266;
  margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
}
.props-row {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 8px; gap: 8px;
}
.props-label { font-size: 12px; color: #606266; flex-shrink: 0; min-width: 60px; }
.props-colors { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
.props-theme-item {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 6px; border-radius: 4px; cursor: pointer;
  border: 1px solid transparent; transition: border-color 0.15s;
}
.props-theme-item:hover { border-color: #dcdfe6; }
.props-theme-item.selected { border-color: #409eff; background: #ecf5ff; }
.props-theme-swatches { display: flex; gap: 2px; }
.props-swatch { width: 12px; height: 12px; border-radius: 2px; }
.props-theme-name { font-size: 12px; color: #606266; }
.props-field-row {
  display: flex; align-items: center;
  padding: 4px 0; border-bottom: 1px solid #f5f5f5;
}
</style>
