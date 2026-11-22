import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import { Spinner } from '@/components/ui'
import { ApiError } from '@/lib/http'
import type { TenantRole } from '@/types/auth'
import { emptyRoleDraft, toGrant, validateRoleDraft, type RoleDraft } from './roleDraft'
import { useRoleAdmin } from './useRoleAdmin'

const ROLES: { id: TenantRole; title: string; hint: string }[] = [
  {
    id: 'TENANT_ADMIN',
    title: 'Administrador del tenant',
    hint: 'Configura la carrera y el equipo.',
  },
  {
    id: 'EVENT_ORGANIZER',
    title: 'Organizador',
    hint: 'Publica eventos y valida entradas.',
  },
]

export function RolesPage() {
  const { grant } = useRoleAdmin()
  const [draft, setDraft] = useState<RoleDraft>(emptyRoleDraft)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  const serverErrors = grant.error instanceof ApiError ? grant.error.fieldErrors : undefined
  const userError = clientErrors.userId || serverErrors?.userId
  const tenantError = clientErrors.tenantId || serverErrors?.tenantId

  const patch = (next: Partial<RoleDraft>) => {
    setDraft((current) => ({ ...current, ...next }))
    setClientErrors((current) => {
      const cleared = { ...current }
      for (const key of Object.keys(next)) delete cleared[key]
      return cleared
    })
    setNotice(null)
    grant.reset()
  }

  const roleName = ROLES.find((option) => option.id === draft.role)?.title ?? draft.role

  useEffect(() => {
    if (!confirm) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !grant.isPending) setConfirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, grant.isPending])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateRoleDraft(draft)
    setClientErrors(errors)
    setNotice(null)
    if (Object.keys(errors).length > 0) return
    setConfirm(true)
  }

  const assign = async () => {
    const payload = toGrant(draft)
    try {
      await grant.mutateAsync(payload)
      setConfirm(false)
      setNotice(`${roleName} asignado.`)
      setDraft((current) => ({ ...current, userId: '' }))
    } catch {
      setConfirm(false)
    }
  }

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="shield" size={22} /></span>
          <div>
            <p className="eyebrow">Plataforma</p>
            <h1>Roles</h1>
            <p className="lede">Asigna un rol de tenant pegando el userId. No hay búsqueda por correo.</p>
          </div>
        </div>
      </header>

      <div className="roles-layout">
        <form className="panel" onSubmit={submit}>
          <h2>Asignar rol</h2>
          <p className="hint">El userId sale del claim <code>userId</code> del JWT, después de que la persona inicia sesión.</p>

          <div className="field">
            <input
              className="mono"
              autoFocus
              placeholder=" "
              spellCheck={false}
              autoComplete="off"
              value={draft.userId}
              aria-invalid={!!userError}
              onChange={(event) => patch({ userId: event.target.value })}
            />
            <label>userId</label>
          </div>
          {userError && <p className="field-error">{userError}</p>}

          <div className="field">
            <input
              className="mono"
              placeholder=" "
              spellCheck={false}
              autoComplete="off"
              value={draft.tenantId}
              aria-invalid={!!tenantError}
              onChange={(event) => patch({ tenantId: event.target.value })}
            />
            <label>tenantId</label>
          </div>
          {tenantError && <p className="field-error">{tenantError}</p>}

          <div className="role-options" role="radiogroup" aria-label="Rol en el tenant">
            {ROLES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="tier"
                role="radio"
                aria-checked={draft.role === option.id}
                onClick={() => patch({ role: option.id })}
              >
                <span>
                  <strong>{option.title}</strong>
                  <p>{option.hint}</p>
                </span>
              </button>
            ))}
          </div>

          {notice && <p className="note" role="status">{notice}</p>}
          {grant.error instanceof Error && !serverErrors && (
            <div className="error" role="alert">{grant.error.message}</div>
          )}

          <button className="btn" disabled={grant.isPending}>
            {grant.isPending && <Spinner />}
            Asignar
          </button>
        </form>
      </div>

      {confirm && createPortal(
        <div className="confirm-backdrop" onClick={() => { if (!grant.isPending) setConfirm(false) }}>
          <div
            className="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="assign-title"
            aria-describedby="assign-text"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="assign-title">Asignar rol</h2>
            <p id="assign-text">
              ¿Seguro que quieres asignar el rol {roleName} al usuario {draft.userId.trim()}?
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" autoFocus disabled={grant.isPending} onClick={() => setConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="btn" disabled={grant.isPending} onClick={assign}>
                {grant.isPending && <Spinner />}
                Asignar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
