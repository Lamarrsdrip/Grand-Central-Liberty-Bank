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
2. The app uses **MongoDB**. Emergent provides `MONGO_URL` and `DB_NAME` automatically.
3. Add these **environment variables / secrets**:

   | Variable | What to set |
   |---|---|
   | `DATABASE_URL` | **MongoDB** connection string — must start with `mongodb://` or `mongodb+srv://`.<br>In Emergent this is usually provided automatically via `MONGO_URL`+`DB_NAME`.<br>**Do NOT set this to a PostgreSQL/postgres URL.** |
   | `APP_URL` | Your deployed URL (e.g. `https://grandcentrallibertybank.com`) |
   | `JWT_SECRET` | 64 random chars — run `openssl rand -base64 48` |
   | `CSRF_SECRET` | 64 random chars |
   | `SETTINGS_MASTER_KEY` | `openssl rand -base64 32` |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Your admin login |
   | `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | A demo customer login |

   (SMTP settings are optional — configure via the Admin panel after first login.)

4. **Build command:** `npm install && npm run build`
5. **Start command:** `npm start`

> **Important — DATABASE_URL must be a MongoDB URL.**
> If you previously deployed with a `postgresql://` or `postgres://` value in `DATABASE_URL`,
> you must update it to a `mongodb://` or `mongodb+srv://` connection string before redeploying.
> The startup logs will show `[start] CONFIGURATION ERROR` if the protocol is wrong.

## Step 3 — Initialise the database (first deploy only)

Run once in the Emergent shell/console:

```bash
npm run db:push   # pushes the Prisma MongoDB schema
npm run seed      # loads demo accounts
```

## Step 4 — Log in

- **Customer app:** `/login` with your `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` → lands on `/dashboard`
- **Admin center:** `/login` with your `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → lands on `/admin`

## Local development

```bash
npm install
# Create .env with at minimum:
#   DATABASE_URL=mongodb://localhost:27017/grand_central_liberty_bank
#   JWT_SECRET=<64 random chars>
#   CSRF_SECRET=<64 random chars>
#   SETTINGS_MASTER_KEY=<32 random chars>
npm run db:push
npm run seed
npm run dev               # http://localhost:3000
```

## Notes for production safety
- `node_modules`, `.next`, and `.env` are git-ignored (never committed).
- The app uses **MongoDB** — `DATABASE_URL` must start with `mongodb://` or `mongodb+srv://`.
- No hardcoded localhost in runtime paths; `APP_URL` drives absolute links.
- Run `npm run build` locally first to confirm it compiles before deploying.
