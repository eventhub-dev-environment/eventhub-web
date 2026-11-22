import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { Empty, Skeleton, Spinner } from '@/components/ui'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/store/auth'
import type { RegistrationFieldType } from '@/types/event'
import {
  FIELD_TYPES,
  draftFrom,
  emptyField,
  emptyOption,
  keyFromLabel,
  toRequest,
  validateDraft,
  type ConfigDraft,
  type FieldDraft,
} from './configDraft'
import { useTenantConfig } from './useTenantConfig'

export function TenantConfigPage() {
  const tenantId = useAuthStore((s) => s.activeTenantId)
  const { config, save } = useTenantConfig(tenantId)
  const [draft, setDraft] = useState<ConfigDraft | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!config.isSuccess) return
    setDraft(draftFrom(config.data))
  }, [config.isSuccess, config.data, config.dataUpdatedAt])

  if (!tenantId) {
    return <Empty title="Sin tenant activo" hint="Entra con la cuenta administradora del tenant para configurar la marca." />
  }

  const serverErrors = save.error instanceof ApiError ? save.error.fieldErrors : undefined
  const errorOf = (name: string) => clientErrors[name] || serverErrors?.[name]

  const patch = (next: Partial<ConfigDraft>) => {
    setDraft((current) => (current ? { ...current, ...next } : current))
    setClientErrors((current) => {
      const cleared = { ...current }
      for (const key of Object.keys(next)) delete cleared[key]
      return cleared
    })
    setNotice(null)
    save.reset()
  }

  const updateField = (uid: string, next: Partial<FieldDraft>) => {
    setDraft((current) => current && ({
      ...current,
      fields: current.fields.map((field) => (field.uid === uid ? { ...field, ...next } : field)),
    }))
    setNotice(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    const errors = validateDraft(draft)
    setClientErrors(errors)
    setNotice(null)
    if (Object.keys(errors).length > 0) return
    try {
      await save.mutateAsync(toRequest(tenantId, draft))
      setNotice('Configuración guardada.')
    } catch {
      /* el mensaje sale de save.error */
    }
  }

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="sliders" size={22} /></span>
          <div>
            <p className="eyebrow">Tenant</p>
            <h1>Configuración</h1>
            <p className="lede">Marca, colores, comisión y los datos que se piden al inscribirse.</p>
          </div>
        </div>
      </header>

      <div className="config-layout">
        {config.isLoading && <Skeleton h={420} />}
        {config.error instanceof Error && <div className="error" role="alert">{config.error.message}</div>}
        {draft && (
          <form className="panel" onSubmit={submit}>
            {config.data === null && <p className="hint">Todavía no hay configuración. Al guardar se crea.</p>}

            <div className="brand-preview" aria-hidden>
              <i style={{ background: draft.primaryColor || 'var(--line)' }} />
              <i style={{ background: draft.secondaryColor || 'var(--line)' }} />
              <strong>{draft.brandName.trim() || 'Tu marca'}</strong>
            </div>

            <div className="field">
              <input
                autoFocus
                placeholder=" "
                value={draft.brandName}
                aria-invalid={!!errorOf('brandName')}
                onChange={(event) => patch({ brandName: event.target.value })}
              />
              <label>Nombre de la marca</label>
            </div>
            {errorOf('brandName') && <p className="field-error">{errorOf('brandName')}</p>}

            <div className="color-grid">
              <ColorField
                label="Color primario"
                value={draft.primaryColor}
                error={errorOf('primaryColor')}
                onChange={(primaryColor) => patch({ primaryColor })}
              />
              <ColorField
                label="Color secundario"
                value={draft.secondaryColor}
                error={errorOf('secondaryColor')}
                onChange={(secondaryColor) => patch({ secondaryColor })}
              />
            </div>

            <div className="field">
              <input
                inputMode="decimal"
                placeholder=" "
                value={draft.commission}
                aria-invalid={!!errorOf('commission')}
                onChange={(event) => patch({ commission: event.target.value })}
              />
              <label>Comisión por transacción (%)</label>
            </div>
            {errorOf('commission') && <p className="field-error">{errorOf('commission')}</p>}
            <p className="hint">Porcentaje entre 0 y 100 que se aplica a cada venta.</p>

            <div className="schema-head">
              <div>
                <h2>Formulario de inscripción</h2>
                <p className="hint">Cada evento puede pedir estos datos al comprador.</p>
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => patch({ fields: [...draft.fields, emptyField()] })}
              >
                <Icon name="plus" />Agregar campo
              </button>
            </div>

            {draft.fields.length === 0 && (
              <p className="hint">Sin campos adicionales. La compra igual pide la información básica del evento.</p>
            )}

            <div className="schema-list">
              {draft.fields.map((field, index) => (
                <div key={field.uid} className="schema-card">
                  <div className="schema-card-head">
                    <h3>Campo {index + 1}</h3>
                    <button
                      type="button"
                      className="close-btn"
                      aria-label={`Quitar campo ${index + 1}`}
                      onClick={() => patch({ fields: draft.fields.filter((item) => item.uid !== field.uid) })}
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                  <div className="field">
                    <input
                      placeholder=" "
                      value={field.label}
                      aria-invalid={!!clientErrors[`label:${field.uid}`]}
                      onChange={(event) => updateField(field.uid, { label: event.target.value })}
                      onBlur={() => {
                        if (!field.key.trim() && field.label.trim()) updateField(field.uid, { key: keyFromLabel(field.label) })
                      }}
                    />
                    <label>Pregunta</label>
                  </div>
                  {clientErrors[`label:${field.uid}`] && <p className="field-error">{clientErrors[`label:${field.uid}`]}</p>}

                  <div className="schema-row">
                    <div className="field">
                      <input
                        className="mono"
                        placeholder=" "
                        value={field.key}
                        aria-invalid={!!clientErrors[`key:${field.uid}`]}
                        spellCheck={false}
                        onChange={(event) => updateField(field.uid, { key: event.target.value })}
                      />
                      <label>Identificador</label>
                    </div>
                    <label className="plain-field">
                      <span>Tipo de respuesta</span>
                      <select
                        value={field.type}
                        onChange={(event) => {
                          const type = event.target.value as RegistrationFieldType
                          updateField(field.uid, {
                            type,
                            options: type === 'ENUM' && field.options.length === 0 ? [emptyOption()] : field.options,
                          })
                        }}
                      >
                        {FIELD_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                      </select>
                    </label>
                  </div>
                  {clientErrors[`key:${field.uid}`] && <p className="field-error">{clientErrors[`key:${field.uid}`]}</p>}

                  <div className="switch-row">
                    <div>
                      <strong>Obligatorio</strong>
                      <p>El comprador no puede continuar sin responder.</p>
                    </div>
                    <button
                      type="button"
                      className="switch"
                      role="switch"
                      aria-checked={field.required}
                      aria-label={`Campo ${index + 1} obligatorio`}
                      onClick={() => updateField(field.uid, { required: !field.required })}
                    >
                      <span />
                    </button>
                  </div>

                  {field.type === 'ENUM' && (
                    <div className="option-list">
                      <p className="hint">El comprador ve el texto. El valor es lo que queda guardado.</p>
                      {field.options.map((option, optionIndex) => (
                        <div key={option.uid} className="option-row">
                          <input
                            aria-label={`Texto de la opción ${optionIndex + 1}`}
                            placeholder="Texto visible"
                            value={option.label}
                            onChange={(event) => updateField(field.uid, {
                              options: field.options.map((item) => item.uid === option.uid ? { ...item, label: event.target.value } : item),
                            })}
                            onBlur={() => {
                              if (!option.value.trim() && option.label.trim()) {
                                updateField(field.uid, {
                                  options: field.options.map((item) => item.uid === option.uid ? { ...item, value: keyFromLabel(option.label) } : item),
                                })
                              }
                            }}
                          />
                          <input
                            className="mono"
                            aria-label={`Valor de la opción ${optionIndex + 1}`}
                            placeholder="Valor"
                            value={option.value}
                            spellCheck={false}
                            onChange={(event) => updateField(field.uid, {
                              options: field.options.map((item) => item.uid === option.uid ? { ...item, value: event.target.value } : item),
                            })}
                          />
                          <button
                            type="button"
                            className="close-btn"
                            aria-label={`Quitar opción ${optionIndex + 1}`}
                            onClick={() => updateField(field.uid, { options: field.options.filter((item) => item.uid !== option.uid) })}
                          >
                            <Icon name="x" />
                          </button>
                        </div>
                      ))}
                      {clientErrors[`options:${field.uid}`] && <p className="field-error">{clientErrors[`options:${field.uid}`]}</p>}
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => updateField(field.uid, { options: [...field.options, emptyOption()] })}
                      >
                        <Icon name="plus" />Agregar opción
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {notice && <p className="note" role="status">{notice}</p>}
            {save.error instanceof Error && !serverErrors && (
              <div className="error" role="alert">{save.error.message}</div>
            )}

            <button className="btn" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              Guardar
            </button>
          </form>
        )}
      </div>
    </>
  )
}

function ColorField({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const swatch = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#6D5DFC'
  return (
    <div className="color-field">
      <input type="color" aria-label={label} value={swatch} onChange={(event) => onChange(event.target.value.toUpperCase())} />
      <div>
        <div className="field">
          <input
            className="mono"
            placeholder=" "
            value={value}
            spellCheck={false}
            aria-invalid={!!error}
            onChange={(event) => onChange(event.target.value)}
          />
          <label>{label}</label>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    </div>
  )
}
