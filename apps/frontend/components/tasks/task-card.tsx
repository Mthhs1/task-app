"use client"

import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants"
import type { ITask, Priority } from "@meu-projeto/types"

type TaskCardProps = {
    task: ITask
    viewMode?: "list" | "grid"
    onClick?: () => void
}

function PriorityBadge({ priority }: { priority: Priority }) {
    const config = PRIORITY_CONFIG[priority]
    return (
        <Badge
            variant="secondary"
            className={cn("border-transparent text-xs", config.color)}
        >
            {config.label}
        </Badge>
    )
}

function TimeEstimateDisplay({ minutes }: { minutes: number | null }) {
    if (!minutes) return null

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

    return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {label}
        </span>
    )
}

export function TaskCard({ task, viewMode = "list", onClick }: TaskCardProps) {
    const priorityOrder = PRIORITY_ORDER[task.priority]

    if (viewMode === "grid") {
        return (
            <Card
                className="group cursor-pointer hover:ring-1 hover:ring-ring/50"
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onClick?.()
                    }
                }}
            >
                <CardContent className="p-4 text-left">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 flex-1 text-left text-sm font-medium leading-tight">
                            {task.title}
                        </h3>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                            {task.title.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={task.priority} />
                        <TimeEstimateDisplay
                            minutes={task.timeEstimateMinutes}
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card
            className="group cursor-pointer hover:ring-1 hover:ring-ring/50"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onClick?.()
                }
            }}
        >
            <CardContent className="flex items-center gap-4 p-4">
                <div
                    className={cn(
                        "size-2 shrink-0 rounded-full",
                        priorityOrder === 0 && "bg-red-500",
                        priorityOrder === 1 && "bg-orange-500",
                        priorityOrder === 2 && "bg-blue-500",
                        priorityOrder === 3 && "bg-green-500",
                    )}
                />

                <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
                    {task.title}
                </h3>

                <div className="flex shrink-0 items-center gap-4">
                    <PriorityBadge priority={task.priority} />
                    <TimeEstimateDisplay
                        minutes={task.timeEstimateMinutes}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
