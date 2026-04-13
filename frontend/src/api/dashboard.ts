import request from './request'

export interface DashboardKpi {
  dashboardCount: number
  chartCount: number
  datasetCount: number
  datasourceCount: number
}

export interface DashboardChart {
  id: number
  name: string
  datasetId: number
  chartType: string
  xField: string
  yField: string
  groupField: string
  createdAt: string
}

export interface DashboardData {
  name: string
  kpi: DashboardKpi
  charts: DashboardChart[]
}

export interface Dashboard {
  id: number
  name: string
  configJson: string
  createdAt: string
}

export interface DashboardComponent {
  id: number
  dashboardId: number
  chartId: number
  posX: number
  posY: number
  width: number
  height: number
  zIndex: number
}

// 首页默认仪表板（最新一条）
export const getDefaultDashboard = (): Promise<DashboardData> =>
  request.get('/dashboard/default')

// 仪表板 CRUD
export const getDashboardList = (): Promise<Dashboard[]> =>
  request.get('/dashboard')

export const createDashboard = (data: { name: string; configJson?: string }): Promise<Dashboard> =>
  request.post('/dashboard', data)

export const updateDashboard = (id: number, data: { name?: string; configJson?: string }): Promise<Dashboard> =>
  request.put(`/dashboard/${id}`, data)

export const deleteDashboard = (id: number): Promise<void> =>
  request.delete(`/dashboard/${id}`)

// 仪表板组件布局
export const getDashboardComponents = (dashboardId: number): Promise<DashboardComponent[]> =>
  request.get(`/dashboards/${dashboardId}/components`)

export const addDashboardComponent = (
  dashboardId: number,
  data: Omit<DashboardComponent, 'id' | 'dashboardId'>
): Promise<DashboardComponent> =>
  request.post(`/dashboards/${dashboardId}/components`, data)

export const updateDashboardComponent = (
  dashboardId: number,
  id: number,
  data: Partial<DashboardComponent>
): Promise<DashboardComponent> =>
  request.put(`/dashboards/${dashboardId}/components/${id}`, data)

export const removeDashboardComponent = (dashboardId: number, id: number): Promise<void> =>
  request.delete(`/dashboards/${dashboardId}/components/${id}`)

