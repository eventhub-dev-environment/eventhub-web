import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toDataURL } from 'qrcode'
import { bookingsApi } from '@/api/bookings'
import { eventsApi } from '@/api/events'
import { notificationsApi } from '@/api/notifications'
import { Icon } from '@/components/Icon'
import { Empty, Skeleton, Spinner, StatusBadge } from '@/components/ui'
import { dateParts, money } from '@/lib/format'
import { hasGlobalRole, useAuthStore } from '@/store/auth'
import type { Booking, BookingStatus, Ticket } from '@/types/booking'
import type { EventDto } from '@/types/event'

/** AuthResponse no trae el userId: se lee del claim `userId` del JWT. */
function userIdFromToken(token: string | null): string | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).userId ?? null
  } catch {
    return null
  }
}

type BookingFilter = 'ALL' | 'CONFIRMED' | 'PENDING' | 'EXPIRED' | 'CANCELLED'

const FILTERS: { id: BookingFilter; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'CONFIRMED', label: 'Confirmadas' },
  { id: 'PENDING', label: 'Por pagar' },
  { id: 'EXPIRED', label: 'Expiradas' },
  { id: 'CANCELLED', label: 'Canceladas' },
]

function bookingFilter(status: BookingStatus): BookingFilter {
  if (status === 'CONFIRMED') return 'CONFIRMED'
  if (status === 'EXPIRED') return 'EXPIRED'
  if (status === 'PENDING_PAYMENT' || status === 'PAYMENT_REVIEW_REQUIRED') return 'PENDING'
  return 'CANCELLED'
}

function tierName(event: EventDto | undefined, tierId: string): string | undefined {
  if (!event) return undefined
  const tiers = [
    ...(event.ticketTiers ?? []),
    ...(event.sessions ?? []).flatMap((session) => session.ticketTiers ?? []),
  ]
  return tiers.find((tier) => tier.id === tierId)?.name
}

function eventWhen(event: EventDto | undefined, sessionId?: string): string | undefined {
  if (!event) return undefined
  const session = event.sessions?.find((item) => item.id === sessionId)
  return session?.startsAt ?? event.eventDate
}

const IN_REFUND: BookingStatus[] = ['CANCELLATION_REQUESTED', 'CANCELLATION_REVIEW_REQUIRED']

/**
 * Las mismas reglas que booking-service aplica en POST /bookings/{id}/cancel.
 * Devuelve null si se puede cancelar, o el motivo para mostrarlo en lugar del botón.
 */
function cancelBlock(booking: Booking, tickets: Ticket[]): string | null {
  if (!booking.paymentTransactionId) return 'Esta reserva no tiene un pago para reembolsar.'
  if (!booking.refundCutoffAt || Date.now() >= new Date(booking.refundCutoffAt).getTime()) {
    return 'El plazo para cancelar y pedir el reembolso ya terminó.'
  }
  if (tickets.length !== booking.quantity || tickets.some((ticket) => ticket.status !== 'ISSUED')) {
    return 'Solo se puede cancelar si ninguna entrada se ha usado.'
  }
  return null
}

/** El mismo texto que lleva el QR del correo, para que el check-in lo pueda leer. */
function qrPayload(ticket: Ticket): string {
  const params = new URLSearchParams({ ticketId: ticket.id, qrCodeHash: ticket.qrCodeHash })
  return `https://api.eventhub.com/api/v1/bookings/tickets/validate?${params}`
}

function TicketCode({ ticket, logoUrl }: { ticket: Ticket; logoUrl?: string }) {
  const [src, setSrc] = useState('')
  const [logoOk, setLogoOk] = useState(true)
  const payload = qrPayload(ticket)

  useEffect(() => {
    let cancel = false
    void toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: { dark: '#16132e', light: '#ffffff' },
    }).then((url) => {
      if (!cancel) setSrc(url)
    })
    return () => {
      cancel = true
    }
  }, [payload])

  const caption =
    ticket.status === 'USED'
      ? 'Esta entrada ya se usó'
      : ticket.status === 'CANCELLED'
        ? 'Esta entrada está cancelada'
        : 'Muestra este código en la entrada'

  return (
    <>
      <div className={`pass-qr${ticket.status === 'ISSUED' ? '' : ' is-inactive'}`}>
        {src ? <img className="pass-qr-img" src={src} alt="Código QR de la entrada" /> : <Skeleton h={152} />}
        {logoUrl && logoOk && (
          <img className="pass-qr-logo" src={logoUrl} alt="" onError={() => setLogoOk(false)} />
        )}
      </div>
      <p>{caption}</p>
    </>
  )
}

function Pass({
  booking,
  event,
  eventLoading,
  tickets,
  ticketsLoading,
  index,
  isCustomer,
}: {
  booking: Booking
  event?: EventDto
  eventLoading: boolean
  tickets: Ticket[]
  ticketsLoading: boolean
  index: number
  isCustomer: boolean
}) {
  const [cursor, setCursor] = useState(0)
  const [logoOk, setLogoOk] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })
  const when = eventWhen(event, booking.sessionId)
  const date = when ? dateParts(when) : null
  const title = event?.title
  const logo = event?.branding?.logoUrl
  const tint = event?.branding?.primaryColor
  const ticket = tickets[Math.min(cursor, Math.max(tickets.length - 1, 0))]
  const showQr = booking.status === 'CONFIRMED'
  const canOfferCancel = isCustomer && showQr && !ticketsLoading
  const blocked = canOfferCancel ? cancelBlock(booking, tickets) : null
  const failure = cancel.error instanceof Error ? cancel.error.message : ''

  const accept = () => cancel.mutate(undefined, { onSettled: () => setConfirm(false) })

  return (
    <article className="pass" style={{ '--i': index, '--tint': tint } as React.CSSProperties}>
      <div className="pass-main">
        <div className="pass-brand">
          {logo && logoOk ? (
            <img className="pass-logo" src={logo} alt="" onError={() => setLogoOk(false)} />
          ) : (
            <span className="pass-mark" aria-hidden>{(title ?? 'E')[0]?.toUpperCase()}</span>
          )}
          <div className="pass-copy">
            {event?.branding?.organizerName && <p className="eyebrow">{event.branding.organizerName}</p>}
            {eventLoading && !title ? <Skeleton h={28} /> : <h2>{title ?? 'Evento'}</h2>}
            {event?.location && <p>{event.location}</p>}
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="pass-meta">
          {date && (
            <div className="is-wide">
              <dt>Fecha</dt>
              <dd>{date.long}</dd>
            </div>
          )}
          <div>
            <dt>Tarifa</dt>
            <dd>{tierName(event, booking.ticketTierId) ?? 'Entrada general'}</dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>{booking.quantity} {booking.quantity === 1 ? 'entrada' : 'entradas'}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(booking.totalPrice)}</dd>
          </div>
        </dl>
      </div>
      <div className="pass-code">
        {showQr && ticketsLoading && <Skeleton h={168} />}
        {showQr && !ticketsLoading && ticket && <TicketCode ticket={ticket} logoUrl={logoOk ? logo : undefined} />}
        {showQr && !ticketsLoading && !ticket && <p>El código se está generando.</p>}
        {IN_REFUND.includes(booking.status) && <p>Reembolso en proceso. Tus entradas ya no son válidas.</p>}
        {booking.status === 'CANCELLED' && <p>Reserva cancelada.</p>}
        {!showQr && !IN_REFUND.includes(booking.status) && booking.status !== 'CANCELLED' && (
          <p>El QR aparece cuando la reserva queda confirmada.</p>
        )}
        {showQr && tickets.length > 1 && (
          <div className="pass-switch">
            <button type="button" disabled={cursor === 0} onClick={() => setCursor((n) => Math.max(0, n - 1))}>Anterior</button>
            <span>Entrada {Math.min(cursor, tickets.length - 1) + 1} de {tickets.length}</span>
            <button type="button" disabled={cursor >= tickets.length - 1} onClick={() => setCursor((n) => Math.min(tickets.length - 1, n + 1))}>Siguiente</button>
          </div>
        )}
        {canOfferCancel && !blocked && (
          <>
            <button type="button" className="btn ghost danger" disabled={cancel.isPending} onClick={() => { cancel.reset(); setConfirm(true) }}>
              Cancelar reserva
            </button>
            {booking.refundCutoffAt && <p>Puedes cancelar hasta el {dateParts(booking.refundCutoffAt).long}.</p>}
          </>
        )}
        {canOfferCancel && blocked && <p>{blocked}</p>}
        {failure && <div className="error" role="alert">{failure}</div>}
      </div>

      {confirm && createPortal(
        <div className="confirm-backdrop" onClick={() => { if (!cancel.isPending) setConfirm(false) }}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby={`cancel-${booking.id}`} onClick={(event) => event.stopPropagation()}>
            <h2 id={`cancel-${booking.id}`}>Cancelar reserva</h2>
            <p>
              Se solicitará el reembolso de {money(booking.totalPrice)} y tus {booking.quantity === 1 ? 'entrada dejará' : 'entradas dejarán'} de
              ser {booking.quantity === 1 ? 'válida' : 'válidas'}. No se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" disabled={cancel.isPending} onClick={() => setConfirm(false)}>Volver</button>
              <button type="button" className="btn" disabled={cancel.isPending} onClick={accept}>
                {cancel.isPending && <Spinner />}
                Cancelar reserva
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </article>
  )
}

export function MyBookingsPage() {
  const userId = userIdFromToken(useAuthStore((s) => s.token))
  const isCustomer = useAuthStore((s) => hasGlobalRole(s, 'CUSTOMER'))
  const bookings = useQuery({ queryKey: ['bookings', userId], queryFn: () => bookingsApi.byUser(userId!), enabled: !!userId })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.mine })
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<BookingFilter>('ALL')

  const eventIds = useMemo(() => [...new Set((bookings.data ?? []).map((booking) => booking.eventId))], [bookings.data])
  const confirmedIds = useMemo(
    () => (bookings.data ?? []).filter((booking) => booking.status === 'CONFIRMED').map((booking) => booking.id),
    [bookings.data],
  )
  const eventQueries = useQueries({
    queries: eventIds.map((id) => ({
      queryKey: ['events', id],
      queryFn: () => eventsApi.byId(id),
      retry: false,
    })),
  })
  const ticketQueries = useQueries({
    queries: confirmedIds.map((id) => ({
      queryKey: ['bookings', id, 'tickets'],
      queryFn: () => bookingsApi.tickets(id),
    })),
  })
  const eventById = new Map(eventIds.map((id, i) => [id, eventQueries[i]]))
  const ticketsByBooking = new Map(confirmedIds.map((id, i) => [id, ticketQueries[i]]))

  const counts = useMemo(() => {
    const tally: Record<BookingFilter, number> = { ALL: 0, CONFIRMED: 0, PENDING: 0, EXPIRED: 0, CANCELLED: 0 }
    for (const booking of bookings.data ?? []) {
      tally.ALL += 1
      tally[bookingFilter(booking.status)] += 1
    }
    return tally
  }, [bookings.data])

  const visible = (bookings.data ?? []).filter((booking) => {
    if (filter !== 'ALL' && bookingFilter(booking.status) !== filter) return false
    const event = eventById.get(booking.eventId)?.data
    const haystack = `${event?.title ?? ''} ${event?.location ?? ''} ${event?.branding?.organizerName ?? ''}`.toLowerCase()
    return haystack.includes(q.trim().toLowerCase())
  })

  return (
    <div className="bookings-layout">
      <h1>Mis reservas</h1>
      <div className="bookings-tools">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar por evento o lugar"
            value={q}
            aria-label="Buscar reservas"
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <div className="chips" role="group" aria-label="Filtrar por estado">
          {FILTERS.filter((item) => item.id === 'ALL' || counts[item.id] > 0).map((item) => (
            <button key={item.id} type="button" className="chip" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
              <span className="count">{counts[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pass-list">
        {bookings.isLoading && <Skeleton h={220} />}
        {bookings.data?.length === 0 && (
          <>
            <Empty title="Aún no tienes reservas" hint="Cuando compres entradas aparecerán aquí." />
            <Link to="/" className="btn">Ver eventos</Link>
          </>
        )}
        {bookings.data && bookings.data.length > 0 && visible.length === 0 && (
          <Empty title="Ninguna reserva coincide" hint="Prueba con otro estado o con otra búsqueda." />
        )}
        {visible.map((booking, index) => {
          const eventQuery = eventById.get(booking.eventId)
          const ticketQuery = ticketsByBooking.get(booking.id)
          return (
            <Pass
              key={booking.id}
              booking={booking}
              event={eventQuery?.data}
              eventLoading={!!eventQuery?.isPending}
              tickets={ticketQuery?.data ?? []}
              ticketsLoading={!!ticketQuery?.isPending}
              index={index}
              isCustomer={isCustomer}
            />
          )
        })}
      </div>

      <h2 className="section-title">Notificaciones</h2>
      {notifications.data?.length === 0 && <Empty title="Sin notificaciones" />}
      {notifications.data?.map((notification, index) => (
        <div key={notification.id} className="row" style={{ '--i': index } as React.CSSProperties}>
          <div>
            <strong>{notification.subject}</strong>
            <p>{notification.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
