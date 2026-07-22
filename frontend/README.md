# Grand Central Liberty Bank

Grand Central Liberty Bank is a Next.js 15 banking application with customer and administrator experiences, MongoDB through Prisma, database-backed support chat, durable transactional email delivery, JWT sessions, and optional S3-compatible document storage.

## Current architecture

- Next.js App Router, React 19, TypeScript, and Tailwind CSS.
- MongoDB with one hot-reload-safe Prisma client. Production balance-changing transactions require a replica set (MongoDB Atlas provides one).
- HTTP-only JWT session cookies, server-side role checks, signed double-submit CSRF protection, rate limits, and security headers.
- Support chat persisted in MongoDB and refreshed with incremental polling, which is compatible with Vercel serverless functions.
- Transactional email through Resend or SMTP, backed by an idempotent `EmailDelivery` outbox and a protected Vercel Cron processor.
- Responsive customer banking UI and a collapsible/off-canvas Admin Command Center.

## Quick start

```bash
npm ci
cp .env.example .env.local
npm run check-env
npm run db:push
npm run seed       # explicit development/bootstrap action only
npm test
npm run build
npm run dev
```

Set strong local values in `.env.local`. `npm run seed` requires `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD`; normal application startup never seeds, deletes, or rewrites data.

## Required production configuration

- `PRISMA_DATABASE_URL`: MongoDB connection string with a database name; use a replica-set deployment.
- `APP_URL`: canonical HTTPS production origin.
- `JWT_SECRET`, `CSRF_SECRET`, `CRON_SECRET`: independent random strings of at least 32 characters.
- `SETTINGS_MASTER_KEY`: exactly 32 random bytes encoded as base64.
- Email: `RESEND_API_KEY` plus `EMAIL_FROM` (recommended), or the documented SMTP variables.
- `SUPPORT_EMAIL`: destination for new customer support notifications.

`DATABASE_URL` and `MONGO_URL` remain compatibility aliases, but `PRISMA_DATABASE_URL` is canonical. Do not set competing values that point to different databases.

See [DEPLOYMENT.md](./DEPLOYMENT.md) and the safe placeholders in [.env.example](./.env.example).

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm audit
npm run build
npm run audit:data   # read-only integrity scan against the configured database
```

The data audit reports sub-cent values, duplicate ledger references, approved transfers without ledger entries, and orphaned support or transaction records. It never modifies records.

## Database changes

MongoDB deployments use `prisma db push`, not SQL migration files. Review the schema diff and back up production before running it. The current change adds the `EmailDelivery` collection and indexes. Never run `npm run seed` against a populated production database.

The legacy schema stores money in MongoDB `Float` fields because Prisma's MongoDB connector does not expose `Decimal`. Mutation paths round fiat values to cents and perform conditional atomic updates, but a future staged migration to integer minor-unit fields is still recommended. Run `npm run audit:data` first; do not rewrite existing balances in place without reconciliation.
