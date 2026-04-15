package com.aibi.bi.domain;

import java.time.LocalDateTime;
import java.util.List;

public class BiDatasetFolder {
    private Long id;
    private String name;
    private Long parentId;
    private int sortOrder;
    private LocalDateTime createdAt;
    // 前端树形展示用
    private List<BiDatasetFolder> children;
    private List<BiDataset> datasets;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<BiDatasetFolder> getChildren() { return children; }
    public void setChildren(List<BiDatasetFolder> children) { this.children = children; }
    public List<BiDataset> getDatasets() { return datasets; }
    public void setDatasets(List<BiDataset> datasets) { this.datasets = datasets; }
}
