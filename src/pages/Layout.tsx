import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { hasTenantRole, selectIsAuthenticated, useAuthStore } from '@/store/auth'

export function Layout() {
  const isAuth = useAuthStore(selectIsAuthenticated)
  const email = useAuthStore((s) => s.email)
  const isStaff = useAuthStore((s) => hasTenantRole(s, 'TENANT_ADMIN', 'EVENT_ORGANIZER'))
  const tenantRoles = useAuthStore((s) => s.tenantRoles)
  const activeTenantId = useAuthStore((s) => s.activeTenantId)
  const setActiveTenant = useAuthStore((s) => s.setActiveTenant)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tenants = [...new Set(tenantRoles.map((t) => t.tenantId))]
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'light')

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
        <nav>
          {isAuth && <NavLink to="/me/bookings" className={({ isActive }) => (isActive ? 'active' : '')}>Mis reservas</NavLink>}
          {isStaff && <NavLink to="/staff" className={({ isActive }) => (isActive ? 'active' : '')}>Panel</NavLink>}
          {tenants.length > 1 && (
            <select aria-label="Tenant activo" value={activeTenantId ?? ''} onChange={(e) => setActiveTenant(e.target.value)}>
              {tenants.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema">{theme === 'dark' ? '☀️' : '🌙'}</button>
          {isAuth ? (
            <>
              <span className="avatar" title={email ?? ''}>{email?.[0]?.toUpperCase()}</span>
              <button onClick={() => { logout(); navigate('/login') }}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </nav>
      </header>
      <main key={pathname} className="page"><Outlet /></main>
    </>
  )
}
