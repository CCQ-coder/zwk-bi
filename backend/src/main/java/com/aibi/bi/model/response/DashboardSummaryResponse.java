package com.aibi.bi.model.response;

import com.aibi.bi.domain.BiChart;

import java.util.List;

public class DashboardSummaryResponse {
    private String name;
    private DashboardKpiResponse kpi;
    private List<BiChart> charts;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public DashboardKpiResponse getKpi() {
        return kpi;
    }

    public void setKpi(DashboardKpiResponse kpi) {
        this.kpi = kpi;
    }

    public List<BiChart> getCharts() {
        return charts;
    }

    public void setCharts(List<BiChart> charts) {
        this.charts = charts;
    }
}
