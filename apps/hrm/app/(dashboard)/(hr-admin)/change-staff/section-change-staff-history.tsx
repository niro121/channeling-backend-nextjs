'use client';

import { useMemo, type ComponentType } from 'react';
import {
  Briefcase,
  CircleDollarSign,
  Layers,
  Tag,
  UserRound,
  UserCog
} from 'lucide-react';
import {
  CHANGE_STAFF_FIELDS,
  CHANGE_STAFF_FIELD_LABELS,
  type ChangeStaffFieldId,
  type ChangeStaffHistoryRow
} from '@/types/change-staff';
import { useChangeStaffUi } from './change-staff-ui-context';

const FIELD_ICONS: Record<
  ChangeStaffFieldId,
  ComponentType<{ className?: string }>
> = {
  department: Briefcase,
  employeeStatus: UserRound,
  category: Layers,
  grade: Tag,
  designation: UserCog,
  basic: CircleDollarSign
};

const VALUE_HEADERS: Record<ChangeStaffFieldId, string> = {
  department: 'DEPT',
  employeeStatus: 'STATUS',
  category: 'CATEGORY',
  grade: 'GRADE',
  designation: 'DESIGNATION',
  basic: 'BASIC'
};

function HistoryCard({
  field,
  rows
}: {
  field: ChangeStaffFieldId;
  rows: ChangeStaffHistoryRow[];
}) {
  const Icon = FIELD_ICONS[field];
  const filtered = rows.filter((r) => r.field === field);

  return (
    <div className="flex min-h-[11rem] flex-col overflow-hidden rounded-lg border border-primary/15 bg-card">
      <div className="flex items-center justify-between border-b border-primary/10 px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">
          {CHANGE_STAFF_FIELD_LABELS[field]}
        </h3>
        <Icon className="h-4 w-4 text-primary" aria-hidden />
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-primary/10 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 font-medium">From</th>
              <th className="px-2 py-1.5 font-medium">To</th>
              <th className="px-2 py-1.5 font-medium">{VALUE_HEADERS[field]}</th>
              <th className="px-2 py-1.5 font-medium">Change User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-6 text-center text-muted-foreground"
                >
                  No history yet.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/60 text-foreground"
                >
                  <td className="px-2 py-1.5 whitespace-nowrap">{row.from}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {row.to || '—'}
                  </td>
                  <td className="px-2 py-1.5">{row.value}</td>
                  <td className="px-2 py-1.5">{row.changeUser}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SectionChangeStaffHistory() {
  const { history, selectedStaffId } = useChangeStaffUi();

  const rows = useMemo(() => {
    if (!selectedStaffId) return [];
    return history.filter((row) => row.staffId === selectedStaffId);
  }, [history, selectedStaffId]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CHANGE_STAFF_FIELDS.map((field) => (
          <HistoryCard key={field} field={field} rows={rows} />
        ))}
      </div>

      <div className="rounded-md border border-primary/15 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Every change is stored with the effective date range so payroll and
        reports can reconstruct historic states.
      </div>
    </div>
  );
}
