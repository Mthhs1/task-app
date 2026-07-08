import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants"
import type { ITask, Priority } from "@meu-projeto/types"

export function PriorityBadge({ priority }: { priority: Priority }) {
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

export function TimeEstimateDisplay({ minutes }: { minutes: number | null }) {
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

type ClickableCardProps = {
  task: ITask
  onClick?: () => void
  children: React.ReactNode
}

export function ClickableCard({ task, onClick, children }: ClickableCardProps) {
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
      {children}
    </Card>
  )
}

export function getPriorityDotClass(task: ITask) {
  const priorityOrder = PRIORITY_ORDER[task.priority]
  return cn(
    "size-2 shrink-0 rounded-full",
    priorityOrder === 0 && "bg-red-500",
    priorityOrder === 1 && "bg-orange-500",
    priorityOrder === 2 && "bg-blue-500",
    priorityOrder === 3 && "bg-green-500",
  )
}
