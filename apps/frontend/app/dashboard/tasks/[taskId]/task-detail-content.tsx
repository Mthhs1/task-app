"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Clock, User, MessageSquare, ListTodo, Timer, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { STATUS_CONFIG } from "@/lib/constants"
import { PriorityBadge } from "@/components/tasks/task-shared"
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog"
import { useTasksStore } from "@/store/tasks-store"
import type { ITask, TaskStatus } from "@meu-projeto/types"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-xs", config.color)}
    >
      {config.label}
    </Badge>
  )
}

export function TaskDetailContent({ task }: { task: ITask }) {
  const router = useRouter()
  const removeTask = useTasksStore((s) => s.removeTask)
  const getTask = useTasksStore((s) => s.tasks.find((t) => t.id === task.id))
  const [displayTask, setDisplayTask] = useState(task)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const resolvedTask = getTask ?? displayTask

  const timeLogged = 45
  const timeRemaining = resolvedTask.timeEstimateMinutes
    ? resolvedTask.timeEstimateMinutes - timeLogged
    : null

  async function handleDelete() {
    setDeleting(true)
    await removeTask(resolvedTask.id)
    setDeleting(false)
    setDeleteDialogOpen(false)
    router.push("/dashboard/tasks")
  }

  function onEditTask() {
    setEditDialogOpen(true)
  }

  function onEditComplete() {
    setEditDialogOpen(false)
    const updated = getTask
    if (updated) setDisplayTask(updated)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard/tasks" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5">
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{resolvedTask.title}</h1>
            {resolvedTask.description && (
              <p className="mt-2 text-muted-foreground">{resolvedTask.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 shrink-0 hover:bg-muted">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => onEditTask()}>
                <Pencil className="mr-2 size-4" />
                Editar tarefa
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                Excluir tarefa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. A tarefa será permanentemente removida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <PriorityBadge priority={resolvedTask.priority} />
          <StatusBadge status={resolvedTask.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4" />
              Prazo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedTask.dueDate ? (
              <p className="text-sm">
                {format(resolvedTask.dueDate, "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({formatDistanceToNow(resolvedTask.dueDate, { locale: ptBR, addSuffix: true })})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem prazo definido</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" />
              Tempo estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedTask.timeEstimateMinutes ? (
              <div className="space-y-1">
                <p className="text-sm">
                  {Math.floor(resolvedTask.timeEstimateMinutes / 60)}h{" "}
                  {resolvedTask.timeEstimateMinutes % 60}m
                </p>
                {timeRemaining !== null && timeRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(timeRemaining / 60)}h {timeRemaining % 60}m restantes
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem estimativa</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4" />
              Autor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                {resolvedTask.title.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">Usuário</p>
                <p className="text-xs text-muted-foreground">
                  Criado em{" "}
                  {format(resolvedTask.createdAt, "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" />
                Comentários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum comentário ainda.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="size-4" />
                Subtarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhuma subtarefa adicionada.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="size-4" />
                Registros de tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum registro de tempo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm">
                  {format(resolvedTask.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizado em</p>
                <p className="text-sm">
                  {format(resolvedTask.updatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="text-sm font-mono">{resolvedTask.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskCreateDialog
        key={refreshKey}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={resolvedTask}
        onEditComplete={onEditComplete}
      />
    </div>
  )
}
