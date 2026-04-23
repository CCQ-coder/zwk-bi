package com.aibi.bi.model.request;

import java.util.ArrayList;
import java.util.List;

public class UpdatePublishGroupScreensRequest {
    private List<Long> screenIds = new ArrayList<>();

    public List<Long> getScreenIds() {
        return screenIds;
    }

    public void setScreenIds(List<Long> screenIds) {
        this.screenIds = screenIds == null ? new ArrayList<>() : screenIds;
    }
}