"use client"

import Link from "next/link"
import { Calendar, Clock, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { STATUS_CONFIG } from "@/lib/constants"
import { PriorityBadge, TimeEstimateDisplay } from "@/components/tasks/task-shared"
import type { ITask, TaskStatus } from "@meu-projeto/types"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

type TaskDialogProps = {
  task: ITask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent text-xs", config.color)}
    >
      {config.label}
    </Badge>
  )
}

function DueDateDisplay({ dueDate, isDone }: { dueDate: Date | null; isDone: boolean }) {
  if (!dueDate) return null

  const now = new Date()
  const isOverdue = !isDone && dueDate < now

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm",
        isOverdue ? "text-red-600" : "text-muted-foreground"
      )}
    >
      <Calendar className="size-4" />
      {formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}
    </span>
  )
}

export function TaskDialog({ task, open, onOpenChange }: TaskDialogProps) {
  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{task.title}</DialogTitle>
          {task.description && (
            <DialogDescription className="mt-1 text-sm leading-relaxed">
              {task.description}
            </DialogDescription>
          )}
          <div className="mt-2 flex items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <DueDateDisplay dueDate={task.dueDate} isDone={task.status === "done"} />
          <TimeEstimateDisplay minutes={task.timeEstimateMinutes} />
        </div>

        <DialogFooter>
          <Link
            href={`/dashboard/tasks/${task.id}`}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-8 gap-1.5 px-2.5 w-full sm:w-auto"
          >
            <ExternalLink className="size-4" />
            Ver detalhes completos
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
