'use server';

import { getManagementMe } from '@/lib/management-access';
import { channelingUserJson } from '@/lib/channeling-user-api';
import { fromColomboLocalInput } from '@/lib/tasks/constants';
import { listAssignablePeople, type Person } from '@/lib/tasks/people';
import {
  addComment,
  changeTaskStatus,
  createTask,
  deleteComment,
  deleteTask,
  getTaskDetail,
  listTasks,
  myTaskCounts,
  setWatching,
  TaskError,
  updateTask,
  type TaskActor
} from '@/lib/tasks/service';
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  setRecurringActive,
  updateRecurring,
  type RecurringInput
} from '@/lib/tasks/recurring';
import type {
  ActionResult,
  RecurringTaskItem,
  TaskDetail,
  TaskListItem,
  TaskListScope,
  TaskNotificationItem,
  TasksContext
} from '@/types/tasks';

async function getActor(): Promise<TaskActor> {
  const me = await getManagementMe();
  if (me.access !== 'allowed' || !me.userId) throw new TaskError('You must be signed in.', 'forbidden');
  if (!me.tasks.view) throw new TaskError("You don't have access to tasks.", 'forbidden');
  return { userId: me.userId, perms: me.tasks };
}

function failure(error: unknown): { success: false; errorCode: string; message: string } {
  if (error instanceof TaskError) return { success: false, errorCode: error.code, message: error.message };
  console.error('[tasks]', error);
  return { success: false, errorCode: 'server_error', message: 'Something went wrong. Please try again.' };
}

async function run<T>(fn: (actor: TaskActor) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn(await getActor());
    return (data === undefined ? { success: true } : { success: true, data }) as ActionResult<T>;
  } catch (error) {
    return failure(error);
  }
}

export async function getTasksContextAction(): Promise<ActionResult<TasksContext>> {
  return run(async (actor) => ({ userId: actor.userId, perms: actor.perms }));
}

export async function listTasksAction(input: {
  scope?: TaskListScope;
  q?: string;
  assigneeId?: string;
  includeClosed?: boolean;
}): Promise<ActionResult<TaskListItem[]>> {
  return run((actor) => listTasks(actor, input));
}

export async function getTaskAction(id: string): Promise<ActionResult<TaskDetail>> {
  return run((actor) => getTaskDetail(actor, id));
}

export async function listPeopleAction(): Promise<ActionResult<Person[]>> {
  return run(async () => listAssignablePeople());
}

export type TaskFormValues = {
  title: string;
  description?: string;
  assigneeId?: string;
  /** datetime-local value in Sri Lanka time, or '' for none */
  dueAt?: string;
  priority?: string;
  requireCompletionNote?: boolean;
};

export async function createTaskAction(values: TaskFormValues): Promise<ActionResult<{ id: string }>> {
  return run((actor) =>
    createTask(actor, {
      title: values.title,
      description: values.description,
      assigneeId: values.assigneeId || null,
      dueAt: fromColomboLocalInput(values.dueAt),
      priority: values.priority,
      requireCompletionNote: values.requireCompletionNote
    })
  );
}

export async function updateTaskAction(id: string, values: Partial<TaskFormValues>): Promise<ActionResult> {
  return run((actor) =>
    updateTask(actor, id, {
      title: values.title,
      description: values.description,
      assigneeId: values.assigneeId,
      dueAt: values.dueAt === undefined ? undefined : fromColomboLocalInput(values.dueAt),
      priority: values.priority,
      requireCompletionNote: values.requireCompletionNote
    })
  );
}

export async function changeTaskStatusAction(id: string, status: string, note?: string): Promise<ActionResult> {
  return run((actor) => changeTaskStatus(actor, id, status, note));
}

export async function addCommentAction(id: string, body: string): Promise<ActionResult> {
  return run((actor) => addComment(actor, id, body));
}

export async function deleteCommentAction(taskId: string, commentId: string): Promise<ActionResult> {
  return run((actor) => deleteComment(actor, taskId, commentId));
}

export async function setWatchingAction(id: string, watching: boolean): Promise<ActionResult> {
  return run((actor) => setWatching(actor, id, watching));
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  return run((actor) => deleteTask(actor, id));
}

export async function myTaskCountsAction(): Promise<ActionResult<{ open: number; overdue: number }>> {
  return run((actor) => myTaskCounts(actor));
}

/* ── Recurring ── */

export async function listRecurringAction(): Promise<ActionResult<RecurringTaskItem[]>> {
  return run((actor) => listRecurring(actor));
}

export async function createRecurringAction(input: RecurringInput): Promise<ActionResult<{ id: string }>> {
  return run((actor) => createRecurring(actor, input));
}

export async function updateRecurringAction(id: string, input: RecurringInput): Promise<ActionResult> {
  return run((actor) => updateRecurring(actor, id, input));
}

export async function setRecurringActiveAction(id: string, active: boolean): Promise<ActionResult> {
  return run((actor) => setRecurringActive(actor, id, active));
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  return run((actor) => deleteRecurring(actor, id));
}

/* ── Notifications (stored in channeling, which also pushes them to phones) ── */

export async function listTaskNotificationsAction(): Promise<ActionResult<{ items: TaskNotificationItem[]; unread: number }>> {
  return run(async () => {
    const result = await channelingUserJson<{
      success: boolean;
      items?: { id: string; type: string; title: string; message: string | null; referenceId: string | null; readAt: string | null; createdAt: string }[];
      unread?: number;
    }>('/api/management/tasks/notifications?limit=30');
    if (!result.success) throw new TaskError('Could not load notifications.');
    return {
      unread: result.unread ?? 0,
      items: (result.items ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        taskId: n.referenceId,
        read: n.readAt != null,
        createdAt: n.createdAt
      }))
    };
  });
}

export async function markTaskNotificationsReadAction(taskId?: string): Promise<ActionResult> {
  return run(async () => {
    await channelingUserJson('/api/management/tasks/notifications', {
      method: 'POST',
      body: JSON.stringify(taskId ? { taskId } : {})
    });
  });
}
