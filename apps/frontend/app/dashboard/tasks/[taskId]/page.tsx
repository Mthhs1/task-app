import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { TaskDetailContent } from "./task-detail-content"
import { taskApi } from "@/lib/api"
import type { ITask } from "@meu-projeto/types"
import Link from "next/link"

async function getTask(taskId: string): Promise<ITask | null> {
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

    const result = await taskApi.getPersonal(taskId, {
        headers: { cookie: cookieHeader },
    })
    if (result.error) {
        console.error("Failed to fetch task:", result.error)
        if (result.error.status === 404) return null
        if (result.error.status === 401) {
            throw new Error("Unauthorized")
        }
        if (result.error.status === 0) {
            throw new Error("Request timed out")
        }
        throw new Error(`Server error: ${result.error.status}`)
    }
    return result.data
}

export default async function TaskDetailPage({
    params,
}: {
    params: Promise<{ taskId: string }>
}) {
    const { taskId } = await params

    let task: ITask | null
    try {
        task = await getTask(taskId)
    } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
            notFound()
        }
        throw err
    }

    if (!task) {
        return (
            <>
                <PageHeader title="Detalhes da Tarefa" />
                <div className="flex flex-col items-center justify-center gap-4 p-6">
                    <p className="text-lg font-medium">Tarefa não encontrada</p>
                    <Link
                        href="/dashboard/tasks"
                        className="text-sm text-muted-foreground underline"
                    >
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
