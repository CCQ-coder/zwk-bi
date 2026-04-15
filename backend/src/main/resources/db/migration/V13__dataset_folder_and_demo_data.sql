-- V13: 数据集文件夹 + 演示数据集

-- 1. 数据集文件夹表
CREATE TABLE IF NOT EXISTS bi_dataset_folder (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT DEFAULT NULL COMMENT 'NULL=根目录',
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_folder_parent FOREIGN KEY (parent_id) REFERENCES bi_dataset_folder(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据集文件夹';

-- 2. 给 bi_dataset 增加 folder_id 列（兼容 MySQL 5.7，不使用 IF NOT EXISTS）
SET @v13_col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'bi_dataset'
      AND COLUMN_NAME  = 'folder_id'
);
SET @v13_add_col = IF(@v13_col_exists = 0,
    'ALTER TABLE bi_dataset ADD COLUMN folder_id BIGINT DEFAULT NULL COMMENT \'所属文件夹\'',
    'SELECT 1');
PREPARE v13_add_col_stmt FROM @v13_add_col;
EXECUTE v13_add_col_stmt;
DEALLOCATE PREPARE v13_add_col_stmt;

-- 3. 插入演示文件夹
INSERT INTO bi_dataset_folder (id, name, parent_id, sort_order)
VALUES (1, '演示数据集', NULL, 0)
ON DUPLICATE KEY UPDATE name = name;

-- 4. 插入演示用数据集（使用内置 demo 结构，无需真实数据源，以数据源 id=0 标记为 demo）
-- 销售演示数据
INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES (
  '销售额月度趋势（演示）',
  0,
  'SELECT * FROM demo_sales_monthly',
  1
);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES (
  '各区域销售额（演示）',
  0,
  'SELECT * FROM demo_sales_region',
  1
);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES (
  '产品类别占比（演示）',
  0,
  'SELECT * FROM demo_category_pie',
  1
);

INSERT IGNORE INTO bi_dataset (name, datasource_id, sql_text, folder_id)
VALUES (
  '用户增长趋势（演示）',
  0,
  'SELECT * FROM demo_user_growth',
  1
);
