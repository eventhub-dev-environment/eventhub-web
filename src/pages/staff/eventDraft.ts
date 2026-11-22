import type { CreateEventRequest, RegistrationField, TicketTier } from '@/types/event'
import type { CustomField } from '@/types/config'

/** Topes del alta. El evento no se puede editar después de publicarlo. */
export const TEXT_LIMIT = {
  title: 120,
  description: 2000,
  location: 160,
  tierName: 80,
} as const

export interface TierDraft {
  id: string
  name: string
  price: string
  capacity: string
}

export interface EventDraft {
  title: string
  description: string
  categoryId: string
  eventDate: string
  location: string
  copyRegistration: boolean
  tiers: TierDraft[]
}

export const emptyTier = (): TierDraft => ({
  id: crypto.randomUUID(),
  name: '',
  price: '',
  capacity: '',
})

export const emptyEventDraft = (): EventDraft => ({
  title: '',
  description: '',
  categoryId: '',
  eventDate: '',
  location: '',
  copyRegistration: false,
  tiers: [emptyTier()],
})

/** El servicio guarda la fecha sin zona. El valor del input ya viene en hora local. */
export function toEventDate(value: string): string {
  return value.length === 16 ? `${value}:00` : value
}

export function isFutureDate(value: string): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
}

export function registrationFromSchema(fields: CustomField[]): RegistrationField[] {
  return fields
    .filter((field) => field.key.trim() && field.label.trim())
    .filter((field) => field.type !== 'ENUM' || (field.options ?? []).some((option) => option.label.trim() && option.value.trim()))
    .map((field) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required === true,
      ...(field.type === 'ENUM'
        ? { options: (field.options ?? []).filter((option) => option.label.trim() && option.value.trim()) }
        : {}),
    }))
}

export function validateEventDraft(draft: EventDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!draft.title.trim()) errors.title = 'El título es obligatorio'
  else if (draft.title.length > TEXT_LIMIT.title) errors.title = `Máximo ${TEXT_LIMIT.title} caracteres`
  if (!draft.categoryId) errors.categoryId = 'Elige una categoría'
  if (!draft.eventDate) errors.eventDate = 'La fecha es obligatoria'
  else if (!isFutureDate(draft.eventDate)) errors.eventDate = 'La fecha tiene que ser posterior a este momento'
  if (draft.description.length > TEXT_LIMIT.description) errors.description = `Máximo ${TEXT_LIMIT.description} caracteres`
  if (!draft.location.trim()) errors.location = 'La ubicación es obligatoria'
  else if (draft.location.length > TEXT_LIMIT.location) errors.location = `Máximo ${TEXT_LIMIT.location} caracteres`
  if (draft.tiers.length === 0) errors.tiers = 'Agrega al menos una tarifa'

  for (const tier of draft.tiers) {
    if (!tier.name.trim()) errors[`name:${tier.id}`] = 'El nombre de la tarifa es obligatorio'
    else if (tier.name.length > TEXT_LIMIT.tierName) errors[`name:${tier.id}`] = `Máximo ${TEXT_LIMIT.tierName} caracteres`
    const price = Number(tier.price.trim().replace(',', '.'))
    if (!tier.price.trim() || !Number.isFinite(price) || price < 0) errors[`price:${tier.id}`] = 'El precio no puede ser negativo'
    const capacity = Number(tier.capacity.trim())
    if (!Number.isInteger(capacity) || capacity < 1) errors[`capacity:${tier.id}`] = 'La capacidad tiene que ser un entero mayor que cero'
  }
  return errors
}

export function toCreateRequest(
  draft: EventDraft,
  registrationFields: RegistrationField[] | undefined,
): CreateEventRequest {
  const description = draft.description.trim()
  const tiers: TicketTier[] = draft.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name.trim(),
    price: Number(tier.price.trim().replace(',', '.')),
    capacity: Number(tier.capacity.trim()),
    inventoryMode: 'GENERAL_ADMISSION',
  }))
  return {
    title: draft.title.trim(),
    description: description || undefined,
    categoryId: draft.categoryId,
    eventDate: toEventDate(draft.eventDate),
    location: draft.location.trim(),
    status: 'PUBLISHED',
    ticketTiers: tiers,
    registrationFields: draft.copyRegistration && registrationFields?.length ? registrationFields : undefined,
  }
}
