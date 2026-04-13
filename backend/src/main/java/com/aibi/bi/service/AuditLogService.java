package com.aibi.bi.service;

import com.aibi.bi.domain.BiAuditLog;
import com.aibi.bi.mapper.BiAuditLogMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogService {

    private final BiAuditLogMapper biAuditLogMapper;

    public AuditLogService(BiAuditLogMapper biAuditLogMapper) {
        this.biAuditLogMapper = biAuditLogMapper;
    }

    public List<BiAuditLog> list() {
        return biAuditLogMapper.listAll();
    }

    public List<BiAuditLog> list(String username, String actionPrefix, Integer limit) {
        int safeLimit = limit == null ? 200 : Math.max(1, Math.min(limit, 1000));
        return biAuditLogMapper.listByFilter(blankToNull(username), blankToNull(actionPrefix), safeLimit);
    }

    public List<BiAuditLog> listLogin(String username, Integer limit) {
        return list(username, "LOGIN", limit);
    }

    public void record(Long userId, String username, String action,
                       String resourceType, String resourceId,
                       String detail, String ipAddr) {
        BiAuditLog log = new BiAuditLog();
        log.setUserId(userId);
        log.setUsername(username);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setDetail(detail);
        log.setIpAddr(ipAddr);
        biAuditLogMapper.insert(log);
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
