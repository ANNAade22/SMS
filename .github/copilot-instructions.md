# SMS Monorepo – Copilot Instructions

Scope

- Backend: `sms-backend/` (Express + Mongoose)
- Frontend: `sms-frontend/` (React + Vite) with `/api` proxy

Architecture

- Entry: `server.js` loads `app.js`; config in `config.env` (`PORT=8000`, `DATABASE_LOCAL`).
- Structure: `models/*`, `controllers/*`, `routes/*`, `middleware/*`, `utils/*`.
- CRUD: Prefer `controllers/handlerFactory.js` (`getAll/getOne/createOne/updateOne/deleteOne`). Use resource controllers for custom logic.
- Sessions: `models/sessionModel.js` stores `sessionId`, `token`, `refreshTokenHash`, timestamps with concurrency-safe `updateActivity()` and `invalidate()`.
- Routing: All APIs under `/api/v1/*`; mount in `app.js` (e.g., `app.use('/api/v1/students', studentRoutes)`).

Auth, CSRF, Refresh

- Access token: 15m JWT returned in body `{ token, data.user }` (see `authController.issueTokens`).
- Refresh: HttpOnly `refreshToken` cookie + `sid` on path `/api`; `POST /api/v1/users/refresh` rotates access and CSRF tokens.
- CSRF: Double-submit cookie via `middleware/csrf.js`. Mutations must send header `x-csrf-token` equal to `csrfToken` cookie. Rotate via `GET /api/v1/users/csrf`.
- Exempt from CSRF: `/users/{login|signup|refresh|forgotPassword|resetPassword/:token}`.
- Order (important): cookies → `attachCsrfToken` → auth/session (`sessionController.validateSession`, `updateSessionActivity`) → `verifyCsrf` → routers.

Patterns

- Counts: `countController.buildCountHandler(Model)` and `.buildHeadCountHandler(Model)`. Example: `routes/studentRoutes.js` exposes `GET/HEAD /students/count` with cache and `X-Total-Count`.
- Cache: Count cache is in-memory with optional Redis (`REDIS_URL`). TTL `COUNT_CACHE_TTL_MS` (default 30000). Health: `GET /api/v1/cache/health`.
- RBAC: Use `authController.protect` then `restrictToEnhanced('super_admin', ...)`; finer checks with `checkPermission/checkAnyPermission`.
- Updates: Strip `_id` from bodies; `handlerFactory.updateOne` already does this.
- Sessions API: See `routes/sessionRoutes.js`, `controllers/sessionController.js` for listing and invalidation; limit concurrency with `Session.enforceSessionLimit(userId, max)`.

Frontend Integration

- Base URL: `src/config.js` uses `VITE_API_BASE_URL` or `http://localhost:8000`. Vite proxy maps `/api` to backend (see `vite.config.js`).
- Client: `src/services/apiClient.js` auto-attaches `Authorization` and `x-csrf-token`; retries once on `403` by calling `/users/csrf`, and handles 401 with single-flight refresh.
- Auth service: `src/services/authService.js` stores token in memory/sessionStorage, schedules auto-refresh (~60s before exp), exposes helpers for profile, sessions, logout.

Dev Workflows

- Backend
  ```powershell
  cd sms-backend
  npm install
  npm run ensure:super
  npm start
  ```
- Frontend
  ```powershell
  cd sms-frontend
  npm install
  npm run dev
  ```
- Backend tests (Jest + Supertest in `__tests__/`)
  ```powershell
  cd sms-backend
  npm test
  ```

Gotchas

- Always send CSRF for POST/PUT/PATCH/DELETE or you’ll get 403.
- Cookies (`refreshToken`, `sid`) are scoped to `/api`; keep API requests under that path.
- CORS: Allowed dev origins are `http://localhost:5173` and `http://localhost:5174` (see `app.js`).
- Scripts assume local Mongo; set `DATABASE_LOCAL` or `DATABASE_TEST` accordingly.

If ports, origins, or flows change, update this file and `app.js`/`vite.config.js` accordingly.
