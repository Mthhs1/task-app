"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth-store"

export function UserMenu() {
  const router = useRouter()
  const { user, clearSession } = useAuthStore()

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    })
    clearSession()
    router.push("/login")
    router.refresh()
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
