import type { RegistrationFieldOption, RegistrationFieldType } from './event'

export interface CustomField {
  key: string
  label: string
  type: RegistrationFieldType
  required: boolean
  options?: RegistrationFieldOption[]
}

/** /configs devuelve el objeto directo, sin ApiResponse. Requiere TENANT_ADMIN. */
export interface TenantConfig {
  id?: string
  tenantId: string // ^[a-z0-9-]+$, 3–50
  brandName: string
  logoUrl?: string
  primaryColor?: string // #RRGGBB
  secondaryColor?: string
  transactionCommission: number // 0–100
  formSchema?: CustomField[]
}
