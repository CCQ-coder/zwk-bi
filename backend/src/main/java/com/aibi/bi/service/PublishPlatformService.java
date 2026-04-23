package com.aibi.bi.service;

import com.aibi.bi.model.request.SavePublishGroupRequest;
import com.aibi.bi.model.request.UpdatePublishGroupScreensRequest;
import com.aibi.bi.model.response.PublishGroupResponse;
import com.aibi.bi.model.response.PublishedScreenSummaryResponse;

import java.util.List;

public interface PublishPlatformService {
    List<PublishGroupResponse> listManageGroups();

    List<PublishGroupResponse> listDisplayGroups();

    List<PublishedScreenSummaryResponse> listPublishedScreenOptions();

    PublishGroupResponse createGroup(SavePublishGroupRequest request);

    PublishGroupResponse updateGroup(Long id, SavePublishGroupRequest request);

    PublishGroupResponse updateGroupScreens(Long id, UpdatePublishGroupScreensRequest request);

    void deleteGroup(Long id);
}