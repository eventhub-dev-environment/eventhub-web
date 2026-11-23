/** Stripe vuelve a una URL fija sin el id de la reserva: lo guardamos antes de salir hacia el pago. */
const KEY = 'eh-checkout'

export interface PendingCheckout {
  bookingId: string
  eventId: string
}

export function savePendingCheckout(checkout: PendingCheckout) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(checkout))
  } catch {
    /* sin almacenamiento la página de retorno muestra un mensaje genérico */
  }
}

export function readPendingCheckout(): PendingCheckout | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    return value && typeof value.bookingId === 'string' && typeof value.eventId === 'string' ? value : null
  } catch {
    return null
  }
}
