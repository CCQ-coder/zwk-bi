import request from './request'

export interface Dataset {
  id: number
  name: string
  datasourceId: number | null
  sqlText: string
  folderId: number | null
  createdAt: string
}

export interface DatasetFolder {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  children: DatasetFolder[]
  datasets: Dataset[]
}

export interface DatasetForm {
  name: string
  datasourceId: number | '' | null
  sqlText: string
  folderId?: number | null
}

export interface DatasetPreviewResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

export interface DatasetField {
  id: number
  datasetId: number
  fieldName: string
  fieldType: string
  fieldLabel: string
  createdAt: string
}

export const getDatasetList = (): Promise<Dataset[]> =>
  request.get('/datasets')

export const getDatasetFolderTree = (): Promise<DatasetFolder[]> =>
  request.get('/datasets/folder-tree')

export const createDataset = (data: DatasetForm): Promise<Dataset> =>
  request.post('/datasets', data)

export const updateDataset = (id: number, data: DatasetForm): Promise<Dataset> =>
  request.put(`/datasets/${id}`, data)

export const deleteDataset = (id: number): Promise<void> =>
  request.delete(`/datasets/${id}`)

export const previewDatasetSql = (data: {
  datasourceId: number | null
  sqlText: string
}): Promise<DatasetPreviewResult> => request.post('/datasets/preview', data)

export const getDatasetFields = (id: number): Promise<DatasetField[]> =>
  request.get(`/datasets/${id}/fields`)

export const getDatasetPreviewData = (id: number): Promise<DatasetPreviewResult> =>
  request.get(`/datasets/${id}/preview-data`)

// Folder APIs
export const createDatasetFolder = (name: string, parentId?: number | null): Promise<DatasetFolder> =>
  request.post('/datasets/folders', { name, parentId: parentId ?? null })

export const renameDatasetFolder = (id: number, name: string): Promise<DatasetFolder> =>
  request.put(`/datasets/folders/${id}`, { name })

export const deleteDatasetFolder = (id: number): Promise<void> =>
  request.delete(`/datasets/folders/${id}`)

