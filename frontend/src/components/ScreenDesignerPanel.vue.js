import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight, CirclePlus, Close, Delete, Download, Filter, Grid, Operation, PictureFilled, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import html2canvas from 'html2canvas';
import * as echarts from 'echarts';
import ComponentDataFallback from './ComponentDataFallback.vue';
import ComponentStaticPreview from './ComponentStaticPreview.vue';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { createChart, getChartData, getChartList } from '../api/chart';
import { createTemplate, getTemplateList } from '../api/chart-template';
import { getDatasetList } from '../api/dataset';
import { buildComponentAssetConfig, buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getMissingChartFields, isCanvasRenderableChartType, isStaticWidgetChartType, materializeChartData, mergeComponentRequestFilters, normalizeComponentAssetConfig, normalizeComponentConfig, postProcessChartOption, } from '../utils/component-config';
import { buildPublishedLink, buildReportConfig, normalizeCanvasConfig, normalizeCoverConfig, normalizePublishConfig, parseReportConfig, SCREEN_CANVAS_PRESETS, } from '../utils/report-config';
import { uploadImage } from '../api/upload';
const props = withDefaults(defineProps(), {
    screenId: null,
});
const emit = defineEmits();
const makeBarComboIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="18" fill="currentColor" rx="1"/><rect x="20" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="28" y="6" width="6" height="22" fill="currentColor" rx="1"/><polyline points="7,12 15,8 23,11 31,4" fill="none" stroke="currentColor" stroke-width="2" opacity=".7" stroke-linecap="round"/></svg>`;
const makeHeatmapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="7" height="7" fill="currentColor" opacity=".9" rx="1"/><rect x="13" y="4" width="7" height="7" fill="currentColor" opacity=".5" rx="1"/><rect x="22" y="4" width="7" height="7" fill="currentColor" opacity=".2" rx="1"/><rect x="31" y="4" width="7" height="7" fill="currentColor" opacity=".7" rx="1"/><rect x="4" y="13" width="7" height="7" fill="currentColor" opacity=".3" rx="1"/><rect x="13" y="13" width="7" height="7" fill="currentColor" opacity=".8" rx="1"/><rect x="22" y="13" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="31" y="13" width="7" height="7" fill="currentColor" opacity=".15" rx="1"/><rect x="4" y="22" width="7" height="7" fill="currentColor" opacity=".6" rx="1"/><rect x="13" y="22" width="7" height="7" fill="currentColor" opacity=".25" rx="1"/><rect x="22" y="22" width="7" height="7" fill="currentColor" opacity=".95" rx="1"/><rect x="31" y="22" width="7" height="7" fill="currentColor" opacity=".4" rx="1"/></svg>`;
const makeMapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M5,6 L15,4 L25,8 L35,5 L35,26 L25,23 L15,27 L5,25 Z" fill="currentColor" opacity=".3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15,4 L15,27" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M25,8 L25,23" stroke="currentColor" stroke-width="1" opacity=".5"/><circle cx="22" cy="13" r="3" fill="currentColor" opacity=".8"/></svg>`;
const makeFilterButtonIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="32" height="16" rx="4" fill="currentColor" opacity=".2" stroke="currentColor" stroke-width="1.2"/><path d="M10,14 L14,18 L14,22" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10,14 L18,14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="28" cy="18" r="1.5" fill="currentColor"/><circle cx="23" cy="18" r="1.5" fill="currentColor"/><circle cx="33" cy="18" r="1.5" fill="currentColor" opacity=".4"/></svg>`;
const makeBarWaterfallIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="6" height="12" fill="currentColor" rx="1"/><rect x="12" y="10" width="6" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="12" y="16" width="6" height="6" fill="currentColor" rx="1"/><rect x="20" y="6" width="6" height="4" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="10" width="6" height="12" fill="currentColor" rx="1"/><rect x="28" y="4" width="6" height="24" fill="currentColor" opacity=".7" rx="1"/></svg>`;
const makeBarProgressIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="6" width="22" height="5" fill="currentColor" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="14" width="30" height="5" fill="currentColor" opacity=".5" rx="2.5"/><rect x="4" y="22" width="30" height="5" fill="currentColor" opacity=".2" rx="2.5"/><rect x="4" y="22" width="14" height="5" fill="currentColor" opacity=".8" rx="2.5"/></svg>`;
const makeBarSymmetricIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="4" width="14" height="6" fill="currentColor" rx="1"/><rect x="6" y="4" width="14" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="13" width="8" height="6" fill="currentColor" rx="1"/><rect x="12" y="13" width="8" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="20" y="22" width="16" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="16" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarGroupStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="18" width="5" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="4" y="12" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="10" y="14" width="5" height="14" fill="currentColor" opacity=".9" rx="1"/><rect x="10" y="8" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="19" y="16" width="5" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="19" y="10" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="12" width="5" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="25" y="6" width="5" height="6" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="8" height="12" fill="currentColor" opacity=".9" rx="1"/><rect x="6" y="8" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="18" y="12" width="8" height="16" fill="currentColor" opacity=".9" rx="1"/><rect x="18" y="4" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/><rect x="30" y="18" width="8" height="10" fill="currentColor" opacity=".9" rx="1"/><rect x="30" y="10" width="8" height="8" fill="currentColor" opacity=".5" rx="1"/></svg>`;
const makeBarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="14" width="6" height="14" fill="currentColor" rx="1"/><rect x="14" y="8" width="6" height="20" fill="currentColor" rx="1"/><rect x="22" y="18" width="6" height="10" fill="currentColor" rx="1"/><rect x="30" y="4" width="6" height="24" fill="currentColor" rx="1"/></svg>`;
const makeBarHIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="20" height="6" fill="currentColor" rx="1"/><rect x="4" y="13" width="28" height="6" fill="currentColor" rx="1"/><rect x="4" y="22" width="14" height="6" fill="currentColor" rx="1"/></svg>`;
const makeLineIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,26 12,16 20,20 28,8 36,14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const makeAreaIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="4,28 4,20 12,12 20,16 28,6 36,10 36,28" fill="currentColor" opacity=".4"/><polyline points="4,20 12,12 20,16 28,6 36,10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const makeLineStackIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polyline points="4,24 12,18 20,20 28,12 36,16" fill="none" stroke="currentColor" stroke-width="2" opacity=".5" stroke-linecap="round"/><polyline points="4,18 12,10 20,14 28,6 36,8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const makePieIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="12" fill="currentColor" opacity=".25"/><path d="M20,16 L20,4 A12,12 0 0,1 30.4,22 Z" fill="currentColor"/><path d="M20,16 L30.4,22 A12,12 0 0,1 9.6,22 Z" fill="currentColor" opacity=".6"/></svg>`;
const makeDoughnutIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,4 a12,12 0 0 1 10.4,18 l-6-3.5 a5.5,5.5 0 0 0 -4.4-8.3 Z" fill="currentColor"/><path d="M20,4 a12,12 0 0 0 -12,12 l7,.1 a5.5,5.5 0 0 1 5.5-5.6 Z" fill="currentColor" opacity=".5"/><circle cx="20" cy="16" r="5" fill="#fff" opacity=".9"/></svg>`;
const makeRoseIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M20,16 L20,6 A4,4 0 0,1 20,6 L24,16 Z" fill="currentColor" opacity=".9"/><path d="M20,16 L24,16 A8,8 0,0,1 14,22 Z" fill="currentColor" opacity=".7"/><path d="M20,16 L14,22 A6,6,0,0,1 14,8 Z" fill="currentColor" opacity=".5"/></svg>`;
const makeRadarIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="20,4 32,12 28,26 12,26 8,12" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><polygon points="20,10 27,14 24,22 16,22 13,14" fill="currentColor" opacity=".5"/></svg>`;
const makeFunnelIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><polygon points="6,4 34,4 28,13 12,13" fill="currentColor" opacity=".9" rx="1"/><polygon points="12,14 28,14 24,22 16,22" fill="currentColor" opacity=".6"/><polygon points="16,23 24,23 21,30 19,30" fill="currentColor" opacity=".4"/></svg>`;
const makeGaugeIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M8,24 A12,12 0 0,1 32,24" fill="none" stroke="currentColor" stroke-width="3" opacity=".3" stroke-linecap="round"/><path d="M8,24 A12,12 0 0,1 24,12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="24" x2="26" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="24" r="2.5" fill="currentColor"/></svg>`;
const makeScatterIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="22" r="2.5" fill="currentColor"/><circle cx="16" cy="10" r="2.5" fill="currentColor"/><circle cx="22" cy="18" r="2.5" fill="currentColor"/><circle cx="28" cy="8" r="2.5" fill="currentColor"/><circle cx="32" cy="20" r="2.5" fill="currentColor"/></svg>`;
const makeTreemapIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="20" height="18" fill="currentColor" opacity=".8" rx="1"/><rect x="25" y="3" width="12" height="10" fill="currentColor" opacity=".5" rx="1"/><rect x="25" y="15" width="12" height="6" fill="currentColor" opacity=".35" rx="1"/><rect x="3" y="23" width="34" height="6" fill="currentColor" opacity=".25" rx="1"/></svg>`;
const makeTableIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="7" fill="currentColor" rx="1"/><rect x="4" y="13" width="32" height="5" fill="currentColor" opacity=".4" rx="1"/><rect x="4" y="20" width="32" height="5" fill="currentColor" opacity=".25" rx="1"/><line x1="18" y1="4" x2="18" y2="25" stroke="white" stroke-width="1" opacity=".4"/></svg>`;
const makeDecorFrameIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 6H14V8H8V14H6V6ZM26 6H34V14H32V8H26V6ZM6 18H8V24H14V26H6V18ZM32 18H34V26H26V24H32V18Z" fill="currentColor"/><rect x="11" y="11" width="18" height="10" rx="2" fill="currentColor" opacity=".18"/></svg>`;
const makeTextBlockIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="28" height="22" rx="4" fill="currentColor" opacity=".12"/><rect x="10" y="10" width="20" height="3" rx="1.5" fill="currentColor"/><rect x="10" y="16" width="16" height="3" rx="1.5" fill="currentColor" opacity=".72"/><rect x="10" y="22" width="12" height="3" rx="1.5" fill="currentColor" opacity=".48"/></svg>`;
const makeMetricWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="32" height="24" rx="5" fill="currentColor" opacity=".12"/><path d="M10 21V11H13.4L16.5 18.2L19.6 11H23V21H20.6V15.4L18.4 21H14.6L12.4 15.4V21H10Z" fill="currentColor"/><rect x="26" y="10" width="6" height="12" rx="2" fill="currentColor" opacity=".84"/></svg>`;
const makeListWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="9" cy="16" r="2" fill="currentColor" opacity=".72"/><circle cx="9" cy="22" r="2" fill="currentColor" opacity=".48"/><rect x="14" y="8.5" width="18" height="3" rx="1.5" fill="currentColor"/><rect x="14" y="14.5" width="15" height="3" rx="1.5" fill="currentColor" opacity=".72"/><rect x="14" y="20.5" width="12" height="3" rx="1.5" fill="currentColor" opacity=".48"/></svg>`;
const makeClockWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 10V16L24 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="4" width="4" height="4" rx="1" fill="currentColor" opacity=".6"/></svg>`;
const makeQrWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="2" height="2" fill="currentColor"/><rect x="26" y="6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="29" y="9" width="2" height="2" fill="currentColor"/><rect x="6" y="18" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="21" width="2" height="2" fill="currentColor"/><rect x="24" y="18" width="3" height="3" fill="currentColor"/><rect x="29" y="18" width="5" height="3" fill="currentColor" opacity=".7"/><rect x="29" y="23" width="5" height="3" fill="currentColor" opacity=".45"/></svg>`;
const makeLinkWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M14 20L10.5 23.5C8.6 25.4 8.6 28.6 10.5 30.5C12.4 32.4 15.6 32.4 17.5 30.5L21 27" transform="translate(0 -8)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M26 12L29.5 8.5C31.4 6.6 34.6 6.6 36.5 8.5C38.4 10.4 38.4 13.6 36.5 15.5L33 19" transform="translate(-8 0)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M15 20L25 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const makeFrameWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="32" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="5" width="32" height="5" rx="4" fill="currentColor" opacity=".2"/><circle cx="9" cy="7.5" r="1.2" fill="currentColor"/><circle cx="13" cy="7.5" r="1.2" fill="currentColor" opacity=".72"/><circle cx="17" cy="7.5" r="1.2" fill="currentColor" opacity=".48"/><rect x="9" y="14" width="9" height="8" rx="2" fill="currentColor" opacity=".22"/><rect x="21" y="14" width="10" height="3" rx="1.5" fill="currentColor"/><rect x="21" y="19" width="8" height="3" rx="1.5" fill="currentColor" opacity=".6"/></svg>`;
const makeWordCloudIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><text x="6" y="14" font-size="9" fill="currentColor" font-weight="700">BI</text><text x="17" y="13" font-size="6" fill="currentColor" opacity=".8">分析</text><text x="10" y="23" font-size="7" fill="currentColor" opacity=".58">趋势</text><text x="24" y="22" font-size="8" fill="currentColor" opacity=".92">指标</text></svg>`;
const makeTrendWidgetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="18" width="4" height="8" rx="1" fill="currentColor" opacity=".5"/><rect x="13" y="14" width="4" height="12" rx="1" fill="currentColor" opacity=".66"/><rect x="20" y="10" width="4" height="16" rx="1" fill="currentColor" opacity=".82"/><rect x="27" y="6" width="4" height="20" rx="1" fill="currentColor"/><path d="M7 12L15 10L22 13L30 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const makeVectorGlyphIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M8 22L16 14L21 18L31 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 8H31V15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const createTypeItem = (type, svgIcon, label = chartTypeLabel(type)) => ({ type, label, svgIcon });
const CHART_COMPONENT_ITEMS = [
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
    createTypeItem('line', makeLineIcon()),
    createTypeItem('area', makeAreaIcon()),
    createTypeItem('line_stack', makeLineStackIcon()),
    createTypeItem('pie', makePieIcon()),
    createTypeItem('doughnut', makeDoughnutIcon()),
    createTypeItem('rose', makeRoseIcon()),
    createTypeItem('radar', makeRadarIcon()),
    createTypeItem('funnel', makeFunnelIcon()),
    createTypeItem('treemap', makeTreemapIcon()),
    createTypeItem('heatmap', makeHeatmapIcon()),
    createTypeItem('scatter', makeScatterIcon()),
    createTypeItem('map', makeMapIcon()),
    createTypeItem('gauge', makeGaugeIcon()),
    createTypeItem('table', makeTableIcon()),
    createTypeItem('table_summary', makeTableIcon()),
    createTypeItem('table_pivot', makeTableIcon()),
    createTypeItem('filter_button', makeFilterButtonIcon()),
];
const DECORATION_COMPONENT_ITEMS = [
    createTypeItem('decor_border_frame', makeDecorFrameIcon()),
    createTypeItem('decor_border_corner', makeDecorFrameIcon()),
    createTypeItem('decor_border_glow', makeDecorFrameIcon()),
    createTypeItem('decor_border_grid', makeDecorFrameIcon()),
];
const TEXT_COMPONENT_ITEMS = [
    createTypeItem('text_block', makeTextBlockIcon()),
    createTypeItem('single_field', makeMetricWidgetIcon()),
    createTypeItem('number_flipper', makeMetricWidgetIcon()),
    createTypeItem('table_rank', makeListWidgetIcon()),
    createTypeItem('iframe_single', makeFrameWidgetIcon()),
    createTypeItem('iframe_tabs', makeFrameWidgetIcon()),
    createTypeItem('hyperlink', makeLinkWidgetIcon()),
    createTypeItem('image_list', makeListWidgetIcon()),
    createTypeItem('text_list', makeListWidgetIcon()),
    createTypeItem('clock_display', makeClockWidgetIcon()),
    createTypeItem('word_cloud', makeWordCloudIcon()),
    createTypeItem('qr_code', makeQrWidgetIcon()),
    createTypeItem('business_trend', makeTrendWidgetIcon()),
    createTypeItem('metric_indicator', makeMetricWidgetIcon()),
];
const VECTOR_ICON_COMPONENT_ITEMS = [
    createTypeItem('icon_arrow_trend', makeVectorGlyphIcon()),
    createTypeItem('icon_warning_badge', makeVectorGlyphIcon()),
    createTypeItem('icon_location_pin', makeVectorGlyphIcon()),
    createTypeItem('icon_data_signal', makeVectorGlyphIcon()),
    createTypeItem('icon_user_badge', makeVectorGlyphIcon()),
    createTypeItem('icon_chart_mark', makeVectorGlyphIcon()),
];
const CHART_CATEGORIES = [
    { label: '图表组件', types: CHART_COMPONENT_ITEMS },
    { label: '装饰组件', types: DECORATION_COMPONENT_ITEMS },
    { label: '文字组件', types: TEXT_COMPONENT_ITEMS },
    { label: '矢量图标组件', types: VECTOR_ICON_COMPONENT_ITEMS },
];
const STATIC_TEMPLATE_LIBRARY = [
    { type: 'decor_border_frame', name: '默认边框装饰', description: '适合用作区块包裹和背景版强调。', layout: { width: 520, height: 220 } },
    { type: 'decor_border_corner', name: '角标边框', description: '四角强调型装饰边框。', layout: { width: 520, height: 220 } },
    { type: 'decor_border_glow', name: '霓虹边框', description: '适合高亮核心指标区。', layout: { width: 520, height: 220 } },
    { type: 'decor_border_grid', name: '网格边框', description: '适合信息密集型区域背景。', layout: { width: 520, height: 220 } },
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
];
const defaultChartTemplateLayout = (chartType) => {
    if (chartType === 'table' || chartType === 'table_summary' || chartType === 'table_pivot') {
        return { width: 760, height: 340 };
    }
    if (chartType === 'filter_button') {
        return { width: 200, height: 60 };
    }
    return { width: 520, height: 320 };
};
const DEFAULT_CHART_TEMPLATE_LIBRARY = CHART_COMPONENT_ITEMS.map((item) => ({
    type: item.type,
    name: `${item.label}（默认）`,
    description: '默认空组件，可先加入画布再绑定数据。',
    layout: defaultChartTemplateLayout(item.type),
}));
const BUILTIN_TEMPLATE_LIBRARY = [...DEFAULT_CHART_TEMPLATE_LIBRARY, ...STATIC_TEMPLATE_LIBRARY];
// ─── 左侧面板展开/折叠 & 拖拽缩放 ────────────────────────────────────────────
const expandedCats = ref(new Set(CHART_CATEGORIES.map((c) => c.label)));
const toggleCategory = (label) => {
    const next = new Set(expandedCats.value);
    if (next.has(label)) {
        next.delete(label);
    }
    else {
        next.add(label);
    }
    expandedCats.value = next;
};
const sidebarCollapsed = ref(false);
let sidebarHoverTimer = null;
const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
};
const hoverExpandSidebar = () => {
    if (!sidebarCollapsed.value)
        return;
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    sidebarHoverTimer = window.setTimeout(() => { sidebarCollapsed.value = false; }, 200);
};
const hoverCollapseSidebar = () => {
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    // Don't auto-collapse after hover-expand; user must click toggle or move away
};
const leftPanelWidth = ref(520);
const startPanelResize = (e) => {
    const startX = e.clientX;
    const startWidth = leftPanelWidth.value;
    const onMove = (ev) => {
        leftPanelWidth.value = Math.max(420, Math.min(880, startWidth + ev.clientX - startX));
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
const loading = ref(false);
const compLoading = ref(false);
const dashboards = ref([]);
const currentDashboard = ref(null);
const components = ref([]);
const charts = ref([]);
const datasets = ref([]);
const templates = ref([]);
const chartMap = computed(() => new Map(charts.value.map((item) => [item.id, item])));
const datasetMap = computed(() => new Map(datasets.value.map((item) => [item.id, item])));
const localStaticTemplates = computed(() => BUILTIN_TEMPLATE_LIBRARY.map((item, index) => ({
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
        },
    }, item.layout),
    builtIn: true,
    sortOrder: index + 1,
    createdBy: 'system',
    createdAt: '',
})));
const templateAssets = computed(() => [...localStaticTemplates.value, ...templates.value]);
const dashboardCounts = ref(new Map());
const componentDataMap = ref(new Map());
const canvasRef = ref(null);
const activeCompId = ref(null);
const dashboardSearch = ref('');
const shareVisible = ref(false);
const publishVisible = ref(false);
const publishSaving = ref(false);
const canvasSaving = ref(false);
const coverSaving = ref(false);
const capturingCover = ref(false);
const bgImgInputRef = ref(null);
const bgImgUploading = ref(false);
const libraryTab = ref('templates');
const assetSearch = ref('');
const assetType = ref('');
const selectedChartId = ref(null);
const selectedTemplateId = ref(null);
const draggingTemplateId = ref(null);
const draggingChartId = ref(null);
const stageDropActive = ref(false);
const createDashVisible = ref(false);
const dashSaving = ref(false);
const dashForm = reactive({ name: '' });
const templateSaveVisible = ref(false);
const templateSaving = ref(false);
const templateForm = reactive({ name: '', description: '' });
const publishForm = reactive({
    published: false,
    allowAnonymousAccess: true,
    allowedRoles: ['ADMIN', 'ANALYST'],
    shareToken: ''
});
const chartRefs = new Map();
const chartInstances = new Map();
let interactionFrame = null;
let pendingPointer = null;
// ─── 背景版 (Background Board) ───────────────────────────────────────────────
const overlaySelected = ref(false);
const overlayConfig = reactive({
    show: true,
    bgColor: '#081b32',
    opacity: 1,
    x: 0,
    y: 0,
    w: 1920,
    h: 1080,
    bgType: 'solid',
    gradientStart: '#0d1b2a',
    gradientEnd: '#1b3a5c',
    gradientAngle: 135,
    bgImage: '',
});
const curtainStyle = computed(() => {
    let background;
    if (overlayConfig.bgType === 'gradient') {
        background = `linear-gradient(${overlayConfig.gradientAngle}deg, ${overlayConfig.gradientStart}, ${overlayConfig.gradientEnd})`;
    }
    else if (overlayConfig.bgType === 'image' && overlayConfig.bgImage) {
        background = `url(${overlayConfig.bgImage}) center/cover no-repeat, ${overlayConfig.bgColor}`;
    }
    else {
        background = overlayConfig.bgColor;
    }
    return {
        position: 'absolute',
        left: `${overlayConfig.x}px`,
        top: `${overlayConfig.y}px`,
        width: `${overlayConfig.w}px`,
        height: `${overlayConfig.h}px`,
        background,
        opacity: String(overlayConfig.opacity),
        zIndex: '1',
        pointerEvents: 'all',
        overflow: 'hidden',
    };
});
const loadOverlayFromConfig = () => {
    const saved = currentCanvasConfig.value.overlay;
    if (saved) {
        overlayConfig.show = true; // 背景版 always visible
        overlayConfig.bgColor = saved.bgColor ?? '#081b32';
        overlayConfig.opacity = saved.opacity ?? 1;
        overlayConfig.x = saved.x ?? 0;
        overlayConfig.y = saved.y ?? 0;
        overlayConfig.w = saved.w ?? currentCanvasConfig.value.width;
        overlayConfig.h = saved.h ?? currentCanvasConfig.value.height;
        overlayConfig.bgType = saved.bgType ?? 'solid';
        overlayConfig.gradientStart = saved.gradientStart ?? '#0d1b2a';
        overlayConfig.gradientEnd = saved.gradientEnd ?? '#1b3a5c';
        overlayConfig.gradientAngle = saved.gradientAngle ?? 135;
        overlayConfig.bgImage = saved.bgImage ?? '';
    }
    else {
        overlayConfig.show = true; // 背景版 always visible
        overlayConfig.bgColor = '#081b32';
        overlayConfig.w = currentCanvasConfig.value.width;
        overlayConfig.h = currentCanvasConfig.value.height;
    }
};
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
    });
};
const toggleOverlay = async () => {
    // 背景版 is now always visible; this just resets position
    overlayConfig.show = true;
    overlayConfig.x = 0;
    overlayConfig.y = 0;
    await saveOverlay();
};
// 幕布拖动
const startCurtainDrag = (e) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const oy = overlayConfig.y;
    const onMove = (ev) => {
        const scale = canvasScale.value || 1;
        overlayConfig.x = Math.max(0, Math.round(ox + (ev.clientX - startX) / scale));
        overlayConfig.y = Math.max(0, Math.round(oy + (ev.clientY - startY) / scale));
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveOverlay();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
// 幕布调整大小
const startCurtainResize = (e, handle) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const ow = overlayConfig.w;
    const oy = overlayConfig.y;
    const oh = overlayConfig.h;
    const onMove = (ev) => {
        const scale = canvasScale.value || 1;
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        if (handle.includes('e'))
            overlayConfig.w = Math.max(100, Math.round(ow + dx));
        if (handle.includes('s'))
            overlayConfig.h = Math.max(60, Math.round(oh + dy));
        if (handle.includes('w')) {
            const nx = Math.min(ox + ow - 100, Math.max(0, Math.round(ox + dx)));
            overlayConfig.w = ow - (nx - ox);
            overlayConfig.x = nx;
        }
        if (handle.includes('n')) {
            const ny = Math.min(oy + oh - 60, Math.max(0, Math.round(oy + dy)));
            overlayConfig.h = oh - (ny - oy);
            overlayConfig.y = ny;
        }
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveOverlay();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
const MIN_CARD_WIDTH = 160;
const MIN_CARD_HEIGHT = 120;
const LEGACY_GRID_COL_PX = 42;
const LEGACY_GRID_ROW_PX = 70;
const chartTypeOptions = Array.from(new Map(CHART_CATEGORIES
    .flatMap((group) => group.types)
    .map((item) => [item.type, { label: item.label, value: item.type }])).values());
const filteredCharts = computed(() => {
    const keyword = assetSearch.value.trim().toLowerCase();
    return charts.value.filter((item) => {
        const matchKeyword = !keyword || item.name.toLowerCase().includes(keyword);
        const matchType = !assetType.value || item.chartType === assetType.value;
        return matchKeyword && matchType;
    });
});
const filteredTemplates = computed(() => {
    const keyword = assetSearch.value.trim().toLowerCase();
    return templateAssets.value.filter((item) => {
        const matchKeyword = !keyword
            || item.name.toLowerCase().includes(keyword)
            || item.description.toLowerCase().includes(keyword);
        const matchType = !assetType.value || item.chartType === assetType.value;
        return matchKeyword && matchType;
    });
});
const selectedChartAsset = computed(() => charts.value.find((item) => item.id === selectedChartId.value) ?? null);
const selectedTemplate = computed(() => templateAssets.value.find((item) => item.id === selectedTemplateId.value) ?? null);
const selectedLibraryAsset = computed(() => libraryTab.value === 'templates' ? selectedTemplate.value : selectedChartAsset.value);
const filteredDashboards = computed(() => {
    const keyword = dashboardSearch.value.trim().toLowerCase();
    return keyword ? dashboards.value.filter((item) => item.name.toLowerCase().includes(keyword)) : dashboards.value;
});
const currentPublishConfig = computed(() => normalizePublishConfig(parseReportConfig(currentDashboard.value?.configJson).publish));
const currentCoverConfig = computed(() => normalizeCoverConfig(parseReportConfig(currentDashboard.value?.configJson).cover));
const isPublished = computed(() => currentPublishConfig.value.status === 'PUBLISHED');
const shareLink = computed(() => currentDashboard.value
    ? buildPublishedLink('screen', currentDashboard.value.id, currentPublishConfig.value.shareToken)
    : '');
const previewLink = computed(() => currentDashboard.value
    ? `${window.location.origin}/preview/screen/${currentDashboard.value.id}`
    : '');
const draftPublishedLink = computed(() => currentDashboard.value
    ? buildPublishedLink('screen', currentDashboard.value.id, publishForm.shareToken || currentPublishConfig.value.shareToken)
    : '');
const roleOptions = ['ADMIN', 'ANALYST', 'VIEWER'];
const activeComponent = computed(() => components.value.find((item) => item.id === activeCompId.value) ?? null);
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null);
const getComponentConfig = (component) => normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId));
const getComponentChartConfig = (component) => getComponentConfig(component).chart;
const layeredComponents = computed(() => [...components.value].sort((left, right) => {
    const zIndexDelta = (right.zIndex ?? 0) - (left.zIndex ?? 0);
    if (zIndexDelta !== 0)
        return zIndexDelta;
    return right.id - left.id;
}));
const currentCanvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(currentDashboard.value?.configJson).canvas, 'screen'));
const matchedCanvasPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === currentCanvasConfig.value.width && item.height === currentCanvasConfig.value.height)?.id ?? 'custom');
// 背景版 presets + size controls
const matchedBgPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === overlayConfig.w && item.height === overlayConfig.h)?.id ?? 'custom');
const canvasWorkWidth = computed(() => Math.max(overlayConfig.w + 400, 2400));
// ─── 缩放控制 ───────────────────────────────────────────────────────────
const canvasScale = ref(1);
const SCALE_MIN = 0.25;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const zoomIn = () => { canvasScale.value = Math.min(SCALE_MAX, +(canvasScale.value + SCALE_STEP).toFixed(2)); };
const zoomOut = () => { canvasScale.value = Math.max(SCALE_MIN, +(canvasScale.value - SCALE_STEP).toFixed(2)); };
const zoomReset = () => { canvasScale.value = 1; };
const zoomFit = () => {
    const scrollEl = document.querySelector('.screen-stage-scroll');
    if (!scrollEl)
        return;
    const fitW = (scrollEl.clientWidth - 40) / canvasWorkWidth.value;
    const fitH = (scrollEl.clientHeight - 40) / canvasMinHeight.value;
    canvasScale.value = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +Math.min(fitW, fitH).toFixed(2)));
};
const canvasMinHeight = computed(() => {
    const bgBottom = overlayConfig.y + overlayConfig.h + 200;
    const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0);
    return Math.max(currentCanvasConfig.value.height, bgBottom, 560, occupied);
});
const hRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasWorkWidth.value; i += 100)
        marks.push(i);
    return marks;
});
const vRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasMinHeight.value; i += 100)
        marks.push(i);
    return marks;
});
const getCanvasWidth = () => Math.max(canvasRef.value?.clientWidth ?? currentCanvasConfig.value.width, MIN_CARD_WIDTH + 32);
const setChartRef = (el, componentId) => {
    if (el)
        chartRefs.set(componentId, el);
    else
        chartRefs.delete(componentId);
};
const getDashboardComponentCount = (dashboardId) => dashboardCounts.value.get(dashboardId) ?? 0;
const getDashboardCoverUrl = (dashboard) => normalizeCoverConfig(parseReportConfig(dashboard.configJson).cover).url;
const normalizeLayout = (component) => {
    if (component.width <= 24)
        component.width = Math.max(MIN_CARD_WIDTH, component.width * LEGACY_GRID_COL_PX);
    if (component.height <= 12)
        component.height = Math.max(MIN_CARD_HEIGHT, component.height * LEGACY_GRID_ROW_PX);
    if (component.posX <= 24 && component.width > 24)
        component.posX = component.posX * LEGACY_GRID_COL_PX;
    if (component.posY <= 24 && component.height > 12)
        component.posY = component.posY * LEGACY_GRID_ROW_PX;
    component.posX = Math.max(0, Number(component.posX) || 0);
    component.posY = Math.max(0, Number(component.posY) || 0);
    component.width = Math.max(MIN_CARD_WIDTH, Number(component.width) || MIN_CARD_WIDTH);
    component.height = Math.max(MIN_CARD_HEIGHT, Number(component.height) || MIN_CARD_HEIGHT);
    component.zIndex = Number(component.zIndex) || 0;
};
const getCardStyle = (component) => {
    const style = getComponentConfig(component).style;
    const shadow = style.shadowShow
        ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
        : undefined;
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
    };
};
const buildCounts = async () => {
    const entries = await Promise.all(dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length]));
    dashboardCounts.value = new Map(entries);
};
const loadBaseData = async () => {
    loading.value = true;
    try {
        const [dashboardList, chartList, datasetList, templateList] = await Promise.all([
            getDashboardList(),
            getChartList(),
            getDatasetList(),
            getTemplateList()
        ]);
        dashboards.value = dashboardList;
        charts.value = chartList;
        datasets.value = datasetList;
        templates.value = templateList;
        if (!selectedTemplateId.value && templateAssets.value.length)
            selectedTemplateId.value = templateAssets.value[0].id;
        if (!selectedChartId.value && chartList.length)
            selectedChartId.value = chartList[0].id;
        if (props.screenId) {
            // 编辑器模式：直接加载指定大屏
            const target = dashboardList.find((d) => d.id === props.screenId);
            if (target) {
                await selectDashboard(target);
            }
            else {
                ElMessage.error('未找到对应大屏');
            }
        }
        else {
            await buildCounts();
            if (dashboardList.length)
                await selectDashboard(dashboardList[0]);
        }
    }
    finally {
        loading.value = false;
    }
};
const disposeCharts = () => {
    chartInstances.forEach((instance) => instance.dispose());
    chartInstances.clear();
    chartRefs.clear();
};
const selectDashboard = async (dashboard) => {
    currentDashboard.value = dashboard;
    activeCompId.value = null;
    overlaySelected.value = false;
    await loadComponents();
    loadOverlayFromConfig();
};
const loadComponents = async () => {
    if (!currentDashboard.value)
        return;
    compLoading.value = true;
    disposeCharts();
    componentDataMap.value = new Map();
    try {
        const result = await getDashboardComponents(currentDashboard.value.id);
        result.forEach(normalizeLayout);
        components.value = result;
        dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length);
        await nextTick();
        await Promise.all(result.map((component) => loadComponentData(component)));
    }
    finally {
        compLoading.value = false;
    }
};
const loadComponentData = async (component) => {
    const chart = getComponentChartConfig(component);
    if (!chart || showNoField(component))
        return;
    try {
        const resolved = getComponentConfig(component);
        const data = await getChartData(component.chartId, {
            configJson: component.configJson,
            filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
        });
        const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart);
        const nextMap = new Map(componentDataMap.value);
        nextMap.set(component.id, materialized);
        componentDataMap.value = nextMap;
        if (isRenderableChart(component))
            renderChart(component, materialized);
    }
    catch {
        ElMessage.warning(`组件 ${chart.name} 数据加载失败`);
    }
};
const renderChart = (component, data) => {
    const el = chartRefs.get(component.id);
    if (!el)
        return;
    let chartInstance = chartInstances.get(component.id);
    if (!chartInstance) {
        chartInstance = echarts.init(el);
        chartInstances.set(component.id, chartInstance);
    }
    const resolved = getComponentConfig(component);
    const option = buildComponentOption(data, resolved.chart, resolved.style);
    postProcessChartOption(option, resolved.style, resolved.chart.name);
    chartInstance.setOption(option, true);
};
const isTableChart = (component) => ['table', 'table_summary', 'table_pivot'].includes(getComponentChartConfig(component).chartType);
const isFilterButtonChart = (component) => getComponentChartConfig(component).chartType === 'filter_button';
const isStaticWidget = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isStaticWidgetChartType(type);
};
const isRenderableChart = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isCanvasRenderableChartType(type);
};
const showNoField = (component) => {
    const config = getComponentChartConfig(component);
    const type = config.chartType ?? '';
    if (isStaticWidgetChartType(type))
        return false;
    return getMissingChartFields(config).length > 0;
};
const getTableColumns = (componentId) => componentDataMap.value.get(componentId)?.columns ?? [];
const getTableRows = (componentId) => componentDataMap.value.get(componentId)?.rawRows ?? [];
const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0);
const focusComponent = (component) => {
    overlaySelected.value = false;
    activeCompId.value = component.id;
    const nextZ = getMaxZ() + 1;
    if ((component.zIndex ?? 0) < nextZ)
        component.zIndex = nextZ;
};
const selectOverlayLayer = () => {
    overlaySelected.value = true;
    activeCompId.value = null;
};
const selectLayerComponent = (component) => {
    overlaySelected.value = false;
    activeCompId.value = component.id;
};
const applyLayoutPatch = async (patch) => {
    const component = activeComponent.value;
    if (!component)
        return;
    if (typeof patch.posX === 'number')
        component.posX = Math.max(0, Math.round(patch.posX));
    if (typeof patch.posY === 'number')
        component.posY = Math.max(0, Math.round(patch.posY));
    if (typeof patch.width === 'number')
        component.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width));
    if (typeof patch.height === 'number')
        component.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height));
    if (typeof patch.zIndex === 'number')
        component.zIndex = Math.max(0, Math.round(patch.zIndex));
    normalizeLayout(component);
    await nextTick();
    chartInstances.get(component.id)?.resize();
    await persistLayout(component);
};
const bringComponentToFront = async () => {
    const component = activeComponent.value;
    if (!component)
        return;
    await applyLayoutPatch({ zIndex: getMaxZ() + 1 });
};
const bringSpecificComponentToFront = async (component) => {
    selectLayerComponent(component);
    await applyLayoutPatch({ zIndex: getMaxZ() + 1 });
};
const handleRemoveActiveComponent = async () => {
    if (!activeComponent.value)
        return;
    await removeComponent(activeComponent.value.id);
};
const previewActiveComponent = async (payload) => {
    const component = activeComponent.value;
    if (!component)
        return;
    component.chartId = payload.chartId;
    component.configJson = payload.configJson;
    await nextTick();
    await loadComponentData(component);
};
const saveActiveComponent = async (payload) => {
    const component = activeComponent.value;
    if (!component || !currentDashboard.value)
        return;
    await updateDashboardComponent(currentDashboard.value.id, component.id, payload);
    component.chartId = payload.chartId;
    component.configJson = payload.configJson;
    await loadComponents();
    ElMessage.success('组件实例配置已保存');
};
const persistLayout = async (component) => {
    if (!currentDashboard.value)
        return;
    try {
        await updateDashboardComponent(currentDashboard.value.id, component.id, {
            posX: Math.round(component.posX),
            posY: Math.round(component.posY),
            width: Math.round(component.width),
            height: Math.round(component.height),
            zIndex: component.zIndex,
        });
    }
    catch {
        ElMessage.warning('布局保存失败，请重试');
    }
};
let interaction = null;
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const findComponent = (id) => components.value.find((item) => item.id === id);
const applyInteractionFrame = () => {
    interactionFrame = null;
    if (!interaction || !pendingPointer)
        return;
    const component = findComponent(interaction.compId);
    if (!component)
        return;
    const scale = canvasScale.value || 1;
    const dx = (pendingPointer.x - interaction.startMouseX) / scale;
    const dy = (pendingPointer.y - interaction.startMouseY) / scale;
    if (interaction.mode === 'move') {
        const maxX = Math.max(0, getCanvasWidth() - component.width);
        component.posX = Math.min(maxX, Math.max(0, interaction.startX + dx));
        component.posY = Math.max(0, interaction.startY + dy);
    }
    else {
        const handle = interaction.handle ?? 'se';
        let nextX = interaction.startX;
        let nextY = interaction.startY;
        let nextWidth = interaction.startWidth;
        let nextHeight = interaction.startHeight;
        const canvasWidth = getCanvasWidth();
        if (handle.includes('e')) {
            nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX));
        }
        if (handle.includes('s')) {
            nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy);
        }
        if (handle.includes('w')) {
            const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH;
            nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft);
            nextWidth = interaction.startWidth - (nextX - interaction.startX);
        }
        if (handle.includes('n')) {
            const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT;
            nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop);
            nextHeight = interaction.startHeight - (nextY - interaction.startY);
        }
        component.posX = Math.round(nextX);
        component.posY = Math.round(nextY);
        component.width = Math.round(nextWidth);
        component.height = Math.round(nextHeight);
        chartInstances.get(component.id)?.resize();
    }
};
const scheduleInteractionFrame = () => {
    if (interactionFrame !== null)
        return;
    interactionFrame = window.requestAnimationFrame(applyInteractionFrame);
};
const cleanupInteractionFrame = () => {
    if (interactionFrame !== null) {
        window.cancelAnimationFrame(interactionFrame);
        interactionFrame = null;
    }
    pendingPointer = null;
    document.body.classList.remove('canvas-interacting');
};
const startDrag = (event, component) => {
    focusComponent(component);
    interaction = {
        mode: 'move',
        compId: component.id,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startX: component.posX,
        startY: component.posY,
        startWidth: component.width,
        startHeight: component.height,
    };
    pendingPointer = { x: event.clientX, y: event.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const startResize = (event, component, handle = 'se') => {
    focusComponent(component);
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
    };
    pendingPointer = { x: event.clientX, y: event.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const onPointerMove = (event) => {
    if (!interaction)
        return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    scheduleInteractionFrame();
};
const onPointerUp = async () => {
    if (!interaction)
        return;
    const component = findComponent(interaction.compId);
    if (pendingPointer) {
        applyInteractionFrame();
    }
    interaction = null;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    if (component) {
        chartInstances.get(component.id)?.resize();
        await persistLayout(component);
    }
};
const openCreateDashboard = () => {
    dashForm.name = '';
    createDashVisible.value = true;
};
const handleCreateDashboard = async () => {
    if (!dashForm.name.trim()) {
        ElMessage.warning('请输入大屏名称');
        return;
    }
    dashSaving.value = true;
    try {
        const dashboard = await createDashboard({ name: dashForm.name, configJson: buildReportConfig(null, 'screen') });
        dashboards.value.unshift(dashboard);
        dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, 0);
        createDashVisible.value = false;
        await selectDashboard(dashboard);
        ElMessage.success('数据大屏创建成功');
    }
    finally {
        dashSaving.value = false;
    }
};
const handleDeleteDashboard = async (id) => {
    await deleteDashboard(id);
    dashboards.value = dashboards.value.filter((item) => item.id !== id);
    const nextCounts = new Map(dashboardCounts.value);
    nextCounts.delete(id);
    dashboardCounts.value = nextCounts;
    if (currentDashboard.value?.id === id) {
        currentDashboard.value = dashboards.value[0] ?? null;
        if (currentDashboard.value)
            await loadComponents();
        else
            components.value = [];
    }
    ElMessage.success('已删除数据大屏');
};
const openPreview = (usePublishedLink = false) => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    window.open(usePublishedLink && isPublished.value ? shareLink.value : previewLink.value, '_blank', 'noopener,noreferrer');
};
const openShareDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    shareVisible.value = true;
};
const openPublishDialog = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    const publish = currentPublishConfig.value;
    publishForm.published = publish.status === 'PUBLISHED';
    publishForm.allowAnonymousAccess = publish.allowAnonymousAccess;
    publishForm.allowedRoles = [...publish.allowedRoles];
    publishForm.shareToken = publish.shareToken;
    publishVisible.value = true;
};
const savePublishSettings = async () => {
    if (!currentDashboard.value)
        return;
    publishSaving.value = true;
    try {
        const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', {
            status: publishForm.published ? 'PUBLISHED' : 'DRAFT',
            allowAnonymousAccess: publishForm.allowAnonymousAccess,
            allowedRoles: publishForm.allowedRoles,
            shareToken: publishForm.shareToken,
            publishedAt: publishForm.published ? new Date().toISOString() : undefined,
        });
        const updated = await updateDashboard(currentDashboard.value.id, { configJson });
        currentDashboard.value = updated;
        dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item);
        publishVisible.value = false;
        ElMessage.success('发布设置已保存');
    }
    finally {
        publishSaving.value = false;
    }
};
const updateCanvasConfig = async (patch) => {
    if (!currentDashboard.value)
        return;
    canvasSaving.value = true;
    try {
        const configJson = buildReportConfig(currentDashboard.value.configJson, 'screen', undefined, patch);
        const updated = await updateDashboard(currentDashboard.value.id, { configJson });
        currentDashboard.value = updated;
        dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item);
        await nextTick();
        handleWindowResize();
    }
    finally {
        canvasSaving.value = false;
    }
};
const applyCanvasPreset = async (presetId) => {
    if (presetId === 'custom')
        return;
    const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId);
    if (!preset)
        return;
    await updateCanvasConfig({ width: preset.width, height: preset.height });
};
const applyBgPreset = async (presetId) => {
    if (presetId === 'custom')
        return;
    const preset = SCREEN_CANVAS_PRESETS.find((item) => item.id === presetId);
    if (!preset)
        return;
    overlayConfig.w = preset.width;
    overlayConfig.h = preset.height;
    await saveOverlay();
};
const updateCanvasDimension = async (dimension, value) => {
    const fallback = currentCanvasConfig.value[dimension];
    const normalizedValue = Math.max(dimension === 'width' ? 640 : 360, Math.round(Number(value) || fallback));
    if (normalizedValue === currentCanvasConfig.value[dimension])
        return;
    await updateCanvasConfig({ [dimension]: normalizedValue });
};
const onCanvasWidthChange = (value) => updateCanvasDimension('width', value ?? undefined);
const onCanvasHeightChange = (value) => updateCanvasDimension('height', value ?? undefined);
const onBgWidthChange = async (value) => {
    const w = Math.max(640, Math.round(Number(value) || overlayConfig.w));
    if (w === overlayConfig.w)
        return;
    overlayConfig.w = w;
    await saveOverlay();
};
const onBgHeightChange = async (value) => {
    const h = Math.max(360, Math.round(Number(value) || overlayConfig.h));
    if (h === overlayConfig.h)
        return;
    overlayConfig.h = h;
    await saveOverlay();
};
const triggerBgImageUpload = () => {
    bgImgInputRef.value?.click();
};
const handleBgImageUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    bgImgUploading.value = true;
    try {
        const uploaded = await uploadImage(file, { filename: file.name });
        if (!uploaded.url) {
            throw new Error('Upload failed');
        }
        overlayConfig.bgImage = uploaded.url;
        await saveOverlay();
        ElMessage.success('背景图片上传成功');
    }
    catch {
        ElMessage.error('图片上传失败');
    }
    finally {
        bgImgUploading.value = false;
        input.value = '';
    }
};
const waitForPaint = () => new Promise((resolve) => {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
    });
});
const captureScreenCover = async () => {
    const dashboard = currentDashboard.value;
    const stage = canvasRef.value;
    if (!dashboard || !stage) {
        ElMessage.warning('请先选择大屏并等待画布加载完成');
        return;
    }
    const previousActiveCompId = activeCompId.value;
    const previousOverlaySelected = overlaySelected.value;
    const previousCanvasScale = canvasScale.value;
    coverSaving.value = true;
    capturingCover.value = true;
    activeCompId.value = null;
    overlaySelected.value = false;
    canvasScale.value = 1;
    try {
        await nextTick();
        await waitForPaint();
        handleWindowResize();
        const canvas = await html2canvas(stage, {
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
            windowWidth: stage.scrollWidth,
            windowHeight: stage.scrollHeight,
        });
        const blob = await new Promise((resolve) => canvas.toBlob((result) => resolve(result), 'image/png'));
        if (!blob) {
            throw new Error('封面截图生成失败');
        }
        const uploaded = await uploadImage(blob, {
            category: 'index',
            filename: `screen-cover-${dashboard.id}-${Date.now()}.png`,
        });
        const configJson = buildReportConfig(dashboard.configJson, 'screen', undefined, undefined, {
            url: uploaded.url,
            updatedAt: new Date().toISOString(),
        });
        const updated = await updateDashboard(dashboard.id, { configJson });
        currentDashboard.value = updated;
        dashboards.value = dashboards.value.map((item) => item.id === updated.id ? updated : item);
        ElMessage.success('大屏封面已更新');
    }
    catch (error) {
        ElMessage.error(error instanceof Error ? error.message : '封面截图失败');
    }
    finally {
        capturingCover.value = false;
        activeCompId.value = previousActiveCompId;
        overlaySelected.value = previousOverlaySelected;
        canvasScale.value = previousCanvasScale;
        await nextTick();
        handleWindowResize();
        coverSaving.value = false;
    }
};
const copyShareLink = async () => {
    if (!isPublished.value) {
        ElMessage.warning('请先发布数据大屏');
        return;
    }
    try {
        await navigator.clipboard.writeText(shareLink.value);
        ElMessage.success('分享链接已复制');
    }
    catch {
        ElMessage.warning('复制失败，请手动复制链接');
    }
};
const exportScreenJson = () => {
    if (!currentDashboard.value)
        return ElMessage.warning('请先选择大屏');
    const payload = {
        screen: currentDashboard.value,
        components: components.value,
        charts: components.value
            .map((component) => chartMap.value.get(component.chartId))
            .filter((chart) => Boolean(chart))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDashboard.value.name}-screen.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
};
const getChartDatasetName = (datasetId, chartType) => {
    const datasetName = datasetMap.value.get(Number(datasetId) || -1)?.name;
    if (datasetName)
        return datasetName;
    return isStaticWidgetChartType(chartType) ? '静态组件' : '未关联数据集';
};
const getTemplateDatasetName = (template) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    return getChartDatasetName(asset.chart.datasetId, asset.chart.chartType || template.chartType);
};
const getTemplateLayoutText = (template) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    return `${asset.layout.width} × ${asset.layout.height}`;
};
const openSaveAssetDialog = () => {
    if (!activeComponent.value) {
        ElMessage.warning('请先选中一个画布组件');
        return;
    }
    const currentName = getComponentChartConfig(activeComponent.value).name || '未命名组件';
    templateForm.name = `${currentName}-复用组件`;
    templateForm.description = '';
    templateSaveVisible.value = true;
};
const saveActiveComponentAsAsset = async () => {
    if (!activeComponent.value) {
        ElMessage.warning('请先选中一个画布组件');
        return;
    }
    if (!templateForm.name.trim()) {
        ElMessage.warning('请输入组件名称');
        return;
    }
    const baseChart = chartMap.value.get(activeComponent.value.chartId) ?? null;
    const resolved = getComponentConfig(activeComponent.value);
    templateSaving.value = true;
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
        });
        templates.value = [created, ...templates.value];
        selectedTemplateId.value = created.id;
        libraryTab.value = 'templates';
        templateSaveVisible.value = false;
        ElMessage.success('组件已保存到组件库');
    }
    finally {
        templateSaving.value = false;
    }
};
const handleAddSelectedAsset = async () => {
    if (libraryTab.value === 'templates') {
        if (!selectedTemplate.value) {
            ElMessage.warning('请先选择组件资产');
            return;
        }
        await addTemplateToScreen(selectedTemplate.value);
        return;
    }
    if (!selectedChartAsset.value) {
        ElMessage.warning('请先选择组件');
        return;
    }
    await addChartToScreen(selectedChartAsset.value);
};
const quickAddChart = async (chart) => {
    selectedChartId.value = chart.id;
    await addChartToScreen(chart);
};
const quickAddTemplate = async (template) => {
    selectedTemplateId.value = template.id;
    await addTemplateToScreen(template);
};
const resolveDropPlacement = (width, height, point) => {
    if (!point || !canvasRef.value) {
        // 无拖拽坐标时，放在背景板顶部中间
        const cx = Math.max(0, Math.round((overlayConfig.w - width) / 2) + overlayConfig.x);
        const cy = overlayConfig.y + 16;
        return { posX: cx, posY: cy, width, height };
    }
    const rect = canvasRef.value.getBoundingClientRect();
    const scale = canvasScale.value || 1;
    const posX = Math.max(0, Math.min(getCanvasWidth() - width, (point.clientX - rect.left) / scale - width / 2));
    const posY = Math.max(0, (point.clientY - rect.top) / scale - 28);
    return {
        posX: Math.round(posX),
        posY: Math.round(posY),
        width,
        height,
    };
};
const addChartToScreen = async (chart, configJson, size, point) => {
    if (!currentDashboard.value) {
        ElMessage.warning('请先选择大屏');
        return;
    }
    const nextSize = size ?? {
        width: chart.chartType === 'table' ? 760 : chart.chartType === 'filter_button' ? 200 : 520,
        height: chart.chartType === 'table' ? 340 : chart.chartType === 'filter_button' ? 60 : 320,
    };
    const placement = resolveDropPlacement(nextSize.width, nextSize.height, point);
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
    });
    normalizeLayout(component);
    components.value.push(component);
    activeCompId.value = component.id;
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    await nextTick();
    await loadComponentData(component);
    ElMessage.success('组件已加入大屏');
};
const addTemplateToScreen = async (template, point) => {
    const asset = normalizeComponentAssetConfig(template.configJson);
    const chartType = asset.chart.chartType || template.chartType;
    const datasetId = Number(asset.chart.datasetId);
    const hasDataset = Number.isFinite(datasetId) && datasetId > 0;
    const createdChart = await createChart({
        name: asset.chart.name || template.name,
        datasetId: hasDataset ? datasetId : null,
        chartType,
        xField: asset.chart.xField,
        yField: asset.chart.yField,
        groupField: asset.chart.groupField,
    });
    charts.value = [createdChart, ...charts.value.filter((item) => item.id !== createdChart.id)];
    selectedChartId.value = createdChart.id;
    await addChartToScreen(createdChart, buildComponentAssetConfig(createdChart, template.configJson, {
        chart: {
            ...asset.chart,
            name: asset.chart.name || template.name,
        },
    }, asset.layout), asset.layout, point);
};
const removeComponent = async (componentId) => {
    if (!currentDashboard.value)
        return;
    await removeDashboardComponent(currentDashboard.value.id, componentId);
    chartInstances.get(componentId)?.dispose();
    chartInstances.delete(componentId);
    chartRefs.delete(componentId);
    const nextData = new Map(componentDataMap.value);
    nextData.delete(componentId);
    componentDataMap.value = nextData;
    components.value = components.value.filter((item) => item.id !== componentId);
    if (activeCompId.value === componentId)
        activeCompId.value = null;
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    ElMessage.success('组件已移除');
};
const confirmRemoveComponent = async (component) => {
    try {
        await ElMessageBox.confirm(`确定从大屏中删除组件「${getComponentChartConfig(component).name || '组件'}」吗？`, '删除组件', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
            draggable: true,
        });
        await removeComponent(component.id);
    }
    catch {
        // 用户取消删除
    }
};
const onTemplateDragStart = (event, template) => {
    selectedTemplateId.value = template.id;
    draggingTemplateId.value = template.id;
    draggingChartId.value = null;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', `template:${template.id}`);
    if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'copy';
};
const onTemplateDragEnd = () => {
    draggingTemplateId.value = null;
    stageDropActive.value = false;
};
const onChartDragStart = (event, chart) => {
    selectedChartId.value = chart.id;
    draggingChartId.value = chart.id;
    draggingTemplateId.value = null;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', `chart:${chart.id}`);
    if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'copy';
};
const onChartDragEnd = () => {
    draggingChartId.value = null;
    stageDropActive.value = false;
};
const onStageDragOver = (event) => {
    if (!draggingTemplateId.value && !draggingChartId.value)
        return;
    stageDropActive.value = true;
    if (event.dataTransfer)
        event.dataTransfer.dropEffect = 'copy';
};
const onStageDragLeave = (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget && event.currentTarget?.contains(nextTarget)) {
        return;
    }
    stageDropActive.value = false;
};
const onStageDrop = async (event) => {
    const raw = event.dataTransfer?.getData('text/plain') ?? '';
    stageDropActive.value = false;
    if (raw.startsWith('chart:') || draggingChartId.value) {
        const chartId = draggingChartId.value ?? Number(raw.replace('chart:', '') || 0);
        draggingChartId.value = null;
        draggingTemplateId.value = null;
        const chart = charts.value.find((item) => item.id === chartId);
        if (!chart)
            return;
        await addChartToScreen(chart, undefined, undefined, { clientX: event.clientX, clientY: event.clientY });
        return;
    }
    const templateId = draggingTemplateId.value ?? Number(raw.replace('template:', '') || raw || 0);
    draggingTemplateId.value = null;
    const template = templates.value.find((item) => item.id === templateId);
    if (!template)
        return;
    await addTemplateToScreen(template, { clientX: event.clientX, clientY: event.clientY });
};
const summarizeTemplateConfig = (configJson) => {
    const asset = normalizeComponentAssetConfig(configJson);
    const segments = [
        asset.chart.xField ? `维度 ${asset.chart.xField}` : '',
        asset.chart.yField ? `度量 ${asset.chart.yField}` : '',
        asset.chart.groupField ? `分组 ${asset.chart.groupField}` : '',
        asset.style.theme ? `主题 ${asset.style.theme}` : '',
    ];
    return segments.filter(Boolean).join(' / ');
};
const handleWindowResize = () => {
    chartInstances.forEach((instance) => instance.resize());
};
onMounted(async () => {
    window.addEventListener('resize', handleWindowResize);
    await loadBaseData();
});
onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    window.removeEventListener('resize', handleWindowResize);
    disposeCharts();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    screenId: null,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-cover-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input-number']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-zoom']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['curtain-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain--selected']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-primary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['el-input__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header--open']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tabs__content']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['el-tab-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card--builtin']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
// CSS variable injection 
__VLS_ctx.sidebarCollapsed ? '60px' : __VLS_ctx.leftPanelWidth + 'px';
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-root" },
    ...{ class: ({ 'screen-root--editor': __VLS_ctx.screenId }) },
});
if (__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ onMouseenter: (__VLS_ctx.hoverExpandSidebar) },
        ...{ onMouseleave: (__VLS_ctx.hoverCollapseSidebar) },
        ...{ class: "screen-left-panel" },
        ...{ class: ({ 'screen-left-panel--collapsed': __VLS_ctx.sidebarCollapsed }) },
        ...{ style: (__VLS_ctx.sidebarCollapsed ? {} : { width: __VLS_ctx.leftPanelWidth + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "lp-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleSidebar) },
        ...{ class: "lp-toggle-btn" },
        title: (__VLS_ctx.sidebarCollapsed ? '展开面板' : '收起面板'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "lp-toggle-icon" },
    });
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-title" },
            title: (__VLS_ctx.currentDashboard?.name ?? '编辑大屏'),
        });
        (__VLS_ctx.currentDashboard?.name ?? '编辑大屏');
    }
    if (__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-icon-menu" },
        });
        const __VLS_0 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            content: "组件",
            placement: "right",
        }));
        const __VLS_2 = __VLS_1({
            content: "组件",
            placement: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.sidebarCollapsed = false;
                } },
            ...{ class: "lp-icon-item" },
        });
        const __VLS_4 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
        const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
        __VLS_7.slots.default;
        const __VLS_8 = {}.Grid;
        /** @type {[typeof __VLS_components.Grid, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
        const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
        var __VLS_7;
        var __VLS_3;
        const __VLS_12 = {}.ElTooltip;
        /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            content: "图层",
            placement: "right",
        }));
        const __VLS_14 = __VLS_13({
            content: "图层",
            placement: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_15.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.sidebarCollapsed = false;
                } },
            ...{ class: "lp-icon-item" },
        });
        const __VLS_16 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
        const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        const __VLS_20 = {}.Operation;
        /** @type {[typeof __VLS_components.Operation, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
        const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
        var __VLS_19;
        var __VLS_15;
    }
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-shell lp-shell--dual" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane lp-pane--components" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-subtitle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-search" },
        });
        const __VLS_24 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            modelValue: (__VLS_ctx.assetSearch),
            placeholder: "搜索组件名称...",
            clearable: true,
            size: "small",
            prefixIcon: (__VLS_ctx.Search),
        }));
        const __VLS_26 = __VLS_25({
            modelValue: (__VLS_ctx.assetSearch),
            placeholder: "搜索组件名称...",
            clearable: true,
            size: "small",
            prefixIcon: (__VLS_ctx.Search),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-cat-scroll" },
        });
        for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.CHART_CATEGORIES))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (cat.label),
                ...{ class: "lp-cat-section" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.toggleCategory(cat.label);
                    } },
                ...{ class: "lp-cat-header" },
                ...{ class: ({ 'lp-cat-header--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-cat-label" },
            });
            (cat.label);
            const __VLS_28 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                ...{ class: "lp-cat-arrow" },
                ...{ class: ({ 'lp-cat-arrow--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            }));
            const __VLS_30 = __VLS_29({
                ...{ class: "lp-cat-arrow" },
                ...{ class: ({ 'lp-cat-arrow--open': __VLS_ctx.expandedCats.has(cat.label) }) },
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            __VLS_31.slots.default;
            const __VLS_32 = {}.ArrowRight;
            /** @type {[typeof __VLS_components.ArrowRight, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({}));
            const __VLS_34 = __VLS_33({}, ...__VLS_functionalComponentArgsRest(__VLS_33));
            var __VLS_31;
            if (__VLS_ctx.expandedCats.has(cat.label)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "lp-type-grid" },
                });
                for (const [item] of __VLS_getVForSourceType((cat.types))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.screenId))
                                    return;
                                if (!(!__VLS_ctx.sidebarCollapsed))
                                    return;
                                if (!(__VLS_ctx.expandedCats.has(cat.label)))
                                    return;
                                __VLS_ctx.assetType = item.type;
                            } },
                        key: (item.type),
                        ...{ class: "lp-type-chip" },
                        ...{ class: ({ 'lp-type-chip--active': __VLS_ctx.assetType === item.type }) },
                        title: (item.label),
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                        ...{ class: "lp-type-icon" },
                    });
                    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (item.svgIcon) }, null, null);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "lp-type-label" },
                    });
                    (item.label);
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-divider-text" },
        });
        (__VLS_ctx.assetType ? __VLS_ctx.chartTypeLabel(__VLS_ctx.assetType) : '全部组件');
        if (__VLS_ctx.assetType) {
            const __VLS_36 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
                ...{ style: {} },
            }));
            const __VLS_38 = __VLS_37({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            let __VLS_40;
            let __VLS_41;
            let __VLS_42;
            const __VLS_43 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    if (!(__VLS_ctx.assetType))
                        return;
                    __VLS_ctx.assetType = '';
                }
            };
            __VLS_39.slots.default;
            var __VLS_39;
        }
        const __VLS_44 = {}.ElTabs;
        /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            modelValue: (__VLS_ctx.libraryTab),
            ...{ class: "lp-tabs" },
        }));
        const __VLS_46 = __VLS_45({
            modelValue: (__VLS_ctx.libraryTab),
            ...{ class: "lp-tabs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_47.slots.default;
        const __VLS_48 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            label: "模板库",
            name: "templates",
        }));
        const __VLS_50 = __VLS_49({
            label: "模板库",
            name: "templates",
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        __VLS_51.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-asset-scroll" },
        });
        for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.selectedTemplateId = template.id;
                    } },
                ...{ onDblclick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.quickAddTemplate(template);
                    } },
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.onTemplateDragStart($event, template);
                    } },
                ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
                key: (template.id),
                ...{ class: "lp-asset-card" },
                ...{ class: ({ 'lp-asset-card--selected': __VLS_ctx.selectedTemplateId === template.id, 'lp-asset-card--builtin': template.builtIn }) },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-name" },
            });
            (template.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-tags" },
            });
            if (template.builtIn) {
                const __VLS_52 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }));
                const __VLS_54 = __VLS_53({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                __VLS_55.slots.default;
                var __VLS_55;
            }
            const __VLS_56 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }));
            const __VLS_58 = __VLS_57({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_57));
            __VLS_59.slots.default;
            (__VLS_ctx.chartTypeLabel(template.chartType));
            var __VLS_59;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-foot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-hint" },
            });
            (__VLS_ctx.getTemplateDatasetName(template));
            const __VLS_60 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }));
            const __VLS_62 = __VLS_61({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            let __VLS_64;
            let __VLS_65;
            let __VLS_66;
            const __VLS_67 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.quickAddTemplate(template);
                }
            };
            __VLS_63.slots.default;
            var __VLS_63;
        }
        if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
            const __VLS_68 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                description: "暂无匹配组件",
                imageSize: (42),
            }));
            const __VLS_70 = __VLS_69({
                description: "暂无匹配组件",
                imageSize: (42),
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        }
        var __VLS_51;
        const __VLS_72 = {}.ElTabPane;
        /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            label: "图表源",
            name: "charts",
        }));
        const __VLS_74 = __VLS_73({
            label: "图表源",
            name: "charts",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-asset-scroll" },
        });
        for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.selectedChartId = chart.id;
                    } },
                ...{ onDblclick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.quickAddChart(chart);
                    } },
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.onChartDragStart($event, chart);
                    } },
                ...{ onDragend: (__VLS_ctx.onChartDragEnd) },
                key: (chart.id),
                ...{ class: "lp-asset-card" },
                ...{ class: ({ 'lp-asset-card--selected': __VLS_ctx.selectedChartId === chart.id }) },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-name" },
            });
            (chart.name);
            const __VLS_76 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }));
            const __VLS_78 = __VLS_77({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
            __VLS_79.slots.default;
            (__VLS_ctx.chartTypeLabel(chart.chartType));
            var __VLS_79;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-foot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-hint" },
            });
            (__VLS_ctx.getChartDatasetName(chart.datasetId, chart.chartType));
            const __VLS_80 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }));
            const __VLS_82 = __VLS_81({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
                size: "small",
                ...{ class: "lp-ac-add" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_81));
            let __VLS_84;
            let __VLS_85;
            let __VLS_86;
            const __VLS_87 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.quickAddChart(chart);
                }
            };
            __VLS_83.slots.default;
            var __VLS_83;
        }
        if (!__VLS_ctx.filteredCharts.length && !__VLS_ctx.loading) {
            const __VLS_88 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
                description: "暂无匹配图表",
                imageSize: (42),
            }));
            const __VLS_90 = __VLS_89({
                description: "暂无匹配图表",
                imageSize: (42),
            }, ...__VLS_functionalComponentArgsRest(__VLS_89));
        }
        var __VLS_75;
        var __VLS_47;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane lp-pane--layers" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-pane-subtitle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-layer-order-tip" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-layer-scroll" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.selectOverlayLayer) },
            ...{ class: "lp-layer-item" },
            ...{ class: ({ 'lp-layer-item--active': __VLS_ctx.overlaySelected }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-layer-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-layer-name" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-layer-meta" },
        });
        (__VLS_ctx.overlayConfig.w);
        (__VLS_ctx.overlayConfig.h);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-layer-badge" },
        });
        for (const [component] of __VLS_getVForSourceType((__VLS_ctx.layeredComponents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.sidebarCollapsed))
                            return;
                        __VLS_ctx.selectLayerComponent(component);
                    } },
                key: (component.id),
                ...{ class: "lp-layer-item" },
                ...{ class: ({ 'lp-layer-item--active': __VLS_ctx.activeCompId === component.id }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-layer-item-main" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-layer-name" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-layer-meta" },
            });
            (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
            (component.zIndex ?? 0);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-layer-actions" },
            });
            const __VLS_92 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
            }));
            const __VLS_94 = __VLS_93({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_93));
            let __VLS_96;
            let __VLS_97;
            let __VLS_98;
            const __VLS_99 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.sidebarCollapsed))
                        return;
                    __VLS_ctx.bringSpecificComponentToFront(component);
                }
            };
            __VLS_95.slots.default;
            var __VLS_95;
        }
        if (!__VLS_ctx.components.length) {
            const __VLS_100 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
                description: "当前大屏还没有组件",
                imageSize: (48),
            }));
            const __VLS_102 = __VLS_101({
                description: "当前大屏还没有组件",
                imageSize: (48),
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        }
    }
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ onMousedown: (__VLS_ctx.startPanelResize) },
            ...{ class: "lp-resize-handle" },
        });
    }
}
if (!__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "screen-sidebar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-subtitle" },
    });
    const __VLS_104 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onClick: (__VLS_ctx.openCreateDashboard)
    };
    var __VLS_107;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-search-wrap" },
    });
    const __VLS_112 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }));
    const __VLS_114 = __VLS_113({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-list" },
    });
    for (const [dashboard] of __VLS_getVForSourceType((__VLS_ctx.filteredDashboards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectDashboard(dashboard);
                } },
            key: (dashboard.id),
            ...{ class: "screen-item" },
            ...{ class: ({ active: __VLS_ctx.currentDashboard?.id === dashboard.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-cover" },
            ...{ class: ({ 'screen-item-cover--empty': !__VLS_ctx.getDashboardCoverUrl(dashboard) }) },
        });
        if (__VLS_ctx.getDashboardCoverUrl(dashboard)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.getDashboardCoverUrl(dashboard)),
                alt: "",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-name" },
        });
        (dashboard.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-item-meta" },
        });
        (__VLS_ctx.getDashboardComponentCount(dashboard.id));
        const __VLS_116 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }));
        const __VLS_118 = __VLS_117({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        let __VLS_120;
        let __VLS_121;
        let __VLS_122;
        const __VLS_123 = {
            onConfirm: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.handleDeleteDashboard(dashboard.id);
            }
        };
        __VLS_119.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_119.slots;
            const __VLS_124 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }));
            const __VLS_126 = __VLS_125({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_125));
            let __VLS_128;
            let __VLS_129;
            let __VLS_130;
            const __VLS_131 = {
                onClick: () => { }
            };
            __VLS_127.slots.default;
            const __VLS_132 = {}.Delete;
            /** @type {[typeof __VLS_components.Delete, ]} */ ;
            // @ts-ignore
            const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({}));
            const __VLS_134 = __VLS_133({}, ...__VLS_functionalComponentArgsRest(__VLS_133));
            var __VLS_127;
        }
        var __VLS_119;
    }
    if (!__VLS_ctx.dashboards.length && !__VLS_ctx.loading) {
        const __VLS_136 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            description: "暂无大屏",
            imageSize: (60),
        }));
        const __VLS_138 = __VLS_137({
            description: "暂无大屏",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "side-panel library-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-subtitle" },
    });
    const __VLS_140 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        type: "success",
        effect: "plain",
    }));
    const __VLS_142 = __VLS_141({
        type: "success",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    var __VLS_143;
    const __VLS_144 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }));
    const __VLS_146 = __VLS_145({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    const __VLS_148 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        label: "组件库",
        name: "templates",
    }));
    const __VLS_150 = __VLS_149({
        label: "组件库",
        name: "templates",
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    __VLS_151.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_152 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }));
    const __VLS_154 = __VLS_153({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    const __VLS_156 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_158 = __VLS_157({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_159.slots.default;
    const __VLS_160 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        label: "全部类型",
        value: "",
    }));
    const __VLS_162 = __VLS_161({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_164 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_166 = __VLS_165({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
    }
    var __VLS_159;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedTemplateId = template.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddTemplate(template);
                } },
            ...{ onDragstart: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.onTemplateDragStart($event, template);
                } },
            ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
            key: (template.id),
            ...{ class: "asset-card template-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedTemplateId === template.id, 'asset-card--builtin': template.builtIn }) },
            draggable: "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (template.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (template.description || '可复用组件资产');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-tags" },
        });
        if (template.builtIn) {
            const __VLS_168 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
                size: "small",
                type: "success",
            }));
            const __VLS_170 = __VLS_169({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_169));
            __VLS_171.slots.default;
            var __VLS_171;
        }
        const __VLS_172 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            size: "small",
            effect: "dark",
        }));
        const __VLS_174 = __VLS_173({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        __VLS_175.slots.default;
        (__VLS_ctx.chartTypeLabel(template.chartType));
        var __VLS_175;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getTemplateDatasetName(template));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getTemplateLayoutText(template));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "template-config" },
        });
        (__VLS_ctx.summarizeTemplateConfig(template.configJson));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "drag-tip" },
        });
        const __VLS_176 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_178 = __VLS_177({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        let __VLS_180;
        let __VLS_181;
        let __VLS_182;
        const __VLS_183 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.quickAddTemplate(template);
            }
        };
        __VLS_179.slots.default;
        var __VLS_179;
    }
    if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
        const __VLS_184 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }));
        const __VLS_186 = __VLS_185({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    }
    var __VLS_151;
    const __VLS_188 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        label: "图表源",
        name: "charts",
    }));
    const __VLS_190 = __VLS_189({
        label: "图表源",
        name: "charts",
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    __VLS_191.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_192 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }));
    const __VLS_194 = __VLS_193({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    const __VLS_196 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_198 = __VLS_197({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    const __VLS_200 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        label: "全部类型",
        value: "",
    }));
    const __VLS_202 = __VLS_201({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_204 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_206 = __VLS_205({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    }
    var __VLS_199;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "asset-list" },
    });
    for (const [chart] of __VLS_getVForSourceType((__VLS_ctx.filteredCharts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.selectedChartId = chart.id;
                } },
            ...{ onDblclick: (...[$event]) => {
                    if (!(!__VLS_ctx.screenId))
                        return;
                    __VLS_ctx.quickAddChart(chart);
                } },
            key: (chart.id),
            ...{ class: "asset-card" },
            ...{ class: ({ selected: __VLS_ctx.selectedChartId === chart.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-name" },
        });
        (chart.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-tags" },
        });
        const __VLS_208 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
            size: "small",
            effect: "dark",
        }));
        const __VLS_210 = __VLS_209({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        __VLS_211.slots.default;
        (__VLS_ctx.chartTypeLabel(chart.chartType));
        var __VLS_211;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-meta" },
        });
        (__VLS_ctx.getChartDatasetName(chart.datasetId, chart.chartType));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "asset-card-fields" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (chart.xField || '未设');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (chart.yField || '未设');
    }
    if (!__VLS_ctx.filteredCharts.length && !__VLS_ctx.loading) {
        const __VLS_212 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            description: "没有匹配的图表源",
            imageSize: (60),
        }));
        const __VLS_214 = __VLS_213({
            description: "没有匹配的图表源",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    }
    var __VLS_191;
    var __VLS_147;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "screen-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading || __VLS_ctx.compLoading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-empty-state" },
    });
    const __VLS_216 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }));
    const __VLS_218 = __VLS_217({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }, ...__VLS_functionalComponentArgsRest(__VLS_217));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-title" },
    });
    (__VLS_ctx.currentDashboard.name);
    const __VLS_220 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_222 = __VLS_221({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    __VLS_223.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_223;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "screen-comp-count" },
    });
    (__VLS_ctx.components.length);
    if (__VLS_ctx.currentCoverConfig.url) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "screen-cover-pill" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.currentCoverConfig.url),
            alt: "",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-actions" },
    });
    const __VLS_224 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }));
    const __VLS_226 = __VLS_225({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    let __VLS_228;
    let __VLS_229;
    let __VLS_230;
    const __VLS_231 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    var __VLS_227;
    const __VLS_232 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.PictureFilled),
        loading: (__VLS_ctx.coverSaving),
    }));
    const __VLS_234 = __VLS_233({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.PictureFilled),
        loading: (__VLS_ctx.coverSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    let __VLS_236;
    let __VLS_237;
    let __VLS_238;
    const __VLS_239 = {
        onClick: (__VLS_ctx.captureScreenCover)
    };
    __VLS_235.slots.default;
    (__VLS_ctx.currentCoverConfig.url ? '更新封面' : '生成封面');
    var __VLS_235;
    const __VLS_240 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }));
    const __VLS_242 = __VLS_241({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    let __VLS_244;
    let __VLS_245;
    let __VLS_246;
    const __VLS_247 = {
        onClick: (__VLS_ctx.openPreview)
    };
    var __VLS_243;
    const __VLS_248 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }));
    const __VLS_250 = __VLS_249({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    let __VLS_252;
    let __VLS_253;
    let __VLS_254;
    const __VLS_255 = {
        onClick: (__VLS_ctx.exportScreenJson)
    };
    var __VLS_251;
    const __VLS_256 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        direction: "vertical",
    }));
    const __VLS_258 = __VLS_257({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
    const __VLS_260 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }));
    const __VLS_262 = __VLS_261({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    let __VLS_264;
    let __VLS_265;
    let __VLS_266;
    const __VLS_267 = {
        onClick: (__VLS_ctx.openSaveAssetDialog)
    };
    __VLS_263.slots.default;
    var __VLS_263;
    const __VLS_268 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_271.slots.default;
    (__VLS_ctx.isPublished ? '发布管理' : '发布');
    var __VLS_271;
    const __VLS_276 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_278 = __VLS_277({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_277));
    let __VLS_280;
    let __VLS_281;
    let __VLS_282;
    const __VLS_283 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_279.slots.default;
    var __VLS_279;
    const __VLS_284 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }));
    const __VLS_286 = __VLS_285({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    let __VLS_288;
    let __VLS_289;
    let __VLS_290;
    const __VLS_291 = {
        onClick: (__VLS_ctx.handleAddSelectedAsset)
    };
    __VLS_287.slots.default;
    var __VLS_287;
    const __VLS_292 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
        direction: "vertical",
    }));
    const __VLS_294 = __VLS_293({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_293));
    const __VLS_296 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_298 = __VLS_297({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    let __VLS_300;
    let __VLS_301;
    let __VLS_302;
    const __VLS_303 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.currentDashboard))
                return;
            __VLS_ctx.$emit('back');
        }
    };
    __VLS_299.slots.default;
    var __VLS_299;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-topbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-controls" },
    });
    const __VLS_304 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedBgPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_306 = __VLS_305({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.matchedBgPreset),
        size: "small",
        ...{ style: {} },
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_305));
    let __VLS_308;
    let __VLS_309;
    let __VLS_310;
    const __VLS_311 = {
        onChange: (__VLS_ctx.applyBgPreset)
    };
    __VLS_307.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.SCREEN_CANVAS_PRESETS))) {
        const __VLS_312 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }));
        const __VLS_314 = __VLS_313({
            key: (item.id),
            label: (item.label),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_313));
    }
    const __VLS_316 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
        label: "自定义",
        value: "custom",
    }));
    const __VLS_318 = __VLS_317({
        label: "自定义",
        value: "custom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_317));
    var __VLS_307;
    const __VLS_320 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_322 = __VLS_321({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_321));
    let __VLS_324;
    let __VLS_325;
    let __VLS_326;
    const __VLS_327 = {
        onChange: (__VLS_ctx.onBgWidthChange)
    };
    var __VLS_323;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-sep" },
    });
    const __VLS_328 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }));
    const __VLS_330 = __VLS_329({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
        disabled: (__VLS_ctx.canvasSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_329));
    let __VLS_332;
    let __VLS_333;
    let __VLS_334;
    const __VLS_335 = {
        onChange: (__VLS_ctx.onBgHeightChange)
    };
    var __VLS_331;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "canvas-tb-tip" },
    });
    (__VLS_ctx.components.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-zoom" },
    });
    const __VLS_336 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        content: "缩小",
    }));
    const __VLS_338 = __VLS_337({
        content: "缩小",
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    __VLS_339.slots.default;
    const __VLS_340 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale <= __VLS_ctx.SCALE_MIN),
    }));
    const __VLS_342 = __VLS_341({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale <= __VLS_ctx.SCALE_MIN),
    }, ...__VLS_functionalComponentArgsRest(__VLS_341));
    let __VLS_344;
    let __VLS_345;
    let __VLS_346;
    const __VLS_347 = {
        onClick: (__VLS_ctx.zoomOut)
    };
    __VLS_343.slots.default;
    var __VLS_343;
    var __VLS_339;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (__VLS_ctx.zoomReset) },
        ...{ class: "zoom-label" },
    });
    (Math.round(__VLS_ctx.canvasScale * 100));
    const __VLS_348 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        content: "放大",
    }));
    const __VLS_350 = __VLS_349({
        content: "放大",
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    __VLS_351.slots.default;
    const __VLS_352 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale >= __VLS_ctx.SCALE_MAX),
    }));
    const __VLS_354 = __VLS_353({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
        disabled: (__VLS_ctx.canvasScale >= __VLS_ctx.SCALE_MAX),
    }, ...__VLS_functionalComponentArgsRest(__VLS_353));
    let __VLS_356;
    let __VLS_357;
    let __VLS_358;
    const __VLS_359 = {
        onClick: (__VLS_ctx.zoomIn)
    };
    __VLS_355.slots.default;
    var __VLS_355;
    var __VLS_351;
    const __VLS_360 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
        content: "适应屏幕",
    }));
    const __VLS_362 = __VLS_361({
        content: "适应屏幕",
    }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    __VLS_363.slots.default;
    const __VLS_364 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
    }));
    const __VLS_366 = __VLS_365({
        ...{ 'onClick': {} },
        link: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_365));
    let __VLS_368;
    let __VLS_369;
    let __VLS_370;
    const __VLS_371 = {
        onClick: (__VLS_ctx.zoomFit)
    };
    __VLS_367.slots.default;
    var __VLS_367;
    var __VLS_363;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-overlay-ctrl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
    const __VLS_372 = {}.ElColorPicker;
    /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgColor),
        showAlpha: true,
        size: "small",
    }));
    const __VLS_374 = __VLS_373({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgColor),
        showAlpha: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    let __VLS_376;
    let __VLS_377;
    let __VLS_378;
    const __VLS_379 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_375;
    const __VLS_380 = {}.ElTooltip;
    /** @type {[typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, typeof __VLS_components.ElTooltip, typeof __VLS_components.elTooltip, ]} */ ;
    // @ts-ignore
    const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
        content: "不透明度",
        placement: "bottom",
    }));
    const __VLS_382 = __VLS_381({
        content: "不透明度",
        placement: "bottom",
    }, ...__VLS_functionalComponentArgsRest(__VLS_381));
    __VLS_383.slots.default;
    const __VLS_384 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        precision: (2),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }));
    const __VLS_386 = __VLS_385({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        precision: (2),
        size: "small",
        controlsPosition: "right",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    let __VLS_388;
    let __VLS_389;
    let __VLS_390;
    const __VLS_391 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_387;
    var __VLS_383;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-work-area" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-ruler-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-corner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-h-strip" },
    });
    for (const [m] of __VLS_getVForSourceType((__VLS_ctx.hRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (m),
            ...{ class: "ruler-h-mark" },
            ...{ style: ({ left: m + 'px' }) },
        });
        (m);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-main-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-v-strip" },
    });
    for (const [m] of __VLS_getVForSourceType((__VLS_ctx.vRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (m),
            ...{ class: "ruler-v-mark" },
            ...{ style: ({ top: m + 'px' }) },
        });
        (m);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-stage-scroll" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: (__VLS_ctx.onStageDragOver) },
        ...{ onDragleave: (__VLS_ctx.onStageDragLeave) },
        ...{ onDrop: (__VLS_ctx.onStageDrop) },
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.overlaySelected = false;
            } },
        ref: "canvasRef",
        ...{ class: "screen-stage" },
        ...{ class: ({ 'screen-stage--drop': __VLS_ctx.stageDropActive, 'screen-stage--capturing': __VLS_ctx.capturingCover }) },
        ...{ style: ({ width: `${__VLS_ctx.canvasWorkWidth}px`, minHeight: `${__VLS_ctx.canvasMinHeight}px`, height: `${__VLS_ctx.canvasMinHeight}px`, transform: `scale(${__VLS_ctx.canvasScale})`, transformOrigin: '0 0' }) },
    });
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    if (__VLS_ctx.overlayConfig.show) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainDrag($event);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.overlaySelected = true;
                    __VLS_ctx.activeCompId = null;
                } },
            ...{ class: "canvas-curtain" },
            ...{ class: ({ 'canvas-curtain--selected': __VLS_ctx.overlaySelected }) },
            ...{ style: (__VLS_ctx.curtainStyle) },
        });
        if (__VLS_ctx.overlaySelected) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "curtain-badge" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'n');
                } },
            ...{ class: "resize-handle resize-handle--n" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 's');
                } },
            ...{ class: "resize-handle resize-handle--s" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'e');
                } },
            ...{ class: "resize-handle resize-handle--e" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'w');
                } },
            ...{ class: "resize-handle resize-handle--w" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'ne');
                } },
            ...{ class: "resize-handle resize-handle--ne" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'nw');
                } },
            ...{ class: "resize-handle resize-handle--nw" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'se');
                } },
            ...{ class: "resize-handle resize-handle--se" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    if (!(__VLS_ctx.overlayConfig.show))
                        return;
                    __VLS_ctx.startCurtainResize($event, 'sw');
                } },
            ...{ class: "resize-handle resize-handle--sw" },
        });
    }
    for (const [component] of __VLS_getVForSourceType((__VLS_ctx.components))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.focusComponent(component);
                } },
            key: (component.id),
            ...{ class: "stage-card" },
            ...{ class: ({ active: __VLS_ctx.activeCompId === component.id }) },
            ...{ style: (__VLS_ctx.getCardStyle(component)) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startDrag($event, component);
                } },
            ...{ class: "stage-card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "stage-card-header-main" },
        });
        const __VLS_392 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
            ...{ 'onClick': {} },
            ...{ class: "remove-btn" },
            text: true,
            size: "small",
        }));
        const __VLS_394 = __VLS_393({
            ...{ 'onClick': {} },
            ...{ class: "remove-btn" },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_393));
        let __VLS_396;
        let __VLS_397;
        let __VLS_398;
        const __VLS_399 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.confirmRemoveComponent(component);
            }
        };
        __VLS_395.slots.default;
        const __VLS_400 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_401 = __VLS_asFunctionalComponent(__VLS_400, new __VLS_400({}));
        const __VLS_402 = __VLS_401({}, ...__VLS_functionalComponentArgsRest(__VLS_401));
        __VLS_403.slots.default;
        const __VLS_404 = {}.Close;
        /** @type {[typeof __VLS_components.Close, ]} */ ;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({}));
        const __VLS_406 = __VLS_405({}, ...__VLS_functionalComponentArgsRest(__VLS_405));
        var __VLS_403;
        var __VLS_395;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-body" },
        });
        if (__VLS_ctx.isFilterButtonChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-button-wrapper" },
            });
            const __VLS_408 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_409 = __VLS_asFunctionalComponent(__VLS_408, new __VLS_408({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }));
            const __VLS_410 = __VLS_409({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_409));
            __VLS_411.slots.default;
            const __VLS_412 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
                ...{ style: {} },
            }));
            const __VLS_414 = __VLS_413({
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_413));
            __VLS_415.slots.default;
            const __VLS_416 = {}.Filter;
            /** @type {[typeof __VLS_components.Filter, ]} */ ;
            // @ts-ignore
            const __VLS_417 = __VLS_asFunctionalComponent(__VLS_416, new __VLS_416({}));
            const __VLS_418 = __VLS_417({}, ...__VLS_functionalComponentArgsRest(__VLS_417));
            var __VLS_415;
            var __VLS_411;
        }
        else if (__VLS_ctx.isTableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-wrapper" },
            });
            const __VLS_420 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                showHeader: (true),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
            }));
            const __VLS_422 = __VLS_421({
                data: (__VLS_ctx.getTableRows(component.id)),
                height: "100%",
                size: "small",
                stripe: (__VLS_ctx.getComponentConfig(component).style.tableStriped),
                showHeader: (true),
                headerCellStyle: ({
                    background: __VLS_ctx.getComponentConfig(component).style.tableHeaderBg,
                    color: __VLS_ctx.getComponentConfig(component).style.tableHeaderColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableHeaderFontSize + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
                cellStyle: ({
                    color: __VLS_ctx.getComponentConfig(component).style.tableFontColor,
                    fontSize: __VLS_ctx.getComponentConfig(component).style.tableFontSize + 'px',
                    height: __VLS_ctx.getComponentConfig(component).style.tableRowHeight + 'px',
                    borderBottom: `${__VLS_ctx.getComponentConfig(component).style.tableBorderWidth}px solid ${__VLS_ctx.getComponentConfig(component).style.tableBorderColor}`,
                }),
            }, ...__VLS_functionalComponentArgsRest(__VLS_421));
            __VLS_423.slots.default;
            if (__VLS_ctx.getComponentConfig(component).style.tableShowIndex) {
                const __VLS_424 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_425 = __VLS_asFunctionalComponent(__VLS_424, new __VLS_424({
                    type: "index",
                    width: "50",
                    label: "#",
                }));
                const __VLS_426 = __VLS_425({
                    type: "index",
                    width: "50",
                    label: "#",
                }, ...__VLS_functionalComponentArgsRest(__VLS_425));
            }
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.getTableColumns(component.id)))) {
                const __VLS_428 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }));
                const __VLS_430 = __VLS_429({
                    key: (column),
                    prop: (column),
                    label: (column),
                    minWidth: "120",
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }, ...__VLS_functionalComponentArgsRest(__VLS_429));
            }
            var __VLS_423;
        }
        else if (__VLS_ctx.isStaticWidget(component)) {
            /** @type {[typeof ComponentStaticPreview, ]} */ ;
            // @ts-ignore
            const __VLS_432 = __VLS_asFunctionalComponent(ComponentStaticPreview, new ComponentStaticPreview({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                showTitle: (__VLS_ctx.getComponentConfig(component).style.showTitle),
                dark: true,
            }));
            const __VLS_433 = __VLS_432({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                showTitle: (__VLS_ctx.getComponentConfig(component).style.showTitle),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_432));
        }
        else if (__VLS_ctx.showNoField(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder warning" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(component)) {
            /** @type {[typeof ComponentDataFallback, ]} */ ;
            // @ts-ignore
            const __VLS_435 = __VLS_asFunctionalComponent(ComponentDataFallback, new ComponentDataFallback({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }));
            const __VLS_436 = __VLS_435({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_435));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ref: ((el) => __VLS_ctx.setChartRef(el, component.id)),
                ...{ class: "chart-canvas" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'n');
                } },
            ...{ class: "resize-handle resize-handle--n" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 's');
                } },
            ...{ class: "resize-handle resize-handle--s" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'e');
                } },
            ...{ class: "resize-handle resize-handle--e" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'w');
                } },
            ...{ class: "resize-handle resize-handle--w" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'ne');
                } },
            ...{ class: "resize-handle resize-handle--ne" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'nw');
                } },
            ...{ class: "resize-handle resize-handle--nw" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'se');
                } },
            ...{ class: "resize-handle resize-handle--se" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ onMousedown: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.startResize($event, component, 'sw');
                } },
            ...{ class: "resize-handle resize-handle--sw" },
        });
    }
    if (!__VLS_ctx.components.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-empty" },
        });
        const __VLS_438 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }));
        const __VLS_440 = __VLS_439({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }, ...__VLS_functionalComponentArgsRest(__VLS_439));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "screen-inspector" },
});
if (__VLS_ctx.overlaySelected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-inspector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "bg-insp-title" },
    });
    const __VLS_442 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }));
    const __VLS_444 = __VLS_443({
        ...{ 'onClick': {} },
        size: "small",
        link: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_443));
    let __VLS_446;
    let __VLS_447;
    let __VLS_448;
    const __VLS_449 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.overlaySelected))
                return;
            __VLS_ctx.overlaySelected = false;
        }
    };
    __VLS_445.slots.default;
    var __VLS_445;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_450 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_452 = __VLS_451({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.w),
        min: (640),
        max: (7680),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_451));
    let __VLS_454;
    let __VLS_455;
    let __VLS_456;
    const __VLS_457 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_453;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_458 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_460 = __VLS_459({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.h),
        min: (360),
        max: (4320),
        step: (10),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_459));
    let __VLS_462;
    let __VLS_463;
    let __VLS_464;
    const __VLS_465 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_461;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_466 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.x),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_468 = __VLS_467({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.x),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_467));
    let __VLS_470;
    let __VLS_471;
    let __VLS_472;
    const __VLS_473 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_469;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "bg-insp-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    const __VLS_474 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.y),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }));
    const __VLS_476 = __VLS_475({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.y),
        min: (0),
        size: "small",
        controlsPosition: "right",
    }, ...__VLS_functionalComponentArgsRest(__VLS_475));
    let __VLS_478;
    let __VLS_479;
    let __VLS_480;
    const __VLS_481 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_477;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    const __VLS_482 = {}.ElRadioGroup;
    /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgType),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_484 = __VLS_483({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.bgType),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_483));
    let __VLS_486;
    let __VLS_487;
    let __VLS_488;
    const __VLS_489 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    __VLS_485.slots.default;
    const __VLS_490 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({
        value: "solid",
    }));
    const __VLS_492 = __VLS_491({
        value: "solid",
    }, ...__VLS_functionalComponentArgsRest(__VLS_491));
    __VLS_493.slots.default;
    var __VLS_493;
    const __VLS_494 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
        value: "gradient",
    }));
    const __VLS_496 = __VLS_495({
        value: "gradient",
    }, ...__VLS_functionalComponentArgsRest(__VLS_495));
    __VLS_497.slots.default;
    var __VLS_497;
    const __VLS_498 = {}.ElRadioButton;
    /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
    // @ts-ignore
    const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
        value: "image",
    }));
    const __VLS_500 = __VLS_499({
        value: "image",
    }, ...__VLS_functionalComponentArgsRest(__VLS_499));
    __VLS_501.slots.default;
    var __VLS_501;
    var __VLS_485;
    if (__VLS_ctx.overlayConfig.bgType === 'solid') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_502 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }));
        const __VLS_504 = __VLS_503({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_503));
        let __VLS_506;
        let __VLS_507;
        let __VLS_508;
        const __VLS_509 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_505;
    }
    else if (__VLS_ctx.overlayConfig.bgType === 'gradient') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-gradient-preview" },
            ...{ style: ({ background: `linear-gradient(${__VLS_ctx.overlayConfig.gradientAngle}deg, ${__VLS_ctx.overlayConfig.gradientStart}, ${__VLS_ctx.overlayConfig.gradientEnd})` }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_510 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_511 = __VLS_asFunctionalComponent(__VLS_510, new __VLS_510({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientStart),
            showAlpha: true,
        }));
        const __VLS_512 = __VLS_511({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientStart),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_511));
        let __VLS_514;
        let __VLS_515;
        let __VLS_516;
        const __VLS_517 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_513;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_518 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_519 = __VLS_asFunctionalComponent(__VLS_518, new __VLS_518({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
            showAlpha: true,
        }));
        const __VLS_520 = __VLS_519({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_519));
        let __VLS_522;
        let __VLS_523;
        let __VLS_524;
        const __VLS_525 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_521;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-slider-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.overlayConfig.gradientAngle);
        const __VLS_526 = {}.ElSlider;
        /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
        // @ts-ignore
        const __VLS_527 = __VLS_asFunctionalComponent(__VLS_526, new __VLS_526({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
            min: (0),
            max: (360),
            ...{ style: {} },
        }));
        const __VLS_528 = __VLS_527({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
            min: (0),
            max: (360),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_527));
        let __VLS_530;
        let __VLS_531;
        let __VLS_532;
        const __VLS_533 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_529;
    }
    else if (__VLS_ctx.overlayConfig.bgType === 'image') {
        if (__VLS_ctx.overlayConfig.bgImage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "bg-image-thumb" },
                ...{ style: ({ backgroundImage: `url(${__VLS_ctx.overlayConfig.bgImage})` }) },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-btn-row" },
        });
        const __VLS_534 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_535 = __VLS_asFunctionalComponent(__VLS_534, new __VLS_534({
            ...{ 'onClick': {} },
            size: "small",
            loading: (__VLS_ctx.bgImgUploading),
        }));
        const __VLS_536 = __VLS_535({
            ...{ 'onClick': {} },
            size: "small",
            loading: (__VLS_ctx.bgImgUploading),
        }, ...__VLS_functionalComponentArgsRest(__VLS_535));
        let __VLS_538;
        let __VLS_539;
        let __VLS_540;
        const __VLS_541 = {
            onClick: (__VLS_ctx.triggerBgImageUpload)
        };
        __VLS_537.slots.default;
        var __VLS_537;
        if (__VLS_ctx.overlayConfig.bgImage) {
            const __VLS_542 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_543 = __VLS_asFunctionalComponent(__VLS_542, new __VLS_542({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                plain: true,
            }));
            const __VLS_544 = __VLS_543({
                ...{ 'onClick': {} },
                size: "small",
                type: "danger",
                plain: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_543));
            let __VLS_546;
            let __VLS_547;
            let __VLS_548;
            const __VLS_549 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.overlaySelected))
                        return;
                    if (!!(__VLS_ctx.overlayConfig.bgType === 'solid'))
                        return;
                    if (!!(__VLS_ctx.overlayConfig.bgType === 'gradient'))
                        return;
                    if (!(__VLS_ctx.overlayConfig.bgType === 'image'))
                        return;
                    if (!(__VLS_ctx.overlayConfig.bgImage))
                        return;
                    __VLS_ctx.overlayConfig.bgImage = '';
                    __VLS_ctx.saveOverlay();
                }
            };
            __VLS_545.slots.default;
            var __VLS_545;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.handleBgImageUpload) },
            ref: "bgImgInputRef",
            type: "file",
            accept: "image/*",
            ...{ style: {} },
        });
        /** @type {typeof __VLS_ctx.bgImgInputRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-color-row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_550 = {}.ElColorPicker;
        /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
        // @ts-ignore
        const __VLS_551 = __VLS_asFunctionalComponent(__VLS_550, new __VLS_550({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }));
        const __VLS_552 = __VLS_551({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgColor),
            showAlpha: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_551));
        let __VLS_554;
        let __VLS_555;
        let __VLS_556;
        const __VLS_557 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_553;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-slider-row" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (Math.round(__VLS_ctx.overlayConfig.opacity * 100));
    const __VLS_558 = {}.ElSlider;
    /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
    // @ts-ignore
    const __VLS_559 = __VLS_asFunctionalComponent(__VLS_558, new __VLS_558({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }));
    const __VLS_560 = __VLS_559({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.overlayConfig.opacity),
        min: (0.05),
        max: (1),
        step: (0.05),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_559));
    let __VLS_562;
    let __VLS_563;
    let __VLS_564;
    const __VLS_565 = {
        onChange: (__VLS_ctx.saveOverlay)
    };
    var __VLS_561;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bg-insp-section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "bg-insp-tip" },
    });
}
else {
    /** @type {[typeof EditorComponentInspector, ]} */ ;
    // @ts-ignore
    const __VLS_566 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
        ...{ 'onApplyLayout': {} },
        ...{ 'onBringFront': {} },
        ...{ 'onRemove': {} },
        ...{ 'onPreviewComponent': {} },
        ...{ 'onSaveComponent': {} },
        scene: "screen",
        component: (__VLS_ctx.activeComponent),
        chart: (__VLS_ctx.activeChart),
    }));
    const __VLS_567 = __VLS_566({
        ...{ 'onApplyLayout': {} },
        ...{ 'onBringFront': {} },
        ...{ 'onRemove': {} },
        ...{ 'onPreviewComponent': {} },
        ...{ 'onSaveComponent': {} },
        scene: "screen",
        component: (__VLS_ctx.activeComponent),
        chart: (__VLS_ctx.activeChart),
    }, ...__VLS_functionalComponentArgsRest(__VLS_566));
    let __VLS_569;
    let __VLS_570;
    let __VLS_571;
    const __VLS_572 = {
        onApplyLayout: (__VLS_ctx.applyLayoutPatch)
    };
    const __VLS_573 = {
        onBringFront: (__VLS_ctx.bringComponentToFront)
    };
    const __VLS_574 = {
        onRemove: (__VLS_ctx.handleRemoveActiveComponent)
    };
    const __VLS_575 = {
        onPreviewComponent: (__VLS_ctx.previewActiveComponent)
    };
    const __VLS_576 = {
        onSaveComponent: (__VLS_ctx.saveActiveComponent)
    };
    var __VLS_568;
}
const __VLS_577 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_578 = __VLS_asFunctionalComponent(__VLS_577, new __VLS_577({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_579 = __VLS_578({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_578));
__VLS_580.slots.default;
const __VLS_581 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_582 = __VLS_asFunctionalComponent(__VLS_581, new __VLS_581({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_583 = __VLS_582({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_582));
__VLS_584.slots.default;
const __VLS_585 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_586 = __VLS_asFunctionalComponent(__VLS_585, new __VLS_585({
    label: "名称",
}));
const __VLS_587 = __VLS_586({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_586));
__VLS_588.slots.default;
const __VLS_589 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_590 = __VLS_asFunctionalComponent(__VLS_589, new __VLS_589({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}));
const __VLS_591 = __VLS_590({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_590));
var __VLS_588;
var __VLS_584;
{
    const { footer: __VLS_thisSlot } = __VLS_580.slots;
    const __VLS_593 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_594 = __VLS_asFunctionalComponent(__VLS_593, new __VLS_593({
        ...{ 'onClick': {} },
    }));
    const __VLS_595 = __VLS_594({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_594));
    let __VLS_597;
    let __VLS_598;
    let __VLS_599;
    const __VLS_600 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_596.slots.default;
    var __VLS_596;
    const __VLS_601 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_602 = __VLS_asFunctionalComponent(__VLS_601, new __VLS_601({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_603 = __VLS_602({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_602));
    let __VLS_605;
    let __VLS_606;
    let __VLS_607;
    const __VLS_608 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_604.slots.default;
    var __VLS_604;
}
var __VLS_580;
const __VLS_609 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_610 = __VLS_asFunctionalComponent(__VLS_609, new __VLS_609({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}));
const __VLS_611 = __VLS_610({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_610));
__VLS_612.slots.default;
const __VLS_613 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_614 = __VLS_asFunctionalComponent(__VLS_613, new __VLS_613({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}));
const __VLS_615 = __VLS_614({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_614));
__VLS_616.slots.default;
const __VLS_617 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_618 = __VLS_asFunctionalComponent(__VLS_617, new __VLS_617({
    label: "组件名称",
}));
const __VLS_619 = __VLS_618({
    label: "组件名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_618));
__VLS_620.slots.default;
const __VLS_621 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_622 = __VLS_asFunctionalComponent(__VLS_621, new __VLS_621({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}));
const __VLS_623 = __VLS_622({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_622));
var __VLS_620;
const __VLS_625 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_626 = __VLS_asFunctionalComponent(__VLS_625, new __VLS_625({
    label: "说明",
}));
const __VLS_627 = __VLS_626({
    label: "说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_626));
__VLS_628.slots.default;
const __VLS_629 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_630 = __VLS_asFunctionalComponent(__VLS_629, new __VLS_629({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}));
const __VLS_631 = __VLS_630({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_630));
var __VLS_628;
var __VLS_616;
{
    const { footer: __VLS_thisSlot } = __VLS_612.slots;
    const __VLS_633 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_634 = __VLS_asFunctionalComponent(__VLS_633, new __VLS_633({
        ...{ 'onClick': {} },
    }));
    const __VLS_635 = __VLS_634({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_634));
    let __VLS_637;
    let __VLS_638;
    let __VLS_639;
    const __VLS_640 = {
        onClick: (...[$event]) => {
            __VLS_ctx.templateSaveVisible = false;
        }
    };
    __VLS_636.slots.default;
    var __VLS_636;
    const __VLS_641 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_642 = __VLS_asFunctionalComponent(__VLS_641, new __VLS_641({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }));
    const __VLS_643 = __VLS_642({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_642));
    let __VLS_645;
    let __VLS_646;
    let __VLS_647;
    const __VLS_648 = {
        onClick: (__VLS_ctx.saveActiveComponentAsAsset)
    };
    __VLS_644.slots.default;
    var __VLS_644;
}
var __VLS_612;
const __VLS_649 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_650 = __VLS_asFunctionalComponent(__VLS_649, new __VLS_649({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_651 = __VLS_650({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_650));
__VLS_652.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_653 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_654 = __VLS_asFunctionalComponent(__VLS_653, new __VLS_653({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_655 = __VLS_654({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_654));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_657 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_658 = __VLS_asFunctionalComponent(__VLS_657, new __VLS_657({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_659 = __VLS_658({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_658));
}
{
    const { footer: __VLS_thisSlot } = __VLS_652.slots;
    const __VLS_661 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_662 = __VLS_asFunctionalComponent(__VLS_661, new __VLS_661({
        ...{ 'onClick': {} },
    }));
    const __VLS_663 = __VLS_662({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_662));
    let __VLS_665;
    let __VLS_666;
    let __VLS_667;
    const __VLS_668 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_664.slots.default;
    var __VLS_664;
    if (!__VLS_ctx.isPublished) {
        const __VLS_669 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_670 = __VLS_asFunctionalComponent(__VLS_669, new __VLS_669({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_671 = __VLS_670({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_670));
        let __VLS_673;
        let __VLS_674;
        let __VLS_675;
        const __VLS_676 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_672.slots.default;
        var __VLS_672;
    }
    else {
        const __VLS_677 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_678 = __VLS_asFunctionalComponent(__VLS_677, new __VLS_677({
            ...{ 'onClick': {} },
        }));
        const __VLS_679 = __VLS_678({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_678));
        let __VLS_681;
        let __VLS_682;
        let __VLS_683;
        const __VLS_684 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_680.slots.default;
        var __VLS_680;
        const __VLS_685 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_686 = __VLS_asFunctionalComponent(__VLS_685, new __VLS_685({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_687 = __VLS_686({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_686));
        let __VLS_689;
        let __VLS_690;
        let __VLS_691;
        const __VLS_692 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_688.slots.default;
        var __VLS_688;
    }
}
var __VLS_652;
const __VLS_693 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_694 = __VLS_asFunctionalComponent(__VLS_693, new __VLS_693({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_695 = __VLS_694({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_694));
__VLS_696.slots.default;
const __VLS_697 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_698 = __VLS_asFunctionalComponent(__VLS_697, new __VLS_697({
    labelWidth: "120px",
}));
const __VLS_699 = __VLS_698({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_698));
__VLS_700.slots.default;
const __VLS_701 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_702 = __VLS_asFunctionalComponent(__VLS_701, new __VLS_701({
    label: "发布状态",
}));
const __VLS_703 = __VLS_702({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_702));
__VLS_704.slots.default;
const __VLS_705 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_706 = __VLS_asFunctionalComponent(__VLS_705, new __VLS_705({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_707 = __VLS_706({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_706));
var __VLS_704;
const __VLS_709 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_710 = __VLS_asFunctionalComponent(__VLS_709, new __VLS_709({
    label: "允许匿名链接",
}));
const __VLS_711 = __VLS_710({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_710));
__VLS_712.slots.default;
const __VLS_713 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_714 = __VLS_asFunctionalComponent(__VLS_713, new __VLS_713({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_715 = __VLS_714({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_714));
var __VLS_712;
const __VLS_717 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_718 = __VLS_asFunctionalComponent(__VLS_717, new __VLS_717({
    label: "允许访问角色",
}));
const __VLS_719 = __VLS_718({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_718));
__VLS_720.slots.default;
const __VLS_721 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_722 = __VLS_asFunctionalComponent(__VLS_721, new __VLS_721({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_723 = __VLS_722({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_722));
__VLS_724.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_725 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_726 = __VLS_asFunctionalComponent(__VLS_725, new __VLS_725({
        key: (role),
        label: (role),
    }));
    const __VLS_727 = __VLS_726({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_726));
    __VLS_728.slots.default;
    (role);
    var __VLS_728;
}
var __VLS_724;
var __VLS_720;
const __VLS_729 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_730 = __VLS_asFunctionalComponent(__VLS_729, new __VLS_729({
    label: "正式分享链接",
}));
const __VLS_731 = __VLS_730({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_730));
__VLS_732.slots.default;
const __VLS_733 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_734 = __VLS_asFunctionalComponent(__VLS_733, new __VLS_733({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_735 = __VLS_734({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_734));
var __VLS_732;
var __VLS_700;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "share-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_696.slots;
    const __VLS_737 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_738 = __VLS_asFunctionalComponent(__VLS_737, new __VLS_737({
        ...{ 'onClick': {} },
    }));
    const __VLS_739 = __VLS_738({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_738));
    let __VLS_741;
    let __VLS_742;
    let __VLS_743;
    const __VLS_744 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_740.slots.default;
    var __VLS_740;
    const __VLS_745 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_746 = __VLS_asFunctionalComponent(__VLS_745, new __VLS_745({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_747 = __VLS_746({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_746));
    let __VLS_749;
    let __VLS_750;
    let __VLS_751;
    const __VLS_752 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_748.slots.default;
    var __VLS_748;
}
var __VLS_696;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-left-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-shell--dual']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane--components']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-search']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-section']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-cat-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-type-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-divider-text']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-add']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-add']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane--layers']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-order-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-title']} */ ;
/** @type {__VLS_StyleScopedClasses['side-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-search-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-list']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-item-del']} */ ;
/** @type {__VLS_StyleScopedClasses['side-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-title']} */ ;
/** @type {__VLS_StyleScopedClasses['side-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['library-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['template-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['template-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['template-config']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['drag-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['template-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-top']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-card-fields']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-cover-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-label']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-sep']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-zoom']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-label']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-overlay-ctrl']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-work-area']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-ruler-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-corner']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-h-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-main-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['ruler-v-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain']} */ ;
/** @type {__VLS_StyleScopedClasses['curtain-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header-main']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--n']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--s']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--e']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--w']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--ne']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--nw']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--se']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle--sw']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-field']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-image-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-btn-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-color-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-insp-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['share-block']} */ ;
/** @type {__VLS_StyleScopedClasses['share-label']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['share-tip']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ArrowLeft: ArrowLeft,
            ArrowRight: ArrowRight,
            CirclePlus: CirclePlus,
            Close: Close,
            Delete: Delete,
            Download: Download,
            Filter: Filter,
            Grid: Grid,
            Operation: Operation,
            PictureFilled: PictureFilled,
            Plus: Plus,
            Promotion: Promotion,
            Refresh: Refresh,
            Search: Search,
            Share: Share,
            View: View,
            ComponentDataFallback: ComponentDataFallback,
            ComponentStaticPreview: ComponentStaticPreview,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            SCREEN_CANVAS_PRESETS: SCREEN_CANVAS_PRESETS,
            CHART_CATEGORIES: CHART_CATEGORIES,
            expandedCats: expandedCats,
            toggleCategory: toggleCategory,
            sidebarCollapsed: sidebarCollapsed,
            toggleSidebar: toggleSidebar,
            hoverExpandSidebar: hoverExpandSidebar,
            hoverCollapseSidebar: hoverCollapseSidebar,
            leftPanelWidth: leftPanelWidth,
            startPanelResize: startPanelResize,
            loading: loading,
            compLoading: compLoading,
            dashboards: dashboards,
            currentDashboard: currentDashboard,
            components: components,
            componentDataMap: componentDataMap,
            canvasRef: canvasRef,
            activeCompId: activeCompId,
            dashboardSearch: dashboardSearch,
            shareVisible: shareVisible,
            publishVisible: publishVisible,
            publishSaving: publishSaving,
            canvasSaving: canvasSaving,
            coverSaving: coverSaving,
            capturingCover: capturingCover,
            bgImgInputRef: bgImgInputRef,
            bgImgUploading: bgImgUploading,
            libraryTab: libraryTab,
            assetSearch: assetSearch,
            assetType: assetType,
            selectedChartId: selectedChartId,
            selectedTemplateId: selectedTemplateId,
            stageDropActive: stageDropActive,
            createDashVisible: createDashVisible,
            dashSaving: dashSaving,
            dashForm: dashForm,
            templateSaveVisible: templateSaveVisible,
            templateSaving: templateSaving,
            templateForm: templateForm,
            publishForm: publishForm,
            overlaySelected: overlaySelected,
            overlayConfig: overlayConfig,
            curtainStyle: curtainStyle,
            saveOverlay: saveOverlay,
            startCurtainDrag: startCurtainDrag,
            startCurtainResize: startCurtainResize,
            chartTypeOptions: chartTypeOptions,
            filteredCharts: filteredCharts,
            filteredTemplates: filteredTemplates,
            selectedLibraryAsset: selectedLibraryAsset,
            filteredDashboards: filteredDashboards,
            currentCoverConfig: currentCoverConfig,
            isPublished: isPublished,
            shareLink: shareLink,
            draftPublishedLink: draftPublishedLink,
            roleOptions: roleOptions,
            activeComponent: activeComponent,
            activeChart: activeChart,
            getComponentConfig: getComponentConfig,
            getComponentChartConfig: getComponentChartConfig,
            layeredComponents: layeredComponents,
            matchedBgPreset: matchedBgPreset,
            canvasWorkWidth: canvasWorkWidth,
            canvasScale: canvasScale,
            SCALE_MIN: SCALE_MIN,
            SCALE_MAX: SCALE_MAX,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            zoomReset: zoomReset,
            zoomFit: zoomFit,
            canvasMinHeight: canvasMinHeight,
            hRulerMarks: hRulerMarks,
            vRulerMarks: vRulerMarks,
            setChartRef: setChartRef,
            getDashboardComponentCount: getDashboardComponentCount,
            getDashboardCoverUrl: getDashboardCoverUrl,
            getCardStyle: getCardStyle,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            isTableChart: isTableChart,
            isFilterButtonChart: isFilterButtonChart,
            isStaticWidget: isStaticWidget,
            isRenderableChart: isRenderableChart,
            showNoField: showNoField,
            getTableColumns: getTableColumns,
            getTableRows: getTableRows,
            focusComponent: focusComponent,
            selectOverlayLayer: selectOverlayLayer,
            selectLayerComponent: selectLayerComponent,
            applyLayoutPatch: applyLayoutPatch,
            bringComponentToFront: bringComponentToFront,
            bringSpecificComponentToFront: bringSpecificComponentToFront,
            handleRemoveActiveComponent: handleRemoveActiveComponent,
            previewActiveComponent: previewActiveComponent,
            saveActiveComponent: saveActiveComponent,
            startDrag: startDrag,
            startResize: startResize,
            openCreateDashboard: openCreateDashboard,
            handleCreateDashboard: handleCreateDashboard,
            handleDeleteDashboard: handleDeleteDashboard,
            openPreview: openPreview,
            openShareDialog: openShareDialog,
            openPublishDialog: openPublishDialog,
            savePublishSettings: savePublishSettings,
            applyBgPreset: applyBgPreset,
            onBgWidthChange: onBgWidthChange,
            onBgHeightChange: onBgHeightChange,
            triggerBgImageUpload: triggerBgImageUpload,
            handleBgImageUpload: handleBgImageUpload,
            captureScreenCover: captureScreenCover,
            copyShareLink: copyShareLink,
            exportScreenJson: exportScreenJson,
            getChartDatasetName: getChartDatasetName,
            getTemplateDatasetName: getTemplateDatasetName,
            getTemplateLayoutText: getTemplateLayoutText,
            openSaveAssetDialog: openSaveAssetDialog,
            saveActiveComponentAsAsset: saveActiveComponentAsAsset,
            handleAddSelectedAsset: handleAddSelectedAsset,
            quickAddChart: quickAddChart,
            quickAddTemplate: quickAddTemplate,
            confirmRemoveComponent: confirmRemoveComponent,
            onTemplateDragStart: onTemplateDragStart,
            onTemplateDragEnd: onTemplateDragEnd,
            onChartDragStart: onChartDragStart,
            onChartDragEnd: onChartDragEnd,
            onStageDragOver: onStageDragOver,
            onStageDragLeave: onStageDragLeave,
            onStageDrop: onStageDrop,
            summarizeTemplateConfig: summarizeTemplateConfig,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
