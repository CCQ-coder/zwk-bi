package com.aibi.bi.model.request;

public class ChartPageSourceQueryRequest {

    // Nullable — inline JSON runtime config can be previewed without datasource.
    private Long datasourceId;

    private String sqlText;

    private String runtimeConfigText;

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

    public String getRuntimeConfigText() {
        return runtimeConfigText;
    }

    public void setRuntimeConfigText(String runtimeConfigText) {
        this.runtimeConfigText = runtimeConfigText;
    }
}