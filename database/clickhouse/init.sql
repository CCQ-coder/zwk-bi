CREATE DATABASE IF NOT EXISTS ai_bi;

-- 经营看板指标宽表
CREATE TABLE IF NOT EXISTS ai_bi.bi_kpi_metrics (
  biz_date Date,
  sales_amount Decimal(18, 2),
  order_count UInt64,
  sync_time DateTime DEFAULT now()
) ENGINE = MergeTree
ORDER BY biz_date;

-- 订单明细查询表
CREATE TABLE IF NOT EXISTS ai_bi.bi_order_detail (
  order_id UInt64,
  product_name String,
  region String,
  amount Decimal(18, 2),
  biz_date Date,
  sync_time DateTime DEFAULT now()
) ENGINE = MergeTree
ORDER BY (biz_date, order_id);

-- =====================================================
-- 茶饮连锁 BI 分析层（来源: de_dcak56.demo_tea_order）
-- =====================================================

-- 茶饮订单明细宽表
CREATE TABLE IF NOT EXISTS ai_bi.tea_order_detail (
  shop       String         COMMENT '店铺',
  product_line String       COMMENT '品线',
  product_name String       COMMENT '菜品名称',
  hot_cold   String         COMMENT '冷/热',
  spec       String         COMMENT '规格',
  qty        Int64          COMMENT '销售数量',
  unit_price Int64          COMMENT '单价',
  order_no   String         COMMENT '账单流水号',
  sale_date  Date           COMMENT '销售日期',
  sale_amount Int64         COMMENT '销售金额（qty*price）',
  sync_time  DateTime DEFAULT now()
) ENGINE = MergeTree
ORDER BY (sale_date, shop);

-- 茶饮订单日汇总（快速看板查询用）
CREATE TABLE IF NOT EXISTS ai_bi.tea_order_daily (
  sale_date   Date,
  shop        String,
  product_line String,
  total_qty   Int64,
  total_amount Int64,
  order_count Int64,
  sync_time   DateTime DEFAULT now()
) ENGINE = SummingMergeTree(total_qty, total_amount, order_count)
ORDER BY (sale_date, shop, product_line);

-- 茶饮原料费用明细（来源: de_dcak56.demo_tea_material）
CREATE TABLE IF NOT EXISTS ai_bi.tea_material_cost (
  cost_date  Date           COMMENT '费用日期',
  shop       String         COMMENT '店铺',
  cost_type  String         COMMENT '用途',
  amount     Int64          COMMENT '金额',
  sync_time  DateTime DEFAULT now()
) ENGINE = MergeTree
ORDER BY (cost_date, shop);

-- 店铺毛利汇总（订单收入 - 原料成本，按日+店维度）
CREATE VIEW IF NOT EXISTS ai_bi.v_shop_profit AS
SELECT
  o.sale_date,
  o.shop,
  o.total_amount   AS revenue,
  coalesce(m.total_cost, 0) AS material_cost,
  (o.total_amount - coalesce(m.total_cost, 0)) AS gross_profit
FROM (
  SELECT sale_date, shop, sum(total_amount) AS total_amount
  FROM ai_bi.tea_order_daily
  GROUP BY sale_date, shop
) o
LEFT JOIN (
  SELECT cost_date AS sale_date, shop, sum(amount) AS total_cost
  FROM ai_bi.tea_material_cost
  GROUP BY cost_date, shop
) m ON o.sale_date = m.sale_date AND o.shop = m.shop;
