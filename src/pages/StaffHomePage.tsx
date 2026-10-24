import { useAuthStore } from '@/store/auth'

// TODO: eventos del tenant (eventsApi.byTenant), crear evento, subir branding,
// validar tickets (bookingsApi.validateTicket) y, si TENANT_ADMIN, configsApi.
export function StaffHomePage() {
  const tenant = useAuthStore((s) => s.activeTenantId)
  return <h1 style={{ fontSize: '2.4rem' }}>Panel de {tenant}</h1>
}
