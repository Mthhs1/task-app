"use client"

import Link from "next/link"
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
import { cn } from "@/lib/utils"
import { STATUS_CONFIG } from "@/lib/constants"
import { PriorityBadge } from "@/components/tasks/task-shared"
import type { ITask, TaskStatus } from "@meu-projeto/types"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

const MOCK_TASK: ITask = {
  id: "1",
  title: "Criar wireframes do dashboard",
  description: "Desenhar os wireframes iniciais para o layout do dashboard principal, incluindo sidebar, header e área de conteúdo. Considerar responsividade para mobile.",
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
}

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

export function TaskDetailContent() {
  const task = MOCK_TASK

  const timeLogged = 45
  const timeRemaining = task.timeEstimateMinutes
    ? task.timeEstimateMinutes - timeLogged
    : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/dashboard/tasks" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5">
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            {task.description && (
              <p className="mt-2 text-muted-foreground">{task.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="h-9 w-9 shrink-0 hover:bg-muted">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem>  
                <Pencil className="mr-2 size-4" />
                Editar tarefa
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 size-4" />
                Excluir tarefa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
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
            {task.dueDate ? (
              <p className="text-sm">
                {format(task.dueDate, "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({formatDistanceToNow(task.dueDate, { locale: ptBR, addSuffix: true })})
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
            {task.timeEstimateMinutes ? (
              <div className="space-y-1">
                <p className="text-sm">
                  {Math.floor(task.timeEstimateMinutes / 60)}h{" "}
                  {task.timeEstimateMinutes % 60}m
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
                {task.title.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">Usuário</p>
                <p className="text-xs text-muted-foreground">
                  Criado em{" "}
                  {format(task.createdAt, "dd 'de' MMM", { locale: ptBR })}
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
                  {format(task.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizado em</p>
                <p className="text-sm">
                  {format(task.updatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="text-sm font-mono">{task.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
