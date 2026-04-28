package com.aibi.bi.model.response;

public record WorkbenchSummaryResponse(
        int datasourceCount,
        int datasetCount,
        int chartCount,
        int screenCount,
        int publishedScreenCount,
        int recentAddedDatasourceCount,
        int recentAddedDatasetCount,
        int recentAddedChartCount,
        int recentAddedScreenCount,
        int recentAddedTotal
) {
}