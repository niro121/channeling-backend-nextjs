import 'server-only';
import { channelingFetchAs } from '@/lib/channeling-user-api';
import { sendMail } from '@/lib/mailer';
import { APP_DISPLAY_NAME } from '@/lib/helpers/2fa/constants';
import { getPeopleByIds } from '@/lib/tasks/people';

export type TaskNotificationType =
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_status'
  | 'task_comment'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_updated';

type NotifyInput = {
  task: { id: string; number: number; title: string; createdById: string };
  /** Who did it; null for the recurring/reminder job (sent on behalf of the task's creator) */
  actorId: string | null;
  type: TaskNotificationType;
  recipientIds: (string | null | undefined)[];
  /** Short line, e.g. "Nimal assigned you a task" */
  headline: string;
  /** Detail, e.g. the comment text or "To do → Done" */
  detail?: string | null;
};

function taskUrl(id: string): string {
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  return `${base}/tasks/${id}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/**
 * Tell people about a task event: in-app notification + phone push (through channeling, which
 * owns notifications and the push worker) and an email. The person who acted is never notified.
 * Never throws — a failed notification must not undo the task change.
 */
export async function notifyTaskEvent(input: NotifyInput): Promise<void> {
  const recipients = [...new Set(input.recipientIds.filter((id): id is string => !!id && id !== input.actorId))];
  if (recipients.length === 0) return;
  const label = `T-${input.task.number}`;
  const title = `${label}: ${input.task.title}`;

  try {
    const people = await getPeopleByIds([...recipients, input.actorId ?? input.task.createdById]);
    const sender = people.get(input.actorId ?? input.task.createdById);

    const push = (async () => {
      if (!sender) return;
      const res = await channelingFetchAs(sender, '/api/management/tasks/notify', {
        method: 'POST',
        body: JSON.stringify({
          recipientIds: recipients,
          type: input.type,
          title: input.headline,
          message: input.detail ? `${title} — ${input.detail}` : title,
          taskId: input.task.id
        })
      });
      if (!res.ok) console.error('[tasks notify] channeling', res.status, await res.text().catch(() => ''));
    })();

    const url = taskUrl(input.task.id);
    const emails = recipients.map((id) => people.get(id)?.email).filter((e): e is string => !!e);
    const text = [input.headline, '', title, input.detail ? `\n${input.detail}` : '', '', `Open: ${url}`].join('\n');
    const html = `<p>${escapeHtml(input.headline)}</p>
<p><strong>${escapeHtml(title)}</strong></p>
${input.detail ? `<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(input.detail)}</blockquote>` : ''}
<p><a href="${url}">Open the task</a></p>
<p style="color:#888;font-size:12px">${escapeHtml(APP_DISPLAY_NAME)}</p>`;
    const mail = sendMail({ to: emails, subject: `[${label}] ${input.headline}`, text, html });

    await Promise.allSettled([push, mail]);
  } catch (error) {
    console.error('[tasks notify]', error);
  }
}
