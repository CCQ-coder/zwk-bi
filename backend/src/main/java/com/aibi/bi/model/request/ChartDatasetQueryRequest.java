package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotNull;

public class ChartDatasetQueryRequest {

    @NotNull(message = "datasetId is required")
    private Long datasetId;

    public Long getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(Long datasetId) {
        this.datasetId = datasetId;
    }
}
