package com.aibi.bi.service;

import com.aibi.bi.domain.BiDashboard;
import com.aibi.bi.domain.BiPublishGroup;
import com.aibi.bi.domain.BiPublishGroupAssignment;
import com.aibi.bi.mapper.BiDashboardMapper;
import com.aibi.bi.mapper.BiPublishGroupAssignmentMapper;
import com.aibi.bi.mapper.BiPublishGroupMapper;
import com.aibi.bi.model.request.SavePublishGroupRequest;
import com.aibi.bi.model.request.UpdatePublishGroupScreensRequest;
import com.aibi.bi.model.response.PublishGroupResponse;
import com.aibi.bi.model.response.PublishedScreenSummaryResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class PublishPlatformServiceImpl implements PublishPlatformService {

    private final BiPublishGroupMapper groupMapper;
    private final BiPublishGroupAssignmentMapper assignmentMapper;
    private final BiDashboardMapper dashboardMapper;
    private final ObjectMapper objectMapper;

    public PublishPlatformServiceImpl(BiPublishGroupMapper groupMapper,
                                      BiPublishGroupAssignmentMapper assignmentMapper,
                                      BiDashboardMapper dashboardMapper,
                                      ObjectMapper objectMapper) {
        this.groupMapper = groupMapper;
        this.assignmentMapper = assignmentMapper;
        this.dashboardMapper = dashboardMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<PublishGroupResponse> listManageGroups() {
        return assembleGroups(false);
    }

    @Override
    public List<PublishGroupResponse> listDisplayGroups() {
        return assembleGroups(true);
    }

    @Override
    public List<PublishedScreenSummaryResponse> listPublishedScreenOptions() {
        Map<Long, String> groupNameMap = groupMapper.listAll().stream()
                .collect(Collectors.toMap(BiPublishGroup::getId, BiPublishGroup::getName, (left, right) -> right, LinkedHashMap::new));
        return loadPublishedScreens(groupNameMap);
    }

    @Override
    public PublishGroupResponse createGroup(SavePublishGroupRequest request) {
        BiPublishGroup group = normalizeGroup(request, null);
        validateGroup(group, null);
        groupMapper.insert(group);
        return findManageGroup(group.getId());
    }

    @Override
    public PublishGroupResponse updateGroup(Long id, SavePublishGroupRequest request) {
        BiPublishGroup existing = requireGroup(id);
        BiPublishGroup target = normalizeGroup(request, existing);
        target.setId(id);
        validateGroup(target, id);
        groupMapper.update(target);
        return findManageGroup(id);
    }

    @Override
    public PublishGroupResponse updateGroupScreens(Long id, UpdatePublishGroupScreensRequest request) {
        requireGroup(id);
        List<Long> screenIds = normalizeScreenIds(request == null ? List.of() : request.getScreenIds());
        Set<Long> publishedScreenIds = listPublishedScreenOptions().stream()
                .map(PublishedScreenSummaryResponse::getId)
                .collect(Collectors.toSet());

        List<Long> invalidScreenIds = screenIds.stream()
                .filter(screenId -> !publishedScreenIds.contains(screenId))
                .toList();
        if (!invalidScreenIds.isEmpty()) {
            throw new IllegalArgumentException("存在未发布或不存在的大屏: " + invalidScreenIds);
        }

        assignmentMapper.deleteByGroupId(id);
        if (!screenIds.isEmpty()) {
            assignmentMapper.deleteByDashboardIds(screenIds);
            assignmentMapper.insertBatch(id, screenIds);
        }
        return findManageGroup(id);
    }

    @Override
    public void deleteGroup(Long id) {
        requireGroup(id);
        assignmentMapper.deleteByGroupId(id);
        groupMapper.deleteById(id);
    }

    private List<PublishGroupResponse> assembleGroups(boolean visibleOnly) {
        List<BiPublishGroup> groups = visibleOnly ? groupMapper.listVisible() : groupMapper.listAll();
        Map<Long, PublishGroupResponse> groupResponseMap = new LinkedHashMap<>();
        for (BiPublishGroup group : groups) {
            PublishGroupResponse response = new PublishGroupResponse();
            response.setId(group.getId());
            response.setName(group.getName());
            response.setDescription(group.getDescription());
            response.setSort(group.getSort());
            response.setVisible(group.getVisible());
            response.setCreatedAt(group.getCreatedAt());
            response.setUpdatedAt(group.getUpdatedAt());
            response.setScreens(new ArrayList<>());
            response.setScreenCount(0);
            groupResponseMap.put(group.getId(), response);
        }
        if (groupResponseMap.isEmpty()) {
            return List.of();
        }

        Map<Long, String> groupNameMap = groups.stream()
                .collect(Collectors.toMap(BiPublishGroup::getId, BiPublishGroup::getName, (left, right) -> right, LinkedHashMap::new));
        for (PublishedScreenSummaryResponse screen : loadPublishedScreens(groupNameMap)) {
            Long groupId = screen.getGroupId();
            if (groupId == null) {
                continue;
            }
            PublishGroupResponse group = groupResponseMap.get(groupId);
            if (group == null) {
                continue;
            }
            group.getScreens().add(screen);
        }

        List<PublishGroupResponse> responses = new ArrayList<>(groupResponseMap.values());
        for (PublishGroupResponse response : responses) {
            response.getScreens().sort((left, right) -> left.getName().compareToIgnoreCase(right.getName()));
            response.setScreenCount(response.getScreens().size());
        }
        if (!visibleOnly) {
            return responses;
        }
        return responses.stream()
                .filter(response -> !response.getScreens().isEmpty())
                .toList();
    }

    private List<PublishedScreenSummaryResponse> loadPublishedScreens(Map<Long, String> groupNameMap) {
        Map<Long, Long> assignmentMap = assignmentMapper.listAll().stream()
                .collect(Collectors.toMap(BiPublishGroupAssignment::getDashboardId, BiPublishGroupAssignment::getGroupId, (left, right) -> right, LinkedHashMap::new));

        List<PublishedScreenSummaryResponse> screens = new ArrayList<>();
        for (BiDashboard dashboard : dashboardMapper.listAll()) {
            JsonNode config = parseConfig(dashboard.getConfigJson());
            if (!"screen".equalsIgnoreCase(config.path("scene").asText("dashboard"))) {
                continue;
            }
            JsonNode publish = config.path("publish");
            if (!"PUBLISHED".equalsIgnoreCase(publish.path("status").asText("DRAFT"))) {
                continue;
            }

            PublishedScreenSummaryResponse response = new PublishedScreenSummaryResponse();
            response.setId(dashboard.getId());
            response.setName(dashboard.getName());
            response.setCoverUrl(config.path("cover").path("url").asText(""));
            response.setShareToken(publish.path("shareToken").asText(""));
            response.setPublishedAt(normalizeNullableText(publish.path("publishedAt").asText("")));
            response.setCreatedAt(dashboard.getCreatedAt());
            Long groupId = assignmentMap.get(dashboard.getId());
            response.setGroupId(groupId);
            response.setGroupName(groupId == null ? "" : groupNameMap.getOrDefault(groupId, ""));
            screens.add(response);
        }

        screens.sort((left, right) -> left.getName().compareToIgnoreCase(right.getName()));
        return screens;
    }

    private PublishGroupResponse findManageGroup(Long id) {
        return listManageGroups().stream()
                .filter(group -> Objects.equals(group.getId(), id))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("发布分组不存在: " + id));
    }

    private BiPublishGroup requireGroup(Long id) {
        BiPublishGroup group = groupMapper.findById(id);
        if (group == null) {
            throw new IllegalArgumentException("发布分组不存在: " + id);
        }
        return group;
    }

    private BiPublishGroup normalizeGroup(SavePublishGroupRequest request, BiPublishGroup base) {
        BiPublishGroup target = base == null ? new BiPublishGroup() : base;
        target.setName(normalizeRequiredText(request == null ? null : request.getName(), "分组名称不能为空"));
        target.setDescription(normalizeText(request == null ? null : request.getDescription()));
        target.setSort(request != null && request.getSort() != null ? Math.max(1, request.getSort()) : 100);
        target.setVisible(request == null || request.getVisible() == null ? Boolean.TRUE : request.getVisible());
        return target;
    }

    private void validateGroup(BiPublishGroup group, Long excludeId) {
        if (groupMapper.countByName(group.getName(), excludeId) > 0) {
            throw new IllegalArgumentException("分组名称已存在: " + group.getName());
        }
    }

    private List<Long> normalizeScreenIds(List<Long> screenIds) {
        if (screenIds == null || screenIds.isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(new TreeSet<>(screenIds.stream()
                .filter(Objects::nonNull)
                .filter(id -> id > 0)
                .toList()));
    }

    private JsonNode parseConfig(String configJson) {
        try {
            return objectMapper.readTree(StringUtils.hasText(configJson) ? configJson : "{}");
        } catch (Exception ex) {
            return objectMapper.createObjectNode();
        }
    }

    private String normalizeRequiredText(String text, String errorMessage) {
        String normalized = normalizeText(text);
        if (!StringUtils.hasText(normalized)) {
            throw new IllegalArgumentException(errorMessage);
        }
        return normalized;
    }

    private String normalizeText(String text) {
        return text == null ? "" : text.trim();
    }

    private String normalizeNullableText(String text) {
        String normalized = normalizeText(text);
        return StringUtils.hasText(normalized) ? normalized : null;
    }
}