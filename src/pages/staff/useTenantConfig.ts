import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { configsApi } from '@/api/configs'
import { ApiError } from '@/lib/http'
import type { TenantConfig } from '@/types/config'

/** La primera vez el tenant no tiene ficha: el 404 es un formulario vacío, no un fallo. */
export function useTenantConfig(tenantId: string | null) {
  const queryClient = useQueryClient()
  const config = useQuery({
    queryKey: ['tenant-config', tenantId],
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        return await configsApi.get(tenantId!)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
  const save = useMutation({
    mutationFn: (body: TenantConfig) => configsApi.save(body),
    onSuccess: (saved) => queryClient.setQueryData(['tenant-config', saved.tenantId], saved),
  })
  return { config, save }
}
