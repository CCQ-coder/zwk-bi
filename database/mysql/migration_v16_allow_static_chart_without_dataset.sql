-- V16: Allow static screen components to persist as charts without binding a dataset.
-- Data-driven charts still enforce dataset presence in backend service validation.

ALTER TABLE bi_chart
  DROP FOREIGN KEY fk_bi_chart_dataset;

ALTER TABLE bi_chart
  MODIFY COLUMN dataset_id BIGINT NULL COMMENT '数据驱动组件绑定数据集，静态组件可为空';

ALTER TABLE bi_chart
  ADD CONSTRAINT fk_bi_chart_dataset FOREIGN KEY (dataset_id) REFERENCES bi_dataset(id);
