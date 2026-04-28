package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class UpdateDatasetRequest {

    @NotBlank(message = "name is required")
    private String name;

    // Nullable — null means "demo dataset" (no real datasource)
    private Long datasourceId;

    private String sqlText;

    private Long folderId;

    private List<String> filterFieldNames;

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

    public Long getFolderId() {
        return folderId;
    }

    public void setFolderId(Long folderId) {
        this.folderId = folderId;
    }

    public List<String> getFilterFieldNames() {
        return filterFieldNames;
    }

    public void setFilterFieldNames(List<String> filterFieldNames) {
        this.filterFieldNames = filterFieldNames;
    }
}
