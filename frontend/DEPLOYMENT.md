# Deployment Guide — Grand Central Liberty Bank

## Step 1 — Push to YOUR GitHub

Create an **empty** repository on github.com (no README), then from this folder:

```bash
bash push-to-github.sh https://github.com/<your-username>/grand-central-liberty-bank.git
```

(If `push-to-github.sh` asks for login, use a GitHub Personal Access Token as the password:
GitHub → Settings → Developer settings → Personal access tokens → generate one with `repo` scope.)

Or do it manually:

```bash
git init && git add . && git commit -m "Premium 2026 UI"
git branch -M main
git remote add origin https://github.com/<you>/grand-central-liberty-bank.git
git push -u origin main
```

## Step 2 — Deploy on Emergent

1. In Emergent, **import the GitHub repo** you just pushed.
2. **Create a PostgreSQL database** in Emergent (or connect an external one like Neon/Supabase).
3. Add these **environment variables** (copy from `.env.example`, fill the secrets):

   | Variable | What to set |
   |---|---|
   | `DATABASE_URL` | Your Postgres connection string |
   | `APP_URL` | Your deployed URL (e.g. `https://your-app.emergent.host`) |
   | `JWT_SECRET` | 64 random chars — run `openssl rand -base64 48` |
   | `CSRF_SECRET` | 64 random chars |
   | `SETTINGS_MASTER_KEY` | `openssl rand -base64 32` |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Your admin login |
   | `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | A demo customer login |

   (SMTP_* and S3_* are optional — leave blank to disable email/uploads.)

4. **Build command:** `npm install && npm run build`
5. **Start command:** `npm start`

## Step 3 — Initialise the database (first deploy only)

Run once in the Emergent shell/console:

```bash
npm run db:push   # creates all tables from prisma/schema.prisma
npm run seed      # loads demo accounts that total $250,730.50
```

## Step 4 — Log in

- **Customer app:** `/login` with your `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` → lands on `/dashboard`
- **Admin center:** `/login` with your `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → lands on `/admin`

## Local development

```bash
npm install
cp .env.example .env      # then fill in the secrets above
npm run check-env
npm run db:push
npm run seed
npm run dev               # http://localhost:3000
```

## Notes for production safety
- `node_modules`, `.next`, and `.env` are git-ignored (never committed).
- The app uses PostgreSQL — make sure `DATABASE_URL` points to a real Postgres instance.
- No hardcoded localhost in runtime paths; `APP_URL` drives absolute links.
- Run `npm run build` locally first to confirm it compiles before deploying.
