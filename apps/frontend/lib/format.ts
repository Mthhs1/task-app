// ============================================================================
// Date & Duration Formatting Utilities
//
// All formatters use the pt-BR locale (Portuguese). These functions are
// presentation-only — they don't mutate data, just convert numbers and
// dates into human-readable strings for the UI.
// ============================================================================

// ----------------------------------------------------------------------------
// formatDuration — Converts a minute count into a compact human string
// ----------------------------------------------------------------------------
// Input: minutes (number or null)
// Output: examples — 0 → "0m", 90 → "1h 30m", 1500 → "1d 1h", -60 → "-1h"
//
// Used by: time-entry displays, time estimate badges, time stats.
export function formatDuration(minutes: number | null): string {
  // Null or zero means no time logged/estimated — show "0m" as a default.
  if (minutes == null || minutes === 0) return "0m";

  // Work with absolute value for breaking down units; we handle the
  // sign separately at the end so negative durations display correctly.
  const abs = Math.abs(minutes);

  // Break into days, hours, remaining minutes:
  //   1440 minutes = 1 day (24*60)
  //   Use modulo to carry the remainder into smaller units
  const days = Math.floor(abs / (60 * 24));        // e.g., 1500 → 1 (day)
  const hours = Math.floor((abs % (60 * 24)) / 60); // remainder → hours
  const mins = abs % 60;                             // remainder → minutes

  // Build the output string with only non-zero units:
  //   1500 min → "1d 1h" (not "1d 1h 0m")
  //   90 min   → "1h 30m" (not "0d 1h 30m")
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  const result = parts.join(" ");

  // Re-apply the sign: negative minutes means overtime or over-budget.
  return minutes < 0 ? `-${result}` : result;
}

// ----------------------------------------------------------------------------
// formatDate — Formats a Date or ISO string into a pt-BR date string
// ----------------------------------------------------------------------------
// Input: Date object, ISO string, or null
// Output: "02 de jul. de 2026" (or empty string for null)
//
// Used by: task due dates, milestone deadlines, comment timestamps.
export function formatDate(date: Date | string | null): string {
  // Null/undefined → empty string (caller can render placeholder)
  if (!date) return "";

  // Normalize: if we got an ISO string, convert to a Date object.
  // This handles both Date instances (from JS) and string (from API JSON).
  const d = typeof date === "string" ? new Date(date) : date;

  // Use the browser's Intl with pt-BR locale for localized output:
  //   day: "2-digit"   → "02"
  //   month: "short"   → "jul."
  //   year: "numeric"  → "2026"
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ----------------------------------------------------------------------------
// formatRelativeTime — Produces "há 2 dias", "daqui a 3 horas", etc.
// ----------------------------------------------------------------------------
// Input: Date object, ISO string, or null
// Output: relative time string using Intl.RelativeTimeFormat (pt-BR, auto numeric)
//
// Each time unit (seconds, minutes, hours, days) is computed independently
// from the raw millisecond difference — NOT cascaded from smaller units.
// This prevents boundary errors where rounding compounds:
//   WRONG (cascaded): 59 min → diffSec=3540 → diffMin=round(3540/60)=59 → diffHour=round(59/60)=1 ← misleading!
//   RIGHT (independent): 59 min → diffHour=round(3540000/3600000)=1 ← only if truly ≥1 hour in raw ms
//
// The threshold check goes largest unit first (days → hours → minutes → seconds)
// so the most significant unit wins.
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Raw difference in milliseconds — the single source of truth.
  // Positive = date is in the future ("daqui a…"), negative = past ("há…").
  const diffMs = d.getTime() - now.getTime();

  // Intl.RelativeTimeFormat with numeric: "auto" produces "agora" for zero,
  // "há 2 dias" for negative, "daqui a 3 horas" for positive — all in pt-BR.
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  // Each unit computed directly from diffMs — no cascading.
  // Round is used because partial units are rounded to the nearest whole.
  const diffSec = Math.round(diffMs / 1000);                    // ms → seconds
  const diffMin = Math.round(diffMs / (1000 * 60));            // ms → minutes
  const diffHour = Math.round(diffMs / (1000 * 60 * 60));      // ms → hours
  const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));  // ms → days

  // Return the most significant unit that is ≥1 in absolute value.
  // Order matters: check days first, then hours, then minutes, then seconds.
  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, "day");
  if (Math.abs(diffHour) >= 1) return rtf.format(diffHour, "hour");
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, "minute");
  return rtf.format(diffSec, "second");
}

// ----------------------------------------------------------------------------
// formatTimeRemaining — Shows remaining time budget for a task
// ----------------------------------------------------------------------------
// Input: estimateMinutes (the time budget the user set), loggedMinutes (total
//        time logged so far across all time entries)
// Output: "1h 30m restantes" (still has budget), "Tempo esgotado" (over budget),
//         "" (no estimate set)
//
// Used by: task-card time badge, time-remaining component.
export function formatTimeRemaining(
  estimateMinutes: number | null,
  loggedMinutes: number,
): string {
  // No estimate set → nothing to show (the card can omit the badge entirely).
  if (estimateMinutes == null) return "";

  // Calculate how much budget is left. Negative = over budget.
  const remaining = estimateMinutes - loggedMinutes;

  // Zero or negative remaining → the task has consumed its entire budget.
  if (remaining <= 0) return "Tempo esgotado";

  // Still has budget — format the remaining minutes and append "restantes".
  // formatDuration handles the day/hour/minute breakdown.
  return `${formatDuration(remaining)} restantes`;
}