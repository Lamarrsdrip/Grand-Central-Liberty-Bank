## Architecture
- Next.js 15 fullstack (port 3000)
- FastAPI reverse proxy at /app/backend/server.py forwards :8001 → :3000 and exposes GET /health for the deployment probe.
- Prisma 6 with the **mongodb** provider — connects via a runtime-built DATABASE_URL from MONGO_URL + DB_NAME.
- Local preview runs MongoDB as a single-node replica set under supervisor (`/usr/local/bin/start-mongodb-rs.sh`) so Prisma transactions work; production uses Atlas (replica set by default).

## Personas
- **Customer (USER):** dashboard / accounts / crypto / cards / 401(k) / transfers / support
- **Administrator (ADMIN):** users, KYC queue, transfers, retirements, wallets, support, settings.

## Implementation log

### 2026-01 — Initial import
- Extracted ZIP into /app/frontend, generated JWT/CSRF/SETTINGS_MASTER_KEY secrets.
- Backend → reverse proxy to Next.js (so the platform's `/api/*` → 8001 rule reaches the Next.js API routes).
- Locale auto-detection from `Accept-Language` for 11 languages (RTL for Arabic).
- Extracted pure helpers out of a `"use client"` file into `src/components/banking/finance.ts` to satisfy Next 15's client boundary.

### 2026-01 — PostgreSQL → MongoDB migration (for deployment)
- `prisma/schema.prisma` rewritten with `provider = "mongodb"`. All ids are `String @id @default(auto()) @map("_id") @db.ObjectId`. FKs annotated `@db.ObjectId`. All `Decimal @db.Decimal(18,2)` → `Float`. Singletons keep `Int @id @map("_id") @default(1)`. Referential actions removed (MongoDB doesn't enforce them — cascades are handled at the app layer).
- `src/lib/db.ts` + `src/lib/db-url.ts`: Prisma client built with a datasource URL synthesised from `MONGO_URL` + `DB_NAME` at runtime. No `DATABASE_URL` env var needed (and DATABASE_URL deliberately kept out of `.env` and the parent process env so it isn't copied into production secrets).
- `scripts/start.mjs`: single entry-point that loads `.env` (if present), runs `prisma db push --skip-generate` (index sync), runs `tsx prisma/seed.ts` (idempotent upserts), then launches `next start` (or `next dev` if no build is present). DATABASE_URL is passed only to child processes, never set on the parent.
- `src/app/api/admin/transfers/[id]/route.ts`: replaced `Prisma.Decimal` math with plain numbers; replaced the unsupported `isolationLevel: Serializable` interactive transaction with an atomic conditional `updateMany` "claim" + a Prisma batch transaction (money move + ledger + status update, all-or-nothing).
- Patched three Prisma+MongoDB null-filter quirks (`{ field: null }` doesn't match missing fields):
  - `src/lib/auth.ts` and `server.mjs` — drop `revokedAt: null` from the WHERE, check post-fetch.
  - `src/app/api/notifications/read-all/route.ts` — invert the filter.
  - `src/app/api/support/messages/route.ts` — invert the OR branch.
- `src/app/api/admin/transfers/route.ts` — bounded the admin transfer list (`take: 100`).
- `/app/backend/server.py` — added an explicit `GET /health` returning `{"status":"ok"}`.
- `/app/backend/.env` DB_NAME aligned with frontend.
- `/app/frontend/.gitignore` no longer excludes `.env` (the platform copies env vars from the committed `.env`).
- Local MongoDB upgraded to single-node replica set via `/usr/local/bin/start-mongodb-rs.sh` (supervisor program `mongodb-rs`) because Prisma transactions require a replica set; old standalone `mongodb` program left stopped.

## Verification (last run)
- `yarn build` → success.
- `yarn start` → schema sync + seed + `next start` boot cleanly.
- `curl /` 200, `POST /api/auth/login` (user + admin) 200, GET /dashboard 200, GET /admin 200, GET :8001/health 200.
- Headless browser login → dashboard renders (Total Assets $187,051.10, accounts, navigation).
- Deployment agent re-check → **PASS** (no blockers).

## Test credentials
Source of truth: `/app/memory/test_credentials.md`.

## Backlog
- P2: write static-dictionary translation files for the 11 supported locales (auto-detection + cookie + DB persistence is already shipped).
- P2: hand over real SMTP creds to unlock email verification / broadcasts.
- P3: revisit the transfer-approval claim/transaction now that we're on MongoDB — currently safe (atomic claim + batch txn) but could be tightened with an `updateOne` that also flips to APPROVED inside the same transaction.
