import { request } from '@/lib/http'
import type { TenantConfig } from '@/types/config'

export const configsApi = {
  /** Requiere TENANT_ADMIN del tenant (o PLATFORM_ADMIN). */
  get: (tenantId: string) => request<TenantConfig>(`/api/v1/configs/${tenantId}`, { tenantId }),
  save: (body: TenantConfig) => request<TenantConfig>('/api/v1/configs', { method: 'POST', body, tenantId: body.tenantId }),
}
