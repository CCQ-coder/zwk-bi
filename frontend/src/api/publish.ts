import request from './request'

export interface PublishedScreenSummary {
  id: number
  name: string
  coverUrl: string
  shareToken: string
  publishedAt?: string | null
  createdAt?: string
  groupId: number | null
  groupName: string
}

export interface PublishGroup {
  id: number
  name: string
  description: string
  sort: number
  visible: boolean
  screenCount: number
  createdAt?: string
  updatedAt?: string
  screens: PublishedScreenSummary[]
}

export interface SavePublishGroupPayload {
  name: string
  description: string
  sort: number
  visible: boolean
}

export const getManagePublishGroups = (): Promise<PublishGroup[]> =>
  request.get('/publish/groups/manage')

export const getDisplayPublishGroups = (): Promise<PublishGroup[]> =>
  request.get('/publish/groups/display')

export const getPublishedScreenOptions = (): Promise<PublishedScreenSummary[]> =>
  request.get('/publish/screens/options')

export const createPublishGroup = (payload: SavePublishGroupPayload): Promise<PublishGroup> =>
  request.post('/publish/groups', payload)

export const updatePublishGroup = (id: number, payload: SavePublishGroupPayload): Promise<PublishGroup> =>
  request.put(`/publish/groups/${id}`, payload)

export const updatePublishGroupScreens = (id: number, screenIds: number[]): Promise<PublishGroup> =>
  request.put(`/publish/groups/${id}/screens`, { screenIds })

export const deletePublishGroup = (id: number): Promise<void> =>
  request.delete(`/publish/groups/${id}`)