package com.aibi.bi.controller;

import com.aibi.bi.common.ApiResponse;
import com.aibi.bi.auth.AuthContext;
import com.aibi.bi.auth.RequireRoles;
import com.aibi.bi.model.request.CreateUserRequest;
import com.aibi.bi.model.request.UpdateUserRequest;
import com.aibi.bi.model.response.UserResponse;
import com.aibi.bi.service.UserService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/users")
@RequireRoles("ADMIN")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<List<UserResponse>> list() {
        return ApiResponse.ok(userService.list());
    }

    @PostMapping
    public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request,
                                            HttpServletRequest servletRequest) {
        return ApiResponse.ok(userService.create(request, operator(servletRequest), clientIp(servletRequest)));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable Long id,
                                            @Valid @RequestBody UpdateUserRequest request,
                                            HttpServletRequest servletRequest) {
        return ApiResponse.ok(userService.update(id, request, operator(servletRequest), clientIp(servletRequest)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    HttpServletRequest servletRequest) {
        userService.delete(id, operator(servletRequest), clientIp(servletRequest));
        return ApiResponse.ok(null);
    }

    private String operator(HttpServletRequest request) {
        String currentUser = AuthContext.username();
        if (currentUser != null && !currentUser.isBlank()) {
            return currentUser;
        }
        String op = request.getHeader("X-Operator");
        return (op == null || op.isBlank()) ? "system" : op.trim();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
