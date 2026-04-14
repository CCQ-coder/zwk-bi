import request from './request'

export interface ChartTemplate {
  id: number
  name: string
  description: string
  chartType: string
  configJson: string
  builtIn: boolean
  sortOrder: number
  createdBy: string
  createdAt: string
}

export const getTemplateList = (): Promise<ChartTemplate[]> =>
  request.get('/chart-templates')

export const createTemplate = (data: Pick<ChartTemplate, 'name' | 'description' | 'chartType' | 'configJson'>): Promise<ChartTemplate> =>
  request.post('/chart-templates', data)

export const updateTemplate = (
  id: number,
  data: Partial<Pick<ChartTemplate, 'name' | 'description' | 'chartType' | 'configJson'>>
): Promise<ChartTemplate> => request.put(`/chart-templates/${id}`, data)

export const deleteTemplate = (id: number): Promise<void> =>
  request.delete(`/chart-templates/${id}`)
