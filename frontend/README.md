# Grand Central Liberty Bank — Premium 2026 UI

> **2026 Redesign:** The entire customer experience has been rebuilt into a premium,
> dark-themed, mobile-first banking app inspired by Revolut, Coinbase, Wise, and Apple Wallet.
> Customer pages (landing, dashboard, accounts, crypto, transfer, 401(k), cards, login, register)
> match the official design spec. Admin pages remain a separate command center.

## Design system
- Dark premium theme (`#0b0f18` base, emerald-green accent `#22c55e`)
- Mobile-first layouts with a desktop sidebar + mobile bottom nav (Home · Accounts · Transfer · Cards · More)
- Rounded glass cards, gradient account cards, animated SVG charts, donut insights, coin lists
- All wealth (checking, savings, crypto, 401(k), investments) rolls into one Total Assets figure ($250,730.50 in seed data)
- No admin/"transfer request" wording in the customer UI


## Security & business-logic audit (pre-deployment)

The following backend fixes were applied and covered by tests:

1. **Transfer funds validation** — user transfer creation rejects amounts above `availableBalance`, non-positive amounts, and currency mismatches (`canSubmitTransfer` in `src/lib/domain.ts`).
2. **Atomic admin approval** — approving a transfer runs in a `Serializable` Prisma `$transaction` that (a) blocks double-approval of already-finalized transfers, (b) debits both `availableBalance` and `balance`, (c) writes an immutable `Transaction` ledger record, and (d) updates the transfer status — all or nothing (`src/app/api/admin/transfers/[id]/route.ts`).
3. **Protected file access** — `/api/files/[...key]` now requires an authenticated session and is hardened against path traversal; KYC documents/IDs/selfies are no longer publicly reachable.
4. **Auth rate limits** — `register` (5/min), `forgot-password` (5/min), and `reset-password` (10/min) per IP, in addition to the existing `login` limit.
5. **Signed CSRF tokens** — `CSRF_SECRET` is now used to HMAC-sign double-submit CSRF tokens (`src/lib/csrf.ts`), verified in middleware (Edge-safe Web Crypto).
6. **Production CSP** — `unsafe-eval` is dropped in production, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, plus HSTS in production (`src/lib/security.ts`).

Run the suite with `npm test` and the production build with `npm run build`.


# Grand Central Liberty Bank

Grand Central Liberty Bank is a production-structured online banking platform built with Next.js 15, TypeScript, Tailwind CSS, Prisma, PostgreSQL, JWT sessions, Socket.IO live chat, Gmail SMTP, and S3-compatible storage.

## Features

- User registration, login, email verification, password reset, profile management, and 2FA.
- Role-based dashboards for customers and administrators.
- Manual KYC submissions with admin approval, rejection, document requests, visible verification notes, and full history.
- Checking, savings, crypto account views with transaction activity and account freeze reason history.
- Admin-managed crypto deposit wallets for BTC, ETH, USDT, BNB, SOL, XRP, DOGE, and future coins.
- Credit card application flow for Classic, Gold, Platinum, and Signature cards.
- Transfer request flow with admin-configurable review message and support call-to-action.
- 401(k) retirement accounts with contribution history, investment growth status, withdrawal eligibility, manual withdrawal review, crypto-deposit compliance fee disclosure, and admin review notes.
- Realtime support tickets and live chat through Socket.IO.
- Gmail SMTP settings, test email, rich HTML promotional broadcasts, targeting, and delivery tracking.
- Announcement banners, multilingual navigation, dark/light mode, notifications, settings, audit logs, and full mobile banking navigation.

## Quick Start

```bash
npm install
cp .env.example .env
npm run check-env
npm run db:push
npm run seed
npm run build
npm start
```

`npm run seed` requires `SEED_ADMIN_PASSWORD` and `SEED_USER_PASSWORD` in `.env`.

## Required Environment

- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL`: Public app URL.
- `JWT_SECRET`: At least 32 characters.
- `CSRF_SECRET`: At least 32 characters.
- `SETTINGS_MASTER_KEY`: Base64-encoded 32-byte AES key for encrypted admin SMTP password storage.
- `SMTP_*`: Gmail SMTP settings for verification, reset, test, and broadcast email.
- `S3_*`: Optional S3-compatible storage settings. Local `uploads/` storage is used when S3 is not configured.

Generate a local settings key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database

The database schema is defined in [prisma/schema.prisma](./prisma/schema.prisma). It includes users, sessions, accounts, transactions, KYC, KYC notes, crypto wallets, card applications, support tickets/messages, transfers, transfer settings, email settings, bank settings, announcement banners, broadcasts, notifications, audit logs, login history, password reset tokens, and email verification tokens.

For a new deployment, run:

```bash
npm run db:push
npm run seed
```

For migration-managed deployments, create migrations with:

```bash
npm run db:dev
```

## Security

- Passwords are hashed with bcrypt.
- Sessions use HTTP-only JWT cookies backed by database sessions.
- Middleware sets secure headers and enforces CSRF tokens on mutating API requests.
- Admin APIs require the `ADMIN` role.
- Admin mutations write audit records.
- Rich email HTML is sanitized before broadcast delivery.
- SMTP app passwords are encrypted with `SETTINGS_MASTER_KEY`.
- Uploads are size-limited and routed to S3-compatible storage when configured.

## Default Routes

- `/login`
- `/register`
- `/dashboard`
- `/accounts`
- `/crypto`
- `/cards`
- `/retirement`
- `/transfers`
- `/support`
- `/profile`
- `/admin`

## Verification

```bash
npm test
npm run build
```

The custom production server in [server.mjs](./server.mjs) runs Next.js and Socket.IO together so live support chat works after deployment.
