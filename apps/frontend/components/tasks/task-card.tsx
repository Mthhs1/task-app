"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ClickableCard, getPriorityDotClass, PriorityBadge, TimeEstimateDisplay } from "@/components/tasks/task-shared"
import type { ITask } from "@meu-projeto/types"

type TaskCardProps = {
    task: ITask
    viewMode?: "list" | "grid"
    onClick?: () => void
}

export function TaskCard({ task, viewMode = "list", onClick }: TaskCardProps) {
    if (viewMode === "grid") {
        return (
            <ClickableCard task={task} onClick={onClick}>
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
            </ClickableCard>
        )
    }

    return (
        <ClickableCard task={task} onClick={onClick}>
            <CardContent className="flex items-center gap-4 p-4">
                <div className={getPriorityDotClass(task)} />

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
        </ClickableCard>
    )
}
