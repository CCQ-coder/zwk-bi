-- 补齐茶饮演示图表、模板与演示仪表板
USE ai_bi;

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '茶饮日销趋势', d.id, 'line', '日期', '销售金额', '店铺'
FROM bi_dataset d
WHERE d.name = '茶饮店铺日汇总'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '茶饮日销趋势');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '茶饮品线销售排行', d.id, 'bar_horizontal', '品线', '销售金额', ''
FROM bi_dataset d
WHERE d.name = '茶饮品线销售排名'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '茶饮品线销售排行');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '茶饮门店毛利对比', d.id, 'bar', '店铺', '毛利', ''
FROM bi_dataset d
WHERE d.name = '茶饮店铺收支对比'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '茶饮门店毛利对比');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '茶饮原料费用对比', d.id, 'bar', '店铺', '金额', ''
FROM bi_dataset d
WHERE d.name = '茶饮原料费用明细'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '茶饮原料费用对比');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '茶饮订单明细表', d.id, 'table', '店铺', '销售金额', ''
FROM bi_dataset d
WHERE d.name = '茶饮订单明细'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '茶饮订单明细表');

INSERT INTO bi_dashboard (name, layout_json)
SELECT '茶饮经营分析', '{"scene":"dashboard","publish":{"status":"DRAFT","shareToken":"teaoperatingdemo20260417","allowedRoles":["ADMIN","ANALYST"],"allowAnonymousAccess":true},"canvas":{"width":1440,"height":900}}'
WHERE NOT EXISTS (SELECT 1 FROM bi_dashboard WHERE name = '茶饮经营分析');

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 0, 12, 4, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮日销趋势'
WHERE d.name = '茶饮经营分析'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id
  );

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 12, 0, 12, 4, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮品线销售排行'
WHERE d.name = '茶饮经营分析'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id
  );

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 4, 12, 4, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮门店毛利对比'
WHERE d.name = '茶饮经营分析'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id
  );

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 12, 4, 12, 4, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮原料费用对比'
WHERE d.name = '茶饮经营分析'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id
  );

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 8, 24, 5, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '茶饮订单明细表'
WHERE d.name = '茶饮经营分析'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id
  );

INSERT INTO bi_chart_template (name, description, chart_type, config_json, built_in, sort_order, created_by)
SELECT '茶饮日销趋势卡', '适合追踪门店日销波动和高峰日表现。', 'line',
       CONCAT('{"chart":{"name":"茶饮日销趋势卡","datasetId":', d.id, ',"chartType":"line","xField":"日期","yField":"销售金额","groupField":"店铺"},"style":{"theme":"海湾晨光","bgColor":"#f6fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":true,"areaFill":true,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":560,"height":320}}'),
       1, 100, 'system'
FROM bi_dataset d
WHERE d.name = '茶饮店铺日汇总'
  AND NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = '茶饮日销趋势卡');

INSERT INTO bi_chart_template (name, description, chart_type, config_json, built_in, sort_order, created_by)
SELECT '茶饮品线排行卡', '适合查看不同品线的销售贡献排名。', 'bar_horizontal',
       CONCAT('{"chart":{"name":"茶饮品线排行卡","datasetId":', d.id, ',"chartType":"bar_horizontal","xField":"品线","yField":"销售金额","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f5fcf8","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":12,"barMaxWidth":26,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":340}}'),
       1, 110, 'system'
FROM bi_dataset d
WHERE d.name = '茶饮品线销售排名'
  AND NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = '茶饮品线排行卡');

INSERT INTO bi_chart_template (name, description, chart_type, config_json, built_in, sort_order, created_by)
SELECT '茶饮门店毛利卡', '适合对比不同门店的销售金额、成本与毛利。', 'bar',
       CONCAT('{"chart":{"name":"茶饮门店毛利卡","datasetId":', d.id, ',"chartType":"bar","xField":"店铺","yField":"毛利","groupField":""},"style":{"theme":"琥珀橙金","bgColor":"#fffaf3","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":10,"barMaxWidth":32,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}'),
       1, 120, 'system'
FROM bi_dataset d
WHERE d.name = '茶饮店铺收支对比'
  AND NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = '茶饮门店毛利卡');

INSERT INTO bi_chart_template (name, description, chart_type, config_json, built_in, sort_order, created_by)
SELECT '茶饮原料费用卡', '适合观察门店原料费用投入分布。', 'bar',
       CONCAT('{"chart":{"name":"茶饮原料费用卡","datasetId":', d.id, ',"chartType":"bar","xField":"店铺","yField":"金额","groupField":""},"style":{"theme":"暮光珊瑚","bgColor":"#fff8f5","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":10,"barMaxWidth":32,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}'),
       1, 130, 'system'
FROM bi_dataset d
WHERE d.name = '茶饮原料费用明细'
  AND NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = '茶饮原料费用卡');

INSERT INTO bi_chart_template (name, description, chart_type, config_json, built_in, sort_order, created_by)
SELECT '茶饮订单明细表', '适合回看茶饮订单明细与门店销售构成。', 'table',
       CONCAT('{"chart":{"name":"茶饮订单明细表","datasetId":', d.id, ',"chartType":"table","xField":"店铺","yField":"销售金额","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#ffffff","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":640,"height":360}}'),
       1, 140, 'system'
FROM bi_dataset d
WHERE d.name = '茶饮订单明细'
  AND NOT EXISTS (SELECT 1 FROM bi_chart_template WHERE name = '茶饮订单明细表');