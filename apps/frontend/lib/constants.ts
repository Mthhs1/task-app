// ============================================================================
// UI Configuration Constants
//
// Centralizes display metadata (labels, Tailwind color classes) for all
// enum-like types so components don't hardcode strings. When rendering a
// task card, a component looks up the config by the enum value:
//
//   const config = PRIORITY_CONFIG[task.priority];
//   <span className={`${config.color} ${config.bg}`}>{config.label}</span>
//
// This keeps all translations and visual choices in one file.
// ============================================================================

import type { Priority, TaskStatus, RecurrenceFrequency } from "@meu-projeto/types";

// ----------------------------------------------------------------------------
// PRIORITY_CONFIG — Display config for each task priority level
// ----------------------------------------------------------------------------
// Maps to Tailwind classes:
//   color: text color for the badge/label (e.g., "text-red-600")
//   bg:    background color for the badge (e.g., "bg-red-100")
//   label: human-readable text shown to the user (pt-BR)
//
// Used by: task-card priority badge, task-dialog priority selector, filters.
export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Baixa", color: "text-green-600", bg: "bg-green-100" },
  medium: { label: "Média", color: "text-blue-600", bg: "bg-blue-100" },
  high: { label: "Alta", color: "text-orange-600", bg: "bg-orange-100" },
  urgent: { label: "Urgente", color: "text-red-600", bg: "bg-red-100" },
};

// ----------------------------------------------------------------------------
// STATUS_CONFIG — Display config for each task status (Kanban columns)
// ----------------------------------------------------------------------------
// Maps to Tailwind classes:
//   color: text color (e.g., "text-yellow-600")
//   bg:    background color (e.g., "bg-yellow-100")
//   label: the column header in Kanban view, the status badge, etc.
//
// Used by: Kanban column headers, task-card status badge, filters.
export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string }
> = {
  todo: { label: "A fazer", color: "text-gray-600", bg: "bg-gray-100" },
  in_progress: { label: "Em progresso", color: "text-yellow-600", bg: "bg-yellow-100" },
  done: { label: "Concluída", color: "text-green-600", bg: "bg-green-100" },
  archived: { label: "Arquivada", color: "text-slate-500", bg: "bg-slate-100" },
};

// ----------------------------------------------------------------------------
// FREQUENCY_CONFIG — pt-BR labels for recurrence frequencies
// ----------------------------------------------------------------------------
// Simpler than PRIORITY/STATUS because recurrence just needs a display label,
// no colors (it's shown in a dialog, not as a colored badge).
//
// Used by: recurrence-dialog frequency selector.
export const FREQUENCY_CONFIG: Record<RecurrenceFrequency, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

// ----------------------------------------------------------------------------
// PRIORITY_ORDER — Numeric sort weight for each priority (for sorting tasks)
// ----------------------------------------------------------------------------
// Lower number = higher priority. Used when sorting the task list so that
// urgent tasks appear at the top:
//
//   tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
//
// urgent=0 sorts first, low=3 sorts last.
export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};