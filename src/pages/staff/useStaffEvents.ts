import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/api/events'
import type { CreateEventRequest } from '@/types/event'

export function useStaffEvents(tenantId: string | null) {
  const queryClient = useQueryClient()
  const events = useQuery({
    queryKey: ['events', 'tenant', tenantId],
    enabled: !!tenantId,
    queryFn: () => eventsApi.byTenant(tenantId!),
  })
  const create = useMutation({
    mutationFn: (body: CreateEventRequest) => eventsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
  const upload = useMutation({
    mutationFn: ({ id, kind, file }: { id: string; kind: 'logo' | 'banner'; file: File }) =>
      kind === 'logo' ? eventsApi.uploadLogo(id, file) : eventsApi.uploadBanner(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
  const removeImage = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'logo' | 'banner' }) =>
      kind === 'logo' ? eventsApi.removeLogo(id) : eventsApi.removeBanner(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })
  return { events, create, upload, removeImage }
}
