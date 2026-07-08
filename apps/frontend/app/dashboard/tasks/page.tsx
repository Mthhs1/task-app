import { PageHeader } from "@/components/page-header"
import { TasksContent } from "./tasks-content"

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tarefas" />
      <TasksContent />
    </>
  )
}
