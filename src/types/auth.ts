export type GlobalRole = 'PLATFORM_ADMIN' | 'CUSTOMER'
export type TenantRole = 'TENANT_ADMIN' | 'EVENT_ORGANIZER'

export interface TenantRoleAssignment {
  tenantId: string
  role: TenantRole
}

export interface RegisterRequest {
  email: string
  password: string // mín. 6
  firstName: string
  lastName: string
}

export interface LoginRequest {
  email: string
  password: string
}

/** Respuesta directa (sin ApiResponse) de /auth/login y /auth/register. */
export interface AuthResponse {
  token: string
  type: 'Bearer'
  email: string
  roles: GlobalRole[]
  tenantRoles: TenantRoleAssignment[]
}

export interface GrantTenantRolesRequest {
  tenantId: string // ^[a-z0-9-]+$, 3–50
  roles: TenantRole[]
}
