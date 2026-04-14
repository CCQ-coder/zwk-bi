package com.aibi.bi.auth;

public final class AuthContext {

    private static final ThreadLocal<AuthUser> HOLDER = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(AuthUser user) {
        HOLDER.set(user);
    }

    public static AuthUser get() {
        return HOLDER.get();
    }

    public static String username() {
        AuthUser user = HOLDER.get();
        return user == null ? null : user.username();
    }

    public static String role() {
        AuthUser user = HOLDER.get();
        return user == null ? null : user.role();
    }

    public static Long userId() {
        AuthUser user = HOLDER.get();
        return user == null ? null : user.userId();
    }

    public static void clear() {
        HOLDER.remove();
    }
}