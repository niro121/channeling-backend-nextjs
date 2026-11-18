'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Eye, X } from 'lucide-react';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { RosterStaffRow, ShiftCell } from '@/types/roster';

type SheetRosterStaffViewProps = {
  open: boolean;
  record: RosterStaffRow | null;
  dayIsos?: string[];
  onOpenChange: (open: boolean) => void;
};

type DutyListItem = {
  dateIso: string;
  shift: ShiftCell;
};

const STATUS_STYLES: Record<RosterStaffRow['status'], string> = {
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  amended: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  none: 'bg-muted/40 text-muted-foreground hover:bg-muted/40'
};

const STATUS_LABELS: Record<RosterStaffRow['status'], string> = {
  published: 'Published',
  draft: 'Draft',
  amended: 'Amended',
  none: '—'
};

const CELL_STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-muted text-muted-foreground',
  amended: 'bg-sky-100 text-sky-700'
};

function dayLabel(dayIso: string): string {
  return format(parseISO(dayIso), 'EEE dd MMM yyyy');
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

export default function SheetRosterStaffView({
  open,
  record,
  dayIsos = [],
  onOpenChange
}: SheetRosterStaffViewProps) {
  const rangeDays = useMemo(() => {
    if (!record) return [] as string[];
    return dayIsos.length > 0 ? dayIsos : Object.keys(record.shifts).sort();
  }, [dayIsos, record]);

  const duties = useMemo(() => {
    if (!record) return [] as DutyListItem[];
    return rangeDays.flatMap((dateIso) =>
      (record.shifts[dateIso] ?? []).map((shift) => ({ dateIso, shift }))
    );
  }, [rangeDays, record]);

  const rangeLabel =
    rangeDays.length === 0
      ? ''
      : rangeDays.length === 1
        ? dayLabel(rangeDays[0])
        : `${dayLabel(rangeDays[0])} – ${dayLabel(rangeDays[rangeDays.length - 1])}`;

  const approvedLeaveDays = useMemo(() => {
    if (!record?.approvedLeaveByDay) return [] as string[];
    return rangeDays.filter((d) => record.approvedLeaveByDay?.[d]);
  }, [rangeDays, record]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            View Roster
          </SheetTitle>
          <SheetDescription>
            {record
              ? `Staff record and duties for ${record.staffName} (${record.staffCode}).`
              : 'Staff record and duties for the loaded range.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {record ? (
            <>
              <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {record.staffName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.staffCode}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      STATUS_STYLES[record.status]
                    )}
                  >
                    {STATUS_LABELS[record.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetaRow label="Department" value={record.department} />
                  <MetaRow label="Unit" value={record.unit} />
                  <MetaRow label="Designation" value={record.designation} />
                  <MetaRow label="Range" value={rangeLabel} />
                  <MetaRow
                    label="Total hours"
                    value={String(record.totalHours)}
                  />
                  <MetaRow label="OT hours" value={String(record.otHours)} />
                </div>

                {approvedLeaveDays.length > 0 ? (
                  <p className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
                    Approved leave on{' '}
                    {approvedLeaveDays
                      .map((d) => format(parseISO(d), 'dd MMM'))
                      .join(', ')}
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Duties
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {duties.length} in range
                  </span>
                </div>

                {duties.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                    No duties in this range.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {duties.map(({ dateIso, shift }) => {
                      const leaveHint =
                        shift.isLeave || shift.hasApprovedLeave;
                      return (
                        <li
                          key={shift.allocationId}
                          className={cn(
                            'rounded-md border px-3 py-2.5',
                            leaveHint
                              ? 'border-dashed border-amber-300 bg-amber-50/80'
                              : 'border-border bg-background'
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {dayLabel(dateIso)}
                              </p>
                              <p className="text-sm text-foreground">
                                {shift.label}
                                <span className="text-muted-foreground">
                                  {' '}
                                  · {shift.timeRange}
                                </span>
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                                CELL_STATUS_STYLES[String(shift.status)] ??
                                  'bg-muted text-muted-foreground'
                              )}
                            >
                              {String(shift.status)}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>
                              {shift.hours}h
                              {shift.otHours > 0
                                ? ` · OT ${shift.otHours}h`
                                : ''}
                            </span>
                            {shift.isLeave ? (
                              <span className="font-medium text-amber-900">
                                Leave on
                              </span>
                            ) : null}
                            {!shift.isLeave && shift.hasApprovedLeave ? (
                              <span className="font-medium text-amber-900">
                                Approved leave
                              </span>
                            ) : null}
                            {shift.comments?.trim() ? (
                              <span className="line-clamp-2">
                                {shift.comments.trim()}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No staff selected.</p>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end border-t border-border bg-background px-6 py-4 sm:space-x-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={buttonStyles.cancel.normal}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
