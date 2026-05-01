package com.aibi.bi.auth;

import com.aibi.bi.common.ForbiddenException;
import com.aibi.bi.common.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;

@Component
public class JwtAuthInterceptor implements HandlerInterceptor {

    private final JwtTokenService jwtTokenService;

    public JwtAuthInterceptor(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if (isPublicPath(path)) {
            return true;
        }

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new UnauthorizedException("请先登录");
        }

        AuthUser user = jwtTokenService.parseToken(authorization.substring(7).trim());
        AuthContext.set(user);
        RequireRoles roles = findRequiredRoles(handlerMethod);
        // ADMIN 作为最高权限，绕过所有 @RequireRoles 检查
        if (roles != null
                && !"ADMIN".equalsIgnoreCase(user.role())
                && Arrays.stream(roles.value()).noneMatch(role -> role.equalsIgnoreCase(user.role()))) {
            throw new ForbiddenException("当前账号无权访问该资源");
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/api/auth/login")
                || path.startsWith("/api/health")
                || path.startsWith("/api/public/");
    }

    private RequireRoles findRequiredRoles(HandlerMethod handlerMethod) {
        RequireRoles methodRoles = AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getMethod(), RequireRoles.class);
        if (methodRoles != null) {
            return methodRoles;
        }
        return AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getBeanType(), RequireRoles.class);
    }
}