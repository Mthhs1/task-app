"use client"

import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/store/auth-store"
import { TasksProvider } from "@/store/tasks-store"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TasksProvider>
        {children}
        <Toaster />
      </TasksProvider>
    </AuthProvider>
  )
}
