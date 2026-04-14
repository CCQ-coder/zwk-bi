-- V11: 新增图表类型的默认组件模板（面积图、堆叠折线、堆叠柱状、百分比柱状、分组柱状、堆叠条形、玫瑰图、矩形树图）

INSERT IGNORE INTO bi_chart_template(name, description, chart_type, config_json, built_in, sort_order, created_by)
VALUES
('面积趋势卡', '面积图，适合展示时间趋势与累积量，视觉感更强。', 'area',
 '{"chart":{"name":"面积趋势卡","datasetId":1,"chartType":"area","xField":"biz_date","yField":"amount","groupField":""},"style":{"theme":"海湾晨光","bgColor":"#f6fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":true,"areaFill":true,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":560,"height":320}}',
 1, 15, 'system'),

('堆叠折线卡', '多系列堆叠折线图，适合展示累积趋势对比。', 'line_stack',
 '{"chart":{"name":"堆叠折线卡","datasetId":1,"chartType":"line_stack","xField":"biz_date","yField":"amount","groupField":""},"style":{"theme":"深海荧光","bgColor":"#f4fbff","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":560,"height":320}}',
 1, 25, 'system'),

('堆叠柱状卡', '多系列堆叠柱状图，适合展示各类别整体与部分关系。', 'bar_stack',
 '{"chart":{"name":"堆叠柱状卡","datasetId":1,"chartType":"bar_stack","xField":"biz_date","yField":"amount","groupField":""},"style":{"theme":"琥珀橙金","bgColor":"#fffaf3","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":6,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}',
 1, 22, 'system'),

('百分比柱状卡', '百分比堆叠柱状图，适合展示结构占比随时间的变化。', 'bar_percent',
 '{"chart":{"name":"百分比柱状卡","datasetId":1,"chartType":"bar_percent","xField":"biz_date","yField":"amount","groupField":""},"style":{"theme":"霓光星砂","bgColor":"#fff9fb","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":6,"barMaxWidth":36,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}',
 1, 23, 'system'),

('分组对比卡', '分组柱状图，适合同维度下多系列并排对比。', 'bar_group',
 '{"chart":{"name":"分组对比卡","datasetId":2,"chartType":"bar_group","xField":"region","yField":"amount","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f5fcf8","showLabel":false,"labelSize":12,"showXName":false,"showYName":false,"showGrid":true,"smooth":false,"areaFill":false,"barRadius":6,"barMaxWidth":30,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":320}}',
 1, 24, 'system'),

('堆叠条形卡', '水平堆叠条形图，适合多系列长名称类别累积对比。', 'bar_horizontal_stack',
 '{"chart":{"name":"堆叠条形卡","datasetId":2,"chartType":"bar_horizontal_stack","xField":"region","yField":"amount","groupField":""},"style":{"theme":"暮光珊瑚","bgColor":"#fff8f5","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":28,"legendPos":"top"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":520,"height":340}}',
 1, 35, 'system'),

('玫瑰占比卡', '南丁格尔玫瑰图，扇形半径表示数据大小，适合多维度占比分析。', 'rose',
 '{"chart":{"name":"玫瑰占比卡","datasetId":2,"chartType":"rose","xField":"region","yField":"amount","groupField":""},"style":{"theme":"霓光星砂","bgColor":"#fff9fb","showLabel":true,"labelSize":12,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"right"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":420,"height":320}}',
 1, 45, 'system'),

('层级树图卡', '矩形树图，使用面积表示数据大小，适合层级结构和占比对比。', 'treemap',
 '{"chart":{"name":"层级树图卡","datasetId":2,"chartType":"treemap","xField":"region","yField":"amount","groupField":""},"style":{"theme":"山岚青绿","bgColor":"#f5fcf8","showLabel":true,"labelSize":13,"showXName":false,"showYName":false,"showGrid":false,"smooth":false,"areaFill":false,"barRadius":8,"barMaxWidth":36,"legendPos":"bottom"},"interaction":{"clickAction":"filter","enableClickLinkage":true,"allowManualFilters":true,"linkageFieldMode":"auto","linkageField":""},"layout":{"width":480,"height":360}}',
 1, 95, 'system');
