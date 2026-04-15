-- V14: Fix demo datasets (idempotent)

-- 1. Conditionally drop FK fk_bi_dataset_datasource if it exists (idempotent via prepared statement)
SET @bi_fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bi_dataset'
      AND CONSTRAINT_NAME = 'fk_bi_dataset_datasource'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @bi_drop_fk_sql = IF(@bi_fk_exists > 0,
    'ALTER TABLE bi_dataset DROP FOREIGN KEY fk_bi_dataset_datasource',
    'SELECT 1');
PREPARE bi_drop_fk_stmt FROM @bi_drop_fk_sql;
EXECUTE bi_drop_fk_stmt;
DEALLOCATE PREPARE bi_drop_fk_stmt;

-- 2. Make datasource_id nullable (idempotent - safe to re-run)
ALTER TABLE bi_dataset MODIFY COLUMN datasource_id BIGINT DEFAULT NULL COMMENT '关联数据源，NULL 表示内置演示数据';

-- 3. Fix any rows inserted with datasource_id=0 (from V13 INSERT IGNORE workaround)
UPDATE bi_dataset SET datasource_id = NULL WHERE datasource_id = 0;

-- 4. Ensure demo folder exists (idempotent)
INSERT INTO bi_dataset_folder (id, name, parent_id, sort_order)
VALUES (1, '演示数据集', NULL, 0)
ON DUPLICATE KEY UPDATE name = name;

-- 5. Insert demo datasets with NULL datasource_id
INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES ('销售额月度趋势（演示）', NULL, 'SELECT * FROM demo_sales_monthly', 1);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES ('各区域销售额（演示）', NULL, 'SELECT * FROM demo_sales_region', 1);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES ('产品类别占比（演示）', NULL, 'SELECT * FROM demo_category_pie', 1);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES ('用户增长趋势（演示）', NULL, 'SELECT * FROM demo_user_growth', 1);
