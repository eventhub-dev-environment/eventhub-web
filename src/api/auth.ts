import { request } from '@/lib/http'
import type { AuthResponse, GrantTenantRolesRequest, LoginRequest, RegisterRequest } from '@/types/auth'

const P = '/api/v1/auth'
export const authApi = {
  register: (body: RegisterRequest) => request<AuthResponse>(`${P}/register`, { method: 'POST', body }),
  login: (body: LoginRequest) => request<AuthResponse>(`${P}/login`, { method: 'POST', body }),
  // PLATFORM_ADMIN
  grantTenantRoles: (userId: string, body: GrantTenantRolesRequest) =>
    request<void>(`${P}/admin/users/${userId}/tenant-roles`, { method: 'PUT', body }),
  removeTenantRoles: (userId: string, tenantId: string) =>
    request<void>(`${P}/admin/users/${userId}/tenant-roles/${tenantId}`, { method: 'DELETE' }),
}
