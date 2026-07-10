# Zustand Stores: From Global to Context-Scoped

## The Problem with Global Stores in Next.js

Before this change, both `auth-store` and `tasks-store` were created as **global singletons**:

```ts
// OLD — store/auth-store.ts (before)
import { create } from "zustand"

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  // ...actions
}))
```

This means there is **exactly one store** for the entire app. It lives in the module scope (the JavaScript bundle), and every component that calls `useAuthStore()` reads and writes to that same single object.

### Why is this a problem?

| Scenario | What happens with a global store |
|---|---|
| **User A logs out, User B logs in (no full page reload)** | The store still has User A's data until `clearSession()` is called. If `clearSession()` is forgotten or fails, User B sees User A's info. |
| **Two users share the same browser (SPA navigation)** | The store persists across navigations because it's a module-level variable, not tied to any component lifecycle. |
| **Server-side rendering (SSR)** | During SSR, Next.js renders the HTML on the server. A global store would be shared across all concurrent requests on the server, potentially leaking data between users. |

In our current app, the logout flow does `router.push("/login")` which triggers a full navigation, so the risk is low **today**. But as the app grows (e.g., account switching without redirect, server components reading session data), a global store becomes a liability.

---

## The Solution: Context + useMemo

We refactored both stores to use React's **Context API** combined with `useMemo`. This ensures each user session gets its own store instance.

### Step 1: What is React Context?

Context is React's built-in way to pass data through the component tree without having to pass props down manually at every level.

Think of it like a **pipe** that runs from a parent component down to all its children. The parent puts data into the pipe, and any child can read from it.

```tsx
// 1. Create a context (the "pipe")
const MyContext = createContext<string | null>(null)

// 2. Provider puts data into the pipe
function App() {
  return (
    <MyContext.Provider value="hello">
      <Child />
    </MyContext.Provider>
  )
}

// 3. Child reads from the pipe
function Child() {
  const value = useContext(MyContext)
  // value === "hello"
  return <div>{value}</div>
}
```

If you have two separate Providers, they create two separate pipes:

```tsx
<MyContext.Provider value="user-A">
  <Child />  {/* reads "user-A" */}
</MyContext.Provider>

<MyContext.Provider value="user-B">
  <Child />  {/* reads "user-B" */}
</MyContext.Provider>
```

This is the key: **each Provider instance creates an isolated scope**. When we wrap the store in a Provider, each user session gets its own isolated store.

### Step 2: What is useMemo?

`useMemo` is a React hook that **memoizes** (caches) a value so it's only recomputed when its dependencies change.

```tsx
const value = useMemo(() => expensiveComputation(), [dep1, dep2])
```

- On the **first render**, the function runs and the result is stored.
- On **subsequent renders**, if `[dep1, dep2]` hasn't changed, React returns the cached value without re-running the function.
- If any dependency changes, the function runs again and a new value is cached.

When we use `useMemo(() => createStore(), [])` with an **empty dependency array** `[]`, it means:

> "Create this store exactly once, when the component first mounts. Never recreate it unless the component unmounts and remounts."

This is exactly what we want — one store per provider instance, stable across re-renders.

### Step 3: Putting it together — the new store pattern

Here's the full pattern for `auth-store`:

```tsx
// NEW — store/auth-store.tsx (simplified)
"use client"

import { createContext, useContext, useMemo } from "react"
import { createStore, useStore } from "zustand"

// 1. Define the state shape (unchanged)
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setSession: (user: User | null, session: Session | null) => void
  clearSession: () => void
  fetchSession: () => Promise<void>
}

// 2. Factory function — creates a NEW store each time it's called
function createAuthStore() {
  return createStore<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    setSession: (user, session) => set({ user, session, loading: false }),
    clearSession: () => set({ user: null, session: null, loading: false }),
    fetchSession: async () => {
      // ...same fetch logic as before
    },
  }))
}

// 3. Create the Context (the "pipe")
type AuthStore = ReturnType<typeof createAuthStore>
const AuthStoreContext = createContext<AuthStore | null>(null)

// 4. Provider component — creates the store and puts it in the pipe
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => createAuthStore(), [])

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  )
}

// 5. Selector hook — reads from the pipe
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error("useAuthStore must be used within AuthProvider")
  }
  return useStore(store, selector)
}
```

#### Breaking down each part:

**Part 2 — Factory function (`createAuthStore`)**

Instead of calling `create()` at the module level (which creates one global store), we wrap it in a function. Every time this function is called, it creates a **brand new store**.

```
OLD (global):                    NEW (factory):
const useAuthStore = create(...)  function createAuthStore() {
                                    return createStore(...)
                                  }
                                  // Called once per provider
```

**Part 4 — Provider (`AuthProvider`)**

This is a React component that:
1. Calls `useMemo(() => createAuthStore(), [])` — creates the store once
2. Puts the store into the Context via `<AuthStoreContext.Provider value={store}>`
3. Renders its children — any child can now access the store

The `useMemo` with `[]` ensures the store is created **only once** per provider instance. Without `useMemo`, a new store would be created on every render, breaking the app.

**Part 5 — Selector hook (`useAuthStore`)**

Instead of returning the whole store, this hook takes a **selector function** that picks exactly what the component needs:

```tsx
// Component only re-renders when `user` changes (not when `loading` changes)
const user = useAuthStore((s) => s.user)

// Component only re-renders when `clearSession` changes (never, since it's stable)
const clearSession = useAuthStore((s) => s.clearSession)
```

This is more efficient than the old pattern where the component would re-render on **any** store change.

---

## How the Provider is used in the app

The `Providers` component (in `components/providers.tsx`) wraps the entire app:

```tsx
// components/providers.tsx
"use client"

import { AuthProvider } from "@/store/auth-store"
import { TasksProvider } from "@/store/tasks-store"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TasksProvider>
        {children}
      </TasksProvider>
    </AuthProvider>
  )
}
```

This is rendered in the root layout:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### What this means in practice:

```
<App>
  <Providers>                          ← AuthProvider creates Store A
    <AuthProvider>                     ← TasksProvider creates Store B
      <TasksProvider>
        <DashboardLayout>
          <Sidebar>
            <UserMenu />               ← reads from Store A (auth)
          </Sidebar>
          <main>
            <TasksContent />           ← reads from Store B (tasks)
          </main>
        </DashboardLayout>
      </TasksProvider>
    </AuthProvider>
  </Providers>
</App>
```

Every component inside the tree reads from the **same** Store A and Store B. But if the `<AuthProvider>` ever unmounts and remounts (e.g., on a full page navigation), a **new** Store A is created — clean, with no leftover data.

---

## How consumers changed

### Before (global store):

```tsx
// OLD — destructured the whole store
const { user, clearSession } = useAuthStore()
```

This worked because `useAuthStore` was the hook returned by `create()`, which returns the full state object.

### After (context-scoped store with selector):

```tsx
// NEW — selector pattern
const user = useAuthStore((s) => s.user)
const clearSession = useAuthStore((s) => s.clearSession)
```

The `useStore` function from Zustand (used inside our `useAuthStore` hook) takes a selector function. It:
1. Reads the store from Context
2. Runs the selector to extract the needed value
3. Subscribes the component **only** to changes in that specific value

### Why the selector pattern is better:

```tsx
// With the old pattern, this component re-renders when ANY store field changes:
const { user, loading, session } = useAuthStore()
// user changes → re-render
// loading changes → re-render (unnecessary if component doesn't use loading)
// session changes → re-render (unnecessary if component doesn't use session)

// With the selector pattern, this component ONLY re-renders when user changes:
const user = useAuthStore((s) => s.user)
// user changes → re-render
// loading changes → NO re-render
// session changes → NO re-render
```

---

## How this prevents cross-user data leakage

### Scenario: User A logs out, User B logs in

**With the old global store:**

```
1. User A logs in → store.user = { name: "Alice" }
2. User A clicks logout → clearSession() → store.user = null
3. router.push("/login") → full page navigation
4. User B logs in → store.user = { name: "Bob" }
```

If step 2 (`clearSession()`) was skipped or failed, User B would briefly see User A's data.

**With the new context-scoped store:**

```
1. User A logs in → Provider mounts → new Store A → store.user = { name: "Alice" }
2. User A clicks logout → clearSession() → store.user = null
3. router.push("/login") → full page navigation → Provider unmounts
4. User B logs in → Provider remounts → new Store B (clean, null) → store.user = { name: "Bob" }
```

Even if `clearSession()` was skipped, the **new Store B** starts with `user: null` because it's a fresh instance. The old Store A is garbage-collected when the Provider unmounts.

### Visual comparison:

```
OLD (global):
┌─────────────────────────────────┐
│         Module Scope            │
│                                 │
│  ┌───────────────────────────┐  │
│  │  useAuthStore (global)    │  │
│  │  user: "Alice"            │  │  ← Shared by everyone
│  │  session: { ... }         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

NEW (context-scoped):
┌─────────────────────────────────┐
│     AuthProvider (Instance 1)   │
│  ┌───────────────────────────┐  │
│  │  Store A                  │  │  ← Isolated to this tree
│  │  user: "Alice"            │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│     AuthProvider (Instance 2)   │
│  ┌───────────────────────────┐  │
│  │  Store B                  │  │  ← Completely separate
│  │  user: null               │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## The tasks-store: same pattern, plus initWsSync

The `tasks-store` follows the exact same pattern, with one additional change: `initWsSync`.

### Before:

```ts
// OLD — called getState() on the global store
export function initWsSync(): () => void {
  const store = useTasksStore.getState()
  return wsClient.onMessage((message) => {
    store.reconcileWs(message)
  })
}
```

### After:

```ts
// NEW — accepts the store instance as a parameter
export function initWsSync(store: TasksStore): () => void {
  const state = store.getState()
  return wsClient.onMessage((message) => {
    state.reconcileWs(message)
  })
}
```

Why? Because `getState()` only works on a global store created by `create()`. With context-scoped stores, we need to pass the specific store instance from the Context. When this is wired up (e.g., in a layout or providers component), it will look like:

```tsx
// Future usage in a layout or providers component:
const tasksStore = useTasksStore((s) => s) // or access via context directly
useEffect(() => {
  const unsync = initWsSync(tasksStore)
  return () => { unsync(); wsClient.disconnect() }
}, [])
```

---

## File changes summary

| File | What changed |
|---|---|
| `store/auth-store.ts` → `.tsx` | Renamed (needs JSX for provider). Replaced `create()` with `createStore()` + `useMemo` + Context. |
| `store/tasks-store.ts` → `.tsx` | Same pattern. Updated `initWsSync` to accept store parameter. |
| `components/providers.tsx` | Added `AuthProvider` and `TasksProvider` wrappers around children. |
| `components/user-menu.tsx` | Changed from destructuring to selector pattern: `useAuthStore(s => s.user)`. |
| `components/tasks/task-card.tsx` | Removed unused `task` prop from `ClickableCard`. |
| `components/tasks/task-shared.tsx` | Removed unused `task` prop from `ClickableCard` type. |
| `app/dashboard/tasks/[taskId]/task-detail-content.tsx` | Removed unused imports. |
| `components/tasks/task-dialog.tsx` | Removed unused `Clock` import. |
