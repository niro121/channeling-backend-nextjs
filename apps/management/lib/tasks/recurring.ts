import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  FREQUENCIES,
  OPEN_STATUSES,
  TASK_ACTIVITY,
  colomboDateKey,
  colomboInstant,
  describeSchedule,
  formatDue,
  isTaskPriority,
  isValidTime,
  type Frequency
} from '@/lib/tasks/constants';
import { notifyTaskEvent } from '@/lib/tasks/notify';
import { getPeopleByIds, listAssignablePeople } from '@/lib/tasks/people';
import { createTaskRecord, TaskError, type TaskActor } from '@/lib/tasks/service';
import type { RecurringTaskItem } from '@/types/tasks';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
/** If the app was down, still create occurrences this many days late (older ones are skipped). */
const CATCH_UP_DAYS = 2;
const DUE_SOON_MS = 2 * 60 * 60_000;
/** Don't send overdue alerts for tasks that were already long overdue (e.g. on first deploy). */
const OVERDUE_LOOKBACK_MS = 3 * 86_400_000;

type Rule = { frequency: string; daysOfWeek: number[]; dayOfMonth: number | null };

/** Not sent yet: Prisma on MongoDB doesn't match `null` against a field that was never written */
const notSent = (field: 'dueSoonNotifiedAt' | 'overdueNotifiedAt') => ({
  OR: [{ [field]: null }, { [field]: { isSet: false } }]
});

function addDays(dateKey: string, days: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function matches(rule: Rule, dateKey: string): boolean {
  const d = new Date(`${dateKey}T00:00:00Z`);
  if (rule.frequency === 'DAILY') return true;
  if (rule.frequency === 'WEEKLY') return rule.daysOfWeek.includes(d.getUTCDay());
  if (rule.frequency === 'MONTHLY') {
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return d.getUTCDate() === Math.min(rule.dayOfMonth ?? 1, lastDay);
  }
  return false;
}

/** First date on or after `from` (YYYY-MM-DD) that the rule fires on */
export function nextOccurrence(rule: Rule, from: string): string {
  let key = from;
  for (let i = 0; i < 400; i++) {
    if (matches(rule, key)) return key;
    key = addDays(key, 1);
  }
  throw new TaskError('That schedule never repeats.');
}

/* ── Template CRUD ── */

export type RecurringInput = {
  title: string;
  description?: string | null;
  priority?: string;
  assigneeId: string;
  requireCompletionNote?: boolean;
  frequency: string;
  daysOfWeek?: number[];
  dayOfMonth?: number | null;
  createTime?: string;
  dueTime?: string;
};

function validate(input: RecurringInput) {
  const title = (input.title ?? '').trim().slice(0, 200);
  if (!title) throw new TaskError('Title is required.');
  if (!FREQUENCIES.includes(input.frequency as Frequency)) throw new TaskError('Choose how often it repeats.');
  const daysOfWeek = [...new Set((input.daysOfWeek ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  if (input.frequency === 'WEEKLY' && daysOfWeek.length === 0) throw new TaskError('Pick at least one day of the week.');
  const dayOfMonth = input.frequency === 'MONTHLY' ? Number(input.dayOfMonth) : null;
  if (input.frequency === 'MONTHLY' && !(Number.isInteger(dayOfMonth) && dayOfMonth! >= 1 && dayOfMonth! <= 31)) {
    throw new TaskError('Pick a day of the month (1–31).');
  }
  const createTime = isValidTime(input.createTime) ? input.createTime : '08:00';
  const dueTime = isValidTime(input.dueTime) ? input.dueTime : '17:00';
  if (dueTime <= createTime) throw new TaskError('The due time must be after the time the task appears.');
  return {
    title,
    description: (input.description ?? '').trim().slice(0, 5000) || null,
    priority: isTaskPriority(input.priority) ? input.priority : 'NORMAL',
    requireCompletionNote: input.requireCompletionNote !== false,
    frequency: input.frequency,
    daysOfWeek: input.frequency === 'WEEKLY' ? daysOfWeek : [],
    dayOfMonth,
    createTime,
    dueTime
  };
}

async function assertAssignee(actor: TaskActor, assigneeId: string) {
  if (!OBJECT_ID.test(assigneeId)) throw new TaskError('Choose who it is assigned to.');
  if (assigneeId === actor.userId) return;
  if (!(await listAssignablePeople()).some((p) => p.id === assigneeId)) {
    throw new TaskError('That person can’t be assigned tasks (they need Management app task access).');
  }
}

/** Next run from today: today counts only if its create time hasn't passed yet… or it has, in which case the job creates it right away */
function firstRunDate(rule: Rule): string {
  return nextOccurrence(rule, colomboDateKey(new Date()));
}

export async function listRecurring(actor: TaskActor): Promise<RecurringTaskItem[]> {
  if (!actor.perms.recurring && !actor.perms.manageAll) throw new TaskError("You don't have access to recurring tasks.", 'forbidden');
  const rows = await prisma.recurringTask.findMany({
    where: actor.perms.manageAll ? {} : { OR: [{ createdById: actor.userId }, { assigneeId: actor.userId }] },
    orderBy: [{ active: 'desc' }, { title: 'asc' }]
  });
  const people = await getPeopleByIds(rows.flatMap((r) => [r.assigneeId, r.createdById]));
  const ref = (id: string) => ({ id, name: people.get(id)?.name ?? 'Unknown' });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority as RecurringTaskItem['priority'],
    assignee: ref(r.assigneeId),
    createdBy: ref(r.createdById),
    requireCompletionNote: r.requireCompletionNote,
    frequency: r.frequency as Frequency,
    daysOfWeek: r.daysOfWeek,
    dayOfMonth: r.dayOfMonth,
    createTime: r.createTime,
    dueTime: r.dueTime,
    active: r.active,
    nextRunDate: r.nextRunDate,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    canEdit: actor.perms.manageAll || (actor.perms.recurring && r.createdById === actor.userId)
  }));
}

export async function createRecurring(actor: TaskActor, input: RecurringInput): Promise<{ id: string }> {
  if (!actor.perms.recurring) throw new TaskError("You don't have permission to create recurring tasks.", 'forbidden');
  const data = validate(input);
  await assertAssignee(actor, input.assigneeId);
  const row = await prisma.recurringTask.create({
    data: { ...data, assigneeId: input.assigneeId, createdById: actor.userId, nextRunDate: firstRunDate(data) }
  });
  // Today's occurrence (if due today and its time has come) appears straight away
  await runRecurringJob().catch((e) => console.error('[recurring] run after create', e));
  return { id: row.id };
}

async function loadEditable(actor: TaskActor, id: string) {
  if (!OBJECT_ID.test(id)) throw new TaskError('Recurring task not found.', 'not_found');
  const row = await prisma.recurringTask.findUnique({ where: { id } });
  if (!row) throw new TaskError('Recurring task not found.', 'not_found');
  if (!(actor.perms.manageAll || (actor.perms.recurring && row.createdById === actor.userId))) {
    throw new TaskError('Only the creator can change this recurring task.', 'forbidden');
  }
  return row;
}

export async function updateRecurring(actor: TaskActor, id: string, input: RecurringInput): Promise<void> {
  const row = await loadEditable(actor, id);
  const data = validate(input);
  await assertAssignee(actor, input.assigneeId);
  const scheduleChanged =
    data.frequency !== row.frequency ||
    data.dayOfMonth !== row.dayOfMonth ||
    data.daysOfWeek.join() !== row.daysOfWeek.join() ||
    data.createTime !== row.createTime;
  await prisma.recurringTask.update({
    where: { id },
    data: { ...data, assigneeId: input.assigneeId, ...(scheduleChanged ? { nextRunDate: firstRunDate(data) } : {}) }
  });
}

export async function setRecurringActive(actor: TaskActor, id: string, active: boolean): Promise<void> {
  const row = await loadEditable(actor, id);
  // Resuming starts from today rather than catching up on the paused weeks
  await prisma.recurringTask.update({
    where: { id },
    data: { active, ...(active && !row.active ? { nextRunDate: firstRunDate(row) } : {}) }
  });
}

export async function deleteRecurring(actor: TaskActor, id: string): Promise<void> {
  await loadEditable(actor, id);
  // Tasks already created stay; they just lose the link to the template
  await prisma.$transaction([
    prisma.task.updateMany({ where: { recurringTaskId: id }, data: { recurringTaskId: null } }),
    prisma.recurringTask.delete({ where: { id } })
  ]);
}

/* ── Background job (lib/tasks/worker.ts runs it every few minutes) ── */

/** Create due occurrences. Safe to run on several dynos at once: each occurrence is unique per day. */
export async function runRecurringJob(now = new Date()): Promise<number> {
  const today = colomboDateKey(now);
  const templates = await prisma.recurringTask.findMany({ where: { active: true, nextRunDate: { lte: today } } });
  let created = 0;

  for (const t of templates) {
    let runDate = t.nextRunDate;
    const earliest = addDays(today, -CATCH_UP_DAYS);
    while (runDate <= today) {
      const appearsAt = colomboInstant(runDate, t.createTime);
      if (appearsAt > now) break; // today's, but not time yet
      const dedupeKey = `rec:${t.id}:${runDate}`;
      // Usually another run already made it — check first so we don't use up a task number
      if (runDate >= earliest && !(await prisma.task.findUnique({ where: { dedupeKey }, select: { id: true } }))) {
        try {
          const task = await createTaskRecord({
            title: t.title,
            description: t.description,
            priority: t.priority,
            dueAt: colomboInstant(runDate, t.dueTime),
            createdById: t.createdById,
            assigneeId: t.assigneeId,
            requireCompletionNote: t.requireCompletionNote,
            recurringTaskId: t.id,
            occurrenceDate: runDate,
            dedupeKey
          });
          await prisma.$transaction([
            prisma.taskWatcher.createMany({
              data: [...new Set([t.createdById, t.assigneeId])].map((userId) => ({ taskId: task.id, userId }))
            }),
            prisma.taskActivity.create({
              data: { taskId: task.id, actorId: null, type: TASK_ACTIVITY.RECURRING_CREATED, toValue: describeSchedule(t) }
            })
          ]);
          created++;
          await notifyTaskEvent({
            task,
            actorId: null,
            type: 'task_assigned',
            recipientIds: [t.assigneeId],
            headline: `New recurring task (${describeSchedule(t)})`,
            detail: `Due ${formatDue(task.dueAt)}`
          });
        } catch (error) {
          // Another dyno created it first — fine
          if ((error as { code?: string }).code !== 'P2002') console.error('[recurring] create', t.id, error);
        }
      }
      runDate = nextOccurrence(t, addDays(runDate, 1));
    }
    if (runDate !== t.nextRunDate) {
      // Only advance if nobody else already did
      await prisma.recurringTask.updateMany({
        where: { id: t.id, nextRunDate: t.nextRunDate },
        data: { nextRunDate: runDate, lastRunAt: now }
      });
    }
  }
  return created;
}

/** Due-soon (assignee) and overdue (assignee + creator) reminders, each sent once per task. */
export async function runReminderJob(now = new Date()): Promise<number> {
  let sent = 0;
  const dueSoon = await prisma.task.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      ...notSent('dueSoonNotifiedAt'),
      dueAt: { gt: now, lte: new Date(now.getTime() + DUE_SOON_MS) },
      assigneeId: { not: null }
    },
    take: 200
  });
  for (const task of dueSoon) {
    const claimed = await prisma.task.updateMany({ where: { id: task.id, ...notSent('dueSoonNotifiedAt') }, data: { dueSoonNotifiedAt: now } });
    if (claimed.count === 0) continue;
    // Created within the window (e.g. a same-day recurring task) — the "assigned" alert already said when it's due
    if (task.createdAt.getTime() > now.getTime() - 10 * 60_000) continue;
    await notifyTaskEvent({
      task,
      actorId: null,
      type: 'task_due_soon',
      recipientIds: [task.assigneeId],
      headline: 'Task due soon',
      detail: `Due ${formatDue(task.dueAt)}`
    });
    sent++;
  }

  const overdue = await prisma.task.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      ...notSent('overdueNotifiedAt'),
      dueAt: { lte: now, gt: new Date(now.getTime() - OVERDUE_LOOKBACK_MS) }
    },
    take: 200
  });
  for (const task of overdue) {
    const claimed = await prisma.task.updateMany({ where: { id: task.id, ...notSent('overdueNotifiedAt') }, data: { overdueNotifiedAt: now } });
    if (claimed.count === 0) continue;
    const people = await getPeopleByIds([task.assigneeId]);
    await notifyTaskEvent({
      task,
      actorId: null,
      type: 'task_overdue',
      recipientIds: [task.assigneeId, task.createdById],
      headline: 'Task overdue',
      detail: `Was due ${formatDue(task.dueAt)}${task.assigneeId ? ` · assigned to ${people.get(task.assigneeId)?.name ?? 'someone'}` : ''}`
    });
    sent++;
  }
  return sent;
}
