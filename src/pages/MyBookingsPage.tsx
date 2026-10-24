import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import { notificationsApi } from '@/api/notifications'
import { Empty, Skeleton, StatusBadge } from '@/components/ui'
import { money } from '@/lib/format'
import { useAuthStore } from '@/store/auth'

/** AuthResponse no trae el userId: se lee del claim `userId` del JWT. */
function userIdFromToken(token: string | null): string | null {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).userId ?? null
  } catch {
    return null
  }
}

export function MyBookingsPage() {
  const userId = userIdFromToken(useAuthStore((s) => s.token))
  const bookings = useQuery({ queryKey: ['bookings', userId], queryFn: () => bookingsApi.byUser(userId!), enabled: !!userId })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.mine })

  return (
    <>
      <h1 style={{ fontSize: '2.6rem' }}>Mis reservas</h1>
      <div style={{ marginTop: 24 }}>
        {bookings.isLoading && <Skeleton h={80} />}
        {bookings.data?.length === 0 && <Empty title="Aún no tienes reservas" hint="Cuando compres entradas aparecerán aquí." />}
        {bookings.data?.map((b, i) => (
          <div key={b.id} className="row" style={{ '--i': i } as React.CSSProperties}>
            <div><strong>{b.quantity} {b.quantity === 1 ? 'entrada' : 'entradas'}</strong><p>{money(b.totalPrice)}</p></div>
            <StatusBadge status={b.status} />
          </div>
        ))}
      </div>
      <h2 className="section-title">Notificaciones</h2>
      {notifications.data?.length === 0 && <Empty title="Sin notificaciones" />}
      {notifications.data?.map((n, i) => (
        <div key={n.id} className="row" style={{ '--i': i } as React.CSSProperties}>
          <div><strong>{n.subject}</strong><p>{n.message}</p></div>
        </div>
      ))}
    </>
  )
}
