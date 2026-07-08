import { PageHeader } from "@/components/page-header"
import { TaskDetailContent } from "./task-detail-content"

export default function TaskDetailPage() {
  return (
    <>
      <PageHeader title="Detalhes da Tarefa" />
      <TaskDetailContent />
    </>
  )
}
