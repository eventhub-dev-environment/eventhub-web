import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/Icon'
import { Empty, Skeleton, Spinner } from '@/components/ui'
import { ApiError } from '@/lib/http'
import type { Category } from '@/types/event'
import { draftFrom, emptyDraft, toRequest, validateDraft, type CategoryDraft } from './categoryDraft'
import { useCategoryAdmin } from './useCategoryAdmin'

type StatusFilter = 'all' | 'active' | 'inactive'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Activas' },
  { id: 'inactive', label: 'Inactivas' },
]

const PAGE_SIZE = 5

export function CategoriesPage() {
  const { catalog, save } = useCategoryAdmin()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState<'closed' | 'create' | 'edit'>('closed')
  const [confirmOff, setConfirmOff] = useState(false)

  const counts = useMemo(() => {
    const all = catalog.data ?? []
    const active = all.filter((category) => category.active !== false).length
    return { all: all.length, active, inactive: all.length - active }
  }, [catalog.data])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...(catalog.data ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .filter((category) => {
        const isActive = category.active !== false
        if (filter === 'active' && !isActive) return false
        if (filter === 'inactive' && isActive) return false
        return `${category.name} ${category.description ?? ''}`.toLowerCase().includes(needle)
      })
  }, [catalog.data, filter, q])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageItems = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = visible.length === 0 ? 0 : currentPage * PAGE_SIZE + 1
  const rangeEnd = Math.min(visible.length, (currentPage + 1) * PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [filter, q])

  const editing = editor === 'edit' ? catalog.data?.find((category) => category.id === selectedId) ?? null : null

  useEffect(() => {
    if (!confirmOff) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOff(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOff])
  const serverErrors = save.error instanceof ApiError ? save.error.fieldErrors : undefined
  const nameError = clientErrors.name || serverErrors?.name

  const closeEditor = () => {
    setEditor('closed')
    setConfirmOff(false)
  }

  const startCreate = () => {
    setEditor('create')
    setSelectedId(null)
    setDraft(emptyDraft())
    setClientErrors({})
    setNotice(null)
    setConfirmOff(false)
    save.reset()
  }

  const startEdit = (category: Category) => {
    setEditor('edit')
    setSelectedId(category.id)
    setDraft(draftFrom(category))
    setClientErrors({})
    setNotice(null)
    setConfirmOff(false)
    save.reset()
  }

  const toggleVisibility = () => {
    if (draft.active) {
      setConfirmOff(true)
      return
    }
    setDraft({ ...draft, active: true })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const errors = validateDraft(draft)
    setClientErrors(errors)
    setNotice(null)
    if (Object.keys(errors).length > 0) return

    try {
      const saved = await save.mutateAsync({ id: selectedId ?? undefined, body: toRequest(draft) })
      if (saved.active === false) {
        setSelectedId(saved.id)
        setDraft(draftFrom(saved))
        setNotice('Quedó inactiva. Ya no aparece en el catálogo público.')
        return
      }
      setSelectedId(saved.id)
      setDraft(draftFrom(saved))
      setNotice(selectedId ? 'Cambios guardados.' : 'Categoría lista. Ya puede asignarse a un evento.')
    } catch {
      /* el mensaje sale de save.error */
    }
  }

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="tag" size={22} /></span>
          <div>
            <p className="eyebrow">Plataforma</p>
            <h1>Categorías</h1>
            <p className="lede">Clasifican el catálogo público. Cada evento necesita una categoría activa.</p>
          </div>
        </div>
      </header>

      <div className={editor === 'closed' ? 'admin-layout' : 'admin-layout is-open'}>
        <section>
          <div className="toolbar">
            <div className="filters" role="group" aria-label="Filtrar por estado">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className="count">{counts[item.id]}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn ghost" onClick={startCreate}>
              <Icon name="plus" />Nueva
            </button>
          </div>

          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Buscar por nombre"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              aria-label="Buscar categorías"
            />
          </div>

          <div className="stack">
            {catalog.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} h={76} />)}
            {catalog.error instanceof Error && <div className="error" role="alert">{catalog.error.message}</div>}
            {catalog.data && visible.length === 0 && (
              <Empty
                icon={<Icon name="tag" size={28} />}
                title={q ? 'Sin coincidencias' : filter === 'inactive' ? 'No hay categorías inactivas' : 'Aún no hay categorías'}
                hint={q ? 'Prueba con otro nombre o cambia el filtro.' : filter === 'inactive' ? 'Las que desactives aparecerán aquí.' : 'Crea la primera para poder publicar eventos.'}
              />
            )}
            {pageItems.map((category, index) => (
              <button
                key={category.id}
                type="button"
                className="row cat-item"
                style={{ '--i': index } as React.CSSProperties}
                aria-pressed={editor === 'edit' && category.id === selectedId}
                onClick={() => startEdit(category)}
              >
                <span className="mark"><Icon name="tag" /></span>
                <span className="cat-copy">
                  <strong>{category.name}</strong>
                  <p>{category.description || 'Sin descripción'}</p>
                </span>
                <span className={`badge ${category.active === false ? 'bad' : 'ok'}`}>
                  {category.active === false ? 'Inactiva' : 'Activa'}
                </span>
                <Icon name="pencil" />
              </button>
            ))}
          </div>

          {catalog.data && visible.length > 0 && (
            <div className="pager">
              <p>Mostrando {rangeStart}–{rangeEnd} de {visible.length}</p>
              <div className="pager-pages">
                <button type="button" className="btn ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                  Anterior
                </button>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className="page-num"
                    aria-current={index === currentPage ? 'page' : undefined}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button type="button" className="btn ghost" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

        {editor !== 'closed' && (
        <form key={editor === 'edit' ? selectedId ?? 'edit' : 'new'} id="category-form" className="panel admin-editor" onSubmit={submit}>
          <div className="editor-head">
            <h2>{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <button type="button" className="close-btn" onClick={closeEditor} aria-label="Cerrar">
              <Icon name="x" />
            </button>
          </div>
          <p className="hint">{editing ? editing.name : 'Visible en el catálogo en cuanto la guardes.'}</p>

          <div className="field">
            <input
              autoFocus
              placeholder=" "
              value={draft.name}
              aria-invalid={!!nameError}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value })
                setClientErrors((current) => ({ ...current, name: '' }))
              }}
            />
            <label>Nombre</label>
          </div>
          {nameError && <p className="field-error">{nameError}</p>}

          <div className="field">
            <textarea
              placeholder=" "
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
            <label>Descripción</label>
          </div>

          <div className="switch-row">
            <div>
              <strong>Visible en el catálogo</strong>
              <p>Si la desactivas, deja de listarse. No se puede eliminar.</p>
            </div>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={draft.active}
              aria-label="Visible en el catálogo"
              onClick={toggleVisibility}
            >
              <span />
            </button>
          </div>

          {notice && <p className="note" role="status">{notice}</p>}
          {save.error instanceof Error && !serverErrors && (
            <div className="error" role="alert">{save.error.message}</div>
          )}

          <button className="btn" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {editing ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </form>
        )}
      </div>

      {confirmOff && createPortal(
        <div className="confirm-backdrop" onClick={() => setConfirmOff(false)}>
          <div
            className="confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deactivate-title"
            aria-describedby="deactivate-text"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="deactivate-title">Desactivar categoría</h2>
            <p id="deactivate-text">
              {draft.name.trim()
                ? `¿Seguro que quieres desactivar «${draft.name.trim()}»? Dejará de mostrarse en el catálogo y en este listado.`
                : '¿Seguro que quieres desactivar esta categoría? Dejará de mostrarse en el catálogo y en este listado.'}
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" autoFocus onClick={() => setConfirmOff(false)}>Cancelar</button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDraft({ ...draft, active: false })
                  setConfirmOff(false)
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
