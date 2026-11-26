import { format } from 'date-fns';

export type AuditLineInfo = {
  name?: string | null;
  /** Optional role/position shown in parentheses after the name. */
  position?: string | null;
  at?: Date | string | null;
};

/**
 * Formats created/updated audit footer lines.
 * Example: `Jane Doe (HR) · 4 Nov 2026 · 14:30`
 */
export function formatAuditLine(info?: AuditLineInfo | null): string;
export function formatAuditLine(
  name?: string | null,
  position?: string | null,
  at?: Date | string | null
): string;
export function formatAuditLine(
  nameOrInfo?: string | AuditLineInfo | null,
  position?: string | null,
  at?: Date | string | null
): string {
  const info: AuditLineInfo =
    nameOrInfo && typeof nameOrInfo === 'object'
      ? nameOrInfo
      : { name: nameOrInfo, position, at };

  if (!info.name || !info.at) return '—';

  const date = info.at instanceof Date ? info.at : new Date(info.at);
  if (Number.isNaN(date.getTime())) return '—';

  const namePart = info.position
    ? `${info.name} (${info.position})`
    : info.name;

  return `${namePart} · ${format(date, 'd MMM yyyy')} · ${format(date, 'HH:mm')}`;
}
