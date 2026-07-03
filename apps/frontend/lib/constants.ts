import type { Priority, TaskStatus, RecurrenceFrequency } from "@meu-projeto/types";

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Baixa", color: "text-green-600", bg: "bg-green-100" },
  medium: { label: "Média", color: "text-blue-600", bg: "bg-blue-100" },
  high: { label: "Alta", color: "text-orange-600", bg: "bg-orange-100" },
  urgent: { label: "Urgente", color: "text-red-600", bg: "bg-red-100" },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string }
> = {
  todo: { label: "A fazer", color: "text-gray-600", bg: "bg-gray-100" },
  in_progress: { label: "Em progresso", color: "text-yellow-600", bg: "bg-yellow-100" },
  done: { label: "Concluída", color: "text-green-600", bg: "bg-green-100" },
  archived: { label: "Arquivada", color: "text-slate-500", bg: "bg-slate-100" },
};

export const FREQUENCY_CONFIG: Record<RecurrenceFrequency, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
