"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, set } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronDownIcon } from "lucide-react"
import type { ITask, Priority } from "@meu-projeto/types"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { PRIORITY_CONFIG } from "@/lib/constants"
import { useTasksStore } from "@/store/tasks-store"

type TaskCreateDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    task?: ITask
}

const formSchema = z.object({
    title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres"),
    description: z.string(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    dueDate: z.date().optional(),
    dueTime: z.string().optional(),
    timeEstimate: z
        .string()
        .regex(/^\d*$/, "Apenas números são permitidos")
        .optional(),
})

type FormData = z.infer<typeof formSchema>

export function TaskCreateDialog({
    open,
    onOpenChange,
    task,
}: TaskCreateDialogProps) {
    const addTask = useTasksStore((s) => s.addTask)
    const updateTask = useTasksStore((s) => s.updateTask)
    const isUpdate = !!task

    const [calendarOpen, setCalendarOpen] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            priority: "medium",
            dueDate: undefined,
            dueTime: "08:00",
            timeEstimate: "",
        },
    })

    useEffect(() => {
        if (open && task) {
            const due = task.dueDate ? new Date(task.dueDate) : undefined
            setValue("title", task.title)
            setValue("description", task.description || "")
            setValue("priority", task.priority)
            setValue("dueDate", due)
            setValue(
                "dueTime",
                due
                    ? `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`
                    : "08:00",
            )
            setValue(
                "timeEstimate",
                task.timeEstimateMinutes
                    ? String(task.timeEstimateMinutes)
                    : "",
            )
        } else if (open) {
            reset({
                title: "",
                description: "",
                priority: "medium",
                dueDate: undefined,
                dueTime: "08:00",
                timeEstimate: "",
            })
        }
    }, [open, task, setValue, reset])

    async function onSubmit(data: FormData) {
        let dueDate: Date | null = data.dueDate ?? null
        if (dueDate && data.dueTime) {
            const [hours, minutes] = data.dueTime.split(":").map(Number)
            dueDate = set(dueDate, { hours, minutes })
        }

        const payload = {
            title: data.title.trim(),
            description: data.description.trim() || null,
            priority: data.priority,
            status: "todo" as const,
            dueDate,
            timeEstimateMinutes: data.timeEstimate
                ? parseInt(data.timeEstimate, 10)
                : null,
            assigneeId: null,
            milestoneId: null,
            parentId: null,
            orgId: null,
        }

        if (isUpdate && task) {
            await updateTask(task.id, payload)
        } else {
            await addTask(payload)
        }

        reset()
        onOpenChange(false)
    }

    const priority = useWatch({ control, name: "priority" })
    const dueDate = useWatch({ control, name: "dueDate" })

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) reset()
                onOpenChange(val)
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isUpdate ? "Editar tarefa" : "Nova tarefa"}
                    </DialogTitle>
                    <DialogDescription>
                        {isUpdate
                            ? "Atualize os detalhes da tarefa."
                            : "Preencha os detalhes para criar uma nova tarefa."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={
                        handleSubmit(onSubmit) as (e: React.FormEvent) => void
                    }
                    className="flex flex-col gap-4"
                >

                    {/* Title */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Titulo</Label>
                        <Input
                            id="title"
                            {...register("title")}
                            placeholder="Ex: Revisar documentacao"
                        />
                        {errors.title && (
                            <p className="text-sm text-destructive">
                                {errors.title.message}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description">Descricao</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Detalhes opcionais..."
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Priority and Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Prioridade</Label>
                            <Select
                                value={priority}
                                onValueChange={(v) =>
                                    setValue("priority", v as Priority)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(
                                        Object.keys(
                                            PRIORITY_CONFIG,
                                        ) as Priority[]
                                    ).map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {PRIORITY_CONFIG[p].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.priority && (
                                <p className="text-sm text-destructive">
                                    {errors.priority.message}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Prazo</Label>
                            <div className="flex gap-2 min-w-0">
                                <Popover
                                    open={calendarOpen}
                                    onOpenChange={setCalendarOpen}
                                >
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                variant="outline"
                                                className="flex-1 justify-between font-normal min-w-0"
                                            >
                                                <span className="truncate">
                                                    {dueDate
                                                        ? format(
                                                              dueDate,
                                                              "dd 'de' MMM 'de' yyyy",
                                                              { locale: ptBR },
                                                          )
                                                        : "Selecionar data"}
                                                </span>
                                                <ChevronDownIcon
                                                    className="size-4 shrink-0"
                                                    data-icon="inline-end"
                                                />
                                            </Button>
                                        }
                                    />
                                    <PopoverContent
                                        className="w-auto overflow-hidden p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            captionLayout="dropdown"
                                            defaultMonth={dueDate}
                                            onSelect={(date) => {
                                                setValue("dueDate", date)
                                                setCalendarOpen(false)
                                            }}
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    type="time"
                                    {...register("dueTime")}
                                    className="w-24 shrink-0 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time estimate */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="timeEstimate">
                            Tempo estimado (minutos)
                        </Label>
                        <Input
                            id="timeEstimate"
                            type="number"
                            min={0}
                            {...register("timeEstimate")}
                            placeholder="Ex: 60"
                        />
                        {errors.timeEstimate && (
                            <p className="text-sm text-destructive">
                                {errors.timeEstimate.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? isUpdate
                                    ? "Salvando..."
                                    : "Criando..."
                                : isUpdate
                                  ? "Salvar alteracoes"
                                  : "Criar tarefa"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
