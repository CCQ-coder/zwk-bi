package com.aibi.bi.model.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class UpdateDashboardComponentRequest {

    private Long chartId;

    private Integer posX;

    private Integer posY;

    private Integer width;

    private Integer height;

    private Integer zIndex;

    private String configJson;

    public Long getChartId() {
        return chartId;
    }

    public void setChartId(Long chartId) {
        this.chartId = chartId;
    }

    public Integer getPosX() {
        return posX;
    }

    public void setPosX(Integer posX) {
        this.posX = posX;
    }

    public Integer getPosY() {
        return posY;
    }

    public void setPosY(Integer posY) {
        this.posY = posY;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    @JsonProperty("zIndex")
    public Integer getZIndex() {
        return zIndex;
    }

    @JsonProperty("zIndex")
    @JsonAlias("zindex")
    public void setZIndex(Integer zIndex) {
        this.zIndex = zIndex;
    }

    public String getConfigJson() {
        return configJson;
    }

    public void setConfigJson(String configJson) {
        this.configJson = configJson;
    }
}