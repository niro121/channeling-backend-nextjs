'use client';

import { Badge, CustomDialog } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DutyRosterRow } from '@/types/roster';
import { formatDutyDateLabel } from '@/lib/utils/duty-roster-view';
import DutyRecordActions from './record-actions';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  amended: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted'
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  amended: 'Amended',
  draft: 'Draft'
};

type DialogDutyRangeProps = {
  open: boolean;
  title: string;
  description?: string;
  rows: DutyRosterRow[];
  onOpenChange: (open: boolean) => void;
};

function groupByStaff(rows: DutyRosterRow[]) {
  const map = new Map<
    string,
    { staffId: string; staffCode: string; staffName: string; rows: DutyRosterRow[] }
  >();
  for (const row of rows) {
    const existing = map.get(row.staffId);
    if (existing) {
      existing.rows.push(row);
    } else {
      map.set(row.staffId, {
        staffId: row.staffId,
        staffCode: row.staffCode,
        staffName: row.staffName,
        rows: [row]
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.staffCode.localeCompare(b.staffCode, undefined, { sensitivity: 'base' })
  );
}

export default function DialogDutyRange({
  open,
  title,
  description,
  rows,
  onOpenChange
}: DialogDutyRangeProps) {
  const groups = groupByStaff(rows);

  return (
    <CustomDialog open={open} setOpen={onOpenChange} title={title}>
      <div className="space-y-4 py-2">
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'duty' : 'duties'} · {groups.length}{' '}
          {groups.length === 1 ? 'staff' : 'staff'}
        </p>

        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No duties in this range for the current filters.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div
                key={group.staffId}
                className="overflow-hidden rounded-lg border border-border"
              >
                <div className="bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
                  <span className="tabular-nums">{group.staffCode}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  {group.staffName}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {group.rows.length}{' '}
                    {group.rows.length === 1 ? 'duty' : 'duties'}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {group.rows.map((row) => {
                    const status = String(row.status || 'draft');
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-0.5 text-sm">
                          <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                            <span>{row.shiftName}</span>
                            <span className="font-normal tabular-nums text-muted-foreground">
                              {row.startTime}–{row.endTime}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-full border-0 font-medium',
                                STATUS_STYLES[status] ?? STATUS_STYLES.draft
                              )}
                            >
                              {STATUS_LABELS[status] ?? status}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDutyDateLabel(row.date)}
                            {row.dutyLocation
                              ? ` · ${row.dutyLocation}`
                              : ''}
                            {row.wardUnit ? ` · ${row.wardUnit}` : ''}
                          </p>
                        </div>
                        <DutyRecordActions
                          record={row}
                          onDeleted={() => onOpenChange(false)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomDialog>
  );
}
