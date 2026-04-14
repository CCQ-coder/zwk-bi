package com.aibi.bi.domain;

import java.time.LocalDateTime;

public class SysRole {
    private Long id;
    private String name;
    private Long userCount;
    private Long menuCount;
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

    public Long getUserCount() {
        return userCount;
    }

    public void setUserCount(Long userCount) {
        this.userCount = userCount;
    }

    public Long getMenuCount() {
        return menuCount;
    }

    public void setMenuCount(Long menuCount) {
        this.menuCount = menuCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}