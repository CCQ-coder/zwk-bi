package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.domain.BiAuditLog;
import com.aibi.bi.service.AuditLogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ApiResponse<List<BiAuditLog>> list(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String actionPrefix,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(auditLogService.list(username, actionPrefix, limit));
    }

    @GetMapping("/login")
    public ApiResponse<List<BiAuditLog>> loginLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(auditLogService.listLogin(username, limit));
    }
}
