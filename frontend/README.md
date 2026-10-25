# CollectFlow frontend

React + Vite + Tailwind CSS. Plain JavaScript (`.js` / `.jsx`) — no TypeScript.

## Run

```bash
npm install
npm run dev
```

The dev server runs on http://127.0.0.1:5173 and proxies `/api` to the Spring Boot
backend on http://localhost:8080, so start the backend first.

```bash
npm run build   # production build into dist/
npm run preview # serve the production build
npm run lint    # oxlint
```

## Structure

```
src/
  main.jsx              app entry
  App.jsx               routes
  auth/AuthContext.jsx  session, login, register, logout
  lib/api.js            fetch wrapper, token storage, ApiError
  lib/useApi.js         GET + loading/error hook
  lib/format.js         money, date and label helpers
  components/           layout, shared UI pieces, icons
  pages/                dashboard, invoices, customers, reminders, tasks, reports, settings
```

## API shape

Every request goes through `lib/api.js`, which attaches the JWT from `localStorage`
under `collectflow.token` and raises `ApiError` for non-2xx responses. Types are not
declared in code; the JSON shapes live in the Spring DTOs under
`src/main/java/com/collectflow/web/dto`.
