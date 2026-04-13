package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateDatasetRequest {

    @NotBlank(message = "name is required")
    private String name;

    @NotNull(message = "datasourceId is required")
    private Long datasourceId;

    @NotBlank(message = "sqlText is required")
    private String sqlText;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

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
