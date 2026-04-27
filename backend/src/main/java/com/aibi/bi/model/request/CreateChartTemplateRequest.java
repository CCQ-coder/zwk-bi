package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;

public class CreateChartTemplateRequest {

    @NotBlank(message = "模板名称不能为空")
    private String name;

    private String description;

    @NotBlank(message = "图表类型不能为空")
    private String chartType;

    private String configJson;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getChartType() {
        return chartType;
    }

    public void setChartType(String chartType) {
        this.chartType = chartType;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }
}