UPDATE bi_chart
SET dataset_id = NULL,
    x_field = '',
    y_field = '',
    group_field = ''
WHERE chart_type = 'text_block'
  AND name IN ('动物信息面板-雪山狼犬档案', '动物信息面板-月影灵猫档案');

UPDATE bi_dashboard_component dc
INNER JOIN bi_dashboard d ON d.id = dc.dashboard_id
INNER JOIN bi_chart c ON c.id = dc.chart_id
SET dc.config_json = '{"chart":{"name":"雪山狼犬档案","chartType":"text_block"},"style":{"showTitle":true,"titleText":"雪山狼犬","textContent":"高寒巡护型犬种，耐力和嗅觉表现突出，适合山地搜救、夜间巡视与长距离追踪。","titleColor":"#eef8ff","bgColor":"rgba(7,23,42,0.62)","borderShow":true,"borderColor":"rgba(92,218,255,0.32)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(0,169,255,0.18)","shadowBlur":18},"interaction":{"dataFilters":[]}}'
WHERE d.name = '动物信息面板'
  AND c.name = '动物信息面板-雪山狼犬档案';

UPDATE bi_dashboard_component dc
INNER JOIN bi_dashboard d ON d.id = dc.dashboard_id
INNER JOIN bi_chart c ON c.id = dc.chart_id
SET dc.config_json = '{"chart":{"name":"月影灵猫档案","chartType":"text_block"},"style":{"showTitle":true,"titleText":"月影灵猫","textContent":"夜行潜伏型猫科样本，跃迁能力和夜视能力极强，擅长狭窄环境侦察与静默接近。","titleColor":"#fff2cf","bgColor":"rgba(29,20,12,0.55)","borderShow":true,"borderColor":"rgba(255,202,104,0.3)","borderWidth":1,"cardRadius":18,"shadowShow":true,"shadowColor":"rgba(255,182,80,0.14)","shadowBlur":18},"interaction":{"dataFilters":[]}}'
WHERE d.name = '动物信息面板'
  AND c.name = '动物信息面板-月影灵猫档案';