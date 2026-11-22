import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/api/events'
import type { CreateCategoryRequest } from '@/types/event'

const KEY = ['categories', 'all'] as const

/** Orquesta el catálogo de administración, activas e inactivas. */
export function useCategoryAdmin() {
  const queryClient = useQueryClient()
  const catalog = useQuery({ queryKey: KEY, queryFn: categoriesApi.manage })
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CreateCategoryRequest }) =>
      id ? categoriesApi.update(id, body) : categoriesApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
  return { catalog, save }
}
