"use client"

import { useState, useEffect } from "react"
import { PRIORITY_ORDER } from "@/lib/constants"
import { useTasksStore } from "@/store/tasks-store"
import type { ITask } from "@meu-projeto/types"

export function useTaskBoard() {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const tasks = useTasksStore((s) => s.tasks)
  const loading = useTasksStore((s) => s.loading)
  const error = useTasksStore((s) => s.error)
  const fetchTasks = useTasksStore((s) => s.fetchTasks)

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks =
    activeTab === "all"
      ? tasks
      : tasks.filter((task) => task.priority === activeTab)

  const sortedTasks = [...filteredTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )

  function handleTaskClick(task: ITask) {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
  }

  return {
    activeTab,
    setActiveTab: handleTabChange,
    viewMode,
    setViewMode,
    selectedTask,
    dialogOpen,
    setDialogOpen,
    sortedTasks,
    handleTaskClick,
    createDialogOpen,
    setCreateDialogOpen,
    loading,
    error,
  }
}
