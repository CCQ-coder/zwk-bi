package com.aibi.bi.controller;

import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.model.request.SavePublishGroupRequest;
import com.aibi.bi.model.request.UpdatePublishGroupScreensRequest;
import com.aibi.bi.model.response.PublishGroupResponse;
import com.aibi.bi.model.response.PublishedScreenSummaryResponse;
import com.aibi.bi.service.PublishPlatformService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/publish")
public class PublishPlatformController {

    private final PublishPlatformService publishPlatformService;

    public PublishPlatformController(PublishPlatformService publishPlatformService) {
        this.publishPlatformService = publishPlatformService;
    }

    @GetMapping("/groups/manage")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<List<PublishGroupResponse>> listManageGroups() {
        return ApiResponse.ok(publishPlatformService.listManageGroups());
    }

    @GetMapping("/groups/display")
    public ApiResponse<List<PublishGroupResponse>> listDisplayGroups() {
        return ApiResponse.ok(publishPlatformService.listDisplayGroups());
    }

    @GetMapping("/screens/options")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<List<PublishedScreenSummaryResponse>> listPublishedScreenOptions() {
        return ApiResponse.ok(publishPlatformService.listPublishedScreenOptions());
    }

    @PostMapping("/groups")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<PublishGroupResponse> createGroup(@RequestBody SavePublishGroupRequest request) {
        return ApiResponse.ok(publishPlatformService.createGroup(request));
    }

    @PutMapping("/groups/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<PublishGroupResponse> updateGroup(@PathVariable Long id,
                                                         @RequestBody SavePublishGroupRequest request) {
        return ApiResponse.ok(publishPlatformService.updateGroup(id, request));
    }

    @PutMapping("/groups/{id}/screens")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<PublishGroupResponse> updateGroupScreens(@PathVariable Long id,
                                                                @RequestBody UpdatePublishGroupScreensRequest request) {
        return ApiResponse.ok(publishPlatformService.updateGroupScreens(id, request));
    }

    @DeleteMapping("/groups/{id}")
    @RequireRoles({"ADMIN", "ANALYST"})
    public ApiResponse<Void> deleteGroup(@PathVariable Long id) {
        publishPlatformService.deleteGroup(id);
        return ApiResponse.ok(null);
    }
}