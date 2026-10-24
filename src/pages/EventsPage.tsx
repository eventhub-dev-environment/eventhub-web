import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoriesApi, eventsApi } from '@/api/events'
import { Empty, Skeleton, spotlight } from '@/components/ui'
import { dateParts, money } from '@/lib/format'

export function EventsPage() {
  const events = useQuery({ queryKey: ['events', 'published'], queryFn: eventsApi.published })
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const catName = useMemo(() => new Map(cats.data?.map((c) => [c.id, c.name])), [cats.data])

  const list = (events.data ?? []).filter(
    (e) => (!cat || e.categoryId === cat) && `${e.title} ${e.location}`.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <>
      <section className="hero">
        <h1>Encuentra tu próximo <span>plan</span></h1>
        <p>Carreras, conciertos y encuentros cerca de ti. Reserva en segundos y paga seguro.</p>
        <div className="search">
          <span aria-hidden>🔎</span>
          <input placeholder="Buscar por nombre o ciudad" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar eventos" />
        </div>
        {!!cats.data?.length && (
          <div className="chips">
            <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>Todos</button>
            {cats.data.map((c) => (
              <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>{c.name}</button>
            ))}
          </div>
        )}
      </section>

      {events.isLoading && <div className="grid">{[0, 1, 2].map((i) => <Skeleton key={i} h={168} />)}</div>}
      {events.error && <div className="error">{events.error.message}</div>}
      {events.data && list.length === 0 && <Empty title="No encontramos eventos" hint="Prueba con otra búsqueda o categoría." />}
      <div className="grid">
        {list.map((ev, i) => {
          const d = dateParts(ev.eventDate)
          const from = ev.ticketTiers?.length ? Math.min(...ev.ticketTiers.map((t) => t.price)) : null
          return (
            <Link key={ev.id} to={`/events/${ev.id}`} className="stub-wrap" style={{ '--i': i, '--tint': ev.branding?.primaryColor } as React.CSSProperties}>
              <article className="stub" onPointerMove={spotlight}>
                <div className="stub-date"><b>{d.day}</b><small>{d.month}</small></div>
                <div className="stub-body">
                  <h2>{ev.title}</h2>
                  <p>{ev.location}</p>
                  <div className="stub-foot">
                    <span className="cat">{catName.get(ev.categoryId) ?? ev.eventType}</span>
                    {from !== null && <span className="price">Desde {money(from)}</span>}
                  </div>
                </div>
              </article>
            </Link>
          )
        })}
      </div>
    </>
  )
}
