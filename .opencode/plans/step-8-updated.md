# Updated Step 8 — Frontend Task List View (Revised)

## Changes from Original PLAN.md

### Route Structure (Updated)
- `/dashboard` — overview with "Minhas tarefas" (current implementation)
- `/dashboard/tasks` — task board (list/kanban/calendar views)
- `/dashboard/tasks/[taskId]` — full task detail page (comments, subtasks, time entries, author info)

### Two-Tier Task View Approach

**1. Shadcn Dialog (Quick Preview)**
- Triggered by clicking a task card in list/grid view
- Shows: Title, Description, Status, TimeEstimate
- Lightweight, keeps context of task list visible behind
- Quick actions: edit status, mark complete

**2. Dedicated Route** (`/dashboard/tasks/[taskId]`)
- Full task details page
- Shows: Author, created/updated timestamps, priority, due date, milestone, tags
- Comments thread with @mentions
- Nested subtasks (expandable)
- Time entries list
- Full edit capabilities

### Updated Components

- `components/tasks/task-card.tsx` — priority badge, due date, assignee avatar, tags, subtask count (clickable → opens dialog)
- `components/tasks/task-list.tsx` — flat/grouped list (supports list + grid view modes)
- `components/tasks/task-dialog.tsx` — quick preview dialog (title, description, status, timeEstimate) + link to full detail page
- `components/tasks/task-board.tsx` — container with view toggle tabs (list/kanban/calendar)
- `components/tasks/task-filters.tsx` — filter by status, priority, assignee, tags

### Updated Pages

- `app/dashboard/page.tsx` — dashboard overview with single-row toolbar: description + priority tabs + list/grid toggle
- `app/dashboard/tasks/page.tsx` — task board with single-row toolbar: description + priority tabs + list/kanban tabs + list/grid toggle
- `app/dashboard/tasks/[taskId]/page.tsx` — full task detail page

### Additional Shadcn Components Needed
- `dialog` — quick task preview
- `alert-dialog` — delete confirmations
- `switch` — recurrence toggle, dark mode

### Verify
- Click task card → dialog opens with quick preview
- Click "View details" in dialog → navigates to `/dashboard/tasks/[taskId]`
- Full detail page shows comments, subtasks, time entries, author info
- create task → appears in list → edit → delete with confirmation
