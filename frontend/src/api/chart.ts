import request from './request'

export interface Chart {
  id: number
  name: string
  datasetId: number
  chartType: string
  xField: string
  yField: string
  groupField: string
  createdAt: string
}

export interface ChartForm {
  name: string
  datasetId: number | ''
  chartType: string
  xField: string
  yField: string
  groupField: string
}

export interface ChartDataResult {
  chartType: string
  columns: string[]
  labels: string[]
  series: { name: string; data: (number | string)[] }[]
  rawRows?: Record<string, unknown>[]
}

export const getChartList = (): Promise<Chart[]> =>
  request.get('/charts')

export const createChart = (data: ChartForm): Promise<Chart> =>
  request.post('/charts', data)

export const updateChart = (id: number, data: ChartForm): Promise<Chart> =>
  request.put(`/charts/${id}`, data)

export const deleteChart = (id: number): Promise<void> =>
  request.delete(`/charts/${id}`)

export const getChartData = (id: number): Promise<ChartDataResult> =>
  request.get(`/charts/${id}/data`)

