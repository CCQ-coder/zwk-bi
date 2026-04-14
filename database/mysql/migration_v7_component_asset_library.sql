ALTER TABLE bi_chart_template
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NOT NULL DEFAULT '' AFTER name,
  ADD COLUMN IF NOT EXISTS built_in TINYINT(1) NOT NULL DEFAULT 0 AFTER config_json,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 1000 AFTER built_in,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(64) NOT NULL DEFAULT 'system' AFTER sort_order;

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