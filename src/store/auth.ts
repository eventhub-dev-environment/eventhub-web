import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, GlobalRole, TenantRole, TenantRoleAssignment } from '@/types/auth'

interface AuthState {
  token: string | null
  email: string | null
  roles: GlobalRole[]
  tenantRoles: TenantRoleAssignment[]
  /** Tenant con el que se firman las operaciones de staff (header X-Tenant-ID). */
  activeTenantId: string | null
  setSession: (auth: AuthResponse) => void
  setActiveTenant: (tenantId: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      roles: [],
      tenantRoles: [],
      activeTenantId: null,
      setSession: (auth) =>
        set({
          token: auth.token,
          email: auth.email,
          roles: auth.roles,
          tenantRoles: auth.tenantRoles,
          activeTenantId: auth.tenantRoles[0]?.tenantId ?? null,
        }),
      setActiveTenant: (activeTenantId) => set({ activeTenantId }),
      logout: () => set({ token: null, email: null, roles: [], tenantRoles: [], activeTenantId: null }),
    }),
    { name: 'eventhub-auth' },
  ),
)

export const selectIsAuthenticated = (s: AuthState) => !!s.token
export const hasGlobalRole = (s: AuthState, role: GlobalRole) => s.roles.includes(role)
export const hasTenantRole = (s: AuthState, ...roles: TenantRole[]) =>
  s.roles.includes('PLATFORM_ADMIN') ||
  s.tenantRoles.some((t) => t.tenantId === s.activeTenantId && roles.includes(t.role))
