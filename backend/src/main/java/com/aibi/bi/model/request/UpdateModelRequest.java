package com.aibi.bi.model.request;

import jakarta.validation.constraints.NotBlank;

public class UpdateModelRequest {
    @NotBlank(message = "name is required")
    private String name;
    private String description = "";
    private String configJson = "{}";

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description == null ? "" : description; }
    public void setDescription(String description) { this.description = description; }
    public String getConfigJson() { return configJson == null ? "{}" : configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }
}
