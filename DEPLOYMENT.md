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

### 1.1 Create a Railway Project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will auto-detect the project. Set the **Root Directory** to `apps/backend`.

### 1.2 Configure Build & Start Commands

In Railway, go to your service settings and set:

| Setting | Value |
|---------|-------|
| **Build Command** | `pnpm build` |
| **Start Command** | `pnpm start` |

Or if Railway auto-detects:
- Build: `tsc`
- Start: `node dist/index.js`

### 1.3 Add Environment Variables

Add all the backend variables listed above in the Railway dashboard.

### 1.4 Deploy

Click **Deploy**. Railway will build and start your backend.

Once deployed, copy the **public domain** (e.g., `https://task-app-api.up.railway.app`). You will need it for the frontend.

### 1.5 Run Database Migrations

After the backend is deployed, you need to run Drizzle migrations to set up the database tables.

**Option A: Railway CLI (Recommended)**

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login and link your project
railway login
railway link

# Run migrations
railway run -- pnpm db:migrate
```

**Option B: Railway Console**

1. Go to your Railway project dashboard.
2. Click on your service → **Console** tab.
3. Run:
   ```bash
   pnpm db:migrate
   ```

**Option C: Local with Railway connection**

```bash
# In apps/backend/
railway run -- pnpm db:migrate
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
