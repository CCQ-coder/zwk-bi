package com.aibi.bi.service;

import com.aibi.bi.domain.BiUser;
import com.aibi.bi.mapper.BiUserMapper;
import com.aibi.bi.model.request.LoginRequest;
import com.aibi.bi.model.response.LoginResponse;
import com.aibi.bi.auth.JwtTokenService;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final BiUserMapper biUserMapper;
    private final AuditLogService auditLogService;
    private final JwtTokenService jwtTokenService;

    public AuthService(BiUserMapper biUserMapper,
                       AuditLogService auditLogService,
                       JwtTokenService jwtTokenService) {
        this.biUserMapper = biUserMapper;
        this.auditLogService = auditLogService;
        this.jwtTokenService = jwtTokenService;
    }

    public LoginResponse login(LoginRequest request, String ipAddr) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        BiUser user = biUserMapper.findByUsername(request.getUsername());
        if (user == null || !user.getPasswordHash().equals(request.getPassword())) {
            auditLogService.record(null, username, "LOGIN_FAIL",
                    "AUTH", username, "登录失败：用户名或密码错误", ipAddr);
            throw new IllegalArgumentException("用户名或密码错误");
        }

        auditLogService.record(user.getId(), user.getUsername(), "LOGIN_SUCCESS",
                "AUTH", String.valueOf(user.getId()), "登录成功", ipAddr);

        LoginResponse response = new LoginResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRole());
        response.setToken(jwtTokenService.generateToken(user));
        return response;
    }
}
