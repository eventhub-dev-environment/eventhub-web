# EventHub Web

React 19 + Vite + TypeScript. Consume el `api-gateway` de EventHub.

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:5173  (proxy /api -> VITE_GATEWAY_URL)
```

- `src/types/` DTOs del backend (auth, event, booking, payment, notification, config).
- `src/lib/http.ts` cliente fetch: Bearer, `X-Tenant-ID`, normalización de errores, logout en 401.
- `src/api/` un módulo por microservicio.
- `src/store/auth.ts` sesión (zustand + persist) y tenant activo.
- `src/routes/` router y guards por rol.
