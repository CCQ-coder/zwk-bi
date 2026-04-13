import request from './request'

export interface ChartTemplate {
  id: number
  name: string
  chartType: string
  configJson: string
  createdAt: string
}

export const getTemplateList = (): Promise<ChartTemplate[]> =>
  request.get('/chart-templates')

export const createTemplate = (data: Omit<ChartTemplate, 'id' | 'createdAt'>): Promise<ChartTemplate> =>
  request.post('/chart-templates', data)

export const updateTemplate = (
  id: number,
  data: Partial<Omit<ChartTemplate, 'id' | 'createdAt'>>
): Promise<ChartTemplate> => request.put(`/chart-templates/${id}`, data)

export const deleteTemplate = (id: number): Promise<void> =>
  request.delete(`/chart-templates/${id}`)
