/** Envoltorio usado por event, booking y payment (ApiResponse<T>). */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
  timestamp: string
}

/** Auth devuelve RFC 7807 ProblemDetail, con invalidFields en validaciones. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  invalidFields?: Record<string, string>
}
