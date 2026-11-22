import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { bookingsApi } from '@/api/bookings'
import { eventsApi } from '@/api/events'
import { paymentsApi } from '@/api/payments'
import { Skeleton, Spinner } from '@/components/ui'
import { dateParts, money } from '@/lib/format'
import type { RegistrationField } from '@/types/event'

/** La columna de booking guarda el valor como texto de hasta 255 caracteres. */
const ANSWER_LIMIT = 255

export function EventDetailPage() {
  const { id = '' } = useParams()
  const { data: ev, isLoading } = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.byId(id) })
  const [tierId, setTierId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [answers, setAnswers] = useState<Record<string, string>[]>([{}])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const tiers = ev?.ticketTiers ?? []
  const tier = tiers.find((t) => t.id === tierId)
  const total = tier ? Math.round(tier.price * quantity * 100) / 100 : 0
  const fields = ev?.registrationFields ?? []

  useEffect(() => {
    setAnswers((current) => Array.from({ length: quantity }, (_, index) => current[index] ?? {}))
  }, [quantity])

  const buy = useMutation({
    mutationFn: async (attendeeData: Record<string, string>[] | undefined) => {
      if (!ev || !tier) throw new Error('Selecciona una tarifa')
      const booking = await bookingsApi.create({
        eventId: ev.id,
        ticketTierId: tier.id,
        quantity,
        totalPrice: total,
        attendeeData,
      })
      return paymentsApi.createCheckoutSession(booking.id)
    },
    onSuccess: (session) => window.location.assign(session.checkoutUrl),
  })

  const setAnswer = (index: number, key: string, value: string) => {
    setAnswers((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[`${index}:${key}`]
      return next
    })
    setFormError(null)
  }

  const reserve = () => {
    if (!tier) return
    const nextErrors = validateAnswers(fields, answers, quantity)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Completa los datos obligatorios de cada entrada.')
      return
    }
    setFormError(null)
    buy.mutate(toAttendeeData(fields, answers, quantity))
  }

  if (isLoading || !ev) return <Skeleton h={320} />
  const d = dateParts(ev.eventDate)
  const brand = { '--accent': ev.branding?.primaryColor, '--accent2': ev.branding?.secondaryColor } as React.CSSProperties

  return (
    <div style={brand}>
      <section className="cover">
        {ev.branding?.bannerUrl && <img src={ev.branding.bannerUrl} alt="" />}
        <div>
          <h1>{ev.title}</h1>
          <p className="meta">{d.long} · {ev.location}</p>
        </div>
      </section>

      <div className="detail">
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Sobre el evento</h2>
          <p>{ev.description || 'El organizador aún no agregó una descripción.'}</p>
          {ev.branding?.organizerName && <p style={{ color: 'var(--muted)' }}>Organiza {ev.branding.organizerName}</p>}

          {fields.length > 0 && (
            <section className="attendees">
              <h2 className="section-title">Datos de cada entrada</h2>
              <p className="hint">El organizador pide estos datos una vez por entrada.</p>
              {answers.slice(0, quantity).map((row, index) => (
                <div key={index} className="schema-card">
                  {quantity > 1 && <h3>Entrada {index + 1}</h3>}
                  {fields.map((field) => (
                    <AnswerField
                      key={field.key}
                      field={field}
                      value={row[field.key] ?? ''}
                      error={fieldErrors[`${index}:${field.key}`]}
                      onChange={(value) => setAnswer(index, field.key, value)}
                    />
                  ))}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="panel">
          <h2>Tus entradas</h2>
          {tiers.map((item) => (
            <button key={item.id} className="tier" aria-pressed={tierId === item.id} onClick={() => setTierId(item.id)}>
              <span><strong>{item.name}</strong></span>
              <span className="price">{money(item.price)}</span>
            </button>
          ))}
          <div className="stepper">
            <span>Cantidad</span>
            <div>
              <button onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Quitar una">−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((current) => current + 1)} aria-label="Agregar una">+</button>
            </div>
          </div>
          <div className="total"><span>Total</span><strong key={total}>{money(total)}</strong></div>
          {(formError || buy.error) && <div className="error" role="alert">{formError ?? (buy.error instanceof Error ? buy.error.message : 'No se pudo reservar')}</div>}
          <button className="btn" disabled={!tier || buy.isPending} onClick={reserve}>
            {buy.isPending && <Spinner />}Reservar y pagar
          </button>
          <small style={{ color: 'var(--muted)' }}>Tienes 10 minutos para completar el pago después de reservar.</small>
        </aside>
      </div>
    </div>
  )
}

function AnswerField({
  field,
  value,
  error,
  onChange,
}: {
  field: RegistrationField
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="plain-field">
        <span>
          {field.label}
          {(field.required || field.type === 'TEXT') && (
            <em data-full={field.type === 'TEXT' && value.length >= ANSWER_LIMIT || undefined}>
              {field.required && 'Obligatorio'}
              {field.required && field.type === 'TEXT' && ' · '}
              {field.type === 'TEXT' && `${value.length}/${ANSWER_LIMIT}`}
            </em>
          )}
        </span>
        {field.type === 'ENUM' ? (
          <select value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)}>
            <option value="">Elige una opción</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : field.type === 'BOOLEAN' ? (
          <select value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)}>
            <option value="">Elige una opción</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            inputMode={field.type === 'NUMBER' ? 'decimal' : undefined}
            maxLength={field.type === 'TEXT' ? ANSWER_LIMIT : undefined}
            value={value}
            aria-invalid={!!error}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </label>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function validateAnswers(fields: RegistrationField[], answers: Record<string, string>[], quantity: number) {
  const errors: Record<string, string> = {}
  for (let index = 0; index < quantity; index += 1) {
    const row = answers[index] ?? {}
    for (const field of fields) {
      const value = (row[field.key] ?? '').trim()
      const id = `${index}:${field.key}`
      if (!value) {
        if (field.required) errors[id] = 'Este dato es obligatorio'
        continue
      }
      if (field.type === 'TEXT' && value.length > ANSWER_LIMIT) errors[id] = `Máximo ${ANSWER_LIMIT} caracteres`
      if (field.type === 'NUMBER' && !Number.isFinite(Number(value.replace(',', '.')))) errors[id] = 'Tiene que ser un número'
      if (field.type === 'ENUM' && !(field.options ?? []).some((option) => option.value === value)) errors[id] = 'Elige una opción de la lista'
      if (field.type === 'BOOLEAN' && value !== 'true' && value !== 'false') errors[id] = 'Elige sí o no'
    }
  }
  return errors
}

function toAttendeeData(fields: RegistrationField[], answers: Record<string, string>[], quantity: number) {
  if (fields.length === 0) return undefined
  const rows = answers.slice(0, quantity).map((row) => {
    const clean: Record<string, string> = {}
    for (const field of fields) {
      const value = (row[field.key] ?? '').trim()
      if (!value) continue
      clean[field.key] = field.type === 'NUMBER' ? value.replace(',', '.') : value
    }
    return clean
  })
  const hasValue = rows.some((row) => Object.keys(row).length > 0)
  const hasRequired = fields.some((field) => field.required)
  return hasValue || hasRequired ? rows : undefined
}
