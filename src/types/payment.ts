export interface CreateCheckoutSessionRequest {
  bookingId: string
}
export interface CheckoutSessionResponse {
  sessionId: string
  checkoutUrl: string // redirigir con window.location.assign
}
