import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/pages/Layout'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventsPage } from '@/pages/EventsPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { CheckInPage } from '@/pages/staff/CheckInPage'
import { NewEventPage } from '@/pages/staff/NewEventPage'
import { StaffEventsPage } from '@/pages/staff/StaffEventsPage'
import { CategoriesPage } from '@/pages/admin/CategoriesPage'
import { RolesPage } from '@/pages/admin/RolesPage'
import { TenantConfigPage } from '@/pages/staff/TenantConfigPage'
import { RequireAuth, RequireGlobalRole, RequireTenantAdmin, RequireTenantRole } from './guards'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        // OJO: hoy el gateway exige JWT incluso para GET /events/published y /categories.
        // Si los abres en el gateway, saca estas dos rutas de RequireAuth.
        element: <RequireAuth />,
        children: [
          { path: '/', element: <EventsPage /> },
          { path: '/events/:id', element: <EventDetailPage /> },
          { path: '/me/bookings', element: <MyBookingsPage /> },
          {
            element: <RequireTenantRole roles={['TENANT_ADMIN', 'EVENT_ORGANIZER']} />,
            children: [
              { path: '/staff', element: <StaffEventsPage /> },
              { path: '/staff/events/new', element: <NewEventPage /> },
              { path: '/staff/check-in', element: <CheckInPage /> },
            ],
          },
          {
            element: <RequireTenantAdmin />,
            children: [{ path: '/staff/config', element: <TenantConfigPage /> }],
          },
          {
            element: <RequireGlobalRole role="PLATFORM_ADMIN" />,
            children: [
              { path: '/admin/categories', element: <CategoriesPage /> },
              { path: '/admin/roles', element: <RolesPage /> },
            ],
          },
        ],
      },
    ],
  },
])
