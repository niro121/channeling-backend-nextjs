/** Task Manager constants and helpers shared by the server and the browser. */

export type TaskPermissions = {
  /** Use the task board: own, assigned and watched tasks; can be assigned tasks */
  view: boolean;
  /** Create tasks and assign them to people */
  create: boolean;
  /** Create and manage recurring tasks */
  recurring: boolean;
  /** See and manage everyone's tasks */
  manageAll: boolean;
};

export const NO_TASK_PERMISSIONS: TaskPermissions = { view: false, create: false, recurring: false, manageAll: false };

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING: 'WAITING',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED'
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

/** Board columns, in order (Cancelled is reachable through filters, not a column) */
export const BOARD_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'WAITING', 'DONE'];
export const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED'];
export const OPEN_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'WAITING'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  WAITING: 'Waiting',
  DONE: 'Done',
  CANCELLED: 'Cancelled'
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (ALL_STATUSES as string[]).includes(value);
}

export const TASK_PRIORITY = { LOW: 'LOW', NORMAL: 'NORMAL', HIGH: 'HIGH', URGENT: 'URGENT' } as const;
export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];
export const PRIORITIES: TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export const PRIORITY_LABEL: Record<TaskPriority, string> = { LOW: 'Low', NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent' };

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (PRIORITIES as string[]).includes(value);
}

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABEL: Record<Frequency, string> = { DAILY: 'Every day', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** e.g. "Every Wednesday", "Mon, Wed, Fri", "Monthly on day 1", "Every day" */
export function describeSchedule(r: { frequency: string; daysOfWeek: number[]; dayOfMonth: number | null }): string {
  if (r.frequency === 'DAILY') return 'Every day';
  if (r.frequency === 'MONTHLY') return `Monthly on day ${r.dayOfMonth ?? 1}`;
  const days = [...r.daysOfWeek].sort((a, b) => a - b);
  if (days.length === 1) return `Every ${WEEKDAY_LONG[days[0]]}`;
  if (days.length === 7) return 'Every day';
  return days.map((d) => WEEKDAY_SHORT[d]).join(', ');
}

export const TASK_ACTIVITY = {
  CREATED: 'created',
  RECURRING_CREATED: 'recurring_created',
  ASSIGNED: 'assigned',
  STATUS: 'status',
  DUE: 'due',
  PRIORITY: 'priority',
  EDITED: 'edited',
  WATCHED: 'watched'
} as const;

/* ── Sri Lanka time (UTC+05:30, no daylight saving) ── */

export const TZ_OFFSET_MINUTES = 330;
export const TIME_ZONE = 'Asia/Colombo';

/** YYYY-MM-DD of an instant, in Sri Lanka time */
export function colomboDateKey(date: Date): string {
  return new Date(date.getTime() + TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** The instant for a Sri Lanka local date (YYYY-MM-DD) and time (HH:mm) */
export function colomboInstant(dateKey: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const utc = Date.parse(`${dateKey}T00:00:00Z`) + ((h || 0) * 60 + (m || 0) - TZ_OFFSET_MINUTES) * 60_000;
  return new Date(utc);
}

/** "YYYY-MM-DDTHH:mm" (datetime-local value, Sri Lanka time) for an instant */
export function toColomboLocalInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getTime() + TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 16);
}

/** Parse a datetime-local value entered in Sri Lanka time; null when empty or invalid */
export function fromColomboLocalInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return m ? colomboInstant(m[1], m[2]) : null;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatDue(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatWhen(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function isOverdue(task: { dueAt: string | Date | null; status: string }): boolean {
  if (!task.dueAt || task.status === 'DONE' || task.status === 'CANCELLED') return false;
  return new Date(task.dueAt).getTime() < Date.now();
}
