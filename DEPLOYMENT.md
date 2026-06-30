# Deployment Guide

This guide covers deploying TaskApp with **Vercel** (frontend) and **Railway** (backend).

---

## Architecture

| Service | Platform | Role | Example URL |
|---------|----------|------|-------------|
| **Frontend** | Vercel | Next.js 16 app | `https://task-app.vercel.app` |
| **Backend** | Railway | Fastify 5 API | `https://task-app-api.up.railway.app` |
| **Database** | Supabase | PostgreSQL | `postgresql://...` |

---

## Environment Variables

### Backend (Railway)

Set these in your Railway project dashboard under **Variables**.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://postgres:password@db.supabase.co:5432/postgres` |
| `BETTER_AUTH_SECRET` | **Yes** | 32+ character secret for signing cookies | `super-secret-key-change-me-in-production-now` |
| `BETTER_AUTH_URL` | **Yes** | Public URL of the backend | `https://task-app-api.up.railway.app` |
| `CORS_ORIGIN` | **Yes** | URL of the frontend (for CORS) | `https://task-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | **Yes** | From Google Cloud Console | `897176395617-...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | From Google Cloud Console | `GOCSPX-...` |
| `PORT` | No | Railway sets this automatically | `3001` |

**Generating a secure `BETTER_AUTH_SECRET`:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your production secret.

### Frontend (Vercel)

Set these in your Vercel project dashboard under **Settings > Environment Variables**.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Public URL of the backend API | `https://task-app-api.up.railway.app` |

> **Note**: `NEXT_PUBLIC_` prefix makes this variable available in the browser. The frontend uses it to know where to proxy auth requests.

---

## Step 1: Deploy the Backend to Railway

### Why We Build from the Monorepo Root

This project is a **pnpm monorepo** with workspace packages in `packages/*` (e.g., `@meu-projeto/types`). Both the frontend and backend import from `packages/types/` for shared Zod schemas and validation.

If Railway builds from `apps/backend/` in isolation, it cannot resolve `"@meu-projeto/types": "workspace:*"` because the `packages/` folder is outside the build context.

**The solution**: Build from the **repo root** (`.`) so pnpm sees `pnpm-workspace.yaml`, installs all workspace packages, and symlinks them correctly. Then use pnpm filters to **only build and start the backend**.

---

### 1.1 Create a Railway Project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.

### 1.2 Configure the Service

After Railway creates the service, go to the service **Settings** tab and configure:

| Setting | Value | Why |
|---------|-------|-----|
| **Root Directory** | `.` | Builds from the repo root so pnpm can resolve workspace packages |
| **Build Command** | `pnpm install && pnpm --filter backend build` | Installs ALL monorepo deps, then compiles only the backend |
| **Start Command** | `pnpm --filter backend start` | Starts only the backend app |

> **What `pnpm --filter backend` does**: It runs the command in the `apps/backend` package only, ignoring the frontend and other apps.

### 1.3 The `railway.toml` File

A `railway.toml` file at the repo root tells Railway to use these settings automatically:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "pnpm --filter backend start"
```

This is already in your repo. Railway will auto-detect it.

### 1.4 How Workspace Packages Work on Railway

When Railway runs `pnpm install` from the root:

1. pnpm reads `pnpm-workspace.yaml` and finds `apps/*` and `packages/*`
2. It installs dependencies for ALL workspace packages
3. It creates symlinks in `node_modules/@meu-projeto/types` → `packages/types/`
4. The backend can now import `"@meu-projeto/types"` just like it does locally

### 1.5 Add Environment Variables

Add all the backend variables listed above in the Railway dashboard under **Variables**.

### 1.6 Deploy

Click **Deploy**. Railway will build and start your backend.

Once deployed, copy the **public domain** (e.g., `https://task-app-api.up.railway.app`). You will need it for the frontend.

### 1.7 Run Database Migrations

After the backend is deployed, you need to run Drizzle migrations to set up the database tables.

**Option A: Railway Console (Easiest)**

1. Go to your Railway project dashboard.
2. Click on your service → **Console** tab.
3. Run:
   ```bash
   pnpm --filter backend db:migrate
   ```

**Option B: Railway CLI**

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login and link your project
railway login
railway link

# Run migrations
railway run -- pnpm --filter backend db:migrate
```

---

## Step 2: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 credentials.
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-railway-backend.up.railway.app/api/auth/callback/google
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-vercel-frontend.vercel.app
   ```
5. Save.

> **Important**: The `redirect_uri` must exactly match what Better Auth generates. It uses `BETTER_AUTH_URL` + `/api/auth/callback/google`. So if `BETTER_AUTH_URL=https://task-app-api.up.railway.app`, the redirect URI must be `https://task-app-api.up.railway.app/api/auth/callback/google`.

---

## Step 3: Deploy the Frontend to Vercel

### 3.1 Create a Vercel Project

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New Project** → import your GitHub repository.
3. Vercel will auto-detect the framework (Next.js).

### 3.2 Configure Root Directory

In the project settings, set the **Root Directory** to `apps/frontend`.

### 3.3 Add Environment Variable

Add `NEXT_PUBLIC_API_URL` with your Railway backend URL:

```
NEXT_PUBLIC_API_URL=https://task-app-api.up.railway.app
```

### 3.4 Deploy

Click **Deploy**. Vercel will build and deploy your frontend.

---

## Step 4: Update Backend CORS (If Needed)

After deploying the frontend, update the `CORS_ORIGIN` environment variable in Railway to match your Vercel production URL:

```
CORS_ORIGIN=https://task-app.vercel.app
```

Then redeploy the backend service in Railway.

---

## How the Code Handles Production

The codebase has been updated to automatically work in both development and production without code changes:

### Frontend API Routes

All auth proxy routes (`/api/auth`, `/api/auth/session`, `/api/auth/callback/*`) now use `request.nextUrl.origin` instead of hardcoded `http://localhost:3000`:

```typescript
const origin = request.nextUrl.origin
// Uses https://task-app.vercel.app in production
// Uses http://localhost:3000 in development
```

This ensures the `Origin` header sent to the backend matches the actual frontend URL.

### Backend CORS

The backend reads `CORS_ORIGIN` from environment variables. In production, set it to your Vercel URL.

### Better Auth URL

The `BETTER_AUTH_URL` env var tells Better Auth its own public URL. This is used to construct OAuth `redirect_uri` values and set cookie domains correctly.

---

## Troubleshooting

### Railway crash: "workspace package not found" or "@meu-projeto/types" import error

**Cause**: Railway built from `apps/backend/` in isolation and couldn't resolve the workspace package `"@meu-projeto/types"`.

**Fix**:
1. Go to your Railway service **Settings**.
2. Set **Root Directory** to `.` (repo root).
3. Set **Build Command** to `pnpm install && pnpm --filter backend build`.
4. Set **Start Command** to `pnpm --filter backend start`.
5. Redeploy.

Building from the root ensures pnpm sees `pnpm-workspace.yaml` and installs all workspace dependencies.

### Railway tries to build the frontend

**Cause**: Railway auto-detected `turbo.json` and ran `turbo build`, which tries to build ALL apps including the frontend.

**Fix**: The `pnpm --filter backend` prefix ensures only the backend app is built and started. Verify your settings match the table in Step 1.2.

### "Unauthorized" or 401 errors after login

- Check that `BETTER_AUTH_SECRET` is set and is at least 32 characters.
- Check that `BETTER_AUTH_URL` matches your Railway public domain exactly (no trailing slash).
- Check that the `better-auth.session_token` cookie is being set. Look in browser DevTools → Application → Cookies.

### CORS errors

- Verify `CORS_ORIGIN` in Railway matches your Vercel URL exactly (including `https://`).
- Check the backend logs for the actual origin being received.

### OAuth redirect mismatch

- In Google Cloud Console, the authorized redirect URI must **exactly** match `BETTER_AUTH_URL/api/auth/callback/google`.
- No trailing slash, no path variations.

### Database connection errors

- Verify `DATABASE_URL` is correct.
- If using Supabase, ensure the connection pooler port is correct (usually `5432` or `6543` for connection pooling).
- If SSL issues occur, the backend already has `ssl: { rejectUnauthorized: false }` configured.

### "Cannot find module" errors on Railway

- Make sure `pnpm build` completes successfully.
- Check that `dist/` is generated and contains `index.js`.
- Verify the **Start Command** is `node dist/index.js`.

---

## Deployment Checklist

- [ ] Backend deployed on Railway with all env vars
- [ ] Database migrations ran successfully (`pnpm db:migrate`)
- [ ] `BETTER_AUTH_SECRET` is a new random 32+ char string (not the dev one)
- [ ] `BETTER_AUTH_URL` is the Railway public URL
- [ ] `CORS_ORIGIN` is the Vercel frontend URL
- [ ] Google OAuth redirect URI updated with Railway backend URL
- [ ] Google OAuth JavaScript origin updated with Vercel frontend URL
- [ ] Frontend deployed on Vercel with `NEXT_PUBLIC_API_URL` set
- [ ] Tested sign-up flow
- [ ] Tested Google OAuth flow
- [ ] Tested logout flow
- [ ] Verified session persists across page refreshes
