<template>
  <div class="screen-root" :class="{ 'screen-root--editor': screenId, 'screen-root--quiet': screenId }">
    <!-- 编辑器模式：可折叠左侧综合面板 -->
    <aside
      v-if="screenId"
      ref="leftPanelRef"
      class="screen-left-panel"
      :class="{ 'screen-left-panel--collapsed': effectiveSidebarCollapsed }"
      :style="effectiveSidebarCollapsed ? {} : { width: leftPanelWidth + 'px' }"
      @mouseenter="hoverExpandSidebar"
      @mouseleave="hoverCollapseSidebar"
    >
      <!-- 头部 -->
      <div class="lp-head">
        <button class="lp-toggle-btn" @click.stop="toggleSidebar" :title="effectiveSidebarCollapsed ? '展开面板' : '收起面板'">
          <span class="lp-toggle-icon">☰</span>
        </button>
        <template v-if="!effectiveSidebarCollapsed">
          <div class="lp-head-main">
            <div class="lp-overline">BI SCREEN STUDIO</div>
            <span class="lp-title" :title="currentDashboard?.name ?? '编辑大屏'">{{ currentDashboard?.name ?? '编辑大屏' }}</span>
          </div>
          <div class="lp-head-badges">
            <span class="lp-head-pill">{{ templateAssets.length }} 资产</span>
            <span class="lp-head-pill lp-head-pill--accent">{{ components.length }} 组件</span>
          </div>
        </template>
      </div>

      <!-- 折叠状态下的图标快捷菜单 -->
      <div v-if="effectiveSidebarCollapsed" class="lp-icon-menu">
        <el-tooltip content="组件" placement="right">
          <div class="lp-icon-item" @click="sidebarCollapsed = false">
            <el-icon><Grid /></el-icon>
          </div>
        </el-tooltip>
        <el-tooltip content="图层" placement="right">
          <div class="lp-icon-item" @click="sidebarCollapsed = false">
            <el-icon><Operation /></el-icon>
          </div>
        </el-tooltip>
      </div>

      <!-- 展开状态下的完整内容 -->
      <div v-if="!effectiveSidebarCollapsed" class="lp-shell lp-shell--dual">
        <div class="lp-pane lp-pane--components">
          <div class="lp-pane-head">
            <div class="lp-pane-title">组件</div>
            <div class="lp-pane-subtitle">图表组件、装饰组件、文字组件和矢量图标组件都在这里</div>
          </div>

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
                  draggable="true"
                  @click="assetType = item.type"
                  @dragstart="onTypeChipDragStart($event, item.type)"
                  @dragend="onTypeChipDragEnd"
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

          <div class="lp-library-panel">
            <div class="lp-library-head">
              <div>
                <div class="lp-library-kicker">模板库</div>
                <div class="lp-library-note">列表只展示简略信息，悬停即可预览，双击或拖入画布使用。</div>
              </div>
            </div>

            <div class="lp-library-body">
              <div class="lp-asset-scroll" @scroll="hideTemplatePreview">
                <div
                  v-for="template in filteredTemplates"
                  :key="template.id"
                  class="lp-asset-card lp-asset-card--compact"
                  :class="{ 'lp-asset-card--selected': selectedTemplateId === template.id, 'lp-asset-card--builtin': template.builtIn }"
                  draggable="true"
                  @click="selectedTemplateId = template.id"
                  @mouseenter="showTemplatePreview($event, template.id)"
                  @mouseleave="scheduleHideTemplatePreview"
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
                  <div class="lp-ac-subline">
                    <span class="lp-ac-size">{{ getTemplateLayoutText(template) }}</span>
                    <span class="lp-ac-lite-badge">{{ getAssetBadgeText(template.chartType) }}</span>
                  </div>
                </div>

                <el-empty v-if="!filteredTemplates.length && !loading" description="暂无匹配组件" :image-size="42" />
              </div>
            </div>
          </div>
        </div>

        <div class="lp-pane lp-pane--layers">
          <div class="lp-pane-head">
            <div class="lp-pane-title">图层</div>
            <div class="lp-pane-subtitle">按层级查看背景版与组件顺序</div>
          </div>

          <div class="lp-layer-order-tip">图层顺序从上到下显示，点击可直接选中。</div>

          <div class="lp-layer-scroll">
            <div class="lp-layer-item" :class="{ 'lp-layer-item--active': overlaySelected }" @click="selectOverlayLayer">
              <div class="lp-layer-item-main">
                <span class="lp-layer-name">背景版</span>
                <span class="lp-layer-meta">固定底层 · {{ overlayConfig.w }} × {{ overlayConfig.h }}</span>
              </div>
              <span class="lp-layer-badge">背景</span>
            </div>

            <div
              v-for="(component, layerIdx) in layeredComponents"
              :key="component.id"
              class="lp-layer-item"
              :class="{ 'lp-layer-item--active': isComponentSelected(component.id), 'lp-layer-item--drag-over': layerDragOverIdx === layerIdx }"
              draggable="true"
              @dragstart="onLayerDragStart($event, layerIdx)"
              @dragover.prevent="onLayerDragOver($event, layerIdx)"
              @dragleave="onLayerDragLeave"
              @drop.prevent="onLayerDrop($event, layerIdx)"
              @dragend="onLayerDragEnd"
              @click="selectLayerComponent(component)"
              @contextmenu.prevent.stop="openComponentContextMenu($event, component)"
            >
              <div class="lp-layer-item-main">
                <span class="lp-layer-drag-handle">⠿</span>
                <span class="lp-layer-name">{{ getComponentDisplayName(component) }}</span>
                <span class="lp-layer-meta">{{ chartTypeLabel(getComponentChartConfig(component).chartType) }} · {{ getComponentStatusText(component) }} · Z{{ component.zIndex ?? 0 }}</span>
              </div>
              <div class="lp-layer-actions">
                <el-button link size="small" @click.stop="bringSpecificComponentToFront(component)">置顶</el-button>
              </div>
            </div>

            <el-empty v-if="!components.length" description="当前大屏还没有组件" :image-size="48" />
          </div>
        </div>
      </div>

      <div
        v-if="!effectiveSidebarCollapsed && hoveredTemplate"
        class="lp-preview-float"
        :style="templatePreviewStyle"
        @mouseenter="cancelHideTemplatePreview"
        @mouseleave="hideTemplatePreview"
      >
        <div class="lp-hover-preview">
          <div class="lp-preview-status-row">
            <span class="lp-preview-state">悬停预览</span>
            <el-button link type="primary" size="small" @click.stop="quickAddTemplate(hoveredTemplate)">加入画布</el-button>
          </div>
          <div class="lp-hover-head">
            <div>
              <div class="lp-hover-title">{{ hoveredTemplate.name }}</div>
              <div class="lp-hover-subtitle">{{ chartTypeLabel(hoveredTemplate.chartType) }} · {{ getTemplateLayoutText(hoveredTemplate) }}</div>
            </div>
            <span class="lp-hover-pill">{{ getAssetBadgeText(hoveredTemplate.chartType) }}</span>
          </div>

          <div class="lp-hover-stage">
            <ComponentStaticPreview
              v-if="isTemplateStaticAsset(hoveredTemplate)"
              :chart-type="getTemplateAssetConfig(hoveredTemplate).chart.chartType"
              :chart-config="getTemplateAssetConfig(hoveredTemplate).chart"
              :show-title="false"
              dark
            />
            <ComponentTemplatePreview
              v-else
              :chart-config="getTemplateAssetConfig(hoveredTemplate).chart"
              :style-config="getTemplateAssetConfig(hoveredTemplate).style"
            />
          </div>

          <div class="lp-hover-meta">{{ hoveredTemplate.description || summarizeTemplateConfig(hoveredTemplate.configJson) || '拖入画布后继续配置样式和交互。' }}</div>
        </div>
      </div>

      <!-- 拖拽缩放手柄 (仅展开时可用) -->
      <div v-if="!effectiveSidebarCollapsed" class="lp-resize-handle" @mousedown.prevent="startPanelResize" />
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
            <div class="screen-item-cover" :class="{ 'screen-item-cover--empty': !getDashboardCoverUrl(dashboard) }">
              <img v-if="getDashboardCoverUrl(dashboard)" :src="getDashboardCoverUrl(dashboard)" alt="" />
              <span v-else>封面</span>
            </div>
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
                <div class="asset-card-meta">数据集: {{ getChartDatasetName(chart.datasetId, chart.chartType) }}</div>
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
            <div v-if="currentCoverConfig.url" class="screen-cover-pill">
              <img :src="currentCoverConfig.url" alt="" />
              <span>封面已生成</span>
            </div>
          </div>
          <div class="screen-actions">
            <el-button size="small" :icon="Refresh" :loading="compLoading" @click="loadComponents" title="刷新画布" />
            <el-button size="small" :icon="PictureFilled" :loading="coverSaving" @click="captureScreenCover">{{ currentCoverConfig.url ? '更新封面' : '生成封面' }}</el-button>
            <el-button size="small" :disabled="!canUndo" :loading="undoApplying" @click="undoLastChange">撤销</el-button>
            <el-button size="small" :icon="View" @click="openPreview" title="预览" />
            <el-button size="small" :icon="Download" @click="exportScreenJson" title="导出JSON" />
            <el-divider direction="vertical" />
            <el-button size="small" @click="openSaveAssetDialog" :disabled="!activeComponent">存为组件</el-button>
            <el-button size="small" :icon="Promotion" @click="openPublishDialog">{{ isPublished ? '发布管理' : '发布' }}</el-button>
            <el-button size="small" :icon="Share" @click="openShareDialog">分享</el-button>
            <el-button size="small" type="primary" :icon="CirclePlus" :disabled="!selectedLibraryAsset" @click="handleAddSelectedAsset">放入</el-button>
            <el-button size="small" :icon="inspectorCollapsed ? ArrowLeft : ArrowRight" @click="toggleInspector">
              {{ inspectorCollapsed ? '展开属性' : '收起属性' }}
            </el-button>
            <el-divider direction="vertical" />
            <el-button size="small" :icon="ArrowLeft" @click="$emit('back')">退出</el-button>
          </div>
        </div>

        <div class="canvas-editor">
          <!-- 画布顶部栏 -->
          <div class="canvas-topbar">
            <span class="canvas-tb-label">背景版</span>
            <div class="canvas-tb-overlay-ctrl">
              <div class="canvas-tb-zoom">
                <el-button text size="small" @click="zoomOut">-</el-button>
                <span class="zoom-label" @click="zoomFit">{{ Math.round(canvasScale * 100) }}%</span>
                <el-button text size="small" @click="zoomIn">+</el-button>
              </div>
              <el-button text size="small" @click="zoomFit">适配屏幕</el-button>
              <el-button text size="small" @click="zoomReset">100%</el-button>
            </div>
          </div>
          <div class="canvas-ruler-row">
            <div class="ruler-corner" />
            <div class="ruler-h-strip">
              <span v-for="mark in hRulerMarks" :key="mark" class="ruler-h-mark" :style="getHRulerMarkStyle(mark)">{{ mark }}</span>
            </div>
          </div>
          <div class="canvas-main-row">
              <div class="ruler-v-strip">
                <span v-for="mark in vRulerMarks" :key="mark" class="ruler-v-mark" :style="getVRulerMarkStyle(mark)">{{ mark }}</span>
              </div>
              <div ref="stageScrollRef" class="screen-stage-scroll" @scroll="handleStageScroll">

            <div
              ref="canvasRef"
              class="screen-stage"
              :class="{ 'screen-stage--drop': stageDropActive, 'screen-stage--capturing': capturingCover }"
              :style="{ width: `${canvasWorkWidth}px`, minHeight: `${canvasMinHeight}px`, height: `${canvasMinHeight}px`, transform: `scale(${canvasScale})`, transformOrigin: '0 0' }"
              @dragover.prevent="onStageDragOver"
              @dragleave="onStageDragLeave"
              @drop.prevent="onStageDrop"
              @mousedown.self="startStageMarquee($event)"
              @contextmenu.prevent="hideComponentContextMenu"
            >
              <!-- 幕布层 (z-index:1, 永远在组件下方) -->
              <div
                v-if="overlayConfig.show"
                class="canvas-curtain"
                :class="{ 'canvas-curtain--selected': overlaySelected }"
                :style="curtainStyle"
                @mousedown.stop="handleCurtainPointerDown($event)"
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
                :ref="(el) => setStageCardRef(el as HTMLElement | null, component.id)"
                class="stage-card"
                :class="{
                  active: activeCompId === component.id,
                  'stage-card--selected': isComponentSelected(component.id),
                  'stage-card--decoration': isDecorationComponent(component),
                  'stage-card--static': isStaticWidget(component) && !isDecorationComponent(component),
                  'stage-card--data': !isStaticWidget(component),
                }"
                :style="getCardStyle(component)"
                @mousedown="handleStageCardMouseDown($event, component)"
                @contextmenu.prevent.stop="openComponentContextMenu($event, component)"
              >
                <div class="stage-card-header" @mousedown.stop.prevent="startDrag($event, component)">
                  <div class="stage-card-header-main">
                    <span class="stage-card-meta">{{ chartTypeLabel(getComponentChartConfig(component).chartType) }} · {{ getComponentStatusText(component) }}</span>
                  </div>
                  <el-button class="remove-btn" text size="small" @click.stop="confirmRemoveComponent(component)">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>

                <div
                  class="stage-card-body"
                  :class="{
                    'stage-card-body--decoration': isDecorationComponent(component),
                    'stage-card-body--static': isStaticWidget(component) && !isDecorationComponent(component),
                    'stage-card-body--data': !isStaticWidget(component),
                  }"
                >
                  <div v-if="isFilterButtonChart(component)" class="filter-button-wrapper">
                    <el-button size="small" type="primary" style="width:100%;height:100%">
                      <el-icon style="margin-right:4px"><Filter /></el-icon>
                      筛选
                    </el-button>
                  </div>
                  <div v-else-if="shouldDeferComponentPreview(component)" class="chart-placeholder">
                    滚动后加载
                  </div>
                  <div v-else-if="isComponentPreviewLoading(component)" class="chart-placeholder">
                    加载中
                  </div>
                  <div v-else-if="isTableChart(component)" class="table-wrapper">
                    <el-table
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
                        v-for="column in getTableColumns(component)"
                        :key="column"
                        :prop="column"
                        :label="column"
                        min-width="120"
                        :sortable="getComponentConfig(component).style.tableEnableSort ? 'custom' : false"
                      />
                    </el-table>
                  </div>
                  <ComponentStaticPreview
                    v-else-if="isStaticWidget(component)"
                    :chart-type="getComponentChartConfig(component).chartType"
                    :chart-config="getComponentChartConfig(component)"
                    :style-config="getComponentConfig(component).style"
                    :data="componentDataMap.get(component.id) ?? null"
                    :show-title="getComponentConfig(component).style.showTitle"
                    dark
                  />
                  <div v-else-if="showNoField(component)" class="chart-placeholder warning">
                    待配置
                  </div>
                  <ComponentDataFallback
                    v-else-if="!isRenderableChart(component)"
                    :chart-type="getComponentChartConfig(component).chartType"
                    :chart-config="getComponentChartConfig(component)"
                    :data="componentDataMap.get(component.id) ?? null"
                    dark
                  />
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

              <div v-if="marqueeSelection.visible" class="stage-marquee" :style="marqueeStyle" />

              <template v-if="interactionGuideLines.vertical.length || interactionGuideLines.horizontal.length">
                <span
                  v-for="line in interactionGuideLines.vertical"
                  :key="`v-${line}`"
                  class="stage-guide stage-guide--vertical"
                  :style="{ left: `${line}px` }"
                />
                <span
                  v-for="line in interactionGuideLines.horizontal"
                  :key="`h-${line}`"
                  class="stage-guide stage-guide--horizontal"
                  :style="{ top: `${line}px` }"
                />
              </template>

              <div v-if="!components.length" class="stage-empty">
                <el-empty description="请从左侧双击或拖入一个组件资产" :image-size="80" />
              </div>
            </div>
              </div>
            </div>
          </div>
      </template>
    </main>

    <aside v-if="!inspectorCollapsed" class="screen-inspector">
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

    <teleport to="body">
      <div
        v-if="componentContextMenu.visible"
        class="screen-context-menu"
        :style="{ left: `${componentContextMenu.x}px`, top: `${componentContextMenu.y}px` }"
        @mousedown.stop
        @contextmenu.prevent
      >
        <button type="button" class="screen-context-menu__item" @click="bringSelectedComponentsToFront">置顶</button>
        <button type="button" class="screen-context-menu__item" @click="sendSelectedComponentsToBack">置底</button>
        <button type="button" class="screen-context-menu__item" @click="moveSelectedComponentsForward">上移一层</button>
        <button type="button" class="screen-context-menu__item" @click="moveSelectedComponentsBackward">下移一层</button>
        <div class="screen-context-menu__divider" />
        <button type="button" class="screen-context-menu__item" @click="duplicateSelectedComponents">复制</button>
        <button type="button" class="screen-context-menu__item screen-context-menu__item--danger" @click="removeSelectedComponents">删除</button>
      </div>
    </teleport>

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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, triggerRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, CirclePlus, Close, Delete, Download, Filter, Grid, Operation, PictureFilled, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue'
import ComponentDataFallback from './ComponentDataFallback.vue'
import ComponentStaticPreview from './ComponentStaticPreview.vue'
import ComponentTemplatePreview from './ComponentTemplatePreview.vue'
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
  getConfiguredTableColumns,
  getMissingChartFields,
  isCanvasRenderableChartType,
  isDecorationChartType,
  isStaticWidgetChartType,
  materializeChartData,
  mergeComponentRequestFilters,
  normalizeComponentAssetConfig,
  normalizeComponentConfig,
  postProcessChartOption,
} from '../utils/component-config'
import { echarts, type ECharts } from '../utils/echarts'
import {
  buildPublishedLink,
  buildReportConfig,
  normalizeCanvasConfig,
  normalizeCoverConfig,
  normalizePublishConfig,
  parseReportConfig,
  SCREEN_CANVAS_PRESETS,
  type ReportCanvasConfig,
} from '../utils/report-config'
import { uploadImage } from '../api/upload'

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
interface StaticAssetSeed {
  type: string
  name: string
  description: string
  layout: { width: number; height: number }
}

const makeBarComboIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/><polyline points="7,12 15,8 23,11 31,4" fill="none" stroke="currentColor" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`
const makeHeatmapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" fill="currentColor" opacity=".9" rx="1"/><rect x="13" y="4" width="7" height="7" fill="currentColor" opacity=".5" rx="1"/><rect x="22" y="4" width="7" height="7" fill="currentColor" opacity=".2" rx="1"/><rect x="31" y="4" width="7" height="7" fill="currentColor" opacity=".7" rx="1"/><rect x="4" y="13" width="7" height="7" fill="currentColor" opacity=".3" rx="1"/><rect x="13" y="13" width="7" height="7" fill="currentColor" opacity=".8" rx="1"/><rect x="22" y="13" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="31" y="13" width="7" height="7" fill="currentColor" opacity=".15" rx="1"/><rect x="4" y="22" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="13" y="22" width="7" height="7" fill="currentColor" opacity=".25" rx="1"/><rect x="22" y="22" width="7" height="7" fill="currentColor" opacity=".95" rx="1"/><rect x="31" y="22" width="7" height="7" fill="currentColor" opacity=".4" rx="1"/></svg>`
const makeMapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M5,6 L15,4 L25,8 L35,5 L35,26 L25,23 L15,27 L5,25 Z" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15,4 L15,27" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M25,8 L25,23" stroke="currentColor" stroke-width="1" opacity=".5"/><circle cx="22" cy="13" r="3" fill="currentColor" opacity=".8"/></svg>`
const makeFilterButtonIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="32" height="16" rx="4" fill="currentColor" opacity=".2" stroke="currentColor" stroke-width="1.2"/><path d="M10,14 L14,18 L14,22" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10,14 L18,14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="28" cy="18" r="1.5" fill="currentColor"/><circle cx="23" cy="18" r="1.5" fill="currentColor"/><circle cx="33" cy="18" r="1.5" fill="currentColor" opacity=".4"/></svg>`
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
const makeDecorFrameIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 6H14V8H8V14H6V6ZM26 6H34V14H32V8H26V6ZM6 18H8V24H14V26H6V18ZM32 18H34V26H26V24H32V18Z" fill="currentColor"/><rect x="11" y="11" width="18" height="10" rx="2" fill="currentColor" opacity=".18"/></svg>`
const makeDecorTitlePlateIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 16H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M28 16H36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><rect x="12" y="10" width="16" height="12" rx="6" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.4"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="24" cy="16" r="1.5" fill="currentColor"/></svg>`
const makeDecorDividerIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 16H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M25 16H36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><circle cx="20" cy="16" r="4" fill="currentColor" opacity=".2" stroke="currentColor" stroke-width="1.5"/></svg>`
const makeDecorTargetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".68"/><circle cx="20" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><path d="M20 4V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M20 22V28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 16H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M26 16H32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
const makeDecorScanIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="30" height="22" rx="4" fill="currentColor" opacity=".08" stroke="currentColor" stroke-width="1.4"/><path d="M9 12H31" stroke="currentColor" stroke-width="2" opacity=".72"/><path d="M9 18H31" stroke="currentColor" stroke-width="1" opacity=".32"/><path d="M9 24H23" stroke="currentColor" stroke-width="1" opacity=".22"/></svg>`
const makeDecorHexIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M15 5H25L32 16L25 27H15L8 16Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.4"/><path d="M18 11H22L25 16L22 21H18L15 16Z" fill="currentColor" opacity=".55"/></svg>`
const makeDecorStreamIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="30" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"/><path d="M8 10H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 22H32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg>`
const makeDecorPulseIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".35"/><rect x="11" y="11" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".7"/></svg>`
const makeDecorBracketIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M7 11V6H14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M33 11V6H26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 21V26H14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M33 21V26H26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
const makeDecorCircuitIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 8H14V14H26V8H34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 24H18V18H30V24H34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="14" r="2" fill="currentColor"/><circle cx="18" cy="18" r="2" fill="currentColor"/><circle cx="26" cy="14" r="2" fill="currentColor"/><circle cx="30" cy="18" r="2" fill="currentColor"/></svg>`
const makeTextBlockIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="28" height="22" rx="4" fill="currentColor" opacity=".12"/><rect x="10" y="10" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="10" y="16" width="16" height="3" rx="1.5" fill="currentColor" opacity=".72"/><rect x="10" y="22" width="12" height="3" rx="1.5" fill="currentColor" opacity=".48"/></svg>`
const makeMetricWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="24" rx="5" fill="currentColor" opacity=".12"/><path d="M10 21V11H13.4L16.5 18.2L19.6 11H23V21H20.6V15.4L18.4 21H14.6L12.4 15.4V21H10Z" fill="currentColor"/><rect x="26" y="10" width="6" height="12" rx="2" fill="currentColor" opacity=".84"/></svg>`
const makeListWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="9" cy="16" r="2" fill="currentColor" opacity=".72"/><circle cx="9" cy="22" r="2" fill="currentColor" opacity=".48"/><rect x="14" y="8.5" width="18" height="3" rx="1.5" fill="currentColor"/><rect x="14" y="14.5" width="15" height="3" rx="1.5" fill="currentColor" opacity=".72"/><rect x="14" y="20.5" width="12" height="3" rx="1.5" fill="currentColor" opacity=".48"/></svg>`
const makeClockWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 10V16L24 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="4" width="4" height="4" rx="1" fill="currentColor" opacity=".6"/></svg>`
const makeQrWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="2" height="2" fill="currentColor"/><rect x="26" y="6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="29" y="9" width="2" height="2" fill="currentColor"/><rect x="6" y="18" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="21" width="2" height="2" fill="currentColor"/><rect x="24" y="18" width="3" height="3" fill="currentColor"/><rect x="29" y="18" width="5" height="3" fill="currentColor" opacity=".7"/><rect x="29" y="23" width="5" height="3" fill="currentColor" opacity=".45"/></svg>`
const makeLinkWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M14 20L10.5 23.5C8.6 25.4 8.6 28.6 10.5 30.5C12.4 32.4 15.6 32.4 17.5 30.5L21 27" transform="translate(0 -8)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M26 12L29.5 8.5C31.4 6.6 34.6 6.6 36.5 8.5C38.4 10.4 38.4 13.6 36.5 15.5L33 19" transform="translate(-8 0)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M15 20L25 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`
const makeFrameWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="32" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="5" width="32" height="5" rx="4" fill="currentColor" opacity=".2"/><circle cx="9" cy="7.5" r="1.2" fill="currentColor"/><circle cx="13" cy="7.5" r="1.2" fill="currentColor" opacity=".72"/><circle cx="17" cy="7.5" r="1.2" fill="currentColor" opacity=".48"/><rect x="9" y="14" width="9" height="8" rx="2" fill="currentColor" opacity=".22"/><rect x="21" y="14" width="10" height="3" rx="1.5" fill="currentColor"/><rect x="21" y="19" width="8" height="3" rx="1.5" fill="currentColor" opacity=".6"/></svg>`
const makeWordCloudIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><text x="6" y="14" font-size="9" fill="currentColor" font-weight="700">BI</text><text x="17" y="13" font-size="6" fill="currentColor" opacity=".8">分析</text><text x="10" y="23" font-size="7" fill="currentColor" opacity=".58">趋势</text><text x="24" y="22" font-size="8" fill="currentColor" opacity=".92">指标</text></svg>`
const makeTrendWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="18" width="4" height="8" rx="1" fill="currentColor" opacity=".5"/><rect x="13" y="14" width="4" height="12" rx="1" fill="currentColor" opacity=".66"/><rect x="20" y="10" width="4" height="16" rx="1" fill="currentColor" opacity=".82"/><rect x="27" y="6" width="4" height="20" rx="1" fill="currentColor"/><path d="M7 12L15 10L22 13L30 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const makeVectorGlyphIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M8 22L16 14L21 18L31 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 8H31V15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const createTypeItem = (type: string, svgIcon: string, label = chartTypeLabel(type)) => ({ type, label, svgIcon })

// 柱图族
const BAR_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('bar', makeBarIcon()),
  createTypeItem('bar_stack', makeBarStackIcon()),
  createTypeItem('bar_percent', makeBarStackIcon()),
  createTypeItem('bar_group', makeBarIcon()),
  createTypeItem('bar_group_stack', makeBarGroupStackIcon()),
  createTypeItem('bar_waterfall', makeBarWaterfallIcon()),
  createTypeItem('bar_horizontal', makeBarHIcon()),
  createTypeItem('bar_horizontal_stack', makeBarHIcon()),
  createTypeItem('bar_horizontal_percent', makeBarHIcon()),
  createTypeItem('bar_horizontal_range', makeBarSymmetricIcon()),
  createTypeItem('bar_horizontal_symmetric', makeBarSymmetricIcon()),
  createTypeItem('bar_progress', makeBarProgressIcon()),
  createTypeItem('bar_combo', makeBarComboIcon()),
  createTypeItem('bar_combo_group', makeBarComboIcon()),
  createTypeItem('bar_combo_stack', makeBarComboIcon()),
]

// 线/面图族
const LINE_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('line', makeLineIcon()),
  createTypeItem('area', makeAreaIcon()),
  createTypeItem('line_stack', makeLineStackIcon()),
]

// 占比/分布
const PIE_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('pie', makePieIcon()),
  createTypeItem('doughnut', makeDoughnutIcon()),
  createTypeItem('rose', makeRoseIcon()),
  createTypeItem('funnel', makeFunnelIcon()),
  createTypeItem('treemap', makeTreemapIcon()),
]

// 关系/分布矩阵
const RELATION_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('radar', makeRadarIcon()),
  createTypeItem('scatter', makeScatterIcon()),
  createTypeItem('heatmap', makeHeatmapIcon()),
]

// 地理空间
const GEO_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('map', makeMapIcon()),
]

// 指标/仪表
const METRIC_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('gauge', makeGaugeIcon()),
]

// 表格族
const TABLE_CHART_ITEMS: ChartTypeItem[] = [
  createTypeItem('table', makeTableIcon()),
  createTypeItem('table_summary', makeTableIcon()),
  createTypeItem('table_pivot', makeTableIcon()),
]

// 控件类组件（筛选/联动）
const CONTROL_COMPONENT_ITEMS: ChartTypeItem[] = [
  createTypeItem('filter_button', makeFilterButtonIcon()),
]

// 兼容旧引用：聚合所有图表组件
const CHART_COMPONENT_ITEMS: ChartTypeItem[] = [
  ...BAR_CHART_ITEMS,
  ...LINE_CHART_ITEMS,
  ...PIE_CHART_ITEMS,
  ...RELATION_CHART_ITEMS,
  ...GEO_CHART_ITEMS,
  ...METRIC_CHART_ITEMS,
  ...TABLE_CHART_ITEMS,
  ...CONTROL_COMPONENT_ITEMS,
]

const DECORATION_COMPONENT_ITEMS: ChartTypeItem[] = [
  createTypeItem('decor_border_frame', makeDecorFrameIcon()),
  createTypeItem('decor_border_corner', makeDecorFrameIcon()),
  createTypeItem('decor_border_glow', makeDecorFrameIcon()),
  createTypeItem('decor_border_grid', makeDecorFrameIcon()),
  createTypeItem('decor_border_stream', makeDecorStreamIcon()),
  createTypeItem('decor_border_pulse', makeDecorPulseIcon()),
  createTypeItem('decor_border_bracket', makeDecorBracketIcon()),
  createTypeItem('decor_border_circuit', makeDecorCircuitIcon()),
  createTypeItem('decor_title_plate', makeDecorTitlePlateIcon()),
  createTypeItem('decor_divider_glow', makeDecorDividerIcon()),
  createTypeItem('decor_target_ring', makeDecorTargetIcon()),
  createTypeItem('decor_scan_panel', makeDecorScanIcon()),
  createTypeItem('decor_hex_badge', makeDecorHexIcon()),
]

const TEXT_COMPONENT_ITEMS: ChartTypeItem[] = [
  createTypeItem('text_block', makeTextBlockIcon()),
  createTypeItem('single_field', makeMetricWidgetIcon()),
  createTypeItem('number_flipper', makeMetricWidgetIcon()),
  createTypeItem('table_rank', makeListWidgetIcon()),
  createTypeItem('text_list', makeListWidgetIcon()),
  createTypeItem('clock_display', makeClockWidgetIcon()),
  createTypeItem('word_cloud', makeWordCloudIcon()),
  createTypeItem('business_trend', makeTrendWidgetIcon()),
  createTypeItem('metric_indicator', makeMetricWidgetIcon()),
]

// 媒体/嵌入组件：iframe、图片、二维码、超链接
const MEDIA_COMPONENT_ITEMS: ChartTypeItem[] = [
  createTypeItem('iframe_single', makeFrameWidgetIcon()),
  createTypeItem('iframe_tabs', makeFrameWidgetIcon()),
  createTypeItem('hyperlink', makeLinkWidgetIcon()),
  createTypeItem('image_list', makeListWidgetIcon()),
  createTypeItem('qr_code', makeQrWidgetIcon()),
]

const VECTOR_ICON_COMPONENT_ITEMS: ChartTypeItem[] = [
  createTypeItem('icon_arrow_trend', makeVectorGlyphIcon()),
  createTypeItem('icon_warning_badge', makeVectorGlyphIcon()),
  createTypeItem('icon_location_pin', makeVectorGlyphIcon()),
  createTypeItem('icon_data_signal', makeVectorGlyphIcon()),
  createTypeItem('icon_user_badge', makeVectorGlyphIcon()),
  createTypeItem('icon_chart_mark', makeVectorGlyphIcon()),
]

const CHART_CATEGORIES: ChartCategory[] = [
  { label: '柱图', types: BAR_CHART_ITEMS },
  { label: '线/面图', types: LINE_CHART_ITEMS },
  { label: '占比/分布', types: PIE_CHART_ITEMS },
  { label: '关系/分布矩阵', types: RELATION_CHART_ITEMS },
  { label: '地理空间', types: GEO_CHART_ITEMS },
  { label: '指标/仪表', types: METRIC_CHART_ITEMS },
  { label: '表格组件', types: TABLE_CHART_ITEMS },
  { label: '控件组件', types: CONTROL_COMPONENT_ITEMS },
  { label: '文字组件', types: TEXT_COMPONENT_ITEMS },
  { label: '媒体组件', types: MEDIA_COMPONENT_ITEMS },
  { label: '装饰组件', types: DECORATION_COMPONENT_ITEMS },
  { label: '矢量图标组件', types: VECTOR_ICON_COMPONENT_ITEMS },
]

const CHART_TYPE_ICON_MAP = new Map(
  CHART_CATEGORIES.flatMap((category) => category.types.map((item) => [item.type, item.svgIcon] as const))
)

const getAssetTypeIcon = (type: string) => CHART_TYPE_ICON_MAP.get(type) ?? makeVectorGlyphIcon()
const getAssetTone = (type: string) => {
  if (isDecorationChartType(type)) return 'decoration'
  if (isStaticWidgetChartType(type)) return 'static'
  return 'data'
}
const getAssetBadgeText = (type: string) => {
  if (isDecorationChartType(type)) return '装饰'
  if (isStaticWidgetChartType(type)) return '免数据'
  return '数据'
}

// 缓存模板/组件配置解析结果，避免 v-for 内多次 JSON.parse
const _templateConfigCache = new WeakMap<ChartTemplate, ReturnType<typeof normalizeComponentAssetConfig>>()
const getTemplateAssetConfig = (template: ChartTemplate) => {
  let cached = _templateConfigCache.get(template)
  if (!cached) { cached = normalizeComponentAssetConfig(template.configJson); _templateConfigCache.set(template, cached) }
  return cached
}
const isTemplateStaticAsset = (template: ChartTemplate) => isStaticWidgetChartType(getTemplateAssetConfig(template).chart.chartType || template.chartType)

const STATIC_TEMPLATE_LIBRARY: StaticAssetSeed[] = [
  { type: 'decor_border_frame', name: '默认边框装饰', description: '适合用作区块包裹和背景版强调。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_corner', name: '角标边框', description: '四角强调型装饰边框。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_glow', name: '霓虹边框', description: '适合高亮核心指标区。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_grid', name: '网格边框', description: '适合信息密集型区域背景。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_stream', name: '流光边框', description: '适合做顶部主图和核心看板的动效边框。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_pulse', name: '脉冲边框', description: '适合做告警、重点指标和状态变化区域。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_bracket', name: '支架边框', description: '适合做模块边界与结构化布局。', layout: { width: 520, height: 220 } },
  { type: 'decor_border_circuit', name: '电路边框', description: '适合做科技感数据区域和链路说明。', layout: { width: 520, height: 220 } },
  { type: 'decor_title_plate', name: '标题牌', description: '适合章节标题、指标模块抬头和栏位标识。', layout: { width: 420, height: 96 } },
  { type: 'decor_divider_glow', name: '发光分隔条', description: '适合区块之间的节奏分隔和视觉导向。', layout: { width: 520, height: 64 } },
  { type: 'decor_target_ring', name: '目标环', description: '适合重点指标、地图落点和雷达锁定效果。', layout: { width: 220, height: 220 } },
  { type: 'decor_scan_panel', name: '扫描面板', description: '带扫描流光的科技底板，可作为信息区背景。', layout: { width: 520, height: 260 } },
  { type: 'decor_hex_badge', name: '六边形徽记', description: '适合中心徽章、状态标签和图标承载。', layout: { width: 220, height: 220 } },
  { type: 'text_block', name: '文本组件', description: '用于公告、说明和长文本排版。', layout: { width: 420, height: 220 } },
  { type: 'single_field', name: '单字段组件', description: '适合展示单值和摘要。', layout: { width: 320, height: 180 } },
  { type: 'number_flipper', name: '数字翻牌器', description: '适合大屏 KPI 强调。', layout: { width: 320, height: 180 } },
  { type: 'table_rank', name: '排名表格', description: '适合榜单和排名列表。', layout: { width: 420, height: 260 } },
  { type: 'iframe_single', name: '单页 iframe', description: '嵌入单个外部页面。', layout: { width: 520, height: 320 } },
  { type: 'iframe_tabs', name: '页签 iframe', description: '适合多页面切换展示。', layout: { width: 560, height: 340 } },
  { type: 'hyperlink', name: '超级链接', description: '适合门户跳转和深链入口。', layout: { width: 420, height: 180 } },
  { type: 'image_list', name: '图片列表', description: '适合图文卡片流。', layout: { width: 440, height: 260 } },
  { type: 'text_list', name: '文字列表', description: '适合公告、列表和摘要。', layout: { width: 420, height: 240 } },
  { type: 'clock_display', name: '显示时间', description: '实时展示当前日期与时间。', layout: { width: 360, height: 180 } },
  { type: 'word_cloud', name: '词云图', description: '展示业务高频关键词。', layout: { width: 420, height: 260 } },
  { type: 'qr_code', name: '二维码', description: '适合扫码跳转和分享。', layout: { width: 280, height: 280 } },
  { type: 'business_trend', name: '业务趋势', description: '适合轻量趋势占位和摘要。', layout: { width: 420, height: 240 } },
  { type: 'metric_indicator', name: '指标组件', description: '适合关键经营指标展示。', layout: { width: 320, height: 180 } },
  { type: 'icon_arrow_trend', name: '趋势箭头图标', description: '用于强调涨跌趋势。', layout: { width: 220, height: 220 } },
  { type: 'icon_warning_badge', name: '预警图标', description: '适合告警和异常提醒。', layout: { width: 220, height: 220 } },
  { type: 'icon_location_pin', name: '定位图标', description: '适合地图和区域说明。', layout: { width: 220, height: 220 } },
  { type: 'icon_data_signal', name: '数据信号图标', description: '适合状态和联通性提示。', layout: { width: 220, height: 220 } },
  { type: 'icon_user_badge', name: '用户徽章图标', description: '适合人物、角色和身份展示。', layout: { width: 220, height: 220 } },
  { type: 'icon_chart_mark', name: '图表标记图标', description: '适合图例和图表注记。', layout: { width: 220, height: 220 } },
]

const defaultChartTemplateLayout = (chartType: string) => {
  if (chartType === 'table' || chartType === 'table_summary' || chartType === 'table_pivot') {
    return { width: 760, height: 340 }
  }
  if (chartType === 'filter_button') {
    return { width: 200, height: 60 }
  }
  return { width: 520, height: 320 }
}

const DEFAULT_CHART_TEMPLATE_LIBRARY: StaticAssetSeed[] = CHART_COMPONENT_ITEMS.map((item) => ({
  type: item.type,
  name: `${item.label}（默认）`,
  description: '默认空组件，可先加入画布再绑定数据。',
  layout: defaultChartTemplateLayout(item.type),
}))

const BUILTIN_TEMPLATE_LIBRARY: StaticAssetSeed[] = [...DEFAULT_CHART_TEMPLATE_LIBRARY, ...STATIC_TEMPLATE_LIBRARY]

// ─── 左侧面板展开/折叠 & 拖拽缩放 ────────────────────────────────────────────
const DEFAULT_EXPANDED_CATEGORIES = new Set<string>(['柱图', '线/面图', '占比/分布', '表格组件'])
const expandedCats = ref(new Set<string>(
  CHART_CATEGORIES.map((c) => c.label).filter((label) => DEFAULT_EXPANDED_CATEGORIES.has(label))
))
const toggleCategory = (label: string) => {
  const next = new Set(expandedCats.value)
  if (next.has(label)) { next.delete(label) } else { next.add(label) }
  expandedCats.value = next
}

const sidebarCollapsed = ref(false)
const compactEditorMode = ref(false)
const inspectorCollapsed = ref(true)
const autoFitCanvas = ref(true)
let sidebarHoverTimer: number | null = null
const COMPACT_EDITOR_BREAKPOINT = 1440

const effectiveSidebarCollapsed = computed(() => sidebarCollapsed.value || compactEditorMode.value)

const toggleSidebar = () => {
  if (compactEditorMode.value) return
  sidebarCollapsed.value = !sidebarCollapsed.value
  scheduleCanvasFit()
}

const hoverExpandSidebar = () => {
  if (compactEditorMode.value || !sidebarCollapsed.value) return
  if (sidebarHoverTimer !== null) { clearTimeout(sidebarHoverTimer); sidebarHoverTimer = null }
  sidebarHoverTimer = window.setTimeout(() => {
    sidebarCollapsed.value = false
    scheduleCanvasFit()
  }, 200)
}

const hoverCollapseSidebar = () => {
  if (sidebarHoverTimer !== null) { clearTimeout(sidebarHoverTimer); sidebarHoverTimer = null }
  // Don't auto-collapse after hover-expand; user must click toggle or move away
}

const leftPanelWidth = ref(460)
const startPanelResize = (e: MouseEvent) => {
  const startX = e.clientX
  const startWidth = leftPanelWidth.value
  let rafId = 0
  let lastX = startX
  const applyFrame = () => { rafId = 0; leftPanelWidth.value = Math.max(380, Math.min(760, startWidth + lastX - startX)) }
  const onMove = (ev: MouseEvent) => { lastX = ev.clientX; if (!rafId) rafId = requestAnimationFrame(applyFrame) }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (rafId) { cancelAnimationFrame(rafId); applyFrame() }
    scheduleCanvasFit()
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
const localStaticTemplates = computed<ChartTemplate[]>(() => BUILTIN_TEMPLATE_LIBRARY.map((item, index) => ({
  id: -(index + 1),
  name: item.name,
  description: item.description,
  chartType: item.type,
  configJson: buildComponentAssetConfig(undefined, undefined, {
    chart: {
      name: item.name,
      chartType: item.type,
      datasetId: '',
      sourceMode: 'DATASET',
      pageSourceKind: 'DATABASE',
      datasourceId: '',
      sqlText: '',
      runtimeConfigText: '',
      xField: '',
      yField: '',
      groupField: '',
      tableDimensionFields: [],
      tableMetricFields: [],
    },
  }, item.layout),
  builtIn: true,
  sortOrder: index + 1,
  createdBy: 'system',
  createdAt: '',
})))
const templateAssets = computed(() => [...localStaticTemplates.value, ...templates.value])
const dashboardCounts = ref(new Map<number, number>())
const componentDataMap = shallowRef(new Map<number, ChartDataResult>())
const leftPanelRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const stageScrollRef = ref<HTMLElement | null>(null)
const stageScrollOffset = reactive({ left: 0, top: 0 })
const activeCompId = ref<number | null>(null)
const selectedComponentIds = ref<number[]>([])
const dashboardSearch = ref('')
const shareVisible = ref(false)
const publishVisible = ref(false)
const publishSaving = ref(false)
const canvasSaving = ref(false)
const coverSaving = ref(false)
const capturingCover = ref(false)
const bgImgInputRef = ref<HTMLInputElement | null>(null)
const bgImgUploading = ref(false)

const libraryTab = ref('templates')
const assetSearch = ref('')
const assetType = ref('')
const selectedChartId = ref<number | null>(null)
const selectedTemplateId = ref<number | null>(null)
const hoveredTemplateId = ref<number | null>(null)
const draggingTemplateId = ref<number | null>(null)
const draggingChartId = ref<number | null>(null)
const draggingTypeChip = ref<string | null>(null)
const stageDropActive = ref(false)
const layerDragFromIdx = ref<number | null>(null)
const layerDragOverIdx = ref<number | null>(null)
const marqueeSelection = reactive({
  visible: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
})
const componentContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
})
const templatePreviewStyle = ref<Record<string, string>>({ top: '0px', left: '0px' })

interface ComponentLayoutSnapshot {
  posX: number
  posY: number
  width: number
  height: number
  zIndex: number
}

interface ComponentSnapshot extends ComponentLayoutSnapshot {
  id: number
  chartId: number
  configJson: string
}

interface OverlaySnapshot {
  show: boolean
  bgColor: string
  opacity: number
  x: number
  y: number
  w: number
  h: number
  bgType: 'solid' | 'gradient' | 'image'
  gradientStart: string
  gradientEnd: string
  gradientAngle: number
  bgImage: string
}

type UndoEntry =
  | { type: 'layout'; componentId: number; before: ComponentLayoutSnapshot; after: ComponentLayoutSnapshot }
  | { type: 'component-config'; componentId: number; before: { chartId: number; configJson: string }; after: { chartId: number; configJson: string } }
  | { type: 'overlay'; before: OverlaySnapshot; after: OverlaySnapshot }
  | { type: 'add-component'; component: ComponentSnapshot }
  | { type: 'remove-component'; component: ComponentSnapshot }

const undoStack = ref<UndoEntry[]>([])
const undoApplying = ref(false)
const canUndo = computed(() => undoStack.value.length > 0 && !undoApplying.value)
const lastSavedOverlaySnapshot = ref<OverlaySnapshot | null>(null)

const clearUndoHistory = () => {
  undoStack.value = []
}

const pushUndoEntry = (entry: UndoEntry) => {
  if (undoApplying.value) return
  undoStack.value = [...undoStack.value, entry].slice(-3)
}

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
const stageCardRefs = new Map<number, HTMLElement>()
const chartInstances = new Map<number, ECharts>()
const COMPONENT_DATA_BATCH_SIZE = 4
let interactionFrame: number | null = null
let pendingPointer: { x: number; y: number } | null = null
let componentDataLoadToken = 0
let componentVisibilityObserver: IntersectionObserver | null = null
const visibleComponentIds = shallowRef(new Set<number>())

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
  lastSavedOverlaySnapshot.value = cloneOverlaySnapshot()
}

const saveOverlay = async () => {
  const before = lastSavedOverlaySnapshot.value ? cloneOverlaySnapshot(lastSavedOverlaySnapshot.value) : cloneOverlaySnapshot()
  const next = cloneOverlaySnapshot()
  if (overlaySnapshotsEqual(before, next)) return
  await updateCanvasConfig({ overlay: next })
  pushUndoEntry({ type: 'overlay', before, after: next })
  lastSavedOverlaySnapshot.value = cloneOverlaySnapshot(next)
}

const toggleOverlay = async () => {
  // 背景版 is now always visible; this just resets position
  overlayConfig.show = true
  overlayConfig.x = 0
  overlayConfig.y = 0
  await saveOverlay()
}

// 幕布拖动 (rAF 节流)
const startCurtainDrag = (e: MouseEvent) => {
  overlaySelected.value = true
  activeCompId.value = null
  const startX = e.clientX
  const startY = e.clientY
  const ox = overlayConfig.x
  const oy = overlayConfig.y
  let rafId = 0
  let lastEv: MouseEvent = e
  const applyFrame = () => { rafId = 0; const scale = canvasScale.value || 1; overlayConfig.x = Math.max(0, Math.round(ox + (lastEv.clientX - startX) / scale)); overlayConfig.y = Math.max(0, Math.round(oy + (lastEv.clientY - startY) / scale)) }
  const onMove = (ev: MouseEvent) => { lastEv = ev; if (!rafId) rafId = requestAnimationFrame(applyFrame) }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (rafId) { cancelAnimationFrame(rafId); applyFrame() }
    saveOverlay()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// 幕布调整大小 (rAF 节流)
const startCurtainResize = (e: MouseEvent, handle: string) => {
  overlaySelected.value = true
  activeCompId.value = null
  const startX = e.clientX
  const startY = e.clientY
  const ox = overlayConfig.x; const ow = overlayConfig.w
  const oy = overlayConfig.y; const oh = overlayConfig.h
  let rafId = 0
  let lastEv: MouseEvent = e
  const applyFrame = () => {
    rafId = 0
    const scale = canvasScale.value || 1
    const dx = (lastEv.clientX - startX) / scale
    const dy = (lastEv.clientY - startY) / scale
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
  const onMove = (ev: MouseEvent) => { lastEv = ev; if (!rafId) rafId = requestAnimationFrame(applyFrame) }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (rafId) { cancelAnimationFrame(rafId); applyFrame() }
    saveOverlay()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const MIN_CARD_WIDTH = 160
const MIN_CARD_HEIGHT = 120
const LEGACY_GRID_COL_PX = 42
const LEGACY_GRID_ROW_PX = 70
const chartTypeOptions = Array.from(new Map(
  CHART_CATEGORIES
    .flatMap((group) => group.types)
    .map((item) => [item.type, { label: item.label, value: item.type }])
).values())

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
  return templateAssets.value.filter((item) => {
    const matchKeyword = !keyword
      || item.name.toLowerCase().includes(keyword)
      || item.description.toLowerCase().includes(keyword)
    const matchType = !assetType.value || item.chartType === assetType.value
    return matchKeyword && matchType
  })
})

const TEMPLATE_PREVIEW_WIDTH = 220
const TEMPLATE_PREVIEW_HEIGHT = 248
const TEMPLATE_PREVIEW_OFFSET = 14
let templatePreviewHideTimer: number | null = null

const cancelHideTemplatePreview = () => {
  if (templatePreviewHideTimer !== null) {
    clearTimeout(templatePreviewHideTimer)
    templatePreviewHideTimer = null
  }
}

const updateTemplatePreviewPosition = (anchorEl: HTMLElement) => {
  const panel = leftPanelRef.value
  if (!panel) return
  const panelRect = panel.getBoundingClientRect()
  const anchorRect = anchorEl.getBoundingClientRect()
  const headBottom = panel.querySelector('.lp-head')?.getBoundingClientRect().bottom ?? panelRect.top
  const minTop = Math.max(12, headBottom - panelRect.top + 8)
  const maxLeft = Math.max(12, panelRect.width - TEMPLATE_PREVIEW_WIDTH - 12)
  const maxTop = Math.max(minTop, panelRect.height - TEMPLATE_PREVIEW_HEIGHT - 12)
  const nextLeft = Math.min(Math.max(anchorRect.right - panelRect.left + TEMPLATE_PREVIEW_OFFSET, 12), maxLeft)
  const nextTop = Math.min(Math.max(anchorRect.top - panelRect.top - 6, minTop), maxTop)
  templatePreviewStyle.value = {
    left: `${Math.round(nextLeft)}px`,
    top: `${Math.round(nextTop)}px`,
  }
}

const showTemplatePreview = (event: MouseEvent, templateId: number) => {
  cancelHideTemplatePreview()
  hoveredTemplateId.value = templateId
  if (event.currentTarget instanceof HTMLElement) {
    updateTemplatePreviewPosition(event.currentTarget)
  }
}

const scheduleHideTemplatePreview = () => {
  cancelHideTemplatePreview()
  templatePreviewHideTimer = window.setTimeout(() => {
    hoveredTemplateId.value = null
    templatePreviewHideTimer = null
  }, 90)
}

const hideTemplatePreview = () => {
  cancelHideTemplatePreview()
  hoveredTemplateId.value = null
}

const selectedChartAsset = computed(() => charts.value.find((item) => item.id === selectedChartId.value) ?? null)
const selectedTemplate = computed(() => templateAssets.value.find((item) => item.id === selectedTemplateId.value) ?? null)
const hoveredTemplate = computed(() => filteredTemplates.value.find((item) => item.id === hoveredTemplateId.value) ?? null)
const selectedLibraryAsset = computed(() => libraryTab.value === 'templates' ? selectedTemplate.value : selectedChartAsset.value)
const filteredDashboards = computed(() => {
  const keyword = dashboardSearch.value.trim().toLowerCase()
  return keyword ? dashboards.value.filter((item) => item.name.toLowerCase().includes(keyword)) : dashboards.value
})
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish))
const currentCoverConfig = computed(() => normalizeCoverConfig(parseReportConfig(currentDashboard.value?.configJson).cover))
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
const selectedComponentIdSet = computed(() => new Set(selectedComponentIds.value))
const selectedStageComponents = computed(() => components.value.filter((item) => selectedComponentIdSet.value.has(item.id)))
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null)
const _componentConfigCache = new Map<string, ReturnType<typeof normalizeComponentConfig>>()
const getComponentConfig = (component: DashboardComponent) => {
  const cacheKey = `${component.id}:${component.chartId}:${component.configJson ?? ''}`
  let cached = _componentConfigCache.get(cacheKey)
  if (!cached) {
    cached = normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId))
    _componentConfigCache.set(cacheKey, cached)
    // 限制缓存条目数量，防止长时间编辑内存膨胀
    if (_componentConfigCache.size > 200) {
      const firstKey = _componentConfigCache.keys().next().value as string
      _componentConfigCache.delete(firstKey)
    }
  }
  return cached
}
const getComponentChartConfig = (component: DashboardComponent) => getComponentConfig(component).chart
const getComponentDisplayName = (component: DashboardComponent) => getComponentChartConfig(component).name?.trim()
  || chartMap.value.get(component.chartId)?.name
  || '未命名组件'
const getComponentStatusText = (component: DashboardComponent) => {
  if (showNoField(component)) return '待补字段'
  if (!isStaticWidget(component) && !isRenderableChart(component)) return '预览受限'
  return '可预览'
}
const layeredComponents = computed(() => [...components.value].sort((left, right) => {
  const zIndexDelta = (right.zIndex ?? 0) - (left.zIndex ?? 0)
  if (zIndexDelta !== 0) return zIndexDelta
  return right.id - left.id
}))
const marqueeStyle = computed(() => {
  const left = Math.min(marqueeSelection.startX, marqueeSelection.currentX)
  const top = Math.min(marqueeSelection.startY, marqueeSelection.currentY)
  const width = Math.abs(marqueeSelection.currentX - marqueeSelection.startX)
  const height = Math.abs(marqueeSelection.currentY - marqueeSelection.startY)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})
const currentCanvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(currentDashboard.value?.configJson).canvas, 'screen'))
const matchedCanvasPreset = computed(() => SCREEN_CANVAS_PRESETS.find(
  (item) => item.width === currentCanvasConfig.value.width && item.height === currentCanvasConfig.value.height
)?.id ?? 'custom')

// 背景版 presets + size controls
const matchedBgPreset = computed(() => SCREEN_CANVAS_PRESETS.find(
  (item) => item.width === overlayConfig.w && item.height === overlayConfig.h
)?.id ?? 'custom')

const canvasWorkWidth = computed(() => Math.max(overlayConfig.w + 400, 2400))

// ─── 缩放控制 ───────────────────────────────────────────────────────────
const canvasScale = ref(1)
const SCALE_MIN = 0.1
const SCALE_MAX = 2
const SCALE_STEP = 0.1

const getStageScrollElement = () => stageScrollRef.value

const applyFittedCanvasScale = () => {
  const scrollEl = getStageScrollElement()
  if (!scrollEl) return
  const fitW = (scrollEl.clientWidth - 40) / canvasWorkWidth.value
  const fitH = (scrollEl.clientHeight - 40) / canvasMinHeight.value
  canvasScale.value = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +Math.min(fitW, fitH).toFixed(2)))
}

const scheduleCanvasFit = () => {
  if (!autoFitCanvas.value) return
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      applyFittedCanvasScale()
    })
  })
}

const zoomIn = () => {
  autoFitCanvas.value = false
  canvasScale.value = Math.min(SCALE_MAX, +(canvasScale.value + SCALE_STEP).toFixed(2))
}
const zoomOut = () => {
  autoFitCanvas.value = false
  canvasScale.value = Math.max(SCALE_MIN, +(canvasScale.value - SCALE_STEP).toFixed(2))
}
const zoomReset = () => {
  autoFitCanvas.value = false
  canvasScale.value = 1
}
const zoomFit = () => {
  autoFitCanvas.value = true
  applyFittedCanvasScale()
}

const toggleInspector = () => {
  inspectorCollapsed.value = !inspectorCollapsed.value
  scheduleCanvasFit()
}

const canvasMinHeight = computed(() => {
  const bgBottom = overlayConfig.y + overlayConfig.h + 200
  const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0)
  return Math.max(currentCanvasConfig.value.height, bgBottom, 560, occupied)
})

watch([canvasWorkWidth, canvasMinHeight], () => {
  scheduleCanvasFit()
})

const RULER_STEP = 200 // 加大标尺间距减少 DOM 数量
const hRulerMarks = computed(() => {
  const marks: number[] = []
  for (let i = 0; i <= canvasWorkWidth.value; i += RULER_STEP) marks.push(i)
  return marks
})

const vRulerMarks = computed(() => {
  const marks: number[] = []
  for (let i = 0; i <= canvasMinHeight.value; i += RULER_STEP) marks.push(i)
  return marks
})

const getHRulerMarkStyle = (mark: number) => ({
  left: `${Math.round(mark + 20 - stageScrollOffset.left)}px`,
})

const getVRulerMarkStyle = (mark: number) => ({
  top: `${Math.round(mark + 20 - stageScrollOffset.top)}px`,
})

const handleStageScroll = () => {
  stageScrollOffset.left = stageScrollRef.value?.scrollLeft ?? 0
  stageScrollOffset.top = stageScrollRef.value?.scrollTop ?? 0
}

const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? currentCanvasConfig.value.width, MIN_CARD_WIDTH + 32)

const setChartRef = (el: HTMLElement | null, componentId: number) => {
  if (el) chartRefs.set(componentId, el)
  else chartRefs.delete(componentId)
}

const getDashboardComponentCount = (dashboardId: number) => dashboardCounts.value.get(dashboardId) ?? 0
const getDashboardCoverUrl = (dashboard: Dashboard) => normalizeCoverConfig(parseReportConfig(dashboard.configJson).cover).url

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

const cloneComponentLayout = (component: Pick<DashboardComponent, 'posX' | 'posY' | 'width' | 'height' | 'zIndex'>): ComponentLayoutSnapshot => ({
  posX: Math.max(0, Math.round(Number(component.posX) || 0)),
  posY: Math.max(0, Math.round(Number(component.posY) || 0)),
  width: Math.max(MIN_CARD_WIDTH, Math.round(Number(component.width) || MIN_CARD_WIDTH)),
  height: Math.max(MIN_CARD_HEIGHT, Math.round(Number(component.height) || MIN_CARD_HEIGHT)),
  zIndex: Math.max(0, Math.round(Number(component.zIndex) || 0)),
})

const cloneComponentSnapshot = (component: DashboardComponent): ComponentSnapshot => ({
  id: component.id,
  chartId: component.chartId,
  configJson: component.configJson ?? '',
  ...cloneComponentLayout(component),
})

const cloneOverlaySnapshot = (source: OverlaySnapshot | typeof overlayConfig = overlayConfig): OverlaySnapshot => ({
  show: source.show,
  bgColor: source.bgColor,
  opacity: source.opacity,
  x: source.x,
  y: source.y,
  w: source.w,
  h: source.h,
  bgType: source.bgType,
  gradientStart: source.gradientStart,
  gradientEnd: source.gradientEnd,
  gradientAngle: source.gradientAngle,
  bgImage: source.bgImage,
})

const applyOverlaySnapshot = (snapshot: OverlaySnapshot) => {
  overlayConfig.show = snapshot.show
  overlayConfig.bgColor = snapshot.bgColor
  overlayConfig.opacity = snapshot.opacity
  overlayConfig.x = snapshot.x
  overlayConfig.y = snapshot.y
  overlayConfig.w = snapshot.w
  overlayConfig.h = snapshot.h
  overlayConfig.bgType = snapshot.bgType
  overlayConfig.gradientStart = snapshot.gradientStart
  overlayConfig.gradientEnd = snapshot.gradientEnd
  overlayConfig.gradientAngle = snapshot.gradientAngle
  overlayConfig.bgImage = snapshot.bgImage
}

const applyComponentLayoutSnapshot = (component: DashboardComponent, snapshot: ComponentLayoutSnapshot) => {
  component.posX = snapshot.posX
  component.posY = snapshot.posY
  component.width = snapshot.width
  component.height = snapshot.height
  component.zIndex = snapshot.zIndex
  normalizeLayout(component)
}

const layoutSnapshotsEqual = (left: ComponentLayoutSnapshot, right: ComponentLayoutSnapshot) => (
  left.posX === right.posX
  && left.posY === right.posY
  && left.width === right.width
  && left.height === right.height
  && left.zIndex === right.zIndex
)

const overlaySnapshotsEqual = (left: OverlaySnapshot, right: OverlaySnapshot) => (
  left.show === right.show
  && left.bgColor === right.bgColor
  && left.opacity === right.opacity
  && left.x === right.x
  && left.y === right.y
  && left.w === right.w
  && left.h === right.h
  && left.bgType === right.bgType
  && left.gradientStart === right.gradientStart
  && left.gradientEnd === right.gradientEnd
  && left.gradientAngle === right.gradientAngle
  && left.bgImage === right.bgImage
)

const getEditorCardPadding = (component: DashboardComponent) => {
  if (isDecorationComponent(component)) return 0
  const padding = Number(getComponentConfig(component).style.padding ?? 0)
  return Math.max(0, Math.min(padding, 6))
}

const getCardStyle = (component: DashboardComponent) => {
  const style = getComponentConfig(component).style
  const shadow = style.shadowShow
    ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
    : undefined
  const preview = interactionPreview.value?.compId === component.id ? interactionPreview.value : null
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
    padding: getEditorCardPadding(component) > 0 ? `${getEditorCardPadding(component)}px` : undefined,
    transform: preview?.transform,
    transformOrigin: preview?.transformOrigin,
  }
}

const buildCounts = async () => {
  const entries = await Promise.all(
    dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length] as const)
  )
  dashboardCounts.value = new Map(entries)
}

const yieldToMainThread = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0))

const setComponentData = (componentId: number, data: ChartDataResult) => {
  componentDataMap.value.set(componentId, data)
  triggerRef(componentDataMap)
}

const deleteComponentData = (componentId: number) => {
  if (!componentDataMap.value.has(componentId)) return
  componentDataMap.value.delete(componentId)
  triggerRef(componentDataMap)
}

const clearComponentData = () => {
  if (!componentDataMap.value.size) return
  componentDataMap.value.clear()
  triggerRef(componentDataMap)
}

const clearVisibleComponentIds = () => {
  if (!visibleComponentIds.value.size) return
  visibleComponentIds.value = new Set()
}

const buildComponentDataRequestSignature = (
  chartId: number,
  resolved: ReturnType<typeof normalizeComponentConfig>,
) => JSON.stringify({
  chartId,
  chartType: resolved.chart.chartType,
  sourceMode: resolved.chart.sourceMode,
  datasetId: resolved.chart.datasetId,
  datasourceId: resolved.chart.datasourceId,
  pageSourceKind: resolved.chart.pageSourceKind,
  sqlText: resolved.chart.sqlText,
  runtimeConfigText: resolved.chart.runtimeConfigText,
  xField: resolved.chart.xField,
  yField: resolved.chart.yField,
  groupField: resolved.chart.groupField,
  filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
})

const disposeChartInstance = (componentId: number) => {
  chartInstances.get(componentId)?.dispose()
  chartInstances.delete(componentId)
  chartRefs.delete(componentId)
}

const disposeComponentVisibilityObserver = () => {
  componentVisibilityObserver?.disconnect()
  componentVisibilityObserver = null
  stageCardRefs.clear()
  clearVisibleComponentIds()
}

const markComponentVisible = (componentId: number, visible: boolean) => {
  const next = new Set(visibleComponentIds.value)
  const changed = visible ? !next.has(componentId) : next.delete(componentId)
  if (!changed) return
  if (visible) next.add(componentId)
  visibleComponentIds.value = next
}

const isComponentVisible = (componentId: number) => visibleComponentIds.value.has(componentId)

const rerenderComponentFromCache = async (component: DashboardComponent) => {
  await nextTick()
  if (showNoField(component) || !isRenderableChart(component)) {
    disposeChartInstance(component.id)
    return
  }
  const cachedData = componentDataMap.value.get(component.id)
  if (!cachedData) return
  renderChart(component, cachedData)
  chartInstances.get(component.id)?.resize()
}

const syncComponentPreview = async (
  component: DashboardComponent,
  payload: { chartId: number; configJson: string },
) => {
  const previousSignature = buildComponentDataRequestSignature(component.chartId, getComponentConfig(component))
  component.chartId = payload.chartId
  component.configJson = payload.configJson
  const nextResolved = normalizeComponentConfig(payload.configJson, chartMap.value.get(payload.chartId))
  const nextSignature = buildComponentDataRequestSignature(payload.chartId, nextResolved)

  if (previousSignature === nextSignature && componentDataMap.value.has(component.id)) {
    await rerenderComponentFromCache(component)
    return
  }

  await loadComponentData(component)
}

const componentRequiresPreviewData = (component: DashboardComponent) => {
  const chart = getComponentChartConfig(component)
  const chartType = chart.chartType ?? ''
  if (chartType === 'filter_button' || showNoField(component)) return false
  if (isStaticWidgetChartType(chartType)) {
    return Boolean(
      chart.datasetId
      || chart.datasourceId
      || chart.sqlText?.trim()
      || chart.runtimeConfigText?.trim()
      || chart.xField
      || chart.yField
      || chart.groupField
    )
  }
  return true
}

const shouldDeferComponentPreview = (component: DashboardComponent) => (
  componentRequiresPreviewData(component)
  && !isComponentVisible(component.id)
  && !componentDataMap.value.has(component.id)
)

const isComponentPreviewLoading = (component: DashboardComponent) => (
  componentRequiresPreviewData(component)
  && isComponentVisible(component.id)
  && !componentDataMap.value.has(component.id)
)

const handleComponentVisibilityChange = (componentId: number, visible: boolean) => {
  markComponentVisible(componentId, visible)
  const component = findComponent(componentId)
  if (!component) return
  if (visible) {
    if (componentRequiresPreviewData(component) && !componentDataMap.value.has(componentId)) {
      void loadComponentData(component)
      return
    }
    const cachedData = componentDataMap.value.get(componentId)
    if (cachedData && isRenderableChart(component)) {
      renderChart(component, cachedData)
      chartInstances.get(componentId)?.resize()
    }
    return
  }
  disposeChartInstance(componentId)
}

const setupComponentVisibilityObserver = () => {
  disposeComponentVisibilityObserver()
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return false
  if (!stageScrollRef.value) return false
  componentVisibilityObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const componentId = Number((entry.target as HTMLElement).dataset.componentId || 0)
      if (!componentId) continue
      handleComponentVisibilityChange(componentId, entry.isIntersecting || entry.intersectionRatio > 0)
    }
  }, {
    root: stageScrollRef.value,
    rootMargin: '240px 160px',
    threshold: 0.01,
  })
  stageCardRefs.forEach((element, componentId) => {
    element.dataset.componentId = String(componentId)
    componentVisibilityObserver?.observe(element)
  })
  return true
}

const loadComponentDataInBatches = async (items: DashboardComponent[], loadToken: number) => {
  for (let start = 0; start < items.length; start += COMPONENT_DATA_BATCH_SIZE) {
    const batch = items.slice(start, start + COMPONENT_DATA_BATCH_SIZE)
    await Promise.all(batch.map((component) => loadComponentData(component, loadToken)))
    if (componentDataLoadToken !== loadToken) return
    if (start + COMPONENT_DATA_BATCH_SIZE < items.length) {
      await yieldToMainThread()
    }
  }
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
  selectedComponentIds.value = []
  activeCompId.value = null
  overlaySelected.value = false
  hideComponentContextMenu()
  clearUndoHistory()
  await loadComponents()
  loadOverlayFromConfig()
  await nextTick()
  scheduleCanvasFit()
}

const loadComponents = async () => {
  if (!currentDashboard.value) return
  const loadToken = ++componentDataLoadToken
  compLoading.value = true
  disposeComponentVisibilityObserver()
  disposeCharts()
  clearComponentData()
  _componentConfigCache.clear()
  try {
    const result = await getDashboardComponents(currentDashboard.value.id)
    if (componentDataLoadToken !== loadToken) return
    result.forEach(normalizeLayout)
    components.value = result
    selectedComponentIds.value = []
    hideComponentContextMenu()
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length)
    await nextTick()
    const observerReady = setupComponentVisibilityObserver()
    if (!observerReady) {
      await loadComponentDataInBatches(result, loadToken)
    }
  } finally {
    if (componentDataLoadToken === loadToken) {
      compLoading.value = false
    }
  }
}

const loadComponentData = async (component: DashboardComponent, loadToken = componentDataLoadToken) => {
  const resolved = getComponentConfig(component)
  const chart = resolved.chart
  if (!chart || getMissingChartFields(chart).length > 0) {
    deleteComponentData(component.id)
    disposeChartInstance(component.id)
    return
  }
  const requestSignature = buildComponentDataRequestSignature(component.chartId, resolved)
  try {
    const data = await getChartData(component.chartId, {
      configJson: component.configJson,
      filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
    })
    if (loadToken !== componentDataLoadToken) return
    if (requestSignature !== buildComponentDataRequestSignature(component.chartId, getComponentConfig(component))) return
    const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart)
    setComponentData(component.id, materialized)
    if (isRenderableChart(component)) {
      renderChart(component, materialized)
    } else {
      disposeChartInstance(component.id)
    }
  } catch {
    if (loadToken !== componentDataLoadToken) return
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

const isFilterButtonChart = (component: DashboardComponent) => getComponentChartConfig(component).chartType === 'filter_button'

const isStaticWidget = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isStaticWidgetChartType(type)
}

const isDecorationComponent = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isDecorationChartType(type)
}

const isRenderableChart = (component: DashboardComponent) => {
  const type = getComponentChartConfig(component).chartType ?? ''
  return isCanvasRenderableChartType(type)
}

const showNoField = (component: DashboardComponent) => {
  const config = getComponentChartConfig(component)
  const type = config.chartType ?? ''
  if (isStaticWidgetChartType(type)) return false
  return getMissingChartFields(config).length > 0
}

const getTableColumns = (component: DashboardComponent) => getConfiguredTableColumns(
  getComponentConfig(component).chart,
  componentDataMap.value.get(component.id)?.columns ?? []
)
const getTableRows = (componentId: number) => componentDataMap.value.get(componentId)?.rawRows ?? []

const setStageCardRef = (el: HTMLElement | null, componentId: number) => {
  const previous = stageCardRefs.get(componentId)
  if (previous && componentVisibilityObserver) {
    componentVisibilityObserver.unobserve(previous)
  }
  if (!el) {
    stageCardRefs.delete(componentId)
    markComponentVisible(componentId, false)
    return
  }
  el.dataset.componentId = String(componentId)
  stageCardRefs.set(componentId, el)
  componentVisibilityObserver?.observe(el)
}

const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0)

const isComponentSelected = (componentId: number) => selectedComponentIdSet.value.has(componentId)

const normalizeSelectedComponentIds = (componentIds: number[]) => {
  const availableIds = new Set(components.value.map((item) => item.id))
  return Array.from(new Set(componentIds)).filter((id) => availableIds.has(id))
}

const setSelectedComponents = (componentIds: number[], primaryId: number | null = componentIds.at(-1) ?? null) => {
  const nextIds = normalizeSelectedComponentIds(componentIds)
  selectedComponentIds.value = nextIds
  overlaySelected.value = false
  activeCompId.value = primaryId !== null && nextIds.includes(primaryId)
    ? primaryId
    : nextIds.at(-1) ?? null
}

const clearComponentSelection = () => {
  selectedComponentIds.value = []
  activeCompId.value = null
  overlaySelected.value = false
}

const hideComponentContextMenu = () => {
  componentContextMenu.visible = false
}

const resetMarqueeSelection = () => {
  marqueeSelection.visible = false
  marqueeSelection.startX = 0
  marqueeSelection.startY = 0
  marqueeSelection.currentX = 0
  marqueeSelection.currentY = 0
}

const getCanvasPointerPosition = (event: MouseEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  const scale = canvasScale.value || 1
  if (!rect) return { x: 0, y: 0 }
  return {
    x: Math.max(0, Math.min(canvasWorkWidth.value, Math.round((event.clientX - rect.left) / scale))),
    y: Math.max(0, Math.min(canvasMinHeight.value, Math.round((event.clientY - rect.top) / scale))),
  }
}

const collectComponentsInMarquee = () => {
  const left = Math.min(marqueeSelection.startX, marqueeSelection.currentX)
  const right = Math.max(marqueeSelection.startX, marqueeSelection.currentX)
  const top = Math.min(marqueeSelection.startY, marqueeSelection.currentY)
  const bottom = Math.max(marqueeSelection.startY, marqueeSelection.currentY)
  return components.value
    .filter((component) => component.posX < right
      && component.posX + component.width > left
      && component.posY < bottom
      && component.posY + component.height > top)
    .map((component) => component.id)
}

const startStageMarquee = (event: MouseEvent, options: { selectOverlayOnClick?: boolean } = {}) => {
  if (event.button !== 0) return
  hideComponentContextMenu()
  const start = getCanvasPointerPosition(event)
  marqueeSelection.startX = start.x
  marqueeSelection.startY = start.y
  marqueeSelection.currentX = start.x
  marqueeSelection.currentY = start.y
  marqueeSelection.visible = false
  let didDrag = false

  const onMove = (nextEvent: MouseEvent) => {
    const next = getCanvasPointerPosition(nextEvent)
    marqueeSelection.currentX = next.x
    marqueeSelection.currentY = next.y
    if (!didDrag && (Math.abs(next.x - start.x) > 4 || Math.abs(next.y - start.y) > 4)) {
      didDrag = true
      marqueeSelection.visible = true
    }
    if (!didDrag) return
    setSelectedComponents(collectComponentsInMarquee())
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (!didDrag) {
      if (options.selectOverlayOnClick) {
        selectOverlayLayer()
      } else {
        clearComponentSelection()
      }
    }
    resetMarqueeSelection()
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const handleCurtainPointerDown = (event: MouseEvent) => {
  if (event.button !== 0) return
  hideComponentContextMenu()
  if (overlaySelected.value) {
    startCurtainDrag(event)
    return
  }
  startStageMarquee(event, { selectOverlayOnClick: true })
}

const focusComponent = (component: DashboardComponent, options: { preserveSelection?: boolean; bringToFront?: boolean } = {}) => {
  const preserveSelection = options.preserveSelection === true && isComponentSelected(component.id)
  if (preserveSelection) {
    overlaySelected.value = false
    activeCompId.value = component.id
  } else {
    setSelectedComponents([component.id], component.id)
  }
  if (options.bringToFront === false) return
  const nextZ = getMaxZ() + 1
  if ((component.zIndex ?? 0) < nextZ) component.zIndex = nextZ
}

const selectOverlayLayer = () => {
  overlaySelected.value = true
  selectedComponentIds.value = []
  activeCompId.value = null
  hideComponentContextMenu()
}

const selectLayerComponent = (component: DashboardComponent) => {
  hideComponentContextMenu()
  setSelectedComponents([component.id], component.id)
}

const handleStageCardMouseDown = (event: MouseEvent, component: DashboardComponent) => {
  hideComponentContextMenu()
  if (event.button !== 0) return
  const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id)
  focusComponent(component, { preserveSelection, bringToFront: !preserveSelection })
}

const openComponentContextMenu = (event: MouseEvent, component: DashboardComponent) => {
  if (!isComponentSelected(component.id)) {
    setSelectedComponents([component.id], component.id)
  } else {
    overlaySelected.value = false
    activeCompId.value = component.id
  }
  const menuWidth = 176
  const menuHeight = 236
  componentContextMenu.x = Math.max(12, Math.min(event.clientX, window.innerWidth - menuWidth - 12))
  componentContextMenu.y = Math.max(12, Math.min(event.clientY, window.innerHeight - menuHeight - 12))
  componentContextMenu.visible = true
}

const buildPatchedLayoutSnapshot = (component: DashboardComponent, patch: Partial<DashboardComponent>): ComponentLayoutSnapshot => {
  const next = cloneComponentLayout(component)
  if (typeof patch.posX === 'number') next.posX = Math.max(0, Math.round(patch.posX))
  if (typeof patch.posY === 'number') next.posY = Math.max(0, Math.round(patch.posY))
  if (typeof patch.width === 'number') next.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width))
  if (typeof patch.height === 'number') next.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height))
  if (typeof patch.zIndex === 'number') next.zIndex = Math.max(0, Math.round(patch.zIndex))
  return next
}

const applyLayoutPatch = async (patch: Partial<DashboardComponent>) => {
  const component = activeComponent.value
  if (!component) return
  const before = cloneComponentLayout(component)
  const next = buildPatchedLayoutSnapshot(component, patch)
  if (layoutSnapshotsEqual(before, next)) return
  applyComponentLayoutSnapshot(component, next)
  await nextTick()
  chartInstances.get(component.id)?.resize()
  const persisted = await persistLayout(component, next)
  if (persisted) {
    pushUndoEntry({ type: 'layout', componentId: component.id, before, after: next })
  }
}

const bringComponentToFront = async () => {
  const component = activeComponent.value
  if (!component) return
  await applyLayoutPatch({ zIndex: getMaxZ() + 1 })
}

const bringSpecificComponentToFront = async (component: DashboardComponent) => {
  selectLayerComponent(component)
  await applyLayoutPatch({ zIndex: getMaxZ() + 1 })
}

const buildZOrderedComponents = () => [...components.value].sort((left, right) => {
  const zDelta = (left.zIndex ?? 0) - (right.zIndex ?? 0)
  if (zDelta !== 0) return zDelta
  return left.id - right.id
})

const applyOrderedZIndices = async (orderedComponents: DashboardComponent[]) => {
  const persistPromises: Array<Promise<boolean | undefined>> = []
  orderedComponents.forEach((component, index) => {
    const nextZ = index + 2
    if ((component.zIndex ?? 0) === nextZ) return
    component.zIndex = nextZ
    persistPromises.push(persistLayout(component, cloneComponentLayout(component)))
  })
  if (persistPromises.length) {
    await Promise.all(persistPromises)
  }
}

const getSelectedComponentsForAction = () => {
  if (selectedStageComponents.value.length) return [...selectedStageComponents.value]
  return activeComponent.value ? [activeComponent.value] : []
}

const bringSelectedComponentsToFront = async () => {
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const selectedIds = new Set(selected.map((component) => component.id))
  const ordered = buildZOrderedComponents()
  const nextOrdered = [
    ...ordered.filter((component) => !selectedIds.has(component.id)),
    ...ordered.filter((component) => selectedIds.has(component.id)),
  ]
  await applyOrderedZIndices(nextOrdered)
}

const sendSelectedComponentsToBack = async () => {
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const selectedIds = new Set(selected.map((component) => component.id))
  const ordered = buildZOrderedComponents()
  const nextOrdered = [
    ...ordered.filter((component) => selectedIds.has(component.id)),
    ...ordered.filter((component) => !selectedIds.has(component.id)),
  ]
  await applyOrderedZIndices(nextOrdered)
}

const moveSelectedComponentsForward = async () => {
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const selectedIds = new Set(selected.map((component) => component.id))
  const ordered = buildZOrderedComponents()
  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    if (selectedIds.has(ordered[index].id) && !selectedIds.has(ordered[index + 1].id)) {
      ;[ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]]
    }
  }
  await applyOrderedZIndices(ordered)
}

const moveSelectedComponentsBackward = async () => {
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const selectedIds = new Set(selected.map((component) => component.id))
  const ordered = buildZOrderedComponents()
  for (let index = 1; index < ordered.length; index += 1) {
    if (selectedIds.has(ordered[index].id) && !selectedIds.has(ordered[index - 1].id)) {
      ;[ordered[index], ordered[index - 1]] = [ordered[index - 1], ordered[index]]
    }
  }
  await applyOrderedZIndices(ordered)
}

const duplicateSelectedComponents = async () => {
  if (!currentDashboard.value) return
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const nextSelectedIds: number[] = []
  for (const [index, component] of selected.entries()) {
    const duplicated = await addDashboardComponent(currentDashboard.value.id, {
      chartId: component.chartId,
      posX: component.posX + 24 * (index + 1),
      posY: component.posY + 24 * (index + 1),
      width: component.width,
      height: component.height,
      zIndex: getMaxZ() + 1,
      configJson: component.configJson ?? '',
    })
    normalizeLayout(duplicated)
    components.value.push(duplicated)
    nextSelectedIds.push(duplicated.id)
    pushUndoEntry({ type: 'add-component', component: cloneComponentSnapshot(duplicated) })
  }
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  setSelectedComponents(nextSelectedIds, nextSelectedIds.at(-1) ?? null)
  await nextTick()
  await Promise.all(nextSelectedIds.map(async (componentId) => {
    const duplicated = components.value.find((item) => item.id === componentId)
    if (!duplicated) return
    await loadComponentData(duplicated)
  }))
  ElMessage.success(nextSelectedIds.length > 1 ? `已复制 ${nextSelectedIds.length} 个组件` : '组件已复制')
}

const removeSelectedComponents = async () => {
  const selected = getSelectedComponentsForAction()
  hideComponentContextMenu()
  if (!selected.length) return
  const message = selected.length > 1
    ? `确定删除当前选中的 ${selected.length} 个组件吗？`
    : `确定删除组件「${getComponentDisplayName(selected[0])}」吗？`
  try {
    await ElMessageBox.confirm(message, '删除组件', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      draggable: true,
    })
    for (const component of selected) {
      await removeComponent(component.id, { silent: true })
    }
    clearComponentSelection()
    ElMessage.success(selected.length > 1 ? `已删除 ${selected.length} 个组件` : '组件已移除')
  } catch {
    // 用户取消删除
  }
}

const handleRemoveActiveComponent = async () => {
  if (!activeComponent.value) return
  await removeComponent(activeComponent.value.id)
}

const previewActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const component = activeComponent.value
  if (!component) return
  await syncComponentPreview(component, payload)
}

const saveActiveComponent = async (payload: { chartId: number; configJson: string }) => {
  const component = activeComponent.value
  if (!component || !currentDashboard.value) return
  const before = {
    chartId: component.chartId,
    configJson: component.configJson ?? '',
  }
  const updated = await updateDashboardComponent(currentDashboard.value.id, component.id, payload)
  const next = {
    chartId: updated.chartId ?? payload.chartId,
    configJson: updated.configJson ?? payload.configJson,
  }
  await syncComponentPreview(component, next)
  if (before.chartId !== next.chartId || before.configJson !== next.configJson) {
    pushUndoEntry({ type: 'component-config', componentId: component.id, before, after: next })
  }
  ElMessage.success('组件实例配置已保存')
}

const persistLayout = async (component: DashboardComponent, layout: ComponentLayoutSnapshot = cloneComponentLayout(component)) => {
  if (!currentDashboard.value) return
  try {
    await updateDashboardComponent(currentDashboard.value.id, component.id, {
      posX: layout.posX,
      posY: layout.posY,
      width: layout.width,
      height: layout.height,
      zIndex: layout.zIndex,
    })
    return true
  } catch {
    ElMessage.warning('布局保存失败，请重试')
    return false
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
  startZIndex: number
  handle?: ResizeHandle
}

interface InteractionPreview {
  compId: number
  nextX: number
  nextY: number
  nextWidth: number
  nextHeight: number
  transform: string
  transformOrigin: string
  guideVertical: number[]
  guideHorizontal: number[]
}

interface SnapMatch {
  delta: number
  line: number
}

let interaction: InteractionState | null = null
const interactionPreview = shallowRef<InteractionPreview | null>(null)
const resizeHandles: ResizeHandle[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw']
const SNAP_TOLERANCE = 6

const findComponent = (id: number) => components.value.find((item) => item.id === id)

const resizeInteractionChart = (componentId: number) => {
  chartInstances.get(componentId)?.resize()
}

const getResizeTransformOrigin = (handle: ResizeHandle) => {
  const horizontal = handle.includes('w') ? 'right' : handle.includes('e') ? 'left' : 'center'
  const vertical = handle.includes('n') ? 'bottom' : handle.includes('s') ? 'top' : 'center'
  return `${horizontal} ${vertical}`
}

const normalizeGuideLines = (lines: number[], max: number) => Array.from(new Set(
  lines
    .map((line) => Math.round(line))
    .filter((line) => line >= 0 && line <= max)
))

const collectSnapTargets = (componentId: number) => {
  const vertical = [overlayConfig.x, overlayConfig.x + overlayConfig.w / 2, overlayConfig.x + overlayConfig.w]
  const horizontal = [overlayConfig.y, overlayConfig.y + overlayConfig.h / 2, overlayConfig.y + overlayConfig.h]

  components.value.forEach((item) => {
    if (item.id === componentId) return
    vertical.push(item.posX, item.posX + item.width / 2, item.posX + item.width)
    horizontal.push(item.posY, item.posY + item.height / 2, item.posY + item.height)
  })

  return {
    vertical: normalizeGuideLines(vertical, canvasWorkWidth.value),
    horizontal: normalizeGuideLines(horizontal, canvasMinHeight.value),
  }
}

const findNearestSnapMatch = (sourceLines: number[], targetLines: number[]): SnapMatch | null => {
  let bestMatch: SnapMatch | null = null

  sourceLines.forEach((sourceLine) => {
    targetLines.forEach((targetLine) => {
      const delta = targetLine - sourceLine
      if (Math.abs(delta) > SNAP_TOLERANCE) return
      if (!bestMatch || Math.abs(delta) < Math.abs(bestMatch.delta)) {
        bestMatch = { delta, line: targetLine }
      }
    })
  })

  return bestMatch
}

const buildInteractionGuideLines = (
  nextX: number,
  nextY: number,
  nextWidth: number,
  nextHeight: number,
  guideVertical?: number[],
  guideHorizontal?: number[],
) => ({
  vertical: normalizeGuideLines(
    guideVertical?.length ? guideVertical : [nextX, nextX + nextWidth / 2, nextX + nextWidth],
    canvasWorkWidth.value,
  ),
  horizontal: normalizeGuideLines(
    guideHorizontal?.length ? guideHorizontal : [nextY, nextY + nextHeight / 2, nextY + nextHeight],
    canvasMinHeight.value,
  ),
})

const interactionGuideLines = computed(() => {
  const preview = interactionPreview.value
  if (!preview) {
    return { vertical: [] as number[], horizontal: [] as number[] }
  }
  return {
    vertical: preview.guideVertical,
    horizontal: preview.guideHorizontal,
  }
})

const applyInteractionFrame = () => {
  interactionFrame = null
  if (!interaction || !pendingPointer) return
  const component = findComponent(interaction.compId)
  if (!component) return

  const scale = canvasScale.value || 1
  const dx = (pendingPointer.x - interaction.startMouseX) / scale
  const dy = (pendingPointer.y - interaction.startMouseY) / scale

  if (interaction.mode === 'move') {
    const maxX = Math.max(0, getCanvasWidth() - interaction.startWidth)
    let nextX = Math.min(maxX, Math.max(0, interaction.startX + dx))
    let nextY = Math.max(0, interaction.startY + dy)
    const snapTargets = collectSnapTargets(component.id)
    const verticalMatch = findNearestSnapMatch(
      [nextX, nextX + interaction.startWidth / 2, nextX + interaction.startWidth],
      snapTargets.vertical,
    )
    const horizontalMatch = findNearestSnapMatch(
      [nextY, nextY + interaction.startHeight / 2, nextY + interaction.startHeight],
      snapTargets.horizontal,
    )

    if (verticalMatch) {
      const snappedX = nextX + verticalMatch.delta
      if (snappedX >= 0 && snappedX <= maxX) {
        nextX = snappedX
      }
    }
    if (horizontalMatch) {
      const snappedY = nextY + horizontalMatch.delta
      if (snappedY >= 0) {
        nextY = snappedY
      }
    }

    const roundedX = Math.round(nextX)
    const roundedY = Math.round(nextY)
    const guideLines = buildInteractionGuideLines(
      roundedX,
      roundedY,
      interaction.startWidth,
      interaction.startHeight,
      verticalMatch ? [verticalMatch.line] : undefined,
      horizontalMatch ? [horizontalMatch.line] : undefined,
    )
    interactionPreview.value = {
      compId: component.id,
      nextX: roundedX,
      nextY: roundedY,
      nextWidth: interaction.startWidth,
      nextHeight: interaction.startHeight,
      transform: `translate(${Math.round(roundedX - interaction.startX)}px, ${Math.round(roundedY - interaction.startY)}px)`,
      transformOrigin: 'left top',
      guideVertical: guideLines.vertical,
      guideHorizontal: guideLines.horizontal,
    }
  } else {
    const handle = interaction.handle ?? 'se'
    let nextX = interaction.startX
    let nextY = interaction.startY
    let nextWidth = interaction.startWidth
    let nextHeight = interaction.startHeight
    const canvasWidth = getCanvasWidth()
    const snapTargets = collectSnapTargets(component.id)
    let snapVerticalLine: number[] | undefined
    let snapHorizontalLine: number[] | undefined

    if (handle.includes('e')) {
      nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX))
      const match = findNearestSnapMatch([nextX + nextWidth], snapTargets.vertical)
      if (match) {
        const snappedWidth = match.line - nextX
        if (snappedWidth >= MIN_CARD_WIDTH && nextX + snappedWidth <= canvasWidth) {
          nextWidth = snappedWidth
          snapVerticalLine = [match.line]
        }
      }
    }
    if (handle.includes('s')) {
      nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy)
      const match = findNearestSnapMatch([nextY + nextHeight], snapTargets.horizontal)
      if (match) {
        const snappedHeight = match.line - nextY
        if (snappedHeight >= MIN_CARD_HEIGHT) {
          nextHeight = snappedHeight
          snapHorizontalLine = [match.line]
        }
      }
    }
    if (handle.includes('w')) {
      const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH
      nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft)
      nextWidth = interaction.startWidth - (nextX - interaction.startX)
      const match = findNearestSnapMatch([nextX], snapTargets.vertical)
      if (match) {
        const snappedX = Math.min(Math.max(0, match.line), maxLeft)
        const snappedWidth = interaction.startWidth - (snappedX - interaction.startX)
        if (snappedWidth >= MIN_CARD_WIDTH) {
          nextX = snappedX
          nextWidth = snappedWidth
          snapVerticalLine = [snappedX]
        }
      }
    }
    if (handle.includes('n')) {
      const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT
      nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop)
      nextHeight = interaction.startHeight - (nextY - interaction.startY)
      const match = findNearestSnapMatch([nextY], snapTargets.horizontal)
      if (match) {
        const snappedY = Math.min(Math.max(0, match.line), maxTop)
        const snappedHeight = interaction.startHeight - (snappedY - interaction.startY)
        if (snappedHeight >= MIN_CARD_HEIGHT) {
          nextY = snappedY
          nextHeight = snappedHeight
          snapHorizontalLine = [snappedY]
        }
      }
    }

    const roundedX = Math.round(nextX)
    const roundedY = Math.round(nextY)
    const roundedWidth = Math.round(nextWidth)
    const roundedHeight = Math.round(nextHeight)
    const guideLines = buildInteractionGuideLines(
      roundedX,
      roundedY,
      roundedWidth,
      roundedHeight,
      snapVerticalLine,
      snapHorizontalLine,
    )

    interactionPreview.value = {
      compId: component.id,
      nextX: roundedX,
      nextY: roundedY,
      nextWidth: roundedWidth,
      nextHeight: roundedHeight,
      transform: `translate(${Math.round(roundedX - interaction.startX)}px, ${Math.round(roundedY - interaction.startY)}px) scale(${roundedWidth / interaction.startWidth}, ${roundedHeight / interaction.startHeight})`,
      transformOrigin: getResizeTransformOrigin(handle),
      guideVertical: guideLines.vertical,
      guideHorizontal: guideLines.horizontal,
    }
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
  interactionPreview.value = null
  document.body.classList.remove('canvas-interacting')
}

const startDrag = (event: MouseEvent, component: DashboardComponent) => {
  hideComponentContextMenu()
  const startZIndex = component.zIndex ?? 0
  const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id)
  focusComponent(component, { preserveSelection, bringToFront: !preserveSelection })
  interaction = {
    mode: 'move',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
    startZIndex,
  }
  pendingPointer = { x: event.clientX, y: event.clientY }
  document.body.classList.add('canvas-interacting')
  document.addEventListener('mousemove', onPointerMove)
  document.addEventListener('mouseup', onPointerUp)
}

const startResize = (event: MouseEvent, component: DashboardComponent, handle: ResizeHandle = 'se') => {
  hideComponentContextMenu()
  const startZIndex = component.zIndex ?? 0
  const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id)
  focusComponent(component, { preserveSelection, bringToFront: !preserveSelection })
  interaction = {
    mode: 'resize',
    compId: component.id,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: component.posX,
    startY: component.posY,
    startWidth: component.width,
    startHeight: component.height,
    startZIndex,
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
  const finalizedInteraction = interaction
  const component = findComponent(finalizedInteraction.compId)
  if (pendingPointer) {
    applyInteractionFrame()
  }
  const preview = interactionPreview.value?.compId === finalizedInteraction.compId ? { ...interactionPreview.value } : null
  interaction = null
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame()
  if (component) {
    const before: ComponentLayoutSnapshot = {
      posX: finalizedInteraction.startX,
      posY: finalizedInteraction.startY,
      width: finalizedInteraction.startWidth,
      height: finalizedInteraction.startHeight,
      zIndex: finalizedInteraction.startZIndex,
    }
    const next: ComponentLayoutSnapshot = preview
      ? {
          posX: preview.nextX,
          posY: preview.nextY,
          width: preview.nextWidth,
          height: preview.nextHeight,
          zIndex: Math.max(0, Math.round(Number(component.zIndex) || before.zIndex)),
        }
      : cloneComponentLayout(component)
    applyComponentLayoutSnapshot(component, next)
    await nextTick()
    resizeInteractionChart(component.id)
    const persisted = await persistLayout(component, next)
    if (persisted && !layoutSnapshotsEqual(before, next)) {
      pushUndoEntry({ type: 'layout', componentId: component.id, before, after: next })
    }
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
    clearUndoHistory()
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

const undoLastChange = async () => {
  const dashboard = currentDashboard.value
  const entry = undoStack.value[undoStack.value.length - 1]
  if (!dashboard || !entry || undoApplying.value) return

  const remaining = undoStack.value.slice(0, -1)
  undoStack.value = remaining
  undoApplying.value = true
  try {
    if (entry.type === 'layout') {
      const component = findComponent(entry.componentId)
      if (!component) throw new Error('目标组件不存在，无法撤销布局修改')
      applyComponentLayoutSnapshot(component, entry.before)
      await nextTick()
      resizeInteractionChart(component.id)
      const restored = await persistLayout(component, entry.before)
      if (!restored) throw new Error('布局撤销失败')
    } else if (entry.type === 'component-config') {
      const component = findComponent(entry.componentId)
      if (!component) throw new Error('目标组件不存在，无法撤销配置修改')
      await updateDashboardComponent(dashboard.id, component.id, {
        chartId: entry.before.chartId,
        configJson: entry.before.configJson,
      })
      await syncComponentPreview(component, entry.before)
    } else if (entry.type === 'overlay') {
      applyOverlaySnapshot(entry.before)
      await updateCanvasConfig({ overlay: cloneOverlaySnapshot(entry.before) })
      lastSavedOverlaySnapshot.value = cloneOverlaySnapshot(entry.before)
    } else if (entry.type === 'add-component') {
      const component = findComponent(entry.component.id)
      if (component) {
        await removeDashboardComponent(dashboard.id, component.id)
        disposeChartInstance(component.id)
        deleteComponentData(component.id)
        components.value = components.value.filter((item) => item.id !== component.id)
        if (activeCompId.value === component.id) activeCompId.value = null
        dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, components.value.length)
      }
    } else if (entry.type === 'remove-component') {
      const restored = await addDashboardComponent(dashboard.id, {
        chartId: entry.component.chartId,
        posX: entry.component.posX,
        posY: entry.component.posY,
        width: entry.component.width,
        height: entry.component.height,
        zIndex: entry.component.zIndex,
        configJson: entry.component.configJson,
      })
      normalizeLayout(restored)
      components.value.push(restored)
      activeCompId.value = restored.id
      dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, components.value.length)
      await nextTick()
      await loadComponentData(restored)
    }
    ElMessage.success('已撤销最近一次修改')
  } catch (error) {
    undoStack.value = [...remaining, entry].slice(-3)
    ElMessage.error(error instanceof Error ? error.message : '撤销失败')
  } finally {
    undoApplying.value = false
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
    const uploaded = await uploadImage(file, { filename: file.name })
    if (!uploaded.url) {
      throw new Error('Upload failed')
    }
    overlayConfig.bgImage = uploaded.url
    await saveOverlay()
    ElMessage.success('背景图片上传成功')
  } catch {
    ElMessage.error('图片上传失败')
  } finally {
    bgImgUploading.value = false
    input.value = ''
  }
}

const waitForPaint = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => resolve())
  })
})

const copyCanvasPixelsToClone = (originalRoot: HTMLElement, clonedRoot: HTMLElement) => {
  const originalCanvases = originalRoot.querySelectorAll('canvas')
  const clonedCanvases = clonedRoot.querySelectorAll('canvas')
  originalCanvases.forEach((orig, idx) => {
    const cloned = clonedCanvases[idx]
    if (!cloned) return
    cloned.width = orig.width
    cloned.height = orig.height
    const ctx = cloned.getContext('2d')
    if (ctx) ctx.drawImage(orig, 0, 0)
  })
}

const prepareCaptureClone = (clonedDocument: Document, originalTarget: HTMLElement) => {
  const clonedStage = clonedDocument.querySelector('.screen-stage') as HTMLElement | null
  if (!clonedStage) return
  clonedStage.classList.add('screen-stage--capturing')
  clonedStage.style.transform = 'none'
  clonedStage.style.transformOrigin = '0 0'
  clonedStage.querySelectorAll('.stage-card.active').forEach((element) => element.classList.remove('active'))
  clonedStage.querySelectorAll('.canvas-curtain--selected').forEach((element) => element.classList.remove('canvas-curtain--selected'))
  copyCanvasPixelsToClone(originalTarget, clonedStage)
}

const captureScreenCover = async () => {
  const dashboard = currentDashboard.value
  const stage = canvasRef.value
  if (!dashboard || !stage) {
    ElMessage.warning('请先选择大屏并等待画布加载完成')
    return
  }

  const previousActiveCompId = activeCompId.value
  const previousOverlaySelected = overlaySelected.value
  const previousCanvasScale = canvasScale.value

  coverSaving.value = true
  capturingCover.value = true
  activeCompId.value = null
  overlaySelected.value = false
  canvasScale.value = 1

  try {
    await nextTick()
    await waitForPaint()
    handleWindowResize()
    await waitForPaint()

    const captureOptions = {
      backgroundColor: null,
      useCORS: true,
      logging: false,
      scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
      x: overlayConfig.x,
      y: overlayConfig.y,
      width: overlayConfig.w,
      height: overlayConfig.h,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(stage.scrollWidth, overlayConfig.x + overlayConfig.w),
      windowHeight: Math.max(stage.scrollHeight, overlayConfig.y + overlayConfig.h),
      onclone: (clonedDocument: Document) => prepareCaptureClone(clonedDocument, stage),
    }
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(stage, captureOptions as Parameters<typeof html2canvas>[1])
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((result: Blob | null) => resolve(result), 'image/png'))
    if (!blob) {
      throw new Error('封面截图生成失败')
    }
    const uploaded = await uploadImage(blob, {
      category: 'index',
      filename: `screen-cover-${dashboard.id}-${Date.now()}.png`,
    })
    const configJson = buildReportConfig(dashboard.configJson, 'screen', undefined, undefined, {
      url: uploaded.url,
      updatedAt: new Date().toISOString(),
    })
    const updated = await updateDashboard(dashboard.id, { configJson })
    currentDashboard.value = updated
    dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item)
    ElMessage.success('大屏封面已更新')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '封面截图失败')
  } finally {
    capturingCover.value = false
    activeCompId.value = previousActiveCompId
    overlaySelected.value = previousOverlaySelected
    canvasScale.value = previousCanvasScale
    await nextTick()
    handleWindowResize()
    coverSaving.value = false
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

const getChartDatasetName = (datasetId: number | '' | null | undefined, chartType: string) => {
  const datasetName = datasetMap.value.get(Number(datasetId) || -1)?.name
  if (datasetName) return datasetName
  return isStaticWidgetChartType(chartType) ? '静态组件' : '未关联数据集'
}

const getTemplateDatasetName = (template: ChartTemplate) => {
  const asset = normalizeComponentAssetConfig(template.configJson)
  return getChartDatasetName(asset.chart.datasetId, asset.chart.chartType || template.chartType)
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
    // 无拖拽坐标时，放在背景板顶部中间
    const cx = Math.max(0, Math.round((overlayConfig.w - width) / 2) + overlayConfig.x)
    const cy = overlayConfig.y + 16
    return { posX: cx, posY: cy, width, height }
  }
  const rect = canvasRef.value.getBoundingClientRect()
  const scale = canvasScale.value || 1
  const posX = Math.max(0, Math.min(getCanvasWidth() - width, (point.clientX - rect.left) / scale - width / 2))
  const posY = Math.max(0, (point.clientY - rect.top) / scale - 28)
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
  point?: { clientX: number; clientY: number },
  options: { trackUndo?: boolean; silent?: boolean } = {}
) => {
  if (!currentDashboard.value) {
    ElMessage.warning('请先选择大屏')
    return
  }
  const nextSize = size ?? {
    width: chart.chartType === 'table' ? 760 : chart.chartType === 'filter_button' ? 200 : 520,
    height: chart.chartType === 'table' ? 340 : chart.chartType === 'filter_button' ? 60 : 320,
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
  setSelectedComponents([component.id], component.id)
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  await nextTick()
  await loadComponentData(component)
  if (options.trackUndo !== false) {
    pushUndoEntry({ type: 'add-component', component: cloneComponentSnapshot(component) })
  }
  if (options.silent !== true) {
    ElMessage.success('组件已加入大屏')
  }
}

const addTemplateToScreen = async (template: ChartTemplate, point?: { clientX: number; clientY: number }) => {
  const asset = normalizeComponentAssetConfig(template.configJson)
  const chartType = asset.chart.chartType || template.chartType
  const datasetId = Number(asset.chart.datasetId)
  const hasDataset = Number.isFinite(datasetId) && datasetId > 0
  const createdChart = await createChart({
    name: asset.chart.name || template.name,
    datasetId: hasDataset ? datasetId : null,
    chartType,
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

const removeComponent = async (componentId: number, options: { trackUndo?: boolean; silent?: boolean } = {}) => {
  if (!currentDashboard.value) return
  const snapshot = components.value.find((item) => item.id === componentId)
  await removeDashboardComponent(currentDashboard.value.id, componentId)
  disposeChartInstance(componentId)
  deleteComponentData(componentId)
  components.value = components.value.filter((item) => item.id !== componentId)
  selectedComponentIds.value = selectedComponentIds.value.filter((id) => id !== componentId)
  if (activeCompId.value === componentId) {
    activeCompId.value = selectedComponentIds.value.at(-1) ?? null
  }
  dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length)
  if (snapshot && options.trackUndo !== false) {
    pushUndoEntry({ type: 'remove-component', component: cloneComponentSnapshot(snapshot) })
  }
  if (options.silent !== true) {
    ElMessage.success('组件已移除')
  }
}

const confirmRemoveComponent = async (component: DashboardComponent) => {
  try {
    await ElMessageBox.confirm(
      `确定从大屏中删除组件「${getComponentChartConfig(component).name || '组件'}」吗？`,
      '删除组件',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
      }
    )
    await removeComponent(component.id)
  } catch {
    // 用户取消删除
  }
}

const onTemplateDragStart = (event: DragEvent, template: ChartTemplate) => {
  selectedTemplateId.value = template.id
  hideTemplatePreview()
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
  if (!draggingTemplateId.value && !draggingChartId.value && !draggingTypeChip.value) return
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

  // Handle type chip drop (creates default component of that type)
  if (raw.startsWith('typechip:') || draggingTypeChip.value) {
    const chipType = draggingTypeChip.value ?? raw.replace('typechip:', '')
    draggingTypeChip.value = null
    draggingTemplateId.value = null
    draggingChartId.value = null
    // Find a built-in template matching the type, or the first matching template
    const matchingTemplate = templateAssets.value.find((t) => t.chartType === chipType && t.builtIn)
      ?? templateAssets.value.find((t) => t.chartType === chipType)
    if (matchingTemplate) {
      await addTemplateToScreen(matchingTemplate, { clientX: event.clientX, clientY: event.clientY })
    }
    return
  }

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

// ─── 类型芯片拖拽 ─────────────────────────────────────────────────────
const onTypeChipDragStart = (event: DragEvent, chipType: string) => {
  draggingTypeChip.value = chipType
  draggingTemplateId.value = null
  draggingChartId.value = null
  stageDropActive.value = true
  event.dataTransfer?.setData('text/plain', `typechip:${chipType}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

const onTypeChipDragEnd = () => {
  draggingTypeChip.value = null
  stageDropActive.value = false
}

// ─── 图层拖拽排序 ─────────────────────────────────────────────────────
const onLayerDragStart = (event: DragEvent, idx: number) => {
  layerDragFromIdx.value = idx
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `layer:${idx}`)
  }
}

const onLayerDragOver = (_event: DragEvent, idx: number) => {
  if (layerDragFromIdx.value === null) return
  layerDragOverIdx.value = idx
}

const onLayerDragLeave = () => {
  layerDragOverIdx.value = null
}

const onLayerDrop = async (_event: DragEvent, toIdx: number) => {
  layerDragOverIdx.value = null
  const fromIdx = layerDragFromIdx.value
  layerDragFromIdx.value = null
  if (fromIdx === null || fromIdx === toIdx) return

  // Reorder: layeredComponents is sorted highest-zIndex first.
  // After reorder, reassign zIndex so that item at index 0 has the highest z.
  const ordered = [...layeredComponents.value]
  const [moved] = ordered.splice(fromIdx, 1)
  ordered.splice(toIdx, 0, moved)

  // Assign descending zIndex starting from the count
  const baseZ = ordered.length + 1
  const persistPromises: Array<Promise<boolean | undefined>> = []
  for (let i = 0; i < ordered.length; i++) {
    const newZ = baseZ - i
    if (ordered[i].zIndex !== newZ) {
      ordered[i].zIndex = newZ
      persistPromises.push(persistLayout(ordered[i]))
    }
  }
  await Promise.all(persistPromises)
}

const onLayerDragEnd = () => {
  layerDragFromIdx.value = null
  layerDragOverIdx.value = null
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
  compactEditorMode.value = window.innerWidth <= COMPACT_EDITOR_BREAKPOINT
  chartInstances.forEach((instance) => instance.resize())
  scheduleCanvasFit()
}

onMounted(async () => {
  document.addEventListener('mousedown', hideComponentContextMenu)
  window.addEventListener('resize', handleWindowResize)
  handleWindowResize()
  await loadBaseData()
  await nextTick()
  handleStageScroll()
})

onBeforeUnmount(() => {
  componentDataLoadToken += 1
  disposeComponentVisibilityObserver()
  document.removeEventListener('mousedown', hideComponentContextMenu)
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  cleanupInteractionFrame()
  window.removeEventListener('resize', handleWindowResize)
  disposeCharts()
  if (sidebarHoverTimer !== null) { clearTimeout(sidebarHoverTimer); sidebarHoverTimer = null }
  if (templatePreviewHideTimer !== null) { clearTimeout(templatePreviewHideTimer); templatePreviewHideTimer = null }
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
  flex: 1;
  min-width: 0;
}

.screen-item-cover {
  width: 88px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid #d8e7f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dfeefe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f86a3;
  font-size: 12px;
}

.screen-item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.screen-item-cover--empty {
  background: linear-gradient(135deg, #f5f8fc 0%, #e8eff8 100%);
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
  min-height: 0;
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
  flex-wrap: wrap;
}

.screen-comp-count {
  font-size: 12px;
  color: #91aac8;
  margin-left: 4px;
}

.screen-cover-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: #edf7ff;
  color: #24527b;
  font-size: 12px;
}

.screen-cover-pill img {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  object-fit: cover;
}

.screen-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
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

.canvas-tb-zoom {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  flex-shrink: 0;
}

.canvas-tb-zoom :deep(.el-button) {
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  font-weight: 700;
  padding: 2px 6px;
}

.zoom-label {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  min-width: 40px;
  text-align: center;
  user-select: none;
}

.zoom-label:hover {
  color: rgba(255,255,255,0.9);
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

.stage-guide {
  position: absolute;
  z-index: 6;
  pointer-events: none;
  opacity: 0.9;
}

.stage-guide--vertical {
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed rgba(77, 215, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(77, 215, 255, 0.14);
}

.stage-guide--horizontal {
  left: 0;
  right: 0;
  height: 1px;
  border-top: 1px dashed rgba(77, 215, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(77, 215, 255, 0.14);
}

.screen-stage--drop {
  border-color: #7bc4ff;
  box-shadow: inset 0 0 0 2px rgba(123, 196, 255, 0.25);
}

.screen-stage--capturing .stage-card.active {
  border-color: transparent;
  box-shadow: none;
}

.screen-stage--capturing .stage-card.stage-card--selected {
  border-color: transparent;
  box-shadow: none;
}

.screen-stage--capturing .stage-marquee {
  display: none;
}

.screen-stage--capturing .stage-card-header,
.screen-stage--capturing .resize-handle,
.screen-stage--capturing .curtain-badge {
  opacity: 0 !important;
  pointer-events: none !important;
}

.screen-stage--capturing .canvas-curtain--selected {
  box-shadow: none;
  outline: none;
}

.stage-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border-radius: 18px;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  user-select: none;
  will-change: transform, width, height;
}

.stage-card.active {
  border-color: rgba(64, 158, 255, 0.92);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.stage-card--selected {
  border-color: rgba(64, 158, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.45);
}

.stage-marquee {
  position: absolute;
  z-index: 7;
  border: 1px solid rgba(77, 215, 255, 0.95);
  background: rgba(77, 215, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(77, 215, 255, 0.16);
  pointer-events: none;
}

.stage-card-header {
  position: absolute;
  top: 6px;
  left: 8px;
  right: 8px;
  z-index: 4;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  cursor: move;
  min-height: 22px;
  padding: 2px 2px 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.stage-card:hover .stage-card-header,
.stage-card.active .stage-card-header {
  opacity: 1;
  pointer-events: auto;
}

.stage-card-header-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stage-card-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(236, 244, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-card-meta {
  font-size: 11px;
  color: rgba(190, 212, 240, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-card-body {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.chart-canvas,
.table-wrapper {
  height: 100%;
}

.table-wrapper :deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
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

.filter-button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2px 4px;
}

.remove-btn {
  color: rgba(219, 231, 246, 0.76);
  cursor: pointer;
  padding: 2px 8px;
  min-height: 24px;
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

:global(body.canvas-interacting) .screen-stage,
:global(body.canvas-interacting) .screen-stage * {
  cursor: grabbing !important;
}

:global(body.canvas-interacting) .screen-stage .stage-card,
:global(body.canvas-interacting) .screen-stage .canvas-curtain,
:global(body.canvas-interacting) .screen-stage .resize-handle,
:global(body.canvas-interacting) .screen-stage .remove-btn {
  transition: none !important;
  box-shadow: none !important;
  filter: none !important;
}

:global(body.canvas-interacting) .screen-stage .stage-card-body,
:global(body.canvas-interacting) .screen-stage .stage-card-body *,
:global(body.canvas-interacting) .screen-stage .stage-card:not(.active),
:global(body.canvas-interacting) .screen-stage .canvas-curtain {
  pointer-events: none !important;
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
  grid-template-columns: v-bind("effectiveSidebarCollapsed ? '60px' : leftPanelWidth + 'px'") minmax(0, 1fr) v-bind("inspectorCollapsed ? '0px' : 'minmax(320px, 22vw)'");
  grid-template-rows: 1fr;
  gap: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.screen-root--editor .screen-main,
.screen-root--editor .screen-inspector {
  position: relative;
  z-index: 2;
}

.screen-root--editor .screen-toolbar {
  position: relative;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  background: linear-gradient(180deg, rgba(12, 20, 32, 0.96) 0%, rgba(7, 14, 24, 0.98) 100%);
  border: none;
  border-bottom: 1px solid rgba(110,188,255,0.08);
  border-radius: 0;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.02);
  margin: 0;
  padding: 12px 18px;
  flex-shrink: 0;
}

.screen-root--editor .screen-main {
  background: linear-gradient(180deg, #07111c 0%, #0a1420 100%);
}

.screen-root--editor .screen-inspector {
  min-width: 0;
  z-index: 3;
  background: linear-gradient(180deg, #0d1826 0%, #09121d 100%);
  border-left: 1px solid rgba(110,188,255,0.08);
  overflow: hidden;
}

.screen-root--editor .screen-title {
  color: rgba(255,255,255,0.92);
  font-size: 20px;
  letter-spacing: 0.02em;
}

.screen-root--editor .screen-comp-count {
  color: rgba(183,206,235,0.44);
}

.screen-root--editor .screen-title-row {
  flex: 1 1 260px;
  min-width: 0;
}

.screen-root--editor .screen-actions {
  flex: 1 1 480px;
  justify-content: flex-end;
  row-gap: 8px;
}

.screen-root--editor .screen-actions :deep(.el-button) {
  --el-button-bg-color: rgba(255,255,255,0.06);
  --el-button-border-color: rgba(255,255,255,0.1);
  --el-button-text-color: rgba(241,248,255,0.76);
  --el-button-hover-bg-color: rgba(255,255,255,0.12);
  border-radius: 10px;
  min-height: 32px;
  backdrop-filter: blur(14px);
}

.screen-root--editor .screen-actions :deep(.el-button--primary) {
  --el-button-bg-color: linear-gradient(135deg, #2594ff 0%, #1370ff 100%);
  --el-button-border-color: rgba(87,176,255,0.45);
  --el-button-text-color: #fff;
}

.screen-root--editor .screen-actions :deep(.el-divider--vertical) {
  border-color: rgba(255,255,255,0.15);
}

.screen-root--quiet .canvas-tb-tip,
.screen-root--quiet .screen-comp-count,
.screen-root--quiet .lp-pane-subtitle,
.screen-root--quiet .lp-library-note,
.screen-root--quiet .lp-layer-order-tip,
.screen-root--quiet .lp-layer-meta,
.screen-root--quiet .lp-ac-subline,
.screen-root--quiet .lp-hover-subtitle,
.screen-root--quiet .lp-hover-meta,
.screen-root--quiet .stage-card-meta {
  display: none;
}

.screen-root--quiet .stage-card-header {
  top: 4px;
  left: 6px;
  right: 6px;
  min-height: 18px;
}

.screen-root--quiet .screen-inspector :deep(.inspector-subtitle),
.screen-root--quiet .screen-inspector :deep(.summary-meta),
.screen-root--quiet .screen-inspector :deep(.profile-desc),
.screen-root--quiet .screen-inspector :deep(.mode-card-desc),
.screen-root--quiet .screen-inspector :deep(.health-text),
.screen-root--quiet .screen-inspector :deep(.preview-meta),
.screen-root--quiet .screen-inspector :deep(.suggestion-body),
.screen-root--quiet .screen-inspector :deep(.helper-text),
.screen-root--quiet .screen-inspector :deep(.hint-text) {
  display: none;
}

/* ─── 左侧综合面板 ───────────────────────────────────────────────────────────── */
.screen-left-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 0% 0%, rgba(61,148,255,0.14), transparent 26%),
    linear-gradient(180deg, #0d1b2e 0%, #091321 100%);
  border-right: 1px solid rgba(255,255,255,0.06);
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

@media (max-width: 1440px) {
  .screen-root--editor {
    grid-template-columns: 60px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .screen-root--editor .screen-toolbar {
    flex-wrap: nowrap;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .screen-root--editor .screen-title {
    font-size: 18px;
  }

  .screen-root--editor .screen-title-row,
  .screen-root--editor .screen-actions,
  .canvas-topbar {
    flex-wrap: nowrap;
    min-width: 0;
  }

  .screen-root--editor .screen-actions,
  .canvas-topbar {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }

  .screen-root--editor .screen-actions {
    flex: 1 1 auto;
    justify-content: flex-start;
    padding-bottom: 2px;
  }

  .canvas-topbar {
    gap: 8px;
    padding: 6px 10px;
  }

  .canvas-tb-tip {
    flex: 1 0 auto;
    white-space: nowrap;
  }

  .screen-root--editor .screen-inspector {
    grid-column: 1 / -1;
    grid-row: 2;
    max-height: min(180px, 28vh);
    overflow: auto;
    border-top: 1px solid rgba(255,255,255,0.08);
    background: #0d1622;
  }

  .screen-root--editor .bg-inspector {
    padding-bottom: 12px;
  }
}

.lp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
  flex-shrink: 0;
}

.lp-toggle-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04));
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.lp-toggle-btn:hover {
  background: rgba(77,179,255,0.14);
  border-color: rgba(77,179,255,0.24);
  transform: translateY(-1px);
}

.lp-toggle-icon {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  line-height: 1;
}

.lp-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lp-overline {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(122,185,255,0.62);
}

.lp-head-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.lp-head-pill {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(221,236,255,0.72);
  font-size: 11px;
  font-weight: 600;
}

.lp-head-pill--accent {
  background: rgba(77,179,255,0.14);
  border-color: rgba(77,179,255,0.22);
  color: #cfeaff;
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
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-shell {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.95fr);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(7, 18, 32, 0.18), rgba(7, 18, 32, 0.34));
}

.lp-shell--dual {
  align-items: stretch;
}

.lp-primary-menu {
  width: 68px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: rgba(5, 12, 22, 0.28);
}

.lp-primary-item {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  border-radius: 10px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.lp-primary-item:hover,
.lp-primary-item--active {
  background: rgba(77,155,255,0.14);
  color: #4db3ff;
}

.lp-primary-item-icon {
  font-size: 16px;
}

.lp-primary-item-label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.lp-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lp-pane--components {
  border-right: 1px solid rgba(255,255,255,0.06);
}

.lp-pane--layers {
  background: rgba(3, 10, 20, 0.22);
}

.lp-pane-head {
  padding: 14px 14px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}

.lp-pane-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
}

.lp-pane-subtitle {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(188,214,240,0.46);
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px 8px 8px;
}

.lp-type-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 5px 7px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.03);
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
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
  color: rgba(174,206,239,0.52);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lp-library-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 10px;
  padding: 0 8px 10px;
}

.lp-library-head {
  padding: 8px 6px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 8px;
}

.lp-library-kicker {
  font-size: 12px;
  font-weight: 700;
  color: rgba(228,240,255,0.9);
}

.lp-library-note {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(178,205,232,0.46);
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

.lp-library-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.lp-asset-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 2px 2px 8px;
}

.lp-preview-float {
  position: absolute;
  width: 220px;
  min-width: 220px;
  max-width: calc(100% - 24px);
  z-index: 8;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 16px;
  border: 1px solid rgba(110,188,255,0.12);
  background: linear-gradient(180deg, rgba(10,19,31,0.98) 0%, rgba(8,15,24,0.98) 100%);
  box-shadow: 0 20px 48px rgba(0,0,0,0.28);
  padding: 12px;
}

.lp-preview-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lp-preview-state {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(77,179,255,0.1);
  border: 1px solid rgba(77,179,255,0.18);
  color: rgba(216,239,255,0.82);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.lp-asset-card {
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(0,0,0,0.14);
}

.lp-asset-card:hover {
  border-color: rgba(77,179,255,0.3);
  background: linear-gradient(180deg, rgba(77,179,255,0.12), rgba(255,255,255,0.04));
  transform: translateY(-1px);
}

.lp-asset-card--selected {
  border-color: rgba(77,179,255,0.6);
  background: linear-gradient(180deg, rgba(77,179,255,0.16), rgba(255,255,255,0.05));
  box-shadow: 0 12px 28px rgba(10,44,80,0.34);
}

.lp-asset-card--builtin {
  border-color: rgba(52,187,131,0.3);
  background: linear-gradient(180deg, rgba(52,187,131,0.1), rgba(255,255,255,0.03));
}

.lp-asset-card--builtin:hover {
  border-color: rgba(52,187,131,0.5);
  background: rgba(52,187,131,0.1);
}

.lp-asset-card--compact {
  padding: 10px 12px;
  border-radius: 12px;
  box-shadow: none;
}

.lp-asset-card--compact .lp-ac-row {
  align-items: flex-start;
}

.lp-ac-subline {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lp-ac-size {
  font-size: 11px;
  color: rgba(186,213,238,0.58);
}

.lp-ac-lite-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(232,242,255,0.72);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.lp-ac-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.lp-ac-preview {
  position: relative;
  margin-top: 10px;
  min-height: 62px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  overflow: hidden;
}

.lp-ac-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.34;
}

.lp-ac-preview--data {
  background: linear-gradient(135deg, rgba(37,148,255,0.16), rgba(16,54,95,0.46));
}

.lp-ac-preview--static {
  background: linear-gradient(135deg, rgba(84,112,255,0.16), rgba(36,57,112,0.44));
}

.lp-ac-preview--decoration {
  background: linear-gradient(135deg, rgba(66,209,176,0.14), rgba(9,65,82,0.42));
}

.lp-ac-preview-icon,
.lp-ac-preview-badge {
  position: relative;
  z-index: 1;
}

.lp-ac-preview-icon {
  display: inline-flex;
  width: 42px;
  height: 30px;
  color: #dff4ff;
}

.lp-ac-preview-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.lp-ac-preview-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(240,248,255,0.86);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.lp-ac-meta {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lp-ac-desc,
.lp-ac-field {
  font-size: 11px;
  line-height: 1.5;
}

.lp-ac-desc {
  color: rgba(222,236,255,0.68);
}

.lp-ac-field {
  color: rgba(138,196,255,0.72);
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
  margin-top: 8px;
  gap: 8px;
}

.lp-ac-hint {
  font-size: 11px;
  color: rgba(180,208,238,0.46);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.lp-ac-add {
  font-size: 11px !important;
  flex-shrink: 0;
}

:deep(.lp-preview-popper) {
  border-radius: 16px;
  border: 1px solid rgba(110,188,255,0.12);
  background: linear-gradient(180deg, rgba(10,19,31,0.98) 0%, rgba(8,15,24,0.98) 100%);
  box-shadow: 0 20px 48px rgba(0,0,0,0.35);
  padding: 12px;
}

:deep(.lp-preview-popper .el-popper__arrow::before) {
  border-color: rgba(110,188,255,0.12);
  background: rgba(10,19,31,0.98);
}

.lp-hover-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lp-hover-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.lp-hover-title {
  font-size: 14px;
  font-weight: 700;
  color: #eef7ff;
}

.lp-hover-subtitle {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(180,208,238,0.56);
}

.lp-hover-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(77,179,255,0.12);
  border: 1px solid rgba(77,179,255,0.18);
  color: #d8efff;
  font-size: 10px;
  font-weight: 700;
}

.lp-hover-stage {
  height: 132px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(110,188,255,0.12);
  background: radial-gradient(circle at top, rgba(77,179,255,0.12), transparent 36%), linear-gradient(180deg, rgba(10,24,40,0.95), rgba(8,17,28,0.96));
}

.lp-hover-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
}

.lp-hover-chart::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.28;
}

.lp-hover-chart--data {
  background: linear-gradient(135deg, rgba(36,126,255,0.18), rgba(17,44,93,0.3));
}

.lp-hover-chart--static {
  background: linear-gradient(135deg, rgba(98,92,255,0.16), rgba(25,40,88,0.3));
}

.lp-hover-chart--decoration {
  background: linear-gradient(135deg, rgba(38,183,153,0.16), rgba(12,53,65,0.3));
}

.lp-hover-chart-icon,
.lp-hover-chart-label {
  position: relative;
  z-index: 1;
}

.lp-hover-chart-icon {
  width: 82px;
  height: 56px;
  color: #ddf4ff;
}

.lp-hover-chart-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.lp-hover-chart-label {
  color: rgba(232,244,255,0.86);
  font-size: 13px;
  font-weight: 700;
}

.lp-hover-meta {
  font-size: 12px;
  line-height: 1.65;
  color: rgba(193,216,240,0.68);
}

.lp-layer-order-tip {
  padding: 10px 12px 6px;
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(255,255,255,0.34);
}

.lp-layer-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 10px 10px;
}

.lp-layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.lp-layer-item:hover {
  background: rgba(77,179,255,0.06);
  border-color: rgba(77,179,255,0.28);
}

.lp-layer-item--active {
  background: rgba(77,179,255,0.12);
  border-color: rgba(77,179,255,0.58);
}

.screen-context-menu {
  position: fixed;
  z-index: 4000;
  min-width: 168px;
  padding: 8px 0;
  border-radius: 12px;
  border: 1px solid rgba(113, 194, 255, 0.18);
  background: linear-gradient(180deg, rgba(14, 24, 38, 0.98) 0%, rgba(9, 17, 28, 0.98) 100%);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
}

.screen-context-menu__item {
  width: 100%;
  border: none;
  background: transparent;
  color: rgba(228, 241, 255, 0.88);
  font-size: 13px;
  text-align: left;
  padding: 9px 14px;
  cursor: pointer;
}

.screen-context-menu__item:hover {
  background: rgba(77, 179, 255, 0.12);
}

.screen-context-menu__item--danger {
  color: rgba(255, 151, 151, 0.96);
}

.screen-context-menu__divider {
  height: 1px;
  margin: 6px 0;
  background: rgba(255, 255, 255, 0.08);
}

.lp-layer-item--drag-over {
  border-color: rgba(77,179,255,0.8);
  background: rgba(77,179,255,0.18);
  box-shadow: 0 0 0 2px rgba(77,179,255,0.25);
}

.lp-layer-drag-handle {
  cursor: grab;
  color: rgba(255,255,255,0.3);
  font-size: 14px;
  user-select: none;
  flex-shrink: 0;
}

.lp-layer-item:hover .lp-layer-drag-handle {
  color: rgba(255,255,255,0.6);
}

.lp-layer-item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lp-layer-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.86);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-layer-meta {
  font-size: 11px;
  color: rgba(255,255,255,0.38);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-layer-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 210, 80, 0.16);
  color: #ffd250;
  font-size: 10px;
  font-weight: 600;
}

.lp-layer-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.lp-layer-actions :deep(.el-button) {
  font-size: 11px;
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