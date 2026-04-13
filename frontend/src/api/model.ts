import request from './request'

export interface BiModel {
  id: number
  name: string
  description: string
  configJson: string
  createdAt: string
}

export interface ModelForm {
  name: string
  description: string
  configJson: string
}

export const getModelList = (): Promise<BiModel[]> =>
  request.get('/models')

export const createModel = (data: ModelForm): Promise<BiModel> =>
  request.post('/models', data)

export const updateModel = (id: number, data: ModelForm): Promise<BiModel> =>
  request.put(`/models/${id}`, data)

export const deleteModel = (id: number): Promise<void> =>
  request.delete(`/models/${id}`)
