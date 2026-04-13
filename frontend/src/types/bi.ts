export interface KpiCard {
  label: string
  value: string
}

export interface NavModule {
  key: 'datasource' | 'dataset' | 'chart' | 'dashboard'
  label: string
}
