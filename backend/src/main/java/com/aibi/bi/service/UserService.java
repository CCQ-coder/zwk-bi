package com.aibi.bi.service;

import com.aibi.bi.domain.BiUser;
import com.aibi.bi.domain.SysRole;
import com.aibi.bi.mapper.BiUserMapper;
import com.aibi.bi.mapper.SysRoleMapper;
import com.aibi.bi.mapper.SysUserRoleMapper;
import com.aibi.bi.model.request.CreateUserRequest;
import com.aibi.bi.model.request.UpdateUserRequest;
import com.aibi.bi.model.response.UserResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final BiUserMapper biUserMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final AuditLogService auditLogService;

    public UserService(BiUserMapper biUserMapper,
                       SysRoleMapper sysRoleMapper,
                       SysUserRoleMapper sysUserRoleMapper,
                       AuditLogService auditLogService) {
        this.biUserMapper = biUserMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.sysUserRoleMapper = sysUserRoleMapper;
        this.auditLogService = auditLogService;
    }

    public List<UserResponse> list() {
        return biUserMapper.listAll().stream().map(this::toResponse).toList();
    }

    public UserResponse create(CreateUserRequest request, String operator, String ipAddr) {
        if (biUserMapper.countByUsername(request.getUsername()) > 0) {
            throw new IllegalArgumentException("用户名已存在");
        }

        BiUser user = new BiUser();
        user.setUsername(request.getUsername().trim());
        user.setPasswordHash(request.getPassword());
        user.setDisplayName(request.getDisplayName().trim());
        user.setRole(normalizeRole(request.getRole()));
        user.setEmail(normalizeText(request.getEmail()));

        biUserMapper.insert(user);
    syncUserRole(user);
        auditLogService.record(null, operator, "USER_CREATE", "USER", String.valueOf(user.getId()),
                "创建用户: " + user.getUsername(), ipAddr);
        return toResponse(user);
    }

    public UserResponse update(Long id, UpdateUserRequest request, String operator, String ipAddr) {
        BiUser user = biUserMapper.findById(id);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在: " + id);
        }

        user.setDisplayName(request.getDisplayName().trim());
        user.setRole(normalizeRole(request.getRole()));
        user.setEmail(normalizeText(request.getEmail()));
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(request.getPassword());
        }

        biUserMapper.update(user);
        syncUserRole(user);
        auditLogService.record(null, operator, "USER_UPDATE", "USER", String.valueOf(user.getId()),
                "更新用户: " + user.getUsername(), ipAddr);
        return toResponse(user);
    }

    public void delete(Long id, String operator, String ipAddr) {
        BiUser user = biUserMapper.findById(id);
        if (user == null) {
            return;
        }
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            throw new IllegalArgumentException("默认管理员账号不允许删除");
        }
        sysUserRoleMapper.deleteByUserId(id);
        biUserMapper.deleteById(id);
        auditLogService.record(null, operator, "USER_DELETE", "USER", String.valueOf(id),
                "删除用户: " + user.getUsername(), ipAddr);
    }

    private void syncUserRole(BiUser user) {
        SysRole role = sysRoleMapper.findByName(normalizeRole(user.getRole()));
        if (role == null) {
            throw new IllegalArgumentException("角色不存在: " + user.getRole());
        }
        sysUserRoleMapper.deleteByUserId(user.getId());
        sysUserRoleMapper.insert(user.getId(), role.getId());
    }

    private UserResponse toResponse(BiUser user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setDisplayName(user.getDisplayName());
        response.setRole(normalizeRole(user.getRole()));
        response.setEmail(normalizeText(user.getEmail()));
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "ANALYST";
        }
        String normalized = role.trim().toUpperCase();
        if ("ADMIN".equals(normalized) || "ANALYST".equals(normalized) || "VIEWER".equals(normalized)) {
            return normalized;
        }
        return "ANALYST";
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }
}
