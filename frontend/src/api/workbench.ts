import request from './request'

export interface WorkbenchSummary {
  datasourceCount: number
  datasetCount: number
  chartCount: number
  screenCount: number
  publishedScreenCount: number
  recentAddedDatasourceCount: number
  recentAddedDatasetCount: number
  recentAddedChartCount: number
  recentAddedScreenCount: number
  recentAddedTotal: number
}

export interface WorkbenchLoginTrendItem {
  key: string
  label: string
  success: number
  fail: number
  total: number
}

export interface WorkbenchLoginOverview {
  enabled: boolean
  successCount: number
  failCount: number
  activeUserCount: number
  trend: WorkbenchLoginTrendItem[]
}

export interface WorkbenchScreenSummary {
  id: number
  name: string
  publishStatus: 'DRAFT' | 'PUBLISHED'
  coverUrl: string
  canvasWidth: number
  canvasHeight: number
  componentCount: number
  createdAt: string
}

export interface WorkbenchOverview {
  summary: WorkbenchSummary
  login: WorkbenchLoginOverview
  screens: WorkbenchScreenSummary[]
}

export const getWorkbenchOverview = (): Promise<WorkbenchOverview> =>
  request.get('/workbench/overview')