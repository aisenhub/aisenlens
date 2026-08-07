# API Service

`src/routes/` owns HTTP request and response mapping. When the user system is implemented, put account workflows in `src/services/` and database access in `src/repositories/`; route handlers must not query the database directly.

Run `npm run dev:api` from the repository root. The service binds to `127.0.0.1:3000` by default and exposes `GET /api/health`.
