'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import {
  DEDUCTION_CALC_METHOD_LABELS,
  DEDUCTION_TYPE_LABELS,
  type DeductionRecord,
  type DeductionStatus,
  type DeductionType
} from '@/types/payroll';
import RecordActions from './record-actions';

const statusStyles: Record<
  DeductionStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  },
  draft: {
    label: 'Draft',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  }
};

const typeStyles: Record<DeductionType, string> = {
  epf: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  etf: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  tax: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  loan: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  advance: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  no_pay: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  other: 'bg-lime-100 text-lime-800 hover:bg-lime-100'
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export const deductionColumns: ColumnDef<DeductionRecord>[] = [
  {
    id: 'rowNumber',
    header: 'No',
    cell: ({ row, table }) => {
      const pageIndex = table.getState().pagination?.pageIndex ?? 0;
      const pageSize = table.getState().pagination?.pageSize ?? 10;
      return (
        <span className="tabular-nums text-muted-foreground">
          {pageIndex * pageSize + row.index + 1}
        </span>
      );
    },
    enableHiding: false
  },
  {
    accessorKey: 'code',
    header: 'Deduction Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.code || '—'}
      </span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Deduction Name',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.name || '—'}
      </span>
    )
  },
  {
    accessorKey: 'deductionType',
    header: 'Type',
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={typeStyles[row.original.deductionType]}
      >
        {DEDUCTION_TYPE_LABELS[row.original.deductionType]}
      </Badge>
    )
  },
  {
    accessorKey: 'calcMethod',
    header: 'Calculation Method',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {DEDUCTION_CALC_METHOD_LABELS[row.original.calcMethod]}
      </span>
    )
  },
  {
    accessorKey: 'amountOrPercent',
    header: 'Amount / %',
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">
        {row.original.amountOrPercent || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffCategory',
    header: 'Staff Category',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.staffCategory || '—'}
      </span>
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
      const style = statusStyles[row.original.status];
      return (
        <Badge variant="secondary" className={style.className}>
          {style.label}
        </Badge>
      );
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

export const DEDUCTION_EXPORT_COLUMNS = [
  'Deduction Code',
  'Deduction Name',
  'Type',
  'Calculation Method',
  'Amount / %',
  'Staff Category',
  'Department',
  'Designation',
  'Effective From',
  'Effective To',
  'Status',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const DEDUCTION_EXPORT_KEYS = [
  'code',
  'name',
  'deductionType',
  'calcMethod',
  'amountOrPercent',
  'staffCategory',
  'department',
  'designation',
  'effectiveFrom',
  'effectiveTo',
  'status',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
