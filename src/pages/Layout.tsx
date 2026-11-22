import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { hasGlobalRole, hasTenantRole, selectIsAuthenticated, selectIsTenantAdmin, useAuthStore } from '@/store/auth'

export function Layout() {
  const isAuth = useAuthStore(selectIsAuthenticated)
  const email = useAuthStore((s) => s.email)
  const isStaff = useAuthStore((s) => hasTenantRole(s, 'TENANT_ADMIN', 'EVENT_ORGANIZER'))
  const isTenantAdmin = useAuthStore(selectIsTenantAdmin)
  const isPlatformAdmin = useAuthStore((s) => hasGlobalRole(s, 'PLATFORM_ADMIN'))
  const tenantRoles = useAuthStore((s) => s.tenantRoles)
  const activeTenantId = useAuthStore((s) => s.activeTenantId)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tenants = [...new Set(tenantRoles.map((t) => t.tenantId))]
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('eh-theme', next)
    setTheme(next)
  }

  return (
    <>
      <div className="aurora" aria-hidden><i /><i /><i /></div>
      <header className="nav">
        <Link to="/" className="brand">EventHub</Link>
        <button
          type="button"
          className="icon-btn nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'x' : 'menu'} />
          <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
        </button>
        <nav id="site-nav" className={menuOpen ? 'is-open' : ''}>
          {isAuth && <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Eventos</NavLink>}
          {isAuth && <NavLink to="/me/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>Mis reservas</NavLink>}
          {isStaff && <NavLink to="/staff" end className={({ isActive }) => (isActive ? 'active' : '')}>Panel</NavLink>}
          {isTenantAdmin && <NavLink to="/staff/config" className={({ isActive }) => (isActive ? 'active' : '')}>Configuración</NavLink>}
          {isPlatformAdmin && <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? 'active' : '')}>Categorías</NavLink>}
          {isPlatformAdmin && <NavLink to="/admin/roles" className={({ isActive }) => (isActive ? 'active' : '')}>Roles</NavLink>}
          {tenants.length > 1 && (
            <select aria-label="Tenant activo" value={activeTenantId ?? ''} onChange={(e) => setActiveTenant(e.target.value)}>
              {tenants.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <button type="button" className="nav-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            <span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          {isAuth ? (
            <>
              <div className="nav-profile">
                <span className="avatar" aria-hidden>{email?.[0]?.toUpperCase()}</span>
                <span className="nav-user">{email}</span>
              </div>
              <button type="button" className="nav-logout" onClick={() => { logout(); navigate('/login') }}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </nav>
      </header>
      {menuOpen && <button type="button" className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <main key={pathname} className="page"><Outlet /></main>
    </>
  )
}
