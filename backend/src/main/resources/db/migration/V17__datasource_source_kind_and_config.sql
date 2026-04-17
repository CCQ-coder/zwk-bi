ALTER TABLE bi_datasource
    ADD COLUMN source_kind VARCHAR(32) NOT NULL DEFAULT 'DATABASE' AFTER name,
    ADD COLUMN config_json TEXT NULL AFTER db_password;

UPDATE bi_datasource
SET source_kind = 'DATABASE'
WHERE source_kind IS NULL OR source_kind = '';

UPDATE bi_datasource
SET config_json = '{}'
WHERE config_json IS NULL;