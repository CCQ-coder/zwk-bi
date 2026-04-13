-- Migration V2: chart field config + dashboard layout + model + audit
USE ai_bi;

-- bi_chart: add axis field mapping
ALTER TABLE bi_chart
    ADD COLUMN x_field     VARCHAR(128) NOT NULL DEFAULT '',
    ADD COLUMN y_field     VARCHAR(128) NOT NULL DEFAULT '',
    ADD COLUMN group_field VARCHAR(128) NOT NULL DEFAULT '';

-- bi_dashboard_chart: add position / size
ALTER TABLE bi_dashboard_chart
    ADD COLUMN pos_x      INT NOT NULL DEFAULT 0,
    ADD COLUMN pos_y      INT NOT NULL DEFAULT 0,
    ADD COLUMN width_cols INT NOT NULL DEFAULT 12,
    ADD COLUMN height_px  INT NOT NULL DEFAULT 400;

-- data model table
CREATE TABLE IF NOT EXISTS bi_model (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(128) NOT NULL,
    description VARCHAR(256) NOT NULL DEFAULT '',
    config_json TEXT         NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- audit log table
CREATE TABLE IF NOT EXISTS bi_audit_log (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id       BIGINT,
    username      VARCHAR(64),
    action        VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64),
    resource_id   VARCHAR(64),
    detail        TEXT,
    ip_addr       VARCHAR(64),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user role column
ALTER TABLE bi_user
    ADD COLUMN role  VARCHAR(32) NOT NULL DEFAULT 'ANALYST',
    ADD COLUMN email VARCHAR(128) NOT NULL DEFAULT '';
