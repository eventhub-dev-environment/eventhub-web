import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/events'
import { Icon } from '@/components/Icon'
import { Empty, Spinner } from '@/components/ui'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/store/auth'
import type { EventDto } from '@/types/event'
import {
  emptyEventDraft,
  emptyTier,
  registrationFromSchema,
  TEXT_LIMIT,
  toCreateRequest,
  validateEventDraft,
  type EventDraft,
  type TierDraft,
} from './eventDraft'
import { useStaffEvents } from './useStaffEvents'
import { useTenantConfig } from './useTenantConfig'

/** Tope de Spring Boot (`spring.servlet.multipart.max-file-size`, 1 MB) para logo y banner. */
const MAX_IMAGE_BYTES = 1024 * 1024
const MAX_IMAGE_LABEL = '1 MB'

function imageTooBigMessage() {
  return `El archivo supera el máximo de ${MAX_IMAGE_LABEL}.`
}

function uploadFailure(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const tooBig = /maximum upload size/i.test(message) || (error instanceof ApiError && error.status === 413)
  if (tooBig) return imageTooBigMessage()
  return message || 'No se pudo subir la imagen'
}

function UploadCard({
  kind,
  src,
  pending,
  busy,
  onFile,
  onRemove,
}: {
  kind: 'logo' | 'banner'
  src?: string
  pending: boolean
  busy: boolean
  onFile: (file: File | undefined) => void
  onRemove: () => void
}) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  const noun = kind === 'logo' ? 'logo' : 'banner'
  const title = kind === 'logo' ? 'Logo' : 'Banner'
  const action = pending ? `Subiendo ${noun}…` : src ? `Cambiar ${noun} · máx. ${MAX_IMAGE_LABEL}` : `Subir ${noun} · máx. ${MAX_IMAGE_LABEL}`

  return (
    <div className="upload-card">
      <h3>{title}</h3>
      {src && !broken ? (
        <img
          src={src}
          alt={kind === 'logo' ? 'Logo del evento' : 'Banner del evento'}
          className={kind === 'logo' ? 'is-logo' : 'is-banner'}
          onError={() => setBroken(true)}
        />
      ) : (
        <p className="hint">{broken ? 'No se pudo mostrar la imagen.' : `Todavía no tiene ${noun}.`}</p>
      )}
      <div className="staff-actions">
        <label className={`btn ghost${busy ? ' is-disabled' : ''}`}>
          {action}
          <input
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = '' }}
          />
        </label>
        {src && (
          <button type="button" className="btn ghost danger" disabled={busy} onClick={onRemove}>
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}

function LimitedText({
  label,
  value,
  max,
  error,
  multiline,
  onChange,
}: {
  label: string
  value: string
  max: number
  error?: string
  multiline?: boolean
  onChange: (value: string) => void
}) {
  return (
    <>
      <label className="plain-field">
        <span>{label}<em data-full={value.length >= max || undefined}>{value.length}/{max}</em></span>
        {multiline ? (
          <textarea rows={4} maxLength={max} value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <input maxLength={max} value={value} aria-invalid={!!error} onChange={(event) => onChange(event.target.value)} />
        )}
      </label>
      {error && <p className="field-error">{error}</p>}
    </>
  )
}

export function NewEventPage() {
  const tenantId = useAuthStore((s) => s.activeTenantId)
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const config = useTenantConfig(tenantId)
  const { create, upload, removeImage } = useStaffEvents(tenantId)
  const [draft, setDraft] = useState<EventDraft>(emptyEventDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const [published, setPublished] = useState<EventDto | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Partial<Record<'logo' | 'banner', string>>>({})
  const [removeKind, setRemoveKind] = useState<'logo' | 'banner' | null>(null)

  const schema = registrationFromSchema(config.config.data?.formSchema ?? [])
  const schemaDenied = config.config.error instanceof ApiError && config.config.error.status === 403
  const categoryName = categories.data?.find((category) => category.id === draft.categoryId)?.name

  const patch = (next: Partial<EventDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
    setErrors((current) => {
      const cleared = { ...current }
      for (const key of Object.keys(next)) delete cleared[key]
      return cleared
    })
    create.reset()
  }

  const updateTier = (id: string, next: Partial<TierDraft>) => {
    setDraft((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === id ? { ...tier, ...next } : tier)),
    }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateEventDraft(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) setConfirm(true)
  }

  const publish = async () => {
    try {
      const created = await create.mutateAsync(toCreateRequest(draft, schema))
      setPublished(created)
      setConfirm(false)
    } catch {
      setConfirm(false)
    }
  }

  const showPreview = (kind: 'logo' | 'banner', file: File) => {
    const url = URL.createObjectURL(file)
    setPreviews((current) => {
      const previous = current[kind]
      if (previous) URL.revokeObjectURL(previous)
      return { ...current, [kind]: url }
    })
  }

  const clearPreview = (kind: 'logo' | 'banner') => {
    setPreviews((current) => {
      const previous = current[kind]
      if (previous) URL.revokeObjectURL(previous)
      const next = { ...current }
      delete next[kind]
      return next
    })
  }

  const sendFile = async (kind: 'logo' | 'banner', file: File | undefined) => {
    if (!published || !file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(imageTooBigMessage())
      return
    }
    setUploadError(null)
    showPreview(kind, file)
    try {
      const updated = await upload.mutateAsync({ id: published.id, kind, file })
      setPublished(updated)
      clearPreview(kind)
    } catch (error) {
      clearPreview(kind)
      setUploadError(uploadFailure(error))
    }
  }

  const confirmRemove = async () => {
    if (!published || !removeKind) return
    setUploadError(null)
    try {
      const updated = await removeImage.mutateAsync({ id: published.id, kind: removeKind })
      setPublished(updated)
      clearPreview(removeKind)
      setRemoveKind(null)
    } catch {
      setRemoveKind(null)
      setUploadError('No se pudo quitar la imagen.')
    }
  }

  const imageOf = (kind: 'logo' | 'banner') =>
    previews[kind] || (kind === 'logo' ? published?.branding?.logoUrl : published?.branding?.bannerUrl)

  if (!tenantId) {
    return <Empty title="Sin tenant activo" hint="Entra con la cuenta del administrador o del organizador del tenant." />
  }

  if (published) {
    return (
      <div className="config-layout">
        <section className="panel">
          <h2>Evento publicado</h2>
          <p className="hint">{published.title} ya está en el catálogo. El servicio no permite cambiar estos datos.</p>
          <p className="note" role="status">Si quieres, sube ahora el logo y el banner. Cada imagen puede pesar hasta {MAX_IMAGE_LABEL}.</p>
          <UploadCard
            kind="logo"
            src={imageOf('logo')}
            pending={upload.isPending && upload.variables?.kind === 'logo'}
            busy={upload.isPending || removeImage.isPending}
            onFile={(file) => { void sendFile('logo', file) }}
            onRemove={() => setRemoveKind('logo')}
          />
          <UploadCard
            kind="banner"
            src={imageOf('banner')}
            pending={upload.isPending && upload.variables?.kind === 'banner'}
            busy={upload.isPending || removeImage.isPending}
            onFile={(file) => { void sendFile('banner', file) }}
            onRemove={() => setRemoveKind('banner')}
          />
          {uploadError && <div className="error" role="alert">{uploadError}</div>}
          <Link to="/staff" className="btn">Volver al listado</Link>
        </section>
        {removeKind && createPortal(
          <div className="confirm-backdrop" onClick={() => { if (!removeImage.isPending) setRemoveKind(null) }}>
            <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="remove-image-title" onClick={(event) => event.stopPropagation()}>
              <h2 id="remove-image-title">Quitar {removeKind}</h2>
              <p>¿Seguro que quieres quitar el {removeKind}? Dejará de mostrarse en el evento.</p>
              <div className="confirm-actions">
                <button type="button" className="btn ghost" disabled={removeImage.isPending} onClick={() => setRemoveKind(null)}>Cancelar</button>
                <button type="button" className="btn" disabled={removeImage.isPending} onClick={() => { void confirmRemove() }}>
                  {removeImage.isPending && <Spinner />}
                  Quitar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      </div>
    )
  }

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="plus" size={22} /></span>
          <div>
            <p className="eyebrow">Staff</p>
            <h1>Nuevo evento</h1>
            <p className="lede">Se publica de una vez. Revisa categoría, fecha y tarifas.</p>
          </div>
        </div>
      </header>

      <div className="config-layout">
        <form className="panel" onSubmit={submit}>
          <Link to="/staff" className="text-link">Volver al listado</Link>

          <LimitedText
            label="Título"
            value={draft.title}
            max={TEXT_LIMIT.title}
            error={errors.title}
            onChange={(title) => patch({ title })}
          />

          <LimitedText
            label="Descripción"
            value={draft.description}
            max={TEXT_LIMIT.description}
            multiline
            error={errors.description}
            onChange={(description) => patch({ description })}
          />

          <label className="plain-field">
            <span>Categoría</span>
            <select value={draft.categoryId} aria-invalid={!!errors.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
              <option value="">Elige una categoría activa</option>
              {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
          {categories.data && categories.data.length === 0 && (
            <p className="hint">No hay categorías activas. El administrador de plataforma tiene que crear una antes de publicar.</p>
          )}

          <label className="plain-field">
            <span>Fecha y hora</span>
            <input type="datetime-local" value={draft.eventDate} aria-invalid={!!errors.eventDate} onChange={(event) => patch({ eventDate: event.target.value })} />
          </label>
          {errors.eventDate && <p className="field-error">{errors.eventDate}</p>}

          <LimitedText
            label="Lugar"
            value={draft.location}
            max={TEXT_LIMIT.location}
            error={errors.location}
            onChange={(location) => patch({ location })}
          />

          <div className="schema-head">
            <div>
              <h2>Tarifas</h2>
              <p className="hint">Cupo general. Cada tarifa necesita nombre, precio y capacidad.</p>
            </div>
            <button type="button" className="btn ghost" onClick={() => patch({ tiers: [...draft.tiers, emptyTier()] })}>
              <Icon name="plus" />Agregar tarifa
            </button>
          </div>
          {errors.tiers && <p className="field-error">{errors.tiers}</p>}

          <div className="schema-list">
            {draft.tiers.map((tier, index) => (
              <div key={tier.id} className="schema-card">
                <div className="schema-card-head">
                  <h3>Tarifa {index + 1}</h3>
                  {draft.tiers.length > 1 && (
                    <button
                      type="button"
                      className="close-btn"
                      aria-label={`Quitar tarifa ${index + 1}`}
                      onClick={() => patch({ tiers: draft.tiers.filter((item) => item.id !== tier.id) })}
                    >
                      <Icon name="x" />
                    </button>
                  )}
                </div>
                <LimitedText
                  label="Nombre"
                  value={tier.name}
                  max={TEXT_LIMIT.tierName}
                  error={errors[`name:${tier.id}`]}
                  onChange={(name) => updateTier(tier.id, { name })}
                />
                <label className="plain-field">
                  <span>Precio</span>
                  <input inputMode="decimal" value={tier.price} aria-invalid={!!errors[`price:${tier.id}`]} onChange={(event) => updateTier(tier.id, { price: event.target.value })} />
                </label>
                {errors[`price:${tier.id}`] && <p className="field-error">{errors[`price:${tier.id}`]}</p>}
                <label className="plain-field">
                  <span>Capacidad</span>
                  <input inputMode="numeric" value={tier.capacity} aria-invalid={!!errors[`capacity:${tier.id}`]} onChange={(event) => updateTier(tier.id, { capacity: event.target.value })} />
                </label>
                {errors[`capacity:${tier.id}`] && <p className="field-error">{errors[`capacity:${tier.id}`]}</p>}
              </div>
            ))}
          </div>

          {schema.length > 0 && (
            <div className="switch-row">
              <div>
                <strong>Pedir datos del asistente</strong>
                <p>{schema.map((field) => field.label).join(' · ')}</p>
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={draft.copyRegistration}
                aria-label="Pedir datos del asistente"
                onClick={() => patch({ copyRegistration: !draft.copyRegistration })}
              >
                <span />
              </button>
            </div>
          )}
          {schemaDenied && <p className="hint">Esta cuenta no puede consultar el formulario de inscripción. Lo define el administrador del tenant.</p>}
          {!schemaDenied && config.config.isSuccess && schema.length === 0 && (
            <p className="hint">No hay datos de asistente configurados. El evento se publica sin ellos.</p>
          )}

          {create.error instanceof Error && <div className="error" role="alert">{create.error.message}</div>}

          <button className="btn" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Publicar
          </button>
        </form>
      </div>

      {confirm && createPortal(
        <div className="confirm-backdrop" onClick={() => { if (!create.isPending) setConfirm(false) }}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="publish-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="publish-title">Publicar evento</h2>
            <p>
              ¿Seguro que quieres publicar «{draft.title.trim()}»
              {categoryName ? ` en ${categoryName}` : ''}? No se puede editar ni eliminar.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" disabled={create.isPending} onClick={() => setConfirm(false)}>Cancelar</button>
              <button type="button" className="btn" disabled={create.isPending} onClick={() => { void publish() }}>
                {create.isPending && <Spinner />}
                Publicar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
