'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type {
  SalaryStructureRecord,
  SalaryStructureStatus
} from '@/types/payroll';
import RecordActions from './record-actions';

const statusStyles: Record<
  SalaryStructureStatus,
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

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export const salaryStructureColumns: ColumnDef<SalaryStructureRecord>[] = [
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
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.code || '—'}
      </span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.name || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffCategory',
    header: 'Category',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.staffCategory || '—'}
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
    accessorKey: 'basicSalary',
    header: 'Basic',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLkr(row.original.basicSalary)}
      </span>
    )
  },
  {
    accessorKey: 'allowancesTotal',
    header: 'Allowances',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLkr(row.original.allowancesTotal)}
      </span>
    )
  },
  {
    accessorKey: 'deductionsTotal',
    header: 'Deductions',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLkr(row.original.deductionsTotal)}
      </span>
    )
  },
  {
    accessorKey: 'gross',
    header: 'Gross',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatLkr(row.original.gross)}
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

export const SALARY_STRUCTURE_EXPORT_COLUMNS = [
  'Code',
  'Name',
  'Institution',
  'Department',
  'Category',
  'Designation',
  'Basic',
  'Allowances',
  'Deductions',
  'Gross',
  'Staff Covered',
  'Effective From',
  'Effective To',
  'Status',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const SALARY_STRUCTURE_EXPORT_KEYS = [
  'code',
  'name',
  'institution',
  'department',
  'staffCategory',
  'designation',
  'basicSalary',
  'allowancesTotal',
  'deductionsTotal',
  'gross',
  'staffCovered',
  'effectiveFrom',
  'effectiveTo',
  'status',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
