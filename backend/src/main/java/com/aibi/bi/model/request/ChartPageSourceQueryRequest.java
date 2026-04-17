package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotNull;

public class ChartPageSourceQueryRequest {

    @NotNull(message = "datasourceId is required")
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