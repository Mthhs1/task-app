import { cookies } from "next/headers"
import { PageHeader } from "@/components/page-header"
import { TasksContent } from "./tasks-content"
import { taskApi } from "@/lib/api"
import type { ITask } from "@meu-projeto/types"

async function getTasks(): Promise<ITask[]> {
  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === "production"
  const sessionCookie = cookieStore.get(
    isProd
      ? "__Secure-better-auth.session_token"
      : "better-auth.session_token",
  )
  const cookieHeader = sessionCookie
    ? `${sessionCookie.name}=${sessionCookie.value}`
    : ""

  const result = await taskApi.listPersonal(undefined, {
    headers: { cookie: cookieHeader },
  })

  if (result.error) {
    console.error("Failed to fetch tasks:", result.error)
    return []
  }

  return result.data.tasks ?? []
}

export default async function TasksPage() {
  const tasks = await getTasks()

  return (
    <>
      <PageHeader title="Tarefas" />
      <TasksContent initialTasks={tasks} />
    </>
  )
}
