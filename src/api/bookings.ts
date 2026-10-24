import { requestData } from '@/lib/http'
import type { Booking, CreateBookingRequest, Ticket } from '@/types/booking'

const P = '/api/v1/bookings'
export const bookingsApi = {
  create: (body: CreateBookingRequest) => requestData<Booking>(P, { method: 'POST', body }), // CUSTOMER
  byId: (id: string) => requestData<Booking>(`${P}/${id}`),
  byUser: (userId: string) => requestData<Booking[]>(`${P}/user/${userId}`),
  tickets: (id: string) => requestData<Ticket[]>(`${P}/${id}/tickets`),
  cancel: (id: string) => requestData<Booking>(`${P}/${id}/cancel`, { method: 'POST' }), // CUSTOMER
  /** Staff del tenant: valida y marca el ticket como USED. */
  validateTicket: (ticketId: string, qrCodeHash: string) =>
    requestData<Ticket>(`${P}/tickets/validate`, { method: 'POST', query: { ticketId, qrCodeHash } }),
}
