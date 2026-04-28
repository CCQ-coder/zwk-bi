package com.aibi.bi.model.response;

import java.time.LocalDateTime;

public record WorkbenchScreenSummaryResponse(
        Long id,
        String name,
        String publishStatus,
        String coverUrl,
        int canvasWidth,
        int canvasHeight,
        int componentCount,
        LocalDateTime createdAt
) {
}