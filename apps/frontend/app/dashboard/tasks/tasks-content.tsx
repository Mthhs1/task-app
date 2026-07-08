"use client"

import { useState } from "react"
import { List, Grid } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskList } from "@/components/tasks/task-list"
import { TaskDialog } from "@/components/tasks/task-dialog"
import { PRIORITY_ORDER } from "@/lib/constants"
import type { ITask } from "@meu-projeto/types"

const MOCK_TASKS: ITask[] = [
  {
    id: "1",
    title: "Criar wireframes do dashboard",
    description: "Desenhar os wireframes iniciais para o layout do dashboard principal",
    status: "in_progress",
    priority: "high",
    dueDate: new Date("2026-07-10"),
    timeEstimateMinutes: 120,
    assigneeId: null,
    milestoneId: null,
    parentId: null,
    orgId: null,
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-03"),
  },
  {
    id: "2",
    title: "Configurar autenticação OAuth",
    description: "Integrar Google OAuth com better-auth",
    status: "todo",
    priority: "urgent",
    dueDate: new Date("2026-07-08"),
    timeEstimateMinutes: 180,
    assigneeId: null,
    milestoneId: null,
    parentId: null,
    orgId: null,
    createdAt: new Date("2026-07-02"),
    updatedAt: new Date("2026-07-02"),
  },
  {
    id: "3",
    title: "Escrever testes do backend",
    description: "Testes unitários para task service e controllers",
    status: "todo",
    priority: "medium",
    dueDate: new Date("2026-07-15"),
    timeEstimateMinutes: 240,
    assigneeId: null,
    milestoneId: null,
    parentId: null,
    orgId: null,
    createdAt: new Date("2026-07-03"),
    updatedAt: new Date("2026-07-03"),
  },
  {
    id: "4",
    title: "Documentar API endpoints",
    description: null,
    status: "done",
    priority: "low",
    dueDate: new Date("2026-07-05"),
    timeEstimateMinutes: 60,
    assigneeId: null,
    milestoneId: null,
    parentId: null,
    orgId: null,
    createdAt: new Date("2026-06-28"),
    updatedAt: new Date("2026-07-04"),
  },
  {
    id: "5",
    title: "Implementar WebSocket realtime",
    description: "Configurar ws para atualizações em tempo real das tasks",
    status: "todo",
    priority: "high",
    dueDate: new Date("2026-07-12"),
    timeEstimateMinutes: 300,
    assigneeId: null,
    milestoneId: null,
    parentId: null,
    orgId: null,
    createdAt: new Date("2026-07-04"),
    updatedAt: new Date("2026-07-04"),
  },
]

export function TasksContent() {
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

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 rounded-lg border p-1">
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

      <TaskList
        tasks={sortedTasks}
        viewMode={viewMode}
        onTaskClick={handleTaskClick}
      />

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
