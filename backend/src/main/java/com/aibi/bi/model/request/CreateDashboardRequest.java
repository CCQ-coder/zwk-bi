package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;

public class CreateDashboardRequest {

    @NotBlank(message = "仪表板名称不能为空")
    private String name;

    private String configJson;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }
}