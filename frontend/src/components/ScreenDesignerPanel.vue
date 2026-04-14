<template>
  <div class="screen-root" :class="{ 'screen-root--editor': screenId }">
    <!-- 编辑器模式：分类组件选择器 -->
    <aside v-if="screenId" class="screen-type-sidebar">
      <div class="type-cat-nav">
        <div
          v-for="cat in CHART_CATEGORIES"
          :key="cat.label"
          class="type-cat-item"
          :class="{ active: activeCat === cat.label }"
          @click="activeCat = cat.label"
        >{{ cat.label }}</div>
      </div>
      <div class="type-cat-grid">
        <div
          v-for="item in activeCategoryTypes"
          :key="item.type"
          class="type-grid-item"
          :class="{ 'type-grid-item--active': assetType === item.type }"
          @click="selectTypeFilter(item.type)"
        >
          <div class="type-grid-icon" v-html="item.svgIcon"></div>
          <div class="type-grid-label">{{ item.label }}</div>
        </div>
      </div>
    </aside>

    <!-- 列表模式：侧边栏 -->
    <aside v-if="!screenId" class="screen-sidebar">
      <section class="side-panel">
        <div class="side-head">
          <div>
            <div class="side-title">数据大屏</div>
            <div class="side-subtitle">当前大屏来自仪表板数据表</div>
          </div>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreateDashboard" />
        </div>
        <div class="screen-search-wrap">
          <el-input v-model="dashboardSearch" placeholder="检索目录" :prefix-icon="Search" clearable />
        </div>
        <div class="screen-list">
          <div
            v-for="dashboard in filteredDashboards"
            :key="dashboard.id"
            class="screen-item"
            :class="{ active: currentDashboard?.id === dashboard.id }"
            @click="selectDashboard(dashboard)"
          >
            <div class="screen-item-main">
              <div class="screen-item-name">{{ dashboard.name }}</div>
              <div class="screen-item-meta">{{ getDashboardComponentCount(dashboard.id) }} 个组件</div>
            </div>
            <el-popconfirm title="确认删除此大屏？" @confirm.stop="handleDeleteDashboard(dashboard.id)">
              <template #reference>
                <el-icon class="screen-item-del" @click.stop><Delete /></el-icon>
              </template>
            </el-popconfirm>
          </div>
          <el-empty v-if="!dashboards.length && !loading" description="暂无大屏" :image-size="60" />
        </div>
      </section>

      <section class="side-panel library-panel">
        <div class="side-head">
          <div>
            <div class="side-title">组件库</div>
            <div class="side-subtitle">默认组件和自定义组件都持久化在数据库中</div>
          </div>
          <el-tag type="success" effect="plain">数据化</el-tag>
        </div>

        <el-tabs v-model="libraryTab" class="library-tabs">
          <el-tab-pane label="组件库" name="templates">
            <div class="library-toolbar">
              <el-input v-model="assetSearch" placeholder="搜索组件名称" clearable />
              <el-select v-model="assetType" placeholder="全部类型" clearable>
                <el-option label="全部类型" value="" />
                <el-option
                  v-for="item in chartTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>

            <div class="template-hint">默认组件始终排在前面，可直接拖入右侧画布，也可以双击快速加入。</div>
            <div class="asset-list">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="asset-card template-card"
                :class="{ selected: selectedTemplateId === template.id, 'asset-card--builtin': template.builtIn }"
                draggable="true"
                @click="selectedTemplateId = template.id"
                @dblclick="quickAddTemplate(template)"
                @dragstart="onTemplateDragStart($event, template)"
                @dragend="onTemplateDragEnd"
              >
                <div class="asset-card-top">
                  <div>
                    <div class="asset-card-name">{{ template.name }}</div>
                    <div class="asset-card-meta">{{ template.description || '可复用组件资产' }}</div>
                  </div>
                  <div class="asset-card-tags">
                    <el-tag v-if="template.builtIn" size="small" type="success">默认</el-tag>
                    <el-tag size="small" effect="dark">{{ chartTypeLabel(template.chartType) }}</el-tag>
                  </div>
                </div>
                <div class="asset-card-fields">
                  <span>数据集: {{ getTemplateDatasetName(template) }}</span>
                  <span>尺寸: {{ getTemplateLayoutText(template) }}</span>
                </div>
                <div class="template-config">{{ summarizeTemplateConfig(template.configJson) }}</div>
                <div class="asset-card-actions">
                  <span class="drag-tip">拖入画布</span>
                  <el-button link type="primary" @click.stop="quickAddTemplate(template)">立即加入</el-button>
                </div>
              </div>
              <el-empty v-if="!filteredTemplates.length && !loading" description="没有匹配的组件资产" :image-size="60" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="图表源" name="charts">
            <div class="template-hint">原始图表定义仍可直接加入大屏，适合临时搭建或后续再保存为组件。</div>
            <div class="library-toolbar">
              <el-input v-model="assetSearch" placeholder="搜索图表名称" clearable />
              <el-select v-model="assetType" placeholder="全部类型" clearable>
                <el-option label="全部类型" value="" />
                <el-option
                  v-for="item in chartTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
            <div class="asset-list">
              <div
                v-for="chart in filteredCharts"
                :key="chart.id"
                class="asset-card"
                :class="{ selected: selectedChartId === chart.id }"
                @click="selectedChartId = chart.id"
                @dblclick="quickAddChart(chart)"
              >
                <div class="asset-card-top">
                  <div class="asset-card-name">{{ chart.name }}</div>
                  <div class="asset-card-tags">
                    <el-tag size="small" effect="dark">{{ chartTypeLabel(chart.chartType) }}</el-tag>
                  </div>
                </div>
                <div class="asset-card-meta">数据集: {{ datasetMap.get(chart.datasetId)?.name ?? '未关联' }}</div>
                <div class="asset-card-fields">
                  <span>X: {{ chart.xField || '未设' }}</span>
                  <span>Y: {{ chart.yField || '未设' }}</span>
                </div>
              </div>
              <el-empty v-if="!filteredCharts.length && !loading" description="没有匹配的图表源" :image-size="60" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </aside>

    <!-- 编辑器模式：带返回按钮的组件库面板 -->
    <aside v-if="screenId" class="screen-library-panel">
      <div class="library-editor-head">
        <el-button size="small" :icon="ArrowLeft" @click="$emit('back')">返回列表</el-button>
        <span class="library-editor-title">{{ currentDashboard?.name ?? '编辑大屏' }}</span>
      </div>
      <div class="library-toolbar">
        <el-input v-model="assetSearch" placeholder="搜索组件名称" clearable size="small" />
      </div>
      <el-tabs v-model="libraryTab" class="library-tabs">
        <el-tab-pane label="组件库" name="templates">
          <div class="asset-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="asset-card template-card"
              :class="{ selected: selectedTemplateId === template.id, 'asset-card--builtin': template.builtIn }"
              draggable="true"
              @click="selectedTemplateId = template.id"
              @dblclick="quickAddTemplate(template)"
              @dragstart="onTemplateDragStart($event, template)"
              @dragend="onTemplateDragEnd"
            >
              <div class="asset-card-top">
                <div>
                  <div class="asset-card-name">{{ template.name }}</div>
                  <div class="asset-card-meta">{{ template.description || '可复用组件资产' }}</div>
                </div>
                <div class="asset-card-tags">
                  <el-tag v-if="template.builtIn" size="small" type="success">默认</el-tag>
                  <el-tag size="small" effect="dark">{{ chartTypeLabel(template.chartType) }}</el-tag>
                </div>
              </div>
              <div class="asset-card-actions">
                <span class="drag-tip">拖入画布</span>
                <el-button link type="primary" @click.stop="quickAddTemplate(template)">立即加入</el-button>
              </div>
            </div>
            <el-empty v-if="!filteredTemplates.length && !loading" description="没有匹配的组件" :image-size="60" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="图表源" name="charts">
          <div class="asset-list">
            <div
              v-for="chart in filteredCharts"
              :key="chart.id"
              class="asset-card"
              :class="{ selected: selectedChartId === chart.id }"
              @click="selectedChartId = chart.id"
              @dblclick="quickAddChart(chart)"
            >
              <div class="asset-card-top">
                <div class="asset-card-name">{{ chart.name }}</div>
                <el-tag size="small" effect="dark">{{ chartTypeLabel(chart.chartType) }}</el-tag>
              </div>
              <div class="asset-card-meta">{{ datasetMap.get(chart.datasetId)?.name ?? '未关联' }}</div>
            </div>
            <el-empty v-if="!filteredCharts.length && !loading" description="没有匹配的图表源" :image-size="60" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </aside>

    <main class="screen-main" v-loading="loading || compLoading">
      <div v-if="!currentDashboard" class="screen-empty-state">
        <el-empty description="请先创建或选择一个数据大屏" :image-size="90" />
      </div>

      <template v-else>
        <div class="screen-toolbar">
          <div>
            <div class="screen-title-row">
              <div class="screen-title">{{ currentDashboard.name }}</div>
              <el-tag size="small" :type="isPublished ? 'success' : 'info'">{{ isPublished ? '已发布' : '草稿' }}</el-tag>
            </div>
            <div class="screen-subtitle">
              组件资产存于 bi_chart_template，画布实例存于 bi_dashboard_component，使用时按参数即时生成
            </div>
          </div>
          <div class="screen-actions">
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents">刷新画布</el-button>
            <el-button size="small" :icon="View" @click="openPreview">预览</el-button>
            <el-button size="small" :icon="Promotion" @click="openPublishDialog">{{ isPublished ? '发布设置' : '发布' }}</el-button>
            <el-button size="small" :icon="Share" @click="openShareDialog">分享</el-button>
            <el-button size="small" :icon="Download" @click="exportScreenJson">导出</el-button>
            <el-button size="small" @click="openSaveAssetDialog" :disabled="!activeComponent">存为组件</el-button>
            <el-button size="small" type="primary" :icon="CirclePlus" :disabled="!selectedLibraryAsset" @click="handleAddSelectedAsset">
              放入大屏
            </el-button>
          </div>
        </div>

        <div class="readonly-banner">
          <span>选中画布组件后，可在右侧属性面板修改布局、切换组件引用及调整字段绑定。</span>
        </div>

        <div v-if="selectedLibraryAsset" class="selected-bar">
          <div class="selected-bar-title">当前待加入组件</div>
          <div class="selected-bar-content">
            <span>{{ selectedLibraryAsset.name }}</span>
            <el-tag size="small">{{ chartTypeLabel(selectedLibraryAsset.chartType) }}</el-tag>
            <span v-if="libraryTab === 'templates'">{{ selectedTemplate?.builtIn ? '默认组件' : '自定义组件' }}</span>
            <span v-else>数据集: {{ datasetMap.get(selectedChartAsset?.datasetId ?? -1)?.name ?? '未关联' }}</span>
          </div>
        </div>

        <div class="stage-panel">
          <div class="stage-head">
            <div>
              <div class="stage-title">大屏画布</div>
              <div class="stage-note">双击左侧组件可快速加入，拖动标题移动，拖动组件边框或四角可直接调整大小</div>
            </div>
            <div class="stage-head-actions">
              <div class="stage-canvas-controls">
                <el-select
                  :model-value="matchedCanvasPreset"
                  size="small"
                  style="width: 150px"
                  :disabled="canvasSaving"
                  @change="applyCanvasPreset"
                >
                  <el-option
                    v-for="item in SCREEN_CANVAS_PRESETS"
                    :key="item.id"
                    :label="item.label"
                    :value="item.id"
                  />
                  <el-option label="自定义" value="custom" />
                </el-select>
                <el-input-number
                  :model-value="currentCanvasConfig.width"
                  :min="640"
                  :max="7680"
                  :step="10"
                  size="small"
                  controls-position="right"
                  :disabled="canvasSaving"
                  @change="onCanvasWidthChange"
                />
                <span class="stage-canvas-separator">×</span>
                <el-input-number
                  :model-value="currentCanvasConfig.height"
                  :min="360"
                  :max="4320"
                  :step="10"
                  size="small"
                  controls-position="right"
                  :disabled="canvasSaving"
                  @change="onCanvasHeightChange"
                />
              </div>
              <div class="stage-stats">{{ components.length }} 个已选组件</div>
            </div>
          </div>

          <div class="screen-stage-shell">
            <div
              ref="canvasRef"
              class="screen-stage"
              :class="{ 'screen-stage--drop': stageDropActive }"
              :style="{ width: `${currentCanvasConfig.width}px`, minHeight: `${canvasMinHeight}px`, height: `${canvasMinHeight}px` }"
              @dragover.prevent="onStageDragOver"
              @dragleave="onStageDragLeave"
              @drop.prevent="onStageDrop"
            >
              <div
                v-for="component in components"
                :key="component.id"
                class="stage-card"
                :class="{ active: activeCompId === component.id }"
                :style="getCardStyle(component)"
                @mousedown="focusComponent(component)"
              >
                <div class="stage-card-header" @mousedown.stop.prevent="startDrag($event, component)">
                  <div class="stage-card-header-main">
                    <div class="stage-card-name">{{ getComponentChartConfig(component).name || '未命名组件' }}</div>
                    <div class="stage-card-meta">
                      <el-tag size="small" type="info">{{ chartTypeLabel(getComponentChartConfig(component).chartType) }}</el-tag>
                      <span>{{ datasetMap.get(Number(getComponentChartConfig(component).datasetId) || -1)?.name ?? '未关联数据集' }}</span>
                    </div>
                  </div>
                  <el-popconfirm title="从大屏移除此组件？" @confirm="removeComponent(component.id)">
                    <template #reference>
                      <el-icon class="remove-btn"><Close /></el-icon>
                    </template>
                  </el-popconfirm>
                </div>

                <div class="stage-card-body">
                  <div v-if="isTableChart(component)" class="table-wrapper">
                    <el-table :data="getTableRows(component.id)" height="100%" size="small" stripe>
                      <el-table-column
                        v-for="column in getTableColumns(component.id)"
                        :key="column"
                        :prop="column"
                        :label="column"
                        min-width="120"
                      />
                    </el-table>
                  </div>
                  <div v-else-if="showNoField(component)" class="chart-placeholder warning">
                    当前组件缺少必要字段，请先在右侧组件属性中完成配置。
                  </div>
                  <div v-else-if="!isRenderableChart(component)" class="chart-placeholder">
                    当前图表类型为 {{ chartTypeLabel(getComponentChartConfig(component).chartType) }}，请前往仪表板预览或切换为表格、柱线、饼图等可视化类型
                  </div>
                  <div
                    v-else
                    :ref="(el) => setChartRef(el as HTMLElement | null, component.id)"
                    class="chart-canvas"
                  />
                </div>

                <span class="resize-handle resize-handle--n" @mousedown.stop.prevent="startResize($event, component, 'n')" />
                <span class="resize-handle resize-handle--s" @mousedown.stop.prevent="startResize($event, component, 's')" />
                <span class="resize-handle resize-handle--e" @mousedown.stop.prevent="startResize($event, component, 'e')" />
                <span class="resize-handle resize-handle--w" @mousedown.stop.prevent="startResize($event, component, 'w')" />
                <span class="resize-handle resize-handle--ne" @mousedown.stop.prevent="startResize($event, component, 'ne')" />
                <span class="resize-handle resize-handle--nw" @mousedown.stop.prevent="startResize($event, component, 'nw')" />
                <span class="resize-handle resize-handle--se" @mousedown.stop.prevent="startResize($event, component, 'se')" />
                <span class="resize-handle resize-handle--sw" @mousedown.stop.prevent="startResize($event, component, 'sw')" />
              </div>

              <div v-if="!components.length" class="stage-empty">
                <el-empty description="请从左侧双击或拖入一个组件资产" :image-size="80" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <aside class="screen-inspector">
      <EditorComponentInspector
        scene="screen"
        :component="activeComponent"
        :chart="activeChart"
        @apply-layout="applyLayoutPatch"
        @bring-front="bringComponentToFront"
        @remove="handleRemoveActiveComponent"
        @preview-component="previewActiveComponent"
        @save-component="saveActiveComponent"
      />
    </aside>

    <el-dialog v-model="createDashVisible" title="新建数据大屏" width="420px" destroy-on-close>
      <el-form :model="dashForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="dashForm.name" placeholder="请输入大屏名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDashVisible = false">取消</el-button>
        <el-button type="primary" :loading="dashSaving" @click="handleCreateDashboard">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateSaveVisible" title="保存为可复用组件" width="460px" destroy-on-close>
      <el-form :model="templateForm" label-width="90px">
        <el-form-item label="组件名称">
          <el-input v-model="templateForm.name" placeholder="请输入组件资产名称" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="templateForm.description" type="textarea" :rows="3" placeholder="说明这个组件适合什么场景" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateSaveVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateSaving" @click="saveActiveComponentAsAsset">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareVisible" title="分享数据大屏" width="520px" destroy-on-close>
      <div v-if="isPublished" class="share-block">
        <div class="share-label">只读预览链接</div>
        <el-input :model-value="shareLink" readonly />
        <div class="share-tip">分享对象可通过该链接查看纯展示版大屏，也可用于打印 / PDF 导出。</div>
      </div>
      <el-alert
        v-else
        title="当前数据大屏尚未正式发布"
        type="warning"
        :closable="false"
        description="请先设置发布状态、访问角色和正式分享链接，再对外分享。"
      />
      <template #footer>
        <el-button @click="shareVisible = false">关闭</el-button>
        <el-button v-if="!isPublished" type="primary" @click="openPublishDialog">去发布</el-button>
        <template v-else>
          <el-button @click="openPreview(true)">打开预览</el-button>
          <el-button type="primary" @click="copyShareLink">复制链接</el-button>
        </template>
      </template>
    </el-dialog>

    <el-dialog v-model="publishVisible" title="发布数据大屏" width="560px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="发布状态">
          <el-switch v-model="publishForm.published" active-text="已发布" inactive-text="草稿" />
        </el-form-item>
        <el-form-item label="允许匿名链接">
          <el-switch v-model="publishForm.allowAnonymousAccess" active-text="允许" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="允许访问角色">
          <el-checkbox-group v-model="publishForm.allowedRoles">
            <el-checkbox v-for="role in roleOptions" :key="role" :label="role">{{ role }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="正式分享链接">
          <el-input :model-value="draftPublishedLink" readonly />
        </el-form-item>
      </el-form>
      <div class="share-tip">发布后会生成固定链接。未登录访问需使用该正式链接，登录用户则按角色权限决定是否可查看。</div>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishSaving" @click="savePublishSettings">保存发布设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CirclePlus, Close, Delete, Download, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import EditorComponentInspector from './EditorComponentInspector.vue'
import {
  addDashboardComponent,
  createDashboard,
  deleteDashboard,
  getDashboardComponents,
  getDashboardList,
  removeDashboardComponent,
  updateDashboard,
  updateDashboardComponent,
  type Dashboard,
  type DashboardComponent
} from '../api/dashboard'
import { createChart, getChartData, getChartList, type Chart, type ChartDataResult } from '../api/chart'
import { createTemplate, getTemplateList, type ChartTemplate } from '../api/chart-template'
import { getDatasetList, type Dataset } from '../api/dataset'
import {
  buildComponentAssetConfig,
  buildChartSnapshot,
  buildComponentConfig,
  buildComponentOption,
  chartTypeLabel,
  getMissingChartFields,
  isCanvasRenderableChartType,
  materializeChartData,
  mergeComponentRequestFilters,
  normalizeComponentAssetConfig,
  normalizeComponentConfig,
} from '../utils/component-config'
import {
  buildPublishedLink,
  buildReportConfig,
  normalizeCanvasConfig,
  normalizePublishConfig,
  parseReportConfig,
  SCREEN_CANVAS_PRESETS,
  type ReportCanvasConfig,
} from '../utils/report-config'

// ─── Props & Emits ────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  screenId?: number | null
}>(), {
  screenId: null,
})
const emit = defineEmits<{ (e: 'back'): void }>()

// ─── 分类组件类型选择器 ────────────────────────────────────────────────────────
interface ChartTypeItem { type: string; label: string; svgIcon: string }
interface ChartCategory { label: string; types: ChartTypeItem[] }

const makeBarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/></svg>`
const makeBarStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="6" y="8" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="18" y="12" width="8" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="18" y="4" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="30" y="18" width="8" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="30" y="10" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/></svg>`
const makeBarHIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="20" height="6" fill="currentColor" rx="1"/><rect x="4" y="13" width="28" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="14" height="6" fill="currentColor" rx="1"/></svg>`
const makeLineIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,26 12,16 20,20 28,8 36,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`
const makeAreaIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="4,28 4,20 12,12 20,16 28,6 36,10 36,28" fill="currentColor" opacity=".4"/><polyline points="4,20 12,12 20,16 28,6 36,10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const makeLineStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,24 12,18 20,20 28,12 36,16" fill="none" stroke="currentColor" stroke-width="2" opacity=".5" stroke-linecap="round"/><polyline points="4,18 12,10 20,14 28,6 36,8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`
const makePieIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="12" fill="currentColor" opacity=".25"/><path d="M20,16 L20,4 A12,12 0 0,1 30.4,22 Z" fill="currentColor"/><path d="M20,16 L30.4,22 A12,12 0 0,1 9.6,22 Z" fill="currentColor" opacity=".6"/></svg>`
const makeDoughnutIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,4 a12,12 0 0 1 10.4,18 l-6-3.5 a5.5,5.5 0 0 0 -4.4-8.3 Z" fill="currentColor"/><path d="M20,4 a12,12 0 0 0 -12,12 l7,.1 a5.5,5.5 0 0 1 5.5-5.6 Z" fill="currentColor" opacity=".5"/><circle cx="20" cy="16" r="5" fill="#fff" opacity=".9"/></svg>`
const makeRoseIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,16 L20,6 A4,4 0 0,1 20,6 L24,16 Z" fill="currentColor" opacity=".9"/><path d="M20,16 L24,16 A8,8 0,0,1 14,22 Z" fill="currentColor" opacity=".7"/><path d="M20,16 L14,22 A6,6,0,0,1 14,8 Z" fill="currentColor" opacity=".5"/></svg>`
const makeRadarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="20,4 32,12 28,26 12,26 8,12" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><polygon points="20,10 27,14 24,22 16,22 13,14" fill="currentColor" opacity=".5"/></svg>`
const makeFunnelIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="6,4 34,4 28,13 12,13" fill="currentColor" opacity=".9" rx="1"/><polygon points="12,14 28,14 24,22 16,22" fill="currentColor" opacity=".6"/><polygon points="16,23 24,23 21,30 19,30" fill="currentColor" opacity=".4"/></svg>`
const makeGaugeIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M8,24 A12,12 0 0,1 32,24" fill="none" stroke="currentColor" stroke-width="3" opacity=".3" stroke-linecap="round"/><path d="M8,24 A12,12 0 0,1 24,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="24" x2="26" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="24" r="2.5" fill="currentColor"/></svg>`
const makeScatterIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="22" r="2.5" fill="currentColor"/><circle cx="16" cy="10" r="2.5" fill="currentColor"/><circle cx="22" cy="18" r="2.5" fill="currentColor"/><circle cx="28" cy="8" r="2.5" fill="currentColor"/><circle cx="32" cy="20" r="2.5" fill="currentColor"/></svg>`
const makeTreemapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="20" height="18" fill="currentColor" opacity=".8" rx="1"/><rect x="25" y="3" width="12" height="10" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="15" width="12" height="6" fill="currentColor" opacity=".35" rx="1"/><rect x="3" y="23" width="34" height="6" fill="currentColor" opacity=".25" rx="1"/></svg>`
const makeTableIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="7" fill="currentColor" rx="1"/><rect x="4" y="13" width="32" height="5" fill="currentColor" opacity=".4" rx="1"/><rect x="4" y="20" width="32" height="5" fill="currentColor" opacity=".25" rx="1"/><line x1="18" y1="4" x2="18" y2="25" stroke="white" stroke-width="1" opacity=".4"/></svg>`

const CHART_CATEGORIES: ChartCategory[] = [
  {
    label: '指标',
    types: [
      { type: 'gauge', label: '仪表盘', svgIcon: makeGaugeIcon() },
    ],
  },
  {
    label: '表格',
    types: [
      { type: 'table', label: '明细表', svgIcon: makeTableIcon() },
    ],
  },
  {
    label: '线/面图',
    types: [
      { type: 'line', label: '基础折线图', svgIcon: makeLineIcon() },
      { type: 'area', label: '面积图', svgIcon: makeAreaIcon() },
      { type: 'line_stack', label: '堆叠折线图', svgIcon: makeLineStackIcon() },
    ],
  },
  {
    label: '柱/条图',
    types: [
      { type: 'bar', label: '基础柱状图', svgIcon: makeBarIcon() },
      { type: 'bar_stack', label: '堆叠柱状图', svgIcon: makeBarStackIcon() },
      { type: 'bar_percent', label: '百分比柱状图', svgIcon: makeBarStackIcon() },
      { type: 'bar_group', label: '分组柱状图', svgIcon: makeBarIcon() },
      { type: 'bar_horizontal', label: '基础条形图', svgIcon: makeBarHIcon() },
      { type: 'bar_horizontal_stack', label: '堆叠条形图', svgIcon: makeBarHIcon() },
    ],
  },
  {
    label: '分布图',
    types: [
      { type: 'pie', label: '饼图', svgIcon: makePieIcon() },
      { type: 'doughnut', label: '环形图', svgIcon: makeDoughnutIcon() },
      { type: 'rose', label: '玫瑰图', svgIcon: makeRoseIcon() },
      { type: 'radar', label: '雷达图', svgIcon: makeRadarIcon() },
      { type: 'funnel', label: '漏斗图', svgIcon: makeFunnelIcon() },
      { type: 'treemap', label: '矩形树图', svgIcon: makeTreemapIcon() },
    ],
  },
  {
    label: '关系图',
    types: [
      { type: 'scatter', label: '散点图', svgIcon: makeScatterIcon() },
    ],
  },
]

const activeCat = ref(CHART_CATEGORIES[0].label)
const activeCategoryTypes = computed(() =>
  CHART_CATEGORIES.find((c) => c.label === activeCat.value)?.types ?? []
)

const selectTypeFilter = (type: string) => {
  assetType.value = assetType.value === type ? '' : type
  libraryTab.value = 'templates'
}

const loading = ref(false)
const compLoading = ref(false)
const dashboards = ref<Dashboard[]>([])
const currentDashboard = ref<Dashboard | null>(null)
const components = ref<DashboardComponent[]>([])
const charts = ref<Chart[]>([])
const datasets = ref<Dataset[]>([])
const templates = ref<ChartTemplate[]>([])
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])))
const datasetMap = computed(() => new Map(datasets.value.map((item) => [item.id, item])))
const dashboardCounts = ref(new Map<number, number>())
const componentDataMap = ref(new Map<number, ChartDataResult>())
const canvasRef = ref<HTMLElement | null>(null)
const activeCompId = ref<number | null>(null)
const dashboardSearch = ref('')
const shareVisible = ref(false)
const publishVisible = ref(false)
const publishSaving = ref(false)
const canvasSaving = ref(false)

const libraryTab = ref('templates')
const assetSearch = ref('')
const assetType = ref('')
const selectedChartId = ref<number | null>(null)
const selectedTemplateId = ref<number | null>(null)
const draggingTemplateId = ref<number | null>(null)
const stageDropActive = ref(false)

const createDashVisible = ref(false)
const dashSaving = ref(false)
const dashForm = reactive({ name: '' })
const templateSaveVisible = ref(false)
const templateSaving = ref(false)
const templateForm = reactive({ name: '', description: '' })
const publishForm = reactive({
  published: false,
  allowAnonymousAccess: true,
  allowedRoles: ['ADMIN', 'ANALYST'],
  shareToken: ''
})

const chartRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, echarts.ECharts>()
let interactionFrame: number | null = null
let pendingPointer: { x: number; y: number } | null = null

const MIN_CARD_WIDTH = 320
const MIN_CARD_HEIGHT = 220
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70
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
  { label: '表格', value: 'table' },
  { label: '漏斗图', value: 'funnel' },
  { label: '仪表盘', value: 'gauge' },
  { label: '散点图', value: 'scatter' },
  { label: '雷达图', value: 'radar' },
  { label: '矩形树图', value: 'treemap' },
]

const filteredCharts = computed(() => {
  const keyword = assetSearch.value.trim().toLowerCase()
  return charts.value.filter((item) => {
    const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchType = !assetType.value || item.chartType === assetType.value
    return matchKeyword && matchType
  })
})

const filteredTemplates = computed(() => {
  const keyword = assetSearch.value.trim().toLowerCase()
  return templates.value.filter((item) => {
    const matchKeyword = !keyword
      || item.name.toLowerCase().includes(keyword)
      || item.description.toLowerCase().includes(keyword)
    const matchType = !assetType.value || item.chartType === assetType.value
    return matchKeyword && matchType
  })
})

const selectedChartAsset = computed(() => charts.value.find((item) => item.id === selectedChartId.value) ?? null)
const selectedTemplate = computed(() => templates.value.find((item) => item.id === selectedTemplateId.value) ?? null)
const selectedLibraryAsset = computed(() => libraryTab.value === 'templates' ? selectedTemplate.value : selectedChartAsset.value)
const filteredDashboards = computed(() => {
  const keyword = dashboardSearch.value.trim().toLowerCase()
  return keyword ? dashboards.value.filter((item) => item.name.toLowerCase().includes(keyword)) : dashboards.value
})
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish))
const isPublished = computed(() => currentPublishConfig.value.status === 'PUBLISHED')
const shareLink = computed(() => currentDashboard.value
  ? buildPublishedLink('screen', currentDashboard.value.id, currentPublishConfig.value.shareToken)
  : '')
const previewLink = computed(() => currentDashboard.value
  ? `${window.location.origin}/preview/screen/${currentDashboard.value.id}`
  : '')
const draftPublishedLink = computed(() => currentDashboard.value
  ? buildPublishedLink('screen', currentDashboard.value.id, publishForm.shareToken || currentPublishConfig.value.shareToken)
  : '')
const roleOptions = ['ADMIN', 'ANALYST', 'VIEWER']
const activeComponent = computed(() => components.value.find((item) => item.id === activeCompId.value) ?? null)
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null)
const getComponentConfig = (component: DashboardComponent) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId))
const getComponentChartConfig = (component: DashboardComponent) => getComponentConfig(component).chart
const currentCanvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(currentDashboard.value?.configJson).canvas, 'screen'))
const matchedCanvasPreset = computed(() => SCREEN_CANVAS_PRESETS.find(
  (item) => item.width === currentCanvasConfig.value.width && item.height === currentCanvasConfig.value.height
)?.id ?? 'custom')

const canvasMinHeight = computed(() => {
  const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0)
  return Math.max(currentCanvasConfig.value.height, 560, occupied)
})

const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? currentCanvasConfig.value.width, MIN_CARD_WIDTH + 32)

const setChartRef = (el: HTMLElement | null, componentId: number) => {
  if (el) chartRefs.set(componentId, el)
  else chartRefs.delete(componentId)
}

const getDashboardComponentCount = (dashboardId: number) => dashboardCounts.value.get(dashboardId) ?? 0

const normalizeLayout = (component: DashboardComponent) => {
  if (component.width <= 24) component.width = Math.max(MIN_CARD_WIDTH, component.width * LEGACY_GRID_COL_PX)
  if (component.height <= 12) component.height = Math.max(MIN_CARD_HEIGHT, component.height * LEGACY_GRID_ROW_PX)
  if (component.posX <= 24 && component.width > 24) component.posX = component.posX * LEGACY_GRID_COL_PX
  if (component.posY <= 24 && component.height > 12) component.posY = component.posY * LEGACY_GRID_ROW_PX

  component.posX = Math.max(0, Number(component.posX) || 0)
  component.posY = Math.max(0, Number(component.posY) || 0)
  component.width = Math.max(MIN_CARD_WIDTH, Number(component.width) || MIN_CARD_WIDTH)
  component.height = Math.max(MIN_CARD_HEIGHT, Number(component.height) || MIN_CARD_HEIGHT)
  component.zIndex = Number(component.zIndex) || 0
}

const getCardStyle = (component: DashboardComponent) => ({
  left: `${component.posX}px`,
  top: `${component.posY}px`,
  width: `${component.width}px`,
  height: `${component.height}px`,
  zIndex: String(component.zIndex ?? 0),
})

const buildCounts = async () => {
  const entries = await Promise.all(
    dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length] as const)
  )
  dashboardCounts.value = new Map(entries)
}

const loadBaseData = async () => {
  loading.value = true
  try {
    const [dashboardList, chartList, datasetList, templateList] = await Promise.all([
      getDashboardList(),
      getChartList(),
      getDatasetList(),
      getTemplateList()
    ])
    dashboards.value = dashboardList
    charts.value = chartList
    datasets.value = datasetList
    templates.value = templateList
    if (!selectedTemplateId.value && templateList.length) selectedTemplateId.value = templateList[0].id
    if (!selectedChartId.value && chartList.length) selectedChartId.value = chartList[0].id

    if (props.screenId) {
      // 编辑器模式：直接加载指定大屏
      const target = dashboardList.find((d) => d.id === props.screenId)
      if (target) {
        await selectDashboard(target)
      } else {
        ElMessage.error('未找到对应大屏')
      }
    } else {
      await buildCounts()
      if (dashboardList.length) await selectDashboard(dashboardList[0])
    }
  } finally {
    loading.value = false
  }
}

const disposeCharts = () => {
  chartInstances.forEach((instance) => instance.dispose())
  chartInstances.clear()
  chartRefs.clear()
}

const selectDashboard = async (dashboard: Dashboard) => {
  currentDashboard.value = dashboard
  activeCompId.value = null
  await loadComponents()
}

const loadComponents = async () => {
  if (!currentDashboard.value) return
  compLoading.value = true
  disposeCharts()
  componentDataMap.value = new Map()
  try {
    const result = await getDashboardComponents(currentDashboard.value.id)
    result.forEach(normalizeLayout)
    components.value = result
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length)
    await nextTick()
    await Promise.all(result.map((component) => loadComponentData(component)))
  } finally {
    compLoading.value = false
  }
}

const loadComponentData = async (component: DashboardComponent) => {
  const chart = getComponentChartConfig(component)
  if (!chart || showNoField(component)) return
  try {
    const resolved = getComponentConfig(component)
    const data = await getChartData(component.chartId, {
      configJson: component.configJson,
      filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
    })
    const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart)
    const nextMap = new Map(componentDataMap.value)
    nextMap.set(component.id, materialized)
    componentDataMap.value = nextMap
    if (isRenderableChart(component)) renderChart(component, materialized)
  } catch {
    ElMessage.warning(`组件 ${chart.name} 数据加载失败`)
  }
}

const renderChart = (component: DashboardComponent, data: ChartDataResult) => {
  const el = chartRefs.get(component.id)
  if (!el) return
  let chartInstance = chartInstances.get(component.id)
  if (!chartInstance) {
    chartInstance = echarts.init(el)
    chartInstances.set(component.id, chartInstance)
  }
  const resolved = getComponentConfig(component)
  chartInstance.setOption(buildComponentOption(data, resolved.chart, resolved.style), true)
}

const isTableChart = (component: DashboardComponent) => getComponentChartConfig(component).chartType === 'table'

const isRenderableChart = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isCanvasRenderableChartType(type)
}

const showNoField = (component: DashboardComponent) => getMissingChartFields(getComponentChartConfig(component)).length > 0

const getTableColumns = (componentId: number) => componentDataMap.value.get(componentId)?.columns ?? []
const getTableRows = (componentId: number) => componentDataMap.value.get(componentId)?.rawRows ?? []

const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0)

const focusComponent = (component: DashboardComponent) => {
  activeCompId.value = component.id
  const nextZ = getMaxZ() + 1
  if ((component.zIndex ?? 0) < nextZ) component.zIndex = nextZ
}

const applyLayoutPatch = async (patch: Partial<DashboardComponent>) => {
  const component = activeComponent.value
  if (!component) return
  if (typeof patch.posX === 'number') component.posX = Math.max(0, Math.round(patch.posX))
  if (typeof patch.posY === 'number') component.posY = Math.max(0, Math.round(patch.posY))
  if (typeof patch.width === 'number') component.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width))
  if (typeof patch.height === 'number') component.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height))
  if (typeof patch.zIndex === 'number') component.zIndex = Math.max(0, Math.round(patch.zIndex))
  normalizeLayout(component)
  await nextTick()
  chartInstances.get(component.id)?.resize()
  await persistLayout(component)
}

const bringComponentToFront = async () => {
  const component = activeComponent.value
  if (!component) return
  await applyLayoutPatch({ zIndex: getMaxZ() + 1 })
}

const handleRemoveActiveComponent = async () => {
  if (!activeComponent.value) return
  await removeComponent(activeComponent.value.id)
}

const previewActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const component = activeComponent.value
  if (!component) return
  component.chartId = payload.chartId
  component.configJson = payload.configJson
  await nextTick()
  await loadComponentData(component)
}

const saveActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const component = activeComponent.value
  if (!component || !currentDashboard.value) return
  await updateDashboardComponent(currentDashboard.value.id, component.id, payload)
  component.chartId = payload.chartId
  component.configJson = payload.configJson
  await loadComponents()
  ElMessage.success('组件实例配置已保存')
}

const persistLayout = async (component: DashboardComponent) => {
  if (!currentDashboard.value) return
  try {
    await updateDashboardComponent(currentDashboard.value.id, component.id, {
      posX: Math.round(component.posX),
      posY: Math.round(component.posY),
      width: Math.round(component.width),
      height: Math.round(component.height),
      zIndex: component.zIndex,
    })
  } catch {
    ElMessage.warning('布局保存失败，请重试')
  }
}

type InteractionMode = 'move' | 'resize'
type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
interface InteractionState {
  mode: InteractionMode
  compId: number
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  handle?: ResizeHandle
}

let interaction: InteractionState | null = null
const resizeHandles: ResizeHandle[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']

const findComponent = (id: number) => components.value.find((item) => item.id === id)

const applyInteractionFrame = () => {
  interactionFrame = null
  if (!interaction || !pendingPointer) return
  const component = findComponent(interaction.compId)
  if (!component) return

  const dx = pendingPointer.x - interaction.startMouseX
  const dy = pendingPointer.y - interaction.startMouseY

  if (interaction.mode === 'move') {
    const maxX = Math.max(0, getCanvasWidth() - component.width)
    component.posX = Math.min(maxX, Math.max(0, interaction.startX + dx))
    component.posY = Math.max(0, interaction.startY + dy)
  } else {
    const handle = interaction.handle ?? 'se'
    let nextX = interaction.startX
    let nextY = interaction.startY
    let nextWidth = interaction.startWidth
    let nextHeight = interaction.startHeight
    const canvasWidth = getCanvasWidth()

    if (handle.includes('e')) {
      nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX))
    }
    if (handle.includes('s')) {
      nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy)
    }
    if (handle.includes('w')) {
      const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH
      nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft)
      nextWidth = interaction.startWidth - (nextX - interaction.startX)
    }
    if (handle.includes('n')) {
      const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT
      nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop)
      nextHeight = interaction.startHeight - (nextY - interaction.startY)
    }

    component.posX = Math.round(nextX)
    component.posY = Math.round(nextY)
    component.width = Math.round(nextWidth)
    component.height = Math.round(nextHeight)
    chartInstances.get(component.id)?.resize()
  }
}

const scheduleInteractionFrame = () => {
  if (interactionFrame !== null) return
  interactionFrame = window.requestAnimationFrame(applyInteractionFrame)
}

const cleanupInteractionFrame = () => {
  if (interactionFrame !== null) {
    window.cancelAnimationFrame(interactionFrame)
    interactionFrame = null
  }
  pendingPointer = null
  document.body.classList.remove('canvas-interacting')
}

const startDrag = (event: MouseEvent, component: DashboardComponent) => {
  focusComponent(component)
  interaction = {
    mode: 'move',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
  }
  pendingPointer = { x: event.clientX, y: event.clientY }
  document.body.classList.add('canvas-interacting')
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const startResize = (event: MouseEvent, component: DashboardComponent, handle: ResizeHandle = 'se') => {
  focusComponent(component)
  interaction = {
    mode: 'resize',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
    handle,
  }
  pendingPointer = { x: event.clientX, y: event.clientY }
  document.body.classList.add('canvas-interacting')
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const onPointerMove = (event: MouseEvent) => {
  if (!interaction) return
  pendingPointer = { x: event.clientX, y: event.clientY }
  scheduleInteractionFrame()
}

const onPointerUp = async () => {
  if (!interaction) return
  const component = findComponent(interaction.compId)
  if (pendingPointer) {
    applyInteractionFrame()
  }
  interaction = null
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame()
  if (component) {
    chartInstances.get(component.id)?.resize()
    await persistLayout(component)
  }
}

const openCreateDashboard = () => {
  dashForm.name = ''
  createDashVisible.value = true
}

const handleCreateDashboard = async () => {
  if (!dashForm.name.trim()) {
    ElMessage.warning('请输入大屏名称')
    return
  }
  dashSaving.value = true
  try {
    const dashboard = await createDashboard({ name: dashForm.name, configJson: buildReportConfig(null, 'screen') })
    dashboards.value.unshift(dashboard)
    dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, 0)
    createDashVisible.value = false
    await selectDashboard(dashboard)
    ElMessage.success('数据大屏创建成功')
  } finally {
    dashSaving.value = false
  }
}

const handleDeleteDashboard = async (id: number) => {
  await deleteDashboard(id)
  dashboards.value = dashboards.value.filter((item) => item.id !== id)
  const nextCounts = new Map(dashboardCounts.value)
  nextCounts.delete(id)
  dashboardCounts.value = nextCounts
  if (currentDashboard.value?.id === id) {
    currentDashboard.value = dashboards.value[0] ?? null
    if (currentDashboard.value) await loadComponents()
    else components.value = []
  }
  ElMessage.success('已删除数据大屏')
}

const openPreview = (usePublishedLink = false) => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择大屏')
  window.open(usePublishedLink && isPublished.value ? shareLink.value : previewLink.value, '_blank', 'noopener,noreferrer')
}

const openShareDialog = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择大屏')
  shareVisible.value = true
}

const openPublishDialog = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择大屏')
  const publish = currentPublishConfig.value
  publishForm.published = publish.status === 'PUBLISHED'
  publishForm.allowAnonymousAccess = publish.allowAnonymousAccess
  publishForm.allowedRoles = [...publish.allowedRoles]
  publishForm.shareToken = publish.shareToken
  publishVisible.value = true
}

const savePublishSettings = async () => {
  if (!currentDashboard.value) return
  publishSaving.value = true
  try {
    const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', {
      status: publishForm.published ? 'PUBLISHED' : 'DRAFT',
      allowAnonymousAccess: publishForm.allowAnonymousAccess,
      allowedRoles: publishForm.allowedRoles,
      shareToken: publishForm.shareToken,
      publishedAt: publishForm.published ? new Date().toISOString() : undefined,
    })
    const updated = await updateDashboard(currentDashboard.value.id, { configJson })
    currentDashboard.value = updated
    dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item)
    publishVisible.value = false
    ElMessage.success('发布设置已保存')
  } finally {
    publishSaving.value = false
  }
}

const updateCanvasConfig = async (patch: Partial<ReportCanvasConfig>) => {
  if (!currentDashboard.value) return
  canvasSaving.value = true
  try {
    const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', undefined, patch)
    const updated = await updateDashboard(currentDashboard.value.id, { configJson })
    currentDashboard.value = updated
    dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item)
    await nextTick()
    handleWindowResize()
  } finally {
    canvasSaving.value = false
  }
}

const applyCanvasPreset = async (presetId: string) => {
  if (presetId === 'custom') return
  const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId)
  if (!preset) return
  await updateCanvasConfig({ width: preset.width, height: preset.height })
}

const updateCanvasDimension = async (dimension: 'width' | 'height', value: number | undefined) => {
  const fallback = currentCanvasConfig.value[dimension]
  const normalizedValue = Math.max(dimension === 'width' ? 640 : 360, Math.round(Number(value) || fallback))
  if (normalizedValue === currentCanvasConfig.value[dimension]) return
  await updateCanvasConfig({ [dimension]: normalizedValue })
}

const onCanvasWidthChange = (value: number | null | undefined) => updateCanvasDimension('width', value ?? undefined)
const onCanvasHeightChange = (value: number | null | undefined) => updateCanvasDimension('height', value ?? undefined)

const copyShareLink = async () => {
  if (!isPublished.value) {
    ElMessage.warning('请先发布数据大屏')
    return
  }
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('分享链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制链接')
  }
}

const exportScreenJson = () => {
  if (!currentDashboard.value) return ElMessage.warning('请先选择大屏')
  const payload = {
    screen: currentDashboard.value,
    components: components.value,
    charts: components.value
      .map((component) => chartMap.value.get(component.chartId))
      .filter((chart): chart is Chart => Boolean(chart))
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${currentDashboard.value.name}-screen.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

const getTemplateDatasetName = (template: ChartTemplate) => {
  const asset = normalizeComponentAssetConfig(template.configJson)
  return datasetMap.value.get(Number(asset.chart.datasetId) || -1)?.name ?? '未关联数据集'
}

const getTemplateLayoutText = (template: ChartTemplate) => {
  const asset = normalizeComponentAssetConfig(template.configJson)
  return `${asset.layout.width} × ${asset.layout.height}`
}

const openSaveAssetDialog = () => {
  if (!activeComponent.value) {
    ElMessage.warning('请先选中一个画布组件')
    return
  }
  const currentName = getComponentChartConfig(activeComponent.value).name || '未命名组件'
  templateForm.name = `${currentName}-复用组件`
  templateForm.description = ''
  templateSaveVisible.value = true
}

const saveActiveComponentAsAsset = async () => {
  if (!activeComponent.value) {
    ElMessage.warning('请先选中一个画布组件')
    return
  }
  if (!templateForm.name.trim()) {
    ElMessage.warning('请输入组件名称')
    return
  }
  const baseChart = chartMap.value.get(activeComponent.value.chartId) ?? null
  const resolved = getComponentConfig(activeComponent.value)
  templateSaving.value = true
  try {
    const created = await createTemplate({
      name: templateForm.name.trim(),
      description: templateForm.description.trim(),
      chartType: resolved.chart.chartType,
      configJson: buildComponentAssetConfig(baseChart, activeComponent.value.configJson, {
        chart: {
          ...resolved.chart,
          name: templateForm.name.trim(),
        },
      }, {
        width: activeComponent.value.width,
        height: activeComponent.value.height,
      }),
    })
    templates.value = [created, ...templates.value]
    selectedTemplateId.value = created.id
    libraryTab.value = 'templates'
    templateSaveVisible.value = false
    ElMessage.success('组件已保存到组件库')
  } finally {
    templateSaving.value = false
  }
}

const handleAddSelectedAsset = async () => {
  if (libraryTab.value === 'templates') {
    if (!selectedTemplate.value) {
      ElMessage.warning('请先选择组件资产')
      return
    }
    await addTemplateToScreen(selectedTemplate.value)
    return
  }
  if (!selectedChartAsset.value) {
    ElMessage.warning('请先选择组件')
    return
  }
  await addChartToScreen(selectedChartAsset.value)
}

const quickAddChart = async (chart: Chart) => {
  selectedChartId.value = chart.id
  await addChartToScreen(chart)
}

const quickAddTemplate = async (template: ChartTemplate) => {
  selectedTemplateId.value = template.id
  await addTemplateToScreen(template)
}

const resolveDropPlacement = (width: number, height: number, point?: { clientX: number; clientY: number }) => {
  if (!point || !canvasRef.value) {
    const lastY = components.value.reduce((max, item) => Math.max(max, item.posY + item.height), 0)
    return {
      posX: 16,
      posY: lastY + 16,
      width,
      height,
    }
  }
  const rect = canvasRef.value.getBoundingClientRect()
  const posX = Math.max(0, Math.min(getCanvasWidth() - width, point.clientX - rect.left - width / 2))
  const posY = Math.max(0, point.clientY - rect.top - 28)
  return {
    posX: Math.round(posX),
    posY: Math.round(posY),
    width,
    height,
  }
}

const addChartToScreen = async (
  chart: Chart,
  configJson?: string,
  size?: { width: number; height: number },
  point?: { clientX: number; clientY: number }
) => {
  if (!currentDashboard.value) {
    ElMessage.warning('请先选择大屏')
    return
  }
  const nextSize = size ?? {
    width: chart.chartType === 'table' ? 760 : 520,
    height: chart.chartType === 'table' ? 340 : 320,
  }
  const placement = resolveDropPlacement(nextSize.width, nextSize.height, point)
  const component = await addDashboardComponent(currentDashboard.value.id, {
    chartId: chart.id,
    posX: placement.posX,
    posY: placement.posY,
    width: placement.width,
    height: placement.height,
    zIndex: getMaxZ() + 1,
    configJson: configJson ?? buildComponentConfig(chart, undefined, {
      chart: buildChartSnapshot(chart),
    }),
  })
  normalizeLayout(component)
  components.value.push(component)
  activeCompId.value = component.id
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  await nextTick()
  await loadComponentData(component)
  ElMessage.success('组件已加入大屏')
}

const addTemplateToScreen = async (template: ChartTemplate, point?: { clientX: number; clientY: number }) => {
  const asset = normalizeComponentAssetConfig(template.configJson)
  const datasetId = Number(asset.chart.datasetId)
  if (!Number.isFinite(datasetId) || datasetId <= 0) {
    ElMessage.warning('该组件资产未绑定有效数据集，请先调整后再使用')
    return
  }
  const createdChart = await createChart({
    name: asset.chart.name || template.name,
    datasetId,
    chartType: asset.chart.chartType || template.chartType,
    xField: asset.chart.xField,
    yField: asset.chart.yField,
    groupField: asset.chart.groupField,
  })
  charts.value = [createdChart, ...charts.value.filter((item) => item.id !== createdChart.id)]
  selectedChartId.value = createdChart.id
  await addChartToScreen(
    createdChart,
    buildComponentAssetConfig(createdChart, template.configJson, {
      chart: {
        ...asset.chart,
        name: asset.chart.name || template.name,
      },
    }, asset.layout),
    asset.layout,
    point,
  )
}

const removeComponent = async (componentId: number) => {
  if (!currentDashboard.value) return
  await removeDashboardComponent(currentDashboard.value.id, componentId)
  chartInstances.get(componentId)?.dispose()
  chartInstances.delete(componentId)
  chartRefs.delete(componentId)
  const nextData = new Map(componentDataMap.value)
  nextData.delete(componentId)
  componentDataMap.value = nextData
  components.value = components.value.filter((item) => item.id !== componentId)
  if (activeCompId.value === componentId) activeCompId.value = null
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  ElMessage.success('组件已移除')
}

const onTemplateDragStart = (event: DragEvent, template: ChartTemplate) => {
  selectedTemplateId.value = template.id
  draggingTemplateId.value = template.id
  stageDropActive.value = true
  event.dataTransfer?.setData('text/plain', String(template.id))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

const onTemplateDragEnd = () => {
  draggingTemplateId.value = null
  stageDropActive.value = false
}

const onStageDragOver = (event: DragEvent) => {
  if (!draggingTemplateId.value) return
  stageDropActive.value = true
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const onStageDragLeave = (event: DragEvent) => {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement | null)?.contains(nextTarget)) {
    return
  }
  stageDropActive.value = false
}

const onStageDrop = async (event: DragEvent) => {
  const templateId = draggingTemplateId.value ?? Number(event.dataTransfer?.getData('text/plain') || 0)
  const template = templates.value.find((item) => item.id === templateId)
  stageDropActive.value = false
  draggingTemplateId.value = null
  if (!template) return
  await addTemplateToScreen(template, { clientX: event.clientX, clientY: event.clientY })
}

const summarizeTemplateConfig = (configJson: string) => {
  const asset = normalizeComponentAssetConfig(configJson)
  const segments = [
    asset.chart.xField ? `维度 ${asset.chart.xField}` : '',
    asset.chart.yField ? `度量 ${asset.chart.yField}` : '',
    asset.chart.groupField ? `分组 ${asset.chart.groupField}` : '',
    asset.style.theme ? `主题 ${asset.style.theme}` : '',
  ]
  return segments.filter(Boolean).join(' / ')
}

const handleWindowResize = () => {
  chartInstances.forEach((instance) => instance.resize())
}

onMounted(async () => {
  window.addEventListener('resize', handleWindowResize)
  await loadBaseData()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame()
  window.removeEventListener('resize', handleWindowResize)
  disposeCharts()
})
</script>

<style scoped>
.screen-root {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr) 320px;
  gap: 16px;
  min-height: calc(100vh - 170px);
}

.screen-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.side-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #d7e5f5;
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(25, 74, 136, 0.08);
}

.library-panel {
  flex: 1;
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;
}

.side-title {
  font-size: 15px;
  font-weight: 700;
  color: #183153;
}

.side-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-list {
  padding: 0 10px 12px;
}

.screen-search-wrap {
  padding: 0 16px 10px;
}

.screen-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e5edf7;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.screen-item:hover {
  transform: translateY(-1px);
  border-color: #b7d1ec;
  box-shadow: 0 8px 18px rgba(29, 93, 155, 0.08);
}

.screen-item.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #eff7ff 0%, #f7fbff 100%);
}

.screen-item-main {
  min-width: 0;
}

.screen-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.screen-item-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-item-del {
  color: #8fa2bb;
}

.screen-item-del:hover {
  color: #f56c6c;
}

.library-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
}

.library-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
}

.library-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.library-toolbar {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
  margin-bottom: 12px;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 360px);
  overflow: auto;
  padding-right: 2px;
}

.asset-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5edf7;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.asset-card:hover {
  transform: translateY(-1px);
  border-color: #bfd8f2;
  box-shadow: 0 8px 18px rgba(29, 93, 155, 0.08);
}

.asset-card.selected {
  border-color: #409eff;
  background: linear-gradient(180deg, #f0f8ff 0%, #ffffff 100%);
}

.asset-card--builtin {
  border-color: #cfe8d8;
  background: linear-gradient(180deg, #f7fff9 0%, #ffffff 100%);
}

.asset-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.asset-card-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.asset-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}

.asset-card-meta,
.asset-card-fields,
.template-config,
.template-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #6d7b91;
}

.asset-card-fields {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.asset-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.drag-tip {
  font-size: 12px;
  color: #409eff;
}

.template-card {
  cursor: grab;
}

.screen-main {
  min-width: 0;
}

.screen-inspector {
  min-width: 0;
}

.screen-empty-state,
.stage-panel {
  min-height: 100%;
}

.screen-toolbar,
.selected-bar,
.stage-panel {
  background: linear-gradient(180deg, #fbfdff 0%, #ffffff 100%);
  border: 1px solid #d9e6f4;
  border-radius: 20px;
  box-shadow: 0 18px 38px rgba(21, 61, 112, 0.08);
}

.screen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
}

.readonly-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 16px;
  border: 1px solid #ffe1a6;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffaf0 0%, #fffdf7 100%);
  color: #8a5a00;
  font-size: 12px;
}

.screen-title {
  font-size: 22px;
  font-weight: 700;
  color: #163050;
}

.screen-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.screen-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #71829b;
}

.screen-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.selected-bar {
  margin-top: 14px;
  padding: 14px 18px;
}

.share-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.share-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.share-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.selected-bar-title {
  font-size: 12px;
  color: #6d7b91;
}

.selected-bar-content {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  color: #183153;
  flex-wrap: wrap;
}

.stage-panel {
  margin-top: 14px;
  padding: 18px;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.stage-head-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stage-canvas-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stage-canvas-separator {
  color: #7b8da6;
  font-size: 14px;
}

.stage-title {
  font-size: 15px;
  font-weight: 700;
  color: #183153;
}

.stage-note,
.stage-stats {
  margin-top: 4px;
  font-size: 12px;
  color: #6d7b91;
}

.screen-stage-shell {
  overflow: auto;
  padding-bottom: 4px;
}

.screen-stage {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #dce8f5;
  background-color: #081b32;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(20, 116, 214, 0.18), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(66, 185, 131, 0.14), transparent 24%),
    linear-gradient(rgba(129, 170, 215, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 170, 215, 0.08) 1px, transparent 1px);
  background-size: auto, auto, 26px 26px, 26px 26px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.screen-stage--drop {
  border-color: #7bc4ff;
  box-shadow: inset 0 0 0 2px rgba(123, 196, 255, 0.25);
}

.stage-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid rgba(124, 170, 219, 0.18);
  background: linear-gradient(180deg, rgba(9, 30, 53, 0.95) 0%, rgba(7, 20, 36, 0.96) 100%);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(10px);
  user-select: none;
  will-change: transform, width, height;
}

.stage-card.active {
  border-color: rgba(64, 158, 255, 0.92);
  box-shadow: 0 12px 28px rgba(64, 158, 255, 0.28);
}

.stage-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  cursor: move;
}

.stage-card-header-main {
  min-width: 0;
}

.stage-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #eef5ff;
}

.stage-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  min-width: 0;
  font-size: 12px;
  color: rgba(220, 232, 245, 0.76);
  flex-wrap: wrap;
}

.stage-card-body {
  flex: 1;
  min-height: 0;
}

.chart-canvas,
.table-wrapper {
  height: 100%;
}

.table-wrapper :deep(.el-table) {
  --el-table-bg-color: rgba(7, 22, 38, 0.72);
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(16, 41, 68, 0.94);
  --el-table-border-color: rgba(104, 148, 194, 0.22);
  --el-table-text-color: #e6eef8;
  --el-table-header-text-color: #d8e8fb;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed rgba(117, 154, 195, 0.35);
  text-align: center;
  color: rgba(229, 237, 247, 0.8);
  font-size: 12px;
  line-height: 1.7;
}

.chart-placeholder.warning {
  color: #ffd77d;
}

.remove-btn {
  color: rgba(219, 231, 246, 0.68);
  cursor: pointer;
}

.remove-btn:hover {
  color: #f56c6c;
}

.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.stage-card:hover .resize-handle,
.stage-card.active .resize-handle {
  opacity: 1;
}

.resize-handle::before {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: rgba(123, 196, 255, 0.95);
  box-shadow: 0 0 0 2px rgba(7, 20, 36, 0.72);
}

.resize-handle--n,
.resize-handle--s {
  left: 18px;
  right: 18px;
  height: 12px;
}

.resize-handle--n {
  top: -6px;
  cursor: ns-resize;
}

.resize-handle--s {
  bottom: -6px;
  cursor: ns-resize;
}

.resize-handle--n::before,
.resize-handle--s::before {
  left: 50%;
  top: 50%;
  width: 36px;
  height: 4px;
  transform: translate(-50%, -50%);
}

.resize-handle--e,
.resize-handle--w {
  top: 18px;
  bottom: 18px;
  width: 12px;
}

.resize-handle--e {
  right: -6px;
  cursor: ew-resize;
}

.resize-handle--w {
  left: -6px;
  cursor: ew-resize;
}

.resize-handle--e::before,
.resize-handle--w::before {
  left: 50%;
  top: 50%;
  width: 4px;
  height: 36px;
  transform: translate(-50%, -50%);
}

.resize-handle--ne,
.resize-handle--nw,
.resize-handle--se,
.resize-handle--sw {
  width: 16px;
  height: 16px;
}

.resize-handle--ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.resize-handle--nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

.resize-handle--se {
  right: -6px;
  bottom: -6px;
  cursor: nwse-resize;
}

.resize-handle--sw {
  left: -6px;
  bottom: -6px;
  cursor: nesw-resize;
}

.resize-handle--ne::before,
.resize-handle--nw::before,
.resize-handle--se::before,
.resize-handle--sw::before {
  inset: 2px;
}

.stage-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(body.canvas-interacting) {
  user-select: none;
  cursor: grabbing;
}

@media (max-width: 1200px) {
  .screen-root {
    grid-template-columns: 1fr;
  }

  .asset-list {
    max-height: 420px;
  }
}

@media (max-width: 768px) {
  .screen-toolbar,
  .stage-head,
  .readonly-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .screen-actions,
  .selected-bar-content,
  .library-toolbar {
    width: 100%;
  }

  .library-toolbar {
    grid-template-columns: 1fr;
  }

  .stage-head-actions,
  .stage-canvas-controls {
    width: 100%;
  }
}

/* ─── 编辑器模式布局 ─────────────────────────────────────────────────────────── */
.screen-root--editor {
  display: grid;
  grid-template-columns: 120px 220px 1fr 300px;
  grid-template-rows: 1fr;
}

.screen-type-sidebar {
  display: flex;
  flex-direction: column;
  background: #101b2e;
  border-right: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}

.type-cat-nav {
  flex-shrink: 0;
  overflow-y: auto;
  padding: 8px 0;
}

.type-cat-item {
  padding: 10px 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  text-align: center;
  line-height: 1.4;
  border-left: 2px solid transparent;
  transition: all 0.15s;
}

.type-cat-item:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.05);
}

.type-cat-item.active {
  color: #4db3ff;
  background: rgba(77,179,255,0.1);
  border-left-color: #4db3ff;
}

.type-cat-grid {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  display: none; /* hidden - shown on hover */
}

.screen-type-sidebar:hover .type-cat-grid,
.screen-type-sidebar.picker-open .type-cat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  align-content: start;
}

/* Always show grid inside the library panel area */
.screen-type-sidebar {
  overflow: visible;
  position: relative;
}

.type-cat-grid {
  display: grid !important;
  grid-template-columns: repeat(1, 1fr);
  gap: 4px;
  align-content: start;
  overflow-y: auto;
  padding: 6px;
}

.type-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  background: rgba(255,255,255,0.03);
}

.type-grid-item:hover {
  background: rgba(77,179,255,0.12);
  border-color: rgba(77,179,255,0.3);
}

.type-grid-item--active {
  background: rgba(77,179,255,0.18);
  border-color: rgba(77,179,255,0.5);
}

.type-grid-icon {
  width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4db3ff;
}

.type-grid-icon svg {
  width: 100%;
  height: 100%;
}

.type-grid-label {
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.screen-library-panel {
  display: flex;
  flex-direction: column;
  background: #0e1c2f;
  border-right: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
  min-height: 0;
}

.library-editor-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  flex-shrink: 0;
}

.library-editor-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.screen-library-panel .library-toolbar {
  padding: 8px 12px;
  flex-shrink: 0;
}

.screen-library-panel .library-tabs {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.screen-library-panel .asset-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
}
</style>