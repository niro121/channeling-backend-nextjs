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

export const assignPaysheetColumns: ColumnDef<PaysheetAssignmentRecord>[] = [
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
    accessorKey: 'roster',
    header: 'Roster',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.roster || '—'}</span>
    )
  },
  {
    accessorKey: 'staffCode',
    header: 'Emp Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.staffCode || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Employee',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.staffName || '—'}
      </span>
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
    accessorKey: 'effectiveFrom',
    header: 'From',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.effectiveFrom)}
      </span>
    )
  },
  {
    accessorKey: 'effectiveTo',
    header: 'To',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.effectiveTo)}
      </span>
    )
  },
  {
    accessorKey: 'grade',
    header: 'Grade',
    cell: ({ row }) => row.original.grade || '—'
  },
  {
    accessorKey: 'staffCategory',
    header: 'Category',
    cell: ({ row }) => row.original.staffCategory || '—'
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.designation || '—'}
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
    accessorKey: 'value',
    header: 'Value',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLkr(row.original.value)}</span>
    )
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

export const ASSIGN_PAYSHEET_EXPORT_COLUMNS = [
  'Institution',
  'Department',
  'Roster',
  'Emp Code',
  'Employee',
  'Component',
  'From',
  'To',
  'Grade',
  'Category',
  'Designation',
  'Status',
  'Value',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const ASSIGN_PAYSHEET_EXPORT_KEYS = [
  'institution',
  'department',
  'roster',
  'staffCode',
  'staffName',
  'componentName',
  'effectiveFrom',
  'effectiveTo',
  'grade',
  'staffCategory',
  'designation',
  'status',
  'value',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
