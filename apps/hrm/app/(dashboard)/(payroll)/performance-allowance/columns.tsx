'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type {
  PerformanceAllowanceMode,
  PerformanceAllowanceRecord
} from '@/types/payroll';
import RecordActions from './record-actions';

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export function buildPerformanceAllowanceColumns(
  mode: PerformanceAllowanceMode
): ColumnDef<PerformanceAllowanceRecord>[] {
  return [
    {
      id: 'employee',
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
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.department || '—'}
        </span>
      )
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
      accessorKey: 'value',
      header: mode === 'percentage' ? 'Percentage' : 'Value',
      cell: ({ row }) =>
        mode === 'percentage' ? (
          <span className="tabular-nums">
            {formatAmount(row.original.value, { maximumFractionDigits: 2 })}%
          </span>
        ) : (
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
}

export const PERFORMANCE_ALLOWANCE_EXPORT_COLUMNS = [
  'Emp Code',
  'Employee',
  'Department',
  'Designation',
  'Value',
  'Effective From',
  'Effective To',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
] as const;

export const PERFORMANCE_ALLOWANCE_EXPORT_KEYS = [
  'staffCode',
  'staffName',
  'department',
  'designation',
  'value',
  'effectiveFrom',
  'effectiveTo',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
] as const;
