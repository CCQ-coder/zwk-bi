import request from './request'

export interface Chart {
  id: number
  name: string
  datasetId: number | null
  chartType: string
  xField: string
  yField: string
  groupField: string
  createdAt: string
}

export interface ChartForm {
  name: string
  datasetId: number | null | ''
  chartType: string
  xField: string
  yField: string
  groupField: string
}

export interface ChartDataResult {
  chartType: string
  columns: string[]
  labels: string[]
  series: { name: string; data: Array<number | string | [number, number]> }[]
  rawRows?: Record<string, unknown>[]
  filters?: Record<string, string>
}

export interface ChartDataQueryOptions {
  filters?: Record<string, string>
  configJson?: string
}

export interface ChartDatasetQueryRequest {
  datasetId: number
}

export interface ChartPageSqlQueryRequest {
  datasourceId: number
  sqlText: string
}

export interface ChartPageSourceQueryRequest {
  datasourceId: number | null
  sqlText?: string
  runtimeConfigText?: string
}

export const getChartList = (): Promise<Chart[]> =>
  request.get('/charts')

export const createChart = (data: ChartForm): Promise<Chart> =>
  request.post('/charts', data)

export const updateChart = (id: number, data: ChartForm): Promise<Chart> =>
  request.put(`/charts/${id}`, data)

export const deleteChart = (id: number): Promise<void> =>
  request.delete(`/charts/${id}`)

export const getChartData = (id: number, options?: ChartDataQueryOptions): Promise<ChartDataResult> =>
  request.get(`/charts/${id}/data`, {
    params: {
      ...(options?.filters && Object.keys(options.filters).length ? { filterJson: JSON.stringify(options.filters) } : {}),
      ...(options?.configJson ? { configJson: options.configJson } : {}),
    }
  })

export const queryChartDataset = (data: ChartDatasetQueryRequest): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> =>
  request.post('/charts/query/dataset', data)

export const queryChartPageSql = (data: ChartPageSqlQueryRequest): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> =>
  request.post('/charts/query/page-sql', data)

export const queryChartPageSource = (data: ChartPageSourceQueryRequest): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> =>
  request.post('/charts/query/page-source', data)

