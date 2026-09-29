'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type { LoanAdvanceRecord, LoanAdvanceStatus } from '@/types/payroll';
import RecordActions from './record-actions';

const statusStyles: Record<
  LoanAdvanceStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  ongoing: {
    label: 'Ongoing',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  },
  completed: {
    label: 'Completed',
    className: 'bg-teal-100 text-teal-800 hover:bg-teal-100'
  }
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export const loanAdvanceColumns: ColumnDef<LoanAdvanceRecord>[] = [
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
    id: 'employee',
    header: 'Employee',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.staffName || '—'}
      </span>
    )
  },
  {
    accessorKey: 'bankName',
    header: 'Bank',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.bankName || '—'}</span>
    )
  },
  {
    accessorKey: 'branch',
    header: 'Branch',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.branch || '—'}</span>
    )
  },
  {
    accessorKey: 'accountNumber',
    header: 'Acc. No',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.accountNumber || '—'}</span>
    )
  },
  {
    accessorKey: 'startingBalance',
    header: 'Starting Balance',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLkr(row.original.startingBalance)}
      </span>
    )
  },
  {
    accessorKey: 'loanAmount',
    header: 'Loan Amount',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLkr(row.original.loanAmount)}</span>
    )
  },
  {
    accessorKey: 'monthlyInstallment',
    header: 'Monthly Installment',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLkr(row.original.monthlyInstallment)}
      </span>
    )
  },
  {
    accessorKey: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatLkr(row.original.outstanding)}</span>
    )
  },
  {
    accessorKey: 'fromDate',
    header: 'From',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.fromDate)}
      </span>
    )
  },
  {
    accessorKey: 'toDate',
    header: 'To',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.toDate)}
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
    accessorKey: 'resignDate',
    header: 'Resign Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.resignDate)}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const style = statusStyles[row.original.status] ?? statusStyles.active;
      return <Badge className={style.className}>{style.label}</Badge>;
    }
  },
  {
    accessorKey: 'componentName',
    header: 'Loan Name',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.componentName || '—'}
      </span>
    )
  },
  {
    accessorKey: 'loanNumber',
    header: 'Loan No',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.loanNumber || '—'}</span>
    )
  },
  {
    accessorKey: 'completionDate',
    header: 'Completed At',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateOnly(row.original.completionDate)}
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

export const LOAN_ADVANCE_EXPORT_COLUMNS = [
  'Institution',
  'Department',
  'Roster',
  'Emp Code',
  'Employee',
  'Bank',
  'Branch',
  'Acc. No',
  'Starting Balance',
  'Loan Amount',
  'Monthly Installment',
  'Outstanding',
  'From',
  'To',
  'Grade',
  'Category',
  'Designation',
  'Resign Date',
  'Status',
  'Loan Name',
  'Loan No',
  'Completed At',
  'Created By',
  'Created At',
  'Updated By',
  'Updated At'
];

export const LOAN_ADVANCE_EXPORT_KEYS = [
  'institution',
  'department',
  'roster',
  'staffCode',
  'staffName',
  'bankName',
  'branch',
  'accountNumber',
  'startingBalance',
  'loanAmount',
  'monthlyInstallment',
  'outstanding',
  'fromDate',
  'toDate',
  'grade',
  'staffCategory',
  'designation',
  'resignDate',
  'status',
  'componentName',
  'loanNumber',
  'completionDate',
  'createdBy',
  'createdAt',
  'updatedBy',
  'updatedAt'
];
