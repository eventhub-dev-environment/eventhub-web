export type NotificationType = 'BOOKING_CONFIRMED' | 'PAYMENT_COMPLETED' | 'TICKET_ISSUED'
export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING'

/** /notifications/me devuelve el array directo, sin ApiResponse. */
export interface NotificationResponse {
  id: string
  userId: string
  recipientEmail: string
  subject: string
  message: string
  type: NotificationType
  status: NotificationStatus
  createdAt: string
}
