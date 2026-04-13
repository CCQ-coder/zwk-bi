package com.aibi.bi.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class BiChart {
    private Long id;
    private String name;
    private Long datasetId;
    private String chartType;
    private String xField;
    private String yField;
    private String groupField;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public String getChartType() {
        return chartType;
    }

    public void setChartType(String chartType) {
        this.chartType = chartType;
    }

    @JsonProperty("xField")
    public String getXField() {
        return xField;
    }

    public void setXField(String xField) {
        this.xField = xField;
    }

    @JsonProperty("yField")
    public String getYField() {
        return yField;
    }

    public void setYField(String yField) {
        this.yField = yField;
    }

    public String getGroupField() {
        return groupField;
    }

    public void setGroupField(String groupField) {
        this.groupField = groupField;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
