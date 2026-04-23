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
        <el-tab-pane label="基础设置" name="summary">
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
            <div class="profile-card">
              <div class="profile-kicker">属性模式</div>
              <div class="profile-title">{{ componentKindLabel }}</div>
              <div class="profile-desc">{{ componentKindDescription }}</div>
              <div class="profile-chip-list">
                <span v-for="tag in componentCapabilityTags" :key="tag" class="profile-chip">{{ tag }}</span>
              </div>
            </div>
          </section>

          <section class="inspector-section">
            <div class="section-title">实例设置</div>
            <el-form label-position="top" class="chart-form summary-form">
              <el-form-item label="组件名称">
                <el-input v-model="configForm.chart.name" placeholder="请输入组件名称" />
              </el-form-item>
              <el-form-item label="图表类型">
                <el-select v-model="configForm.chart.chartType" placeholder="请选择图表类型" style="width: 100%">
                  <el-option-group v-for="group in chartTypeGroups" :key="group.label" :label="group.label">
                    <el-option v-for="item in group.items" :key="item.value" :label="item.label" :value="item.value" />
                  </el-option-group>
                </el-select>
                <div class="helper-text">{{ currentChartMeta.description }}</div>
              </el-form-item>
            </el-form>
          </section>

          <section v-if="isTableComponentType" class="inspector-section">
            <div class="section-title">表格基础设置</div>
            <el-form label-position="top" class="chart-form summary-form">
              <div class="table-basic-grid">
                <el-form-item label="最大加载量">
                  <el-input-number v-model="configForm.chart.tableLoadLimit" :min="1" :max="5000" controls-position="right" style="width: 100%" />
                  <div class="helper-text">控制当前表格一次最多参与展示的数据量。</div>
                </el-form-item>
                <el-form-item label="表行数">
                  <el-input-number v-model="configForm.chart.tableVisibleRows" :min="1" :max="200" controls-position="right" style="width: 100%" />
                  <div class="helper-text">页面内同时显示的行数，默认 10 行。</div>
                </el-form-item>
                <el-form-item label="轮播方式">
                  <el-select v-model="configForm.chart.tableCarouselMode" style="width: 100%">
                    <el-option label="单行滚动" value="single" />
                    <el-option label="整页滚动" value="page" />
                  </el-select>
                </el-form-item>
                <el-form-item label="轮播间隔时间">
                  <el-input-number v-model="configForm.chart.tableCarouselInterval" :min="1000" :max="120000" :step="1000" controls-position="right" style="width: 100%" />
                  <div class="helper-text">单位毫秒，默认 20000ms。</div>
                </el-form-item>
              </div>
            </el-form>
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
                {{ healthReadyText }}
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
                <el-input-number :model-value="layoutForm.width" :min="160" controls-position="right" @change="handleWidthChange" />
              </label>
              <label class="field-item">
                <span>高度</span>
                <el-input-number :model-value="layoutForm.height" :min="120" controls-position="right" @change="handleHeightChange" />
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

        <el-tab-pane v-if="showDataTab" label="数据" name="data">
          <section class="inspector-section">
            <div class="section-title">数据来源</div>
            <div class="mode-card">
              <div class="mode-card-kicker">绑定策略</div>
              <div class="mode-card-title">{{ dataModeTitle }}</div>
              <div class="mode-card-desc">{{ dataModeDescription }}</div>
              <div class="mode-card-tags">
                <span v-for="tag in dataCapabilityTags" :key="tag" class="mode-card-tag">{{ tag }}</span>
              </div>
            </div>
            <el-form label-position="top" class="chart-form">
              <el-form-item label="接入主模式">
                <el-radio-group :model-value="bindingEntryMode" class="page-source-group page-source-group--mode" @change="onBindingEntryModeChange">
                  <el-radio-button value="DATASET">数据集</el-radio-button>
                  <el-radio-button value="PAGE_SQL">在线编辑</el-radio-button>
                </el-radio-group>
                <div class="helper-text">
                  {{ bindingEntryMode === 'DATASET'
                    ? '数据库型组件可直接复用数据集；API、表格和 JSON 静态数据建议直接绑定页面数据源。'
                    : '在线编辑模式会直接绑定当前页面数据源，并按数据库、API、表格、JSON 四种方式切换输入窗口。' }}
                </div>
              </el-form-item>

              <el-form-item v-if="bindingEntryMode === 'PAGE_SQL'" label="在线编辑方式">
                <el-radio-group :model-value="dataBindingMode" class="page-source-group page-source-group--submode" @change="onDataBindingModeChange">
                  <el-radio-button v-for="item in PAGE_SOURCE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button>
                </el-radio-group>
                <div class="helper-text">先选择“在线编辑”，再决定当前组件直接连数据库、API、表格还是 JSON 静态数据。</div>
              </el-form-item>

              <el-form-item v-if="bindingEntryMode === 'DATASET'" label="数据集">
                <el-select v-model="configForm.chart.datasetId" placeholder="请选择数据集" style="width: 100%" filterable :clearable="isStaticComponentType" @change="onDatasetChange">
                  <el-option v-for="dataset in datasets" :key="dataset.id" :label="dataset.name" :value="dataset.id" />
                </el-select>
                <div class="helper-text">{{ isStaticComponentType ? '静态组件可不绑定数据集；需要数据驱动时再选择数据集即可。' : '数据集模式仅使用已配置好的数据库型数据源与 SQL。' }}</div>
              </el-form-item>
              <template v-else>
                <el-form-item :label="`${pageSourceKindLabel}数据源`">
                  <el-select v-model="configForm.chart.datasourceId" placeholder="请选择数据源" style="width: 100%" filterable clearable @change="onPageDatasourceChange">
                    <el-option v-for="source in pageSourceDatasources" :key="source.id" :label="source.name" :value="source.id" />
                  </el-select>
                  <div class="helper-text">{{ pageSourceHelperText }}</div>
                </el-form-item>

                <el-form-item v-if="configForm.chart.pageSourceKind === 'DATABASE'" label="页面编写 SQL">
                  <el-input
                    v-model="configForm.chart.sqlText"
                    type="textarea"
                    :rows="5"
                    placeholder="请输入查询 SQL（仅支持查询语句）"
                  />
                </el-form-item>

                <template v-else-if="configForm.chart.pageSourceKind === 'API'">
                  <div class="runtime-editor-card">
                    <div class="runtime-editor-head">
                      <span>接口覆盖</span>
                      <span class="runtime-editor-tip">请求地址和请求方式沿用数据源配置，这里只覆盖当前组件的 headers、query、body 和结果路径。</span>
                    </div>

                    <el-tabs v-model="apiRuntimeTab" class="runtime-tabs">
                      <el-tab-pane label="请求头" name="headers">
                        <div class="kv-editor-list">
                          <div v-for="row in apiRuntimeForm.headers" :key="row.id" class="kv-editor-row">
                            <el-input v-model="row.key" placeholder="键" />
                            <el-input v-model="row.value" placeholder="值" />
                            <el-button text size="small" @click="removeApiRuntimeRow('headers', row.id)">删除</el-button>
                          </div>
                        </div>
                        <div class="action-row action-row--compact">
                          <el-button size="small" link type="primary" @click="addApiRuntimeRow('headers')">新增请求头</el-button>
                        </div>
                      </el-tab-pane>

                      <el-tab-pane label="QUERY 参数" name="query">
                        <div class="kv-editor-list">
                          <div v-for="row in apiRuntimeForm.query" :key="row.id" class="kv-editor-row">
                            <el-input v-model="row.key" placeholder="键" />
                            <el-input v-model="row.value" placeholder="值" />
                            <el-button text size="small" @click="removeApiRuntimeRow('query', row.id)">删除</el-button>
                          </div>
                        </div>
                        <div class="action-row action-row--compact">
                          <el-button size="small" link type="primary" @click="addApiRuntimeRow('query')">新增 Query 参数</el-button>
                        </div>
                      </el-tab-pane>

                      <el-tab-pane label="请求体" name="body">
                        <el-input
                          v-model="apiRuntimeForm.bodyText"
                          type="textarea"
                          :rows="5"
                          placeholder="可选。支持 JSON 或普通文本，留空则沿用数据源默认请求体。"
                        />
                      </el-tab-pane>
                    </el-tabs>

                    <el-form-item label="结果路径覆盖（可选）" class="runtime-form-item">
                      <el-input v-model="apiRuntimeForm.resultPath" placeholder="例如 data.records" />
                    </el-form-item>
                  </div>
                </template>

                <template v-else-if="configForm.chart.pageSourceKind === 'TABLE'">
                  <div class="runtime-editor-card">
                    <div class="runtime-editor-head">
                      <span>表格覆盖</span>
                      <span class="runtime-editor-tip">默认读取数据源中的表格文本，只有填写覆盖项时才会替换当前组件使用的数据。</span>
                    </div>

                    <div class="runtime-form-grid">
                      <el-form-item label="分隔格式" class="runtime-form-item">
                        <el-select v-model="tableRuntimeForm.delimiter" placeholder="沿用数据源">
                          <el-option label="沿用数据源" value="" />
                          <el-option label="CSV" value="CSV" />
                          <el-option label="TSV" value="TSV" />
                        </el-select>
                      </el-form-item>

                      <el-form-item label="首行设置" class="runtime-form-item">
                        <el-select v-model="tableRuntimeForm.hasHeader" placeholder="沿用数据源">
                          <el-option label="沿用数据源" value="" />
                          <el-option label="首行为表头" value="true" />
                          <el-option label="首行即数据" value="false" />
                        </el-select>
                      </el-form-item>

                      <el-form-item label="表格内容覆盖（可选）" class="runtime-form-item runtime-form-item--full">
                        <el-input
                          v-model="tableRuntimeForm.text"
                          type="textarea"
                          :rows="7"
                          placeholder="可选。留空则直接使用数据源里的 CSV/TSV 内容。"
                        />
                      </el-form-item>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="runtime-editor-card">
                    <div class="runtime-editor-head">
                      <span>JSON 覆盖</span>
                      <span class="runtime-editor-tip">静态 JSON 已保存在数据源中，这里只做当前组件的结果路径或内容覆盖。</span>
                    </div>

                    <div class="runtime-form-grid">
                      <el-form-item label="结果路径覆盖（可选）" class="runtime-form-item runtime-form-item--full">
                        <el-input v-model="jsonRuntimeForm.resultPath" placeholder="例如 data.records" />
                      </el-form-item>

                      <el-form-item label="JSON 内容覆盖（可选）" class="runtime-form-item runtime-form-item--full">
                        <el-input
                          v-model="jsonRuntimeForm.text"
                          type="textarea"
                          :rows="7"
                          placeholder='可选。留空则直接使用数据源里的 JSON 内容，例如 [{"region":"华东","value":120}]'
                        />
                      </el-form-item>
                    </div>
                  </div>
                </template>

                <div class="action-row">
                  <el-button size="small" type="primary" :loading="previewLoading" @click="onPageSourceQuery">预览数据</el-button>
                </div>
              </template>
              <div v-if="suggestionSummary.length && !isTableComponentType" class="suggestion-card">
                <div class="suggestion-head">
                  <span>推荐字段</span>
                  <el-button size="small" link type="primary" @click="applySuggestedFields">一键应用</el-button>
                </div>
                <div class="suggestion-body">{{ suggestionSummary.join(' · ') }}</div>
              </div>
              <el-form-item label="刷新数据时间（秒）">
                <el-input-number v-model="configForm.chart.dataRefreshInterval" :min="0" :max="86400" controls-position="right" style="width: 100%" />
                <div class="helper-text">0 表示不自动刷新；设置后当前组件会按间隔重新取数。</div>
              </el-form-item>
              <div v-if="isTableComponentType" class="table-column-editor">
                <div class="table-column-editor__head">
                  <span>自定义列</span>
                  <el-button size="small" link type="primary" @click="addTableColumn">新增列</el-button>
                </div>
                <div class="table-column-editor__hint">字段自己选取，不再区分维度和指标；可修改列名、宽度、对齐方式，并支持拖拽调整顺序。</div>
                <div class="table-column-editor__list">
                  <div v-if="!configForm.chart.tableCustomColumns.length" class="table-column-editor__empty">先执行一次预览数据，或直接新增列后选择字段。</div>
                  <div
                    v-for="(column, index) in configForm.chart.tableCustomColumns"
                    :key="column.id"
                    class="table-column-item"
                    draggable="true"
                    @dragstart="onTableColumnDragStart(index)"
                    @dragend="clearTableColumnDrag"
                    @dragover.prevent
                    @drop.prevent="onTableColumnDrop(index)"
                  >
                    <div class="table-column-item__label">第{{ index + 1 }}列</div>
                    <div class="table-column-item__grid">
                      <label class="table-column-field">
                        <span>字段选择</span>
                        <el-select v-model="column.field" placeholder="选择字段" filterable clearable style="width: 100%" @change="handleTableColumnFieldChange(index)">
                          <el-option v-for="field in previewColumns" :key="field" :label="field" :value="field" />
                        </el-select>
                      </label>
                      <label class="table-column-field">
                        <span>列名称</span>
                        <el-input v-model="column.label" placeholder="列名称(可修改)" />
                      </label>
                      <label class="table-column-field">
                        <span>宽度</span>
                        <el-input-number v-model="column.width" :min="80" :max="480" controls-position="right" style="width: 100%" />
                      </label>
                      <label class="table-column-field">
                        <span>对齐方式</span>
                        <el-select v-model="column.align" style="width: 100%">
                          <el-option label="居左对齐" value="left" />
                          <el-option label="居中对齐" value="center" />
                          <el-option label="居右对齐" value="right" />
                        </el-select>
                      </label>
                    </div>
                    <div class="table-column-item__actions">
                      <span class="table-column-item__drag">:: 拖拽排序</span>
                      <el-button size="small" text @click="removeTableColumn(index)">删除</el-button>
                    </div>
                  </div>
                </div>
              </div>
              <el-form-item v-if="currentChartMeta.requiresDimension || currentChartMeta.allowsOptionalDimension || isFilterComponentType || isMetricComponentType" :label="dimensionFieldLabel">
                <el-select v-model="configForm.chart.xField" :placeholder="`选择${dimensionFieldLabel}`" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="currentChartMeta.requiresMetric || isMetricComponentType" :label="metricFieldLabel">
                <el-select v-model="configForm.chart.yField" :placeholder="`选择${metricFieldLabel}`" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="currentChartMeta.allowsGroup || isMetricComponentType" :label="groupFieldLabel">
                <el-select v-model="configForm.chart.groupField" :placeholder="currentChartMeta.requiresGroup ? `选择${groupFieldLabel}` : '可选'" clearable filterable style="width: 100%">
                  <el-option v-for="column in previewColumns" :key="column" :label="column" :value="column" />
                </el-select>
              </el-form-item>
            </el-form>
            <div v-if="previewColumns.length" class="preview-card">
              <div class="preview-head">
                <span>数据样例</span>
                <span class="preview-meta">{{ previewColumnSummary }}</span>
              </div>
              <el-table :data="previewRows.slice(0, 5)" size="small" max-height="240" border>
                <el-table-column v-for="column in previewVisibleColumns" :key="column" :prop="column" :label="column" min-width="120" show-overflow-tooltip />
              </el-table>
            </div>
            <div v-if="isTableComponentType && tablePreviewJson" class="preview-card preview-card--json">
              <div class="preview-head">
                <span>返回 JSON</span>
              </div>
              <pre class="query-json-block">{{ tablePreviewJson }}</pre>
            </div>
          </section>
        </el-tab-pane>

        <el-tab-pane label="样式" name="style">
          <div class="style-sections">
            <div class="style-family-card">
              <div class="style-family-head">
                <span>当前开放属性</span>
                <span class="style-family-badge">{{ componentKindLabel }}</span>
              </div>
              <div class="style-family-tags">
                <span v-for="tag in styleCapabilityTags" :key="tag" class="style-family-tag">{{ tag }}</span>
              </div>
            </div>

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
                <el-color-picker v-if="!isDecorationComponentType" v-model="configForm.style.bgColor" show-alpha size="small" />
                <span v-else class="helper-text">装饰组件背景固定透明</span>
              </div>
            </div>

            <!-- 标题 -->
            <div v-if="showTitleSection" class="ss-section">
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

            <!-- iframe 网址配置 -->
            <div v-if="isIframeType" class="ss-section">
              <div class="ss-hd" @click="toggleSection('iframe')">
                <span class="ss-chevron" :class="{ open: openSections.has('iframe') }">&#9654;</span>
                <span class="ss-hd-label">网页嵌入</span>
              </div>
              <div v-show="openSections.has('iframe')" class="ss-body">
                <template v-if="currentChartType === 'iframe_single'">
                  <div class="ss-row ss-row--vertical">
                    <span class="ss-key">网页地址</span>
                    <el-input v-model="configForm.style.iframeUrl" size="small" placeholder="https://example.com" clearable />
                  </div>
                </template>
                <template v-else>
                  <div class="ss-row ss-row--vertical">
                    <span class="ss-key">页签列表</span>
                    <div class="iframe-tabs-list">
                      <div v-for="(tab, idx) in configForm.style.iframeTabs" :key="idx" class="iframe-tab-row">
                        <el-input v-model="tab.label" size="small" placeholder="页签名称" style="width:80px" />
                        <el-input v-model="tab.url" size="small" placeholder="https://example.com" style="flex:1" />
                        <el-button link size="small" type="danger" @click="configForm.style.iframeTabs.splice(idx, 1)">删除</el-button>
                      </div>
                      <el-button size="small" @click="configForm.style.iframeTabs.push({ label: `页签${configForm.style.iframeTabs.length + 1}`, url: '' })">+ 添加页签</el-button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- 文本内容 -->
            <div v-if="isTextBlockType" class="ss-section">
              <div class="ss-hd" @click="toggleSection('textcontent')">
                <span class="ss-chevron" :class="{ open: openSections.has('textcontent') }">&#9654;</span>
                <span class="ss-hd-label">文本内容</span>
              </div>
              <div v-show="openSections.has('textcontent')" class="ss-body">
                <div class="ss-row ss-row--vertical">
                  <span class="ss-key">静态内容</span>
                  <el-input v-model="configForm.style.textContent" type="textarea" :rows="4" size="small" placeholder="输入文本内容，也可绑定数据源动态展示" />
                </div>
                <div class="helper-text" style="margin-top:4px">绑定数据后，此内容作为无数据时的默认文案。</div>
              </div>
            </div>

            <!-- 图例 -->
            <div v-if="showLegendSection" class="ss-section">
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
            <div v-if="showLabelSection" class="ss-section">
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
            <div v-if="showTooltipSection" class="ss-section">
              <div class="ss-hd">
                <span class="ss-chevron" style="opacity:0">&#9654;</span>
                <span class="ss-hd-label">提示框</span>
                <el-switch v-model="configForm.style.showTooltip" size="small" />
              </div>
            </div>

            <!-- 横轴 -->
            <div v-if="showAxisSections" class="ss-section">
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
            <div v-if="showAxisSections" class="ss-section">
              <div class="ss-hd">
                <span class="ss-chevron" style="opacity:0">&#9654;</span>
                <span class="ss-hd-label">纵轴</span>
                <el-switch v-model="configForm.style.showYName" size="small" />
              </div>
            </div>

            <!-- 高级 -->
            <div v-if="showChartAdvancedSection" class="ss-section">
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
            <template v-if="isTableComponentType">
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

            <!-- 指标组件样式（指标类型） -->
            <template v-if="isMetricComponentType">
              <div class="ss-section-divider">指标样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('metric-value')">
                  <span class="ss-chevron" :class="{ open: openSections.has('metric-value') }">&#9654;</span>
                  <span class="ss-hd-label">数值展示</span>
                </div>
                <div v-show="openSections.has('metric-value')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">数值字号</span>
                    <el-input-number v-model="configForm.style.metricValueFontSize" :min="16" :max="120" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">数值颜色</span>
                    <el-color-picker v-model="configForm.style.metricValueColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">前缀文本</span>
                    <el-input v-model="configForm.style.metricPrefix" size="small" placeholder="如 ¥ / %" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">后缀文本</span>
                    <el-input v-model="configForm.style.metricSuffix" size="small" placeholder="如 万元 / 件" style="width:90px" />
                  </div>
                </div>
              </div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('metric-trend')">
                  <span class="ss-chevron" :class="{ open: openSections.has('metric-trend') }">&#9654;</span>
                  <span class="ss-hd-label">趋势配色</span>
                </div>
                <div v-show="openSections.has('metric-trend')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">上升颜色</span>
                    <el-color-picker v-model="configForm.style.metricTrendUpColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">下降颜色</span>
                    <el-color-picker v-model="configForm.style.metricTrendDownColor" size="small" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 词云样式 -->
            <template v-if="isWordCloudType">
              <div class="ss-section-divider">词云样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('wordcloud')">
                  <span class="ss-chevron" :class="{ open: openSections.has('wordcloud') }">&#9654;</span>
                  <span class="ss-hd-label">词云参数</span>
                </div>
                <div v-show="openSections.has('wordcloud')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">最小字号</span>
                    <el-input-number v-model="configForm.style.wordCloudMinSize" :min="8" :max="32" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">最大字号</span>
                    <el-input-number v-model="configForm.style.wordCloudMaxSize" :min="20" :max="120" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">旋转角度</span>
                    <el-input-number v-model="configForm.style.wordCloudRotation" :min="0" :max="90" size="small" controls-position="right" style="width:90px" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 列表样式 -->
            <template v-if="isListType">
              <div class="ss-section-divider">列表样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('list-style')">
                  <span class="ss-chevron" :class="{ open: openSections.has('list-style') }">&#9654;</span>
                  <span class="ss-hd-label">列表参数</span>
                </div>
                <div v-show="openSections.has('list-style')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">行间距 (px)</span>
                    <el-input-number v-model="configForm.style.listItemGap" :min="0" :max="24" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">最大条数</span>
                    <el-input-number v-model="configForm.style.listMaxItems" :min="1" :max="50" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">滚动动画</span>
                    <el-switch v-model="configForm.style.listScrollAnimation" size="small" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 筛选器样式 -->
            <template v-if="isFilterComponentType">
              <div class="ss-section-divider">筛选器样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('filter-style')">
                  <span class="ss-chevron" :class="{ open: openSections.has('filter-style') }">&#9654;</span>
                  <span class="ss-hd-label">按钮设置</span>
                </div>
                <div v-show="openSections.has('filter-style')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">按钮尺寸</span>
                    <el-select v-model="configForm.style.filterBtnSize" size="small" style="width:90px">
                      <el-option label="小" value="small" />
                      <el-option label="默认" value="default" />
                      <el-option label="大" value="large" />
                    </el-select>
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">选中颜色</span>
                    <el-color-picker v-model="configForm.style.filterActiveColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">排列方向</span>
                    <el-select v-model="configForm.style.filterLayout" size="small" style="width:90px">
                      <el-option label="水平" value="horizontal" />
                      <el-option label="垂直" value="vertical" />
                    </el-select>
                  </div>
                </div>
              </div>
            </template>

            <!-- 装饰组件样式 -->
            <template v-if="isDecorationComponentType">
              <div class="ss-section-divider">装饰效果</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('decor-style')">
                  <span class="ss-chevron" :class="{ open: openSections.has('decor-style') }">&#9654;</span>
                  <span class="ss-hd-label">动效与光效</span>
                </div>
                <div v-show="openSections.has('decor-style')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">动画速度 (s)</span>
                    <el-input-number v-model="configForm.style.decorAnimSpeed" :min="0.5" :max="20" :step="0.5" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">光效颜色</span>
                    <el-color-picker v-model="configForm.style.decorGlowColor" show-alpha size="small" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 图标组件样式 -->
            <template v-if="isVectorIconComponentType">
              <div class="ss-section-divider">图标样式</div>
              <div class="ss-section">
                <div class="ss-hd" @click="toggleSection('icon-style')">
                  <span class="ss-chevron" :class="{ open: openSections.has('icon-style') }">&#9654;</span>
                  <span class="ss-hd-label">图标设置</span>
                </div>
                <div v-show="openSections.has('icon-style')" class="ss-body">
                  <div class="ss-row">
                    <span class="ss-key">图标尺寸</span>
                    <el-input-number v-model="configForm.style.iconSize" :min="16" :max="256" size="small" controls-position="right" style="width:90px" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">描边颜色</span>
                    <el-color-picker v-model="configForm.style.iconStrokeColor" size="small" />
                  </div>
                  <div class="ss-row">
                    <span class="ss-key">填充颜色</span>
                    <el-color-picker v-model="configForm.style.iconFillColor" show-alpha size="small" />
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

        <el-tab-pane v-if="showInteractionTab" label="交互" name="interaction">
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
import { queryChartDataset, queryChartPageSource, type Chart } from '../api/chart'
import { getDatasourceList, type Datasource, type DatasourceSourceKind } from '../api/datasource'
import { getDatasetList, type Dataset } from '../api/dataset'
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
  getChartFieldLabels,
  getChartTypeMeta,
  getMissingChartFields,
  isBarFamilyChartType,
  isDecorationChartType,
  isStaticWidgetChartType,
  normalizeComponentDataFilters,
  normalizeComponentConfig,
  resolveConfiguredTableColumns,
  suggestChartFields,
  TABLE_LIKE_CHART_TYPES,
  type ComponentInstanceConfig,
  type TableColumnConfig,
} from '../utils/component-config'

type LayoutField = 'posX' | 'posY' | 'width' | 'height' | 'zIndex'
type TableColumnDragState = { sourceIndex: number }

const props = defineProps<{
  scene: 'dashboard' | 'screen'
  component: DashboardComponent | null
  chart: Chart | null
}>()

const chartTypeGroups = [
  {
    label: '图表组件',
    items: [
      { label: '柱状图', value: 'bar' },
      { label: '堆叠柱状图', value: 'bar_stack' },
      { label: '百分比柱状图', value: 'bar_percent' },
      { label: '分组柱状图', value: 'bar_group' },
      { label: '分组堆叠柱图', value: 'bar_group_stack' },
      { label: '瀑布图', value: 'bar_waterfall' },
      { label: '条形图', value: 'bar_horizontal' },
      { label: '堆叠条形图', value: 'bar_horizontal_stack' },
      { label: '百分比条形图', value: 'bar_horizontal_percent' },
      { label: '区间条形图', value: 'bar_horizontal_range' },
      { label: '对称条形图', value: 'bar_horizontal_symmetric' },
      { label: '进度条', value: 'bar_progress' },
      { label: '柱线组合图', value: 'bar_combo' },
      { label: '分组柱线图', value: 'bar_combo_group' },
      { label: '堆叠柱线图', value: 'bar_combo_stack' },
      { label: '折线图', value: 'line' },
      { label: '面积图', value: 'area' },
      { label: '堆叠折线图', value: 'line_stack' },
      { label: '饼图', value: 'pie' },
      { label: '环图', value: 'doughnut' },
      { label: '玫瑰图', value: 'rose' },
      { label: '雷达图', value: 'radar' },
      { label: '漏斗图', value: 'funnel' },
      { label: '仪表盘', value: 'gauge' },
      { label: '散点图', value: 'scatter' },
      { label: '矩形树图', value: 'treemap' },
      { label: '热力图', value: 'heatmap' },
      { label: '地图', value: 'map' },
      { label: '表格', value: 'table' },
      { label: '汇总表', value: 'table_summary' },
      { label: '透视表', value: 'table_pivot' },
      { label: '筛选按钮', value: 'filter_button' },
    ],
  },
  {
    label: '装饰组件',
    items: [
      { label: '边框装饰', value: 'decor_border_frame' },
      { label: '角标边框', value: 'decor_border_corner' },
      { label: '霓虹边框', value: 'decor_border_glow' },
      { label: '网格边框', value: 'decor_border_grid' },
      { label: '流光边框', value: 'decor_border_stream' },
      { label: '脉冲边框', value: 'decor_border_pulse' },
      { label: '支架边框', value: 'decor_border_bracket' },
      { label: '电路边框', value: 'decor_border_circuit' },
      { label: '标题牌', value: 'decor_title_plate' },
      { label: '发光分隔条', value: 'decor_divider_glow' },
      { label: '目标环', value: 'decor_target_ring' },
      { label: '扫描面板', value: 'decor_scan_panel' },
      { label: '六边形徽记', value: 'decor_hex_badge' },
    ],
  },
  {
    label: '文字组件',
    items: [
      { label: '文本组件', value: 'text_block' },
      { label: '单字段组件', value: 'single_field' },
      { label: '数字翻牌器', value: 'number_flipper' },
      { label: '排名表格', value: 'table_rank' },
      { label: '单页 iframe', value: 'iframe_single' },
      { label: '页签 iframe', value: 'iframe_tabs' },
      { label: '超级链接', value: 'hyperlink' },
      { label: '图片列表', value: 'image_list' },
      { label: '文字列表', value: 'text_list' },
      { label: '显示时间', value: 'clock_display' },
      { label: '词云图', value: 'word_cloud' },
      { label: '二维码', value: 'qr_code' },
      { label: '业务趋势', value: 'business_trend' },
      { label: '指标组件', value: 'metric_indicator' },
    ],
  },
  {
    label: '矢量图标组件',
    items: [
      { label: '趋势箭头图标', value: 'icon_arrow_trend' },
      { label: '预警图标', value: 'icon_warning_badge' },
      { label: '定位图标', value: 'icon_location_pin' },
      { label: '数据信号图标', value: 'icon_data_signal' },
      { label: '用户徽章图标', value: 'icon_user_badge' },
      { label: '图表标记图标', value: 'icon_chart_mark' },
    ],
  },
]

const METRIC_WIDGET_TYPES = new Set(['single_field', 'number_flipper', 'metric_indicator', 'business_trend'])
const CONTENT_WIDGET_TYPES = new Set(['text_block', 'hyperlink', 'iframe_single', 'iframe_tabs', 'image_list', 'text_list', 'clock_display', 'word_cloud', 'qr_code'])
const PURE_STATIC_NO_DATA_TYPES = new Set(['hyperlink', 'clock_display', 'qr_code'])

const PAGE_SOURCE_OPTIONS: Array<{ label: string; value: DatasourceSourceKind }> = [
  { label: '数据库', value: 'DATABASE' },
  { label: 'API 接口', value: 'API' },
  { label: '表格', value: 'TABLE' },
  { label: 'JSON 静态数据', value: 'JSON_STATIC' },
]

type InspectorBindingEntryMode = 'DATASET' | 'PAGE_SQL'
type InspectorDataBindingMode = DatasourceSourceKind
type TableRuntimeDelimiter = '' | 'CSV' | 'TSV'
type TableRuntimeHeaderMode = '' | 'true' | 'false'
type ApiRuntimeSection = 'headers' | 'query'

interface RuntimeKeyValueRow {
  id: string
  key: string
  value: string
}

interface ApiRuntimeFormState {
  headers: RuntimeKeyValueRow[]
  query: RuntimeKeyValueRow[]
  bodyText: string
  resultPath: string
}

interface TableRuntimeFormState {
  delimiter: TableRuntimeDelimiter
  hasHeader: TableRuntimeHeaderMode
  text: string
}

interface JsonRuntimeFormState {
  resultPath: string
  text: string
}

const emit = defineEmits<{
  (e: 'apply-layout', patch: Partial<DashboardComponent>): void
  (e: 'bring-front'): void
  (e: 'remove'): void
  (e: 'preview-component', payload: { chartId: number; configJson: string }): void
  (e: 'save-component', payload: { chartId: number; configJson: string }): void
}>()

const datasets = ref<Dataset[]>([])
const datasources = ref<Datasource[]>([])
const previewColumns = ref<string[]>([])
const previewRows = ref<Record<string, unknown>[]>([])
const previewRowCount = ref(0)
const previewLoading = ref(false)
const saving = ref(false)
const themeNames = Object.keys(COLOR_THEMES)
const activeTab = ref('summary')
const syncingFromProps = ref(false)
const tableFieldDrag = ref<TableColumnDragState | null>(null)
const componentPresets = COMPONENT_PRESETS
const openSections = ref(new Set(['legend', 'label']))
const toggleSection = (name: string) => {
  const next = new Set(openSections.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  openSections.value = next
}

let previewTimer: number | null = null
let runtimeRowSeed = 0

const createRuntimeRow = (patch?: Partial<Omit<RuntimeKeyValueRow, 'id'>>): RuntimeKeyValueRow => ({
  id: `runtime-row-${runtimeRowSeed++}`,
  key: patch?.key ?? '',
  value: patch?.value ?? '',
})

const createEmptyApiRuntimeForm = (): ApiRuntimeFormState => ({
  headers: [createRuntimeRow()],
  query: [createRuntimeRow()],
  bodyText: '',
  resultPath: '',
})

const createEmptyTableRuntimeForm = (): TableRuntimeFormState => ({
  delimiter: '',
  hasHeader: '',
  text: '',
})

const createEmptyJsonRuntimeForm = (): JsonRuntimeFormState => ({
  resultPath: '',
  text: '',
})

const layoutForm = reactive({ posX: 0, posY: 0, width: 320, height: 220, zIndex: 0 })
const configForm = reactive<ComponentInstanceConfig>({
  chart: buildChartSnapshot(null),
  style: { ...DEFAULT_COMPONENT_STYLE },
  interaction: { ...DEFAULT_COMPONENT_INTERACTION },
})
const apiRuntimeForm = reactive<ApiRuntimeFormState>(createEmptyApiRuntimeForm())
const tableRuntimeForm = reactive<TableRuntimeFormState>(createEmptyTableRuntimeForm())
const jsonRuntimeForm = reactive<JsonRuntimeFormState>(createEmptyJsonRuntimeForm())
const apiRuntimeTab = ref<'headers' | 'query' | 'body'>('headers')

const currentChartType = computed(() => configForm.chart.chartType || '')
const currentChartMeta = computed(() => getChartTypeMeta(configForm.chart.chartType))
const isDecorationComponentType = computed(() => isDecorationChartType(configForm.chart.chartType))
const isStaticComponentType = computed(() => isStaticWidgetChartType(configForm.chart.chartType))
const isVectorIconComponentType = computed(() => currentChartType.value.startsWith('icon_'))
const isTableComponentType = computed(() => TABLE_LIKE_CHART_TYPES.has(currentChartType.value))
const isFilterComponentType = computed(() => currentChartType.value === 'filter_button')
const isMetricComponentType = computed(() => METRIC_WIDGET_TYPES.has(currentChartType.value))
const isContentComponentType = computed(() => CONTENT_WIDGET_TYPES.has(currentChartType.value))
const isWordCloudType = computed(() => currentChartType.value === 'word_cloud')
const isListType = computed(() => currentChartType.value === 'text_list' || currentChartType.value === 'image_list')
const isIframeType = computed(() => currentChartType.value === 'iframe_single' || currentChartType.value === 'iframe_tabs')
const isTextBlockType = computed(() => currentChartType.value === 'text_block')
const isPureStaticNoDataComponentType = computed(() => (
  isDecorationComponentType.value || isVectorIconComponentType.value || PURE_STATIC_NO_DATA_TYPES.has(currentChartType.value)
))
const componentKind = computed<'chart' | 'table' | 'metric' | 'content' | 'decoration' | 'icon' | 'control'>(() => {
  if (isDecorationComponentType.value) return 'decoration'
  if (isVectorIconComponentType.value) return 'icon'
  if (isFilterComponentType.value) return 'control'
  if (isTableComponentType.value) return 'table'
  if (isMetricComponentType.value) return 'metric'
  if (isContentComponentType.value) return 'content'
  return 'chart'
})
const componentKindLabel = computed(() => ({
  chart: '分析图表',
  table: '表格组件',
  metric: '指标组件',
  content: '信息组件',
  decoration: '装饰组件',
  icon: '矢量图标',
  control: '筛选控件',
}[componentKind.value]))
const componentKindDescription = computed(() => {
  switch (componentKind.value) {
    case 'table':
      return '重点管理表头、行态、排序与容器边框，保留对数据结构的可读性。'
    case 'metric':
      return '以数值聚焦为主，突出标签、核心指标和卡片层级，不展示冗余图例。'
    case 'content':
      return '信息型组件优先关注容器层次与内容承载，字段绑定只保留必要项。'
    case 'decoration':
      return '装饰组件不参与取数，主要通过主题、边框、阴影与透明度塑造画面氛围。'
    case 'icon':
      return '矢量图标不参与取数，只保留适合符号类组件的轮廓与光效设置。'
    case 'control':
      return '筛选控件只保留筛选字段与默认值绑定，交互逻辑由全局筛选系统接管。'
    default:
      return '分析图表保留完整的数据、图例、坐标轴和高级样式链路，适合 BI 可视化编排。'
  }
})
const componentCapabilityTags = computed(() => {
  switch (componentKind.value) {
    case 'table':
      return ['表头样式', '行态控制', '排序能力', '容器边框']
    case 'metric':
      return ['指标聚焦', '标签可选', '卡片边框', '阴影层级']
    case 'content':
      return ['信息承载', '内容字段', '容器样式', '透明度']
    case 'decoration':
      return ['无数据依赖', '透明背景', '边框动画', '光效强调']
    case 'icon':
      return ['无数据依赖', '符号化表达', '描边容器', '阴影增强']
    case 'control':
      return ['字段筛选', '默认值', '页面联动', '轻交互']
    default:
      return ['数据绑定', '图例控制', '坐标轴', '图表高级']
  }
})
const styleCapabilityTags = computed(() => {
  switch (componentKind.value) {
    case 'table':
      return ['主题配色', '标题', '表头', '行样式', '功能设置', '容器高级']
    case 'metric':
      return ['主题配色', '标题', '数值标签', '边框阴影', '容器高级']
    case 'content':
      return ['主题配色', '标题', '边框描边', '透明度', '容器高级']
    case 'decoration':
      return ['主题色', '透明容器', '边框描边', '光效阴影']
    case 'icon':
      return ['主题色', '描边容器', '阴影发光', '透明度']
    case 'control':
      return ['主题配色', '标题', '边框描边', '容器高级']
    default:
      return ['主题配色', '标题', '图例', '标签', '坐标轴', '图表高级', '容器高级']
  }
})
const showDataTab = computed(() => !isPureStaticNoDataComponentType.value)
const showInteractionTab = computed(() => showDataTab.value && !isFilterComponentType.value)
const showTitleSection = computed(() => !isDecorationComponentType.value && !isVectorIconComponentType.value)
const showLegendSection = computed(() => componentKind.value === 'chart' && currentChartMeta.value.supportsLegend)
const showLabelSection = computed(() => showDataTab.value && !isTableComponentType.value && !isFilterComponentType.value)
const showTooltipSection = computed(() => showDataTab.value && !isFilterComponentType.value)
const showAxisSections = computed(() => componentKind.value === 'chart' && currentChartMeta.value.supportsAxisNames)
const showChartAdvancedSection = computed(() => (
  componentKind.value === 'chart' && (
    currentChartMeta.value.supportsSmooth ||
    currentChartMeta.value.supportsAreaFill ||
    currentChartMeta.value.supportsBarStyle
  )
))
const isUseDatasetMode = computed(() => configForm.chart.sourceMode !== 'PAGE_SQL')
const bindingEntryMode = computed<InspectorBindingEntryMode>(() => isUseDatasetMode.value ? 'DATASET' : 'PAGE_SQL')
const dataBindingMode = computed<InspectorDataBindingMode>(() => configForm.chart.pageSourceKind)
const missingFields = computed(() => isStaticComponentType.value ? [] : getMissingChartFields(configForm.chart))
const suggestedFields = computed(() => suggestChartFields(previewColumns.value, configForm.chart.chartType))
const pageSourceDatasources = computed(() => datasources.value.filter((item) => resolveDatasourceKind(item) === configForm.chart.pageSourceKind))
const pageSourceKindLabel = computed(() => PAGE_SOURCE_OPTIONS.find((item) => item.value === configForm.chart.pageSourceKind)?.label ?? '页面')
const pageSourceHelperText = computed(() => {
  switch (configForm.chart.pageSourceKind) {
    case 'DATABASE':
      return '数据库模式会直接执行当前组件配置中的 SQL，请确保选择的是数据库型数据源。'
    case 'API':
      return '基础接口配置来自数据源，页面级 JSON 可覆盖 headers、query、body 或 resultPath。'
    case 'TABLE':
      return '基础表格文本保存在数据源中，页面级 JSON 可覆盖 tableText、tableDelimiter、tableHasHeader。'
    case 'JSON_STATIC':
      return '基础 JSON 保存在数据源中，页面级 JSON 可覆盖 jsonText 或 jsonResultPath。'
    default:
      return ''
  }
})

const normalizeFieldRoleList = (fields: string[]) => Array.from(new Set(
  fields
    .map((field) => field.trim())
    .filter(Boolean)
))

const createDraftTableColumn = (field = '', index = configForm.chart.tableCustomColumns.length): TableColumnConfig => ({
  id: `table-column-${Date.now()}-${index}`,
  field,
  label: field,
  width: 180,
  align: 'center',
})

const normalizeDraftTableColumns = (columns: TableColumnConfig[]) => columns
  .map((column, index) => ({
    id: column.id || `table-column-${index + 1}`,
    field: String(column.field ?? '').trim(),
    label: String(column.label ?? '').trim(),
    width: Math.min(480, Math.max(80, Math.round(Number(column.width) || 180))),
    align: column.align === 'left' || column.align === 'right' || column.align === 'center' ? column.align : 'center',
  }))
  .filter((column) => column.field)
  .map((column) => ({
    ...column,
    label: column.label || column.field,
  }))

const syncTableColumnConfig = () => {
  configForm.chart.tableCustomColumns = normalizeDraftTableColumns(configForm.chart.tableCustomColumns ?? [])
  if (!isTableComponentType.value) return
  configForm.chart.tableDimensionFields = []
  configForm.chart.tableMetricFields = []
  configForm.chart.xField = ''
  configForm.chart.yField = ''
  configForm.chart.groupField = ''
}

const previewVisibleColumns = computed(() => isTableComponentType.value
  ? resolveConfiguredTableColumns(configForm.chart, previewColumns.value).map((column) => column.field)
  : previewColumns.value)

const tablePreviewJson = computed(() => {
  if (!isTableComponentType.value || !previewColumns.value.length) return ''
  return JSON.stringify({
    columns: previewColumns.value,
    rows: previewRows.value,
    rowCount: previewRowCount.value,
  }, null, 2)
})

const previewColumnSummary = computed(() => {
  const visibleCount = previewVisibleColumns.value.length
  const totalCount = previewColumns.value.length
  if (isTableComponentType.value && totalCount && visibleCount !== totalCount) {
    return `展示 ${visibleCount} / 全部 ${totalCount} 个字段 / 样例 ${previewRows.value.length} 行 / 总计 ${previewRowCount.value} 行`
  }
  return `字段 ${visibleCount} 个 / 样例 ${previewRows.value.length} 行 / 总计 ${previewRowCount.value} 行`
})

const addTableColumn = () => {
  if (!previewColumns.value.length) {
    ElMessage.warning('请先预览数据，再新增表格列')
    return
  }
  const usedFields = new Set(configForm.chart.tableCustomColumns.map((column) => column.field))
  const nextField = previewColumns.value.find((field) => !usedFields.has(field)) ?? previewColumns.value[0] ?? ''
  configForm.chart.tableCustomColumns = [...configForm.chart.tableCustomColumns, createDraftTableColumn(nextField)]
  syncTableColumnConfig()
}

const removeTableColumn = (index: number) => {
  configForm.chart.tableCustomColumns = configForm.chart.tableCustomColumns.filter((_, itemIndex) => itemIndex !== index)
  syncTableColumnConfig()
}

const handleTableColumnFieldChange = (index: number) => {
  const column = configForm.chart.tableCustomColumns[index]
  if (!column) return
  if (!column.label.trim()) {
    column.label = column.field
  }
  syncTableColumnConfig()
}

const onTableColumnDragStart = (sourceIndex: number) => {
  tableFieldDrag.value = { sourceIndex }
}

const clearTableColumnDrag = () => {
  tableFieldDrag.value = null
}

const onTableColumnDrop = (targetIndex: number) => {
  const dragging = tableFieldDrag.value
  if (!dragging || dragging.sourceIndex === targetIndex) return
  const nextColumns = [...configForm.chart.tableCustomColumns]
  const [movedColumn] = nextColumns.splice(dragging.sourceIndex, 1)
  if (!movedColumn) return
  nextColumns.splice(targetIndex, 0, movedColumn)
  configForm.chart.tableCustomColumns = nextColumns
  clearTableColumnDrag()
  syncTableColumnConfig()
}

const suggestionSummary = computed(() => {
  const entries = [
    suggestedFields.value.xField ? `${chartFieldLabels.value.x} ${suggestedFields.value.xField}` : '',
    suggestedFields.value.yField ? `${chartFieldLabels.value.y} ${suggestedFields.value.yField}` : '',
    suggestedFields.value.groupField ? `分组 ${suggestedFields.value.groupField}` : '',
  ]
  return entries.filter(Boolean)
})
const dataModeTitle = computed(() => {
  switch (componentKind.value) {
    case 'table':
      return '表格型组件直接基于查询结果配置自定义列，不再区分维度和指标。'
    case 'metric':
      return '指标型组件以单一核心数值为主，可附加标签字段或对比字段强化语义。'
    case 'content':
      return '信息型组件只暴露必要绑定项，适合列表、词云等轻量数据组件。'
    case 'control':
      return '筛选控件只需要绑定筛选字段，页面运行时会自动接管联动逻辑。'
    default:
      return isBarFamilyComponentType.value
        ? '图表型组件支持完整数据接入链路，可按 X 轴、Y 轴、分组逐步映射。'
        : '图表型组件支持完整数据接入链路，可按维度、度量、分组逐步映射。'
  }
})
const dataModeDescription = computed(() => {
  if (bindingEntryMode.value === 'DATASET') {
    return '当前处于数据集模式，适合复用已有 SQL 与字段定义；字段映射会随样例数据自动推荐。'
  }
  return '当前处于在线编辑模式，可以按数据库、API、表格、JSON 四种来源直接绑定当前页面组件。'
})
const dataCapabilityTags = computed(() => {
  const tags = [bindingEntryMode.value === 'DATASET' ? '复用数据集' : '页面实时取数']
  if (isTableComponentType.value) {
    tags.push('自定义列', '结果 JSON')
    return tags.slice(0, 4)
  }
  if (currentChartMeta.value.requiresDimension || isFilterComponentType.value || isMetricComponentType.value) {
    tags.push(isBarFamilyComponentType.value ? 'X轴映射' : '维度角色')
  }
  if (currentChartMeta.value.requiresMetric || isMetricComponentType.value) {
    tags.push(isBarFamilyComponentType.value ? 'Y轴映射' : '指标角色')
  }
  if (currentChartMeta.value.allowsGroup || isMetricComponentType.value) {
    tags.push('分组扩展')
  }
  return tags.slice(0, 4)
})
const chartFieldLabels = computed(() => getChartFieldLabels(configForm.chart.chartType))
const isBarFamilyComponentType = computed(() => isBarFamilyChartType(configForm.chart.chartType))
const dimensionFieldLabel = computed(() => {
  if (isFilterComponentType.value) return '筛选字段'
  if (isMetricComponentType.value) return currentChartMeta.value.requiresDimension ? '标签字段' : '标签字段（可选）'
  return currentChartMeta.value.requiresDimension ? chartFieldLabels.value.x : `${chartFieldLabels.value.x}（可选）`
})
const metricFieldLabel = computed(() => {
  if (isMetricComponentType.value) return '数值字段'
  return chartFieldLabels.value.y
})
const groupFieldLabel = computed(() => {
  if (isMetricComponentType.value) return '对比字段'
  return chartFieldLabels.value.group
})
const healthReadyText = computed(() => {
  switch (componentKind.value) {
    case 'decoration':
      return '当前组件无需绑定数据，适合直接调整边框、阴影和透明层级后保存。'
    case 'icon':
      return '当前图标组件无需绑定数据，建议重点调整主题色、容器边框和发光效果。'
    case 'content':
      return '当前配置满足信息组件的预览要求，可继续微调容器样式与内容承载方式。'
    case 'metric':
      return '当前指标组件已可预览，建议继续检查标签字段和数值字段是否表达清晰。'
    case 'table':
      return '当前表格组件已满足预览条件，可继续调整自定义列、表头样式和轮播设置。'
    case 'control':
      return '当前筛选控件已满足预览条件，可直接保存并用于页面全局筛选。'
    default:
      return '当前配置满足画布预览要求，可直接联动预览与保存。'
  }
})
const pageSourceRuntimeSignature = computed(() => JSON.stringify({
  api: {
    resultPath: apiRuntimeForm.resultPath,
    bodyText: apiRuntimeForm.bodyText,
    headers: apiRuntimeForm.headers.map((item) => ({ key: item.key, value: item.value })),
    query: apiRuntimeForm.query.map((item) => ({ key: item.key, value: item.value })),
  },
  table: { ...tableRuntimeForm },
  json: { ...jsonRuntimeForm },
}))

const currentComponentChartId = computed(() => props.component?.chartId ?? props.chart?.id ?? null)

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
      sourceMode: configForm.chart.sourceMode,
      sourceId: configForm.chart.sourceMode === 'PAGE_SQL' ? configForm.chart.datasourceId : configForm.chart.datasetId,
      datasetId: configForm.chart.datasetId,
      datasourceId: configForm.chart.datasourceId,
      pageSourceKind: configForm.chart.pageSourceKind,
      sqlText: configForm.chart.sqlText,
      runtimeConfigText: configForm.chart.runtimeConfigText,
      refreshInterval: configForm.chart.dataRefreshInterval,
      chartId: props.component.chartId,
      dimensions: isTableComponentType.value ? [] : (configForm.chart.xField ? [configForm.chart.xField] : []),
      metrics: isTableComponentType.value ? [] : (configForm.chart.yField ? [configForm.chart.yField] : []),
      groups: isTableComponentType.value ? [] : (configForm.chart.groupField ? [configForm.chart.groupField] : []),
      table: isTableComponentType.value ? {
        loadLimit: configForm.chart.tableLoadLimit,
        visibleRows: configForm.chart.tableVisibleRows,
        carouselMode: configForm.chart.tableCarouselMode,
        carouselInterval: configForm.chart.tableCarouselInterval,
        columns: configForm.chart.tableCustomColumns,
      } : undefined,
      filters: configForm.interaction.dataFilters,
      mode: 'instance-override',
    },
    styleConfig: configForm.style,
    interactionConfig: configForm.interaction,
  }, null, 2)
})

const buildCurrentConfigJson = () => buildComponentConfig(
  props.chart,
  props.component?.configJson,
  {
    chart: { ...configForm.chart },
    style: { ...configForm.style },
    interaction: { ...configForm.interaction },
  }
)

const queuePreview = () => {
  if (syncingFromProps.value || !props.component || !currentComponentChartId.value) return
  if (previewTimer !== null) {
    window.clearTimeout(previewTimer)
  }
  previewTimer = window.setTimeout(() => {
    previewTimer = null
    emit('preview-component', {
      chartId: currentComponentChartId.value as number,
      configJson: buildCurrentConfigJson(),
    })
  }, 300)
}

const resolveDatasourceKind = (datasource?: Datasource | null): DatasourceSourceKind => datasource?.sourceKind || 'DATABASE'
const readObject = (value: unknown) => (!value || typeof value !== 'object' || Array.isArray(value) ? {} : value as Record<string, unknown>)
const readString = (value: unknown) => typeof value === 'string' ? value : ''
const readBoolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback

const parseJsonObjectTextSafely = (jsonText?: string) => {
  const trimmed = String(jsonText ?? '').trim()
  if (!trimmed) return {} as Record<string, unknown>
  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
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

const stringifyUnknown = (value: unknown) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const rowsFromObject = (value: unknown) => {
  const entries = Object.entries(readObject(value))
  return entries.length
    ? entries.map(([key, rowValue]) => createRuntimeRow({ key, value: stringifyUnknown(rowValue) }))
    : [createRuntimeRow()]
}

const resetPageSourceForms = () => {
  Object.assign(apiRuntimeForm, createEmptyApiRuntimeForm())
  Object.assign(tableRuntimeForm, createEmptyTableRuntimeForm())
  Object.assign(jsonRuntimeForm, createEmptyJsonRuntimeForm())
  apiRuntimeTab.value = 'headers'
}

const syncPageSourceFormsFromRuntime = (runtimeConfigText?: string) => {
  resetPageSourceForms()
  const runtimeConfig = parseJsonObjectTextSafely(runtimeConfigText)
  apiRuntimeForm.headers = rowsFromObject(runtimeConfig.apiHeaders ?? runtimeConfig.headers)
  apiRuntimeForm.query = rowsFromObject(runtimeConfig.apiQuery ?? runtimeConfig.query)
  apiRuntimeForm.bodyText = stringifyUnknown(runtimeConfig.apiBody ?? runtimeConfig.body)
  apiRuntimeForm.resultPath = readString(runtimeConfig.apiResultPath ?? runtimeConfig.resultPath)

  tableRuntimeForm.delimiter = (readString(runtimeConfig.tableDelimiter ?? runtimeConfig.delimiter).toUpperCase() as TableRuntimeDelimiter) || ''
  tableRuntimeForm.hasHeader = typeof (runtimeConfig.tableHasHeader ?? runtimeConfig.hasHeader) === 'boolean'
    ? String(readBoolean(runtimeConfig.tableHasHeader ?? runtimeConfig.hasHeader)) as TableRuntimeHeaderMode
    : ''
  tableRuntimeForm.text = readString(runtimeConfig.tableText ?? runtimeConfig.text)

  jsonRuntimeForm.resultPath = readString(runtimeConfig.jsonResultPath ?? runtimeConfig.resultPath)
  jsonRuntimeForm.text = readString(runtimeConfig.jsonText ?? runtimeConfig.text)
}

const buildRuntimeKeyValueObject = (rows: RuntimeKeyValueRow[]) => rows.reduce<Record<string, unknown>>((result, row) => {
  const key = row.key.trim()
  if (!key) return result
  const parsedValue = parseLooseJsonValue(row.value)
  result[key] = parsedValue === undefined ? '' : parsedValue
  return result
}, {})

const buildPageSourceRuntimeConfig = () => {
  if (configForm.chart.pageSourceKind === 'API') {
    const runtimeConfig: Record<string, unknown> = {}
    const headers = buildRuntimeKeyValueObject(apiRuntimeForm.headers)
    const query = buildRuntimeKeyValueObject(apiRuntimeForm.query)
    if (Object.keys(headers).length) runtimeConfig.apiHeaders = headers
    if (Object.keys(query).length) runtimeConfig.apiQuery = query
    const body = parseLooseJsonValue(apiRuntimeForm.bodyText)
    if (body !== undefined) runtimeConfig.apiBody = body
    if (apiRuntimeForm.resultPath.trim()) runtimeConfig.apiResultPath = apiRuntimeForm.resultPath.trim()
    return runtimeConfig
  }

  if (configForm.chart.pageSourceKind === 'TABLE') {
    const runtimeConfig: Record<string, unknown> = {}
    if (tableRuntimeForm.delimiter) runtimeConfig.tableDelimiter = tableRuntimeForm.delimiter
    if (tableRuntimeForm.hasHeader) runtimeConfig.tableHasHeader = tableRuntimeForm.hasHeader === 'true'
    if (tableRuntimeForm.text.trim()) runtimeConfig.tableText = tableRuntimeForm.text
    return runtimeConfig
  }

  if (configForm.chart.pageSourceKind === 'JSON_STATIC') {
    const runtimeConfig: Record<string, unknown> = {}
    if (jsonRuntimeForm.resultPath.trim()) runtimeConfig.jsonResultPath = jsonRuntimeForm.resultPath.trim()
    if (jsonRuntimeForm.text.trim()) runtimeConfig.jsonText = jsonRuntimeForm.text
    return runtimeConfig
  }

  return {}
}

const syncRuntimeConfigTextFromForms = () => {
  if (configForm.chart.sourceMode !== 'PAGE_SQL' || configForm.chart.pageSourceKind === 'DATABASE') {
    configForm.chart.runtimeConfigText = ''
    return
  }
  const runtimeConfig = buildPageSourceRuntimeConfig()
  configForm.chart.runtimeConfigText = Object.keys(runtimeConfig).length ? JSON.stringify(runtimeConfig, null, 2) : ''
}

const ensurePageSourceRuntimeValid = () => {
  if (configForm.chart.pageSourceKind === 'JSON_STATIC' && jsonRuntimeForm.text.trim()) {
    parseJsonValueText(jsonRuntimeForm.text, 'JSON 内容覆盖必须是合法 JSON')
  }
}

const clearPreviewData = () => {
  previewColumns.value = []
  previewRows.value = []
  previewRowCount.value = 0
}

const clearChartDataBinding = () => {
  configForm.chart.datasetId = ''
  configForm.chart.datasourceId = ''
  configForm.chart.sqlText = ''
  configForm.chart.runtimeConfigText = ''
  configForm.chart.xField = ''
  configForm.chart.yField = ''
  configForm.chart.groupField = ''
  configForm.chart.tableDimensionFields = []
  configForm.chart.tableMetricFields = []
  configForm.chart.tableCustomColumns = []
  resetPageSourceForms()
  clearPreviewData()
}

const ensurePageDatasourceMatched = () => {
  const datasourceId = Number(configForm.chart.datasourceId)
  if (!Number.isFinite(datasourceId) || datasourceId <= 0) {
    throw new Error(`请选择${pageSourceKindLabel.value}数据源`)
  }
  if (!pageSourceDatasources.value.some((item) => item.id === datasourceId)) {
    throw new Error(`当前组件应选择${pageSourceKindLabel.value}类型的数据源`)
  }
  return datasourceId
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
  syncTableColumnConfig()
  syncPageSourceFormsFromRuntime(configForm.chart.runtimeConfigText)
  syncRuntimeConfigTextFromForms()

  if (isUseDatasetMode.value && configForm.chart.datasetId) {
    await onDatasetChange(configForm.chart.datasetId)
  } else if (!isUseDatasetMode.value && configForm.chart.datasourceId && (
    configForm.chart.pageSourceKind !== 'DATABASE' || configForm.chart.sqlText.trim()
  )) {
    if (pageSourceDatasources.value.some((item) => item.id === Number(configForm.chart.datasourceId))) {
      await onPageSourceQuery()
    } else {
      clearPreviewData()
    }
  } else {
    clearPreviewData()
  }
  await nextTick()
  syncingFromProps.value = false
}

watch(() => [props.component?.id, props.component?.configJson, props.chart?.id], syncFromProps, { immediate: true })

// 用 JSON 签名代替 deep watch：只在序列化内容真正变化时才触发预览，
// 避免 60+ 属性对象的深度比较在滑块拖拽等连续操作中造成卡顿。
const configFormSignature = computed(() => JSON.stringify([configForm.chart, configForm.style, configForm.interaction, currentComponentChartId.value]))
watch(configFormSignature, queuePreview)
watch(pageSourceRuntimeSignature, () => {
  if (syncingFromProps.value || isUseDatasetMode.value) return
  syncRuntimeConfigTextFromForms()
})
watch(isPureStaticNoDataComponentType, (disabled) => {
  if (!disabled || isDecorationComponentType.value) return
  clearChartDataBinding()
  if (activeTab.value === 'data' || activeTab.value === 'interaction') {
    activeTab.value = 'style'
  }
})
watch(isDecorationComponentType, (isDecoration) => {
  if (!isDecoration) return
  clearChartDataBinding()
  configForm.style.bgColor = 'rgba(0,0,0,0)'
  if (activeTab.value === 'data' || activeTab.value === 'interaction') {
    activeTab.value = 'style'
  }
})
watch(isFilterComponentType, (isFilter) => {
  if (!isFilter) return
  configForm.interaction.enableClickLinkage = false
  configForm.interaction.clickAction = 'none'
  configForm.interaction.linkageFieldMode = 'auto'
  configForm.interaction.linkageField = ''
  if (activeTab.value === 'interaction') {
    activeTab.value = 'data'
  }
})
watch(isTableComponentType, (isTable) => {
  if (!isTable) return
  syncTableColumnConfig()
})
watch(previewColumns, (columns) => {
  if (!isTableComponentType.value || configForm.chart.tableCustomColumns.length || !columns.length) return
  configForm.chart.tableCustomColumns = columns.map((field, index) => createDraftTableColumn(field, index))
  syncTableColumnConfig()
})

const loadMeta = async () => {
  try {
    const [datasetList, datasourceList] = await Promise.all([getDatasetList(), getDatasourceList()])
    datasets.value = datasetList
    datasources.value = datasourceList
    if (props.component) {
      await syncFromProps()
    }
  } catch {
    datasets.value = []
    datasources.value = []
  }
}

const onBindingEntryModeChange = async (mode: InspectorBindingEntryMode) => {
  if (mode === 'DATASET') {
    configForm.chart.sourceMode = 'DATASET'
    configForm.chart.datasourceId = ''
    configForm.chart.sqlText = ''
    resetPageSourceForms()
    syncRuntimeConfigTextFromForms()
    if (configForm.chart.datasetId) {
      await onDatasetChange(configForm.chart.datasetId)
      return
    }
  } else {
    configForm.chart.sourceMode = 'PAGE_SQL'
    configForm.chart.datasetId = ''
    syncRuntimeConfigTextFromForms()
  }
  clearPreviewData()
}

const onDataBindingModeChange = async (mode: InspectorDataBindingMode) => {
  configForm.chart.sourceMode = 'PAGE_SQL'
  configForm.chart.pageSourceKind = mode
  configForm.chart.datasetId = ''
  configForm.chart.datasourceId = ''
  configForm.chart.sqlText = ''
  resetPageSourceForms()
  syncRuntimeConfigTextFromForms()
  clearPreviewData()
}

const onDatasetChange = async (datasetId: number | '' | null | undefined) => {
  if (!isUseDatasetMode.value) return
  clearPreviewData()
  if (!datasetId) return
  previewLoading.value = true
  try {
    const preview = await queryChartDataset({ datasetId: Number(datasetId) })
    previewColumns.value = preview.columns
    previewRows.value = preview.rows
    previewRowCount.value = preview.rowCount
  } finally {
    previewLoading.value = false
  }
}

const addApiRuntimeRow = (section: ApiRuntimeSection) => {
  apiRuntimeForm[section] = [...apiRuntimeForm[section], createRuntimeRow()]
}

const removeApiRuntimeRow = (section: ApiRuntimeSection, rowId: string) => {
  const nextRows = apiRuntimeForm[section].filter((item) => item.id !== rowId)
  apiRuntimeForm[section] = nextRows.length ? nextRows : [createRuntimeRow()]
}

const onPageDatasourceChange = () => {
  clearPreviewData()
}

const onPageSourceQuery = async () => {
  if (isUseDatasetMode.value) return
  let datasourceId = 0
  try {
    datasourceId = ensurePageDatasourceMatched()
    if (configForm.chart.pageSourceKind === 'DATABASE' && !configForm.chart.sqlText.trim()) {
      ElMessage.warning('请输入页面编写 SQL')
      return
    }
    ensurePageSourceRuntimeValid()
    syncRuntimeConfigTextFromForms()
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '页面来源配置不正确')
    return
  }
  clearPreviewData()
  previewLoading.value = true
  try {
    const preview = await queryChartPageSource({
      datasourceId,
      sqlText: configForm.chart.pageSourceKind === 'DATABASE' ? configForm.chart.sqlText : undefined,
      runtimeConfigText: configForm.chart.pageSourceKind === 'DATABASE'
        ? undefined
        : (configForm.chart.runtimeConfigText.trim() || undefined),
    })
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

const applySuggestedFields = () => {
  if (isTableComponentType.value) {
    if (!configForm.chart.tableCustomColumns.length) {
      const suggestedColumns = resolveConfiguredTableColumns({
        ...configForm.chart,
        tableCustomColumns: [],
      }, previewColumns.value)
      if (suggestedColumns.length) {
        configForm.chart.tableCustomColumns = suggestedColumns
      }
    }
    syncTableColumnConfig()
    return
  }
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
  if (!isStaticComponentType.value && isUseDatasetMode.value && !configForm.chart.datasetId) {
    return ElMessage.warning('请选择数据集')
  }
  if (!isStaticComponentType.value && !isUseDatasetMode.value) {
    try {
      ensurePageDatasourceMatched()
      if (configForm.chart.pageSourceKind === 'DATABASE' && !configForm.chart.sqlText.trim()) {
        return ElMessage.warning('请输入页面编写 SQL')
      }
      ensurePageSourceRuntimeValid()
      syncRuntimeConfigTextFromForms()
    } catch (error) {
      return ElMessage.warning(error instanceof Error ? error.message : '页面来源配置不正确')
    }
  }
  if (!configForm.chart.chartType) return ElMessage.warning('请选择图表类型')
  if (missingFields.value.length) return ElMessage.warning(`请补充${missingFields.value.join('、')}`)
  if (!currentComponentChartId.value) return ElMessage.warning('当前组件缺少图表标识，无法保存')
  saving.value = true
  try {
    if (previewTimer !== null) {
      window.clearTimeout(previewTimer)
      previewTimer = null
    }
    emit('save-component', {
      chartId: currentComponentChartId.value,
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
  border-radius: 22px;
  border: 1px solid rgba(102, 152, 203, 0.22);
  background:
    radial-gradient(circle at top, rgba(78, 154, 255, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(8, 21, 35, 0.98) 0%, rgba(8, 16, 28, 0.98) 100%);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.34);
}

.inspector-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0));
}

.inspector-head,
.inspector-tabs,
.inspector-actions {
  position: relative;
  z-index: 1;
}

.inspector-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(92, 137, 185, 0.16);
}

.inspector-title {
  font-size: 16px;
  font-weight: 700;
  color: #f2f8ff;
}

.inspector-subtitle,
.hint-text {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.68);
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

.inspector-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.inspector-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.inspector-tabs :deep(.el-tabs__nav) {
  gap: 6px;
}

.inspector-tabs :deep(.el-tabs__nav-scroll) {
  padding: 4px;
  border-radius: 999px;
  background: rgba(8, 20, 34, 0.74);
  border: 1px solid rgba(91, 138, 188, 0.14);
}

.inspector-tabs :deep(.el-tabs__item) {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(191, 213, 234, 0.68);
  transition: background 0.18s ease, color 0.18s ease;
}

.inspector-tabs :deep(.el-tabs__item.is-active) {
  color: #f4fbff;
  background: linear-gradient(135deg, rgba(56, 147, 255, 0.22), rgba(20, 90, 168, 0.58));
}

.inspector-tabs :deep(.el-tabs__content) {
  overflow-y: auto;
  padding-right: 4px;
}

.inspector-shell :deep(.el-input__wrapper),
.inspector-shell :deep(.el-select__wrapper),
.inspector-shell :deep(.el-input-number .el-input__wrapper),
.inspector-shell :deep(.el-color-picker__trigger) {
  background: rgba(7, 22, 38, 0.9);
  box-shadow: inset 0 0 0 1px rgba(96, 153, 214, 0.16);
}

.inspector-shell :deep(.el-textarea__inner) {
  background: rgba(7, 22, 38, 0.9);
  border: 1px solid rgba(96, 153, 214, 0.16);
  color: #edf6ff;
}

.inspector-shell :deep(.el-input__inner),
.inspector-shell :deep(.el-select__placeholder),
.inspector-shell :deep(.el-select__selected-item),
.inspector-shell :deep(.el-radio-button__inner),
.inspector-shell :deep(.el-checkbox__label) {
  color: #edf6ff;
}

.inspector-shell :deep(.el-input-number) {
  width: 100%;
}

.inspector-shell :deep(.el-radio-button__inner) {
  background: rgba(7, 22, 38, 0.88);
  border-color: rgba(96, 153, 214, 0.16);
}

.inspector-shell :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, rgba(56, 147, 255, 0.32), rgba(20, 90, 168, 0.72));
  border-color: rgba(111, 188, 255, 0.32);
  box-shadow: none;
}

.inspector-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #eef7ff;
}

.summary-card,
.profile-card,
.mode-card,
.style-family-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: linear-gradient(180deg, rgba(10, 27, 44, 0.86) 0%, rgba(8, 17, 30, 0.92) 100%);
}

.summary-name {
  font-size: 15px;
  font-weight: 700;
  color: #f3f9ff;
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
  color: rgba(191, 213, 234, 0.66);
}

.health-card,
.preview-card,
.suggestion-card,
.filter-editor {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: rgba(8, 20, 34, 0.82);
}

.health-card--warning {
  border-color: rgba(232, 182, 86, 0.32);
  background: linear-gradient(180deg, rgba(58, 35, 7, 0.56) 0%, rgba(8, 20, 34, 0.9) 100%);
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
  color: #eff7ff;
}

.health-text,
.health-list,
.preview-meta,
.suggestion-body,
.helper-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.68);
}

.table-basic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.table-column-editor {
  padding: 12px;
  margin-bottom: 14px;
  border-radius: 16px;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: rgba(6, 19, 32, 0.72);
}

.table-column-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #eff7ff;
  font-size: 13px;
  font-weight: 700;
}

.table-column-editor__hint,
.table-column-editor__empty {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.68);
}

.table-column-editor__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.table-column-item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(111, 188, 255, 0.16);
  background: linear-gradient(180deg, rgba(13, 36, 58, 0.88) 0%, rgba(7, 18, 31, 0.96) 100%);
  cursor: grab;
}

.table-column-item__label {
  color: #eff7ff;
  font-size: 13px;
  font-weight: 700;
}

.table-column-item__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  margin-top: 10px;
}

.table-column-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.table-column-field span,
.table-column-item__drag {
  color: rgba(191, 213, 234, 0.78);
  font-size: 12px;
}

.table-column-item__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.preview-card--json {
  margin-top: 12px;
}

.query-json-block {
  margin: 0;
  padding: 12px;
  max-height: 260px;
  overflow: auto;
  border-radius: 12px;
  background: rgba(4, 13, 24, 0.72);
  color: #dff3ff;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-kicker,
.mode-card-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(120, 188, 255, 0.72);
}

.profile-title,
.mode-card-title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #f5fbff;
}

.profile-desc,
.mode-card-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.72);
}

.profile-chip-list,
.mode-card-tags,
.style-family-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.profile-chip,
.mode-card-tag,
.style-family-tag {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(111, 188, 255, 0.16);
  background: rgba(6, 23, 38, 0.72);
  color: rgba(227, 240, 255, 0.82);
  font-size: 11px;
}

.style-family-card {
  padding: 12px 14px;
}

.style-family-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #eff7ff;
  font-size: 13px;
  font-weight: 700;
}

.style-family-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  height: 22px;
  border-radius: 999px;
  background: rgba(73, 160, 255, 0.14);
  border: 1px solid rgba(73, 160, 255, 0.22);
  color: #dff3ff;
  font-size: 11px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.summary-form {
  margin-top: 2px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid rgba(95, 146, 199, 0.18);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(10, 27, 44, 0.84) 0%, rgba(8, 17, 30, 0.92) 100%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.preset-card:hover {
  transform: translateY(-1px);
  border-color: rgba(111, 188, 255, 0.34);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.preset-card strong {
  font-size: 13px;
  color: #eff7ff;
}

.preset-card span {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.68);
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
  border-top: 1px solid rgba(92, 137, 185, 0.16);
  background: linear-gradient(180deg, rgba(6, 16, 28, 0) 0%, rgba(6, 16, 28, 0.96) 28%);
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
  color: rgba(214, 230, 247, 0.82);
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

.page-source-group {
  display: flex;
  flex-wrap: wrap;
}

.page-source-group--mode {
  width: 100%;
}

.page-source-group--mode :deep(.el-radio-button) {
  flex: 1 1 auto;
}

.page-source-group--submode {
  width: 100%;
}

.page-source-group--submode :deep(.el-radio-button) {
  flex: 1 1 140px;
}

.runtime-editor-card {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: linear-gradient(180deg, rgba(10, 27, 44, 0.84) 0%, rgba(8, 17, 30, 0.92) 100%);
}

.runtime-editor-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.runtime-editor-head > span:first-child {
  font-size: 13px;
  font-weight: 700;
  color: #eef7ff;
}

.runtime-editor-tip {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(191, 213, 234, 0.68);
}

.runtime-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.runtime-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.kv-editor-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kv-editor-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
}

.kv-editor-row :deep(.el-input) {
  width: 100%;
}

.runtime-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.runtime-form-item {
  margin-bottom: 0;
}

.runtime-form-item--full {
  grid-column: 1 / -1;
}

.action-row--compact {
  margin-top: 10px;
}

.schema-block {
  margin: 0;
  max-height: 280px;
  overflow: auto;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: rgba(5, 15, 27, 0.95);
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

  .kv-editor-row,
  .runtime-form-grid {
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
  gap: 8px;
  padding: 4px 0 8px;
}

.ss-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 6px;
  border-bottom: 1px solid rgba(92, 137, 185, 0.16);
  margin-bottom: 4px;
}

.ss-section {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(95, 146, 199, 0.16);
  background: rgba(8, 20, 34, 0.78);
}

.ss-section-divider {
  font-size: 11px;
  color: rgba(120, 188, 255, 0.72);
  padding: 10px 4px 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-top: 1px solid rgba(92, 137, 185, 0.16);
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
  background: rgba(23, 53, 86, 0.52);
}

.ss-chevron {
  font-size: 8px;
  color: rgba(177, 204, 232, 0.56);
  transition: transform 0.18s;
  line-height: 1;
  flex-shrink: 0;
}

.ss-chevron.open {
  transform: rotate(90deg);
  color: #6fc1ff;
}

.ss-hd-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #eff7ff;
}

.ss-body {
  padding: 4px 10px 8px;
  border-top: 1px solid rgba(95, 146, 199, 0.12);
  background: rgba(5, 15, 27, 0.72);
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

.ss-row--vertical {
  flex-direction: column;
  align-items: stretch;
}

.ss-key {
  font-size: 12px;
  color: rgba(214, 230, 247, 0.82);
  flex-shrink: 0;
}

.ss-row :deep(.el-select) {
  flex: 1;
}

.ss-row :deep(.el-input) {
  flex: 1;
}

.iframe-tabs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.iframe-tab-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 1360px) {
  .table-basic-grid,
  .table-column-item__grid {
    grid-template-columns: 1fr;
  }
}
</style>