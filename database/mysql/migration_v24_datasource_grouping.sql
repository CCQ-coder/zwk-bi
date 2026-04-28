CREATE TABLE IF NOT EXISTS bi_datasource_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据源分组';

SET @schema_name = DATABASE();

SET @group_id_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'bi_datasource'
    AND COLUMN_NAME = 'group_id'
);

SET @add_group_id_column_sql = IF(
  @group_id_column_exists = 0,
  'ALTER TABLE bi_datasource ADD COLUMN group_id BIGINT DEFAULT NULL COMMENT ''所属分组'' AFTER name',
  'SELECT 1'
);

PREPARE add_group_id_column_stmt FROM @add_group_id_column_sql;
EXECUTE add_group_id_column_stmt;
DEALLOCATE PREPARE add_group_id_column_stmt;

SET @group_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'bi_datasource'
    AND CONSTRAINT_NAME = 'fk_bi_datasource_group'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_group_fk_sql = IF(
  @group_fk_exists = 0,
  'ALTER TABLE bi_datasource ADD CONSTRAINT fk_bi_datasource_group FOREIGN KEY (group_id) REFERENCES bi_datasource_group(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE add_group_fk_stmt FROM @add_group_fk_sql;
EXECUTE add_group_fk_stmt;
DEALLOCATE PREPARE add_group_fk_stmt;