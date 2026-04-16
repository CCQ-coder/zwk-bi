package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;

public class UpdateChartRequest {

    @NotBlank(message = "name is required")
    private String name;

    private Long datasetId;

    @NotBlank(message = "chartType is required")
    private String chartType;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getDatasetId() {
        return datasetId;
    }

    public void setDatasetId(Long datasetId) {
        this.datasetId = datasetId;
    }

    private String xField = "";
    private String yField = "";
    private String groupField = "";

    public String getChartType() { return chartType; }
    public void setChartType(String chartType) { this.chartType = chartType; }
    public String getXField() { return xField == null ? "" : xField; }
    public void setXField(String xField) { this.xField = xField; }
    public String getYField() { return yField == null ? "" : yField; }
    public void setYField(String yField) { this.yField = yField; }
    public String getGroupField() { return groupField == null ? "" : groupField; }
    public void setGroupField(String groupField) { this.groupField = groupField; }
}
