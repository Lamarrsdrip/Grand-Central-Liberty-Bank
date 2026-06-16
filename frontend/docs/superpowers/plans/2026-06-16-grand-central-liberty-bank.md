# Grand Central Liberty Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Next.js 15, TypeScript, PostgreSQL online banking platform with user banking workflows, admin command center, KYC, wallets, cards, transfers, support chat, email broadcasts, settings, and auditability.

**Architecture:** The application is a single Next.js app using App Router route handlers for APIs, Prisma for PostgreSQL, JWT session cookies for authentication, server-rendered protected dashboards, and client components only for interactive forms, chat, and admin mutations. Storage is S3-compatible when configured and local-development backed otherwise; realtime support chat is served by the custom Socket.IO production server.

**Tech Stack:** Next.js 15.5.19, React 19.2.7, TypeScript, Tailwind CSS 4, shadcn-style source components, Prisma 6.19.3, PostgreSQL, Socket.IO, Nodemailer, jose, bcryptjs, Vitest.

---

### Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `components.json`
- Create: `prisma/schema.prisma`
- Create: `tests/auth.test.ts`
- Create: `tests/domain.test.ts`

- [x] Define dependencies and scripts for clone, install, build, seed, test, and start.
- [x] Define the PostgreSQL Prisma schema covering users, sessions, accounts, KYC, wallets, cards, support, transfers, email, settings, notifications, and audit logs.
- [x] Write failing tests for auth token/password behavior, sanitization, transfer defaults, wallet visibility, and broadcast recipient selection.

### Task 2: Core Runtime Libraries

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/domain.ts`
- Create: `src/lib/sanitize.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/security.ts`
- Create: `src/lib/email.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/audit.ts`

- [ ] Implement password hashing, JWT sessions, RBAC guards, CSRF utilities, rate limit primitives, email delivery, storage upload, and audit logging.
- [ ] Run `npm test` and confirm the auth/domain tests pass.

### Task 3: API Surface

**Files:**
- Create route handlers under `src/app/api/**/route.ts`.

- [ ] Implement auth registration, login, logout, email verification, password reset, 2FA setup, and profile APIs.
- [ ] Implement user KYC, crypto wallets, card applications, transfers, support tickets, support messages, notifications, and upload APIs.
- [ ] Implement admin users, KYC decisions, wallets, card decisions, transfer settings, support, email settings/test/broadcast, bank settings, notifications, and audit APIs.

### Task 4: User And Admin UI

**Files:**
- Create pages under `src/app/login`, `src/app/register`, `src/app/dashboard`, `src/app/accounts`, `src/app/crypto`, `src/app/cards`, `src/app/transfers`, `src/app/support`, `src/app/profile`, and `src/app/admin`.
- Create components under `src/components/**`.

- [ ] Build the responsive banking app shell with connected navigation, session-aware rendering, notification surfaces, and mobile-first layout.
- [ ] Build all user banking workflows with working form submissions.
- [ ] Build all admin command center modules with working search, decision, status, settings, email, and audit controls.

### Task 5: Deployment Assets And Verification

**Files:**
- Create: `README.md`
- Create: `DEPLOYMENT.md`
- Create: `prisma/seed.ts`
- Create: `scripts/check-env.ts`
- Create: `server.mjs`

- [ ] Seed admin/user accounts, bank settings, transfer message, wallets, accounts, activity, notifications, and support history.
- [ ] Run `npm install`, `npm test`, and `npm run build`.
- [ ] Start the app and verify the primary user/admin surfaces against the generated design concept.
