'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import NightShiftRecordActions from './record-actions';
import {
  exceedsConsecutiveNightPolicy,
  formatNightHours,
  formatNightMoney,
  type NightShiftSample,
  type NightShiftStatus
} from './sample-data';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const STATUS_STYLES: Record<NightShiftStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted'
};

const STATUS_LABELS: Record<NightShiftStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft'
};

export const nightShiftColumns: ColumnDef<NightShiftSample>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
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
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          STATUS_STYLES[row.original.status]
        )}
      >
        {STATUS_LABELS[row.original.status]}
      </Badge>
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
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
        <span className="text-xs">{row.original.createdBy || '—'}</span>
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
