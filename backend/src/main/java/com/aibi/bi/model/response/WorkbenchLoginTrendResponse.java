package com.aibi.bi.model.response;

public record WorkbenchLoginTrendResponse(
        String key,
        String label,
        int success,
        int fail,
        int total
) {
}