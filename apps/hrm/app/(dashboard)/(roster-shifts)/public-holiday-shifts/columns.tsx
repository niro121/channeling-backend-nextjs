'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import HolidayRecordActions from './record-actions';
import {
  formatHolidayHours,
  formatHolidayMoney,
  formatPayRate,
  type PublicHolidayPayRate,
  type PublicHolidayShiftSample,
  type PublicHolidayShiftStatus
} from './sample-data';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const STATUS_STYLES: Record<PublicHolidayShiftStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  amended: 'bg-slate-100 text-slate-600 hover:bg-slate-100'
};

const STATUS_LABELS: Record<PublicHolidayShiftStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
  amended: 'Amended'
};

const HOLIDAY_TYPE_STYLES: Record<string, string> = {
  poya: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  mercantile: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  public: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
};

const PAY_RATE_STYLES: Record<PublicHolidayPayRate, string> = {
  '1.50': 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  '2.00': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  '2.50': 'bg-violet-100 text-violet-800 hover:bg-violet-100'
};

export const holidayShiftColumns: ColumnDef<PublicHolidayShiftSample>[] = [
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
    accessorKey: 'holidayName',
    header: 'Holiday',
    cell: ({ row }) => <span>{row.original.holidayName}</span>
  },
  {
    accessorKey: 'holidayType',
    header: () => <span className="whitespace-nowrap">Holiday Type</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          HOLIDAY_TYPE_STYLES[row.original.holidayTypeId] ??
            'bg-muted text-muted-foreground hover:bg-muted'
        )}
      >
        {row.original.holidayType}
      </Badge>
    )
  },
  {
    accessorKey: 'dutyDate',
    header: () => <span className="whitespace-nowrap">Duty Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.dutyDate)}
      </span>
    )
  },
  {
    accessorKey: 'shiftLabel',
    header: 'Shift',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.shiftLabel}</span>
    )
  },
  {
    accessorKey: 'workedHours',
    header: () => <span className="whitespace-nowrap">Worked Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatHolidayHours(row.original.workedHours)}
      </span>
    )
  },
  {
    accessorKey: 'payRate',
    header: () => <span className="whitespace-nowrap">Pay Rate</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          PAY_RATE_STYLES[row.original.payRate]
        )}
      >
        {formatPayRate(row.original.payRate)}
      </Badge>
    )
  },
  {
    accessorKey: 'holidayAllowance',
    header: () => <span className="whitespace-nowrap">Holiday Allowance</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatHolidayMoney(row.original.holidayAllowance)}
      </span>
    )
  },
  {
    accessorKey: 'dutyLocation',
    header: () => <span className="whitespace-nowrap">Duty Location</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.dutyLocation}</span>
    )
  },
  {
    accessorKey: 'lieuLeave',
    header: () => <span className="whitespace-nowrap">Lieu Leave</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          row.original.lieuLeave
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
            : 'bg-muted text-muted-foreground hover:bg-muted'
        )}
      >
        {row.original.lieuLeave ? 'Yes' : 'No'}
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
    cell: ({ row }) => <HolidayRecordActions record={row.original} />,
    enableHiding: false
  }
];
