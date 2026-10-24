export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLATION_REVIEW_REQUIRED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PAYMENT_REVIEW_REQUIRED'

export type TicketStatus = 'ISSUED' | 'USED' | 'CANCELLED'

export interface Booking {
  id: string
  eventId: string
  sessionId?: string
  ticketTierId: string
  seatIds?: string[]
  userId: string
  userEmail: string
  quantity: number
  attendeeData?: Record<string, string>[]
  totalPrice: number
  status: BookingStatus
  expiresAt?: string // 10 min para pagar
  paymentTransactionId?: string
  refundCutoffAt?: string
  inventoryHeld?: boolean
  createdAt: string
  updatedAt: string
}

/** totalPrice debe ser exactamente precioUnitario × quantity (2 decimales) o el back responde 409. */
export interface CreateBookingRequest {
  eventId: string
  sessionId?: string
  ticketTierId: string
  seatIds?: string[]
  quantity: number // ≥ 1
  attendeeData?: Record<string, string>[] // uno por entrada, claves = registrationFields.key
  totalPrice: number
}

export interface Ticket {
  id: string
  bookingId: string
  eventId: string
  sessionId?: string
  ticketTierId: string
  seatId?: string
  qrCodeHash: string
  status: TicketStatus
  issuedAt: string
}
