-- Migration V3: user management constraints and defaults
USE ai_bi;

ALTER TABLE bi_user
    ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
    ADD COLUMN IF NOT EXISTS email VARCHAR(128) NOT NULL DEFAULT '';

ALTER TABLE bi_user
    MODIFY COLUMN username VARCHAR(64) NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_bi_user_username ON bi_user(username);
