"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/dashboard-sidebar"

const fakeLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/calendar", label: "Calendar" },
    { href: "/dashboard/settings", label: "Settings" },
]

export function DashboardHeader() {
    const [open, setOpen] = useState(false)

    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                        />
                    }
                >
                    <Menu className="size-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                    <Sidebar />
                </SheetContent>
            </Sheet>

      <h2 className="text-lg font-semibold">Dashboard</h2>

      <nav className="ml-auto flex items-center gap-6">
        {fakeLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
        </header>
    )
}
