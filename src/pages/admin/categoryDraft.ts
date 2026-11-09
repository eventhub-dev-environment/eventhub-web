import type { Category, CreateCategoryRequest } from '@/types/event'

/** Estado editable de la ficha. No conoce HTTP ni React. */
export interface CategoryDraft {
  name: string
  description: string
  active: boolean
}

export const emptyDraft = (): CategoryDraft => ({ name: '', description: '', active: true })

export function draftFrom(category: Category): CategoryDraft {
  return {
    name: category.name,
    description: category.description ?? '',
    active: category.active !== false,
  }
}

export function toRequest(draft: CategoryDraft): CreateCategoryRequest {
  const description = draft.description.trim()
  return {
    name: draft.name.trim(),
    description: description || undefined,
    active: draft.active,
  }
}

/** El back exige nombre con @NotBlank. El resto es opcional. */
export function validateDraft(draft: CategoryDraft): Record<string, string> {
  if (draft.name.trim()) return {}
  return { name: 'El nombre es obligatorio' }
}
