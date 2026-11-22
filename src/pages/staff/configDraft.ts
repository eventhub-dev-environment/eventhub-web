import type { CustomField, TenantConfig } from '@/types/config'
import type { RegistrationFieldType } from '@/types/event'

const HEX = /^#[0-9A-Fa-f]{6}$/
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9]{0,40}$/

export const FIELD_TYPES: { id: RegistrationFieldType; label: string }[] = [
  { id: 'TEXT', label: 'Texto' },
  { id: 'NUMBER', label: 'Número' },
  { id: 'ENUM', label: 'Lista de opciones' },
  { id: 'BOOLEAN', label: 'Sí o no' },
]

export interface OptionDraft {
  uid: string
  label: string
  value: string
}

export interface FieldDraft {
  uid: string
  key: string
  label: string
  type: RegistrationFieldType
  required: boolean
  options: OptionDraft[]
}

export interface ConfigDraft {
  brandName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  commission: string
  fields: FieldDraft[]
}

const uid = () => crypto.randomUUID()

export const emptyOption = (): OptionDraft => ({ uid: uid(), label: '', value: '' })

export const emptyField = (): FieldDraft => ({
  uid: uid(),
  key: '',
  label: '',
  type: 'TEXT',
  required: false,
  options: [],
})

export const emptyDraft = (): ConfigDraft => ({
  brandName: '',
  logoUrl: '',
  primaryColor: '#6D5DFC',
  secondaryColor: '#FF5C8A',
  commission: '0',
  fields: [],
})

export function draftFrom(config: TenantConfig | null): ConfigDraft {
  if (!config) return emptyDraft()
  return {
    brandName: config.brandName ?? '',
    logoUrl: config.logoUrl ?? '',
    primaryColor: config.primaryColor ?? '',
    secondaryColor: config.secondaryColor ?? '',
    commission: config.transactionCommission == null ? '' : String(config.transactionCommission),
    fields: (config.formSchema ?? []).map(fieldFrom),
  }
}

function fieldFrom(field: CustomField): FieldDraft {
  return {
    uid: uid(),
    key: field.key ?? '',
    label: field.label ?? '',
    type: field.type ?? 'TEXT',
    required: field.required === true,
    options: (field.options ?? []).map((option) => ({
      uid: uid(),
      label: option.label ?? '',
      value: option.value ?? '',
    })),
  }
}

/** Identificador estable a partir de la pregunta, si la persona no escribió uno. */
export function keyFromLabel(label: string): string {
  const words = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-zA-Z0-9]+/g) ?? []
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

export function validateDraft(draft: ConfigDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!draft.brandName.trim()) errors.brandName = 'El nombre de la marca es obligatorio'
  if (draft.primaryColor && !HEX.test(draft.primaryColor.trim())) {
    errors.primaryColor = 'Usa un color como #0055FF'
  }
  if (draft.secondaryColor && !HEX.test(draft.secondaryColor.trim())) {
    errors.secondaryColor = 'Usa un color como #FF3300'
  }
  const commission = draft.commission.trim().replace(',', '.')
  if (!commission) errors.commission = 'La comisión es obligatoria'
  else {
    const value = Number(commission)
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.commission = 'Debe estar entre 0 y 100'
  }

  const seen = new Set<string>()
  for (const field of draft.fields) {
    if (!field.label.trim()) errors[`label:${field.uid}`] = 'La pregunta es obligatoria'
    const key = field.key.trim()
    if (!key) errors[`key:${field.uid}`] = 'El identificador es obligatorio'
    else if (!FIELD_KEY.test(key)) errors[`key:${field.uid}`] = 'Empieza con una letra y usa solo letras y números'
    else if (seen.has(key)) errors[`key:${field.uid}`] = 'Este identificador ya está en uso'
    else seen.add(key)
    if (field.type === 'ENUM' && !field.options.some((option) => option.label.trim() && option.value.trim())) {
      errors[`options:${field.uid}`] = 'Agrega al menos una opción con texto y valor'
    }
  }
  return errors
}

export function toRequest(tenantId: string, draft: ConfigDraft): TenantConfig {
  const primary = draft.primaryColor.trim()
  const secondary = draft.secondaryColor.trim()
  const logo = draft.logoUrl.trim()
  return {
    tenantId,
    brandName: draft.brandName.trim(),
    logoUrl: logo || undefined,
    primaryColor: primary || undefined,
    secondaryColor: secondary || undefined,
    transactionCommission: Number(draft.commission.trim().replace(',', '.')),
    formSchema: draft.fields.map((field) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required,
      options: field.type === 'ENUM'
        ? field.options
          .filter((option) => option.label.trim() && option.value.trim())
          .map((option) => ({ label: option.label.trim(), value: option.value.trim() }))
        : undefined,
    })),
  }
}
