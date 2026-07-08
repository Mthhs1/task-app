"use client"

import Link from "next/link"
import { Calendar, Clock, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/constants"
import type { ITask, Priority, TaskStatus } from "@meu-projeto/types"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

type TaskDialogProps = {
  task: ITask | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

function DueDateDisplay({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) return null

  const now = new Date()
  const isOverdue = dueDate < now

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

function TimeEstimateDisplay({ minutes }: { minutes: number | null }) {
  if (!minutes) return null

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="size-4" />
      {label}
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
          <DueDateDisplay dueDate={task.dueDate} />
          <TimeEstimateDisplay minutes={task.timeEstimateMinutes} />
        </div>

        <DialogFooter>
          <Link href={`/dashboard/tasks/${task.id}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="size-4" />
              Ver detalhes completos
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
