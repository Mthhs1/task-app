"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotificationBadge() {
  const unreadCount = 0

  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
          {unreadCount}
        </span>
      )}
    </Button>
  )
}
