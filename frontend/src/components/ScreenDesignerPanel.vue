<template>
  <div class="screen-root" :class="{ 'screen-root--editor': screenId }">
    <!-- 编辑器模式：可折叠左侧综合面板 -->
    <aside
      v-if="screenId"
      class="screen-left-panel"
      :class="{ 'screen-left-panel--collapsed': sidebarCollapsed }"
      :style="sidebarCollapsed ? {} : { width: leftPanelWidth + 'px' }"
      @mouseenter="hoverExpandSidebar"
      @mouseleave="hoverCollapseSidebar"
    >
      <!-- 头部 -->
      <div class="lp-head">
        <button class="lp-toggle-btn" @click.stop="toggleSidebar" :title="sidebarCollapsed ? '展开面板' : '收起面板'">
          <span class="lp-toggle-icon">☰</span>
        </button>
        <span v-if="!sidebarCollapsed" class="lp-title" :title="currentDashboard?.name ?? '编辑大屏'">{{ currentDashboard?.name ?? '编辑大屏' }}</span>
      </div>

      <!-- 折叠状态下的图标快捷菜单 -->
      <div v-if="sidebarCollapsed" class="lp-icon-menu">
        <el-tooltip content="模板库" placement="right">
          <div class="lp-icon-item" :class="{ active: libraryTab === 'templates' }" @click="libraryTab = 'templates'; sidebarCollapsed = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
          </div>
        </el-tooltip>
        <el-tooltip content="图表源" placement="right">
          <div class="lp-icon-item" :class="{ active: libraryTab === 'charts' }" @click="libraryTab = 'charts'; sidebarCollapsed = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
        </el-tooltip>
        <el-tooltip v-for="cat in CHART_CATEGORIES" :key="cat.label" :content="cat.label" placement="right">
          <div class="lp-icon-item" @click="sidebarCollapsed = false" v-html="cat.types[0]?.svgIcon ?? '⬛'" />
        </el-tooltip>
      </div>

      <!-- 展开状态下的完整内容 -->
      <template v-if="!sidebarCollapsed">
        <!-- 搜索栏 -->
        <div class="lp-search">
          <el-input v-model="assetSearch" placeholder="搜索组件名称..." clearable size="small" :prefix-icon="Search" />
        </div>

        <!-- 分类折叠列表 -->
        <div class="lp-cat-scroll">
          <div v-for="cat in CHART_CATEGORIES" :key="cat.label" class="lp-cat-section">
            <div
              class="lp-cat-header"
              :class="{ 'lp-cat-header--open': expandedCats.has(cat.label) }"
              @click="toggleCategory(cat.label)"
            >
              <span class="lp-cat-label">{{ cat.label }}</span>
              <el-icon class="lp-cat-arrow" :class="{ 'lp-cat-arrow--open': expandedCats.has(cat.label) }">
                <ArrowRight />
              </el-icon>
            </div>
            <div v-if="expandedCats.has(cat.label)" class="lp-type-grid">
              <div
                v-for="item in cat.types"
                :key="item.type"
                class="lp-type-chip"
                :class="{ 'lp-type-chip--active': assetType === item.type }"
                :title="item.label"
                @click="assetType = item.type"
              >
                <span class="lp-type-icon" v-html="item.svgIcon" />
                <span class="lp-type-label">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分隔行 -->
        <div class="lp-divider">
          <span class="lp-divider-text">{{ assetType ? chartTypeLabel(assetType) : '全部组件' }}</span>
          <el-button v-if="assetType" link size="small" style="font-size:11px;color:#4db3ff" @click="assetType = ''">清除</el-button>
        </div>

        <!-- 组件列表 Tabs -->
        <el-tabs v-model="libraryTab" class="lp-tabs">
          <el-tab-pane label="模板库" name="templates">
            <div class="lp-asset-scroll">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="lp-asset-card"
                :class="{ 'lp-asset-card--selected': selectedTemplateId === template.id, 'lp-asset-card--builtin': template.builtIn }"
                draggable="true"
                @click="selectedTemplateId = template.id"
                @dblclick="quickAddTemplate(template)"
                @dragstart="onTemplateDragStart($event, template)"
                @dragend="onTemplateDragEnd"
              >
                <div class="lp-ac-row">
                  <span class="lp-ac-name">{{ template.name }}</span>
                  <div class="lp-ac-tags">
                    <el-tag v-if="template.builtIn" size="small" type="success" class="lp-tag">默</el-tag>
                    <el-tag size="small" effect="dark" class="lp-tag">{{ chartTypeLabel(template.chartType) }}</el-tag>
                  </div>
                </div>
                <div class="lp-ac-foot">
                  <span class="lp-ac-hint">拖入画布 · {{ getTemplateDatasetName(template) }}</span>
                  <el-button link type="primary" size="small" class="lp-ac-add" @click.stop="quickAddTemplate(template)">加入</el-button>
                </div>
              </div>
              <el-empty v-if="!filteredTemplates.length && !loading" description="暂无匹配组件" :image-size="42" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="图表源" name="charts">
            <div class="lp-asset-scroll">
              <div
                v-for="chart in filteredCharts"
                :key="chart.id"
                class="lp-asset-card"
                :class="{ 'lp-asset-card--selected': selectedChartId === chart.id }"
                draggable="true"
                @click="selectedChartId = chart.id"
                @dblclick="quickAddChart(chart)"
                @dragstart="onChartDragStart($event, chart)"
                @dragend="onChartDragEnd"
              >
                <div class="lp-ac-row">
                  <span class="lp-ac-name">{{ chart.name }}</span>
                  <el-tag size="small" effect="dark" class="lp-tag">{{ chartTypeLabel(chart.chartType) }}</el-tag>
                </div>
                <div class="lp-ac-foot">
                  <span class="lp-ac-hint">拖入画布 · {{ datasetMap.get(chart.datasetId)?.name ?? '未关联数据集' }}</span>
                  <el-button link type="primary" size="small" class="lp-ac-add" @click.stop="quickAddChart(chart)">加入</el-button>
                </div>
              </div>
              <el-empty v-if="!filteredCharts.length && !loading" description="暂无匹配图表" :image-size="42" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>

      <!-- 拖拽缩放手柄 (仅展开时可用) -->
      <div v-if="!sidebarCollapsed" class="lp-resize-handle" @mousedown.prevent="startPanelResize" />
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

    <main class="screen-main" v-loading="loading || compLoading">
      <div v-if="!currentDashboard" class="screen-empty-state">
        <el-empty description="请先创建或选择一个数据大屏" :image-size="90" />
      </div>

      <template v-else>
        <div class="screen-toolbar">
          <div class="screen-title-row">
            <div class="screen-title">{{ currentDashboard.name }}</div>
            <el-tag size="small" :type="isPublished ? 'success' : 'info'">{{ isPublished ? '已发布' : '草稿' }}</el-tag>
            <span class="screen-comp-count">{{ components.length }} 个组件</span>
          </div>
          <div class="screen-actions">
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents" title="刷新画布" />
            <el-button size="small" :icon="View" @click="openPreview" title="预览" />
            <el-button size="small" :icon="Download" @click="exportScreenJson" title="导出JSON" />
            <el-divider direction="vertical" />
            <el-button size="small" @click="openSaveAssetDialog" :disabled="!activeComponent">存为组件</el-button>
            <el-button size="small" :icon="Promotion" @click="openPublishDialog">{{ isPublished ? '发布管理' : '发布' }}</el-button>
            <el-button size="small" :icon="Share" @click="openShareDialog">分享</el-button>
            <el-button size="small" type="primary" :icon="CirclePlus" :disabled="!selectedLibraryAsset" @click="handleAddSelectedAsset">放入</el-button>
            <el-divider direction="vertical" />
            <el-button size="small" :icon="ArrowLeft" @click="$emit('back')">退出</el-button>
          </div>
        </div>

        <div class="canvas-editor">
          <!-- 画布顶部栏 -->
          <div class="canvas-topbar">
            <span class="canvas-tb-label">背景版</span>
            <div class="canvas-tb-controls">
              <el-select
                :model-value="matchedBgPreset"
                size="small"
                style="width: 130px"
                :disabled="canvasSaving"
                @change="applyBgPreset"
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
                :model-value="overlayConfig.w"
                :min="640" :max="7680" :step="10"
                size="small" controls-position="right" :disabled="canvasSaving"
                @change="onBgWidthChange"
              />
              <span class="canvas-tb-sep">×</span>
              <el-input-number
                :model-value="overlayConfig.h"
                :min="360" :max="4320" :step="10"
                size="small" controls-position="right" :disabled="canvasSaving"
                @change="onBgHeightChange"
              />
            </div>
            <span class="canvas-tb-tip">{{ components.length }} 组件 · 双击左侧加入 · 拖标题移动 · 点击背景版编辑样式</span>
            <!-- 背景版快速颜色控制 -->
            <div class="canvas-tb-overlay-ctrl">
              <span style="color:#8899aa;font-size:12px;margin-right:4px">背景:</span>
              <el-color-picker v-model="overlayConfig.bgColor" show-alpha size="small" @change="saveOverlay" />
              <el-tooltip content="不透明度" placement="bottom">
                <el-input-number
                  v-model="overlayConfig.opacity"
                  :min="0.05" :max="1" :step="0.05" :precision="2"
                  size="small" controls-position="right"
                  style="width:76px"
                  @change="saveOverlay"
                />
              </el-tooltip>
            </div>
          </div>

          <!-- 标尺 + 画布工作区 -->
          <div class="canvas-work-area">
            <div class="canvas-ruler-row">
              <div class="ruler-corner"></div>
              <div class="ruler-h-strip">
                <span v-for="m in hRulerMarks" :key="m" class="ruler-h-mark" :style="{ left: m + 'px' }">{{ m }}</span>
              </div>
            </div>
            <div class="canvas-main-row">
              <div class="ruler-v-strip">
                <span v-for="m in vRulerMarks" :key="m" class="ruler-v-mark" :style="{ top: m + 'px' }">{{ m }}</span>
              </div>
              <div class="screen-stage-scroll">

            <div
              ref="canvasRef"
              class="screen-stage"
              :class="{ 'screen-stage--drop': stageDropActive }"
              :style="{ width: `${canvasWorkWidth}px`, minHeight: `${canvasMinHeight}px`, height: `${canvasMinHeight}px` }"
              @dragover.prevent="onStageDragOver"
              @dragleave="onStageDragLeave"
              @drop.prevent="onStageDrop"
              @click.self="overlaySelected = false"
            >
              <!-- 幕布层 (z-index:1, 永远在组件下方) -->
              <div
                v-if="overlayConfig.show"
                class="canvas-curtain"
                :class="{ 'canvas-curtain--selected': overlaySelected }"
                :style="curtainStyle"
                @mousedown.stop="startCurtainDrag($event)"
                @click.stop="overlaySelected = true; activeCompId = null"
              >
                <span v-if="overlaySelected" class="curtain-badge">背景版</span>
                <span class="resize-handle resize-handle--n"  @mousedown.stop.prevent="startCurtainResize($event, 'n')" />
                <span class="resize-handle resize-handle--s"  @mousedown.stop.prevent="startCurtainResize($event, 's')" />
                <span class="resize-handle resize-handle--e"  @mousedown.stop.prevent="startCurtainResize($event, 'e')" />
                <span class="resize-handle resize-handle--w"  @mousedown.stop.prevent="startCurtainResize($event, 'w')" />
                <span class="resize-handle resize-handle--ne" @mousedown.stop.prevent="startCurtainResize($event, 'ne')" />
                <span class="resize-handle resize-handle--nw" @mousedown.stop.prevent="startCurtainResize($event, 'nw')" />
                <span class="resize-handle resize-handle--se" @mousedown.stop.prevent="startCurtainResize($event, 'se')" />
                <span class="resize-handle resize-handle--sw" @mousedown.stop.prevent="startCurtainResize($event, 'sw')" />
              </div>
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
                    <el-table
                      :data="getTableRows(component.id)"
                      height="100%"
                      size="small"
                      :stripe="getComponentConfig(component).style.tableStriped"
                      :show-header="true"
                      :header-cell-style="{
                        background: getComponentConfig(component).style.tableHeaderBg,
                        color: getComponentConfig(component).style.tableHeaderColor,
                        fontSize: getComponentConfig(component).style.tableHeaderFontSize + 'px',
                        borderBottom: `${getComponentConfig(component).style.tableBorderWidth}px solid ${getComponentConfig(component).style.tableBorderColor}`,
                      }"
                      :cell-style="{
                        color: getComponentConfig(component).style.tableFontColor,
                        fontSize: getComponentConfig(component).style.tableFontSize + 'px',
                        height: getComponentConfig(component).style.tableRowHeight + 'px',
                        borderBottom: `${getComponentConfig(component).style.tableBorderWidth}px solid ${getComponentConfig(component).style.tableBorderColor}`,
                      }"
                    >
                      <el-table-column
                        v-if="getComponentConfig(component).style.tableShowIndex"
                        type="index"
                        width="50"
                        label="#"
                      />
                      <el-table-column
                        v-for="column in getTableColumns(component.id)"
                        :key="column"
                        :prop="column"
                        :label="column"
                        min-width="120"
                        :sortable="getComponentConfig(component).style.tableEnableSort ? 'custom' : false"
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
          </div>
        </div>
      </template>
    </main>

    <aside class="screen-inspector">
      <!-- 背景版属性面板 (当背景版被选中时显示) -->
      <div v-if="overlaySelected" class="bg-inspector">
        <div class="bg-insp-head">
          <span class="bg-insp-title">背景版 属性</span>
          <el-button size="small" link @click="overlaySelected = false">✕</el-button>
        </div>

        <div class="bg-insp-section">
          <div class="bg-insp-section-title">尺寸与位置</div>
          <div class="bg-insp-grid">
            <label class="bg-insp-field">
              <span>宽度</span>
              <el-input-number v-model="overlayConfig.w" :min="640" :max="7680" :step="10" size="small" controls-position="right" @change="saveOverlay" />
            </label>
            <label class="bg-insp-field">
              <span>高度</span>
              <el-input-number v-model="overlayConfig.h" :min="360" :max="4320" :step="10" size="small" controls-position="right" @change="saveOverlay" />
            </label>
            <label class="bg-insp-field">
              <span>X 位置</span>
              <el-input-number v-model="overlayConfig.x" :min="0" size="small" controls-position="right" @change="saveOverlay" />
            </label>
            <label class="bg-insp-field">
              <span>Y 位置</span>
              <el-input-number v-model="overlayConfig.y" :min="0" size="small" controls-position="right" @change="saveOverlay" />
            </label>
          </div>
        </div>

        <div class="bg-insp-section">
          <div class="bg-insp-section-title">背景样式</div>
          <el-radio-group v-model="overlayConfig.bgType" size="small" @change="saveOverlay" style="margin-bottom:12px">
            <el-radio-button value="solid">纯色</el-radio-button>
            <el-radio-button value="gradient">渐变</el-radio-button>
            <el-radio-button value="image">图片</el-radio-button>
          </el-radio-group>

          <!-- 纯色 -->
          <template v-if="overlayConfig.bgType === 'solid'">
            <div class="bg-insp-color-row">
              <span>背景颜色</span>
              <el-color-picker v-model="overlayConfig.bgColor" show-alpha @change="saveOverlay" />
            </div>
          </template>

          <!-- 渐变 -->
          <template v-else-if="overlayConfig.bgType === 'gradient'">
            <div class="bg-gradient-preview" :style="{ background: `linear-gradient(${overlayConfig.gradientAngle}deg, ${overlayConfig.gradientStart}, ${overlayConfig.gradientEnd})` }"></div>
            <div class="bg-insp-color-row">
              <span>起始色</span>
              <el-color-picker v-model="overlayConfig.gradientStart" show-alpha @change="saveOverlay" />
            </div>
            <div class="bg-insp-color-row">
              <span>结束色</span>
              <el-color-picker v-model="overlayConfig.gradientEnd" show-alpha @change="saveOverlay" />
            </div>
            <div class="bg-insp-slider-row">
              <span>角度 {{ overlayConfig.gradientAngle }}°</span>
              <el-slider v-model="overlayConfig.gradientAngle" :min="0" :max="360" style="flex:1" @change="saveOverlay" />
            </div>
          </template>

          <!-- 图片 -->
          <template v-else-if="overlayConfig.bgType === 'image'">
            <div v-if="overlayConfig.bgImage" class="bg-image-thumb" :style="{ backgroundImage: `url(${overlayConfig.bgImage})` }"></div>
            <div class="bg-insp-btn-row">
              <el-button size="small" @click="triggerBgImageUpload" :loading="bgImgUploading">上传背景图片</el-button>
              <el-button v-if="overlayConfig.bgImage" size="small" type="danger" plain @click="overlayConfig.bgImage = ''; saveOverlay()">移除</el-button>
            </div>
            <input ref="bgImgInputRef" type="file" accept="image/*" style="display:none" @change="handleBgImageUpload" />
            <div class="bg-insp-color-row" style="margin-top:8px">
              <span>叠底颜色</span>
              <el-color-picker v-model="overlayConfig.bgColor" show-alpha @change="saveOverlay" />
            </div>
          </template>

          <div class="bg-insp-slider-row" style="margin-top:12px">
            <span>透明度 {{ Math.round(overlayConfig.opacity * 100) }}%</span>
            <el-slider v-model="overlayConfig.opacity" :min="0.05" :max="1" :step="0.05" style="flex:1" @change="saveOverlay" />
          </div>
        </div>

        <div class="bg-insp-section">
          <div class="bg-insp-section-title">说明</div>
          <p class="bg-insp-tip">背景版是大屏发布后的展示区域。组件在背景版内的部分将出现在最终大屏中，背景版外的区域仅在设计时可见。</p>
        </div>
      </div>

      <!-- 组件属性面板 -->
      <EditorComponentInspector
        v-else
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
import { ArrowLeft, ArrowRight, CirclePlus, Close, Delete, Download, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue'
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
  postProcessChartOption,
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

const makeBarComboIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/><polyline points="7,12 15,8 23,11 31,4" fill="none" stroke="currentColor" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`
const makeHeatmapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" fill="currentColor" opacity=".9" rx="1"/><rect x="13" y="4" width="7" height="7" fill="currentColor" opacity=".5" rx="1"/><rect x="22" y="4" width="7" height="7" fill="currentColor" opacity=".2" rx="1"/><rect x="31" y="4" width="7" height="7" fill="currentColor" opacity=".7" rx="1"/><rect x="4" y="13" width="7" height="7" fill="currentColor" opacity=".3" rx="1"/><rect x="13" y="13" width="7" height="7" fill="currentColor" opacity=".8" rx="1"/><rect x="22" y="13" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="31" y="13" width="7" height="7" fill="currentColor" opacity=".15" rx="1"/><rect x="4" y="22" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="13" y="22" width="7" height="7" fill="currentColor" opacity=".25" rx="1"/><rect x="22" y="22" width="7" height="7" fill="currentColor" opacity=".95" rx="1"/><rect x="31" y="22" width="7" height="7" fill="currentColor" opacity=".4" rx="1"/></svg>`
const makeMapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M5,6 L15,4 L25,8 L35,5 L35,26 L25,23 L15,27 L5,25 Z" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15,4 L15,27" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M25,8 L25,23" stroke="currentColor" stroke-width="1" opacity=".5"/><circle cx="22" cy="13" r="3" fill="currentColor" opacity=".8"/></svg>`
const makeBarWaterfallIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="6" height="12" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="12" y="16" width="6" height="6" fill="currentColor" rx="1"/><rect x="20" y="6" width="6" height="4" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="10" width="6" height="12" fill="currentColor" rx="1"/><rect x="28" y="4" width="6" height="24" fill="currentColor" opacity=".7" rx="1"/></svg>`
const makeBarProgressIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="6" width="22" height="5" fill="currentColor" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".5" rx="2.5"/><rect x="4" y="22" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="22" width="14" height="5" fill="currentColor" opacity=".8" rx="2.5"/></svg>`
const makeBarSymmetricIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="4" width="14" height="6" fill="currentColor" rx="1"/><rect x="6" y="4" width="14" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="13" width="8" height="6" fill="currentColor" rx="1"/><rect x="12" y="13" width="8" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="22" width="16" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="16" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`
const makeBarGroupStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="5" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="4" y="12" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="10" y="14" width="5" height="14" fill="currentColor" opacity=".9" rx="1"/><rect x="10" y="8" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="19" y="16" width="5" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="19" y="10" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="12" width="5" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="25" y="6" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`
const makeBarStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="6" y="8" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="18" y="12" width="8" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="18" y="4" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="30" y="18" width="8" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="30" y="10" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/></svg>`
const makeBarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="14" y="8" width="6" height="20" fill="currentColor" rx="1"/><rect x="22" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="30" y="4" width="6" height="24" fill="currentColor" rx="1"/></svg>`
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
      { type: 'table_summary', label: '汇总表', svgIcon: makeTableIcon() },
      { type: 'table_pivot', label: '透视表', svgIcon: makeTableIcon() },
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
    label: '双轴图',
    types: [
      { type: 'bar_combo', label: '柱线组合图', svgIcon: makeBarComboIcon() },
      { type: 'bar_combo_group', label: '分组柱线图', svgIcon: makeBarComboIcon() },
      { type: 'bar_combo_stack', label: '堆叠柱线图', svgIcon: makeBarComboIcon() },
    ],
  },
  {
    label: '柱/条图',
    types: [
      { type: 'bar', label: '基础柱状图', svgIcon: makeBarIcon() },
      { type: 'bar_stack', label: '堆叠柱状图', svgIcon: makeBarStackIcon() },
      { type: 'bar_percent', label: '百分比柱状图', svgIcon: makeBarStackIcon() },
      { type: 'bar_group', label: '分组柱状图', svgIcon: makeBarIcon() },
      { type: 'bar_group_stack', label: '分组堆叠', svgIcon: makeBarGroupStackIcon() },
      { type: 'bar_waterfall', label: '瀑布图', svgIcon: makeBarWaterfallIcon() },
      { type: 'bar_horizontal', label: '基础条形图', svgIcon: makeBarHIcon() },
      { type: 'bar_horizontal_stack', label: '堆叠条形图', svgIcon: makeBarHIcon() },
      { type: 'bar_horizontal_percent', label: '百分比条形图', svgIcon: makeBarHIcon() },
      { type: 'bar_horizontal_range', label: '区间条形图', svgIcon: makeBarSymmetricIcon() },
      { type: 'bar_horizontal_symmetric', label: '对称条形图', svgIcon: makeBarSymmetricIcon() },
      { type: 'bar_progress', label: '进度条', svgIcon: makeBarProgressIcon() },
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
    label: '热力图',
    types: [
      { type: 'heatmap', label: '热力图', svgIcon: makeHeatmapIcon() },
    ],
  },
  {
    label: '关系图',
    types: [
      { type: 'scatter', label: '散点图', svgIcon: makeScatterIcon() },
    ],
  },
  {
    label: '地图',
    types: [
      { type: 'map', label: '地图', svgIcon: makeMapIcon() },
    ],
  },
]

const activeCat = ref(CHART_CATEGORIES[0].label)
const activeCategoryTypes = computed(() =>
  CHART_CATEGORIES.find((c) => c.label === activeCat.value)?.types ?? []
)

// ─── 左侧面板展开/折叠 & 拖拽缩放 ────────────────────────────────────────────
const expandedCats = ref(new Set<string>(CHART_CATEGORIES.map((c) => c.label)))
const toggleCategory = (label: string) => {
  const next = new Set(expandedCats.value)
  if (next.has(label)) { next.delete(label) } else { next.add(label) }
  expandedCats.value = next
}
const selectTypeFilter = (type: string) => { assetType.value = type }

const sidebarCollapsed = ref(false)
let sidebarHoverTimer: number | null = null

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const hoverExpandSidebar = () => {
  if (!sidebarCollapsed.value) return
  if (sidebarHoverTimer !== null) { clearTimeout(sidebarHoverTimer); sidebarHoverTimer = null }
  sidebarHoverTimer = window.setTimeout(() => { sidebarCollapsed.value = false }, 200)
}

const hoverCollapseSidebar = () => {
  if (sidebarHoverTimer !== null) { clearTimeout(sidebarHoverTimer); sidebarHoverTimer = null }
  // Don't auto-collapse after hover-expand; user must click toggle or move away
}

const leftPanelWidth = ref(280)
const startPanelResize = (e: MouseEvent) => {
  const startX = e.clientX
  const startWidth = leftPanelWidth.value
  const onMove = (ev: MouseEvent) => {
    leftPanelWidth.value = Math.max(200, Math.min(520, startWidth + ev.clientX - startX))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
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
const bgImgInputRef = ref<HTMLInputElement | null>(null)
const bgImgUploading = ref(false)

const libraryTab = ref('templates')
const assetSearch = ref('')
const assetType = ref('')
const selectedChartId = ref<number | null>(null)
const selectedTemplateId = ref<number | null>(null)
const draggingTemplateId = ref<number | null>(null)
const draggingChartId = ref<number | null>(null)
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

// ─── 背景版 (Background Board) ───────────────────────────────────────────────
const overlaySelected = ref(false)
const overlayConfig = reactive({
  show: true,
  bgColor: '#081b32',
  opacity: 1,
  x: 0,
  y: 0,
  w: 1920,
  h: 1080,
  bgType: 'solid' as 'solid' | 'gradient' | 'image',
  gradientStart: '#0d1b2a',
  gradientEnd: '#1b3a5c',
  gradientAngle: 135,
  bgImage: '',
})

const curtainStyle = computed(() => {
  let background: string
  if (overlayConfig.bgType === 'gradient') {
    background = `linear-gradient(${overlayConfig.gradientAngle}deg, ${overlayConfig.gradientStart}, ${overlayConfig.gradientEnd})`
  } else if (overlayConfig.bgType === 'image' && overlayConfig.bgImage) {
    background = `url(${overlayConfig.bgImage}) center/cover no-repeat, ${overlayConfig.bgColor}`
  } else {
    background = overlayConfig.bgColor
  }
  return {
    position: 'absolute' as const,
    left: `${overlayConfig.x}px`,
    top: `${overlayConfig.y}px`,
    width: `${overlayConfig.w}px`,
    height: `${overlayConfig.h}px`,
    background,
    opacity: String(overlayConfig.opacity),
    zIndex: '1',
    pointerEvents: 'all' as const,
    overflow: 'hidden' as const,
  }
})

const loadOverlayFromConfig = () => {
  const saved = currentCanvasConfig.value.overlay
  if (saved) {
    overlayConfig.show = true // 背景版 always visible
    overlayConfig.bgColor = saved.bgColor ?? '#081b32'
    overlayConfig.opacity = saved.opacity ?? 1
    overlayConfig.x = saved.x ?? 0
    overlayConfig.y = saved.y ?? 0
    overlayConfig.w = saved.w ?? currentCanvasConfig.value.width
    overlayConfig.h = saved.h ?? currentCanvasConfig.value.height
    overlayConfig.bgType = saved.bgType ?? 'solid'
    overlayConfig.gradientStart = saved.gradientStart ?? '#0d1b2a'
    overlayConfig.gradientEnd = saved.gradientEnd ?? '#1b3a5c'
    overlayConfig.gradientAngle = saved.gradientAngle ?? 135
    overlayConfig.bgImage = saved.bgImage ?? ''
  } else {
    overlayConfig.show = true // 背景版 always visible
    overlayConfig.bgColor = '#081b32'
    overlayConfig.w = currentCanvasConfig.value.width
    overlayConfig.h = currentCanvasConfig.value.height
  }
}

const saveOverlay = async () => {
  await updateCanvasConfig({
    overlay: {
      show: overlayConfig.show,
      bgColor: overlayConfig.bgColor,
      opacity: overlayConfig.opacity,
      x: overlayConfig.x,
      y: overlayConfig.y,
      w: overlayConfig.w,
      h: overlayConfig.h,
      bgType: overlayConfig.bgType,
      gradientStart: overlayConfig.gradientStart,
      gradientEnd: overlayConfig.gradientEnd,
      gradientAngle: overlayConfig.gradientAngle,
      bgImage: overlayConfig.bgImage,
    }
  })
}

const toggleOverlay = async () => {
  // 背景版 is now always visible; this just resets position
  overlayConfig.show = true
  overlayConfig.x = 0
  overlayConfig.y = 0
  await saveOverlay()
}

// 幕布拖动
const startCurtainDrag = (e: MouseEvent) => {
  overlaySelected.value = true
  activeCompId.value = null
  const startX = e.clientX
  const startY = e.clientY
  const ox = overlayConfig.x
  const oy = overlayConfig.y
  const onMove = (ev: MouseEvent) => {
    overlayConfig.x = Math.max(0, Math.round(ox + ev.clientX - startX))
    overlayConfig.y = Math.max(0, Math.round(oy + ev.clientY - startY))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    saveOverlay()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// 幕布调整大小
const startCurtainResize = (e: MouseEvent, handle: string) => {
  overlaySelected.value = true
  activeCompId.value = null
  const startX = e.clientX
  const startY = e.clientY
  const ox = overlayConfig.x; const ow = overlayConfig.w
  const oy = overlayConfig.y; const oh = overlayConfig.h
  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (handle.includes('e')) overlayConfig.w = Math.max(100, Math.round(ow + dx))
    if (handle.includes('s')) overlayConfig.h = Math.max(60, Math.round(oh + dy))
    if (handle.includes('w')) {
      const nx = Math.min(ox + ow - 100, Math.max(0, Math.round(ox + dx)))
      overlayConfig.w = ow - (nx - ox)
      overlayConfig.x = nx
    }
    if (handle.includes('n')) {
      const ny = Math.min(oy + oh - 60, Math.max(0, Math.round(oy + dy)))
      overlayConfig.h = oh - (ny - oy)
      overlayConfig.y = ny
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    saveOverlay()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

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

// 背景版 presets + size controls
const matchedBgPreset = computed(() => SCREEN_CANVAS_PRESETS.find(
  (item) => item.width === overlayConfig.w && item.height === overlayConfig.h
)?.id ?? 'custom')

const canvasWorkWidth = computed(() => Math.max(overlayConfig.w + 400, 2400))

const canvasMinHeight = computed(() => {
  const bgBottom = overlayConfig.y + overlayConfig.h + 200
  const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0)
  return Math.max(currentCanvasConfig.value.height, bgBottom, 560, occupied)
})

const hRulerMarks = computed(() => {
  const marks: number[] = []
  for (let i = 0; i <= canvasWorkWidth.value; i += 100) marks.push(i)
  return marks
})

const vRulerMarks = computed(() => {
  const marks: number[] = []
  for (let i = 0; i <= canvasMinHeight.value; i += 100) marks.push(i)
  return marks
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

const getCardStyle = (component: DashboardComponent) => {
  const style = getComponentConfig(component).style
  const shadow = style.shadowShow
    ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
    : undefined
  return {
    left: `${component.posX}px`,
    top: `${component.posY}px`,
    width: `${component.width}px`,
    height: `${component.height}px`,
    zIndex: String(Math.max(2, component.zIndex ?? 2)),
    borderRadius: style.cardRadius != null ? `${style.cardRadius}px` : undefined,
    border: style.borderShow ? `${style.borderWidth}px solid ${style.borderColor}` : undefined,
    opacity: style.componentOpacity != null && style.componentOpacity < 1 ? String(style.componentOpacity) : undefined,
    boxShadow: shadow,
    padding: style.padding != null && style.padding > 0 ? `${style.padding}px` : undefined,
  }
}

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
  overlaySelected.value = false
  await loadComponents()
  loadOverlayFromConfig()
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
  const option = buildComponentOption(data, resolved.chart, resolved.style)
  postProcessChartOption(option, resolved.style, resolved.chart.name)
  chartInstance.setOption(option, true)
}

const isTableChart = (component: DashboardComponent) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType)

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

const applyBgPreset = async (presetId: string) => {
  if (presetId === 'custom') return
  const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId)
  if (!preset) return
  overlayConfig.w = preset.width
  overlayConfig.h = preset.height
  await saveOverlay()
}

const updateCanvasDimension = async (dimension: 'width' | 'height', value: number | undefined) => {
  const fallback = currentCanvasConfig.value[dimension]
  const normalizedValue = Math.max(dimension === 'width' ? 640 : 360, Math.round(Number(value) || fallback))
  if (normalizedValue === currentCanvasConfig.value[dimension]) return
  await updateCanvasConfig({ [dimension]: normalizedValue })
}

const onCanvasWidthChange = (value: number | null | undefined) => updateCanvasDimension('width', value ?? undefined)
const onCanvasHeightChange = (value: number | null | undefined) => updateCanvasDimension('height', value ?? undefined)

const onBgWidthChange = async (value: number | null | undefined) => {
  const w = Math.max(640, Math.round(Number(value) || overlayConfig.w))
  if (w === overlayConfig.w) return
  overlayConfig.w = w
  await saveOverlay()
}

const onBgHeightChange = async (value: number | null | undefined) => {
  const h = Math.max(360, Math.round(Number(value) || overlayConfig.h))
  if (h === overlayConfig.h) return
  overlayConfig.h = h
  await saveOverlay()
}

const triggerBgImageUpload = () => {
  bgImgInputRef.value?.click()
}

const handleBgImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  bgImgUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('bi_token') || ''
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const json = await res.json()
    if (json.data?.url) {
      overlayConfig.bgImage = json.data.url
      await saveOverlay()
      ElMessage.success('背景图片上传成功')
    } else {
      throw new Error('Upload failed')
    }
  } catch {
    ElMessage.error('图片上传失败')
  } finally {
    bgImgUploading.value = false
    input.value = ''
  }
}

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
  draggingChartId.value = null
  stageDropActive.value = true
  event.dataTransfer?.setData('text/plain', `template:${template.id}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

const onTemplateDragEnd = () => {
  draggingTemplateId.value = null
  stageDropActive.value = false
}

const onChartDragStart = (event: DragEvent, chart: Chart) => {
  selectedChartId.value = chart.id
  draggingChartId.value = chart.id
  draggingTemplateId.value = null
  stageDropActive.value = true
  event.dataTransfer?.setData('text/plain', `chart:${chart.id}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

const onChartDragEnd = () => {
  draggingChartId.value = null
  stageDropActive.value = false
}

const onStageDragOver = (event: DragEvent) => {
  if (!draggingTemplateId.value && !draggingChartId.value) return
  stageDropActive.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

const onStageDragLeave = (event: DragEvent) => {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement | null)?.contains(nextTarget)) {
    return
  }
  stageDropActive.value = false
}

const onStageDrop = async (event: DragEvent) => {
  const raw = event.dataTransfer?.getData('text/plain') ?? ''
  stageDropActive.value = false
  if (raw.startsWith('chart:') || draggingChartId.value) {
    const chartId = draggingChartId.value ?? Number(raw.replace('chart:', '') || 0)
    draggingChartId.value = null
    draggingTemplateId.value = null
    const chart = charts.value.find((item) => item.id === chartId)
    if (!chart) return
    await addChartToScreen(chart, undefined, undefined, { clientX: event.clientX, clientY: event.clientY })
    return
  }
  const templateId = draggingTemplateId.value ?? Number(raw.replace('template:', '') || raw || 0)
  draggingTemplateId.value = null
  const template = templates.value.find((item) => item.id === templateId)
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.screen-inspector {
  min-width: 0;
}

/* ─── 背景版 属性面板 ─────────────────────────────────────────────────── */
.bg-inspector {
  height: 100%;
  overflow-y: auto;
  padding: 0 0 24px;
  color: #c8d8ea;
  font-size: 13px;
}

.bg-insp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(77, 155, 219, 0.2);
  margin-bottom: 4px;
}

.bg-insp-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0ecff;
}

.bg-insp-section {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(77, 155, 219, 0.1);
}

.bg-insp-section-title {
  font-size: 12px;
  color: #7ba7c8;
  margin-bottom: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bg-insp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.bg-insp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #8ab0cc;
}

.bg-insp-field :deep(.el-input-number) {
  width: 100%;
}

.bg-insp-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #9bbbd4;
}

.bg-insp-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #9bbbd4;
  min-width: 0;
}

.bg-gradient-preview {
  width: 100%;
  height: 36px;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid rgba(255,255,255,0.1);
}

.bg-image-thumb {
  width: 100%;
  height: 80px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.12);
}

.bg-insp-btn-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.bg-insp-tip {
  font-size: 12px;
  color: #607080;
  line-height: 1.6;
  margin: 0;
}



.screen-empty-state {
  min-height: 100%;
}

.screen-toolbar,
.selected-bar {
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
  padding: 14px 18px;
}

.screen-title {
  font-size: 18px;
  font-weight: 700;
  color: #163050;
}

.screen-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.screen-comp-count {
  font-size: 12px;
  color: #91aac8;
  margin-left: 4px;
}

.screen-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
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

/* ─── 画布编辑器 ────────────────────────────────────────────────────────── */
.canvas-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #111c2a;
  overflow: hidden;
}

.canvas-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 14px;
  background: #0d1622;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.canvas-tb-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.canvas-tb-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.canvas-tb-controls :deep(.el-input-number) {
  width: 88px;
}

.canvas-tb-controls :deep(.el-input__wrapper),
.canvas-tb-controls :deep(.el-select .el-input__wrapper) {
  background: rgba(255,255,255,0.07);
  box-shadow: none;
  border: 1px solid rgba(255,255,255,0.1);
}

.canvas-tb-controls :deep(.el-input__inner),
.canvas-tb-controls :deep(.el-select-dropdown__item) {
  color: rgba(255,255,255,0.8);
}

.canvas-tb-sep {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
}

.canvas-tb-tip {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
}

.canvas-tb-overlay-ctrl {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ─── 幕布 (Canvas Curtain Overlay) ─────────────────────────────── */
.canvas-curtain {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed transparent;
  cursor: move;
  transition: border-color 0.15s;
}

.canvas-curtain--selected {
  border-color: rgba(255, 210, 80, 0.8);
  outline: 1px solid rgba(255, 210, 80, 0.3);
}

.curtain-badge {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 210, 80, 0.85);
  color: #1a1200;
  font-weight: 600;
  pointer-events: none;
  z-index: 5;
}

/* 标尺区域 */
.canvas-work-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.canvas-ruler-row {
  display: flex;
  flex-shrink: 0;
  height: 20px;
}

.ruler-corner {
  width: 28px;
  height: 20px;
  flex-shrink: 0;
  background: #0a1420;
  border-right: 1px solid rgba(255,255,255,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.ruler-h-strip {
  height: 20px;
  flex: 1;
  background: #0a1420;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  cursor: default;
}

.ruler-h-mark {
  position: absolute;
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  top: 3px;
  transform: translateX(-50%);
  user-select: none;
  white-space: nowrap;
}

.ruler-h-mark::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 1px;
  height: 5px;
  background: rgba(255,255,255,0.2);
}

.canvas-main-row {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.ruler-v-strip {
  width: 28px;
  flex-shrink: 0;
  background: #0a1420;
  border-right: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  cursor: default;
}

.ruler-v-mark {
  position: absolute;
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  left: 0;
  width: 28px;
  text-align: center;
  transform: translateY(-50%);
  user-select: none;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  line-height: 1;
}

.ruler-v-mark::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  height: 1px;
  width: 5px;
  background: rgba(255,255,255,0.2);
  transform: translateY(-50%);
}

.screen-stage-scroll {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #141e2c;
}

.screen-stage-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.screen-stage-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
.screen-stage-scroll::-webkit-scrollbar-track { background: transparent; }

.screen-stage {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid rgba(77,155,219,0.2);
  background-color: #081b32;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(20, 116, 214, 0.14), transparent 32%),
    radial-gradient(circle at 80% 0%, rgba(66, 185, 131, 0.10), transparent 24%),
    linear-gradient(rgba(129, 170, 215, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 170, 215, 0.06) 1px, transparent 1px);
  background-size: auto, auto, 24px 24px, 24px 24px;
  flex-shrink: 0;
  transition: border-color 0.18s ease;
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
  .stage-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .screen-actions,
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
  grid-template-columns: v-bind("sidebarCollapsed ? '60px' : leftPanelWidth + 'px'") 1fr 300px;
  grid-template-rows: 1fr;
  gap: 0;
}

.screen-root--editor .screen-toolbar {
  background: #0d1622;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  border-radius: 0;
  box-shadow: none;
  margin: 0;
  padding: 8px 14px;
  flex-shrink: 0;
}

.screen-root--editor .screen-title {
  color: rgba(255,255,255,0.85);
}

.screen-root--editor .screen-comp-count {
  color: rgba(255,255,255,0.35);
}

.screen-root--editor .screen-actions :deep(.el-button) {
  --el-button-bg-color: rgba(255,255,255,0.07);
  --el-button-border-color: rgba(255,255,255,0.12);
  --el-button-text-color: rgba(255,255,255,0.75);
  --el-button-hover-bg-color: rgba(255,255,255,0.12);
}

.screen-root--editor .screen-actions :deep(.el-button--primary) {
  --el-button-bg-color: #2a6fba;
  --el-button-border-color: #2a6fba;
  --el-button-text-color: #fff;
}

.screen-root--editor .screen-actions :deep(.el-divider--vertical) {
  border-color: rgba(255,255,255,0.15);
}

/* ─── 左侧综合面板 ───────────────────────────────────────────────────────────── */
.screen-left-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #0d1b2e;
  border-right: 1px solid rgba(255,255,255,0.07);
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  user-select: none;
  transition: width 0.22s ease;
}

.screen-left-panel--collapsed {
  width: 60px !important;
  min-width: 60px;
}

.lp-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.lp-toggle-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255,255,255,0.07);
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.lp-toggle-btn:hover {
  background: rgba(255,255,255,0.13);
}

.lp-toggle-icon {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  line-height: 1;
}

/* 折叠状态图标菜单 */
.lp-icon-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.lp-icon-item {
  width: 40px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: background 0.15s, color 0.15s;
  overflow: hidden;
}

.lp-icon-item:hover,
.lp-icon-item.active {
  background: rgba(77,155,255,0.15);
  color: rgba(77,155,255,0.9);
}

.lp-back-btn {
  flex-shrink: 0;
}

.lp-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-search {
  padding: 8px 10px 6px;
  flex-shrink: 0;
}

.lp-search :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.06);
  box-shadow: none;
  border-radius: 8px;
}

.lp-search :deep(.el-input__inner) {
  color: rgba(255,255,255,0.85);
  font-size: 12px;
}

.lp-search :deep(.el-input__inner::placeholder) {
  color: rgba(255,255,255,0.3);
}

.lp-search :deep(.el-input__prefix .el-icon) {
  color: rgba(255,255,255,0.35);
}

/* 分类折叠区 */
.lp-cat-scroll {
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 44vh;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.lp-cat-section {
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.lp-cat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.lp-cat-header:hover {
  background: rgba(255,255,255,0.04);
}

.lp-cat-header--open {
  background: rgba(77,179,255,0.07);
}

.lp-cat-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  letter-spacing: 0.02em;
}

.lp-cat-header--open .lp-cat-label {
  color: #4db3ff;
}

.lp-cat-arrow {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  transition: transform 0.2s;
}

.lp-cat-arrow--open {
  transform: rotate(90deg);
  color: #4db3ff;
}

.lp-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px 8px 8px;
}

.lp-type-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 4px 5px;
  border-radius: 7px;
  cursor: pointer;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.03);
  transition: all 0.15s;
  min-width: 0;
}

.lp-type-chip:hover {
  background: rgba(77,179,255,0.12);
  border-color: rgba(77,179,255,0.28);
}

.lp-type-chip--active {
  background: rgba(77,179,255,0.2);
  border-color: rgba(77,179,255,0.55);
}

.lp-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  color: #4db3ff;
  flex-shrink: 0;
}

.lp-type-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.lp-type-label {
  font-size: 10px;
  color: rgba(255,255,255,0.62);
  text-align: center;
  line-height: 1.2;
  word-break: break-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分隔行 */
.lp-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 4px;
  flex-shrink: 0;
}

.lp-divider-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.38);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 组件列表 Tabs */
.lp-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 8px 4px;
}

.lp-tabs :deep(.el-tabs__header) {
  margin-bottom: 4px;
}

.lp-tabs :deep(.el-tabs__nav-wrap::after) {
  background: rgba(255,255,255,0.07);
}

.lp-tabs :deep(.el-tabs__item) {
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  padding: 0 10px;
  height: 30px;
  line-height: 30px;
}

.lp-tabs :deep(.el-tabs__item.is-active) {
  color: #4db3ff;
}

.lp-tabs :deep(.el-tabs__active-bar) {
  background: #4db3ff;
}

.lp-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  height: calc(100% - 38px);
}

.lp-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.lp-asset-scroll {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 2px 2px 8px;
}

.lp-asset-card {
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.lp-asset-card:hover {
  border-color: rgba(77,179,255,0.3);
  background: rgba(77,179,255,0.06);
}

.lp-asset-card--selected {
  border-color: rgba(77,179,255,0.6);
  background: rgba(77,179,255,0.12);
}

.lp-asset-card--builtin {
  border-color: rgba(52,187,131,0.3);
  background: rgba(52,187,131,0.05);
}

.lp-asset-card--builtin:hover {
  border-color: rgba(52,187,131,0.5);
  background: rgba(52,187,131,0.1);
}

.lp-ac-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.lp-ac-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-ac-tags {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.lp-tag {
  font-size: 10px !important;
  padding: 0 4px !important;
  height: 18px !important;
  line-height: 18px !important;
  border-radius: 3px !important;
}

.lp-ac-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.lp-ac-hint {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.lp-ac-add {
  font-size: 11px !important;
  flex-shrink: 0;
}

/* 拖拽缩放手柄 */
.lp-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  z-index: 10;
}

.lp-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 1px;
  transform: translateY(-50%);
  width: 3px;
  height: 40px;
  border-radius: 2px;
  background: rgba(255,255,255,0.08);
  transition: background 0.15s, height 0.15s;
}

.lp-resize-handle:hover::after {
  background: rgba(77,179,255,0.6);
  height: 60px;
}
</style>