'use client';

import { useEffect, useState } from 'react';
import { CustomDialog } from '@archmage/ui';
import { format } from 'date-fns';
import { getManageRosterInspectDataAction } from '@/app/actions/hr-admin-actions/manage-roster.actions';
import type {
  ManageRosterInspectActiveShift,
  ManageRosterInspectAssignment,
  ManageRosterInspectData,
  ManageRosterInspectStaffMember
} from '@/types/manage-roster';

export type RosterInspectDialogMode = 'staff' | 'active-shifts' | null;

type DialogRosterInspectProps = {
  open: boolean;
  mode: RosterInspectDialogMode;
  rosterId: string | null;
  rosterLabel: string;
  onOpenChange: (open: boolean) => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'd MMM yyyy');
}

function AssignmentsTable({
  assignments,
  emptyLabel
}: {
  assignments: ManageRosterInspectAssignment[];
  emptyLabel: string;
}) {
  if (!assignments.length) {
    return (
      <p className="px-2 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 font-medium">Code</th>
            <th className="px-2 py-1.5 font-medium">Shift type</th>
            <th className="px-2 py-1.5 font-medium">Rotation</th>
            <th className="px-2 py-1.5 font-medium">From</th>
            <th className="px-2 py-1.5 font-medium">To</th>
            <th className="px-2 py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-2 py-1.5 font-medium text-foreground">
                {row.code}
              </td>
              <td className="px-2 py-1.5 text-foreground">
                {row.shiftTypeCode
                  ? `${row.shiftTypeCode} — ${row.shiftTypeName}`
                  : row.shiftTypeName || '—'}
              </td>
              <td className="px-2 py-1.5 capitalize text-muted-foreground">
                {row.rotationPattern.replace(/-/g, ' ')}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {formatDate(row.effectiveFrom)}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">
                {formatDate(row.effectiveTo)}
              </td>
              <td className="px-2 py-1.5 capitalize text-muted-foreground">
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffInspectBody({
  staff
}: {
  staff: ManageRosterInspectStaffMember[];
}) {
  if (!staff.length) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No staff members are assigned to this roster group yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {staff.map((member) => (
        <div
          key={member.id}
          className="rounded-lg border border-border bg-card px-3 py-3"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {member.code ? `${member.code} — ${member.name}` : member.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {member.assignments.length} assignment
              {member.assignments.length === 1 ? '' : 's'}
            </p>
          </div>
          <AssignmentsTable
            assignments={member.assignments}
            emptyLabel="No shift assignments on this roster for this staff member."
          />
        </div>
      ))}
    </div>
  );
}

function ActiveShiftsInspectBody({
  activeShifts
}: {
  activeShifts: ManageRosterInspectActiveShift[];
}) {
  if (!activeShifts.length) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No active shift assignments on this roster yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activeShifts.map((shift) => (
        <div
          key={shift.shiftTypeId}
          className="rounded-lg border border-border bg-card px-3 py-3"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {shift.shiftTypeCode
                ? `${shift.shiftTypeCode} — ${shift.shiftTypeName}`
                : shift.shiftTypeName || 'Shift type'}
            </p>
            <p className="text-xs text-muted-foreground">
              {shift.activeAssignmentCount} active · {shift.staffCount} staff
            </p>
          </div>
          <AssignmentsTable
            assignments={shift.assignments}
            emptyLabel="No active assignments for this shift type."
          />
        </div>
      ))}
    </div>
  );
}

export default function DialogRosterInspect({
  open,
  mode,
  rosterId,
  rosterLabel,
  onOpenChange
}: DialogRosterInspectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ManageRosterInspectData | null>(null);

  useEffect(() => {
    if (!open || !rosterId || !mode) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void getManageRosterInspectDataAction(rosterId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.isError || !result.data) {
        setData(null);
        setError(
          (result.errors as { message?: string })?.message ??
            'Unable to load roster details.'
        );
        return;
      }
      setData(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, open, rosterId]);

  const title =
    mode === 'staff'
      ? `Assigned staff · ${rosterLabel}`
      : mode === 'active-shifts'
        ? `Active shifts · ${rosterLabel}`
        : 'Roster details';

  return (
    <CustomDialog
      open={open}
      setOpen={onOpenChange}
      title={title}
    >
      <div className="space-y-3 py-2">
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {!loading && error ? (
          <p className="py-6 text-sm text-destructive">{error}</p>
        ) : null}
        {!loading && !error && data && mode === 'staff' ? (
          <StaffInspectBody staff={data.staff} />
        ) : null}
        {!loading && !error && data && mode === 'active-shifts' ? (
          <ActiveShiftsInspectBody activeShifts={data.activeShifts} />
        ) : null}
      </div>
    </CustomDialog>
  );
}
