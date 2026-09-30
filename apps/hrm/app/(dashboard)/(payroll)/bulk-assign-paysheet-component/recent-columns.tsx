'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type {
  PaysheetAssignmentRecord,
  PaysheetAssignmentStatus
} from '@/types/payroll';
import RecordActions from './record-actions';

const statusStyles: Record<
  PaysheetAssignmentStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  expiring: {
    label: 'Expiring',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  },
  ended: {
    label: 'Ended',
    className: 'bg-muted text-muted-foreground hover:bg-muted'
  }
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export const recentAssignmentColumns: ColumnDef<PaysheetAssignmentRecord>[] = [
  {
    accessorKey: 'institution',
    header: 'Institution',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.institution || '—'}</span>
    )
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.department || '—'}</span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Employee',
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium whitespace-nowrap">
          {row.original.staffName || '—'}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.original.staffCode || '—'}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'componentName',
    header: 'Component',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.componentName || '—'}
      </span>
    )
  },
  {
    accessorKey: 'value',
    header: 'Value',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLkr(row.original.value)}</span>
    )
  },
  {
    accessorKey: 'effectiveFrom',
    header: 'Effective From',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.effectiveFrom)}
      </span>
    )
  },
  {
    accessorKey: 'effectiveTo',
    header: 'Effective To',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.effectiveTo)}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const style = statusStyles[row.original.status] ?? statusStyles.ended;
      return <Badge className={style.className}>{style.label}</Badge>;
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.createdBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.createdAt
            ? formatDateTime(row.original.createdAt)
            : '—'}
        </span>
      </div>
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {row.original.updatedAt
            ? formatDateTime(row.original.updatedAt)
            : '—'}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <RecordActions record={row.original} />,
    enableHiding: false
  }
];

export const RECENT_ASSIGNMENT_EXPORT_COLUMNS = [
  'Institution',
  'Department',
  'Employee',
  'Emp Code',
  'Component',
  'Value',
  'Effective From',
  'Effective To',
  'Status',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
] as const;

export const RECENT_ASSIGNMENT_EXPORT_KEYS = [
  'institution',
  'department',
  'staffName',
  'staffCode',
  'componentName',
  'value',
  'effectiveFrom',
  'effectiveTo',
  'status',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
] as const;
