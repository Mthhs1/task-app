# Features — Task App

## Core Task Management

### Task Creation & Editing
Create tasks with title, description, priority (low/medium/high/urgent), status (todo/in_progress/done/archived), assignee, due date, time estimate, tags, and milestone linkage. Edit any field inline or via dialog.

### Subtask Nesting
Break down large tasks into actionable subtasks. Subtasks nest under a parent task via self-referencing `parentId`, supporting unlimited nesting depth. Parent tasks display subtask count and expand/collapse to reveal children.

### Due Dates & Time Estimates
Set specific deadlines on tasks for accountability. Add time-budget estimates (in minutes) to plan resource allocation and improve future project estimates. UI displays remaining time as "1 day and 12 hours remaining" based on estimate minus logged time.

### Prioritization
Categorize tasks by urgency using four priority levels: low, medium, high, urgent. Priorities are color-coded in list, kanban, and calendar views for quick visual scanning.

### Tags & Color-Coding
Create custom tags scoped to each organization (e.g. "urgent", "backend", "research"). Assign color to each tag. Attach multiple tags to tasks. Filter tasks by tag.

### Recurring Tasks
Set tasks to automatically repeat on a schedule:
- **Daily** — every N days
- **Weekly** — every N weeks on specific days of the week
- **Monthly** — on a specific day of the month each N months

Each recurrence has a completion window (e.g. "12h to complete") meaning the generated instance is due at `nextDueDate + completionWindow`. New task instances are generated on-demand at read time when the server detects an overdue recurrence rule — no background worker required.

---

## Views & Navigation

### List View
Standard flat or grouped task list. Shows priority badge, due date, assignee avatar, tags, subtask count, milestone badge, and time remaining. Supports filtering by status, priority, assignee, tags, and milestone.

### Kanban Board
Visual drag-and-drop workflow with columns for each status (todo, in_progress, done, archived). Drag tasks between columns to change status — updates are optimistic and broadcast in realtime to all connected clients via websocket.

### Calendar View (Week + Day)
Time-blocked calendar showing tasks on their due dates. Week view shows 7 days with task events. Day view shows a single day with detailed time slots. Custom event renderer shows priority color and task title. Click an event to open the task detail.

### View Toggle
Switch between List, Kanban, and Calendar views via tabs. Active view is saved as a URL searchParam for deep-linking and shareable links.

---

## Milestones

### Milestone Tracking
Create milestones as major checkpoints within a project. Each milestone has a title, description, due date, and status (planned/in_progress/completed). Link tasks to milestones via a dropdown in the task dialog. Milestone cards display linked task count and completion percentage with a progress bar.

---

## Time Tracking

### Manual Time Logging
Log time entries against any task. Each entry records start time, end time, duration (minutes), and an optional note. Multiple team members can log time on the same task.

### Remaining Time Display
Tasks with a time estimate show remaining time calculated as `timeEstimate - sum(timeEntries)`. Displayed in human-readable format ("3 hours remaining", "1 day and 6 hours remaining", "Over budget by 2 hours").

### Time Statistics Dashboard
Aggregated time stats per organization, broken down by user and by task. Shows total logged time, estimated vs. actual, and progress bars. Optional page accessible from the sidebar.

---

## Collaboration & Communication

### Organizations (Groups)
Create organizations to group users — represents a family, a team, or any group working together. Managed via better-auth's organization plugin with built-in roles (owner, admin, member) and invitation system.

### Organization Switching
Switch between multiple organizations from the header dropdown. Active organization context determines which tasks, tags, milestones, and members are displayed. WebSocket subscriptions update on switch.

### Task Assignment
Delegate specific tasks to organization members. Assignee avatar appears on task cards. Filter tasks by assignee to see what's on each person's plate.

### Comments & Discussion
Discuss project blockers or updates directly within a task. Comments support plain text with @mentions. Each comment shows author avatar, name, timestamp, and can be deleted by the author.

### @Mentions & Notifications
Use @username in comments to notify colleagues. Mentioned users receive:
- A real-time notification badge in the header (via websocket push)
- A stored notification in the database for later viewing
- The notification is marked as read when clicked or via "mark all as read"

Notification types: `mention`, `assignment`, `task_updated`, `comment_added`.

---

## Real-Time Updates

### WebSocket Sync
All connected clients in the same organization receive realtime updates when:
- A task is created, updated, or deleted
- A comment is added
- A notification is triggered

Changes appear instantly across all open browser windows without requiring a page refresh. Optimistic updates provide instant feedback, with websocket broadcasts confirming server truth and correcting if needed.

---

## Authentication & Security

### Email/Password Auth
Sign up and log in with email and password. Passwords hashed via better-auth. Session cookies sent cross-origin with credentials.

### Google OAuth
Sign in with Google. Requires Google Cloud Console OAuth credentials configured in backend env. Callback URL: `http://localhost:3001/api/auth/callback/google`.

### Route Protection
Next.js 16 `proxy.ts` intercepts all `(app)/*` routes and redirects unauthenticated users to `/login`. Session is also validated server-side on every API request via auth middleware.

---

## UI/UX Polish

### Dark Mode
Light and dark themes toggled from the header. Powered by `next-themes`. Theme preference persisted. All Shadcn components support both themes via CSS variables.

### Responsive Layout
Sidebar collapses to a mobile sheet on smaller screens. Task board, kanban, and calendar adapt to touch-friendly layouts.

### Loading & Error States
Skeleton placeholders during data fetch. Error boundary with retry button (`unstable_retry`) per Next.js 16 conventions. Toast notifications for success/error feedback (sonner).

### Deep-Linking
Current view (list/kanban/calendar), active filters, and selected organization are reflected in the URL as searchParams. Shareable links restore exact view state.