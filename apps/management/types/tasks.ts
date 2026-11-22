import type { Frequency, TaskPermissions, TaskPriority, TaskStatus } from '@/lib/tasks/constants';

export type TaskListScope = 'mine' | 'created' | 'watching' | 'all';

export type PersonRef = { id: string; name: string };

export type TaskListItem = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assignee: PersonRef | null;
  createdBy: PersonRef;
  commentCount: number;
  recurring: boolean;
  requireCompletionNote: boolean;
  updatedAt: string;
};

export type TaskCan = {
  edit: boolean;
  changeStatus: boolean;
  cancel: boolean;
  delete: boolean;
  comment: boolean;
};

export type TaskComment = {
  id: string;
  author: PersonRef;
  body: string;
  isCompletionNote: boolean;
  createdAt: string;
  mine: boolean;
};

export type TaskActivityItem = {
  id: string;
  actorName: string | null;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
};

export type TaskDetail = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assignee: PersonRef | null;
  createdBy: PersonRef;
  completedAt: string | null;
  completedBy: PersonRef | null;
  requireCompletionNote: boolean;
  recurringTaskId: string | null;
  watchers: PersonRef[];
  isWatching: boolean;
  comments: TaskComment[];
  activity: TaskActivityItem[];
  can: TaskCan;
  createdAt: string;
  updatedAt: string;
};

export type RecurringTaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assignee: PersonRef;
  createdBy: PersonRef;
  requireCompletionNote: boolean;
  frequency: Frequency;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  createTime: string;
  dueTime: string;
  active: boolean;
  nextRunDate: string;
  lastRunAt: string | null;
  canEdit: boolean;
};

export type TaskNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: string;
};

export type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; errorCode: string; message: string };

export type TasksContext = {
  userId: string;
  perms: TaskPermissions;
};
