-- =====================================================================
-- 原有 ETL：从 ai_bi MySQL 同步到 ClickHouse
-- =====================================================================

-- 全量同步订单明细
INSERT INTO ai_bi.bi_order_detail (order_id, product_name, region, amount, biz_date)
SELECT
  CAST(order_id AS UInt64) AS order_id,
  product_name,
  region,
  CAST(amount AS Decimal(18, 2)) AS amount,
  biz_date
FROM mysql('localhost:3306', 'ai_bi', 'dwd_order_detail', 'root', '123456');

-- 生成日级 KPI 指标
INSERT INTO ai_bi.bi_kpi_metrics (biz_date, sales_amount, order_count)
SELECT
  biz_date,
  CAST(SUM(amount) AS Decimal(18, 2)) AS sales_amount,
  COUNT() AS order_count
FROM ai_bi.bi_order_detail
GROUP BY biz_date;

-- =====================================================================
-- 茶饮 ETL：二次加工（DataX 同步完原始表后执行）
-- =====================================================================

-- Step 1: 从原始明细生成日汇总（写入 SummingMergeTree，用于看板聚合）
INSERT INTO ai_bi.tea_order_daily (sale_date, shop, product_line, total_qty, total_amount, order_count)
SELECT
  sale_date,
  shop,
  product_line,
  SUM(qty)             AS total_qty,
  SUM(sale_amount)     AS total_amount,
  COUNT()              AS order_count
FROM ai_bi.tea_order_detail
GROUP BY sale_date, shop, product_line;

-- Step 2: 全局品线销售排名（用于柱状图数据集，在 MySQL 数据集 SQL 中直接查原表即可，此处为 CH 端聚合备份）
-- （此步可选，MySQL 端数据集 SQL 已覆盖，ClickHouse 可用于大数据量加速）
INSERT INTO ai_bi.bi_kpi_metrics (biz_date, sales_amount, order_count)
SELECT
  sale_date              AS biz_date,
  CAST(SUM(sale_amount) AS Decimal(18, 2)) AS sales_amount,
  SUM(order_count)       AS order_count
FROM ai_bi.tea_order_daily
GROUP BY sale_date
SETTINGS deduplicate_blocks_in_dependent_materialized_views = 1;
