import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { bookingsApi } from '@/api/bookings'
import { eventsApi } from '@/api/events'
import { paymentsApi } from '@/api/payments'
import { Skeleton, Spinner } from '@/components/ui'
import { dateParts, money } from '@/lib/format'

export function EventDetailPage() {
  const { id = '' } = useParams()
  const { data: ev, isLoading } = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.byId(id) })
  const [tierId, setTierId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const tiers = ev?.ticketTiers ?? []
  const tier = tiers.find((t) => t.id === tierId)
  const total = tier ? Math.round(tier.price * quantity * 100) / 100 : 0

  // Reservar -> checkout de Stripe -> redirigir. La reserva expira a los 10 min.
  const buy = useMutation({
    mutationFn: async () => {
      if (!ev || !tier) throw new Error('Selecciona una tarifa')
      const booking = await bookingsApi.create({ eventId: ev.id, ticketTierId: tier.id, quantity, totalPrice: total })
      // TODO: attendeeData según ev.registrationFields (uno por entrada)
      return paymentsApi.createCheckoutSession(booking.id)
    },
    onSuccess: (s) => window.location.assign(s.checkoutUrl),
  })

  if (isLoading || !ev) return <Skeleton h={320} />
  const d = dateParts(ev.eventDate)
  // Cada tenant pinta su evento con su propio color de marca.
  const brand = { '--accent': ev.branding?.primaryColor, '--accent2': ev.branding?.secondaryColor } as React.CSSProperties

  return (
    <div style={brand}>
      <section className="cover">
        {ev.branding?.bannerUrl && <img src={ev.branding.bannerUrl} alt="" />}
        <div>
          <h1>{ev.title}</h1>
          <p className="meta">{d.long} · {ev.location}</p>
        </div>
      </section>

      <div className="detail">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Sobre el evento</h2>
          <p>{ev.description || 'El organizador aún no agregó una descripción.'}</p>
          {ev.branding?.organizerName && <p style={{ color: 'var(--muted)' }}>Organiza {ev.branding.organizerName}</p>}
        </div>

        <aside className="panel">
          <h2>Tus entradas</h2>
          {tiers.map((t) => (
            <button key={t.id} className="tier" aria-pressed={tierId === t.id} onClick={() => setTierId(t.id)}>
              <span><strong>{t.name}</strong></span>
              <span className="price">{money(t.price)}</span>
            </button>
          ))}
          <div className="stepper">
            <span>Cantidad</span>
            <div>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Quitar una">−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label="Agregar una">+</button>
            </div>
          </div>
          <div className="total"><span>Total</span><strong key={total}>{money(total)}</strong></div>
          {buy.error && <div className="error" role="alert">{buy.error.message}</div>}
          <button className="btn" disabled={!tier || buy.isPending} onClick={() => buy.mutate()}>
            {buy.isPending && <Spinner />}Reservar y pagar
          </button>
          <small style={{ color: 'var(--muted)' }}>Tienes 10 minutos para completar el pago después de reservar.</small>
        </aside>
      </div>
    </div>
  )
}
