import { useAuthStore } from '@/store/auth'
import type { ApiResponse, ProblemDetail } from '@/types/common'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  formData?: FormData
  /** Sobrescribe el tenant activo (header X-Tenant-ID). */
  tenantId?: string
  query?: Record<string, string>
}

/** Normaliza los 3 formatos de error del backend: ProblemDetail, ApiResponse y el JSON por defecto de Spring. */
async function toApiError(res: Response): Promise<ApiError> {
  let body: (ProblemDetail & Partial<ApiResponse<unknown>> & { error?: string; message?: string }) | null = null
  try {
    body = await res.json()
  } catch {
    /* el gateway responde 401/403 sin cuerpo */
  }
  const fallback: Record<number, string> = {
    401: 'Tu sesión expiró o no es válida.',
    403: 'No tienes permisos para esta acción.',
    404: 'No encontrado.',
    409: 'Conflicto: los datos cambiaron, actualiza e inténtalo de nuevo.',
    503: 'Servicio no disponible, inténtalo en un momento.',
  }
  const message = body?.detail ?? body?.message ?? body?.title ?? fallback[res.status] ?? `Error ${res.status}`
  return new ApiError(res.status, message, body?.invalidFields)
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { token, activeTenantId, logout } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const tenant = opts.tenantId ?? activeTenantId
  if (tenant) headers['X-Tenant-ID'] = tenant
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const qs = opts.query ? `?${new URLSearchParams(opts.query)}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  })

  // El gateway valida el token contra auth en cada request: 401 = sesión inválida o permisos cambiados.
  if (res.status === 401 && token && !path.startsWith('/api/v1/auth/')) logout()
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Para endpoints que responden ApiResponse<T>: devuelve directamente `data`. */
export async function requestData<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await request<ApiResponse<T>>(path, opts)
  return res.data as T
}
