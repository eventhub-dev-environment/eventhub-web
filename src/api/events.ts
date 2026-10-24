import { requestData } from '@/lib/http'
import type { Category, CreateCategoryRequest, CreateEventRequest, EventDto } from '@/types/event'

export const eventsApi = {
  published: () => requestData<EventDto[]>('/api/v1/events/published'),
  byId: (id: string) => requestData<EventDto>(`/api/v1/events/${id}`),
  byTenant: (tenantId: string) => requestData<EventDto[]>(`/api/v1/events/tenant/${tenantId}`, { tenantId }),
  /** Staff del tenant activo (X-Tenant-ID lo pone el cliente HTTP). */
  create: (body: CreateEventRequest) => requestData<EventDto>('/api/v1/events', { method: 'POST', body }),
  uploadLogo: (id: string, file: File) => upload(id, 'logo', file),
  uploadBanner: (id: string, file: File) => upload(id, 'banner', file),
}

function upload(id: string, kind: 'logo' | 'banner', file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return requestData<EventDto>(`/api/v1/events/${id}/branding/${kind}`, { method: 'POST', formData })
}

export const categoriesApi = {
  list: () => requestData<Category[]>('/api/v1/categories'),
  byId: (id: string) => requestData<Category>(`/api/v1/categories/${id}`),
  // PLATFORM_ADMIN
  create: (body: CreateCategoryRequest) => requestData<Category>('/api/v1/categories', { method: 'POST', body }),
  update: (id: string, body: CreateCategoryRequest) =>
    requestData<Category>(`/api/v1/categories/${id}`, { method: 'PUT', body }),
}
