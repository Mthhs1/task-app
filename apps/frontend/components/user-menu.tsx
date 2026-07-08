"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"

export function UserMenu() {
  const router = useRouter()
  const { user, clearSession } = useAuthStore()

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
      if (!response.ok) return
      clearSession()
      router.push("/login")
      router.refresh()
    } catch {
      // logout failed, stay on page
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
        {user?.name?.charAt(0) || "U"}
      </div>
      <span className="text-sm font-medium">{user?.name || "User"}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        title="Logout"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}
