import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { hasTenantRole, selectIsAuthenticated, useAuthStore } from '@/store/auth'
import type { GlobalRole, TenantRole } from '@/types/auth'

export function RequireAuth() {
  const isAuth = useAuthStore(selectIsAuthenticated)
  const location = useLocation()
  return isAuth ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function RequireGlobalRole({ role }: { role: GlobalRole }) {
  const ok = useAuthStore((s) => s.roles.includes(role))
  return ok ? <Outlet /> : <Navigate to="/" replace />
}

export function RequireTenantRole({ roles }: { roles: TenantRole[] }) {
  const ok = useAuthStore((s) => hasTenantRole(s, ...roles))
  return ok ? <Outlet /> : <Navigate to="/" replace />
}
