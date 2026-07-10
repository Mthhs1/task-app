"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PRIORITY_CONFIG } from "@/lib/constants"
import { useTasksStore } from "@/store/tasks-store"
import type { Priority } from "@meu-projeto/types"

type TaskCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskCreateDialog({ open, onOpenChange }: TaskCreateDialogProps) {
  const addTask = useTasksStore((s) => s.addTask)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [timeEstimate, setTimeEstimate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setTitle("")
    setDescription("")
    setPriority("medium")
    setDueDate("")
    setTimeEstimate("")
    setSubmitting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)

    await addTask({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: "todo",
      dueDate: dueDate ? new Date(dueDate) : null,
      timeEstimateMinutes: timeEstimate ? parseInt(timeEstimate, 10) : null,
      assigneeId: null,
      milestoneId: null,
      parentId: null,
      orgId: null,
    })

    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para criar uma nova tarefa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar documentação"
              required
              minLength={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes opcionais..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">Prazo</Label>
              <div className="relative">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="timeEstimate">Tempo estimado (minutos)</Label>
            <div className="relative">
              <Input
                id="timeEstimate"
                type="number"
                min={0}
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(e.target.value)}
                placeholder="Ex: 60"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Criando..." : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
