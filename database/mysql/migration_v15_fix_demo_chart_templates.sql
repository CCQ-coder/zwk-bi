-- V15: Fix built-in chart templates to reference demo datasets with correct field names.
-- Demo datasets (datasource_id IS NULL) have these field names:
--   demo_sales_monthly  → 月份, 销售额
--   demo_sales_region   → 区域, 销售额
--   demo_category_pie   → 产品类别, 销售占比
--   demo_user_growth    → 月份, 用户数

-- Update templates that reference line/bar/gauge chart types → use 销售额月度趋势 demo dataset
UPDATE bi_chart_template t
JOIN bi_dataset d ON d.sql_text LIKE '%demo_sales_monthly%' AND d.datasource_id IS NULL
SET t.config_json = JSON_SET(
    t.config_json,
    '$.chart.datasetId', d.id,
    '$.chart.xField',    '月份',
    '$.chart.yField',    '销售额'
)
WHERE t.built_in = 1
  AND t.chart_type IN ('line', 'area', 'line_stack', 'gauge');

-- Update bar/bar_horizontal/funnel/radar/scatter/table templates → use 各区域销售额 demo dataset
UPDATE bi_chart_template t
JOIN bi_dataset d ON d.sql_text LIKE '%demo_sales_region%' AND d.datasource_id IS NULL
SET t.config_json = JSON_SET(
    t.config_json,
    '$.chart.datasetId', d.id,
    '$.chart.xField',    '区域',
    '$.chart.yField',    '销售额',
    '$.chart.groupField', ''
)
WHERE t.built_in = 1
  AND t.chart_type IN ('bar', 'bar_horizontal', 'funnel', 'radar', 'scatter', 'table', 'table_summary');

-- Update doughnut/pie/rose templates → use 产品类别占比 demo dataset
UPDATE bi_chart_template t
JOIN bi_dataset d ON d.sql_text LIKE '%demo_category_pie%' AND d.datasource_id IS NULL
SET t.config_json = JSON_SET(
    t.config_json,
    '$.chart.datasetId', d.id,
    '$.chart.xField',    '产品类别',
    '$.chart.yField',    '销售占比',
    '$.chart.groupField', ''
)
WHERE t.built_in = 1
  AND t.chart_type IN ('doughnut', 'pie', 'rose');
