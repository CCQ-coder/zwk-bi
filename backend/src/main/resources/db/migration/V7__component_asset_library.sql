SET @has_template_description := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart_template'
    AND column_name = 'description'
);
SET @add_template_description_sql := IF(
  @has_template_description = 0,
  "ALTER TABLE bi_chart_template ADD COLUMN description VARCHAR(255) NOT NULL DEFAULT '' AFTER name",
  "SELECT 1"
);
PREPARE add_template_description_stmt FROM @add_template_description_sql;
EXECUTE add_template_description_stmt;
DEALLOCATE PREPARE add_template_description_stmt;

SET @has_template_built_in := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart_template'
    AND column_name = 'built_in'
);
SET @add_template_built_in_sql := IF(
  @has_template_built_in = 0,
  "ALTER TABLE bi_chart_template ADD COLUMN built_in TINYINT(1) NOT NULL DEFAULT 0 AFTER config_json",
  "SELECT 1"
);
PREPARE add_template_built_in_stmt FROM @add_template_built_in_sql;
EXECUTE add_template_built_in_stmt;
DEALLOCATE PREPARE add_template_built_in_stmt;

SET @has_template_sort_order := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart_template'
    AND column_name = 'sort_order'
);
SET @add_template_sort_order_sql := IF(
  @has_template_sort_order = 0,
  "ALTER TABLE bi_chart_template ADD COLUMN sort_order INT NOT NULL DEFAULT 1000 AFTER built_in",
  "SELECT 1"
);
PREPARE add_template_sort_order_stmt FROM @add_template_sort_order_sql;
EXECUTE add_template_sort_order_stmt;
DEALLOCATE PREPARE add_template_sort_order_stmt;

SET @has_template_created_by := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'bi_chart_template'
    AND column_name = 'created_by'
);
SET @add_template_created_by_sql := IF(
  @has_template_created_by = 0,
  "ALTER TABLE bi_chart_template ADD COLUMN created_by VARCHAR(64) NOT NULL DEFAULT 'system' AFTER sort_order",
  "SELECT 1"
);
PREPARE add_template_created_by_stmt FROM @add_template_created_by_sql;
EXECUTE add_template_created_by_stmt;
DEALLOCATE PREPARE add_template_created_by_stmt;

UPDATE bi_chart_template
SET description = ''
WHERE description IS NULL;

UPDATE bi_chart_template
SET built_in = 0
WHERE built_in IS NULL;

UPDATE bi_chart_template
SET sort_order = 1000
WHERE sort_order IS NULL OR sort_order = 0;

UPDATE bi_chart_template
SET created_by = 'system'
WHERE created_by IS NULL OR TRIM(created_by) = '';