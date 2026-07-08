"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    CheckSquare,
    Calendar,
    Settings,
    CircleHelp,
} from "lucide-react"

const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/groups", label: "Groups", icon: Users },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
            <div className="flex h-16 items-center border-b border-border px-6">
                <Link href="/" className="text-lg font-bold tracking-tight">
                    TaskApp
                </Link>
            </div>
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                            )}
                        >
                            <Icon className="size-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="border-t border-border p-4">
                <Link
                    href="/help"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
                >
                    <CircleHelp className="size-4" />
                    Help Center
                </Link>
            </div>
        </aside>
    )
}
