import { request } from '@/lib/http'
import type { NotificationResponse } from '@/types/notification'

export const notificationsApi = {
  mine: () => request<NotificationResponse[]>('/api/v1/notifications/me'),
}
