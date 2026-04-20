import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, GaugeChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart, TreemapChart, } from 'echarts/charts';
import { GridComponent, LegendComponent, LegendScrollComponent, RadarComponent, TooltipComponent, VisualMapComponent, } from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([
    BarChart,
    FunnelChart,
    GaugeChart,
    HeatmapChart,
    LineChart,
    PieChart,
    RadarChart,
    ScatterChart,
    TreemapChart,
    GridComponent,
    LegendComponent,
    LegendScrollComponent,
    RadarComponent,
    TooltipComponent,
    VisualMapComponent,
    LabelLayout,
    UniversalTransition,
    CanvasRenderer,
]);
export { echarts };
