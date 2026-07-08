"use client"

import { useState } from "react"
import { PRIORITY_ORDER } from "@/lib/constants"
import { MOCK_TASKS } from "@/lib/mock-tasks"
import type { ITask } from "@meu-projeto/types"

export function useTaskBoard() {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredTasks =
    activeTab === "all"
      ? MOCK_TASKS
      : MOCK_TASKS.filter((task) => task.priority === activeTab)

  const sortedTasks = [...filteredTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )

  function handleTaskClick(task: ITask) {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    selectedTask,
    dialogOpen,
    setDialogOpen,
    sortedTasks,
    handleTaskClick,
  }
}
