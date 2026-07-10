"use client"

import { createContext, useContext, useMemo } from "react"
import { createStore, useStore } from "zustand"

interface User {
  id: string
  name: string
  email: string
  image?: string | null
}

interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
}

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  setSession: (user: User | null, session: Session | null) => void
  clearSession: () => void
  fetchSession: () => Promise<void>
}

function createAuthStore() {
  return createStore<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    setSession: (user, session) => set({ user, session, loading: false }),
    clearSession: () =>
      set({ user: null, session: null, loading: false }),
    fetchSession: async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) {
          set({ user: null, session: null, loading: false })
          return
        }
        const data = await res.json()
        if (data?.user && data?.session) {
          set({ user: data.user as User, session: data.session as Session, loading: false })
        } else {
          set({ user: null, session: null, loading: false })
        }
      } catch {
        set({ user: null, session: null, loading: false })
      }
    },
  }))
}

type AuthStore = ReturnType<typeof createAuthStore>

const AuthStoreContext = createContext<AuthStore | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => createAuthStore(), [])

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  )
}

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext)
  if (!store) {
    throw new Error("useAuthStore must be used within AuthProvider")
  }
  return useStore(store, selector)
}
