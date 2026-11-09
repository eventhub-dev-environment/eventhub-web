import type { GrantTenantRolesRequest, TenantRole } from '@/types/auth'

/** Tenant de la carrera. El admin puede cambiarlo si asigna otro. */
export const DEFAULT_TENANT_ID = 'carrera-tulua-2026'

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TENANT_ID = /^[a-z0-9-]{3,50}$/

export interface RoleDraft {
  userId: string
  tenantId: string
  role: TenantRole
}

export const emptyRoleDraft = (): RoleDraft => ({
  userId: '',
  tenantId: DEFAULT_TENANT_ID,
  role: 'TENANT_ADMIN',
})

export function validateRoleDraft(draft: RoleDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  const userId = draft.userId.trim()
  if (!userId) errors.userId = 'Pega el userId del JWT'
  else if (!USER_ID.test(userId)) errors.userId = 'Tiene que ser el UUID del claim userId'
  const tenantId = draft.tenantId.trim()
  if (!tenantId) errors.tenantId = 'El tenant es obligatorio'
  else if (!TENANT_ID.test(tenantId)) errors.tenantId = 'Solo minúsculas, números y guiones (3 a 50)'
  return errors
}

export function toGrant(draft: RoleDraft): { userId: string; body: GrantTenantRolesRequest } {
  return {
    userId: draft.userId.trim(),
    body: { tenantId: draft.tenantId.trim(), roles: [draft.role] },
  }
}
