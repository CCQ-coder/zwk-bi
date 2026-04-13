import request from './request'

export interface Dataset {
  id: number
  name: string
  datasourceId: number
  sqlText: string
  createdAt: string
}

export interface DatasetForm {
  name: string
  datasourceId: number | ''
  sqlText: string
}

export interface DatasetPreviewResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

export const getDatasetList = (): Promise<Dataset[]> =>
  request.get('/datasets')

export const createDataset = (data: DatasetForm): Promise<Dataset> =>
  request.post('/datasets', data)

export const updateDataset = (id: number, data: DatasetForm): Promise<Dataset> =>
  request.put(`/datasets/${id}`, data)

export const deleteDataset = (id: number): Promise<void> =>
  request.delete(`/datasets/${id}`)

export const previewDatasetSql = (data: {
  datasourceId: number
  sqlText: string
}): Promise<DatasetPreviewResult> => request.post('/datasets/preview', data)

