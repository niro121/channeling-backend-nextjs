'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { formatNightHours, formatNightMoney } from '@/lib/utils/night-shift';
import { format, parseISO, isValid } from 'date-fns';
import {
  CONSECUTIVE_NIGHT_LIMIT,
  exceedsConsecutiveNightPolicy,
  NIGHT_SHIFT_STATUS_OPTIONS,
  type NightShiftRecord,
  type RosterAllocationStatus
} from '@/types/roster';
import NightShiftRecordActions from './record-actions';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value.slice(0, 10));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  amended: 'bg-orange-100 text-orange-700 hover:bg-orange-100'
};

const STATUS_LABELS = Object.fromEntries(
  NIGHT_SHIFT_STATUS_OPTIONS.map((option) => [option.id, option.name])
);

export const nightShiftColumns: ColumnDef<NightShiftRecord>[] = [
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff ID</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.staffCode}</span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
    cell: ({ row }) => <span>{row.original.staffName}</span>
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.department}</span>
    )
  },
  {
    accessorKey: 'unit',
    header: 'Unit',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.unit}</span>
    )
  },
  {
    accessorKey: 'shiftDate',
    header: () => <span className="whitespace-nowrap">Shift Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.shiftDate)}
      </span>
    )
  },
  {
    accessorKey: 'nightShift',
    header: () => <span className="whitespace-nowrap">Night Shift</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.nightShift}</span>
    )
  },
  {
    accessorKey: 'nightHours',
    header: () => <span className="whitespace-nowrap">Night Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNightHours(row.original.nightHours)}
      </span>
    )
  },
  {
    accessorKey: 'nightOt',
    header: () => <span className="whitespace-nowrap">Night OT</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNightHours(row.original.nightOt)}
      </span>
    )
  },
  {
    accessorKey: 'nightAllowance',
    header: () => <span className="whitespace-nowrap">Night Allowance</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNightMoney(row.original.nightAllowance)}
      </span>
    )
  },
  {
    accessorKey: 'mealAllowance',
    header: () => <span className="whitespace-nowrap">Meal Allowance</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNightMoney(row.original.mealAllowance)}
      </span>
    )
  },
  {
    accessorKey: 'consecutiveNights',
    header: () => <span className="whitespace-nowrap">Consecutive Nights</span>,
    cell: ({ row }) => {
      const nights = row.original.consecutiveNights;
      if (exceedsConsecutiveNightPolicy(nights)) {
        return (
          <Badge
            variant="secondary"
            className="rounded-full border-0 bg-red-100 font-medium text-red-700 hover:bg-red-100"
          >
            {nights} nights
          </Badge>
        );
      }
      return <span className="tabular-nums">{nights}</span>;
    }
  },
  {
    accessorKey: 'payrollReady',
    header: () => <span className="whitespace-nowrap">Payroll Ready</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          row.original.payrollReady
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
            : 'bg-muted text-muted-foreground hover:bg-muted'
        )}
      >
        {row.original.payrollReady ? 'Yes' : 'No'}
      </Badge>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status as RosterAllocationStatus;
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium',
            STATUS_STYLES[status] ?? STATUS_STYLES.draft
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">
          {row.original.updatedUser?.name || row.original.updatedBy || '—'}
        </span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.updatedAt)}
        </span>
      </div>
    )
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">
          {row.original.createdUser?.name || row.original.createdBy || '—'}
        </span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <NightShiftRecordActions record={row.original} />,
    enableHiding: false
  }
];

export { CONSECUTIVE_NIGHT_LIMIT };
