<template>
  <div class="inspector-shell">
    <div class="inspector-head">
      <div class="inspector-title">组件属性</div>
      <div class="inspector-subtitle">当前编辑的是组件实例，不会影响其他看板中的同类组件。</div>
    </div>

    <el-empty
      v-if="!component || !chart"
      description="请选择画布中的组件开始编辑。"
      :image-size="72"
      class="inspector-empty"
    />

    <template v-else>
      <el-tabs v-model="activeTab" class="inspector-tabs" stretch>
        <el-tab-pane label="概览" name="summary">
          <section class="inspector-section">
            <div class="section-title">组件概览</div>
            <div class="summary-card">
              <div class="summary-name">{{ configForm.chart.name || chart.name }}</div>
              <div class="summary-tags">
                <el-tag size="small" type="info">{{ chartTypeLabel(configForm.chart.chartType) }}</el-tag>
                <el-tag size="small" effect="plain">{{ scene === 'screen' ? '大屏组件' : '仪表板组件' }}</el-tag>
              </div>
              <div class="summary-meta">实例 ID: {{ component.id }} / 引用组件 ID: {{ component.chartId }}</div>
            </div>
          </section>

          <section class="inspector-section">
            <div class="section-title">配置健康度</div>
            <div class="health-card" :class="{ 'health-card--warning': missingFields.length }">
              <div class="health-head">
                <span>{{ currentChartMeta.label }}</span>
                <el-tag :type="missingFields.length ? 'warning' : 'success'" size="small">
                  {{ missingFields.length ? '待补充' : '可预览' }}
                </el-tag>
              </div>
              <div class="health-text">{{ currentChartMeta.description }}</div>
              <div v-if="missingFields.length" class="health-list">
                缺少：{{ missingFields.join('、') }}
              </div>
              <div v-else class="health-list">
                当前配置满足画布预览要求，可直接联动预览与保存。
              </div>
            </div>
          </section>

          <section class="inspector-section">
            <div class="section-title">布局设置</div>
            <div class="layout-grid">
              <label class="field-item">
                <span>X</span>
                <el-input-number :model-value="layoutForm.posX" :min="0" controls-position="right" @change="handlePosXChange" />
              </label>
              <label class="field-item">
                <span>Y</span>
                <el-input-number :model-value="layoutForm.posY" :min="0" controls-position="right" @change="handlePosYChange" />
              </label>
              <label class="field-item">
                <span>宽度</span>
                <el-input-number :model-value="layoutForm.width" :min="320" controls-position="right" @change="handleWidthChange" />
              </label>
              <label class="field-item">
                <span>高度</span>
                <el-input-number :model-value="layoutForm.height" :min="220" controls-position="right" @change="handleHeightChange" />
              </label>
              <label class="field-item field-item--full">
                <span>层级</span>
                <el-input-number :model-value="layoutForm.zIndex" :min="0" controls-position="right" @change="handleZIndexChange" />
              </label>
            </div>
            <div class="action-row">
              <el-button size="small" @click="$emit('bring-front')">置于最前</el-button>
              <el-button size="small" type="danger" plain @click="$emit('remove')">移除组件</el-button>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="数据" name="data">
          <section class="inspector-section">
            <div class="section-title">数据绑定</div>
            <div class="preset-grid">
              <button
                v-for="preset in componentPresets"
                :key="preset.id"
                type="button"
                class="preset-card"
                @click="applyPreset(preset.id)"
              >
                <strong>{{ preset.name }}</strong>
                <span>{{ preset.description }}</span>
              </button>
            </div>
            <el-form label-position="top" class="chart-form">
              <el-form-item label="组件名称">
                <el-input v-model="configForm.chart.name" placeholder="请输入组件名称" />
              </el-form-item>
              <el-form-item label="基础组件来源">
                <el-select v-model="selectedBaseChartId" placeholder="选择一个已保存组件" style="width: 100%" filterable @change="applyBaseChart">
                  <el-option v-for="item in availableCharts" :key="item.id" :label="`${item.name} · ${chartTypeLabel(item.chartType)}`" :value="item.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="数据集">
                <el-select v-model="configForm.chart.datasetId" placeholder="请选择数据集" style="width: 100%" filterable @change="onDatasetChange">
                  <el-option v-for="dataset in datasets" :key="dataset.id" :label="dataset.name" :value="dataset.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="图表类型">
                <el-select v-model="configForm.chart.chartType" placeholder="请选择图表类型" style="width: 100%">
                  <el-option-group label="比较类">
                    <el-option label="柱状图" value="bar" />
                    <el-option label="条形图" value="bar_horizontal" />
                    <el-option label="折线图" value="line" />
                    <el-option label="雷达图" value="radar" />
                  </el-option-group>
                  <el-option-group label="占比类">
                    <el-option label="饼图" value="pie" />
                    <el-option label="环图" value="doughnut" />
                  </el-option-group>
                  <el-option-group label="关系类">
                    <el-option label="散点图" value="scatter" />
                  </el-option-group>
                  <el-option-group label="高级">
                    <el-option label="漏斗图" value="funnel" />
                    <el-option label="仪表盘" value="gauge" />
                    <el-option label="表格" value="table" />
                  </el-option-group>
                  <el-option-group label="交互控件">
                    <el-option label="筛选按钮" value="filter_button" />
                  </el-option-group>
                </el-select>
                <div class="helper-text">{{ currentChartMeta.description }}</div>
              </el-form-item>
              <div v-if="suggestionSummary.length" class="suggestion-card">
                <div class="suggestion-head">
                  <span>推荐字段</span>
                  <el-button size="small" link type="primary" @click="applySuggestedFields">一键应用</el-button>
                </div>
                <div class="suggestion-body">{{ suggestionSummary.join(' · ') }}</div>
              </div>
              <el-form-item v-if="currentChartMeta.requiresDimension || currentChartMeta.allowsOptionalDimension" :label="currentChartMeta.requiresDimension ? '维度字段' : '维度字段（可选）'">
                <el-select v-model="configForm.chart.xField" placeholder="选择维度字段" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="currentChartMeta.requiresMetric" label="度量字段">
                <el-select v-model="configForm.chart.yField" placeholder="选择度量字段" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="currentChartMeta.allowsGroup" label="分组字段">
                <el-select v-model="configForm.chart.groupField" placeholder="可选" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
            </el-form>
            <div v-if="previewColumns.length" class="preview-card">
              <div class="preview-head">
                <span>数据样例</span>
                <span class="preview-meta">字段 {{ previewColumns.length }} 个 / 样例 {{ previewRows.length }} 行 / 总计 {{ previewRowCount }} 行</span>
              </div>
              <el-table :data="previewRows.slice(0, 5)" size="small" max-height="240" border>
                <el-table-column v-for="column in previewColumns" :key="column" :prop="column" :label="column" min-width="120" show-overflow-tooltip />
              </el-table>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="样式" name="style">
          <div class="style-sections">

            <!-- 基础样式 -->
            <div class="ss-block">
              <div class="ss-row">
                <span class="ss-key">配色主题</span>
                <el-select v-model="configForm.style.theme" size="small">
                  <el-option v-for="name in themeNames" :key="name" :label="name" :value="name" />
                </el-select>
              </div>
              <div class="ss-row">
                <span class="ss-key">图表背景</span>
                <el-color-picker v-model="configForm.style.bgColor" show-alpha size="small" />
              </div>
            </div>

            <!-- 标题 -->
            <div class="ss-section">
              <div class="ss-hd" @click="toggleSection('title')">
                <span class="ss-chevron" :class="{ open: openSections.has('title') }">&#9654;</span>
                <span class="ss-hd-label">标题</span>
                <el-switch v-model="configForm.style.showTitle" size="small" @click.stop />
              </div>
              <div v-show="openSections.has('title') && configForm.style.showTitle" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">标题内容</span>
                  <el-input v-model="configForm.style.titleText" size="small" placeholder="默认用组件名" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">字号</span>
                  <el-input-number v-model="configForm.style.titleFontSize" :min="10" :max="32" size="small" controls-position="right" style="width:90px" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">颜色</span>
                  <el-color-picker v-model="configForm.style.titleColor" size="small" />
                </div>
              </div>
            </div>

            <!-- 图例 -->
            <div v-if="currentChartMeta.supportsLegend" class="ss-section">
              <div class="ss-hd" @click="toggleSection('legend')">
                <span class="ss-chevron" :class="{ open: openSections.has('legend') }">&#9654;</span>
                <span class="ss-hd-label">图例</span>
                <el-switch v-model="configForm.style.showLegend" size="small" @click.stop />
              </div>
              <div v-show="openSections.has('legend') && configForm.style.showLegend" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">位置</span>
                  <el-select v-model="configForm.style.legendPos" size="small" style="width:90px">
                    <el-option label="底部" value="bottom" />
                    <el-option label="顶部" value="top" />
                    <el-option label="右侧" value="right" />
                  </el-select>
                </div>
              </div>
            </div>

            <!-- 边框 -->
            <div class="ss-section">
              <div class="ss-hd" @click="toggleSection('border')">
                <span class="ss-chevron" :class="{ open: openSections.has('border') }">&#9654;</span>
                <span class="ss-hd-label">边框</span>
                <el-switch v-model="configForm.style.borderShow" size="small" @click.stop />
              </div>
              <div v-show="openSections.has('border') && configForm.style.borderShow" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">颜色</span>
                  <el-color-picker v-model="configForm.style.borderColor" show-alpha size="small" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">宽度 (px)</span>
                  <el-input-number v-model="configForm.style.borderWidth" :min="1" :max="8" size="small" controls-position="right" style="width:90px" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">圆角 (px)</span>
                  <el-input-number v-model="configForm.style.cardRadius" :min="0" :max="40" size="small" controls-position="right" style="width:90px" />
                </div>
              </div>
            </div>

            <!-- 标签 -->
            <div class="ss-section">
              <div class="ss-hd" @click="toggleSection('label')">
                <span class="ss-chevron" :class="{ open: openSections.has('label') }">&#9654;</span>
                <span class="ss-hd-label">数据标签</span>
                <el-switch v-model="configForm.style.showLabel" size="small" @click.stop />
              </div>
              <div v-show="openSections.has('label') && configForm.style.showLabel" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">字号</span>
                  <el-input-number v-model="configForm.style.labelSize" :min="8" :max="24" size="small" controls-position="right" style="width:90px" />
                </div>
              </div>
            </div>

            <!-- 提示框 -->
            <div class="ss-section">
              <div class="ss-hd">
                <span class="ss-chevron" style="opacity:0">&#9654;</span>
                <span class="ss-hd-label">提示框</span>
                <el-switch v-model="configForm.style.showTooltip" size="small" />
              </div>
            </div>

            <!-- 横轴 -->
            <div v-if="currentChartMeta.supportsAxisNames" class="ss-section">
              <div class="ss-hd" @click="toggleSection('xaxis')">
                <span class="ss-chevron" :class="{ open: openSections.has('xaxis') }">&#9654;</span>
                <span class="ss-hd-label">横轴</span>
                <el-switch v-model="configForm.style.showXName" size="small" @click.stop />
              </div>
              <div v-show="openSections.has('xaxis')" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">网格线</span>
                  <el-switch v-model="configForm.style.showGrid" size="small" />
                </div>
              </div>
            </div>

            <!-- 纵轴 -->
            <div v-if="currentChartMeta.supportsAxisNames" class="ss-section">
              <div class="ss-hd">
                <span class="ss-chevron" style="opacity:0">&#9654;</span>
                <span class="ss-hd-label">纵轴</span>
                <el-switch v-model="configForm.style.showYName" size="small" />
              </div>
            </div>

            <!-- 高级 -->
            <div v-if="currentChartMeta.supportsSmooth || currentChartMeta.supportsAreaFill || currentChartMeta.supportsBarStyle" class="ss-section">
              <div class="ss-hd" @click="toggleSection('adv')">
                <span class="ss-chevron" :class="{ open: openSections.has('adv') }">&#9654;</span>
                <span class="ss-hd-label">高级</span>
              </div>
              <div v-show="openSections.has('adv')" class="ss-body">
                <div v-if="currentChartMeta.supportsSmooth" class="ss-row">
                  <span class="ss-key">平滑曲线</span>
                  <el-switch v-model="configForm.style.smooth" size="small" />
                </div>
                <div v-if="currentChartMeta.supportsAreaFill" class="ss-row">
                  <span class="ss-key">面积填充</span>
                  <el-switch v-model="configForm.style.areaFill" size="small" />
                </div>
                <div v-if="currentChartMeta.supportsBarStyle" class="ss-row">
                  <span class="ss-key">柱圆角 (px)</span>
                  <el-input-number v-model="configForm.style.barRadius" :min="0" :max="20" size="small" controls-position="right" style="width:90px" />
                </div>
                <div v-if="currentChartMeta.supportsBarStyle" class="ss-row">
                  <span class="ss-key">柱宽上限</span>
                  <el-input-number v-model="configForm.style.barMaxWidth" :min="10" :max="80" size="small" controls-position="right" style="width:90px" />
                </div>
              </div>
            </div>

            <!-- 表格样式（仅表格类型） -->
            <template v-if="configForm.chart.chartType === 'table'">
              <div class="ss-section-divider">表格样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('table-header')">
                  <span class="ss-chevron" :class="{ open: openSections.has('table-header') }">&#9654;</span>
                  <span class="ss-hd-label">表头样式</span>
                </div>
                <div v-show="openSections.has('table-header')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">表头背景</span>
                    <el-color-picker v-model="configForm.style.tableHeaderBg" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">表头字色</span>
                    <el-color-picker v-model="configForm.style.tableHeaderColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">表头字号</span>
                    <el-input-number v-model="configForm.style.tableHeaderFontSize" :min="10" :max="24" size="small" controls-position="right" style="width:90px" />
                  </div>
                </div>
              </div>

              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('table-rows')">
                  <span class="ss-chevron" :class="{ open: openSections.has('table-rows') }">&#9654;</span>
                  <span class="ss-hd-label">行样式</span>
                </div>
                <div v-show="openSections.has('table-rows')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">斑马纹</span>
                    <el-switch v-model="configForm.style.tableStriped" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">奇数行背景</span>
                    <el-color-picker v-model="configForm.style.tableOddRowBg" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">偶数行背景</span>
                    <el-color-picker v-model="configForm.style.tableEvenRowBg" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">悬浮行背景</span>
                    <el-color-picker v-model="configForm.style.tableRowHoverBg" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">行高 (px)</span>
                    <el-input-number v-model="configForm.style.tableRowHeight" :min="24" :max="80" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">字色</span>
                    <el-color-picker v-model="configForm.style.tableFontColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">字号</span>
                    <el-input-number v-model="configForm.style.tableFontSize" :min="10" :max="20" size="small" controls-position="right" style="width:90px" />
                  </div>
                </div>
              </div>

              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('table-border')">
                  <span class="ss-chevron" :class="{ open: openSections.has('table-border') }">&#9654;</span>
                  <span class="ss-hd-label">表格边框</span>
                </div>
                <div v-show="openSections.has('table-border')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">边框颜色</span>
                    <el-color-picker v-model="configForm.style.tableBorderColor" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">边框宽度</span>
                    <el-input-number v-model="configForm.style.tableBorderWidth" :min="0" :max="4" size="small" controls-position="right" style="width:90px" />
                  </div>
                </div>
              </div>

              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('table-func')">
                  <span class="ss-chevron" :class="{ open: openSections.has('table-func') }">&#9654;</span>
                  <span class="ss-hd-label">功能设置</span>
                </div>
                <div v-show="openSections.has('table-func')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">显示行号</span>
                    <el-switch v-model="configForm.style.tableShowIndex" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">列排序</span>
                    <el-switch v-model="configForm.style.tableEnableSort" size="small" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 组件高级设置（通用） -->
            <div class="ss-section-divider">组件高级</div>
            <div class="ss-section">
              <div class="ss-hd" @click="toggleSection('comp-adv')">
                <span class="ss-chevron" :class="{ open: openSections.has('comp-adv') }">&#9654;</span>
                <span class="ss-hd-label">高级设置</span>
              </div>
              <div v-show="openSections.has('comp-adv')" class="ss-body">
                <div class="ss-row">
                  <span class="ss-key">内边距</span>
                  <el-input-number v-model="configForm.style.padding" :min="0" :max="40" size="small" controls-position="right" style="width:90px" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">透明度</span>
                  <el-slider v-model="configForm.style.componentOpacity" :min="0.1" :max="1" :step="0.05" style="width:100px" />
                </div>
                <div class="ss-row">
                  <span class="ss-key">阴影</span>
                  <el-switch v-model="configForm.style.shadowShow" size="small" />
                </div>
                <template v-if="configForm.style.shadowShow">
                  <div class="ss-row">
                    <span class="ss-key">阴影颜色</span>
                    <el-color-picker v-model="configForm.style.shadowColor" show-alpha size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">模糊半径</span>
                    <el-input-number v-model="configForm.style.shadowBlur" :min="0" :max="40" size="small" controls-position="right" style="width:90px" />
                  </div>
                </template>
              </div>
            </div>

          </div>
        </el-tab-pane>

        <el-tab-pane label="交互" name="interaction">
          <section class="inspector-section">
            <div class="section-title">交互配置</div>
            <div class="layout-grid">
              <label class="field-item">
                <span>启用点击联动</span>
                <el-switch v-model="configForm.interaction.enableClickLinkage" />
              </label>
              <label class="field-item">
                <span>启用顶部筛选器</span>
                <el-switch v-model="configForm.interaction.allowManualFilters" />
              </label>
              <label class="field-item">
                <span>点击动作</span>
                <el-select v-model="configForm.interaction.clickAction" style="width: 100%">
                  <el-option label="不处理" value="none" />
                  <el-option label="联动筛选" value="filter" />
                </el-select>
              </label>
              <label class="field-item">
                <span>联动字段来源</span>
                <el-select v-model="configForm.interaction.linkageFieldMode" style="width: 100%">
                  <el-option label="自动识别" value="auto" />
                  <el-option label="维度字段" value="dimension" />
                  <el-option label="分组字段" value="group" />
                  <el-option label="自定义字段" value="custom" />
                </el-select>
              </label>
              <label v-if="configForm.interaction.linkageFieldMode === 'custom'" class="field-item field-item--full">
                <span>自定义联动字段</span>
                <el-select v-model="configForm.interaction.linkageField" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </label>
            </div>
            <div class="filter-editor">
              <div class="filter-editor-head">
                <span>组件默认筛选</span>
                <el-button size="small" link type="primary" @click="addDataFilter">新增筛选</el-button>
              </div>
              <div v-if="configForm.interaction.dataFilters.length" class="filter-editor-list">
                <div v-for="(filter, index) in configForm.interaction.dataFilters" :key="`filter-${index}`" class="filter-editor-row">
                  <el-select v-model="filter.field" placeholder="字段" filterable clearable>
                    <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                  </el-select>
                  <el-select
                    v-if="getFilterValueOptions(filter.field).length"
                    v-model="filter.value"
                    placeholder="值"
                    filterable
                    clearable
                  >
                    <el-option
                      v-for="option in getFilterValueOptions(filter.field)"
                      :key="`${filter.field}-${option}`"
                      :label="option"
                      :value="option"
                    />
                  </el-select>
                  <el-input v-else v-model="filter.value" placeholder="输入筛选值" />
                  <el-button size="small" text @click="removeDataFilter(index)">删除</el-button>
                </div>
              </div>
              <div v-else class="helper-text">当前组件未设置默认筛选条件。保存后会随组件一起复用，运行时仍可被顶部全局筛选覆盖。</div>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="Schema" name="schema">
          <section class="inspector-section">
            <div class="section-title">统一 Schema</div>
            <pre class="schema-block">{{ schemaPreview }}</pre>
          </section>
        </el-tab-pane>
      </el-tabs>

      <section class="inspector-actions">
        <div class="hint-text">{{ previewLoading ? '正在刷新字段列表...' : '属性修改会先在画布中实时预览，点击保存后才会持久化。' }}</div>
        <div class="action-row">
          <el-button size="small" @click="copySchema">复制 Schema</el-button>
          <el-button size="small" type="primary" :loading="saving" @click="saveComponentConfig">保存实例配置</el-button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getChartList, type Chart } from '../api/chart'
import { getDatasetList, getDatasetPreviewData, previewDatasetSql, type Dataset } from '../api/dataset'
import type { DashboardComponent } from '../api/dashboard'
import {
  buildChartSnapshot,
  buildComponentConfig,
  chartTypeLabel,
  COMPONENT_PRESETS,
  COLOR_THEMES,
  DEFAULT_COMPONENT_INTERACTION,
  DEFAULT_COMPONENT_STYLE,
  buildPresetChartConfig,
  getChartTypeMeta,
  getMissingChartFields,
  normalizeComponentDataFilters,
  normalizeComponentConfig,
  suggestChartFields,
  type ComponentInstanceConfig,
} from '../utils/component-config'

type LayoutField = 'posX' | 'posY' | 'width' | 'height' | 'zIndex'

const props = defineProps<{
  scene: 'dashboard' | 'screen'
  component: DashboardComponent | null
  chart: Chart | null
}>()

const emit = defineEmits<{
  (e: 'apply-layout', patch: Partial<DashboardComponent>): void
  (e: 'bring-front'): void
  (e: 'remove'): void
  (e: 'preview-component', payload: { chartId: number; configJson: string }): void
  (e: 'save-component', payload: { chartId: number; configJson: string }): void
}>()

const availableCharts = ref<Chart[]>([])
const datasets = ref<Dataset[]>([])
const previewColumns = ref<string[]>([])
const previewRows = ref<Record<string, unknown>[]>([])
const previewRowCount = ref(0)
const previewLoading = ref(false)
const saving = ref(false)
const selectedBaseChartId = ref<number | null>(null)
const themeNames = Object.keys(COLOR_THEMES)
const activeTab = ref('summary')
const syncingFromProps = ref(false)
const componentPresets = COMPONENT_PRESETS
const openSections = ref(new Set(['legend', 'label']))
const toggleSection = (name: string) => {
  const next = new Set(openSections.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  openSections.value = next
}

let previewTimer: number | null = null

const layoutForm = reactive({ posX: 0, posY: 0, width: 320, height: 220, zIndex: 0 })
const configForm = reactive<ComponentInstanceConfig>({
  chart: buildChartSnapshot(null),
  style: { ...DEFAULT_COMPONENT_STYLE },
  interaction: { ...DEFAULT_COMPONENT_INTERACTION },
})

const currentChartMeta = computed(() => getChartTypeMeta(configForm.chart.chartType))
const missingFields = computed(() => getMissingChartFields(configForm.chart))
const suggestedFields = computed(() => suggestChartFields(previewColumns.value, configForm.chart.chartType))
const suggestionSummary = computed(() => {
  const entries = [
    suggestedFields.value.xField ? `维度 ${suggestedFields.value.xField}` : '',
    suggestedFields.value.yField ? `度量 ${suggestedFields.value.yField}` : '',
    suggestedFields.value.groupField ? `分组 ${suggestedFields.value.groupField}` : '',
  ]
  return entries.filter(Boolean)
})

const schemaPreview = computed(() => {
  if (!props.component) return ''
  return JSON.stringify({
    id: `comp_${props.component.id}`,
    type: configForm.chart.chartType,
    position: {
      x: props.component.posX,
      y: props.component.posY,
      w: props.component.width,
      h: props.component.height,
      zIndex: props.component.zIndex,
    },
    dataConfig: {
      sourceId: configForm.chart.datasetId,
      chartId: props.component.chartId,
      dimensions: configForm.chart.xField ? [configForm.chart.xField] : [],
      metrics: configForm.chart.yField ? [configForm.chart.yField] : [],
      groups: configForm.chart.groupField ? [configForm.chart.groupField] : [],
      filters: configForm.interaction.dataFilters,
      mode: 'instance-override',
    },
    styleConfig: configForm.style,
    interactionConfig: configForm.interaction,
  }, null, 2)
})

const buildCurrentConfigJson = () => buildComponentConfig(
  availableCharts.value.find((item) => item.id === selectedBaseChartId.value) ?? props.chart,
  props.component?.configJson,
  {
    chart: { ...configForm.chart },
    style: { ...configForm.style },
    interaction: { ...configForm.interaction },
  }
)

const queuePreview = () => {
  if (syncingFromProps.value || !props.component || !selectedBaseChartId.value) return
  if (previewTimer !== null) {
    window.clearTimeout(previewTimer)
  }
  previewTimer = window.setTimeout(() => {
    previewTimer = null
    emit('preview-component', {
      chartId: selectedBaseChartId.value as number,
      configJson: buildCurrentConfigJson(),
    })
  }, 160)
}

const syncFromProps = async () => {
  syncingFromProps.value = true
  layoutForm.posX = props.component?.posX ?? 0
  layoutForm.posY = props.component?.posY ?? 0
  layoutForm.width = props.component?.width ?? 320
  layoutForm.height = props.component?.height ?? 220
  layoutForm.zIndex = props.component?.zIndex ?? 0

  const normalized = normalizeComponentConfig(props.component?.configJson, props.chart)
  configForm.chart = { ...normalized.chart }
  configForm.style = { ...normalized.style }
  configForm.interaction = { ...normalized.interaction }
  selectedBaseChartId.value = props.component?.chartId ?? props.chart?.id ?? null

  if (configForm.chart.datasetId) {
    await onDatasetChange(configForm.chart.datasetId)
  } else {
    previewColumns.value = []
    previewRows.value = []
    previewRowCount.value = 0
  }
  await nextTick()
  syncingFromProps.value = false
}

watch(() => [props.component?.id, props.component?.configJson, props.chart?.id], syncFromProps, { immediate: true })
watch(() => [configForm.chart, configForm.style, configForm.interaction, selectedBaseChartId.value], queuePreview, { deep: true })

const loadMeta = async () => {
  const [chartList, datasetList] = await Promise.all([getChartList(), getDatasetList()])
  availableCharts.value = chartList
  datasets.value = datasetList
}

const onDatasetChange = async (datasetId: number | '') => {
  previewColumns.value = []
  previewRows.value = []
  previewRowCount.value = 0
  if (!datasetId) return
  const dataset = datasets.value.find((item) => item.id === datasetId)
  if (!dataset) return
  previewLoading.value = true
  try {
    // Demo datasets have null datasourceId — use the by-id preview endpoint
    const preview = !dataset.datasourceId
      ? await getDatasetPreviewData(dataset.id)
      : await previewDatasetSql({ datasourceId: dataset.datasourceId, sqlText: dataset.sqlText })
    previewColumns.value = preview.columns
    previewRows.value = preview.rows
    previewRowCount.value = preview.rowCount
  } finally {
    previewLoading.value = false
  }
}

const applyLayout = (field: LayoutField, value: number | null | undefined) => {
  if (!props.component || value == null) return
  const nextValue = Math.round(Number(value))
  layoutForm[field] = nextValue
  emit('apply-layout', { [field]: nextValue })
}

const handlePosXChange = (value: number | null | undefined) => applyLayout('posX', value)
const handlePosYChange = (value: number | null | undefined) => applyLayout('posY', value)
const handleWidthChange = (value: number | null | undefined) => applyLayout('width', value)
const handleHeightChange = (value: number | null | undefined) => applyLayout('height', value)
const handleZIndexChange = (value: number | null | undefined) => applyLayout('zIndex', value)

const applyBaseChart = async (chartId: number) => {
  const selectedChart = availableCharts.value.find((item) => item.id === chartId)
  if (!selectedChart) return
  configForm.chart = { ...buildChartSnapshot(selectedChart) }
  await onDatasetChange(configForm.chart.datasetId)
}

const applySuggestedFields = () => {
  if (suggestedFields.value.xField && !configForm.chart.xField) {
    configForm.chart.xField = suggestedFields.value.xField
  }
  if (suggestedFields.value.yField && !configForm.chart.yField) {
    configForm.chart.yField = suggestedFields.value.yField
  }
  if (suggestedFields.value.groupField && !configForm.chart.groupField) {
    configForm.chart.groupField = suggestedFields.value.groupField
  }
}

const getFilterValueOptions = (field: string) => {
  if (!field) return []
  return Array.from(new Set(
    previewRows.value
      .map((row) => row[field])
      .filter((value): value is string | number => value != null && String(value).trim() !== '')
      .map((value) => String(value))
  )).slice(0, 50)
}

const addDataFilter = () => {
  configForm.interaction.dataFilters = [
    ...normalizeComponentDataFilters(configForm.interaction.dataFilters),
    { field: '', value: '' },
  ]
}

const removeDataFilter = (index: number) => {
  configForm.interaction.dataFilters = configForm.interaction.dataFilters.filter((_, itemIndex) => itemIndex !== index)
}

const applyPreset = (presetId: string) => {
  const preset = componentPresets.find((item) => item.id === presetId)
  if (!preset) return
  const nextChart = buildPresetChartConfig(preset, previewColumns.value, configForm.chart)
  configForm.chart.name = nextChart.name ?? configForm.chart.name
  configForm.chart.chartType = nextChart.chartType ?? configForm.chart.chartType
  configForm.chart.xField = nextChart.xField ?? ''
  configForm.chart.yField = nextChart.yField ?? ''
  configForm.chart.groupField = nextChart.groupField ?? ''
}

const saveComponentConfig = async () => {
  if (!props.component) return
  if (!configForm.chart.name.trim()) return ElMessage.warning('请输入组件名称')
  if (!configForm.chart.datasetId) return ElMessage.warning('请选择数据集')
  if (!configForm.chart.chartType) return ElMessage.warning('请选择图表类型')
  if (missingFields.value.length) return ElMessage.warning(`请补充${missingFields.value.join('、')}`)
  if (!selectedBaseChartId.value) return ElMessage.warning('请选择基础组件来源')
  saving.value = true
  try {
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer)
      previewTimer = null
    }
    emit('save-component', {
      chartId: selectedBaseChartId.value,
      configJson: buildCurrentConfigJson(),
    })
  } finally {
    saving.value = false
  }
}

const copySchema = async () => {
  if (!schemaPreview.value) return
  try {
    await navigator.clipboard.writeText(schemaPreview.value)
    ElMessage.success('组件 Schema 已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
}

onMounted(loadMeta)
onBeforeUnmount(() => {
  if (previewTimer !== null) {
    window.clearTimeout(previewTimer)
  }
})
</script>

<style scoped>
.inspector-shell {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 32px);
  overflow: hidden;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid #d9e6f4;
  background: linear-gradient(180deg, #fbfdff 0%, #ffffff 100%);
  box-shadow: 0 18px 38px rgba(21, 61, 112, 0.08);
}

.inspector-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inspector-title {
  font-size: 16px;
  font-weight: 700;
  color: #183153;
}

.inspector-subtitle,
.hint-text {
  font-size: 12px;
  line-height: 1.6;
  color: #71829b;
}

.inspector-empty {
  padding: 18px 0 10px;
}

.inspector-tabs {
  min-height: 0;
}

.inspector-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.inspector-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.inspector-tabs :deep(.el-tabs__item) {
  padding: 0 12px;
  font-size: 12px;
}

.inspector-tabs :deep(.el-tabs__content) {
  overflow-y: auto;
  padding-right: 4px;
}

.inspector-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #183153;
}

.summary-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #deebf7;
  background: linear-gradient(180deg, #f6fbff 0%, #ffffff 100%);
}

.summary-name {
  font-size: 15px;
  font-weight: 700;
  color: #163050;
}

.summary-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.summary-meta {
  margin-top: 10px;
  font-size: 12px;
  color: #71829b;
}

.health-card,
.preview-card,
.suggestion-card,
.filter-editor {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid #deebf7;
  background: #fff;
}

.health-card--warning {
  border-color: #f2cf8b;
  background: linear-gradient(180deg, #fffaf0 0%, #ffffff 100%);
}

.health-head,
.preview-head,
.suggestion-head,
.filter-editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.health-head span,
.preview-head span,
.suggestion-head span,
.filter-editor-head span {
  font-size: 13px;
  font-weight: 700;
  color: #183153;
}

.health-text,
.health-list,
.preview-meta,
.suggestion-body,
.helper-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #71829b;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid #dbe8f6;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.preset-card:hover {
  transform: translateY(-1px);
  border-color: #8fb7e5;
  box-shadow: 0 10px 24px rgba(27, 83, 145, 0.08);
}

.preset-card strong {
  font-size: 13px;
  color: #183153;
}

.preset-card span {
  font-size: 12px;
  line-height: 1.6;
  color: #71829b;
}

.filter-editor {
  margin-top: 12px;
}

.filter-editor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.filter-editor-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
}

.filter-editor-row :deep(.el-select),
.filter-editor-row :deep(.el-input) {
  width: 100%;
}

.inspector-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #e6eef8;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #ffffff 28%);
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #50637b;
}

.field-item :deep(.el-input-number),
.field-item :deep(.el-select) {
  width: 100%;
}

.field-item--full {
  grid-column: 1 / -1;
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.chart-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.schema-block {
  margin: 0;
  max-height: 280px;
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

@media (max-width: 1200px) {
  .inspector-shell {
    position: static;
    max-height: none;
    overflow: visible;
  }

  .preset-grid {
    grid-template-columns: 1fr;
  }

  .filter-editor-row {
    grid-template-columns: 1fr;
  }

  .inspector-tabs :deep(.el-tabs__content) {
    overflow: visible;
    padding-right: 0;
  }
}

/* ─── 样式手风琴 ──────────────────────────────────────────────────────────── */
.style-sections {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 8px;
}

.ss-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0 6px;
  border-bottom: 1px solid #e6eef8;
  margin-bottom: 4px;
}

.ss-section {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8f0f8;
  background: #fafcff;
}

.ss-section-divider {
  font-size: 11px;
  color: #7ba7c8;
  padding: 10px 4px 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid #dde8f5;
  margin-top: 6px;
}

.ss-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.ss-hd:hover {
  background: #f0f6ff;
}

.ss-chevron {
  font-size: 8px;
  color: #91aac8;
  transition: transform 0.18s;
  line-height: 1;
  flex-shrink: 0;
}

.ss-chevron.open {
  transform: rotate(90deg);
  color: #409eff;
}

.ss-hd-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #2c3e5a;
}

.ss-body {
  padding: 4px 10px 8px;
  border-top: 1px solid #e8f0f8;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ss-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}

.ss-key {
  font-size: 12px;
  color: #50637b;
  flex-shrink: 0;
}

.ss-row :deep(.el-select) {
  flex: 1;
}

.ss-row :deep(.el-input) {
  flex: 1;
}
</style>