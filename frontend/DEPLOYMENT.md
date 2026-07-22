# Production deployment — Vercel and MongoDB

This application deploys from the `frontend` directory. These steps preserve existing records and do not seed, reset, or repair production data automatically.

## 1. Prepare and back up MongoDB

1. Create a point-in-time backup or Atlas snapshot.
2. Confirm the connection targets the intended production database and a replica-set deployment. Prisma/MongoDB transactions require replication; Atlas configures this automatically.
3. From an approved operations environment, set `PRISMA_DATABASE_URL` to that database and run the read-only `npm run audit:data`. Review every finding before changing data.
4. Review `prisma/schema.prisma`, then run `npx prisma db push`. This creates the `EmailDelivery` collection/indexes and any other missing schema indexes; it does not seed records.
5. Do **not** run `npm run seed` on a populated production database.

## 2. Configure the Vercel project

- Import the GitHub repository and set **Root Directory** to `frontend`.
- Framework preset: Next.js.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Production branch: `main`.
- Do not configure a custom long-running Socket.IO server. Chat uses database polling and normal route handlers.

Set each variable for the **Production** environment, and separately for Preview only when preview is intended to access an isolated preview database. Vercel applies environment changes only to new deployments, so redeploy after changing them.

| Variable | Requirement |
|---|---|
| `PRISMA_DATABASE_URL` | Required MongoDB DSN, with database name and replica-set support. |
| `DB_NAME` | Optional override only; omit when the DSN path already names the correct database. |
| `APP_URL` | Required canonical HTTPS origin, without a trailing slash. |
| `JWT_SECRET` | Required independent random value, at least 32 characters. |
| `CSRF_SECRET` | Required independent random value, at least 32 characters. |
| `CRON_SECRET` | Required independent random value, at least 32 characters. Vercel sends it as `Authorization: Bearer …` to the email retry endpoint. |
| `SETTINGS_MASTER_KEY` | Required base64-encoded 32-byte key for stored SMTP credentials. |
| `RESEND_API_KEY` | Recommended transactional provider credential. |
| `EMAIL_FROM` | Required with Resend; must use a provider-approved sender/domain. |
| `SUPPORT_EMAIL` | Required support inbox for customer chat notifications. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SENDER_NAME` | SMTP fallback; omit when Resend is configured. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | Optional S3-compatible document storage. Configure as a complete set. |

Use `.env.example` only as a naming reference. Never commit real values. Prefer only `PRISMA_DATABASE_URL`; the code accepts `DATABASE_URL` and `MONGO_URL` as legacy aliases but production must not contain conflicting database URLs.

Generate values locally without printing them into build logs:

```bash
openssl rand -base64 48   # JWT_SECRET, CSRF_SECRET, CRON_SECRET (generate separately)
openssl rand -base64 32   # SETTINGS_MASTER_KEY
```

## 3. Validate before production

```bash
npm ci
npm run check-env
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
npm audit
npm run build
```

`vercel.json` registers `GET /api/internal/email-outbox/process` every ten minutes. The endpoint rejects requests unless the Vercel-supplied bearer value exactly matches `CRON_SECRET`. Failed deliveries use capped exponential retries and successful idempotency keys are never resent.

## 4. Deploy and verify

1. Push the verified commit to `main`, or deploy the exact commit with the Vercel dashboard.
2. Wait for the production build and schema/client generation to complete.
3. Verify `/api/health` and sign in with an existing authorized account.
4. Exercise a customer-to-admin chat and an admin reply; reload both sides and confirm persistence/read state.
5. Trigger a provider-accepted test email from the admin email area. Confirm the provider message ID/status in the delivery log; a configured sender domain must be verified at the provider.
6. Verify the Cron Jobs page shows the outbox processor and inspect function logs for structured `email.delivery.*` or `chat.*` events.
7. Check the Admin Command Center at phone, tablet, laptop, and desktop widths.

## Rollback

- Revert the application commit and redeploy the prior known-good build.
- Do not drop the `EmailDelivery` collection during an application rollback; it is additive and preserves delivery evidence.
- Restore database data only from an approved backup after confirming an actual data incident. Never use seed/reset scripts as rollback tools.
