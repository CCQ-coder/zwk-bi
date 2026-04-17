import request from './request'

export type DatasourceSourceKind = 'DATABASE' | 'API' | 'TABLE' | 'JSON_STATIC'

export interface Datasource {
  id: number
  name: string
  sourceKind: DatasourceSourceKind
  datasourceType: string
  connectMode: string
  host: string
  port: number
  databaseName: string
  dbUsername: string
  configJson?: string
  createdAt: string
}

export interface DatasourceForm {
  name: string
  sourceKind: DatasourceSourceKind
  datasourceType: string
  connectMode: string
  host: string
  port: number | ''
  databaseName: string
  username: string
  password: string
  configJson?: string
}

export interface DatasourceConnectionTestResult {
  success: boolean
  message: string
  databaseProductName: string
  databaseProductVersion: string
}

export interface TableInfo {
  tableName: string
  tableType: string
  comment: string
}

export interface ExtractPreviewResult {
  sqlText: string
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

export interface DatasourcePreviewResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

export const getDatasourceList = (): Promise<Datasource[]> =>
  request.get('/datasources')

export const createDatasource = (data: DatasourceForm): Promise<Datasource> =>
  request.post('/datasources', data)

export const updateDatasource = (id: number, data: DatasourceForm): Promise<Datasource> =>
  request.put(`/datasources/${id}`, data)

export const deleteDatasource = (id: number): Promise<void> =>
  request.delete(`/datasources/${id}`)

export const testDatasourceConnection = (
  data: Omit<DatasourceForm, 'name' | 'connectMode'>
): Promise<DatasourceConnectionTestResult> => request.post('/datasources/test-connection', data)

export interface ColumnMeta {
  columnName: string
  dataType: string
  remarks: string
  nullable: boolean
}

export const getDatasourceTables = (id: number): Promise<TableInfo[]> =>
  request.get(`/datasources/${id}/tables`)

export const getDatasourcePreviewData = (id: number): Promise<DatasourcePreviewResult> =>
  request.get(`/datasources/${id}/preview-data`)

export const getTableColumns = (id: number, table: string): Promise<ColumnMeta[]> =>
  request.get(`/datasources/${id}/columns`, { params: { table } })

export const previewExtract = (data: {
  datasourceId: number
  tableName: string
  whereClause?: string
  limit?: number
}): Promise<ExtractPreviewResult> => request.post('/datasources/extract/preview', data)

