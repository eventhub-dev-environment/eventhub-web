import type { BookingStatus } from '@/types/booking'

export const Spinner = () => <span className="spinner" aria-hidden />

export const Skeleton = ({ h = 120 }: { h?: number }) => <div className="skeleton" style={{ height: h }} />

const STATUS: Record<BookingStatus, [string, string]> = {
  PENDING_PAYMENT: ['Pendiente de pago', 'warn'],
  CONFIRMED: ['Confirmada', 'ok'],
  CANCELLATION_REQUESTED: ['Cancelación solicitada', 'warn'],
  CANCELLATION_REVIEW_REQUIRED: ['Cancelación en revisión', 'warn'],
  CANCELLED: ['Cancelada', 'bad'],
  EXPIRED: ['Expirada', 'bad'],
  PAYMENT_REVIEW_REQUIRED: ['Pago en revisión', 'warn'],
}
export const StatusBadge = ({ status }: { status: BookingStatus }) => (
  <span className={`badge ${STATUS[status][1]}`}>{STATUS[status][0]}</span>
)

export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="empty"><strong>{title}</strong>{hint && <p>{hint}</p>}</div>
)

/** Spotlight que sigue el cursor: expone --mx/--my al CSS. */
export const spotlight = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}
