package com.aibi.bi.model.request;

import java.util.ArrayList;
import java.util.List;

public class UpdateRoleMenusRequest {
    private List<Long> menuIds = new ArrayList<>();

    public List<Long> getMenuIds() {
        return menuIds;
    }

    public void setMenuIds(List<Long> menuIds) {
        this.menuIds = menuIds == null ? new ArrayList<>() : menuIds;
    }
}