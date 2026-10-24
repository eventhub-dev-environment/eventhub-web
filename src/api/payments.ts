import { requestData } from '@/lib/http'
import type { CheckoutSessionResponse } from '@/types/payment'

export const paymentsApi = {
  /** Crea la sesión de Stripe para una reserva PENDING_PAYMENT (CUSTOMER). */
  createCheckoutSession: (bookingId: string) =>
    requestData<CheckoutSessionResponse>('/api/v1/payments/checkout-session', {
      method: 'POST',
      body: { bookingId },
    }),
}
