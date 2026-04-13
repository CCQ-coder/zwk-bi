package com.aibi.bi.domain;

public class BiDashboardComponent {
    private Long id;
    private Long dashboardId;
    private Long chartId;
    private int posX;
    private int posY;
    private int width;
    private int height;
    private int zIndex;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDashboardId() { return dashboardId; }
    public void setDashboardId(Long dashboardId) { this.dashboardId = dashboardId; }

    public Long getChartId() { return chartId; }
    public void setChartId(Long chartId) { this.chartId = chartId; }

    public int getPosX() { return posX; }
    public void setPosX(int posX) { this.posX = posX; }

    public int getPosY() { return posY; }
    public void setPosY(int posY) { this.posY = posY; }

    public int getWidth() { return width; }
    public void setWidth(int width) { this.width = width; }

    public int getHeight() { return height; }
    public void setHeight(int height) { this.height = height; }

    public int getZIndex() { return zIndex; }
    public void setZIndex(int zIndex) { this.zIndex = zIndex; }
}
