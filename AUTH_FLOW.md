# Authentication Flow

This document describes the complete authentication system used in TaskApp, including email/password login, session management, logout, and a deep dive into the Google OAuth flow.

---

## 1. Architecture Overview

The project uses a decoupled architecture:

| Layer | Technology | Port |
|-------|-----------|------|
| **Frontend** | Next.js 16 (App Router) | `3000` |
| **Backend** | Fastify 5 | `3001` |
| **Auth Library** | Better Auth (v1.6.20) | - |
| **Database** | PostgreSQL via Drizzle ORM | - |

### Why a Proxy Pattern?

The frontend does **not** call Better Auth directly. Instead, all auth requests go through Next.js API routes (`/api/auth/*`) which proxy to the Fastify backend. This ensures:

- **Same-origin cookies**: The browser sees cookies coming from `localhost:3000`.
- **Secret isolation**: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and database credentials never reach the frontend bundle.
- **Centralized logic**: All auth logic lives in one place (the backend).

---

## 2. Database Schema

Better Auth with the Drizzle adapter manages 4 tables in PostgreSQL:

### `user`

Stores user profiles.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary Key |
| `email` | `text` | Not null, unique |
| `emailVerified` | `boolean` | Not null, default `false` |
| `name` | `text` | |
| `image` | `text` | |
| `createdAt` | `timestamp` | Not null, default `now()` |
| `updatedAt` | `timestamp` | Not null, default `now()` |

### `session`

Tracks active login sessions.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary Key |
| `userId` | `text` | Not null, foreign key → `user.id` |
| `expiresAt` | `timestamp` | Not null |
| `token` | `text` | Not null, unique |
| `ipAddress` | `text` | |
| `userAgent` | `text` | |
| `createdAt` | `timestamp` | Not null, default `now()` |
| `updatedAt` | `timestamp` | Not null, default `now()` |
| `activeOrganizationId` | `text` | (Organization plugin) |

### `account`

Links users to OAuth providers.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary Key |
| `userId` | `text` | Not null, foreign key → `user.id` |
| `accountId` | `text` | Not null |
| `providerId` | `text` | Not null |
| `accessToken` | `text` | |
| `refreshToken` | `text` | |
| `accessTokenExpiresAt` | `timestamp` | |
| `refreshTokenExpiresAt` | `timestamp` | |
| `scope` | `text` | |
| `idToken` | `text` | |
| `password` | `text` | |
| `createdAt` | `timestamp` | Not null, default `now()` |
| `updatedAt` | `timestamp` | Not null, default `now()` |

Unique constraint: `(providerId, accountId)` — one Google account can only link to one user.

### `verification`

Used by Better Auth for email verification, password reset, and temporary state storage (e.g., OAuth `state` parameters).

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `text` | Primary Key |
| `identifier` | `text` | Not null |
| `value` | `text` | Not null |
| `expiresAt` | `timestamp` | Not null |
| `createdAt` | `timestamp` | Not null, default `now()` |
| `updatedAt` | `timestamp` | Not null, default `now()` |

---

## 3. Backend Auth Configuration

**File**: `apps/backend/src/auth/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { db } from "../db/client";
import { env } from "../env";

export const auth = betterAuth({
  trustedOrigins: [env.CORS_ORIGIN],
  database: drizzleAdapter(db, { provider: "pg" }),
  plugins: [organization()],
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});
```

**Environment Variables**:

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_SECRET` | Signs and verifies session cookies (min 32 chars) |
| `BETTER_AUTH_URL` | Frontend URL — where the browser lives. Used to construct OAuth redirect URIs (`http://localhost:3000`) |
| `CORS_ORIGIN` | Trusted frontend origin (`http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth App ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth App Secret |

---

## 4. Email / Password Authentication

### 4.1 Sign Up

**Trigger**: User submits the form on `/signup`.

**Frontend** (`apps/frontend/components/auth-form.tsx`):

```typescript
async function onSubmit(data: FormData) {
    const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "sign-up-email",
            name: data.name,
            email: data.email,
            password: data.password,
        }),
    })
    // ...
    router.push("/")
}
```

**Step-by-step**:

1. **Browser** → `POST http://localhost:3000/api/auth`
2. **Next.js Proxy** (`apps/frontend/app/api/auth/route.ts`) forwards the request to `POST http://localhost:3001/api/auth`, preserving the `Cookie` header and adding `Origin: http://localhost:3000`.
3. **Fastify** (`apps/backend/src/routes/auth.routes.ts`) receives the POST and routes it to `authDispatcher`.
4. **Dispatcher** (`apps/backend/src/controllers/auth.controller.ts`) sees `action: "sign-up-email"` and calls `signUpEmail(request, reply)`.
5. **Better Auth** (`auth.api.signUpEmail`):
   - Hashes the password with bcrypt.
   - Inserts a new row into the `user` table.
   - Creates a new `session` row.
   - Signs a `better-auth.session_token` cookie.
   - Returns `{ user, session }` along with a `Set-Cookie` header.
6. **Proxy** copies the `Set-Cookie` header from the backend response into the Next.js response.
7. **Browser** stores the cookie and the frontend redirects to `/`.

### 4.2 Sign In

**Trigger**: User submits the form on `/login`.

Same flow as sign up, but with `action: "sign-in-email"`:

```typescript
const res = await auth.api.signInEmail({
    body: { email, password },
    headers: fromNodeHeaders(request.headers),
    asResponse: true,
})
```

Better Auth:
1. Finds the user by email.
2. Verifies the password hash.
3. Creates a **new** `session` row.
4. Sets the session cookie.

---

## 5. Session Management

### 5.1 Checking the Session on the Frontend

**Dashboard Layout** (`apps/frontend/app/dashboard/layout.tsx`):

```typescript
"use client"

export default function DashboardLayout({ children }) {
    const router = useRouter()
    const { user, loading, fetchSession } = useAuthStore()

    useEffect(() => {
        fetchSession() // GET /api/auth/session
    }, [fetchSession])

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login")
        }
    }, [loading, user, router])

    // ...
}
```

**Auth Store** (`apps/frontend/store/auth-store.ts`):

```typescript
fetchSession: async () => {
    const res = await fetch("/api/auth/session")
    const data = await res.json()
    if (data?.user && data?.session) {
        set({ user: data.user, session: data.session, loading: false })
    } else {
        set({ user: null, session: null, loading: false })
    }
}
```

**Step-by-step**:

1. **Browser** → `GET http://localhost:3000/api/auth/session` (cookie included automatically).
2. **Next.js Proxy** (`apps/frontend/app/api/auth/session/route.ts`) forwards to `GET http://localhost:3001/api/auth/session`.
3. **Fastify** routes to `getSession` controller.
4. **Better Auth** (`auth.api.getSession`):
   - Reads the `better-auth.session_token` cookie from the request headers.
   - Verifies the cryptographic signature using `BETTER_AUTH_SECRET`.
   - Looks up the `session` row in PostgreSQL by token.
   - Fetches the linked `user` row.
   - Returns `{ user, session }`.
5. **Proxy** forwards the JSON response (and any refreshed cookies) back to the browser.
6. **Zustand store** updates `user` and `session`. If null, the dashboard redirects to `/login`.

### 5.2 Protecting Backend Routes

**Middleware** (`apps/backend/src/middlewares/auth.middleware.ts`):

```typescript
import { getSession } from "../auth/session";

export async function requireAuth(request, reply) {
    const session = await getSession(request.headers);
    if (!session) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
    (request as any).user = session.user;
}
```

Any Fastify route can protect itself with:

```typescript
app.get("/api/protected", { preHandler: [requireAuth] }, handler)
```

---

## 6. Logout Flow

**Trigger**: User clicks "Logout" in the dashboard sidebar.

**Frontend** (`apps/frontend/components/dashboard-sidebar.tsx`):

```typescript
async function handleLogout() {
    await fetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" }),
    })
    clearSession()
    router.push("/login")
    router.refresh()
}
```

**Backend** (`apps/backend/src/controllers/auth.controller.ts`):

```typescript
export async function logout(request: FastifyRequest, reply: FastifyReply) {
    const headers = fromNodeHeaders(request.headers)

    // 1. Explicitly revoke the session from the database
    const session = await auth.api.getSession({ headers })
    if (session?.session?.token) {
        await auth.api.revokeSession({
            headers,
            body: { token: session.session.token },
        })
    }

    // 2. Clear the session cookie
    const res = await auth.api.signOut({
        headers,
        asResponse: true,
    })

    return forwardResponse(reply, res)
}
```

**Step-by-step**:

1. **Browser** → `POST http://localhost:3000/api/auth` with `{ action: "logout" }`.
2. **Next.js Proxy** forwards to the backend.
3. **Dispatcher** calls `logout()`.
4. **Backend** first fetches the active session via `auth.api.getSession()`.
5. If a session exists, it calls `auth.api.revokeSession({ body: { token } })` which **deletes the `session` row from PostgreSQL**.
6. Then it calls `auth.api.signOut()` which returns a `Set-Cookie` header that expires/clears `better-auth.session_token`.
7. **Proxy** forwards the cleared cookie to the browser.
8. **Frontend** `clearSession()` resets Zustand state and redirects to `/login`.

**Why both `revokeSession` and `signOut`?**

- `signOut` attempts to delete the session internally, but it relies on reading the signed cookie. If there are edge cases (e.g., cookie verification quirks), the DB row might survive.
- `revokeSession` is explicit: it takes the session token and hard-deletes it from the database.
- Using both guarantees the session is destroyed **server-side** and the cookie is removed **client-side**.

---

## 7. The Proxy Pattern in Detail

### 7.1 Why Not Use Better Auth Client Directly?

The frontend **could** import `createAuthClient` from `better-auth/client` and call it directly. However, this project uses a **separated frontend/backend** architecture:

- Better Auth needs to set `HttpOnly` cookies. For the browser to accept them without warnings, they should appear to come from the same origin (`localhost:3000`).
- The database adapter (`drizzleAdapter`) runs on the backend, not the frontend.
- OAuth secrets and the `BETTER_AUTH_SECRET` must never be exposed to the browser.

### 7.2 How the Proxy Works

**Request Flow**:

```
Browser (localhost:3000)
    │ POST /api/auth
    ▼
Next.js API Route (apps/frontend/app/api/auth/route.ts)
    │ POST http://localhost:3001/api/auth
    ▼
Fastify Backend (apps/backend/src/routes/auth.routes.ts)
    │
    ▼
Better Auth Handler
```

**Response Flow**:

```
Better Auth Handler
    │ Set-Cookie: better-auth.session_token=...
    ▼
Fastify Backend
    │ forwards headers + body
    ▼
Next.js API Route
    │ copies Set-Cookie into NextResponse
    ▼
Browser (stores cookie)
```

This pattern is repeated for:
- `POST /api/auth` — all auth actions (sign in, sign up, social, logout)
- `GET /api/auth/session` — session retrieval
- `GET /api/auth/callback/[...provider]` — OAuth callbacks

---

## 8. Cookie Details

The session cookie is named **`better-auth.session_token`** (Better Auth default). In production (HTTPS), Better Auth prefixes it with `__Secure-`, making the full name `__Secure-better-auth.session_token`.

### Properties

| Property | Value | Description |
|----------|-------|-------------|
| **Name** | `better-auth.session_token` (dev) / `__Secure-better-auth.session_token` (prod) | Better Auth cookie name with `__Secure-` prefix in HTTPS |
| **Value** | Signed token | A cryptographically signed token |
| **Signing Secret** | `BETTER_AUTH_SECRET` | 32+ character secret from env |
| **HttpOnly** | `true` | Prevents JavaScript from reading it |
| **Path** | `/` | Sent on every request to the domain |
| **SameSite** | `lax` | Sent on top-level navigations and same-site requests |
| **Secure** | `true` in production | Only sent over HTTPS in prod |

### Lifecycle

1. **Created** on successful sign-in (email or OAuth).
2. **Verified** on every `GET /api/auth/session` and protected backend route.
3. **Refreshed** automatically by Better Auth if a refresh mechanism is configured.
4. **Cleared** on logout via a `Set-Cookie` header with an expired `Max-Age`.

For the complete cache flow and session refresh behavior, see [Section 14](#14-session-cookie-and-cache-flow).

---

## 9. Organization Plugin

Better Auth's `organization()` plugin is enabled on both frontend and backend.

### What It Adds

- **Teams/Groups**: Users can belong to multiple organizations.
- **Roles**: `owner`, `admin`, `member` within an organization.
- **Invitations**: Invite users by email to join an organization.
- **Active Organization**: The `session` table has an `activeOrganizationId` column representing the currently selected team.

### Client Setup

**File**: `apps/frontend/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [organizationClient()],
});
```

---

## 10. Social Auth (Google OAuth) — Deep Dive

This section explains the complete Google OAuth flow, from the moment the user clicks the button to the moment they are logged in.

### 10.1 Step 1: Initiate Login

**Where**: Browser, on `/login` or `/signup`.

**Code** (`apps/frontend/components/auth-form.tsx`):

```typescript
async function handleGoogleSignIn() {
    const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "sign-in-social",
            provider: "google",
            callbackURL: window.location.origin,  // "http://localhost:3000"
        }),
    })

    if (!res.ok) { /* handle error */ }

    const { url } = await res.json()
    if (url) {
        window.location.href = url  // Full page redirect to Google
    }
}
```

**What happens**:
- The frontend makes a standard `fetch()` to its own Next.js API route.
- `callbackURL` tells Better Auth: "After the user authenticates with Google, send them back here."
- The response contains a Google OAuth URL. The browser navigates to it.

---

### 10.2 Step 2: Frontend Proxy Forwards to Backend

**Where**: Next.js API Route (`apps/frontend/app/api/auth/route.ts`).

**Request**:

```
POST http://localhost:3000/api/auth
Content-Type: application/json
Cookie: <existing cookies>

{
  "action": "sign-in-social",
  "provider": "google",
  "callbackURL": "http://localhost:3000"
}
```

The proxy forwards this to:

```
POST http://localhost:3001/api/auth
Content-Type: application/json
Origin: http://localhost:3000
Cookie: <existing cookies>

{ same body }
```

---

### 10.3 Step 3: Backend Dispatches to Better Auth

**Where**: Fastify (`apps/backend/src/routes/auth.routes.ts` → `authDispatcher`).

The dispatcher sees `action: "sign-in-social"` and calls:

```typescript
// apps/backend/src/controllers/auth.controller.ts
export async function signInSocial(request, reply) {
    const { provider, callbackURL } = request.body
    const res = await auth.api.signInSocial({
        body: { provider, callbackURL },
        headers: fromNodeHeaders(request.headers),
        asResponse: true,
    })
    return forwardResponse(reply, res)
}
```

---

### 10.4 Step 4: Better Auth Generates the OAuth URL

Inside `auth.api.signInSocial`, Better Auth performs the following:

1. **Validates the provider config**: Checks that `google` is configured with `clientId` and `clientSecret`.
2. **Generates a cryptographically random `state` parameter**: A long random string (e.g., `fijiy40fokaRnRW5Tz7svUINUxL0u3_o`).
3. **Stores the `state` and `callbackURL` temporarily**: This is typically stored in the `verification` table or in-memory cache.
4. **Builds the Google OAuth authorization URL**:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_GOOGLE_CLIENT_ID
  &redirect_uri=http://localhost:3000/api/auth/callback/google
  &response_type=code
  &scope=openid%20email%20profile
  &state=fijiy40fokaRnRW5Tz7svUINUxL0u3_o
  &access_type=offline
  &prompt=consent
```

**Critical details**:
- `redirect_uri` is your **frontend** URL (`http://localhost:3000/api/auth/callback/google`), **not** the backend. The browser must be redirected to the same origin that initiated the login so cookies are set correctly. The frontend proxy then forwards the request to the backend.
- `state` is a one-time secret tied to this specific login attempt. It prevents CSRF attacks.
- `scope` requests permission to read the user's email, name, and profile picture.
- `prompt=consent` forces Google to show the consent screen every time (useful during development).

Better Auth returns this URL to the backend, which returns it to the frontend, which returns it to the browser.

---

### 10.5 Step 5: Browser Redirects to Google

The browser receives:

```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

And executes:

```javascript
window.location.href = url
```

The browser **navigates away** from your app. The user sees the Google sign-in screen. At this point:
- Your frontend is no longer loaded in the browser.
- The user authenticates directly with Google.
- Google may ask the user to consent to sharing their profile with your app.

---

### 10.6 Step 6: User Authenticates with Google

The user enters their Google credentials (or is already logged in). Google validates the credentials internally.

If the user approves your app, Google prepares an authorization response containing:
- An **authorization `code`**
- The original **`state`** parameter
- The granted **`scope`**

---

### 10.7 Step 7: Google Redirects Back to Your Frontend Proxy

Google redirects the browser to:

```
GET http://localhost:3000/api/auth/callback/google?
  state=fijiy40fokaRnRW5Tz7svUINUxL0u3_o
  &code=4/0AdkVLPwkoftVIaZ0dttAjPZdEIZ-RLBr7Ed4zmIwWB867shG4uZ_ypbDW_m_mEpkR_TbfA
  &scope=email%20profile%20https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/userinfo.email%20openid
  &authuser=1
  &hd=poli.ufrj.br
  &prompt=consent
```

**Important**: This request hits your **Next.js frontend proxy** (`localhost:3000`), which then forwards it to the Fastify backend. This ensures the `Set-Cookie` header is set on the same origin as the browser.

---

### 10.8 Step 8: Backend Callback Handler

**Where**: `apps/backend/src/routes/auth.routes.ts`

```typescript
app.get("/api/auth/callback/*", async (request, reply) => {
    // Reconstruct the full URL from Fastify's request parts
    const url = new URL(
        request.url,
        `${request.protocol}://${request.hostname}`
    )

    // Convert Fastify request to standard Web Request
    // (Better Auth expects the standard Web API Request object)
    const betterReq = new Request(url.toString(), {
        method: "GET",
        headers: fromNodeHeaders(request.headers),
    })

    // Hand off to Better Auth
    const betterRes = await auth.handler(betterReq)

    // Forward everything back: status code, headers, body
    reply.code(betterRes.status)
    betterRes.headers.forEach((value, key) => reply.header(key, value))
    const text = await betterRes.text()
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
})
```

**What this does**:
- Reconstructs the full callback URL including query parameters.
- Converts Fastify's Node.js-style request into a standard Web API `Request` object (Better Auth is built on web standards).
- Calls `auth.handler(betterReq)` which is Better Auth's internal router.
- Forwards the response (status, headers, body) back to whoever called it.

---

### 10.9 Step 9: Better Auth Processes the Callback (The Heavy Lifting)

This is the core of the OAuth flow. Inside `auth.handler(betterReq)`:

#### 9a. Validate the `state` parameter

Better Auth extracts `state` from the query string and checks it against the value stored in Step 4.

- **If it matches**: Continue processing.
- **If it doesn't match**: Reject the request with an error. This prevents CSRF attacks where a malicious site tricks a user into visiting the callback URL.

#### 9b. Exchange the `code` for tokens

Better Auth makes a **server-to-server HTTP request** from your Fastify backend to Google's token endpoint:

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=4/0AdkVLPwkoftVIaZ0dttAjPZdEIZ-RLBr7Ed4zmIwWB867shG4uZ_ypbDW_m_mEpkR_TbfA
&redirect_uri=http://localhost:3000/api/auth/callback/google
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

Google responds with:

```json
{
  "access_token": "ya29.a0Ae4lvC0...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
  "refresh_token": "1//0d..."
}
```

- `access_token`: Short-lived token for calling Google APIs.
- `id_token`: A JWT containing the user's identity information.
- `refresh_token`: Only provided on the first consent; used to get new access tokens without re-authenticating.

#### 9c. Decode and verify the `id_token` (JWT)

The `id_token` is a JSON Web Token containing the user's Google profile:

```json
{
  "sub": "123456789012345678901",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/a-/...",
  "email": "john@poli.ufrj.br",
  "email_verified": true,
  "hd": "poli.ufrj.br",
  "iss": "https://accounts.google.com",
  "aud": "YOUR_CLIENT_ID",
  "iat": 1700000000,
  "exp": 1700003600
}
```

Better Auth:
1. Verifies the JWT signature using Google's published public keys (fetched from `https://www.googleapis.com/oauth2/v3/certs`).
2. Checks the `iss` (issuer) is `https://accounts.google.com`.
3. Checks the `aud` (audience) matches your `GOOGLE_CLIENT_ID`.
4. Checks the `exp` (expiration) is in the future.

#### 9d. Look up or create the user

Better Auth queries your PostgreSQL database:

```sql
SELECT * FROM account
WHERE provider_id = 'google'
  AND account_id = '123456789012345678901'
```

**Case A: User already exists**
- The `account` row is found.
- Better Auth fetches the linked `user` row using `account.user_id`.
- The existing user is signed in.

**Case B: New user**
- No `account` row is found.
- Better Auth creates a new `user` row:
  ```sql
  INSERT INTO user (id, email, email_verified, name, image, created_at, updated_at)
  VALUES ('usr_xxx', 'john@poli.ufrj.br', true, 'John Doe', 'https://lh3...', now(), now())
  ```
- Better Auth creates an `account` row linking them to Google:
  ```sql
  INSERT INTO account (id, user_id, account_id, provider_id, access_token, id_token, scope, created_at, updated_at)
  VALUES ('acc_xxx', 'usr_xxx', '123456789012345678901', 'google', 'ya29...', 'eyJhb...', 'openid email profile', now(), now())
  ```

#### 9e. Create a session

```sql
INSERT INTO session (id, user_id, token, expires_at, created_at, updated_at)
VALUES ('sess_xxx', 'usr_xxx', 'random-session-token-xyz', now() + interval '7 days', now(), now())
```

#### 9f. Set the session cookie

Better Auth constructs an HTTP response with:

```
Set-Cookie: better-auth.session_token=random-session-token-xyz; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax
```

In production (HTTPS), the cookie name is prefixed with `__Secure-`:
```
Set-Cookie: __Secure-better-auth.session_token=random-session-token-xyz; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; Secure
```

#### 9g. Return a 302 Redirect

Better Auth returns:

```
HTTP/1.1 302 Found
Location: http://localhost:3000
Set-Cookie: better-auth.session_token=random-session-token-xyz; HttpOnly; Path=/; Max-Age=604800
```

This tells the browser: "Go back to the frontend, and here's your new session cookie."

---

### 10.10 Step 10: Frontend Callback Proxy Receives the Redirect

But the browser is at `accounts.google.com`. It follows the `302` to:

```
GET http://localhost:3000/api/auth/callback/google?
  code=4/0AdkVL...
  &state=fijiy40fokaRnRW5Tz7svUINUxL0u3_o
  &scope=...
```

This hits your **Next.js callback proxy** (`apps/frontend/app/api/auth/callback/[...provider]/route.ts`):

```typescript
export async function GET(request: NextRequest, { params }) {
    const { provider } = await params
    const providerPath = provider.join("/")
    const search = request.nextUrl.search
    const cookie = request.headers.get("cookie") || ""

    const res = await fetch(
        `${BACKEND_URL}/api/auth/callback/${providerPath}${search}`,
        {
            headers: {
                Origin: ORIGIN,
                ...(cookie ? { cookie } : {}),
            },
            redirect: "manual",  // ← CRITICAL: Do NOT follow redirects automatically
        }
    )

    if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        if (location) {
            const response = NextResponse.redirect(
                new URL(location, request.url)
            )
            const cookies = res.headers.getSetCookie()
            for (const cookie of cookies) {
                response.headers.append("Set-Cookie", cookie)
            }
            return response
        }
    }

    const text = await res.text()
    try {
        return NextResponse.json(JSON.parse(text), { status: res.status })
    } catch {
        return new NextResponse(text, { status: res.status })
    }
}
```

**Why this proxy is essential**:
- The OAuth callback must land on the **same origin** that initiated it (`localhost:3000`).
- If Google redirected directly to the backend (`localhost:3001`), the `Set-Cookie` header would be set for the backend domain. The browser would reject it or the frontend wouldn't know the login succeeded.
- The proxy forwards the request (with existing cookies) to the backend. The backend runs Step 9 and returns the `302` with `Set-Cookie`.

**What `redirect: "manual"` does**:
- Normally, `fetch()` follows HTTP redirects automatically (`redirect: "follow"`).
- With `redirect: "manual"`, `fetch()` returns the `302` response as-is.
- This allows the proxy to inspect the `Location` header and `Set-Cookie` headers and forward them to the browser.

---

### 10.11 Step 11: Proxy Forwards the Redirect and Cookie to the Browser

The proxy extracts the redirect information:

```typescript
const location = res.headers.get("location")        // "http://localhost:3000"
const cookies = res.headers.getSetCookie()          // ["better-auth.session_token=..."]
```

And constructs a new Next.js response:

```typescript
const response = NextResponse.redirect(
    new URL(location, request.url)  // Resolves relative URLs
)
for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie)
}
return response
```

The browser receives:

```
HTTP/1.1 302 Found
Location: http://localhost:3000
Set-Cookie: better-auth.session_token=random-session-token-xyz; HttpOnly; Path=/; Max-Age=604800
```

In production (HTTPS), the cookie name includes the `__Secure-` prefix and the `Secure` flag.

---

### 10.12 Step 12: Browser Redirects to the App

The browser follows the final `302` to `http://localhost:3000`.

Now:
- The `better-auth.session_token` cookie is stored in the browser.
- The user lands on the home page (`/`).
- Any subsequent request to `/api/auth/session` will include the cookie.
- The dashboard layout calls `fetchSession()` → gets `{ user, session }` → the user is logged in.

---

## 11. The Complete OAuth Request Chain (ASCII Diagram)

```
┌──────────┐
│  Browser │  ① POST /api/auth
│ (User)   │     Body: { action: "sign-in-social", provider: "google", callbackURL: "http://localhost:3000" }
└────┬─────┘
     │
     │ ② Proxied to → POST http://localhost:3001/api/auth
     │                Headers: Origin: http://localhost:3000
     │
     │ ③ Returns JSON: { url: "https://accounts.google.com/o/oauth2/v2/auth?..." }
     │
     │ ④ window.location.href = url
     │    Browser navigates to Google
     │
     │ ⑤ User authenticates at Google
     │
     │ ⑥ Google redirects to:
     │    GET http://localhost:3000/api/auth/callback/google?code=...&state=...
     │
     │ ⑦ Next.js proxy forwards to backend (with redirect: "manual")
     │    POST http://localhost:3001/api/auth/callback/google?code=...&state=...
     │
     │ ⑧ Better Auth (inside Fastify):
     │    - Validates state
     │    - POST https://oauth2.googleapis.com/token (exchange code for tokens)
     │    - Decodes id_token JWT
     │    - SELECT account WHERE provider_id='google' AND account_id='...'
     │    - INSERT user + account (if new)
     │    - INSERT session
     │    - Signs cookie
     │    - Returns: 302 Location: http://localhost:3000
     │               Set-Cookie: better-auth.session_token=...
     │
     │ ⑨ Next.js proxy forwards 302 + Set-Cookie to browser
     │
     │ ⑩ Browser follows 302 to http://localhost:3000
     │    Cookie is now set! User is logged in.
     ▼
```

---

## 12. Key Security Mechanisms in OAuth

| Mechanism | How It Protects |
|-----------|----------------|
| **`state` parameter** | Prevents CSRF attacks. An attacker cannot forge a callback because they don't know the random `state` value generated by Better Auth. |
| **`redirect_uri` validation** | Google only redirects to the exact `redirect_uri` registered in the Google Cloud Console. An attacker cannot change it to steal the code. |
| **Backend handles secrets** | `client_secret` and `BETTER_AUTH_SECRET` never leave the Fastify server. The frontend only sees the public `client_id`. |
| **Signed session cookie** | The session token is cryptographically signed. If a user tampers with it, Better Auth rejects it. |
| **Database session** | The session exists in PostgreSQL, not just the cookie. You can revoke it server-side at any time. |
| **`id_token` verification** | Better Auth verifies the JWT signature, issuer (`iss`), audience (`aud`), and expiration (`exp`) before trusting Google's identity claim. |

---

## 13. Why the 500 Bug Happened (Recap)

The original callback proxy had a critical bug:

```typescript
// BEFORE (broken):
const res = await fetch(`${BACKEND_URL}/api/auth/callback/${providerPath}${search}`, {
    headers: { Origin: ORIGIN, ...(cookie ? { cookie } : {}) },
    // redirect: "follow" is the default!
})

if (res.status >= 300 && res.status < 400) {
    // This block was NEVER reached because fetch() followed the redirect
}

const data = await res.json()  // Crashed here: res.body was HTML, not JSON
```

**The problem**:
1. Backend returned `302 Location: http://localhost:3000` with a `Set-Cookie` header.
2. `fetch()` **silently followed** the redirect (`redirect: "follow"` is the default).
3. `fetch()` fetched `http://localhost:3000` and returned its HTML content.
4. The code tried `res.json()` on HTML → **SyntaxError** → Next.js rendered a **500 error page**.

**The fix**:

```typescript
// AFTER (fixed):
const res = await fetch(`${BACKEND_URL}/api/auth/callback/${providerPath}${search}`, {
    headers: { Origin: ORIGIN, ...(cookie ? { cookie } : {}) },
    redirect: "manual",  // ← Do not follow redirects
})

if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location")
    const response = NextResponse.redirect(new URL(location, request.url))
    const cookies = res.headers.getSetCookie()
    for (const cookie of cookies) {
        response.headers.append("Set-Cookie", cookie)
    }
    return response
}
```

With `redirect: "manual"`:
1. `fetch()` returns the `302` response as-is.
2. The proxy intercepts the `Location` header.
3. The proxy creates its own `302` redirect to the browser.
4. The proxy forwards the `Set-Cookie` header to the browser.
5. The browser handles the redirect and stores the cookie properly.

---

## 14. Session Cookie and Cache Flow

### 14.1 Cookie Properties (Production)

In production (HTTPS), Better Auth prefixes the session cookie with `__Secure-`, making the full name:

```
__Secure-better-auth.session_token
```

| Property | Value | Description |
|----------|-------|-------------|
| **Name** | `__Secure-better-auth.session_token` | `__Secure-` prefix is added automatically in production |
| **Value** | Signed token | A cryptographically signed token |
| **Signing Secret** | `BETTER_AUTH_SECRET` | 32+ character secret from env |
| **HttpOnly** | `true` | Prevents JavaScript from reading it |
| **Path** | `/` | Sent on every request to the domain |
| **SameSite** | `lax` | Sent on top-level navigations and same-site requests |
| **Secure** | `true` | Only sent over HTTPS |

### 14.2 What Happens on a Page Refresh

When the user refreshes `/dashboard`, the following sequence occurs:

1. **Browser requests `/dashboard`**
2. **Next.js Edge Middleware** (`apps/frontend/middleware.ts`) runs first — it reads the cookie **locally** from the request headers. No network request to the backend occurs at this stage.
3. **Server renders the page** (SSR). The dashboard layout is a Client Component, so during SSR it renders the `<div>Loading...</div>` fallback.
4. **Client hydrates**. The React tree mounts in the browser.
5. **`useEffect(() => fetchSession(), [])` fires** — this is when you should see a network request to `/api/auth/session` in DevTools.
6. **`fetchSession()`** calls the Next.js API route, which proxies to the backend with the raw `Cookie` header.
7. **Backend verifies** the signed cookie and returns `{ user, session }`.
8. **Zustand store updates** → React re-renders → dashboard content appears.

### 14.3 Why the Session Fetch Wasn't Visible in DevTools

Before the cache flow fixes, the session fetch response was being cached at multiple layers:

- `fetch("/api/auth/session")` with no `cache` option → browser defaults to its own heuristics
- The Next.js API route had no `Cache-Control` headers → could be cached by Next.js edge/CDN
- Result: on refresh, the browser served the cached response (often `null` from a previous unauthenticated state) without making a visible network request

### 14.4 Cache Prevention Measures

The following measures ensure the session is always freshly validated:

**In `fetchSession()` (`apps/frontend/store/auth-store.ts`)**:
```typescript
const res = await fetch("/api/auth/session", {
    credentials: "include",  // ensures cookies are sent
    cache: "no-store",       // tells the browser never to cache
})
```

**In API route responses (`apps/frontend/app/api/auth/session/route.ts` and `apps/frontend/app/api/auth/route.ts`)**:
```typescript
response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
```

### 14.5 Cache Flow Summary

| Layer | What It Caches | How It's Controlled |
|---|---|---|
| Browser | `fetch()` responses | `cache: "no-store"` in `fetchSession()` |
| Next.js Edge / CDN | API route responses | `Cache-Control: no-store` header |
| Next.js `router.refresh()` | RSC payloads | Not applicable here (client component) |

### 14.6 Cookie Flow on Login

1. **Login** → backend responds with `Set-Cookie: __Secure-better-auth.session_token=...`
2. Browser stores the cookie (HttpOnly, Secure, SameSite=lax)
3. **Refresh /dashboard** → browser sends the cookie automatically with every request to your domain
4. **`fetchSession()`** → browser attaches the cookie to `/api/auth/session`
5. **API route** (`apps/frontend/app/api/auth/session/route.ts`) receives the cookie via `request.headers.get("cookie")`
6. API route forwards it to the backend
7. Backend verifies the signature and returns session data

### 14.7 Middleware and Session Validation

The middleware (`apps/frontend/middleware.ts`) and the dashboard layout work independently:

- **Middleware** only checks `request.cookies.get("__Secure-better-auth.session_token")` — it verifies the cookie **exists**, not that it's **valid**
- **Dashboard layout** then validates the session by calling the backend via `fetchSession()`

This means:
- A user with an expired but present cookie can reach `/dashboard` (middleware lets them through)
- The layout's `fetchSession()` returns `null`
- User sees "Loading..." → redirect to `/login`

There's a brief flash of the loading state. This is intentional — validating the session in the middleware would require calling the backend on every single page request, adding latency. The current approach keeps the middleware fast (cookie presence check only) and defers full validation to the client-side `fetchSession()`.
