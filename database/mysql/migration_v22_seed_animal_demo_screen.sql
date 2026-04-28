USE ai_bi;

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '演示数据大屏1', NULL, 'SELECT * FROM demo_animal_screen_1', 1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '演示数据大屏1');

INSERT INTO bi_dataset_field(dataset_id, field_name, field_type, field_label)
SELECT d.id, fields.field_name, fields.field_type, fields.field_label
FROM bi_dataset d
INNER JOIN (
    SELECT '模块' AS field_name, 'string' AS field_type, '模块' AS field_label
    UNION ALL SELECT '动物', 'string', '动物'
    UNION ALL SELECT '品类', 'string', '品类'
    UNION ALL SELECT '指标', 'string', '指标'
    UNION ALL SELECT '数值', 'number', '数值'
    UNION ALL SELECT '单位', 'string', '单位'
    UNION ALL SELECT '简介', 'string', '简介'
    UNION ALL SELECT '生态位', 'string', '生态位'
    UNION ALL SELECT '能力', 'string', '能力'
    UNION ALL SELECT '得分', 'number', '得分'
    UNION ALL SELECT '时段', 'string', '时段'
    UNION ALL SELECT '活跃指数', 'number', '活跃指数'
    UNION ALL SELECT '综合值', 'number', '综合值'
    UNION ALL SELECT '排序', 'number', '排序'
) fields
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (
    SELECT 1 FROM bi_dataset_field f WHERE f.dataset_id = d.id AND f.field_name = fields.field_name
  );

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板标题', NULL, 'decor_title_plate', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板标题');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板左侧边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板左侧边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板中部边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板中部边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板右侧边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板右侧边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板底部左边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板底部左边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板底部中边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板底部中边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板底部右边框', NULL, 'decor_border_panel', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板底部右边框');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-雪山狼犬档案', d.id, 'text_block', '动物', '简介', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-雪山狼犬档案');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-雪山狼犬体重', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-雪山狼犬体重');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-雪山狼犬速度', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-雪山狼犬速度');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-雪山狼犬嗅觉', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-雪山狼犬嗅觉');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-月影灵猫档案', d.id, 'text_block', '动物', '简介', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-月影灵猫档案');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-月影灵猫体重', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-月影灵猫体重');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-月影灵猫跳跃', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-月影灵猫跳跃');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-月影灵猫夜视', d.id, 'metric_indicator', '指标', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-月影灵猫夜视');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-生态位占比', d.id, 'doughnut', '生态位', '数值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-生态位占比');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-感知能力排行', d.id, 'table_rank', '能力', '得分', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-感知能力排行');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-雪山狼犬节律', d.id, 'business_trend', '时段', '活跃指数', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-雪山狼犬节律');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-综合评分', d.id, 'bar', '动物', '综合值', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-综合评分');

INSERT INTO bi_chart (name, dataset_id, chart_type, x_field, y_field, group_field)
SELECT '动物信息面板-月影灵猫节律', d.id, 'business_trend', '时段', '活跃指数', ''
FROM bi_dataset d
WHERE d.name = '演示数据大屏1'
  AND NOT EXISTS (SELECT 1 FROM bi_chart WHERE name = '动物信息面板-月影灵猫节律');

INSERT INTO bi_dashboard (name, layout_json)
SELECT '动物信息面板', '{"scene":"screen","publish":{"status":"DRAFT","shareToken":"animalscreen20260427","allowedRoles":["ADMIN","ANALYST"],"allowAnonymousAccess":true},"canvas":{"width":1920,"height":1080,"overlay":{"show":true,"bgColor":"#050d18","opacity":1,"x":0,"y":0,"w":1920,"h":1080,"bgType":"gradient","gradientStart":"#081827","gradientEnd":"#02070d","gradientAngle":135}}}'
WHERE NOT EXISTS (SELECT 1 FROM bi_dashboard WHERE name = '动物信息面板');

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 7, 0, 10, 2, 5, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板标题'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 2, 7, 9, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板左侧边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 7, 2, 10, 9, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板中部边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 17, 2, 7, 9, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板右侧边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 0, 11, 8, 7, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部左边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 11, 8, 7, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部中边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 16, 11, 8, 7, 0, '{}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板底部右边框'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 3, 5, 3, 2,
'{"chart":{"name":"雪山狼犬档案","datasetId":12,"chartType":"text_block","xField":"动物","yField":"简介","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"雪山狼犬","titleColor":"#eef8ff","bgColor":"rgba(7,23,42,0.62)","borderShow":true,"borderColor":"rgba(92,218,255,0.32)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(0,169,255,0.18)","shadowBlur":18},"interaction":{"dataFilters":[{"field":"模块","value":"档案卡"},{"field":"动物","value":"雪山狼犬"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬档案'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 7, 2, 2, 2,
'{"chart":{"name":"犬类体重","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"体重 KG","titleColor":"#dcefff","metricValueColor":"#67dbff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"体重kg"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬体重'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 3, 7, 2, 2, 2,
'{"chart":{"name":"犬类速度","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"速度 KM/H","titleColor":"#dcefff","metricValueColor":"#4fe6ff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"奔跑速度"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬速度'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 5, 7, 2, 2, 2,
'{"chart":{"name":"犬类嗅觉","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"嗅觉 PTS","titleColor":"#dcefff","metricValueColor":"#8aefff","bgColor":"rgba(7,23,42,0.58)","borderShow":true,"borderColor":"rgba(92,218,255,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"雪山狼犬"},{"field":"指标","value":"嗅觉评分"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬嗅觉'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 18, 3, 5, 3, 2,
'{"chart":{"name":"月影灵猫档案","datasetId":12,"chartType":"text_block","xField":"动物","yField":"简介","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"月影灵猫","titleColor":"#fff2cf","bgColor":"rgba(29,20,12,0.55)","borderShow":true,"borderColor":"rgba(255,202,104,0.3)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(255,182,80,0.14)","shadowBlur":18},"interaction":{"dataFilters":[{"field":"模块","value":"档案卡"},{"field":"动物","value":"月影灵猫"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫档案'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 18, 7, 2, 2, 2,
'{"chart":{"name":"猫类体重","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"体重 KG","titleColor":"#fff1ce","metricValueColor":"#ffd675","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"体重kg"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫体重'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 20, 7, 2, 2, 2,
'{"chart":{"name":"猫类跳跃","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"跳跃 CM","titleColor":"#fff1ce","metricValueColor":"#ffcb6b","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"跳跃高度"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫跳跃'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 22, 7, 2, 2, 2,
'{"chart":{"name":"猫类夜视","datasetId":12,"chartType":"metric_indicator","xField":"指标","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"夜视 PTS","titleColor":"#fff1ce","metricValueColor":"#fff0a1","bgColor":"rgba(29,20,12,0.52)","borderShow":true,"borderColor":"rgba(255,202,104,0.28)","borderWidth":1,"cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"指标"},{"field":"动物","value":"月影灵猫"},{"field":"指标","value":"夜视指数"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫夜视'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 3, 8, 4, 2,
'{"chart":{"name":"生态位占比","datasetId":12,"chartType":"doughnut","xField":"生态位","yField":"数值","groupField":"","sourceMode":"DATASET"},"style":{"theme":"深海荧光","bgColor":"rgba(0,0,0,0)","showLegend":true,"showLabel":true,"legendPos":"bottom"},"interaction":{"dataFilters":[{"field":"模块","value":"生态位占比"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-生态位占比'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 8, 7, 8, 3, 2,
'{"chart":{"name":"感知能力排行","datasetId":12,"chartType":"table_rank","xField":"能力","yField":"得分","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"感知能力排行","titleColor":"#eef8ff","metricValueColor":"#67dbff","bgColor":"rgba(7,23,42,0.08)","cardRadius":16},"interaction":{"dataFilters":[{"field":"模块","value":"感知排行"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-感知能力排行'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 1, 12, 6, 5, 2,
'{"chart":{"name":"雪山狼犬节律","datasetId":12,"chartType":"business_trend","xField":"时段","yField":"活跃指数","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"雪山狼犬节律","titleColor":"#eef8ff","metricValueColor":"#67dbff","bgColor":"rgba(0,0,0,0)"},"interaction":{"dataFilters":[{"field":"模块","value":"活动趋势"},{"field":"动物","value":"雪山狼犬"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-雪山狼犬节律'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 9, 12, 6, 5, 2,
'{"chart":{"name":"动物综合评分","datasetId":12,"chartType":"bar","xField":"动物","yField":"综合值","groupField":"","sourceMode":"DATASET"},"style":{"theme":"海湾晨光","bgColor":"rgba(0,0,0,0)","showLegend":false,"showLabel":true,"showGrid":false,"barRadius":12,"barMaxWidth":28},"interaction":{"dataFilters":[{"field":"模块","value":"综合评分"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-综合评分'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);

INSERT INTO bi_dashboard_component (dashboard_id, chart_id, pos_x, pos_y, width, height, z_index, config_json)
SELECT d.id, c.id, 17, 12, 6, 5, 2,
'{"chart":{"name":"月影灵猫节律","datasetId":12,"chartType":"business_trend","xField":"时段","yField":"活跃指数","groupField":"","sourceMode":"DATASET"},"style":{"showTitle":true,"titleText":"月影灵猫节律","titleColor":"#fff1ce","metricValueColor":"#ffd675","bgColor":"rgba(0,0,0,0)"},"interaction":{"dataFilters":[{"field":"模块","value":"活动趋势"},{"field":"动物","value":"月影灵猫"}]}}'
FROM bi_dashboard d
INNER JOIN bi_chart c ON c.name = '动物信息面板-月影灵猫节律'
WHERE d.name = '动物信息面板'
  AND NOT EXISTS (SELECT 1 FROM bi_dashboard_component dc WHERE dc.dashboard_id = d.id AND dc.chart_id = c.id);