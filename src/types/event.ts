export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
export type InventoryMode = 'GENERAL_ADMISSION' | 'RESERVED_SEATING'
export type RegistrationFieldType = 'TEXT' | 'NUMBER' | 'ENUM' | 'BOOLEAN'

export interface Category {
  id: string
  name: string
  description?: string
  active: boolean
}
export interface CreateCategoryRequest {
  name: string
  description?: string
  active?: boolean
}

export interface SeatDefinition {
  seatId: string
  section: string
  row: string
  number: string
  accessible: boolean
}

export interface TicketTier {
  id: string
  name: string
  price: number
  capacity: number
  inventoryMode: InventoryMode
  seats?: SeatDefinition[]
}

export interface EventSession {
  id: string
  name: string
  startsAt: string // OffsetDateTime ISO
  endsAt: string
  ticketTiers?: TicketTier[]
}

export interface RegistrationFieldOption {
  label: string
  value: string
}
export interface RegistrationField {
  key: string
  label: string
  type: RegistrationFieldType
  required: boolean
  options?: RegistrationFieldOption[]
}

export interface EventBranding {
  logoUrl?: string
  bannerUrl?: string
  primaryColor?: string // #RRGGBB
  secondaryColor?: string
  supportEmail?: string
  organizerName?: string
}

export interface EventDto {
  id: string
  tenantId: string
  eventType?: string
  title: string
  description?: string
  categoryId: string
  eventDate: string // LocalDateTime ISO, sin zona
  location: string
  status: EventStatus
  ticketTiers?: TicketTier[]
  sessions?: EventSession[]
  registrationFields?: RegistrationField[]
  branding?: EventBranding
  createdAt: string
  updatedAt: string
}

/** El tenantId NO va en el body: viaja en el header X-Tenant-ID. */
export interface CreateEventRequest {
  title: string
  description?: string
  categoryId: string
  eventDate: string // @Future
  location: string
  status?: EventStatus
  eventType?: string // máx. 50
  ticketTiers?: Omit<TicketTier, 'id'>[]
  sessions?: Omit<EventSession, 'id'>[]
  registrationFields?: RegistrationField[]
  branding?: EventBranding
}
