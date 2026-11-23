import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '@/api/bookings'
import { Icon } from '@/components/Icon'
import { Spinner, StatusBadge } from '@/components/ui'
import { readPendingCheckout } from '@/lib/checkout'
import { money } from '@/lib/format'
import type { Booking } from '@/types/booking'

/** Stripe confirma el pago por webhook: la reserva tarda unos segundos en pasar a CONFIRMED. */
const POLL_MS = 3000
const WAIT_LIMIT_MS = 90_000

function CheckoutShell({ icon, eyebrow, title, lede, children }: {
  icon: 'ticket' | 'x'
  eyebrow: string
  title: string
  lede: string
  children: React.ReactNode
}) {
  return (
    <div className="checkout">
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name={icon} size={22} /></span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="lede">{lede}</p>
          </div>
        </div>
      </header>
      <section className="panel">{children}</section>
    </div>
  )
}

function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <div className="checkout-summary">
      <span>{booking.quantity} {booking.quantity === 1 ? 'entrada' : 'entradas'} · {money(booking.totalPrice)}</span>
      <StatusBadge status={booking.status} />
    </div>
  )
}

export function CheckoutSuccessPage() {
  const [pending] = useState(readPendingCheckout)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), WAIT_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const booking = useQuery({
    queryKey: ['bookings', 'detail', pending?.bookingId],
    queryFn: () => bookingsApi.byId(pending!.bookingId),
    enabled: !!pending,
    refetchInterval: (query) =>
      !timedOut && (!query.state.data || query.state.data.status === 'PENDING_PAYMENT') ? POLL_MS : false,
  })

  if (!pending) {
    return (
      <CheckoutShell icon="ticket" eyebrow="Pago" title="Volviste del pago" lede="No encontramos la reserva que estabas pagando en este navegador.">
        <p className="hint">Si el pago se completó, la reserva aparece confirmada en tus reservas en unos minutos.</p>
        <Link to="/me/bookings" className="btn">Ir a mis reservas</Link>
      </CheckoutShell>
    )
  }

  const data = booking.data
  const waiting = !booking.error && (!data || data.status === 'PENDING_PAYMENT') && !timedOut

  return (
    <CheckoutShell
      icon="ticket"
      eyebrow="Pago"
      title={data?.status === 'CONFIRMED' ? '¡Pago confirmado!' : 'Gracias por tu compra'}
      lede={
        data?.status === 'CONFIRMED'
          ? 'Tus entradas ya están listas. Muestra el código QR en la entrada del evento.'
          : 'Stripe recibió tu pago. Estamos confirmando la reserva.'
      }
    >
      {data && <BookingSummary booking={data} />}
      {waiting && (
        <p className="checkout-wait" role="status"><Spinner />Estamos confirmando tu pago…</p>
      )}
      {data?.status === 'CONFIRMED' && (
        <p className="note" role="status">Te enviamos el detalle de la compra por correo.</p>
      )}
      {data?.status === 'PAYMENT_REVIEW_REQUIRED' && (
        <p className="hint">Tu pago está en revisión. Te avisaremos por correo cuando se resuelva.</p>
      )}
      {data?.status === 'PENDING_PAYMENT' && timedOut && (
        <p className="hint">La confirmación está tardando más de lo normal. Revisa tus reservas en unos minutos.</p>
      )}
      {data && (data.status === 'EXPIRED' || data.status === 'CANCELLED') && (
        <div className="error" role="alert">La reserva ya no está activa. Si se hizo un cobro, se te reembolsará.</div>
      )}
      {booking.error && (
        <div className="error" role="alert">{booking.error instanceof Error ? booking.error.message : 'No se pudo consultar la reserva'}</div>
      )}
      <Link to="/me/bookings" className="btn">{data?.status === 'CONFIRMED' ? 'Ver mis entradas' : 'Ir a mis reservas'}</Link>
    </CheckoutShell>
  )
}

export function CheckoutCancelPage() {
  const [pending] = useState(readPendingCheckout)

  return (
    <CheckoutShell
      icon="x"
      eyebrow="Pago"
      title="No se completó el pago"
      lede="No se hizo ningún cobro. Tu reserva queda pendiente de pago unos minutos y luego se libera."
    >
      {pending && (
        <Link to={`/events/${pending.eventId}`} className="btn">Volver al evento</Link>
      )}
      <Link to="/me/bookings" className={pending ? 'btn ghost' : 'btn'}>Ir a mis reservas</Link>
    </CheckoutShell>
  )
}
