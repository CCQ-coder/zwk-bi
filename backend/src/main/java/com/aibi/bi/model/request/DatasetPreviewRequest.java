package com.aibi.bi.model.request;

public class DatasetPreviewRequest {

    // Nullable — null means "demo dataset" (no real datasource)
    private Long datasourceId;

    private String sqlText;

    public Long getDatasourceId() {
        return datasourceId;
    }

    public void setDatasourceId(Long datasourceId) {
        this.datasourceId = datasourceId;
    }

    public String getSqlText() {
        return sqlText;
    }

    public void setSqlText(String sqlText) {
        this.sqlText = sqlText;
    }
}