import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import type { GrantTenantRolesRequest } from '@/types/auth'

/** Asigna un rol de tenant. El back suma el rol; no hay listado por correo. */
export function useRoleAdmin() {
  const grant = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: GrantTenantRolesRequest }) =>
      authApi.grantTenantRoles(userId, body),
  })
  return { grant }
}
