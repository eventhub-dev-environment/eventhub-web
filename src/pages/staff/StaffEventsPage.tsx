import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/events'
import { Icon } from '@/components/Icon'
import { Empty, Skeleton } from '@/components/ui'
import { dateParts, money } from '@/lib/format'
import { selectIsTenantAdmin, useAuthStore } from '@/store/auth'
import type { EventDto, EventStatus } from '@/types/event'
import { useStaffEvents } from './useStaffEvents'

const PAGE_SIZE = 6

const STATUS: Record<EventStatus, [string, string]> = {
  PUBLISHED: ['Publicado', 'ok'],
  DRAFT: ['Borrador', 'warn'],
  CANCELLED: ['Cancelado', 'bad'],
  COMPLETED: ['Finalizado', ''],
}

function lowestPrice(event: EventDto): number | null {
  const tiers = [
    ...(event.ticketTiers ?? []),
    ...(event.sessions ?? []).flatMap((session) => session.ticketTiers ?? []),
  ]
  if (tiers.length === 0) return null
  return Math.min(...tiers.map((tier) => tier.price))
}

export function StaffEventsPage() {
  const tenantId = useAuthStore((s) => s.activeTenantId)
  const canConfigure = useAuthStore(selectIsTenantAdmin)
  const { events } = useStaffEvents(tenantId)
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const names = useMemo(() => new Map(categories.data?.map((category) => [category.id, category.name])), [categories.data])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...(events.data ?? [])]
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .filter((event) => `${event.title} ${event.location}`.toLowerCase().includes(needle))
  }, [events.data, q])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageItems = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  if (!tenantId) {
    return <Empty title="Sin tenant activo" hint="Entra con la cuenta del administrador o del organizador del tenant." />
  }

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="calendar" size={22} /></span>
          <div>
            <p className="eyebrow">Staff</p>
            <h1>Eventos</h1>
            <p className="lede">Los eventos de este tenant. Publicar es definitivo: el servicio no permite editarlos ni eliminarlos.</p>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="Buscar por nombre o lugar"
            value={q}
            aria-label="Buscar eventos"
            onChange={(event) => { setQ(event.target.value); setPage(0) }}
          />
        </div>
        <div className="staff-actions">
          <Link to="/staff/check-in" className="btn ghost"><Icon name="ticket" />Check-in</Link>
          <Link to="/staff/events/new" className="btn"><Icon name="plus" />Nuevo evento</Link>
        </div>
      </div>

      {canConfigure && (
        <Link to="/staff/config" className="row staff-link">
          <span className="mark"><Icon name="sliders" /></span>
          <span>
            <strong>Configuración</strong>
            <p>Marca, colores, comisión y formulario de inscripción.</p>
          </span>
        </Link>
      )}

      <div className="stack">
        {events.isLoading && [0, 1, 2].map((item) => <Skeleton key={item} h={76} />)}
        {events.error instanceof Error && <div className="error" role="alert">{events.error.message}</div>}
        {events.data && visible.length === 0 && (
          <Empty
            icon={<Icon name="calendar" size={28} />}
            title={q ? 'Sin coincidencias' : 'Aún no hay eventos'}
            hint={q ? 'Prueba con otro nombre.' : 'Publica el primero. Revisa la categoría y la fecha antes de confirmar.'}
          />
        )}
        {pageItems.map((event, index) => {
          const when = dateParts(event.eventDate)
          const price = lowestPrice(event)
          const [label, tone] = STATUS[event.status]
          return (
            <Link key={event.id} to={`/events/${event.id}`} className="row cat-item" style={{ '--i': index } as React.CSSProperties}>
              <span className="mark"><Icon name="calendar" /></span>
              <span className="event-copy">
                <strong>{event.title}</strong>
                <p>{when.long} · {event.location}</p>
              </span>
              <span className="event-meta">
                <span className="cat">{names.get(event.categoryId) ?? 'Sin categoría'}</span>
                {price !== null && <span className="price">{money(price)}</span>}
                <span className={`badge ${tone}`}>{label}</span>
              </span>
            </Link>
          )
        })}
      </div>

      {events.data && visible.length > PAGE_SIZE && (
        <div className="pager">
          <p>Página {currentPage + 1} de {pageCount}</p>
          <div className="pager-pages">
            <button type="button" className="btn ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <button type="button" className="btn ghost" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </>
  )
}
