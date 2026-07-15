"use client"

import { TaskCard } from "./task-card"
import type { ITask } from "@meu-projeto/types"

type TaskListProps = {
  tasks: ITask[]
  viewMode: "list" | "grid"
  onTaskClick?: (task: ITask) => void
}

export function TaskList({ tasks, viewMode, onTaskClick }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
      </div>
    )
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            viewMode="grid"
            onClick={() => onTaskClick?.(task)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          viewMode="list"
          onClick={() => onTaskClick?.(task)}
        />
      ))}
    </div>
  )
}
