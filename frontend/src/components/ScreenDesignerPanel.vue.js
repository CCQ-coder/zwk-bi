import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, triggerRef, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, ArrowRight, CirclePlus, Close, Delete, Download, Filter, Grid, Operation, PictureFilled, Plus, Promotion, Refresh, Search, Share, View } from '@element-plus/icons-vue';
import ComponentDataFallback from './ComponentDataFallback.vue';
import ComponentStaticPreview from './ComponentStaticPreview.vue';
import ComponentTemplatePreview from './ComponentTemplatePreview.vue';
import EditorComponentInspector from './EditorComponentInspector.vue';
import { addDashboardComponent, createDashboard, deleteDashboard, getDashboardComponents, getDashboardList, removeDashboardComponent, updateDashboard, updateDashboardComponent } from '../api/dashboard';
import { createChart, getChartData, getChartList } from '../api/chart';
import { createTemplate, getTemplateList } from '../api/chart-template';
import { getDatasetList } from '../api/dataset';
import { buildComponentAssetConfig, buildChartSnapshot, buildComponentConfig, buildComponentOption, chartTypeLabel, getConfiguredTableRows, getConfiguredTableStepCount, getMissingChartFields, isCanvasRenderableChartType, isDecorationChartType, isStaticWidgetChartType, materializeChartData, mergeComponentRequestFilters, normalizeComponentAssetConfig, normalizeComponentConfig, postProcessChartOption, resolveConfiguredTableColumns, } from '../utils/component-config';
import { echarts } from '../utils/echarts';
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
const makeDecorTitlePlateIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 16H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M28 16H36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><rect x="12" y="10" width="16" height="12" rx="6" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.4"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="24" cy="16" r="1.5" fill="currentColor"/></svg>`;
const makeDecorDividerIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 16H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><path d="M25 16H36" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/><circle cx="20" cy="16" r="4" fill="currentColor" opacity=".2" stroke="currentColor" stroke-width="1.5"/></svg>`;
const makeDecorTargetIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".68"/><circle cx="20" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><path d="M20 4V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M20 22V28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 16H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M26 16H32" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const makeDecorScanIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="30" height="22" rx="4" fill="currentColor" opacity=".08" stroke="currentColor" stroke-width="1.4"/><path d="M9 12H31" stroke="currentColor" stroke-width="2" opacity=".72"/><path d="M9 18H31" stroke="currentColor" stroke-width="1" opacity=".32"/><path d="M9 24H23" stroke="currentColor" stroke-width="1" opacity=".22"/></svg>`;
const makeDecorHexIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M15 5H25L32 16L25 27H15L8 16Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.4"/><path d="M18 11H22L25 16L22 21H18L15 16Z" fill="currentColor" opacity=".55"/></svg>`;
const makeDecorStreamIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="30" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"/><path d="M8 10H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 22H32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg>`;
const makeDecorPulseIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".35"/><rect x="11" y="11" width="18" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".7"/></svg>`;
const makeDecorBracketIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M7 11V6H14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M33 11V6H26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 21V26H14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M33 21V26H26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const makeDecorCircuitIcon = () => `<svg viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 8H14V14H26V8H34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 24H18V18H30V24H34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="14" r="2" fill="currentColor"/><circle cx="18" cy="18" r="2" fill="currentColor"/><circle cx="26" cy="14" r="2" fill="currentColor"/><circle cx="30" cy="18" r="2" fill="currentColor"/></svg>`;
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
// 柱图族
const BAR_CHART_ITEMS = [
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
];
// 线/面图族
const LINE_CHART_ITEMS = [
    createTypeItem('line', makeLineIcon()),
    createTypeItem('area', makeAreaIcon()),
    createTypeItem('line_stack', makeLineStackIcon()),
];
// 占比/分布
const PIE_CHART_ITEMS = [
    createTypeItem('pie', makePieIcon()),
    createTypeItem('doughnut', makeDoughnutIcon()),
    createTypeItem('rose', makeRoseIcon()),
    createTypeItem('funnel', makeFunnelIcon()),
    createTypeItem('treemap', makeTreemapIcon()),
];
// 关系/分布矩阵
const RELATION_CHART_ITEMS = [
    createTypeItem('radar', makeRadarIcon()),
    createTypeItem('scatter', makeScatterIcon()),
    createTypeItem('heatmap', makeHeatmapIcon()),
];
// 地理空间
const GEO_CHART_ITEMS = [
    createTypeItem('map', makeMapIcon()),
];
// 指标/仪表
const METRIC_CHART_ITEMS = [
    createTypeItem('gauge', makeGaugeIcon()),
];
// 表格族
const TABLE_CHART_ITEMS = [
    createTypeItem('table', makeTableIcon()),
    createTypeItem('table_summary', makeTableIcon()),
    createTypeItem('table_pivot', makeTableIcon()),
];
// 控件类组件（筛选/联动）
const CONTROL_COMPONENT_ITEMS = [
    createTypeItem('filter_button', makeFilterButtonIcon()),
];
// 兼容旧引用：聚合所有图表组件
const CHART_COMPONENT_ITEMS = [
    ...BAR_CHART_ITEMS,
    ...LINE_CHART_ITEMS,
    ...PIE_CHART_ITEMS,
    ...RELATION_CHART_ITEMS,
    ...GEO_CHART_ITEMS,
    ...METRIC_CHART_ITEMS,
    ...TABLE_CHART_ITEMS,
    ...CONTROL_COMPONENT_ITEMS,
];
const DECORATION_COMPONENT_ITEMS = [
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
];
const TEXT_COMPONENT_ITEMS = [
    createTypeItem('text_block', makeTextBlockIcon()),
    createTypeItem('single_field', makeMetricWidgetIcon()),
    createTypeItem('number_flipper', makeMetricWidgetIcon()),
    createTypeItem('table_rank', makeListWidgetIcon()),
    createTypeItem('text_list', makeListWidgetIcon()),
    createTypeItem('clock_display', makeClockWidgetIcon()),
    createTypeItem('word_cloud', makeWordCloudIcon()),
    createTypeItem('business_trend', makeTrendWidgetIcon()),
    createTypeItem('metric_indicator', makeMetricWidgetIcon()),
];
// 媒体/嵌入组件：iframe、图片、二维码、超链接
const MEDIA_COMPONENT_ITEMS = [
    createTypeItem('iframe_single', makeFrameWidgetIcon()),
    createTypeItem('iframe_tabs', makeFrameWidgetIcon()),
    createTypeItem('hyperlink', makeLinkWidgetIcon()),
    createTypeItem('image_list', makeListWidgetIcon()),
    createTypeItem('qr_code', makeQrWidgetIcon()),
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
];
const CHART_TYPE_ICON_MAP = new Map(CHART_CATEGORIES.flatMap((category) => category.types.map((item) => [item.type, item.svgIcon])));
const getAssetTypeIcon = (type) => CHART_TYPE_ICON_MAP.get(type) ?? makeVectorGlyphIcon();
const getAssetTone = (type) => {
    if (isDecorationChartType(type))
        return 'decoration';
    if (isStaticWidgetChartType(type))
        return 'static';
    return 'data';
};
const getAssetBadgeText = (type) => {
    if (isDecorationChartType(type))
        return '装饰';
    if (isStaticWidgetChartType(type))
        return '免数据';
    return '数据';
};
// 缓存模板/组件配置解析结果，避免 v-for 内多次 JSON.parse
const _templateConfigCache = new WeakMap();
const getTemplateAssetConfig = (template) => {
    let cached = _templateConfigCache.get(template);
    if (!cached) {
        cached = normalizeComponentAssetConfig(template.configJson);
        _templateConfigCache.set(template, cached);
    }
    return cached;
};
const isTemplateStaticAsset = (template) => isStaticWidgetChartType(getTemplateAssetConfig(template).chart.chartType || template.chartType);
const STATIC_TEMPLATE_LIBRARY = [
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
const DEFAULT_EXPANDED_CATEGORIES = new Set(['柱图', '线/面图', '占比/分布', '表格组件']);
const expandedCats = ref(new Set(CHART_CATEGORIES.map((c) => c.label).filter((label) => DEFAULT_EXPANDED_CATEGORIES.has(label))));
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
const compactEditorMode = ref(false);
const inspectorCollapsed = ref(true);
const autoFitCanvas = ref(true);
let sidebarHoverTimer = null;
const COMPACT_EDITOR_BREAKPOINT = 1440;
const effectiveSidebarCollapsed = computed(() => sidebarCollapsed.value || compactEditorMode.value);
const toggleSidebar = () => {
    if (compactEditorMode.value)
        return;
    sidebarCollapsed.value = !sidebarCollapsed.value;
    scheduleCanvasFit();
};
const hoverExpandSidebar = () => {
    if (compactEditorMode.value || !sidebarCollapsed.value)
        return;
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    sidebarHoverTimer = window.setTimeout(() => {
        sidebarCollapsed.value = false;
        scheduleCanvasFit();
    }, 200);
};
const hoverCollapseSidebar = () => {
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    // Don't auto-collapse after hover-expand; user must click toggle or move away
};
const leftPanelWidth = ref(460);
const startPanelResize = (e) => {
    const startX = e.clientX;
    const startWidth = leftPanelWidth.value;
    let rafId = 0;
    let lastX = startX;
    const applyFrame = () => { rafId = 0; leftPanelWidth.value = Math.max(380, Math.min(760, startWidth + lastX - startX)); };
    const onMove = (ev) => { lastX = ev.clientX; if (!rafId)
        rafId = requestAnimationFrame(applyFrame); };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (rafId) {
            cancelAnimationFrame(rafId);
            applyFrame();
        }
        scheduleCanvasFit();
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
            tableDimensionFields: [],
            tableMetricFields: [],
            tableCustomColumns: [],
            tableLoadLimit: 100,
            tableVisibleRows: 10,
            tableCarouselMode: 'single',
            tableCarouselInterval: 20000,
        },
    }, item.layout),
    builtIn: true,
    sortOrder: index + 1,
    createdBy: 'system',
    createdAt: '',
})));
const templateAssets = computed(() => [...localStaticTemplates.value, ...templates.value]);
const dashboardCounts = ref(new Map());
const componentDataMap = shallowRef(new Map());
const tableCarouselSteps = shallowRef(new Map());
const leftPanelRef = ref(null);
const canvasRef = ref(null);
const stageScrollRef = ref(null);
const stageScrollOffset = reactive({ left: 0, top: 0 });
const activeCompId = ref(null);
const selectedComponentIds = ref([]);
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
const hoveredTemplateId = ref(null);
const draggingTemplateId = ref(null);
const draggingChartId = ref(null);
const draggingTypeChip = ref(null);
const stageDropActive = ref(false);
const layerDragFromIdx = ref(null);
const layerDragOverIdx = ref(null);
const marqueeSelection = reactive({
    visible: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
});
const componentContextMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
});
const templatePreviewStyle = ref({ top: '0px', left: '0px' });
const undoStack = ref([]);
const undoApplying = ref(false);
const canUndo = computed(() => undoStack.value.length > 0 && !undoApplying.value);
const lastSavedOverlaySnapshot = ref(null);
const clearUndoHistory = () => {
    undoStack.value = [];
};
const pushUndoEntry = (entry) => {
    if (undoApplying.value)
        return;
    undoStack.value = [...undoStack.value, entry].slice(-3);
};
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
const stageCardRefs = new Map();
const chartInstances = new Map();
const COMPONENT_DATA_BATCH_SIZE = 4;
let interactionFrame = null;
let pendingPointer = null;
let componentDataLoadToken = 0;
let componentVisibilityObserver = null;
const visibleComponentIds = shallowRef(new Set());
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
    lastSavedOverlaySnapshot.value = cloneOverlaySnapshot();
};
const saveOverlay = async () => {
    const before = lastSavedOverlaySnapshot.value ? cloneOverlaySnapshot(lastSavedOverlaySnapshot.value) : cloneOverlaySnapshot();
    const next = cloneOverlaySnapshot();
    if (overlaySnapshotsEqual(before, next))
        return;
    await updateCanvasConfig({ overlay: next });
    pushUndoEntry({ type: 'overlay', before, after: next });
    lastSavedOverlaySnapshot.value = cloneOverlaySnapshot(next);
};
const toggleOverlay = async () => {
    // 背景版 is now always visible; this just resets position
    overlayConfig.show = true;
    overlayConfig.x = 0;
    overlayConfig.y = 0;
    await saveOverlay();
};
// 幕布拖动 (rAF 节流)
const startCurtainDrag = (e) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const oy = overlayConfig.y;
    let rafId = 0;
    let lastEv = e;
    const applyFrame = () => { rafId = 0; const scale = canvasScale.value || 1; overlayConfig.x = Math.max(0, Math.round(ox + (lastEv.clientX - startX) / scale)); overlayConfig.y = Math.max(0, Math.round(oy + (lastEv.clientY - startY) / scale)); };
    const onMove = (ev) => { lastEv = ev; if (!rafId)
        rafId = requestAnimationFrame(applyFrame); };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (rafId) {
            cancelAnimationFrame(rafId);
            applyFrame();
        }
        saveOverlay();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
// 幕布调整大小 (rAF 节流)
const startCurtainResize = (e, handle) => {
    overlaySelected.value = true;
    activeCompId.value = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = overlayConfig.x;
    const ow = overlayConfig.w;
    const oy = overlayConfig.y;
    const oh = overlayConfig.h;
    let rafId = 0;
    let lastEv = e;
    const applyFrame = () => {
        rafId = 0;
        const scale = canvasScale.value || 1;
        const dx = (lastEv.clientX - startX) / scale;
        const dy = (lastEv.clientY - startY) / scale;
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
    const onMove = (ev) => { lastEv = ev; if (!rafId)
        rafId = requestAnimationFrame(applyFrame); };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (rafId) {
            cancelAnimationFrame(rafId);
            applyFrame();
        }
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
const TEMPLATE_PREVIEW_WIDTH = 220;
const TEMPLATE_PREVIEW_HEIGHT = 248;
const TEMPLATE_PREVIEW_OFFSET = 14;
let templatePreviewHideTimer = null;
const cancelHideTemplatePreview = () => {
    if (templatePreviewHideTimer !== null) {
        clearTimeout(templatePreviewHideTimer);
        templatePreviewHideTimer = null;
    }
};
const updateTemplatePreviewPosition = (anchorEl) => {
    const panel = leftPanelRef.value;
    if (!panel)
        return;
    const panelRect = panel.getBoundingClientRect();
    const anchorRect = anchorEl.getBoundingClientRect();
    const headBottom = panel.querySelector('.lp-head')?.getBoundingClientRect().bottom ?? panelRect.top;
    const minTop = Math.max(12, headBottom - panelRect.top + 8);
    const maxLeft = Math.max(12, panelRect.width - TEMPLATE_PREVIEW_WIDTH - 12);
    const maxTop = Math.max(minTop, panelRect.height - TEMPLATE_PREVIEW_HEIGHT - 12);
    const nextLeft = Math.min(Math.max(anchorRect.right - panelRect.left + TEMPLATE_PREVIEW_OFFSET, 12), maxLeft);
    const nextTop = Math.min(Math.max(anchorRect.top - panelRect.top - 6, minTop), maxTop);
    templatePreviewStyle.value = {
        left: `${Math.round(nextLeft)}px`,
        top: `${Math.round(nextTop)}px`,
    };
};
const showTemplatePreview = (event, templateId) => {
    cancelHideTemplatePreview();
    hoveredTemplateId.value = templateId;
    if (event.currentTarget instanceof HTMLElement) {
        updateTemplatePreviewPosition(event.currentTarget);
    }
};
const scheduleHideTemplatePreview = () => {
    cancelHideTemplatePreview();
    templatePreviewHideTimer = window.setTimeout(() => {
        hoveredTemplateId.value = null;
        templatePreviewHideTimer = null;
    }, 90);
};
const hideTemplatePreview = () => {
    cancelHideTemplatePreview();
    hoveredTemplateId.value = null;
};
const selectedChartAsset = computed(() => charts.value.find((item) => item.id === selectedChartId.value) ?? null);
const selectedTemplate = computed(() => templateAssets.value.find((item) => item.id === selectedTemplateId.value) ?? null);
const hoveredTemplate = computed(() => filteredTemplates.value.find((item) => item.id === hoveredTemplateId.value) ?? null);
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
const selectedComponentIdSet = computed(() => new Set(selectedComponentIds.value));
const selectedStageComponents = computed(() => components.value.filter((item) => selectedComponentIdSet.value.has(item.id)));
const activeChart = computed(() => activeComponent.value ? chartMap.value.get(activeComponent.value.chartId) ?? null : null);
const _componentConfigCache = new Map();
const getComponentConfig = (component) => {
    const cacheKey = `${component.id}:${component.chartId}:${component.configJson ?? ''}`;
    let cached = _componentConfigCache.get(cacheKey);
    if (!cached) {
        cached = normalizeComponentConfig(component.configJson, chartMap.value.get(component.chartId));
        _componentConfigCache.set(cacheKey, cached);
        // 限制缓存条目数量，防止长时间编辑内存膨胀
        if (_componentConfigCache.size > 200) {
            const firstKey = _componentConfigCache.keys().next().value;
            _componentConfigCache.delete(firstKey);
        }
    }
    return cached;
};
const getComponentChartConfig = (component) => getComponentConfig(component).chart;
const getComponentDisplayName = (component) => getComponentChartConfig(component).name?.trim()
    || chartMap.value.get(component.chartId)?.name
    || '未命名组件';
const getComponentStatusText = (component) => {
    if (showNoField(component))
        return '待补字段';
    if (!isStaticWidget(component) && !isRenderableChart(component))
        return '预览受限';
    return '可预览';
};
const layeredComponents = computed(() => [...components.value].sort((left, right) => {
    const zIndexDelta = (right.zIndex ?? 0) - (left.zIndex ?? 0);
    if (zIndexDelta !== 0)
        return zIndexDelta;
    return right.id - left.id;
}));
const marqueeStyle = computed(() => {
    const left = Math.min(marqueeSelection.startX, marqueeSelection.currentX);
    const top = Math.min(marqueeSelection.startY, marqueeSelection.currentY);
    const width = Math.abs(marqueeSelection.currentX - marqueeSelection.startX);
    const height = Math.abs(marqueeSelection.currentY - marqueeSelection.startY);
    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
    };
});
const currentCanvasConfig = computed(() => normalizeCanvasConfig(parseReportConfig(currentDashboard.value?.configJson).canvas, 'screen'));
const matchedCanvasPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === currentCanvasConfig.value.width && item.height === currentCanvasConfig.value.height)?.id ?? 'custom');
// 背景版 presets + size controls
const matchedBgPreset = computed(() => SCREEN_CANVAS_PRESETS.find((item) => item.width === overlayConfig.w && item.height === overlayConfig.h)?.id ?? 'custom');
const canvasWorkWidth = computed(() => Math.max(overlayConfig.w + 400, 2400));
// ─── 缩放控制 ───────────────────────────────────────────────────────────
const canvasScale = ref(1);
const SCALE_MIN = 0.1;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;
const getStageScrollElement = () => stageScrollRef.value;
const applyFittedCanvasScale = () => {
    const scrollEl = getStageScrollElement();
    if (!scrollEl)
        return;
    const fitW = (scrollEl.clientWidth - 40) / canvasWorkWidth.value;
    const fitH = (scrollEl.clientHeight - 40) / canvasMinHeight.value;
    canvasScale.value = Math.max(SCALE_MIN, Math.min(SCALE_MAX, +Math.min(fitW, fitH).toFixed(2)));
};
const scheduleCanvasFit = () => {
    if (!autoFitCanvas.value)
        return;
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            applyFittedCanvasScale();
        });
    });
};
const zoomIn = () => {
    autoFitCanvas.value = false;
    canvasScale.value = Math.min(SCALE_MAX, +(canvasScale.value + SCALE_STEP).toFixed(2));
};
const zoomOut = () => {
    autoFitCanvas.value = false;
    canvasScale.value = Math.max(SCALE_MIN, +(canvasScale.value - SCALE_STEP).toFixed(2));
};
const zoomReset = () => {
    autoFitCanvas.value = false;
    canvasScale.value = 1;
};
const zoomFit = () => {
    autoFitCanvas.value = true;
    applyFittedCanvasScale();
};
const toggleInspector = () => {
    inspectorCollapsed.value = !inspectorCollapsed.value;
    scheduleCanvasFit();
};
const canvasMinHeight = computed(() => {
    const bgBottom = overlayConfig.y + overlayConfig.h + 200;
    const occupied = components.value.reduce((max, item) => Math.max(max, item.posY + item.height + 24), 0);
    return Math.max(currentCanvasConfig.value.height, bgBottom, 560, occupied);
});
watch([canvasWorkWidth, canvasMinHeight], () => {
    scheduleCanvasFit();
});
const RULER_STEP = 200; // 加大标尺间距减少 DOM 数量
const hRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasWorkWidth.value; i += RULER_STEP)
        marks.push(i);
    return marks;
});
const vRulerMarks = computed(() => {
    const marks = [];
    for (let i = 0; i <= canvasMinHeight.value; i += RULER_STEP)
        marks.push(i);
    return marks;
});
const getHRulerMarkStyle = (mark) => ({
    left: `${Math.round(mark + 20 - stageScrollOffset.left)}px`,
});
const getVRulerMarkStyle = (mark) => ({
    top: `${Math.round(mark + 20 - stageScrollOffset.top)}px`,
});
const handleStageScroll = () => {
    stageScrollOffset.left = stageScrollRef.value?.scrollLeft ?? 0;
    stageScrollOffset.top = stageScrollRef.value?.scrollTop ?? 0;
};
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
const cloneComponentLayout = (component) => ({
    posX: Math.max(0, Math.round(Number(component.posX) || 0)),
    posY: Math.max(0, Math.round(Number(component.posY) || 0)),
    width: Math.max(MIN_CARD_WIDTH, Math.round(Number(component.width) || MIN_CARD_WIDTH)),
    height: Math.max(MIN_CARD_HEIGHT, Math.round(Number(component.height) || MIN_CARD_HEIGHT)),
    zIndex: Math.max(0, Math.round(Number(component.zIndex) || 0)),
});
const cloneComponentSnapshot = (component) => ({
    id: component.id,
    chartId: component.chartId,
    configJson: component.configJson ?? '',
    ...cloneComponentLayout(component),
});
const cloneOverlaySnapshot = (source = overlayConfig) => ({
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
});
const applyOverlaySnapshot = (snapshot) => {
    overlayConfig.show = snapshot.show;
    overlayConfig.bgColor = snapshot.bgColor;
    overlayConfig.opacity = snapshot.opacity;
    overlayConfig.x = snapshot.x;
    overlayConfig.y = snapshot.y;
    overlayConfig.w = snapshot.w;
    overlayConfig.h = snapshot.h;
    overlayConfig.bgType = snapshot.bgType;
    overlayConfig.gradientStart = snapshot.gradientStart;
    overlayConfig.gradientEnd = snapshot.gradientEnd;
    overlayConfig.gradientAngle = snapshot.gradientAngle;
    overlayConfig.bgImage = snapshot.bgImage;
};
const applyComponentLayoutSnapshot = (component, snapshot) => {
    component.posX = snapshot.posX;
    component.posY = snapshot.posY;
    component.width = snapshot.width;
    component.height = snapshot.height;
    component.zIndex = snapshot.zIndex;
    normalizeLayout(component);
};
const layoutSnapshotsEqual = (left, right) => (left.posX === right.posX
    && left.posY === right.posY
    && left.width === right.width
    && left.height === right.height
    && left.zIndex === right.zIndex);
const overlaySnapshotsEqual = (left, right) => (left.show === right.show
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
    && left.bgImage === right.bgImage);
const getEditorCardPadding = (component) => {
    if (isDecorationComponent(component))
        return 0;
    const padding = Number(getComponentConfig(component).style.padding ?? 0);
    return Math.max(0, Math.min(padding, 6));
};
const getCardStyle = (component) => {
    const style = getComponentConfig(component).style;
    const shadow = style.shadowShow
        ? `0 4px ${style.shadowBlur ?? 12}px ${style.shadowColor ?? 'rgba(0,0,0,0.4)'}`
        : undefined;
    const preview = interactionPreview.value?.compId === component.id ? interactionPreview.value : null;
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
    };
};
const buildCounts = async () => {
    const entries = await Promise.all(dashboards.value.map(async (dashboard) => [dashboard.id, (await getDashboardComponents(dashboard.id)).length]));
    dashboardCounts.value = new Map(entries);
};
const yieldToMainThread = () => new Promise((resolve) => window.setTimeout(resolve, 0));
let componentDataRefreshFrame = null;
const flushComponentDataRefresh = () => {
    componentDataRefreshFrame = null;
    triggerRef(componentDataMap);
    scheduleTableCarouselSync();
};
const scheduleComponentDataRefresh = () => {
    if (componentDataRefreshFrame !== null)
        return;
    componentDataRefreshFrame = window.requestAnimationFrame(flushComponentDataRefresh);
};
const setComponentData = (componentId, data) => {
    componentDataMap.value.set(componentId, data);
    scheduleComponentDataRefresh();
};
const deleteComponentData = (componentId) => {
    if (!componentDataMap.value.has(componentId))
        return;
    componentDataMap.value.delete(componentId);
    scheduleComponentDataRefresh();
};
const clearComponentData = () => {
    if (!componentDataMap.value.size)
        return;
    componentDataMap.value.clear();
    scheduleComponentDataRefresh();
};
const clearVisibleComponentIds = () => {
    if (!visibleComponentIds.value.size)
        return;
    visibleComponentIds.value = new Set();
};
const buildComponentDataRequestSignature = (chartId, resolved) => JSON.stringify({
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
});
const disposeChartInstance = (componentId) => {
    chartInstances.get(componentId)?.dispose();
    chartInstances.delete(componentId);
    chartRefs.delete(componentId);
};
const disposeComponentVisibilityObserver = () => {
    componentVisibilityObserver?.disconnect();
    componentVisibilityObserver = null;
    stageCardRefs.clear();
    clearVisibleComponentIds();
};
const markComponentVisible = (componentId, visible) => {
    const next = new Set(visibleComponentIds.value);
    const changed = visible ? !next.has(componentId) : next.delete(componentId);
    if (!changed)
        return;
    if (visible)
        next.add(componentId);
    visibleComponentIds.value = next;
};
const isComponentVisible = (componentId) => visibleComponentIds.value.has(componentId);
const rerenderComponentFromCache = async (component) => {
    await nextTick();
    if (showNoField(component) || !isRenderableChart(component)) {
        disposeChartInstance(component.id);
        return;
    }
    const cachedData = componentDataMap.value.get(component.id);
    if (!cachedData)
        return;
    renderChart(component, cachedData);
    chartInstances.get(component.id)?.resize();
};
const syncComponentPreview = async (component, payload) => {
    const previousSignature = buildComponentDataRequestSignature(component.chartId, getComponentConfig(component));
    component.chartId = payload.chartId;
    component.configJson = payload.configJson;
    const nextResolved = normalizeComponentConfig(payload.configJson, chartMap.value.get(payload.chartId));
    const nextSignature = buildComponentDataRequestSignature(payload.chartId, nextResolved);
    if (previousSignature === nextSignature && componentDataMap.value.has(component.id)) {
        await rerenderComponentFromCache(component);
        return;
    }
    await loadComponentData(component);
};
const componentRequiresPreviewData = (component) => {
    const chart = getComponentChartConfig(component);
    const chartType = chart.chartType ?? '';
    if (chartType === 'filter_button' || showNoField(component))
        return false;
    if (isStaticWidgetChartType(chartType)) {
        return Boolean(chart.datasetId
            || chart.datasourceId
            || chart.sqlText?.trim()
            || chart.runtimeConfigText?.trim()
            || chart.xField
            || chart.yField
            || chart.groupField);
    }
    return true;
};
const shouldDeferComponentPreview = (component) => (componentRequiresPreviewData(component)
    && !isComponentVisible(component.id)
    && !componentDataMap.value.has(component.id));
const isComponentPreviewLoading = (component) => (componentRequiresPreviewData(component)
    && isComponentVisible(component.id)
    && !componentDataMap.value.has(component.id));
const handleComponentVisibilityChange = (componentId, visible) => {
    markComponentVisible(componentId, visible);
    const component = findComponent(componentId);
    if (!component)
        return;
    if (visible) {
        if (componentRequiresPreviewData(component) && !componentDataMap.value.has(componentId)) {
            void loadComponentData(component);
            return;
        }
        const cachedData = componentDataMap.value.get(componentId);
        if (cachedData && isRenderableChart(component)) {
            renderChart(component, cachedData);
            chartInstances.get(componentId)?.resize();
        }
        return;
    }
    disposeChartInstance(componentId);
};
const setupComponentVisibilityObserver = () => {
    disposeComponentVisibilityObserver();
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined')
        return false;
    if (!stageScrollRef.value)
        return false;
    componentVisibilityObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const componentId = Number(entry.target.dataset.componentId || 0);
            if (!componentId)
                continue;
            handleComponentVisibilityChange(componentId, entry.isIntersecting || entry.intersectionRatio > 0);
        }
    }, {
        root: stageScrollRef.value,
        rootMargin: '240px 160px',
        threshold: 0.01,
    });
    stageCardRefs.forEach((element, componentId) => {
        element.dataset.componentId = String(componentId);
        componentVisibilityObserver?.observe(element);
    });
    return true;
};
const loadComponentDataInBatches = async (items, loadToken) => {
    for (let start = 0; start < items.length; start += COMPONENT_DATA_BATCH_SIZE) {
        const batch = items.slice(start, start + COMPONENT_DATA_BATCH_SIZE);
        await Promise.all(batch.map((component) => loadComponentData(component, loadToken)));
        if (componentDataLoadToken !== loadToken)
            return;
        if (start + COMPONENT_DATA_BATCH_SIZE < items.length) {
            await yieldToMainThread();
        }
    }
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
    selectedComponentIds.value = [];
    activeCompId.value = null;
    overlaySelected.value = false;
    hideComponentContextMenu();
    clearUndoHistory();
    await loadComponents();
    loadOverlayFromConfig();
    await nextTick();
    scheduleCanvasFit();
};
const loadComponents = async () => {
    if (!currentDashboard.value)
        return;
    const loadToken = ++componentDataLoadToken;
    compLoading.value = true;
    disposeComponentVisibilityObserver();
    disposeCharts();
    clearComponentData();
    _componentConfigCache.clear();
    try {
        const result = await getDashboardComponents(currentDashboard.value.id);
        if (componentDataLoadToken !== loadToken)
            return;
        result.forEach(normalizeLayout);
        components.value = result;
        selectedComponentIds.value = [];
        hideComponentContextMenu();
        dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, result.length);
        await nextTick();
        const observerReady = setupComponentVisibilityObserver();
        if (!observerReady) {
            await loadComponentDataInBatches(result, loadToken);
        }
    }
    finally {
        if (componentDataLoadToken === loadToken) {
            compLoading.value = false;
        }
    }
};
const loadComponentData = async (component, loadToken = componentDataLoadToken) => {
    const resolved = getComponentConfig(component);
    const chart = resolved.chart;
    if (!chart || getMissingChartFields(chart).length > 0) {
        deleteComponentData(component.id);
        disposeChartInstance(component.id);
        return;
    }
    const requestSignature = buildComponentDataRequestSignature(component.chartId, resolved);
    try {
        const data = await getChartData(component.chartId, {
            configJson: component.configJson,
            filters: mergeComponentRequestFilters(resolved.interaction.dataFilters),
        });
        if (loadToken !== componentDataLoadToken)
            return;
        if (requestSignature !== buildComponentDataRequestSignature(component.chartId, getComponentConfig(component)))
            return;
        const materialized = materializeChartData(data.rawRows ?? [], data.columns ?? [], chart);
        setComponentData(component.id, materialized);
        if (isRenderableChart(component)) {
            renderChart(component, materialized);
        }
        else {
            disposeChartInstance(component.id);
        }
    }
    catch {
        if (loadToken !== componentDataLoadToken)
            return;
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
const isDecorationComponent = (component) => {
    const type = getComponentChartConfig(component).chartType ?? '';
    return isDecorationChartType(type);
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
const tableCarouselTimers = new Map();
const tableCarouselRuntimeSignatures = new Map();
let tableCarouselSyncFrame = null;
const scheduleTableCarouselSync = () => {
    if (tableCarouselSyncFrame !== null)
        return;
    tableCarouselSyncFrame = window.requestAnimationFrame(() => {
        tableCarouselSyncFrame = null;
        syncTableCarousels();
    });
};
const setTableCarouselStep = (componentId, step) => {
    tableCarouselSteps.value.set(componentId, step);
    triggerRef(tableCarouselSteps);
};
const clearTableCarouselStep = (componentId) => {
    if (!tableCarouselSteps.value.delete(componentId))
        return;
    triggerRef(tableCarouselSteps);
};
const stopTableCarousel = (componentId) => {
    const timerId = tableCarouselTimers.get(componentId);
    if (timerId == null)
        return;
    window.clearInterval(timerId);
    tableCarouselTimers.delete(componentId);
};
const stopAllTableCarousels = () => {
    Array.from(tableCarouselTimers.keys()).forEach((componentId) => stopTableCarousel(componentId));
    tableCarouselRuntimeSignatures.clear();
    tableCarouselSteps.value.clear();
    triggerRef(tableCarouselSteps);
};
const syncTableCarousels = () => {
    const activeTableIds = new Set();
    components.value.forEach((component) => {
        if (!isTableChart(component))
            return;
        activeTableIds.add(component.id);
        const chartConfig = getComponentConfig(component).chart;
        const rawRows = componentDataMap.value.get(component.id)?.rawRows ?? [];
        const stepCount = getConfiguredTableStepCount(chartConfig, rawRows);
        const runtimeSignature = [
            chartConfig.tableLoadLimit,
            chartConfig.tableVisibleRows,
            chartConfig.tableCarouselMode,
            chartConfig.tableCarouselInterval,
            rawRows.length,
        ].join(':');
        const previousSignature = tableCarouselRuntimeSignatures.get(component.id);
        if (previousSignature === runtimeSignature && (stepCount <= 1 || tableCarouselTimers.has(component.id))) {
            if (stepCount <= 1 && (tableCarouselSteps.value.get(component.id) ?? 0) !== 0) {
                setTableCarouselStep(component.id, 0);
            }
            return;
        }
        tableCarouselRuntimeSignatures.set(component.id, runtimeSignature);
        stopTableCarousel(component.id);
        if (stepCount <= 1) {
            setTableCarouselStep(component.id, 0);
            return;
        }
        const currentStep = tableCarouselSteps.value.get(component.id) ?? 0;
        setTableCarouselStep(component.id, currentStep >= stepCount ? 0 : currentStep);
        tableCarouselTimers.set(component.id, window.setInterval(() => {
            const nextStep = ((tableCarouselSteps.value.get(component.id) ?? 0) + 1) % stepCount;
            setTableCarouselStep(component.id, nextStep);
        }, Math.max(1000, chartConfig.tableCarouselInterval || 20000)));
    });
    Array.from(tableCarouselTimers.keys()).forEach((componentId) => {
        if (!activeTableIds.has(componentId))
            stopTableCarousel(componentId);
    });
    Array.from(tableCarouselRuntimeSignatures.keys()).forEach((componentId) => {
        if (!activeTableIds.has(componentId))
            tableCarouselRuntimeSignatures.delete(componentId);
    });
    Array.from(tableCarouselSteps.value.keys()).forEach((componentId) => {
        if (!activeTableIds.has(componentId))
            clearTableCarouselStep(componentId);
    });
};
const tableCarouselComponentSignature = computed(() => components.value
    .filter((component) => isTableChart(component))
    .map((component) => `${component.id}:${component.chartId}:${component.configJson ?? ''}`)
    .join('|'));
watch(tableCarouselComponentSignature, () => {
    scheduleTableCarouselSync();
}, { immediate: true });
const getTableColumns = (component) => resolveConfiguredTableColumns(getComponentConfig(component).chart, componentDataMap.value.get(component.id)?.columns ?? []);
const getTableRows = (component) => getConfiguredTableRows(getComponentConfig(component).chart, componentDataMap.value.get(component.id)?.rawRows ?? [], tableCarouselSteps.value.get(component.id) ?? 0);
const setStageCardRef = (el, componentId) => {
    const previous = stageCardRefs.get(componentId);
    if (previous && componentVisibilityObserver) {
        componentVisibilityObserver.unobserve(previous);
    }
    if (!el) {
        stageCardRefs.delete(componentId);
        markComponentVisible(componentId, false);
        return;
    }
    el.dataset.componentId = String(componentId);
    stageCardRefs.set(componentId, el);
    componentVisibilityObserver?.observe(el);
};
const getMaxZ = () => components.value.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0);
const isComponentSelected = (componentId) => selectedComponentIdSet.value.has(componentId);
const normalizeSelectedComponentIds = (componentIds) => {
    const availableIds = new Set(components.value.map((item) => item.id));
    return Array.from(new Set(componentIds)).filter((id) => availableIds.has(id));
};
const setSelectedComponents = (componentIds, primaryId = componentIds.at(-1) ?? null) => {
    const nextIds = normalizeSelectedComponentIds(componentIds);
    selectedComponentIds.value = nextIds;
    overlaySelected.value = false;
    activeCompId.value = primaryId !== null && nextIds.includes(primaryId)
        ? primaryId
        : nextIds.at(-1) ?? null;
};
const clearComponentSelection = () => {
    selectedComponentIds.value = [];
    activeCompId.value = null;
    overlaySelected.value = false;
};
const hideComponentContextMenu = () => {
    componentContextMenu.visible = false;
};
const resetMarqueeSelection = () => {
    marqueeSelection.visible = false;
    marqueeSelection.startX = 0;
    marqueeSelection.startY = 0;
    marqueeSelection.currentX = 0;
    marqueeSelection.currentY = 0;
};
const getCanvasPointerPosition = (event) => {
    const rect = canvasRef.value?.getBoundingClientRect();
    const scale = canvasScale.value || 1;
    if (!rect)
        return { x: 0, y: 0 };
    return {
        x: Math.max(0, Math.min(canvasWorkWidth.value, Math.round((event.clientX - rect.left) / scale))),
        y: Math.max(0, Math.min(canvasMinHeight.value, Math.round((event.clientY - rect.top) / scale))),
    };
};
const collectComponentsInMarquee = () => {
    const left = Math.min(marqueeSelection.startX, marqueeSelection.currentX);
    const right = Math.max(marqueeSelection.startX, marqueeSelection.currentX);
    const top = Math.min(marqueeSelection.startY, marqueeSelection.currentY);
    const bottom = Math.max(marqueeSelection.startY, marqueeSelection.currentY);
    return components.value
        .filter((component) => component.posX < right
        && component.posX + component.width > left
        && component.posY < bottom
        && component.posY + component.height > top)
        .map((component) => component.id);
};
const startStageMarquee = (event, options = {}) => {
    if (event.button !== 0)
        return;
    hideComponentContextMenu();
    const start = getCanvasPointerPosition(event);
    marqueeSelection.startX = start.x;
    marqueeSelection.startY = start.y;
    marqueeSelection.currentX = start.x;
    marqueeSelection.currentY = start.y;
    marqueeSelection.visible = false;
    let didDrag = false;
    const onMove = (nextEvent) => {
        const next = getCanvasPointerPosition(nextEvent);
        marqueeSelection.currentX = next.x;
        marqueeSelection.currentY = next.y;
        if (!didDrag && (Math.abs(next.x - start.x) > 4 || Math.abs(next.y - start.y) > 4)) {
            didDrag = true;
            marqueeSelection.visible = true;
        }
        if (!didDrag)
            return;
        setSelectedComponents(collectComponentsInMarquee());
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!didDrag) {
            if (options.selectOverlayOnClick) {
                selectOverlayLayer();
            }
            else {
                clearComponentSelection();
            }
        }
        resetMarqueeSelection();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
};
const handleCurtainPointerDown = (event) => {
    if (event.button !== 0)
        return;
    hideComponentContextMenu();
    if (overlaySelected.value) {
        startCurtainDrag(event);
        return;
    }
    startStageMarquee(event, { selectOverlayOnClick: true });
};
const focusComponent = (component, options = {}) => {
    const preserveSelection = options.preserveSelection === true && isComponentSelected(component.id);
    if (preserveSelection) {
        overlaySelected.value = false;
        activeCompId.value = component.id;
    }
    else {
        setSelectedComponents([component.id], component.id);
    }
    if (options.bringToFront === false)
        return;
    const nextZ = getMaxZ() + 1;
    if ((component.zIndex ?? 0) < nextZ)
        component.zIndex = nextZ;
};
const selectOverlayLayer = () => {
    overlaySelected.value = true;
    selectedComponentIds.value = [];
    activeCompId.value = null;
    hideComponentContextMenu();
};
const selectLayerComponent = (component) => {
    hideComponentContextMenu();
    setSelectedComponents([component.id], component.id);
};
const handleStageCardMouseDown = (event, component) => {
    hideComponentContextMenu();
    if (event.button !== 0)
        return;
    const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id);
    focusComponent(component, { preserveSelection, bringToFront: !preserveSelection });
};
const openComponentContextMenu = (event, component) => {
    if (!isComponentSelected(component.id)) {
        setSelectedComponents([component.id], component.id);
    }
    else {
        overlaySelected.value = false;
        activeCompId.value = component.id;
    }
    const menuWidth = 176;
    const menuHeight = 236;
    componentContextMenu.x = Math.max(12, Math.min(event.clientX, window.innerWidth - menuWidth - 12));
    componentContextMenu.y = Math.max(12, Math.min(event.clientY, window.innerHeight - menuHeight - 12));
    componentContextMenu.visible = true;
};
const buildPatchedLayoutSnapshot = (component, patch) => {
    const next = cloneComponentLayout(component);
    if (typeof patch.posX === 'number')
        next.posX = Math.max(0, Math.round(patch.posX));
    if (typeof patch.posY === 'number')
        next.posY = Math.max(0, Math.round(patch.posY));
    if (typeof patch.width === 'number')
        next.width = Math.max(MIN_CARD_WIDTH, Math.round(patch.width));
    if (typeof patch.height === 'number')
        next.height = Math.max(MIN_CARD_HEIGHT, Math.round(patch.height));
    if (typeof patch.zIndex === 'number')
        next.zIndex = Math.max(0, Math.round(patch.zIndex));
    return next;
};
const applyLayoutPatch = async (patch) => {
    const component = activeComponent.value;
    if (!component)
        return;
    const before = cloneComponentLayout(component);
    const next = buildPatchedLayoutSnapshot(component, patch);
    if (layoutSnapshotsEqual(before, next))
        return;
    applyComponentLayoutSnapshot(component, next);
    await nextTick();
    chartInstances.get(component.id)?.resize();
    const persisted = await persistLayout(component, next);
    if (persisted) {
        pushUndoEntry({ type: 'layout', componentId: component.id, before, after: next });
    }
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
const buildZOrderedComponents = () => [...components.value].sort((left, right) => {
    const zDelta = (left.zIndex ?? 0) - (right.zIndex ?? 0);
    if (zDelta !== 0)
        return zDelta;
    return left.id - right.id;
});
const applyOrderedZIndices = async (orderedComponents) => {
    const persistPromises = [];
    orderedComponents.forEach((component, index) => {
        const nextZ = index + 2;
        if ((component.zIndex ?? 0) === nextZ)
            return;
        component.zIndex = nextZ;
        persistPromises.push(persistLayout(component, cloneComponentLayout(component)));
    });
    if (persistPromises.length) {
        await Promise.all(persistPromises);
    }
};
const getSelectedComponentsForAction = () => {
    if (selectedStageComponents.value.length)
        return [...selectedStageComponents.value];
    return activeComponent.value ? [activeComponent.value] : [];
};
const bringSelectedComponentsToFront = async () => {
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const selectedIds = new Set(selected.map((component) => component.id));
    const ordered = buildZOrderedComponents();
    const nextOrdered = [
        ...ordered.filter((component) => !selectedIds.has(component.id)),
        ...ordered.filter((component) => selectedIds.has(component.id)),
    ];
    await applyOrderedZIndices(nextOrdered);
};
const sendSelectedComponentsToBack = async () => {
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const selectedIds = new Set(selected.map((component) => component.id));
    const ordered = buildZOrderedComponents();
    const nextOrdered = [
        ...ordered.filter((component) => selectedIds.has(component.id)),
        ...ordered.filter((component) => !selectedIds.has(component.id)),
    ];
    await applyOrderedZIndices(nextOrdered);
};
const moveSelectedComponentsForward = async () => {
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const selectedIds = new Set(selected.map((component) => component.id));
    const ordered = buildZOrderedComponents();
    for (let index = ordered.length - 2; index >= 0; index -= 1) {
        if (selectedIds.has(ordered[index].id) && !selectedIds.has(ordered[index + 1].id)) {
            ;
            [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
        }
    }
    await applyOrderedZIndices(ordered);
};
const moveSelectedComponentsBackward = async () => {
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const selectedIds = new Set(selected.map((component) => component.id));
    const ordered = buildZOrderedComponents();
    for (let index = 1; index < ordered.length; index += 1) {
        if (selectedIds.has(ordered[index].id) && !selectedIds.has(ordered[index - 1].id)) {
            ;
            [ordered[index], ordered[index - 1]] = [ordered[index - 1], ordered[index]];
        }
    }
    await applyOrderedZIndices(ordered);
};
const duplicateSelectedComponents = async () => {
    if (!currentDashboard.value)
        return;
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const nextSelectedIds = [];
    for (const [index, component] of selected.entries()) {
        const duplicated = await addDashboardComponent(currentDashboard.value.id, {
            chartId: component.chartId,
            posX: component.posX + 24 * (index + 1),
            posY: component.posY + 24 * (index + 1),
            width: component.width,
            height: component.height,
            zIndex: getMaxZ() + 1,
            configJson: component.configJson ?? '',
        });
        normalizeLayout(duplicated);
        components.value.push(duplicated);
        nextSelectedIds.push(duplicated.id);
        pushUndoEntry({ type: 'add-component', component: cloneComponentSnapshot(duplicated) });
    }
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    setSelectedComponents(nextSelectedIds, nextSelectedIds.at(-1) ?? null);
    await nextTick();
    await Promise.all(nextSelectedIds.map(async (componentId) => {
        const duplicated = components.value.find((item) => item.id === componentId);
        if (!duplicated)
            return;
        await loadComponentData(duplicated);
    }));
    ElMessage.success(nextSelectedIds.length > 1 ? `已复制 ${nextSelectedIds.length} 个组件` : '组件已复制');
};
const removeSelectedComponents = async () => {
    const selected = getSelectedComponentsForAction();
    hideComponentContextMenu();
    if (!selected.length)
        return;
    const message = selected.length > 1
        ? `确定删除当前选中的 ${selected.length} 个组件吗？`
        : `确定删除组件「${getComponentDisplayName(selected[0])}」吗？`;
    try {
        await ElMessageBox.confirm(message, '删除组件', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
            draggable: true,
        });
        for (const component of selected) {
            await removeComponent(component.id, { silent: true });
        }
        clearComponentSelection();
        ElMessage.success(selected.length > 1 ? `已删除 ${selected.length} 个组件` : '组件已移除');
    }
    catch {
        // 用户取消删除
    }
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
    await syncComponentPreview(component, payload);
};
const saveActiveComponent = async (payload) => {
    const component = activeComponent.value;
    if (!component || !currentDashboard.value)
        return;
    const before = {
        chartId: component.chartId,
        configJson: component.configJson ?? '',
    };
    const updated = await updateDashboardComponent(currentDashboard.value.id, component.id, payload);
    const next = {
        chartId: updated.chartId ?? payload.chartId,
        configJson: updated.configJson ?? payload.configJson,
    };
    await syncComponentPreview(component, next);
    if (before.chartId !== next.chartId || before.configJson !== next.configJson) {
        pushUndoEntry({ type: 'component-config', componentId: component.id, before, after: next });
    }
    ElMessage.success('组件实例配置已保存');
};
const persistLayout = async (component, layout = cloneComponentLayout(component)) => {
    if (!currentDashboard.value)
        return;
    try {
        await updateDashboardComponent(currentDashboard.value.id, component.id, {
            posX: layout.posX,
            posY: layout.posY,
            width: layout.width,
            height: layout.height,
            zIndex: layout.zIndex,
        });
        return true;
    }
    catch {
        ElMessage.warning('布局保存失败，请重试');
        return false;
    }
};
let interaction = null;
const interactionPreview = shallowRef(null);
const resizeHandles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const SNAP_TOLERANCE = 6;
const findComponent = (id) => components.value.find((item) => item.id === id);
const resizeInteractionChart = (componentId) => {
    chartInstances.get(componentId)?.resize();
};
const getResizeTransformOrigin = (handle) => {
    const horizontal = handle.includes('w') ? 'right' : handle.includes('e') ? 'left' : 'center';
    const vertical = handle.includes('n') ? 'bottom' : handle.includes('s') ? 'top' : 'center';
    return `${horizontal} ${vertical}`;
};
const normalizeGuideLines = (lines, max) => Array.from(new Set(lines
    .map((line) => Math.round(line))
    .filter((line) => line >= 0 && line <= max)));
const collectSnapTargets = (componentId) => {
    const vertical = [overlayConfig.x, overlayConfig.x + overlayConfig.w / 2, overlayConfig.x + overlayConfig.w];
    const horizontal = [overlayConfig.y, overlayConfig.y + overlayConfig.h / 2, overlayConfig.y + overlayConfig.h];
    components.value.forEach((item) => {
        if (item.id === componentId)
            return;
        vertical.push(item.posX, item.posX + item.width / 2, item.posX + item.width);
        horizontal.push(item.posY, item.posY + item.height / 2, item.posY + item.height);
    });
    return {
        vertical: normalizeGuideLines(vertical, canvasWorkWidth.value),
        horizontal: normalizeGuideLines(horizontal, canvasMinHeight.value),
    };
};
const findNearestSnapMatch = (sourceLines, targetLines) => {
    let bestMatch = null;
    sourceLines.forEach((sourceLine) => {
        targetLines.forEach((targetLine) => {
            const delta = targetLine - sourceLine;
            if (Math.abs(delta) > SNAP_TOLERANCE)
                return;
            if (!bestMatch || Math.abs(delta) < Math.abs(bestMatch.delta)) {
                bestMatch = { delta, line: targetLine };
            }
        });
    });
    return bestMatch;
};
const buildInteractionGuideLines = (nextX, nextY, nextWidth, nextHeight, guideVertical, guideHorizontal) => ({
    vertical: normalizeGuideLines(guideVertical?.length ? guideVertical : [nextX, nextX + nextWidth / 2, nextX + nextWidth], canvasWorkWidth.value),
    horizontal: normalizeGuideLines(guideHorizontal?.length ? guideHorizontal : [nextY, nextY + nextHeight / 2, nextY + nextHeight], canvasMinHeight.value),
});
const interactionGuideLines = computed(() => {
    const preview = interactionPreview.value;
    if (!preview) {
        return { vertical: [], horizontal: [] };
    }
    return {
        vertical: preview.guideVertical,
        horizontal: preview.guideHorizontal,
    };
});
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
        const maxX = Math.max(0, getCanvasWidth() - interaction.startWidth);
        let nextX = Math.min(maxX, Math.max(0, interaction.startX + dx));
        let nextY = Math.max(0, interaction.startY + dy);
        const snapTargets = collectSnapTargets(component.id);
        const verticalMatch = findNearestSnapMatch([nextX, nextX + interaction.startWidth / 2, nextX + interaction.startWidth], snapTargets.vertical);
        const horizontalMatch = findNearestSnapMatch([nextY, nextY + interaction.startHeight / 2, nextY + interaction.startHeight], snapTargets.horizontal);
        if (verticalMatch) {
            const snappedX = nextX + verticalMatch.delta;
            if (snappedX >= 0 && snappedX <= maxX) {
                nextX = snappedX;
            }
        }
        if (horizontalMatch) {
            const snappedY = nextY + horizontalMatch.delta;
            if (snappedY >= 0) {
                nextY = snappedY;
            }
        }
        const roundedX = Math.round(nextX);
        const roundedY = Math.round(nextY);
        const guideLines = buildInteractionGuideLines(roundedX, roundedY, interaction.startWidth, interaction.startHeight, verticalMatch ? [verticalMatch.line] : undefined, horizontalMatch ? [horizontalMatch.line] : undefined);
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
        };
    }
    else {
        const handle = interaction.handle ?? 'se';
        let nextX = interaction.startX;
        let nextY = interaction.startY;
        let nextWidth = interaction.startWidth;
        let nextHeight = interaction.startHeight;
        const canvasWidth = getCanvasWidth();
        const snapTargets = collectSnapTargets(component.id);
        let snapVerticalLine;
        let snapHorizontalLine;
        if (handle.includes('e')) {
            nextWidth = Math.min(Math.max(MIN_CARD_WIDTH, interaction.startWidth + dx), Math.max(MIN_CARD_WIDTH, canvasWidth - interaction.startX));
            const match = findNearestSnapMatch([nextX + nextWidth], snapTargets.vertical);
            if (match) {
                const snappedWidth = match.line - nextX;
                if (snappedWidth >= MIN_CARD_WIDTH && nextX + snappedWidth <= canvasWidth) {
                    nextWidth = snappedWidth;
                    snapVerticalLine = [match.line];
                }
            }
        }
        if (handle.includes('s')) {
            nextHeight = Math.max(MIN_CARD_HEIGHT, interaction.startHeight + dy);
            const match = findNearestSnapMatch([nextY + nextHeight], snapTargets.horizontal);
            if (match) {
                const snappedHeight = match.line - nextY;
                if (snappedHeight >= MIN_CARD_HEIGHT) {
                    nextHeight = snappedHeight;
                    snapHorizontalLine = [match.line];
                }
            }
        }
        if (handle.includes('w')) {
            const maxLeft = interaction.startX + interaction.startWidth - MIN_CARD_WIDTH;
            nextX = Math.min(Math.max(0, interaction.startX + dx), maxLeft);
            nextWidth = interaction.startWidth - (nextX - interaction.startX);
            const match = findNearestSnapMatch([nextX], snapTargets.vertical);
            if (match) {
                const snappedX = Math.min(Math.max(0, match.line), maxLeft);
                const snappedWidth = interaction.startWidth - (snappedX - interaction.startX);
                if (snappedWidth >= MIN_CARD_WIDTH) {
                    nextX = snappedX;
                    nextWidth = snappedWidth;
                    snapVerticalLine = [snappedX];
                }
            }
        }
        if (handle.includes('n')) {
            const maxTop = interaction.startY + interaction.startHeight - MIN_CARD_HEIGHT;
            nextY = Math.min(Math.max(0, interaction.startY + dy), maxTop);
            nextHeight = interaction.startHeight - (nextY - interaction.startY);
            const match = findNearestSnapMatch([nextY], snapTargets.horizontal);
            if (match) {
                const snappedY = Math.min(Math.max(0, match.line), maxTop);
                const snappedHeight = interaction.startHeight - (snappedY - interaction.startY);
                if (snappedHeight >= MIN_CARD_HEIGHT) {
                    nextY = snappedY;
                    nextHeight = snappedHeight;
                    snapHorizontalLine = [snappedY];
                }
            }
        }
        const roundedX = Math.round(nextX);
        const roundedY = Math.round(nextY);
        const roundedWidth = Math.round(nextWidth);
        const roundedHeight = Math.round(nextHeight);
        const guideLines = buildInteractionGuideLines(roundedX, roundedY, roundedWidth, roundedHeight, snapVerticalLine, snapHorizontalLine);
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
        };
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
    interactionPreview.value = null;
    document.body.classList.remove('canvas-interacting');
};
const startDrag = (event, component) => {
    hideComponentContextMenu();
    const startZIndex = component.zIndex ?? 0;
    const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id);
    focusComponent(component, { preserveSelection, bringToFront: !preserveSelection });
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
    };
    pendingPointer = { x: event.clientX, y: event.clientY };
    document.body.classList.add('canvas-interacting');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
};
const startResize = (event, component, handle = 'se') => {
    hideComponentContextMenu();
    const startZIndex = component.zIndex ?? 0;
    const preserveSelection = selectedComponentIds.value.length > 1 && isComponentSelected(component.id);
    focusComponent(component, { preserveSelection, bringToFront: !preserveSelection });
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
    const finalizedInteraction = interaction;
    const component = findComponent(finalizedInteraction.compId);
    if (pendingPointer) {
        applyInteractionFrame();
    }
    const preview = interactionPreview.value?.compId === finalizedInteraction.compId ? { ...interactionPreview.value } : null;
    interaction = null;
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    if (component) {
        const before = {
            posX: finalizedInteraction.startX,
            posY: finalizedInteraction.startY,
            width: finalizedInteraction.startWidth,
            height: finalizedInteraction.startHeight,
            zIndex: finalizedInteraction.startZIndex,
        };
        const next = preview
            ? {
                posX: preview.nextX,
                posY: preview.nextY,
                width: preview.nextWidth,
                height: preview.nextHeight,
                zIndex: Math.max(0, Math.round(Number(component.zIndex) || before.zIndex)),
            }
            : cloneComponentLayout(component);
        applyComponentLayoutSnapshot(component, next);
        await nextTick();
        resizeInteractionChart(component.id);
        const persisted = await persistLayout(component, next);
        if (persisted && !layoutSnapshotsEqual(before, next)) {
            pushUndoEntry({ type: 'layout', componentId: component.id, before, after: next });
        }
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
        clearUndoHistory();
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
const undoLastChange = async () => {
    const dashboard = currentDashboard.value;
    const entry = undoStack.value[undoStack.value.length - 1];
    if (!dashboard || !entry || undoApplying.value)
        return;
    const remaining = undoStack.value.slice(0, -1);
    undoStack.value = remaining;
    undoApplying.value = true;
    try {
        if (entry.type === 'layout') {
            const component = findComponent(entry.componentId);
            if (!component)
                throw new Error('目标组件不存在，无法撤销布局修改');
            applyComponentLayoutSnapshot(component, entry.before);
            await nextTick();
            resizeInteractionChart(component.id);
            const restored = await persistLayout(component, entry.before);
            if (!restored)
                throw new Error('布局撤销失败');
        }
        else if (entry.type === 'component-config') {
            const component = findComponent(entry.componentId);
            if (!component)
                throw new Error('目标组件不存在，无法撤销配置修改');
            await updateDashboardComponent(dashboard.id, component.id, {
                chartId: entry.before.chartId,
                configJson: entry.before.configJson,
            });
            await syncComponentPreview(component, entry.before);
        }
        else if (entry.type === 'overlay') {
            applyOverlaySnapshot(entry.before);
            await updateCanvasConfig({ overlay: cloneOverlaySnapshot(entry.before) });
            lastSavedOverlaySnapshot.value = cloneOverlaySnapshot(entry.before);
        }
        else if (entry.type === 'add-component') {
            const component = findComponent(entry.component.id);
            if (component) {
                await removeDashboardComponent(dashboard.id, component.id);
                disposeChartInstance(component.id);
                deleteComponentData(component.id);
                components.value = components.value.filter((item) => item.id !== component.id);
                if (activeCompId.value === component.id)
                    activeCompId.value = null;
                dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, components.value.length);
            }
        }
        else if (entry.type === 'remove-component') {
            const restored = await addDashboardComponent(dashboard.id, {
                chartId: entry.component.chartId,
                posX: entry.component.posX,
                posY: entry.component.posY,
                width: entry.component.width,
                height: entry.component.height,
                zIndex: entry.component.zIndex,
                configJson: entry.component.configJson,
            });
            normalizeLayout(restored);
            components.value.push(restored);
            activeCompId.value = restored.id;
            dashboardCounts.value = new Map(dashboardCounts.value).set(dashboard.id, components.value.length);
            await nextTick();
            await loadComponentData(restored);
        }
        ElMessage.success('已撤销最近一次修改');
    }
    catch (error) {
        undoStack.value = [...remaining, entry].slice(-3);
        ElMessage.error(error instanceof Error ? error.message : '撤销失败');
    }
    finally {
        undoApplying.value = false;
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
const copyCanvasPixelsToClone = (originalRoot, clonedRoot) => {
    const originalCanvases = originalRoot.querySelectorAll('canvas');
    const clonedCanvases = clonedRoot.querySelectorAll('canvas');
    originalCanvases.forEach((orig, idx) => {
        const cloned = clonedCanvases[idx];
        if (!cloned)
            return;
        cloned.width = orig.width;
        cloned.height = orig.height;
        const ctx = cloned.getContext('2d');
        if (ctx)
            ctx.drawImage(orig, 0, 0);
    });
};
const prepareCaptureClone = (clonedDocument, originalTarget) => {
    const clonedStage = clonedDocument.querySelector('.screen-stage');
    if (!clonedStage)
        return;
    clonedStage.classList.add('screen-stage--capturing');
    clonedStage.style.transform = 'none';
    clonedStage.style.transformOrigin = '0 0';
    clonedStage.querySelectorAll('.stage-card.active').forEach((element) => element.classList.remove('active'));
    clonedStage.querySelectorAll('.canvas-curtain--selected').forEach((element) => element.classList.remove('canvas-curtain--selected'));
    copyCanvasPixelsToClone(originalTarget, clonedStage);
};
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
        await waitForPaint();
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
            onclone: (clonedDocument) => prepareCaptureClone(clonedDocument, stage),
        };
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(stage, captureOptions);
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
const addChartToScreen = async (chart, configJson, size, point, options = {}) => {
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
    setSelectedComponents([component.id], component.id);
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    await nextTick();
    await loadComponentData(component);
    if (options.trackUndo !== false) {
        pushUndoEntry({ type: 'add-component', component: cloneComponentSnapshot(component) });
    }
    if (options.silent !== true) {
        ElMessage.success('组件已加入大屏');
    }
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
const removeComponent = async (componentId, options = {}) => {
    if (!currentDashboard.value)
        return;
    const snapshot = components.value.find((item) => item.id === componentId);
    await removeDashboardComponent(currentDashboard.value.id, componentId);
    disposeChartInstance(componentId);
    deleteComponentData(componentId);
    components.value = components.value.filter((item) => item.id !== componentId);
    selectedComponentIds.value = selectedComponentIds.value.filter((id) => id !== componentId);
    if (activeCompId.value === componentId) {
        activeCompId.value = selectedComponentIds.value.at(-1) ?? null;
    }
    dashboardCounts.value = new Map(dashboardCounts.value).set(currentDashboard.value.id, components.value.length);
    if (snapshot && options.trackUndo !== false) {
        pushUndoEntry({ type: 'remove-component', component: cloneComponentSnapshot(snapshot) });
    }
    if (options.silent !== true) {
        ElMessage.success('组件已移除');
    }
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
    hideTemplatePreview();
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
    if (!draggingTemplateId.value && !draggingChartId.value && !draggingTypeChip.value)
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
    // Handle type chip drop (creates default component of that type)
    if (raw.startsWith('typechip:') || draggingTypeChip.value) {
        const chipType = draggingTypeChip.value ?? raw.replace('typechip:', '');
        draggingTypeChip.value = null;
        draggingTemplateId.value = null;
        draggingChartId.value = null;
        // Find a built-in template matching the type, or the first matching template
        const matchingTemplate = templateAssets.value.find((t) => t.chartType === chipType && t.builtIn)
            ?? templateAssets.value.find((t) => t.chartType === chipType);
        if (matchingTemplate) {
            await addTemplateToScreen(matchingTemplate, { clientX: event.clientX, clientY: event.clientY });
        }
        return;
    }
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
// ─── 类型芯片拖拽 ─────────────────────────────────────────────────────
const onTypeChipDragStart = (event, chipType) => {
    draggingTypeChip.value = chipType;
    draggingTemplateId.value = null;
    draggingChartId.value = null;
    stageDropActive.value = true;
    event.dataTransfer?.setData('text/plain', `typechip:${chipType}`);
    if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'copy';
};
const onTypeChipDragEnd = () => {
    draggingTypeChip.value = null;
    stageDropActive.value = false;
};
// ─── 图层拖拽排序 ─────────────────────────────────────────────────────
const onLayerDragStart = (event, idx) => {
    layerDragFromIdx.value = idx;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `layer:${idx}`);
    }
};
const onLayerDragOver = (_event, idx) => {
    if (layerDragFromIdx.value === null)
        return;
    layerDragOverIdx.value = idx;
};
const onLayerDragLeave = () => {
    layerDragOverIdx.value = null;
};
const onLayerDrop = async (_event, toIdx) => {
    layerDragOverIdx.value = null;
    const fromIdx = layerDragFromIdx.value;
    layerDragFromIdx.value = null;
    if (fromIdx === null || fromIdx === toIdx)
        return;
    // Reorder: layeredComponents is sorted highest-zIndex first.
    // After reorder, reassign zIndex so that item at index 0 has the highest z.
    const ordered = [...layeredComponents.value];
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    // Assign descending zIndex starting from the count
    const baseZ = ordered.length + 1;
    const persistPromises = [];
    for (let i = 0; i < ordered.length; i++) {
        const newZ = baseZ - i;
        if (ordered[i].zIndex !== newZ) {
            ordered[i].zIndex = newZ;
            persistPromises.push(persistLayout(ordered[i]));
        }
    }
    await Promise.all(persistPromises);
};
const onLayerDragEnd = () => {
    layerDragFromIdx.value = null;
    layerDragOverIdx.value = null;
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
    compactEditorMode.value = window.innerWidth <= COMPACT_EDITOR_BREAKPOINT;
    chartInstances.forEach((instance) => instance.resize());
    scheduleCanvasFit();
};
onMounted(async () => {
    document.addEventListener('mousedown', hideComponentContextMenu);
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
    await loadBaseData();
    await nextTick();
    handleStageScroll();
});
onBeforeUnmount(() => {
    componentDataLoadToken += 1;
    disposeComponentVisibilityObserver();
    document.removeEventListener('mousedown', hideComponentContextMenu);
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    cleanupInteractionFrame();
    window.removeEventListener('resize', handleWindowResize);
    if (componentDataRefreshFrame !== null) {
        window.cancelAnimationFrame(componentDataRefreshFrame);
        componentDataRefreshFrame = null;
    }
    if (tableCarouselSyncFrame !== null) {
        window.cancelAnimationFrame(tableCarouselSyncFrame);
        tableCarouselSyncFrame = null;
    }
    stopAllTableCarousels();
    disposeCharts();
    if (sidebarHoverTimer !== null) {
        clearTimeout(sidebarHoverTimer);
        sidebarHoverTimer = null;
    }
    if (templatePreviewHideTimer !== null) {
        clearTimeout(templatePreviewHideTimer);
        templatePreviewHideTimer = null;
    }
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
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['curtain-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage--capturing']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain--selected']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card--selected']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-marquee']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
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
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-interacting']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-curtain']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['asset-list']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['library-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-main']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-comp-count']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--quiet']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-root--editor']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-icon-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-primary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-pane-subtitle']} */ ;
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
/** @type {__VLS_StyleScopedClasses['lp-library-note']} */ ;
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
/** @type {__VLS_StyleScopedClasses['lp-asset-card--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-subline']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-preview-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-preview-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-preview-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-field']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-preview-popper']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-chart-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-chart-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-chart-label']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-order-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-item']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-drag-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-resize-handle']} */ ;
// CSS variable injection 
__VLS_ctx.effectiveSidebarCollapsed ? '60px' : __VLS_ctx.leftPanelWidth + 'px';
__VLS_ctx.inspectorCollapsed ? '0px' : 'minmax(320px, 22vw)';
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-root" },
    ...{ class: ({ 'screen-root--editor': __VLS_ctx.screenId, 'screen-root--quiet': __VLS_ctx.screenId }) },
});
if (__VLS_ctx.screenId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ onMouseenter: (__VLS_ctx.hoverExpandSidebar) },
        ...{ onMouseleave: (__VLS_ctx.hoverCollapseSidebar) },
        ref: "leftPanelRef",
        ...{ class: "screen-left-panel" },
        ...{ class: ({ 'screen-left-panel--collapsed': __VLS_ctx.effectiveSidebarCollapsed }) },
        ...{ style: (__VLS_ctx.effectiveSidebarCollapsed ? {} : { width: __VLS_ctx.leftPanelWidth + 'px' }) },
    });
    /** @type {typeof __VLS_ctx.leftPanelRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "lp-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleSidebar) },
        ...{ class: "lp-toggle-btn" },
        title: (__VLS_ctx.effectiveSidebarCollapsed ? '展开面板' : '收起面板'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "lp-toggle-icon" },
    });
    if (!__VLS_ctx.effectiveSidebarCollapsed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-head-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-overline" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-title" },
            title: (__VLS_ctx.currentDashboard?.name ?? '编辑大屏'),
        });
        (__VLS_ctx.currentDashboard?.name ?? '编辑大屏');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-head-badges" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-head-pill" },
        });
        (__VLS_ctx.templateAssets.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-head-pill lp-head-pill--accent" },
        });
        (__VLS_ctx.components.length);
    }
    if (__VLS_ctx.effectiveSidebarCollapsed) {
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
                    if (!(__VLS_ctx.effectiveSidebarCollapsed))
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
                    if (!(__VLS_ctx.effectiveSidebarCollapsed))
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
    if (!__VLS_ctx.effectiveSidebarCollapsed) {
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
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
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
                                if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                                    return;
                                if (!(__VLS_ctx.expandedCats.has(cat.label)))
                                    return;
                                __VLS_ctx.assetType = item.type;
                            } },
                        ...{ onDragstart: (...[$event]) => {
                                if (!(__VLS_ctx.screenId))
                                    return;
                                if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                                    return;
                                if (!(__VLS_ctx.expandedCats.has(cat.label)))
                                    return;
                                __VLS_ctx.onTypeChipDragStart($event, item.type);
                            } },
                        ...{ onDragend: (__VLS_ctx.onTypeChipDragEnd) },
                        key: (item.type),
                        ...{ class: "lp-type-chip" },
                        ...{ class: ({ 'lp-type-chip--active': __VLS_ctx.assetType === item.type }) },
                        title: (item.label),
                        draggable: "true",
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
                    if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                        return;
                    if (!(__VLS_ctx.assetType))
                        return;
                    __VLS_ctx.assetType = '';
                }
            };
            __VLS_39.slots.default;
            var __VLS_39;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-library-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-library-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-library-kicker" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-library-note" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-library-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onScroll: (__VLS_ctx.hideTemplatePreview) },
            ...{ class: "lp-asset-scroll" },
        });
        for (const [template] of __VLS_getVForSourceType((__VLS_ctx.filteredTemplates))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.selectedTemplateId = template.id;
                    } },
                ...{ onMouseenter: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.showTemplatePreview($event, template.id);
                    } },
                ...{ onMouseleave: (__VLS_ctx.scheduleHideTemplatePreview) },
                ...{ onDblclick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.quickAddTemplate(template);
                    } },
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.onTemplateDragStart($event, template);
                    } },
                ...{ onDragend: (__VLS_ctx.onTemplateDragEnd) },
                key: (template.id),
                ...{ class: "lp-asset-card lp-asset-card--compact" },
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
                const __VLS_44 = {}.ElTag;
                /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
                // @ts-ignore
                const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }));
                const __VLS_46 = __VLS_45({
                    size: "small",
                    type: "success",
                    ...{ class: "lp-tag" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_45));
                __VLS_47.slots.default;
                var __VLS_47;
            }
            const __VLS_48 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }));
            const __VLS_50 = __VLS_49({
                size: "small",
                effect: "dark",
                ...{ class: "lp-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            __VLS_51.slots.default;
            (__VLS_ctx.chartTypeLabel(template.chartType));
            var __VLS_51;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-ac-subline" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-size" },
            });
            (__VLS_ctx.getTemplateLayoutText(template));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-ac-lite-badge" },
            });
            (__VLS_ctx.getAssetBadgeText(template.chartType));
        }
        if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
            const __VLS_52 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                description: "暂无匹配组件",
                imageSize: (42),
            }));
            const __VLS_54 = __VLS_53({
                description: "暂无匹配组件",
                imageSize: (42),
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        }
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
        for (const [component, layerIdx] of __VLS_getVForSourceType((__VLS_ctx.layeredComponents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.onLayerDragStart($event, layerIdx);
                    } },
                ...{ onDragover: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.onLayerDragOver($event, layerIdx);
                    } },
                ...{ onDragleave: (__VLS_ctx.onLayerDragLeave) },
                ...{ onDrop: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.onLayerDrop($event, layerIdx);
                    } },
                ...{ onDragend: (__VLS_ctx.onLayerDragEnd) },
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.selectLayerComponent(component);
                    } },
                ...{ onContextmenu: (...[$event]) => {
                        if (!(__VLS_ctx.screenId))
                            return;
                        if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                            return;
                        __VLS_ctx.openComponentContextMenu($event, component);
                    } },
                key: (component.id),
                ...{ class: "lp-layer-item" },
                ...{ class: ({ 'lp-layer-item--active': __VLS_ctx.isComponentSelected(component.id), 'lp-layer-item--drag-over': __VLS_ctx.layerDragOverIdx === layerIdx }) },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-layer-item-main" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-layer-drag-handle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-layer-name" },
            });
            (__VLS_ctx.getComponentDisplayName(component));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "lp-layer-meta" },
            });
            (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
            (__VLS_ctx.getComponentStatusText(component));
            (component.zIndex ?? 0);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "lp-layer-actions" },
            });
            const __VLS_56 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
            }));
            const __VLS_58 = __VLS_57({
                ...{ 'onClick': {} },
                link: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_57));
            let __VLS_60;
            let __VLS_61;
            let __VLS_62;
            const __VLS_63 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.screenId))
                        return;
                    if (!(!__VLS_ctx.effectiveSidebarCollapsed))
                        return;
                    __VLS_ctx.bringSpecificComponentToFront(component);
                }
            };
            __VLS_59.slots.default;
            var __VLS_59;
        }
        if (!__VLS_ctx.components.length) {
            const __VLS_64 = {}.ElEmpty;
            /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                description: "当前大屏还没有组件",
                imageSize: (48),
            }));
            const __VLS_66 = __VLS_65({
                description: "当前大屏还没有组件",
                imageSize: (48),
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
        }
    }
    if (!__VLS_ctx.effectiveSidebarCollapsed && __VLS_ctx.hoveredTemplate) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMouseenter: (__VLS_ctx.cancelHideTemplatePreview) },
            ...{ onMouseleave: (__VLS_ctx.hideTemplatePreview) },
            ...{ class: "lp-preview-float" },
            ...{ style: (__VLS_ctx.templatePreviewStyle) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-preview" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-preview-status-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-preview-state" },
        });
        const __VLS_68 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            size: "small",
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_72;
        let __VLS_73;
        let __VLS_74;
        const __VLS_75 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.screenId))
                    return;
                if (!(!__VLS_ctx.effectiveSidebarCollapsed && __VLS_ctx.hoveredTemplate))
                    return;
                __VLS_ctx.quickAddTemplate(__VLS_ctx.hoveredTemplate);
            }
        };
        __VLS_71.slots.default;
        var __VLS_71;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-title" },
        });
        (__VLS_ctx.hoveredTemplate.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-subtitle" },
        });
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.hoveredTemplate.chartType));
        (__VLS_ctx.getTemplateLayoutText(__VLS_ctx.hoveredTemplate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "lp-hover-pill" },
        });
        (__VLS_ctx.getAssetBadgeText(__VLS_ctx.hoveredTemplate.chartType));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-stage" },
        });
        if (__VLS_ctx.isTemplateStaticAsset(__VLS_ctx.hoveredTemplate)) {
            /** @type {[typeof ComponentStaticPreview, ]} */ ;
            // @ts-ignore
            const __VLS_76 = __VLS_asFunctionalComponent(ComponentStaticPreview, new ComponentStaticPreview({
                chartType: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart.chartType),
                chartConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart),
                showTitle: (false),
                dark: true,
            }));
            const __VLS_77 = __VLS_76({
                chartType: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart.chartType),
                chartConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart),
                showTitle: (false),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        }
        else {
            /** @type {[typeof ComponentTemplatePreview, ]} */ ;
            // @ts-ignore
            const __VLS_79 = __VLS_asFunctionalComponent(ComponentTemplatePreview, new ComponentTemplatePreview({
                chartConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart),
                styleConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).style),
            }));
            const __VLS_80 = __VLS_79({
                chartConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).chart),
                styleConfig: (__VLS_ctx.getTemplateAssetConfig(__VLS_ctx.hoveredTemplate).style),
            }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "lp-hover-meta" },
        });
        (__VLS_ctx.hoveredTemplate.description || __VLS_ctx.summarizeTemplateConfig(__VLS_ctx.hoveredTemplate.configJson) || '拖入画布后继续配置样式和交互。');
    }
    if (!__VLS_ctx.effectiveSidebarCollapsed) {
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
    const __VLS_82 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }));
    const __VLS_84 = __VLS_83({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        icon: (__VLS_ctx.Plus),
    }, ...__VLS_functionalComponentArgsRest(__VLS_83));
    let __VLS_86;
    let __VLS_87;
    let __VLS_88;
    const __VLS_89 = {
        onClick: (__VLS_ctx.openCreateDashboard)
    };
    var __VLS_85;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-search-wrap" },
    });
    const __VLS_90 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }));
    const __VLS_92 = __VLS_91({
        modelValue: (__VLS_ctx.dashboardSearch),
        placeholder: "检索目录",
        prefixIcon: (__VLS_ctx.Search),
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_91));
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
        const __VLS_94 = {}.ElPopconfirm;
        /** @type {[typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, typeof __VLS_components.ElPopconfirm, typeof __VLS_components.elPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }));
        const __VLS_96 = __VLS_95({
            ...{ 'onConfirm': {} },
            title: "确认删除此大屏？",
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
        let __VLS_98;
        let __VLS_99;
        let __VLS_100;
        const __VLS_101 = {
            onConfirm: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.handleDeleteDashboard(dashboard.id);
            }
        };
        __VLS_97.slots.default;
        {
            const { reference: __VLS_thisSlot } = __VLS_97.slots;
            const __VLS_102 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }));
            const __VLS_104 = __VLS_103({
                ...{ 'onClick': {} },
                ...{ class: "screen-item-del" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_103));
            let __VLS_106;
            let __VLS_107;
            let __VLS_108;
            const __VLS_109 = {
                onClick: () => { }
            };
            __VLS_105.slots.default;
            const __VLS_110 = {}.Delete;
            /** @type {[typeof __VLS_components.Delete, ]} */ ;
            // @ts-ignore
            const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({}));
            const __VLS_112 = __VLS_111({}, ...__VLS_functionalComponentArgsRest(__VLS_111));
            var __VLS_105;
        }
        var __VLS_97;
    }
    if (!__VLS_ctx.dashboards.length && !__VLS_ctx.loading) {
        const __VLS_114 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
            description: "暂无大屏",
            imageSize: (60),
        }));
        const __VLS_116 = __VLS_115({
            description: "暂无大屏",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_115));
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
    const __VLS_118 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        type: "success",
        effect: "plain",
    }));
    const __VLS_120 = __VLS_119({
        type: "success",
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
    __VLS_121.slots.default;
    var __VLS_121;
    const __VLS_122 = {}.ElTabs;
    /** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
    // @ts-ignore
    const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }));
    const __VLS_124 = __VLS_123({
        modelValue: (__VLS_ctx.libraryTab),
        ...{ class: "library-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_123));
    __VLS_125.slots.default;
    const __VLS_126 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
        label: "组件库",
        name: "templates",
    }));
    const __VLS_128 = __VLS_127({
        label: "组件库",
        name: "templates",
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    __VLS_129.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_130 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }));
    const __VLS_132 = __VLS_131({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索组件名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_131));
    const __VLS_134 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_136 = __VLS_135({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_135));
    __VLS_137.slots.default;
    const __VLS_138 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
        label: "全部类型",
        value: "",
    }));
    const __VLS_140 = __VLS_139({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_139));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_142 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_144 = __VLS_143({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_143));
    }
    var __VLS_137;
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
            const __VLS_146 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
                size: "small",
                type: "success",
            }));
            const __VLS_148 = __VLS_147({
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_147));
            __VLS_149.slots.default;
            var __VLS_149;
        }
        const __VLS_150 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
            size: "small",
            effect: "dark",
        }));
        const __VLS_152 = __VLS_151({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_151));
        __VLS_153.slots.default;
        (__VLS_ctx.chartTypeLabel(template.chartType));
        var __VLS_153;
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
        const __VLS_154 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_156 = __VLS_155({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_155));
        let __VLS_158;
        let __VLS_159;
        let __VLS_160;
        const __VLS_161 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.screenId))
                    return;
                __VLS_ctx.quickAddTemplate(template);
            }
        };
        __VLS_157.slots.default;
        var __VLS_157;
    }
    if (!__VLS_ctx.filteredTemplates.length && !__VLS_ctx.loading) {
        const __VLS_162 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }));
        const __VLS_164 = __VLS_163({
            description: "没有匹配的组件资产",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_163));
    }
    var __VLS_129;
    const __VLS_166 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
        label: "图表源",
        name: "charts",
    }));
    const __VLS_168 = __VLS_167({
        label: "图表源",
        name: "charts",
    }, ...__VLS_functionalComponentArgsRest(__VLS_167));
    __VLS_169.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "template-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-toolbar" },
    });
    const __VLS_170 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }));
    const __VLS_172 = __VLS_171({
        modelValue: (__VLS_ctx.assetSearch),
        placeholder: "搜索图表名称",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_171));
    const __VLS_174 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }));
    const __VLS_176 = __VLS_175({
        modelValue: (__VLS_ctx.assetType),
        placeholder: "全部类型",
        clearable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_175));
    __VLS_177.slots.default;
    const __VLS_178 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
        label: "全部类型",
        value: "",
    }));
    const __VLS_180 = __VLS_179({
        label: "全部类型",
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_179));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.chartTypeOptions))) {
        const __VLS_182 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }));
        const __VLS_184 = __VLS_183({
            key: (item.value),
            label: (item.label),
            value: (item.value),
        }, ...__VLS_functionalComponentArgsRest(__VLS_183));
    }
    var __VLS_177;
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
        const __VLS_186 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
            size: "small",
            effect: "dark",
        }));
        const __VLS_188 = __VLS_187({
            size: "small",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_187));
        __VLS_189.slots.default;
        (__VLS_ctx.chartTypeLabel(chart.chartType));
        var __VLS_189;
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
        const __VLS_190 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
            description: "没有匹配的图表源",
            imageSize: (60),
        }));
        const __VLS_192 = __VLS_191({
            description: "没有匹配的图表源",
            imageSize: (60),
        }, ...__VLS_functionalComponentArgsRest(__VLS_191));
    }
    var __VLS_169;
    var __VLS_125;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "screen-main" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading || __VLS_ctx.compLoading) }, null, null);
if (!__VLS_ctx.currentDashboard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "screen-empty-state" },
    });
    const __VLS_194 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }));
    const __VLS_196 = __VLS_195({
        description: "请先创建或选择一个数据大屏",
        imageSize: (90),
    }, ...__VLS_functionalComponentArgsRest(__VLS_195));
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
    const __VLS_198 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }));
    const __VLS_200 = __VLS_199({
        size: "small",
        type: (__VLS_ctx.isPublished ? 'success' : 'info'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_199));
    __VLS_201.slots.default;
    (__VLS_ctx.isPublished ? '已发布' : '草稿');
    var __VLS_201;
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
    const __VLS_202 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }));
    const __VLS_204 = __VLS_203({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Refresh),
        loading: (__VLS_ctx.compLoading),
        title: "刷新画布",
    }, ...__VLS_functionalComponentArgsRest(__VLS_203));
    let __VLS_206;
    let __VLS_207;
    let __VLS_208;
    const __VLS_209 = {
        onClick: (__VLS_ctx.loadComponents)
    };
    var __VLS_205;
    const __VLS_210 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.PictureFilled),
        loading: (__VLS_ctx.coverSaving),
    }));
    const __VLS_212 = __VLS_211({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.PictureFilled),
        loading: (__VLS_ctx.coverSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_211));
    let __VLS_214;
    let __VLS_215;
    let __VLS_216;
    const __VLS_217 = {
        onClick: (__VLS_ctx.captureScreenCover)
    };
    __VLS_213.slots.default;
    (__VLS_ctx.currentCoverConfig.url ? '更新封面' : '生成封面');
    var __VLS_213;
    const __VLS_218 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.canUndo),
        loading: (__VLS_ctx.undoApplying),
    }));
    const __VLS_220 = __VLS_219({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.canUndo),
        loading: (__VLS_ctx.undoApplying),
    }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    let __VLS_222;
    let __VLS_223;
    let __VLS_224;
    const __VLS_225 = {
        onClick: (__VLS_ctx.undoLastChange)
    };
    __VLS_221.slots.default;
    var __VLS_221;
    const __VLS_226 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }));
    const __VLS_228 = __VLS_227({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.View),
        title: "预览",
    }, ...__VLS_functionalComponentArgsRest(__VLS_227));
    let __VLS_230;
    let __VLS_231;
    let __VLS_232;
    const __VLS_233 = {
        onClick: (__VLS_ctx.openPreview)
    };
    var __VLS_229;
    const __VLS_234 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }));
    const __VLS_236 = __VLS_235({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Download),
        title: "导出JSON",
    }, ...__VLS_functionalComponentArgsRest(__VLS_235));
    let __VLS_238;
    let __VLS_239;
    let __VLS_240;
    const __VLS_241 = {
        onClick: (__VLS_ctx.exportScreenJson)
    };
    var __VLS_237;
    const __VLS_242 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
        direction: "vertical",
    }));
    const __VLS_244 = __VLS_243({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_243));
    const __VLS_246 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }));
    const __VLS_248 = __VLS_247({
        ...{ 'onClick': {} },
        size: "small",
        disabled: (!__VLS_ctx.activeComponent),
    }, ...__VLS_functionalComponentArgsRest(__VLS_247));
    let __VLS_250;
    let __VLS_251;
    let __VLS_252;
    const __VLS_253 = {
        onClick: (__VLS_ctx.openSaveAssetDialog)
    };
    __VLS_249.slots.default;
    var __VLS_249;
    const __VLS_254 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }));
    const __VLS_256 = __VLS_255({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Promotion),
    }, ...__VLS_functionalComponentArgsRest(__VLS_255));
    let __VLS_258;
    let __VLS_259;
    let __VLS_260;
    const __VLS_261 = {
        onClick: (__VLS_ctx.openPublishDialog)
    };
    __VLS_257.slots.default;
    (__VLS_ctx.isPublished ? '发布管理' : '发布');
    var __VLS_257;
    const __VLS_262 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }));
    const __VLS_264 = __VLS_263({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.Share),
    }, ...__VLS_functionalComponentArgsRest(__VLS_263));
    let __VLS_266;
    let __VLS_267;
    let __VLS_268;
    const __VLS_269 = {
        onClick: (__VLS_ctx.openShareDialog)
    };
    __VLS_265.slots.default;
    var __VLS_265;
    const __VLS_270 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }));
    const __VLS_272 = __VLS_271({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        icon: (__VLS_ctx.CirclePlus),
        disabled: (!__VLS_ctx.selectedLibraryAsset),
    }, ...__VLS_functionalComponentArgsRest(__VLS_271));
    let __VLS_274;
    let __VLS_275;
    let __VLS_276;
    const __VLS_277 = {
        onClick: (__VLS_ctx.handleAddSelectedAsset)
    };
    __VLS_273.slots.default;
    var __VLS_273;
    const __VLS_278 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_279 = __VLS_asFunctionalComponent(__VLS_278, new __VLS_278({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.inspectorCollapsed ? __VLS_ctx.ArrowLeft : __VLS_ctx.ArrowRight),
    }));
    const __VLS_280 = __VLS_279({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.inspectorCollapsed ? __VLS_ctx.ArrowLeft : __VLS_ctx.ArrowRight),
    }, ...__VLS_functionalComponentArgsRest(__VLS_279));
    let __VLS_282;
    let __VLS_283;
    let __VLS_284;
    const __VLS_285 = {
        onClick: (__VLS_ctx.toggleInspector)
    };
    __VLS_281.slots.default;
    (__VLS_ctx.inspectorCollapsed ? '展开属性' : '收起属性');
    var __VLS_281;
    const __VLS_286 = {}.ElDivider;
    /** @type {[typeof __VLS_components.ElDivider, typeof __VLS_components.elDivider, ]} */ ;
    // @ts-ignore
    const __VLS_287 = __VLS_asFunctionalComponent(__VLS_286, new __VLS_286({
        direction: "vertical",
    }));
    const __VLS_288 = __VLS_287({
        direction: "vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_287));
    const __VLS_290 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_291 = __VLS_asFunctionalComponent(__VLS_290, new __VLS_290({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }));
    const __VLS_292 = __VLS_291({
        ...{ 'onClick': {} },
        size: "small",
        icon: (__VLS_ctx.ArrowLeft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_291));
    let __VLS_294;
    let __VLS_295;
    let __VLS_296;
    const __VLS_297 = {
        onClick: (...[$event]) => {
            if (!!(!__VLS_ctx.currentDashboard))
                return;
            __VLS_ctx.$emit('back');
        }
    };
    __VLS_293.slots.default;
    var __VLS_293;
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
        ...{ class: "canvas-tb-overlay-ctrl" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-tb-zoom" },
    });
    const __VLS_298 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_299 = __VLS_asFunctionalComponent(__VLS_298, new __VLS_298({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }));
    const __VLS_300 = __VLS_299({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_299));
    let __VLS_302;
    let __VLS_303;
    let __VLS_304;
    const __VLS_305 = {
        onClick: (__VLS_ctx.zoomOut)
    };
    __VLS_301.slots.default;
    var __VLS_301;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ onClick: (__VLS_ctx.zoomFit) },
        ...{ class: "zoom-label" },
    });
    (Math.round(__VLS_ctx.canvasScale * 100));
    const __VLS_306 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_307 = __VLS_asFunctionalComponent(__VLS_306, new __VLS_306({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }));
    const __VLS_308 = __VLS_307({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_307));
    let __VLS_310;
    let __VLS_311;
    let __VLS_312;
    const __VLS_313 = {
        onClick: (__VLS_ctx.zoomIn)
    };
    __VLS_309.slots.default;
    var __VLS_309;
    const __VLS_314 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_315 = __VLS_asFunctionalComponent(__VLS_314, new __VLS_314({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }));
    const __VLS_316 = __VLS_315({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_315));
    let __VLS_318;
    let __VLS_319;
    let __VLS_320;
    const __VLS_321 = {
        onClick: (__VLS_ctx.zoomFit)
    };
    __VLS_317.slots.default;
    var __VLS_317;
    const __VLS_322 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_323 = __VLS_asFunctionalComponent(__VLS_322, new __VLS_322({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }));
    const __VLS_324 = __VLS_323({
        ...{ 'onClick': {} },
        text: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_323));
    let __VLS_326;
    let __VLS_327;
    let __VLS_328;
    const __VLS_329 = {
        onClick: (__VLS_ctx.zoomReset)
    };
    __VLS_325.slots.default;
    var __VLS_325;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-ruler-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "ruler-corner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-h-strip" },
    });
    for (const [mark] of __VLS_getVForSourceType((__VLS_ctx.hRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (mark),
            ...{ class: "ruler-h-mark" },
            ...{ style: (__VLS_ctx.getHRulerMarkStyle(mark)) },
        });
        (mark);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "canvas-main-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ruler-v-strip" },
    });
    for (const [mark] of __VLS_getVForSourceType((__VLS_ctx.vRulerMarks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (mark),
            ...{ class: "ruler-v-mark" },
            ...{ style: (__VLS_ctx.getVRulerMarkStyle(mark)) },
        });
        (mark);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onScroll: (__VLS_ctx.handleStageScroll) },
        ref: "stageScrollRef",
        ...{ class: "screen-stage-scroll" },
    });
    /** @type {typeof __VLS_ctx.stageScrollRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: (__VLS_ctx.onStageDragOver) },
        ...{ onDragleave: (__VLS_ctx.onStageDragLeave) },
        ...{ onDrop: (__VLS_ctx.onStageDrop) },
        ...{ onMousedown: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.startStageMarquee($event);
            } },
        ...{ onContextmenu: (__VLS_ctx.hideComponentContextMenu) },
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
                    __VLS_ctx.handleCurtainPointerDown($event);
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
                    __VLS_ctx.handleStageCardMouseDown($event, component);
                } },
            ...{ onContextmenu: (...[$event]) => {
                    if (!!(!__VLS_ctx.currentDashboard))
                        return;
                    __VLS_ctx.openComponentContextMenu($event, component);
                } },
            key: (component.id),
            ref: ((el) => __VLS_ctx.setStageCardRef(el, component.id)),
            ...{ class: "stage-card" },
            ...{ class: ({
                    active: __VLS_ctx.activeCompId === component.id,
                    'stage-card--selected': __VLS_ctx.isComponentSelected(component.id),
                    'stage-card--decoration': __VLS_ctx.isDecorationComponent(component),
                    'stage-card--static': __VLS_ctx.isStaticWidget(component) && !__VLS_ctx.isDecorationComponent(component),
                    'stage-card--data': !__VLS_ctx.isStaticWidget(component),
                }) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-header-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stage-card-meta" },
        });
        (__VLS_ctx.chartTypeLabel(__VLS_ctx.getComponentChartConfig(component).chartType));
        (__VLS_ctx.getComponentStatusText(component));
        const __VLS_330 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_331 = __VLS_asFunctionalComponent(__VLS_330, new __VLS_330({
            ...{ 'onClick': {} },
            ...{ class: "remove-btn" },
            text: true,
            size: "small",
        }));
        const __VLS_332 = __VLS_331({
            ...{ 'onClick': {} },
            ...{ class: "remove-btn" },
            text: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_331));
        let __VLS_334;
        let __VLS_335;
        let __VLS_336;
        const __VLS_337 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.currentDashboard))
                    return;
                __VLS_ctx.confirmRemoveComponent(component);
            }
        };
        __VLS_333.slots.default;
        const __VLS_338 = {}.ElIcon;
        /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
        // @ts-ignore
        const __VLS_339 = __VLS_asFunctionalComponent(__VLS_338, new __VLS_338({}));
        const __VLS_340 = __VLS_339({}, ...__VLS_functionalComponentArgsRest(__VLS_339));
        __VLS_341.slots.default;
        const __VLS_342 = {}.Close;
        /** @type {[typeof __VLS_components.Close, ]} */ ;
        // @ts-ignore
        const __VLS_343 = __VLS_asFunctionalComponent(__VLS_342, new __VLS_342({}));
        const __VLS_344 = __VLS_343({}, ...__VLS_functionalComponentArgsRest(__VLS_343));
        var __VLS_341;
        var __VLS_333;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-card-body" },
            ...{ class: ({
                    'stage-card-body--decoration': __VLS_ctx.isDecorationComponent(component),
                    'stage-card-body--static': __VLS_ctx.isStaticWidget(component) && !__VLS_ctx.isDecorationComponent(component),
                    'stage-card-body--data': !__VLS_ctx.isStaticWidget(component),
                }) },
        });
        if (__VLS_ctx.isFilterButtonChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-button-wrapper" },
            });
            const __VLS_346 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }));
            const __VLS_348 = __VLS_347({
                size: "small",
                type: "primary",
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_347));
            __VLS_349.slots.default;
            const __VLS_350 = {}.ElIcon;
            /** @type {[typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, typeof __VLS_components.ElIcon, typeof __VLS_components.elIcon, ]} */ ;
            // @ts-ignore
            const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
                ...{ style: {} },
            }));
            const __VLS_352 = __VLS_351({
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_351));
            __VLS_353.slots.default;
            const __VLS_354 = {}.Filter;
            /** @type {[typeof __VLS_components.Filter, ]} */ ;
            // @ts-ignore
            const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({}));
            const __VLS_356 = __VLS_355({}, ...__VLS_functionalComponentArgsRest(__VLS_355));
            var __VLS_353;
            var __VLS_349;
        }
        else if (__VLS_ctx.shouldDeferComponentPreview(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder" },
            });
        }
        else if (__VLS_ctx.isComponentPreviewLoading(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder" },
            });
        }
        else if (__VLS_ctx.isTableChart(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-wrapper" },
            });
            const __VLS_358 = {}.ElTable;
            /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
            // @ts-ignore
            const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
                data: (__VLS_ctx.getTableRows(component)),
                size: "small",
                border: true,
                height: "100%",
                emptyText: "暂无数据",
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
            const __VLS_360 = __VLS_359({
                data: (__VLS_ctx.getTableRows(component)),
                size: "small",
                border: true,
                height: "100%",
                emptyText: "暂无数据",
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
            }, ...__VLS_functionalComponentArgsRest(__VLS_359));
            __VLS_361.slots.default;
            if (__VLS_ctx.getComponentConfig(component).style.tableShowIndex) {
                const __VLS_362 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({
                    type: "index",
                    width: "50",
                    label: "#",
                }));
                const __VLS_364 = __VLS_363({
                    type: "index",
                    width: "50",
                    label: "#",
                }, ...__VLS_functionalComponentArgsRest(__VLS_363));
            }
            for (const [column] of __VLS_getVForSourceType((__VLS_ctx.getTableColumns(component)))) {
                const __VLS_366 = {}.ElTableColumn;
                /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
                // @ts-ignore
                const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
                    key: (column.id),
                    prop: (column.field),
                    label: (column.label),
                    width: (column.width),
                    align: (column.align),
                    headerAlign: (column.align),
                    showOverflowTooltip: true,
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }));
                const __VLS_368 = __VLS_367({
                    key: (column.id),
                    prop: (column.field),
                    label: (column.label),
                    width: (column.width),
                    align: (column.align),
                    headerAlign: (column.align),
                    showOverflowTooltip: true,
                    sortable: (__VLS_ctx.getComponentConfig(component).style.tableEnableSort ? 'custom' : false),
                }, ...__VLS_functionalComponentArgsRest(__VLS_367));
            }
            var __VLS_361;
        }
        else if (__VLS_ctx.isStaticWidget(component)) {
            /** @type {[typeof ComponentStaticPreview, ]} */ ;
            // @ts-ignore
            const __VLS_370 = __VLS_asFunctionalComponent(ComponentStaticPreview, new ComponentStaticPreview({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                styleConfig: (__VLS_ctx.getComponentConfig(component).style),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                showTitle: (__VLS_ctx.getComponentConfig(component).style.showTitle),
                dark: true,
            }));
            const __VLS_371 = __VLS_370({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                styleConfig: (__VLS_ctx.getComponentConfig(component).style),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                showTitle: (__VLS_ctx.getComponentConfig(component).style.showTitle),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_370));
        }
        else if (__VLS_ctx.showNoField(component)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chart-placeholder warning" },
            });
        }
        else if (!__VLS_ctx.isRenderableChart(component)) {
            /** @type {[typeof ComponentDataFallback, ]} */ ;
            // @ts-ignore
            const __VLS_373 = __VLS_asFunctionalComponent(ComponentDataFallback, new ComponentDataFallback({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }));
            const __VLS_374 = __VLS_373({
                chartType: (__VLS_ctx.getComponentChartConfig(component).chartType),
                chartConfig: (__VLS_ctx.getComponentChartConfig(component)),
                data: (__VLS_ctx.componentDataMap.get(component.id) ?? null),
                dark: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_373));
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
    if (__VLS_ctx.marqueeSelection.visible) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "stage-marquee" },
            ...{ style: (__VLS_ctx.marqueeStyle) },
        });
    }
    if (__VLS_ctx.interactionGuideLines.vertical.length || __VLS_ctx.interactionGuideLines.horizontal.length) {
        for (const [line] of __VLS_getVForSourceType((__VLS_ctx.interactionGuideLines.vertical))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                key: (`v-${line}`),
                ...{ class: "stage-guide stage-guide--vertical" },
                ...{ style: ({ left: `${line}px` }) },
            });
        }
        for (const [line] of __VLS_getVForSourceType((__VLS_ctx.interactionGuideLines.horizontal))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                key: (`h-${line}`),
                ...{ class: "stage-guide stage-guide--horizontal" },
                ...{ style: ({ top: `${line}px` }) },
            });
        }
    }
    if (!__VLS_ctx.components.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stage-empty" },
        });
        const __VLS_376 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }));
        const __VLS_378 = __VLS_377({
            description: "请从左侧双击或拖入一个组件资产",
            imageSize: (80),
        }, ...__VLS_functionalComponentArgsRest(__VLS_377));
    }
}
if (!__VLS_ctx.inspectorCollapsed) {
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
        const __VLS_380 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
        }));
        const __VLS_382 = __VLS_381({
            ...{ 'onClick': {} },
            size: "small",
            link: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_381));
        let __VLS_384;
        let __VLS_385;
        let __VLS_386;
        const __VLS_387 = {
            onClick: (...[$event]) => {
                if (!(!__VLS_ctx.inspectorCollapsed))
                    return;
                if (!(__VLS_ctx.overlaySelected))
                    return;
                __VLS_ctx.overlaySelected = false;
            }
        };
        __VLS_383.slots.default;
        var __VLS_383;
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
        const __VLS_388 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.w),
            min: (640),
            max: (7680),
            step: (10),
            size: "small",
            controlsPosition: "right",
        }));
        const __VLS_390 = __VLS_389({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.w),
            min: (640),
            max: (7680),
            step: (10),
            size: "small",
            controlsPosition: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_389));
        let __VLS_392;
        let __VLS_393;
        let __VLS_394;
        const __VLS_395 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_391;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "bg-insp-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_396 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.h),
            min: (360),
            max: (4320),
            step: (10),
            size: "small",
            controlsPosition: "right",
        }));
        const __VLS_398 = __VLS_397({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.h),
            min: (360),
            max: (4320),
            step: (10),
            size: "small",
            controlsPosition: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_397));
        let __VLS_400;
        let __VLS_401;
        let __VLS_402;
        const __VLS_403 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_399;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "bg-insp-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_404 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_405 = __VLS_asFunctionalComponent(__VLS_404, new __VLS_404({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.x),
            min: (0),
            size: "small",
            controlsPosition: "right",
        }));
        const __VLS_406 = __VLS_405({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.x),
            min: (0),
            size: "small",
            controlsPosition: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_405));
        let __VLS_408;
        let __VLS_409;
        let __VLS_410;
        const __VLS_411 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_407;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "bg-insp-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_412 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_413 = __VLS_asFunctionalComponent(__VLS_412, new __VLS_412({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.y),
            min: (0),
            size: "small",
            controlsPosition: "right",
        }));
        const __VLS_414 = __VLS_413({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.y),
            min: (0),
            size: "small",
            controlsPosition: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_413));
        let __VLS_416;
        let __VLS_417;
        let __VLS_418;
        const __VLS_419 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_415;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-section-title" },
        });
        const __VLS_420 = {}.ElRadioGroup;
        /** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
        // @ts-ignore
        const __VLS_421 = __VLS_asFunctionalComponent(__VLS_420, new __VLS_420({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgType),
            size: "small",
            ...{ style: {} },
        }));
        const __VLS_422 = __VLS_421({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.bgType),
            size: "small",
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_421));
        let __VLS_424;
        let __VLS_425;
        let __VLS_426;
        const __VLS_427 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        __VLS_423.slots.default;
        const __VLS_428 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_429 = __VLS_asFunctionalComponent(__VLS_428, new __VLS_428({
            value: "solid",
        }));
        const __VLS_430 = __VLS_429({
            value: "solid",
        }, ...__VLS_functionalComponentArgsRest(__VLS_429));
        __VLS_431.slots.default;
        var __VLS_431;
        const __VLS_432 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_433 = __VLS_asFunctionalComponent(__VLS_432, new __VLS_432({
            value: "gradient",
        }));
        const __VLS_434 = __VLS_433({
            value: "gradient",
        }, ...__VLS_functionalComponentArgsRest(__VLS_433));
        __VLS_435.slots.default;
        var __VLS_435;
        const __VLS_436 = {}.ElRadioButton;
        /** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
        // @ts-ignore
        const __VLS_437 = __VLS_asFunctionalComponent(__VLS_436, new __VLS_436({
            value: "image",
        }));
        const __VLS_438 = __VLS_437({
            value: "image",
        }, ...__VLS_functionalComponentArgsRest(__VLS_437));
        __VLS_439.slots.default;
        var __VLS_439;
        var __VLS_423;
        if (__VLS_ctx.overlayConfig.bgType === 'solid') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "bg-insp-color-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_440 = {}.ElColorPicker;
            /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
            // @ts-ignore
            const __VLS_441 = __VLS_asFunctionalComponent(__VLS_440, new __VLS_440({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.bgColor),
                showAlpha: true,
            }));
            const __VLS_442 = __VLS_441({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.bgColor),
                showAlpha: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_441));
            let __VLS_444;
            let __VLS_445;
            let __VLS_446;
            const __VLS_447 = {
                onChange: (__VLS_ctx.saveOverlay)
            };
            var __VLS_443;
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
            const __VLS_448 = {}.ElColorPicker;
            /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
            // @ts-ignore
            const __VLS_449 = __VLS_asFunctionalComponent(__VLS_448, new __VLS_448({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientStart),
                showAlpha: true,
            }));
            const __VLS_450 = __VLS_449({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientStart),
                showAlpha: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_449));
            let __VLS_452;
            let __VLS_453;
            let __VLS_454;
            const __VLS_455 = {
                onChange: (__VLS_ctx.saveOverlay)
            };
            var __VLS_451;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "bg-insp-color-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            const __VLS_456 = {}.ElColorPicker;
            /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
            // @ts-ignore
            const __VLS_457 = __VLS_asFunctionalComponent(__VLS_456, new __VLS_456({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
                showAlpha: true,
            }));
            const __VLS_458 = __VLS_457({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientEnd),
                showAlpha: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_457));
            let __VLS_460;
            let __VLS_461;
            let __VLS_462;
            const __VLS_463 = {
                onChange: (__VLS_ctx.saveOverlay)
            };
            var __VLS_459;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "bg-insp-slider-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.overlayConfig.gradientAngle);
            const __VLS_464 = {}.ElSlider;
            /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
            // @ts-ignore
            const __VLS_465 = __VLS_asFunctionalComponent(__VLS_464, new __VLS_464({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
                min: (0),
                max: (360),
                ...{ style: {} },
            }));
            const __VLS_466 = __VLS_465({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.gradientAngle),
                min: (0),
                max: (360),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_465));
            let __VLS_468;
            let __VLS_469;
            let __VLS_470;
            const __VLS_471 = {
                onChange: (__VLS_ctx.saveOverlay)
            };
            var __VLS_467;
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
            const __VLS_472 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_473 = __VLS_asFunctionalComponent(__VLS_472, new __VLS_472({
                ...{ 'onClick': {} },
                size: "small",
                loading: (__VLS_ctx.bgImgUploading),
            }));
            const __VLS_474 = __VLS_473({
                ...{ 'onClick': {} },
                size: "small",
                loading: (__VLS_ctx.bgImgUploading),
            }, ...__VLS_functionalComponentArgsRest(__VLS_473));
            let __VLS_476;
            let __VLS_477;
            let __VLS_478;
            const __VLS_479 = {
                onClick: (__VLS_ctx.triggerBgImageUpload)
            };
            __VLS_475.slots.default;
            var __VLS_475;
            if (__VLS_ctx.overlayConfig.bgImage) {
                const __VLS_480 = {}.ElButton;
                /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
                // @ts-ignore
                const __VLS_481 = __VLS_asFunctionalComponent(__VLS_480, new __VLS_480({
                    ...{ 'onClick': {} },
                    size: "small",
                    type: "danger",
                    plain: true,
                }));
                const __VLS_482 = __VLS_481({
                    ...{ 'onClick': {} },
                    size: "small",
                    type: "danger",
                    plain: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_481));
                let __VLS_484;
                let __VLS_485;
                let __VLS_486;
                const __VLS_487 = {
                    onClick: (...[$event]) => {
                        if (!(!__VLS_ctx.inspectorCollapsed))
                            return;
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
                __VLS_483.slots.default;
                var __VLS_483;
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
            const __VLS_488 = {}.ElColorPicker;
            /** @type {[typeof __VLS_components.ElColorPicker, typeof __VLS_components.elColorPicker, ]} */ ;
            // @ts-ignore
            const __VLS_489 = __VLS_asFunctionalComponent(__VLS_488, new __VLS_488({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.bgColor),
                showAlpha: true,
            }));
            const __VLS_490 = __VLS_489({
                ...{ 'onChange': {} },
                modelValue: (__VLS_ctx.overlayConfig.bgColor),
                showAlpha: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_489));
            let __VLS_492;
            let __VLS_493;
            let __VLS_494;
            const __VLS_495 = {
                onChange: (__VLS_ctx.saveOverlay)
            };
            var __VLS_491;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bg-insp-slider-row" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (Math.round(__VLS_ctx.overlayConfig.opacity * 100));
        const __VLS_496 = {}.ElSlider;
        /** @type {[typeof __VLS_components.ElSlider, typeof __VLS_components.elSlider, ]} */ ;
        // @ts-ignore
        const __VLS_497 = __VLS_asFunctionalComponent(__VLS_496, new __VLS_496({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.opacity),
            min: (0.05),
            max: (1),
            step: (0.05),
            ...{ style: {} },
        }));
        const __VLS_498 = __VLS_497({
            ...{ 'onChange': {} },
            modelValue: (__VLS_ctx.overlayConfig.opacity),
            min: (0.05),
            max: (1),
            step: (0.05),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_497));
        let __VLS_500;
        let __VLS_501;
        let __VLS_502;
        const __VLS_503 = {
            onChange: (__VLS_ctx.saveOverlay)
        };
        var __VLS_499;
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
        const __VLS_504 = __VLS_asFunctionalComponent(EditorComponentInspector, new EditorComponentInspector({
            ...{ 'onApplyLayout': {} },
            ...{ 'onBringFront': {} },
            ...{ 'onRemove': {} },
            ...{ 'onPreviewComponent': {} },
            ...{ 'onSaveComponent': {} },
            scene: "screen",
            component: (__VLS_ctx.activeComponent),
            chart: (__VLS_ctx.activeChart),
        }));
        const __VLS_505 = __VLS_504({
            ...{ 'onApplyLayout': {} },
            ...{ 'onBringFront': {} },
            ...{ 'onRemove': {} },
            ...{ 'onPreviewComponent': {} },
            ...{ 'onSaveComponent': {} },
            scene: "screen",
            component: (__VLS_ctx.activeComponent),
            chart: (__VLS_ctx.activeChart),
        }, ...__VLS_functionalComponentArgsRest(__VLS_504));
        let __VLS_507;
        let __VLS_508;
        let __VLS_509;
        const __VLS_510 = {
            onApplyLayout: (__VLS_ctx.applyLayoutPatch)
        };
        const __VLS_511 = {
            onBringFront: (__VLS_ctx.bringComponentToFront)
        };
        const __VLS_512 = {
            onRemove: (__VLS_ctx.handleRemoveActiveComponent)
        };
        const __VLS_513 = {
            onPreviewComponent: (__VLS_ctx.previewActiveComponent)
        };
        const __VLS_514 = {
            onSaveComponent: (__VLS_ctx.saveActiveComponent)
        };
        var __VLS_506;
    }
}
const __VLS_515 = {}.teleport;
/** @type {[typeof __VLS_components.Teleport, typeof __VLS_components.teleport, typeof __VLS_components.Teleport, typeof __VLS_components.teleport, ]} */ ;
// @ts-ignore
const __VLS_516 = __VLS_asFunctionalComponent(__VLS_515, new __VLS_515({
    to: "body",
}));
const __VLS_517 = __VLS_516({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_516));
__VLS_518.slots.default;
if (__VLS_ctx.componentContextMenu.visible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: () => { } },
        ...{ onContextmenu: () => { } },
        ...{ class: "screen-context-menu" },
        ...{ style: ({ left: `${__VLS_ctx.componentContextMenu.x}px`, top: `${__VLS_ctx.componentContextMenu.y}px` }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.bringSelectedComponentsToFront) },
        type: "button",
        ...{ class: "screen-context-menu__item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.sendSelectedComponentsToBack) },
        type: "button",
        ...{ class: "screen-context-menu__item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.moveSelectedComponentsForward) },
        type: "button",
        ...{ class: "screen-context-menu__item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.moveSelectedComponentsBackward) },
        type: "button",
        ...{ class: "screen-context-menu__item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "screen-context-menu__divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.duplicateSelectedComponents) },
        type: "button",
        ...{ class: "screen-context-menu__item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.removeSelectedComponents) },
        type: "button",
        ...{ class: "screen-context-menu__item screen-context-menu__item--danger" },
    });
}
var __VLS_518;
const __VLS_519 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_520 = __VLS_asFunctionalComponent(__VLS_519, new __VLS_519({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}));
const __VLS_521 = __VLS_520({
    modelValue: (__VLS_ctx.createDashVisible),
    title: "新建数据大屏",
    width: "420px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_520));
__VLS_522.slots.default;
const __VLS_523 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_524 = __VLS_asFunctionalComponent(__VLS_523, new __VLS_523({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}));
const __VLS_525 = __VLS_524({
    model: (__VLS_ctx.dashForm),
    labelWidth: "80px",
}, ...__VLS_functionalComponentArgsRest(__VLS_524));
__VLS_526.slots.default;
const __VLS_527 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_528 = __VLS_asFunctionalComponent(__VLS_527, new __VLS_527({
    label: "名称",
}));
const __VLS_529 = __VLS_528({
    label: "名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_528));
__VLS_530.slots.default;
const __VLS_531 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_532 = __VLS_asFunctionalComponent(__VLS_531, new __VLS_531({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}));
const __VLS_533 = __VLS_532({
    modelValue: (__VLS_ctx.dashForm.name),
    placeholder: "请输入大屏名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_532));
var __VLS_530;
var __VLS_526;
{
    const { footer: __VLS_thisSlot } = __VLS_522.slots;
    const __VLS_535 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_536 = __VLS_asFunctionalComponent(__VLS_535, new __VLS_535({
        ...{ 'onClick': {} },
    }));
    const __VLS_537 = __VLS_536({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_536));
    let __VLS_539;
    let __VLS_540;
    let __VLS_541;
    const __VLS_542 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDashVisible = false;
        }
    };
    __VLS_538.slots.default;
    var __VLS_538;
    const __VLS_543 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_544 = __VLS_asFunctionalComponent(__VLS_543, new __VLS_543({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }));
    const __VLS_545 = __VLS_544({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.dashSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_544));
    let __VLS_547;
    let __VLS_548;
    let __VLS_549;
    const __VLS_550 = {
        onClick: (__VLS_ctx.handleCreateDashboard)
    };
    __VLS_546.slots.default;
    var __VLS_546;
}
var __VLS_522;
const __VLS_551 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_552 = __VLS_asFunctionalComponent(__VLS_551, new __VLS_551({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}));
const __VLS_553 = __VLS_552({
    modelValue: (__VLS_ctx.templateSaveVisible),
    title: "保存为可复用组件",
    width: "460px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_552));
__VLS_554.slots.default;
const __VLS_555 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_556 = __VLS_asFunctionalComponent(__VLS_555, new __VLS_555({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}));
const __VLS_557 = __VLS_556({
    model: (__VLS_ctx.templateForm),
    labelWidth: "90px",
}, ...__VLS_functionalComponentArgsRest(__VLS_556));
__VLS_558.slots.default;
const __VLS_559 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_560 = __VLS_asFunctionalComponent(__VLS_559, new __VLS_559({
    label: "组件名称",
}));
const __VLS_561 = __VLS_560({
    label: "组件名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_560));
__VLS_562.slots.default;
const __VLS_563 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_564 = __VLS_asFunctionalComponent(__VLS_563, new __VLS_563({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}));
const __VLS_565 = __VLS_564({
    modelValue: (__VLS_ctx.templateForm.name),
    placeholder: "请输入组件资产名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_564));
var __VLS_562;
const __VLS_567 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_568 = __VLS_asFunctionalComponent(__VLS_567, new __VLS_567({
    label: "说明",
}));
const __VLS_569 = __VLS_568({
    label: "说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_568));
__VLS_570.slots.default;
const __VLS_571 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_572 = __VLS_asFunctionalComponent(__VLS_571, new __VLS_571({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}));
const __VLS_573 = __VLS_572({
    modelValue: (__VLS_ctx.templateForm.description),
    type: "textarea",
    rows: (3),
    placeholder: "说明这个组件适合什么场景",
}, ...__VLS_functionalComponentArgsRest(__VLS_572));
var __VLS_570;
var __VLS_558;
{
    const { footer: __VLS_thisSlot } = __VLS_554.slots;
    const __VLS_575 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_576 = __VLS_asFunctionalComponent(__VLS_575, new __VLS_575({
        ...{ 'onClick': {} },
    }));
    const __VLS_577 = __VLS_576({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_576));
    let __VLS_579;
    let __VLS_580;
    let __VLS_581;
    const __VLS_582 = {
        onClick: (...[$event]) => {
            __VLS_ctx.templateSaveVisible = false;
        }
    };
    __VLS_578.slots.default;
    var __VLS_578;
    const __VLS_583 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_584 = __VLS_asFunctionalComponent(__VLS_583, new __VLS_583({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }));
    const __VLS_585 = __VLS_584({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.templateSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_584));
    let __VLS_587;
    let __VLS_588;
    let __VLS_589;
    const __VLS_590 = {
        onClick: (__VLS_ctx.saveActiveComponentAsAsset)
    };
    __VLS_586.slots.default;
    var __VLS_586;
}
var __VLS_554;
const __VLS_591 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_592 = __VLS_asFunctionalComponent(__VLS_591, new __VLS_591({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}));
const __VLS_593 = __VLS_592({
    modelValue: (__VLS_ctx.shareVisible),
    title: "分享数据大屏",
    width: "520px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_592));
__VLS_594.slots.default;
if (__VLS_ctx.isPublished) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-label" },
    });
    const __VLS_595 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_596 = __VLS_asFunctionalComponent(__VLS_595, new __VLS_595({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }));
    const __VLS_597 = __VLS_596({
        modelValue: (__VLS_ctx.shareLink),
        readonly: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_596));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "share-tip" },
    });
}
else {
    const __VLS_599 = {}.ElAlert;
    /** @type {[typeof __VLS_components.ElAlert, typeof __VLS_components.elAlert, ]} */ ;
    // @ts-ignore
    const __VLS_600 = __VLS_asFunctionalComponent(__VLS_599, new __VLS_599({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }));
    const __VLS_601 = __VLS_600({
        title: "当前数据大屏尚未正式发布",
        type: "warning",
        closable: (false),
        description: "请先设置发布状态、访问角色和正式分享链接，再对外分享。",
    }, ...__VLS_functionalComponentArgsRest(__VLS_600));
}
{
    const { footer: __VLS_thisSlot } = __VLS_594.slots;
    const __VLS_603 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_604 = __VLS_asFunctionalComponent(__VLS_603, new __VLS_603({
        ...{ 'onClick': {} },
    }));
    const __VLS_605 = __VLS_604({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_604));
    let __VLS_607;
    let __VLS_608;
    let __VLS_609;
    const __VLS_610 = {
        onClick: (...[$event]) => {
            __VLS_ctx.shareVisible = false;
        }
    };
    __VLS_606.slots.default;
    var __VLS_606;
    if (!__VLS_ctx.isPublished) {
        const __VLS_611 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_612 = __VLS_asFunctionalComponent(__VLS_611, new __VLS_611({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_613 = __VLS_612({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_612));
        let __VLS_615;
        let __VLS_616;
        let __VLS_617;
        const __VLS_618 = {
            onClick: (__VLS_ctx.openPublishDialog)
        };
        __VLS_614.slots.default;
        var __VLS_614;
    }
    else {
        const __VLS_619 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_620 = __VLS_asFunctionalComponent(__VLS_619, new __VLS_619({
            ...{ 'onClick': {} },
        }));
        const __VLS_621 = __VLS_620({
            ...{ 'onClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_620));
        let __VLS_623;
        let __VLS_624;
        let __VLS_625;
        const __VLS_626 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.isPublished))
                    return;
                __VLS_ctx.openPreview(true);
            }
        };
        __VLS_622.slots.default;
        var __VLS_622;
        const __VLS_627 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_628 = __VLS_asFunctionalComponent(__VLS_627, new __VLS_627({
            ...{ 'onClick': {} },
            type: "primary",
        }));
        const __VLS_629 = __VLS_628({
            ...{ 'onClick': {} },
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_628));
        let __VLS_631;
        let __VLS_632;
        let __VLS_633;
        const __VLS_634 = {
            onClick: (__VLS_ctx.copyShareLink)
        };
        __VLS_630.slots.default;
        var __VLS_630;
    }
}
var __VLS_594;
const __VLS_635 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_636 = __VLS_asFunctionalComponent(__VLS_635, new __VLS_635({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}));
const __VLS_637 = __VLS_636({
    modelValue: (__VLS_ctx.publishVisible),
    title: "发布数据大屏",
    width: "560px",
    destroyOnClose: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_636));
__VLS_638.slots.default;
const __VLS_639 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_640 = __VLS_asFunctionalComponent(__VLS_639, new __VLS_639({
    labelWidth: "120px",
}));
const __VLS_641 = __VLS_640({
    labelWidth: "120px",
}, ...__VLS_functionalComponentArgsRest(__VLS_640));
__VLS_642.slots.default;
const __VLS_643 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_644 = __VLS_asFunctionalComponent(__VLS_643, new __VLS_643({
    label: "发布状态",
}));
const __VLS_645 = __VLS_644({
    label: "发布状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_644));
__VLS_646.slots.default;
const __VLS_647 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_648 = __VLS_asFunctionalComponent(__VLS_647, new __VLS_647({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}));
const __VLS_649 = __VLS_648({
    modelValue: (__VLS_ctx.publishForm.published),
    activeText: "已发布",
    inactiveText: "草稿",
}, ...__VLS_functionalComponentArgsRest(__VLS_648));
var __VLS_646;
const __VLS_651 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_652 = __VLS_asFunctionalComponent(__VLS_651, new __VLS_651({
    label: "允许匿名链接",
}));
const __VLS_653 = __VLS_652({
    label: "允许匿名链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_652));
__VLS_654.slots.default;
const __VLS_655 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_656 = __VLS_asFunctionalComponent(__VLS_655, new __VLS_655({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}));
const __VLS_657 = __VLS_656({
    modelValue: (__VLS_ctx.publishForm.allowAnonymousAccess),
    activeText: "允许",
    inactiveText: "关闭",
}, ...__VLS_functionalComponentArgsRest(__VLS_656));
var __VLS_654;
const __VLS_659 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_660 = __VLS_asFunctionalComponent(__VLS_659, new __VLS_659({
    label: "允许访问角色",
}));
const __VLS_661 = __VLS_660({
    label: "允许访问角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_660));
__VLS_662.slots.default;
const __VLS_663 = {}.ElCheckboxGroup;
/** @type {[typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, typeof __VLS_components.ElCheckboxGroup, typeof __VLS_components.elCheckboxGroup, ]} */ ;
// @ts-ignore
const __VLS_664 = __VLS_asFunctionalComponent(__VLS_663, new __VLS_663({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}));
const __VLS_665 = __VLS_664({
    modelValue: (__VLS_ctx.publishForm.allowedRoles),
}, ...__VLS_functionalComponentArgsRest(__VLS_664));
__VLS_666.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roleOptions))) {
    const __VLS_667 = {}.ElCheckbox;
    /** @type {[typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, typeof __VLS_components.ElCheckbox, typeof __VLS_components.elCheckbox, ]} */ ;
    // @ts-ignore
    const __VLS_668 = __VLS_asFunctionalComponent(__VLS_667, new __VLS_667({
        key: (role),
        label: (role),
    }));
    const __VLS_669 = __VLS_668({
        key: (role),
        label: (role),
    }, ...__VLS_functionalComponentArgsRest(__VLS_668));
    __VLS_670.slots.default;
    (role);
    var __VLS_670;
}
var __VLS_666;
var __VLS_662;
const __VLS_671 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_672 = __VLS_asFunctionalComponent(__VLS_671, new __VLS_671({
    label: "正式分享链接",
}));
const __VLS_673 = __VLS_672({
    label: "正式分享链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_672));
__VLS_674.slots.default;
const __VLS_675 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_676 = __VLS_asFunctionalComponent(__VLS_675, new __VLS_675({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}));
const __VLS_677 = __VLS_676({
    modelValue: (__VLS_ctx.draftPublishedLink),
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_676));
var __VLS_674;
var __VLS_642;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "share-tip" },
});
{
    const { footer: __VLS_thisSlot } = __VLS_638.slots;
    const __VLS_679 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_680 = __VLS_asFunctionalComponent(__VLS_679, new __VLS_679({
        ...{ 'onClick': {} },
    }));
    const __VLS_681 = __VLS_680({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_680));
    let __VLS_683;
    let __VLS_684;
    let __VLS_685;
    const __VLS_686 = {
        onClick: (...[$event]) => {
            __VLS_ctx.publishVisible = false;
        }
    };
    __VLS_682.slots.default;
    var __VLS_682;
    const __VLS_687 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_688 = __VLS_asFunctionalComponent(__VLS_687, new __VLS_687({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }));
    const __VLS_689 = __VLS_688({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.publishSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_688));
    let __VLS_691;
    let __VLS_692;
    let __VLS_693;
    const __VLS_694 = {
        onClick: (__VLS_ctx.savePublishSettings)
    };
    __VLS_690.slots.default;
    var __VLS_690;
}
var __VLS_638;
/** @type {__VLS_StyleScopedClasses['screen-root']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-left-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-toggle-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head-main']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-overline']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head-badges']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-head-pill--accent']} */ ;
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
/** @type {__VLS_StyleScopedClasses['lp-library-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-library-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-library-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-library-note']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-library-body']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-scroll']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-asset-card--compact']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-subline']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-size']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-ac-lite-badge']} */ ;
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
/** @type {__VLS_StyleScopedClasses['lp-layer-drag-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-name']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-layer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-preview-float']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-preview-status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-preview-state']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-head']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['lp-hover-meta']} */ ;
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
/** @type {__VLS_StyleScopedClasses['canvas-tb-overlay-ctrl']} */ ;
/** @type {__VLS_StyleScopedClasses['canvas-tb-zoom']} */ ;
/** @type {__VLS_StyleScopedClasses['zoom-label']} */ ;
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
/** @type {__VLS_StyleScopedClasses['stage-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-placeholder']} */ ;
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
/** @type {__VLS_StyleScopedClasses['stage-marquee']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-guide']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-guide--vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-guide']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-guide--horizontal']} */ ;
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
/** @type {__VLS_StyleScopedClasses['screen-context-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__divider']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-context-menu__item--danger']} */ ;
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
            ComponentTemplatePreview: ComponentTemplatePreview,
            EditorComponentInspector: EditorComponentInspector,
            chartTypeLabel: chartTypeLabel,
            CHART_CATEGORIES: CHART_CATEGORIES,
            getAssetBadgeText: getAssetBadgeText,
            getTemplateAssetConfig: getTemplateAssetConfig,
            isTemplateStaticAsset: isTemplateStaticAsset,
            expandedCats: expandedCats,
            toggleCategory: toggleCategory,
            sidebarCollapsed: sidebarCollapsed,
            inspectorCollapsed: inspectorCollapsed,
            effectiveSidebarCollapsed: effectiveSidebarCollapsed,
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
            templateAssets: templateAssets,
            componentDataMap: componentDataMap,
            leftPanelRef: leftPanelRef,
            canvasRef: canvasRef,
            stageScrollRef: stageScrollRef,
            activeCompId: activeCompId,
            dashboardSearch: dashboardSearch,
            shareVisible: shareVisible,
            publishVisible: publishVisible,
            publishSaving: publishSaving,
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
            layerDragOverIdx: layerDragOverIdx,
            marqueeSelection: marqueeSelection,
            componentContextMenu: componentContextMenu,
            templatePreviewStyle: templatePreviewStyle,
            undoApplying: undoApplying,
            canUndo: canUndo,
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
            startCurtainResize: startCurtainResize,
            chartTypeOptions: chartTypeOptions,
            filteredCharts: filteredCharts,
            filteredTemplates: filteredTemplates,
            cancelHideTemplatePreview: cancelHideTemplatePreview,
            showTemplatePreview: showTemplatePreview,
            scheduleHideTemplatePreview: scheduleHideTemplatePreview,
            hideTemplatePreview: hideTemplatePreview,
            hoveredTemplate: hoveredTemplate,
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
            getComponentDisplayName: getComponentDisplayName,
            getComponentStatusText: getComponentStatusText,
            layeredComponents: layeredComponents,
            marqueeStyle: marqueeStyle,
            canvasWorkWidth: canvasWorkWidth,
            canvasScale: canvasScale,
            zoomIn: zoomIn,
            zoomOut: zoomOut,
            zoomReset: zoomReset,
            zoomFit: zoomFit,
            toggleInspector: toggleInspector,
            canvasMinHeight: canvasMinHeight,
            hRulerMarks: hRulerMarks,
            vRulerMarks: vRulerMarks,
            getHRulerMarkStyle: getHRulerMarkStyle,
            getVRulerMarkStyle: getVRulerMarkStyle,
            handleStageScroll: handleStageScroll,
            setChartRef: setChartRef,
            getDashboardComponentCount: getDashboardComponentCount,
            getDashboardCoverUrl: getDashboardCoverUrl,
            getCardStyle: getCardStyle,
            shouldDeferComponentPreview: shouldDeferComponentPreview,
            isComponentPreviewLoading: isComponentPreviewLoading,
            selectDashboard: selectDashboard,
            loadComponents: loadComponents,
            isTableChart: isTableChart,
            isFilterButtonChart: isFilterButtonChart,
            isStaticWidget: isStaticWidget,
            isDecorationComponent: isDecorationComponent,
            isRenderableChart: isRenderableChart,
            showNoField: showNoField,
            getTableColumns: getTableColumns,
            getTableRows: getTableRows,
            setStageCardRef: setStageCardRef,
            isComponentSelected: isComponentSelected,
            hideComponentContextMenu: hideComponentContextMenu,
            startStageMarquee: startStageMarquee,
            handleCurtainPointerDown: handleCurtainPointerDown,
            selectOverlayLayer: selectOverlayLayer,
            selectLayerComponent: selectLayerComponent,
            handleStageCardMouseDown: handleStageCardMouseDown,
            openComponentContextMenu: openComponentContextMenu,
            applyLayoutPatch: applyLayoutPatch,
            bringComponentToFront: bringComponentToFront,
            bringSpecificComponentToFront: bringSpecificComponentToFront,
            bringSelectedComponentsToFront: bringSelectedComponentsToFront,
            sendSelectedComponentsToBack: sendSelectedComponentsToBack,
            moveSelectedComponentsForward: moveSelectedComponentsForward,
            moveSelectedComponentsBackward: moveSelectedComponentsBackward,
            duplicateSelectedComponents: duplicateSelectedComponents,
            removeSelectedComponents: removeSelectedComponents,
            handleRemoveActiveComponent: handleRemoveActiveComponent,
            previewActiveComponent: previewActiveComponent,
            saveActiveComponent: saveActiveComponent,
            interactionGuideLines: interactionGuideLines,
            startDrag: startDrag,
            startResize: startResize,
            openCreateDashboard: openCreateDashboard,
            handleCreateDashboard: handleCreateDashboard,
            handleDeleteDashboard: handleDeleteDashboard,
            openPreview: openPreview,
            openShareDialog: openShareDialog,
            openPublishDialog: openPublishDialog,
            savePublishSettings: savePublishSettings,
            undoLastChange: undoLastChange,
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
            onStageDragOver: onStageDragOver,
            onStageDragLeave: onStageDragLeave,
            onStageDrop: onStageDrop,
            onTypeChipDragStart: onTypeChipDragStart,
            onTypeChipDragEnd: onTypeChipDragEnd,
            onLayerDragStart: onLayerDragStart,
            onLayerDragOver: onLayerDragOver,
            onLayerDragLeave: onLayerDragLeave,
            onLayerDrop: onLayerDrop,
            onLayerDragEnd: onLayerDragEnd,
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
