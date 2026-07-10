"use client"

import { List, Grid, Plus } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/tasks/task-list"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog"
import { useTaskBoard } from "@/hooks/use-task-board"

export function TasksContent() {
  const {
    activeTab,
    setActiveTab,
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
  } = useTaskBoard()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="shrink-0 text-muted-foreground">Gerencie suas tarefas pessoais e da equipe</p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="urgent">Urgente</TabsTrigger>
            <TabsTrigger value="high">Alta</TabsTrigger>
            <TabsTrigger value="medium">Média</TabsTrigger>
            <TabsTrigger value="low">Baixa</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-md"
            onClick={() => setCreateDialogOpen(true)}
            aria-label="Nova tarefa"
          >
            <Plus className="size-4" />
          </Button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "list"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Lista"
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Grade"
          >
            <Grid className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Carregando tarefas...
        </p>
      ) : (
        <TaskList
          tasks={sortedTasks}
          viewMode={viewMode}
          onTaskClick={handleTaskClick}
        />
      )}

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
