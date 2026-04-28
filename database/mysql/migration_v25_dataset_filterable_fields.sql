USE ai_bi;

SET @has_dataset_field_filterable := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_dataset_field'
    AND column_name = 'is_filterable'
);

SET @add_dataset_field_filterable_sql := IF(
  @has_dataset_field_filterable = 0,
  'ALTER TABLE bi_dataset_field ADD COLUMN is_filterable TINYINT(1) NOT NULL DEFAULT 0 AFTER field_label',
  'SELECT 1'
);

PREPARE add_dataset_field_filterable_stmt FROM @add_dataset_field_filterable_sql;
EXECUTE add_dataset_field_filterable_stmt;
DEALLOCATE PREPARE add_dataset_field_filterable_stmt;