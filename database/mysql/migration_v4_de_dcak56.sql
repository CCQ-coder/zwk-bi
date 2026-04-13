-- Migration V4: 注册 de_dcak56 数据源并预置茶饮演示数据集
-- 执行前提: 已执行 init.sql + migration_v2.sql + migration_v3.sql
-- de_dcak56 数据库主机信息请根据实际环境修改 host/port/用户名/密码
USE ai_bi;

-- ─── 1. 注册 de_dcak56 为外部数据源 ───────────────────────────────────────────
INSERT IGNORE INTO bi_datasource (name, datasource_type, connect_mode, host, port, database_name, db_username, db_password)
VALUES (
  'DataEase 演示库 (de_dcak56)',
  'MYSQL',
  'DIRECT',
  '192.168.3.136',   -- 根据实际地址修改
  3201,
  'de_dcak56',
  'root',            -- 根据实际账号修改
  '123456'           -- 根据实际密码修改
);

-- 获取刚插入的 datasource id（使用变量）
SET @de_ds_id = LAST_INSERT_ID();

-- ─── 2. 预置茶饮订单常用数据集 SQL ────────────────────────────────────────────
INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text)
VALUES
(
  '茶饮订单明细',
  @de_ds_id,
  'SELECT `店铺`, `品线`, `菜品名称`, `冷/热`, `规格`, `销售数量`, `单价`,
          (`销售数量` * `单价`) AS `销售金额`,
          DATE(`销售日期`) AS `销售日期`
   FROM `demo_tea_order`
   ORDER BY `销售日期` DESC'
),
(
  '茶饮店铺日汇总',
  @de_ds_id,
  'SELECT DATE(`销售日期`) AS `日期`,
          `店铺`,
          `品线`,
          SUM(`销售数量`) AS `销售数量`,
          SUM(`销售数量` * `单价`) AS `销售金额`,
          COUNT(DISTINCT `账单流水号`) AS `订单数`
   FROM `demo_tea_order`
   GROUP BY DATE(`销售日期`), `店铺`, `品线`
   ORDER BY `日期` DESC'
),
(
  '茶饮品线销售排名',
  @de_ds_id,
  'SELECT `品线`,
          SUM(`销售数量`) AS `销售数量`,
          SUM(`销售数量` * `单价`) AS `销售金额`
   FROM `demo_tea_order`
   GROUP BY `品线`
   ORDER BY `销售金额` DESC'
),
(
  '茶饮原料费用明细',
  @de_ds_id,
  'SELECT DATE(`日期`) AS `日期`, `店铺`, `用途`, `金额`
   FROM `demo_tea_material`
   ORDER BY `日期` DESC'
),
(
  '茶饮店铺收支对比',
  @de_ds_id,
  'SELECT o.`日期`, o.`店铺`,
          o.`销售金额`, COALESCE(m.`原料费用`, 0) AS `原料费用`,
          (o.`销售金额` - COALESCE(m.`原料费用`, 0)) AS `毛利`
   FROM (
     SELECT DATE(`销售日期`) AS `日期`, `店铺`,
            SUM(`销售数量` * `单价`) AS `销售金额`
     FROM `demo_tea_order`
     GROUP BY DATE(`销售日期`), `店铺`
   ) o
   LEFT JOIN (
     SELECT DATE(`日期`) AS `日期`, `店铺`,
            SUM(`金额`) AS `原料费用`
     FROM `demo_tea_material`
     GROUP BY DATE(`日期`), `店铺`
   ) m ON o.`日期` = m.`日期` AND o.`店铺` = m.`店铺`
   ORDER BY o.`日期` DESC'
);
