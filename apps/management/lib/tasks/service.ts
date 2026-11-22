import 'server-only';
import { after } from 'next/server';
import type { Prisma } from '@/lib/generated/prisma-client';
import { prisma } from '@/lib/prisma';
import {
  OPEN_STATUSES,
  STATUS_LABEL,
  TASK_ACTIVITY,
  TASK_STATUS,
  formatDue,
  isTaskPriority,
  isTaskStatus,
  type TaskPermissions,
  type TaskPriority,
  type TaskStatus
} from '@/lib/tasks/constants';
import { notifyTaskEvent } from '@/lib/tasks/notify';
import { getPeopleByIds, listAssignablePeople, type Person } from '@/lib/tasks/people';
import type { TaskActivityItem, TaskCan, TaskDetail, TaskListItem, TaskListScope } from '@/types/tasks';

/**
 * Task Manager rules. Privileges come from channeling (`management-tasks` group switches):
 *  - view:       see tasks you created, are assigned or watch; change status of tasks assigned to you; comment
 *  - create:     create tasks and assign them to anyone who can use tasks
 *  - manage-all: see and edit every task
 * The creator can edit, reassign, cancel and delete their task; the assignee can move it through statuses.
 */
export type TaskActor = { userId: string; perms: TaskPermissions };

export class TaskError extends Error {
  constructor(
    message: string,
    readonly code: 'forbidden' | 'not_found' | 'invalid_input' = 'invalid_input'
  ) {
    super(message);
  }
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const DONE_VISIBLE_DAYS = 14;
const MAX_TITLE = 200;
const MAX_TEXT = 5000;

type TaskRow = Prisma.TaskGetPayload<{ include: { watchers: { select: { userId: true } } } }>;

function canSee(actor: TaskActor, task: TaskRow): boolean {
  return (
    actor.perms.manageAll ||
    task.createdById === actor.userId ||
    task.assigneeId === actor.userId ||
    task.watchers.some((w) => w.userId === actor.userId)
  );
}

function permissionsFor(actor: TaskActor, task: TaskRow): TaskCan {
  const isCreator = task.createdById === actor.userId;
  const isAssignee = task.assigneeId === actor.userId;
  const manage = actor.perms.manageAll || isCreator;
  return {
    edit: manage,
    changeStatus: manage || isAssignee,
    cancel: manage,
    delete: manage,
    comment: canSee(actor, task)
  };
}

async function loadTask(actor: TaskActor, id: string): Promise<TaskRow> {
  if (!actor.perms.view) throw new TaskError("You don't have access to tasks.", 'forbidden');
  if (!OBJECT_ID.test(id)) throw new TaskError('Task not found.', 'not_found');
  const task = await prisma.task.findUnique({ where: { id }, include: { watchers: { select: { userId: true } } } });
  if (!task || !canSee(actor, task)) throw new TaskError('Task not found.', 'not_found');
  return task;
}

function audience(task: TaskRow, extra: (string | null)[] = []): string[] {
  return [task.createdById, task.assigneeId, ...task.watchers.map((w) => w.userId), ...extra].filter(
    (id): id is string => !!id
  );
}

function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function assertAssignable(userId: string): Promise<Person> {
  const person = (await listAssignablePeople()).find((p) => p.id === userId);
  if (!person) throw new TaskError('That person can’t be assigned tasks (they need Management app task access).');
  return person;
}

async function nextTaskNumber(): Promise<number> {
  const counter = await prisma.counter.upsert({
    where: { id: 'task' },
    update: { value: { increment: 1 } },
    create: { id: 'task', value: 1 }
  });
  return counter.value;
}

/**
 * Create with a fresh number; retries if two creates raced for the same number. Recurring occurrences
 * pass their own dedupeKey, and a clash on it means the occurrence already exists (thrown as P2002).
 */
export async function createTaskRecord(data: Omit<Prisma.TaskUncheckedCreateInput, 'number' | 'dedupeKey'> & { dedupeKey?: string }) {
  for (let attempt = 0; ; attempt++) {
    const number = await nextTaskNumber();
    try {
      return await prisma.task.create({ data: { ...data, number, dedupeKey: data.dedupeKey ?? `task:${number}` } });
    } catch (error) {
      const code = (error as { code?: string }).code;
      const target = String((error as { meta?: { target?: unknown } }).meta?.target ?? '');
      if (code !== 'P2002' || attempt >= 2 || (data.dedupeKey && target.includes('dedupeKey'))) throw error;
    }
  }
}

/* ── Reads ── */

export async function listTasks(
  actor: TaskActor,
  input: { scope?: TaskListScope; q?: string; assigneeId?: string; includeClosed?: boolean }
): Promise<TaskListItem[]> {
  if (!actor.perms.view) throw new TaskError("You don't have access to tasks.", 'forbidden');
  const scope: TaskListScope = input.scope === 'all' && !actor.perms.manageAll ? 'mine' : input.scope ?? 'mine';

  const and: Prisma.TaskWhereInput[] = [];
  if (scope === 'mine') and.push({ assigneeId: actor.userId });
  else if (scope === 'created') and.push({ createdById: actor.userId });
  else if (scope === 'watching') and.push({ watchers: { some: { userId: actor.userId } } });
  if (scope === 'all' && input.assigneeId && OBJECT_ID.test(input.assigneeId)) and.push({ assigneeId: input.assigneeId });

  const q = cleanText(input.q, 100);
  if (q) {
    const asNumber = /^t?-?(\d+)$/i.exec(q);
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        ...(asNumber ? [{ number: Number(asNumber[1]) }] : [])
      ]
    });
  }
  if (!input.includeClosed) {
    const since = new Date(Date.now() - DONE_VISIBLE_DAYS * 86_400_000);
    and.push({ OR: [{ status: { in: OPEN_STATUSES } }, { updatedAt: { gte: since } }] });
  }

  const rows = await prisma.task.findMany({
    where: { AND: and },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    take: 300,
    include: { _count: { select: { comments: true } } }
  });
  const people = await getPeopleByIds(rows.flatMap((r) => [r.assigneeId, r.createdById]));
  const name = (id: string | null) => (id ? { id, name: people.get(id)?.name ?? 'Unknown' } : null);

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    status: r.status as TaskStatus,
    priority: r.priority as TaskPriority,
    dueAt: r.dueAt?.toISOString() ?? null,
    assignee: name(r.assigneeId),
    createdBy: name(r.createdById)!,
    commentCount: r._count.comments,
    recurring: !!r.recurringTaskId,
    requireCompletionNote: r.requireCompletionNote,
    updatedAt: r.updatedAt.toISOString()
  }));
}

export async function getTaskDetail(actor: TaskActor, id: string): Promise<TaskDetail> {
  const task = await loadTask(actor, id);
  const [comments, activity] = await Promise.all([
    prisma.taskComment.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' }, take: 500 }),
    prisma.taskActivity.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' }, take: 500 })
  ]);
  const ids = [
    task.createdById,
    task.assigneeId,
    task.completedById,
    ...task.watchers.map((w) => w.userId),
    ...comments.map((c) => c.authorId),
    ...activity.flatMap((a) => [a.actorId, ...(a.type === TASK_ACTIVITY.ASSIGNED ? [a.fromValue, a.toValue] : [])])
  ];
  const people = await getPeopleByIds(ids);
  const name = (uid: string | null | undefined) => (uid ? people.get(uid)?.name ?? 'Unknown' : null);
  const ref = (uid: string | null | undefined) => (uid ? { id: uid, name: name(uid)! } : null);

  const activityItems: TaskActivityItem[] = activity.map((a) => ({
    id: a.id,
    actorName: name(a.actorId),
    type: a.type,
    fromValue: a.type === TASK_ACTIVITY.ASSIGNED ? name(a.fromValue) : a.fromValue,
    toValue: a.type === TASK_ACTIVITY.ASSIGNED ? name(a.toValue) : a.toValue,
    createdAt: a.createdAt.toISOString()
  }));

  return {
    id: task.id,
    number: task.number,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    dueAt: task.dueAt?.toISOString() ?? null,
    assignee: ref(task.assigneeId),
    createdBy: ref(task.createdById)!,
    completedAt: task.completedAt?.toISOString() ?? null,
    completedBy: ref(task.completedById),
    requireCompletionNote: task.requireCompletionNote,
    recurringTaskId: task.recurringTaskId,
    watchers: task.watchers.map((w) => ref(w.userId)!),
    isWatching: task.watchers.some((w) => w.userId === actor.userId),
    comments: comments.map((c) => ({
      id: c.id,
      author: ref(c.authorId)!,
      body: c.body,
      isCompletionNote: c.isCompletionNote,
      createdAt: c.createdAt.toISOString(),
      mine: c.authorId === actor.userId
    })),
    activity: activityItems,
    can: permissionsFor(actor, task),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

/* ── Writes ── */

export type TaskInput = {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueAt?: Date | null;
  priority?: string;
  requireCompletionNote?: boolean;
};

export async function createTask(actor: TaskActor, input: TaskInput): Promise<{ id: string }> {
  if (!actor.perms.create) throw new TaskError("You don't have permission to create tasks.", 'forbidden');
  const title = cleanText(input.title, MAX_TITLE);
  if (!title) throw new TaskError('Title is required.');
  const assigneeId = input.assigneeId || actor.userId;
  if (assigneeId !== actor.userId) await assertAssignable(assigneeId);
  const priority = isTaskPriority(input.priority) ? input.priority : 'NORMAL';

  const task = await createTaskRecord({
    title,
    description: cleanText(input.description) || null,
    priority,
    dueAt: input.dueAt ?? null,
    createdById: actor.userId,
    assigneeId,
    requireCompletionNote: !!input.requireCompletionNote
  });
  await prisma.$transaction([
    prisma.taskWatcher.createMany({
      data: [...new Set([actor.userId, assigneeId])].map((userId) => ({ taskId: task.id, userId }))
    }),
    prisma.taskActivity.create({ data: { taskId: task.id, actorId: actor.userId, type: TASK_ACTIVITY.CREATED } })
  ]);

  if (assigneeId !== actor.userId) {
    const people = await getPeopleByIds([actor.userId]);
    after(() =>
      notifyTaskEvent({
        task,
        actorId: actor.userId,
        type: 'task_assigned',
        recipientIds: [assigneeId],
        headline: `${people.get(actor.userId)?.name ?? 'Someone'} assigned you a task`,
        detail: task.dueAt ? `Due ${formatDue(task.dueAt)}` : null
      })
    );
  }
  return { id: task.id };
}

export async function updateTask(actor: TaskActor, id: string, input: Partial<TaskInput>): Promise<void> {
  const task = await loadTask(actor, id);
  if (!permissionsFor(actor, task).edit) throw new TaskError('Only the creator can edit this task.', 'forbidden');

  const data: Prisma.TaskUpdateInput = {};
  const activity: Prisma.TaskActivityCreateManyInput[] = [];
  const log = (type: string, fromValue: string | null, toValue: string | null) =>
    activity.push({ taskId: id, actorId: actor.userId, type, fromValue, toValue });

  if (input.title !== undefined) {
    const title = cleanText(input.title, MAX_TITLE);
    if (!title) throw new TaskError('Title is required.');
    if (title !== task.title) data.title = title;
  }
  if (input.description !== undefined) {
    const description = cleanText(input.description) || null;
    if (description !== task.description) data.description = description;
  }
  if (data.title !== undefined || data.description !== undefined) log(TASK_ACTIVITY.EDITED, null, null);
  if (input.priority !== undefined && isTaskPriority(input.priority) && input.priority !== task.priority) {
    data.priority = input.priority;
    log(TASK_ACTIVITY.PRIORITY, task.priority, input.priority);
  }
  if (input.requireCompletionNote !== undefined) data.requireCompletionNote = !!input.requireCompletionNote;
  if (input.dueAt !== undefined) {
    const next = input.dueAt?.getTime() ?? null;
    if (next !== (task.dueAt?.getTime() ?? null)) {
      data.dueAt = input.dueAt;
      // New due date → reminders can fire again
      data.dueSoonNotifiedAt = null;
      data.overdueNotifiedAt = null;
      log(TASK_ACTIVITY.DUE, task.dueAt?.toISOString() ?? null, input.dueAt?.toISOString() ?? null);
    }
  }

  let newAssignee: string | null = null;
  if (input.assigneeId !== undefined && input.assigneeId && input.assigneeId !== task.assigneeId) {
    if (input.assigneeId !== actor.userId) await assertAssignable(input.assigneeId);
    newAssignee = input.assigneeId;
    data.assigneeId = newAssignee;
    log(TASK_ACTIVITY.ASSIGNED, task.assigneeId, newAssignee);
  }
  if (Object.keys(data).length === 0) return;

  await prisma.$transaction([
    prisma.task.update({ where: { id }, data }),
    ...(activity.length ? [prisma.taskActivity.createMany({ data: activity })] : []),
    ...(newAssignee
      ? [
          prisma.taskWatcher.upsert({
            where: { taskId_userId: { taskId: id, userId: newAssignee } },
            update: {},
            create: { taskId: id, userId: newAssignee }
          })
        ]
      : [])
  ]);

  if (newAssignee) {
    const previous = task.assigneeId;
    const people = await getPeopleByIds([actor.userId, newAssignee]);
    const who = people.get(actor.userId)?.name ?? 'Someone';
    const taskRef = { ...task, title: (data.title as string | undefined) ?? task.title };
    after(async () => {
      await notifyTaskEvent({ task: taskRef, actorId: actor.userId, type: 'task_assigned', recipientIds: [newAssignee], headline: `${who} assigned you a task` });
      await notifyTaskEvent({
        task: taskRef,
        actorId: actor.userId,
        type: 'task_unassigned',
        recipientIds: [previous, task.createdById].filter((u) => u !== newAssignee),
        headline: `${who} reassigned a task to ${people.get(newAssignee)?.name ?? 'someone else'}`
      });
    });
  }
}

export async function changeTaskStatus(actor: TaskActor, id: string, status: string, note?: string | null): Promise<void> {
  if (!isTaskStatus(status)) throw new TaskError('Unknown status.');
  const task = await loadTask(actor, id);
  const can = permissionsFor(actor, task);
  if (!can.changeStatus) throw new TaskError('Only the assignee or creator can change the status.', 'forbidden');
  if (status === TASK_STATUS.CANCELLED && !can.cancel) throw new TaskError('Only the creator can cancel this task.', 'forbidden');
  if (status === task.status) return;

  const body = cleanText(note);
  if (status === TASK_STATUS.DONE && task.requireCompletionNote && !body) {
    throw new TaskError('This task needs a comment when you mark it done (e.g. what you checked or the amount).');
  }

  const done = status === TASK_STATUS.DONE;
  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: done ? new Date() : null,
        completedById: done ? actor.userId : null
      }
    }),
    prisma.taskActivity.create({
      data: { taskId: id, actorId: actor.userId, type: TASK_ACTIVITY.STATUS, fromValue: task.status, toValue: status }
    }),
    ...(body ? [prisma.taskComment.create({ data: { taskId: id, authorId: actor.userId, body, isCompletionNote: done } })] : [])
  ]);

  const people = await getPeopleByIds([actor.userId]);
  const who = people.get(actor.userId)?.name ?? 'Someone';
  after(() =>
    notifyTaskEvent({
      task,
      actorId: actor.userId,
      type: 'task_status',
      recipientIds: audience(task),
      headline: `${who} moved a task to ${STATUS_LABEL[status]}`,
      detail: body ? `${STATUS_LABEL[task.status as TaskStatus]} → ${STATUS_LABEL[status]}\n${body}` : `${STATUS_LABEL[task.status as TaskStatus]} → ${STATUS_LABEL[status]}`
    })
  );
}

export async function addComment(actor: TaskActor, id: string, text: string): Promise<void> {
  const task = await loadTask(actor, id);
  const body = cleanText(text);
  if (!body) throw new TaskError('Write a comment first.');
  await prisma.$transaction([
    prisma.taskComment.create({ data: { taskId: id, authorId: actor.userId, body } }),
    // Commenting on a task means you want to hear about it
    prisma.taskWatcher.upsert({
      where: { taskId_userId: { taskId: id, userId: actor.userId } },
      update: {},
      create: { taskId: id, userId: actor.userId }
    }),
    prisma.task.update({ where: { id }, data: { updatedAt: new Date() } })
  ]);
  const people = await getPeopleByIds([actor.userId]);
  after(() =>
    notifyTaskEvent({
      task,
      actorId: actor.userId,
      type: 'task_comment',
      recipientIds: audience(task),
      headline: `${people.get(actor.userId)?.name ?? 'Someone'} commented`,
      detail: body.length > 400 ? `${body.slice(0, 400)}…` : body
    })
  );
}

export async function deleteComment(actor: TaskActor, taskId: string, commentId: string): Promise<void> {
  const task = await loadTask(actor, taskId);
  if (!OBJECT_ID.test(commentId)) throw new TaskError('Comment not found.', 'not_found');
  const comment = await prisma.taskComment.findFirst({ where: { id: commentId, taskId } });
  if (!comment) throw new TaskError('Comment not found.', 'not_found');
  if (comment.authorId !== actor.userId && !permissionsFor(actor, task).edit) {
    throw new TaskError('You can only delete your own comments.', 'forbidden');
  }
  await prisma.taskComment.delete({ where: { id: commentId } });
}

export async function setWatching(actor: TaskActor, id: string, watching: boolean): Promise<void> {
  const task = await loadTask(actor, id);
  if (watching) {
    await prisma.taskWatcher.upsert({
      where: { taskId_userId: { taskId: id, userId: actor.userId } },
      update: {},
      create: { taskId: id, userId: actor.userId }
    });
  } else {
    // Creator and assignee always hear about their task; unwatching only stops extra updates for others
    if (task.createdById === actor.userId || task.assigneeId === actor.userId) {
      throw new TaskError('The creator and assignee always get updates for this task.');
    }
    await prisma.taskWatcher.deleteMany({ where: { taskId: id, userId: actor.userId } });
  }
}

export async function deleteTask(actor: TaskActor, id: string): Promise<void> {
  const task = await loadTask(actor, id);
  if (!permissionsFor(actor, task).delete) throw new TaskError('Only the creator can delete this task.', 'forbidden');
  await prisma.$transaction([
    prisma.taskComment.deleteMany({ where: { taskId: id } }),
    prisma.taskActivity.deleteMany({ where: { taskId: id } }),
    prisma.taskWatcher.deleteMany({ where: { taskId: id } }),
    prisma.task.delete({ where: { id } })
  ]);
}

/** Counts for the menu badge: open tasks assigned to me, and how many are overdue. */
export async function myTaskCounts(actor: TaskActor): Promise<{ open: number; overdue: number }> {
  if (!actor.perms.view) return { open: 0, overdue: 0 };
  const where = { assigneeId: actor.userId, status: { in: OPEN_STATUSES } };
  const [open, overdue] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, dueAt: { lt: new Date() } } })
  ]);
  return { open, overdue };
}
