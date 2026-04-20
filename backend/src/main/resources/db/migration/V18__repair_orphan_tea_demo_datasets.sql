-- V18: repair orphaned tea demo datasets and seed built-in tea demo datasets

INSERT INTO bi_dataset_folder (id, name, parent_id, sort_order)
VALUES (1, '演示数据集', NULL, 0)
ON DUPLICATE KEY UPDATE name = '演示数据集', parent_id = NULL, sort_order = 0;

UPDATE bi_dataset d
LEFT JOIN bi_datasource s ON s.id = d.datasource_id
SET d.datasource_id = NULL,
    d.folder_id = 1
WHERE d.datasource_id IS NOT NULL
  AND s.id IS NULL
  AND d.name IN ('茶饮订单明细', '茶饮店铺日汇总', '茶饮品线销售排名', '茶饮原料费用明细', '茶饮店铺收支对比')
  AND (d.sql_text LIKE '%demo_tea_order%' OR d.sql_text LIKE '%demo_tea_material%');

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '茶饮订单明细', NULL,
       'SELECT `店铺`, `品线`, `菜品名称`, `冷/热`, `规格`, `销售数量`, `单价`, (`销售数量` * `单价`) AS `销售金额`, DATE(`销售日期`) AS `销售日期` FROM `demo_tea_order` ORDER BY `销售日期` DESC',
       1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '茶饮订单明细');

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '茶饮店铺日汇总', NULL,
       'SELECT DATE(`销售日期`) AS `日期`, `店铺`, `品线`, SUM(`销售数量`) AS `销售数量`, SUM(`销售数量` * `单价`) AS `销售金额`, COUNT(DISTINCT `账单流水号`) AS `订单数` FROM `demo_tea_order` GROUP BY DATE(`销售日期`), `店铺`, `品线` ORDER BY `日期` DESC',
       1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '茶饮店铺日汇总');

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '茶饮品线销售排名', NULL,
       'SELECT `品线`, SUM(`销售数量`) AS `销售数量`, SUM(`销售数量` * `单价`) AS `销售金额` FROM `demo_tea_order` GROUP BY `品线` ORDER BY `销售金额` DESC',
       1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '茶饮品线销售排名');

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '茶饮原料费用明细', NULL,
       'SELECT DATE(`日期`) AS `日期`, `店铺`, `用途`, `金额` FROM `demo_tea_material` ORDER BY `日期` DESC',
       1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '茶饮原料费用明细');

INSERT INTO bi_dataset (name, datasource_id, sql_text, folder_id)
SELECT '茶饮店铺收支对比', NULL,
       'SELECT o.`日期`, o.`店铺`, o.`销售金额`, COALESCE(m.`原料费用`, 0) AS `原料费用`, (o.`销售金额` - COALESCE(m.`原料费用`, 0)) AS `毛利` FROM ( SELECT DATE(`销售日期`) AS `日期`, `店铺`, SUM(`销售数量` * `单价`) AS `销售金额` FROM `demo_tea_order` GROUP BY DATE(`销售日期`), `店铺` ) o LEFT JOIN ( SELECT DATE(`日期`) AS `日期`, `店铺`, SUM(`金额`) AS `原料费用` FROM `demo_tea_material` GROUP BY DATE(`日期`), `店铺` ) m ON o.`日期` = m.`日期` AND o.`店铺` = m.`店铺` ORDER BY o.`日期` DESC',
       1
WHERE NOT EXISTS (SELECT 1 FROM bi_dataset WHERE name = '茶饮店铺收支对比');