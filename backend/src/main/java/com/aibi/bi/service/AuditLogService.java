package com.aibi.bi.service;

import com.aibi.bi.domain.BiAuditLog;

import java.util.List;

public interface AuditLogService {

    List<BiAuditLog> list();

    List<BiAuditLog> list(String username, String actionPrefix, Integer limit);

    List<BiAuditLog> listLogin(String username, Integer limit);

    void record(Long userId, String username, String action,
                String resourceType, String resourceId,
                String detail, String ipAddr);
}
