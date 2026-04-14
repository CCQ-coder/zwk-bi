import request from './request'
import type { Chart, ChartDataResult } from './chart'
import type { Dashboard, DashboardComponent } from './dashboard'

export const getPublicDashboardById = (dashboardId: number, token: string): Promise<Dashboard> =>
  request.get(`/public/reports/${dashboardId}`, { params: { token } })

export const getPublicDashboardComponents = (dashboardId: number, token: string): Promise<DashboardComponent[]> =>
  request.get(`/public/reports/${dashboardId}/components`, { params: { token } })

export const getPublicChartList = (dashboardId: number, token: string): Promise<Chart[]> =>
  request.get(`/public/reports/${dashboardId}/charts`, { params: { token } })

export const getPublicComponentData = (
  dashboardId: number,
  componentId: number,
  token: string,
  filters?: Record<string, string>,
): Promise<ChartDataResult> =>
  request.get(`/public/reports/${dashboardId}/components/${componentId}/data`, {
    params: {
      token,
      ...(filters && Object.keys(filters).length ? { filterJson: JSON.stringify(filters) } : {}),
    }
  })