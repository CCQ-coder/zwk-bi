package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.domain.BiAuditLog;
import com.aibi.bi.model.response.AuditLogResponse;
import com.aibi.bi.service.AuditLogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequireRoles("ADMIN")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<List<AuditLogResponse>> list(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String actionPrefix,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(auditLogService.list(username, actionPrefix, limit).stream().map(this::toResponse).toList());
    }

    @GetMapping("/login")
    public ApiResponse<List<AuditLogResponse>> loginLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(auditLogService.listLogin(username, limit).stream().map(this::toResponse).toList());
    }

    private AuditLogResponse toResponse(BiAuditLog log) {
        AuditLogResponse response = new AuditLogResponse();
        response.setId(log.getId());
        response.setUserId(log.getUserId());
        response.setUsername(log.getUsername());
        response.setAction(log.getAction());
        response.setResourceType(log.getResourceType());
        response.setResourceId(log.getResourceId());
        response.setDetail(log.getDetail());
        response.setIpAddr(log.getIpAddr());
        response.setCreatedAt(log.getCreatedAt());
        return response;
    }
}
