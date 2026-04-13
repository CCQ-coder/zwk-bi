package com.aibi.bi.model.response;

public class DashboardKpiResponse {
    private long dashboardCount;
    private long chartCount;
    private long datasetCount;
    private long datasourceCount;

    public long getDashboardCount() {
        return dashboardCount;
    }

    public void setDashboardCount(long dashboardCount) {
        this.dashboardCount = dashboardCount;
    }

    public long getChartCount() {
        return chartCount;
    }

    public void setChartCount(long chartCount) {
        this.chartCount = chartCount;
    }

    public long getDatasetCount() {
        return datasetCount;
    }

    public void setDatasetCount(long datasetCount) {
        this.datasetCount = datasetCount;
    }

    public long getDatasourceCount() {
        return datasourceCount;
    }

    public void setDatasourceCount(long datasourceCount) {
        this.datasourceCount = datasourceCount;
    }
}
