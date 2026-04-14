package com.aibi.bi.common;

import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ApiResponse<Object> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ApiResponse.fail(40001, ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ApiResponse<Object> handleUnauthorizedException(UnauthorizedException ex) {
        return ApiResponse.fail(40100, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ApiResponse<Object> handleForbiddenException(ForbiddenException ex) {
        return ApiResponse.fail(40300, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Object> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().isEmpty()
                ? "invalid request"
                : ex.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        return ApiResponse.fail(40002, message);
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Object> handleException(Exception ex) {
        return ApiResponse.fail(50000, "服务异常: " + ex.getMessage());
    }
}
