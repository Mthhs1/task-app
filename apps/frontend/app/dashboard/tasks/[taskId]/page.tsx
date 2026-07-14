import { cookies } from "next/headers"
import { PageHeader } from "@/components/page-header"
import { TaskDetailContent } from "./task-detail-content"
import { taskApi } from "@/lib/api"
import type { ITask } from "@meu-projeto/types"
import Link from "next/dist/client/link"

async function getTask(taskId: string): Promise<ITask | null> {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join("; ")

  const result = await taskApi.getPersonal(taskId, {
    headers: { cookie: cookieHeader }
  })
  if (result.error) {
    console.error("Failed to fetch task:", result.error)
    return null
  }
  return result.data
}

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  console.log(taskId);
  
  const task = await getTask(taskId)

  if (!task) {
    return (
      <>
        <PageHeader title="Detalhes da Tarefa" />
        <div className="flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-lg font-medium">Tarefa não encontrada</p>
          <Link href="/dashboard/tasks" className="text-sm text-muted-foreground underline">
            Voltar para a lista de tarefas
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Detalhes da Tarefa" />
      <TaskDetailContent task={task} />
    </>
  )
}
