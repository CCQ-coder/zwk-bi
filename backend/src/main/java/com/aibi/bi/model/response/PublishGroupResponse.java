package com.aibi.bi.model.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PublishGroupResponse {
    private Long id;
    private String name;
    private String description;
    private Integer sort;
    private Boolean visible;
    private Integer screenCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PublishedScreenSummaryResponse> screens = new ArrayList<>();

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getSort() {
        return sort;
    }

    public void setSort(Integer sort) {
        this.sort = sort;
    }

    public Boolean getVisible() {
        return visible;
    }

    public void setVisible(Boolean visible) {
        this.visible = visible;
    }

    public Integer getScreenCount() {
        return screenCount;
    }

    public void setScreenCount(Integer screenCount) {
        this.screenCount = screenCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<PublishedScreenSummaryResponse> getScreens() {
        return screens;
    }

    public void setScreens(List<PublishedScreenSummaryResponse> screens) {
        this.screens = screens == null ? new ArrayList<>() : screens;
    }
}