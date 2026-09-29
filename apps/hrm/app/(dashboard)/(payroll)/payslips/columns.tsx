'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import {
  PAYSLIP_PAYMENT_STATUS_LABELS,
  type PayslipPaymentStatus,
  type PayslipRecord
} from '@/types/payroll';
import RecordActions from './record-actions';

const statusStyles: Record<
  PayslipPaymentStatus,
  { className: string }
> = {
  paid: {
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
  },
  processed: {
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100'
  },
  pending: {
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  },
  on_hold: {
    className: 'bg-zinc-200 text-zinc-800 hover:bg-zinc-200'
  }
};

export const payslipColumns: ColumnDef<PayslipRecord>[] = [
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
    accessorKey: 'staffCode',
    header: 'Staff Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.staffCode || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.staffName || '—'}
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
    accessorKey: 'salaryPeriod',
    header: 'Salary Period',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.salaryPeriod || '—'}
      </span>
    )
  },
  {
    accessorKey: 'basicSalary',
    header: 'Basic Salary',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatAmount(row.original.basicSalary)}
      </span>
    )
  },
  {
    accessorKey: 'totalAllowances',
    header: 'Total Allowances',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatAmount(row.original.totalAllowances)}
      </span>
    )
  },
  {
    accessorKey: 'grossSalary',
    header: 'Gross Salary',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatAmount(row.original.grossSalary)}
      </span>
    )
  },
  {
    accessorKey: 'totalDeductions',
    header: 'Total Deductions',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatAmount(row.original.totalDeductions)}
      </span>
    )
  },
  {
    accessorKey: 'netSalary',
    header: 'Net Salary',
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {formatAmount(row.original.netSalary)}
      </span>
    )
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment Status',
    cell: ({ row }) => {
      const status = row.original.paymentStatus;
      return (
        <Badge variant="secondary" className={statusStyles[status].className}>
          {PAYSLIP_PAYMENT_STATUS_LABELS[status]}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'generatedAt',
    header: 'Generated Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.generatedAt
          ? formatDateTime(row.original.generatedAt, 'dd MMM yyyy')
          : '—'}
      </span>
    )
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <RecordActions record={row.original} />,
    enableHiding: false
  }
];

export const PAYSLIP_EXPORT_COLUMNS = [
  'Staff Code',
  'Staff Name',
  'Department',
  'Salary Period',
  'Basic Salary',
  'Total Allowances',
  'Gross Salary',
  'Total Deductions',
  'Net Salary',
  'Payment Status',
  'Generated Date'
];

export const PAYSLIP_EXPORT_KEYS = [
  'staffCode',
  'staffName',
  'department',
  'salaryPeriod',
  'basicSalary',
  'totalAllowances',
  'grossSalary',
  'totalDeductions',
  'netSalary',
  'paymentStatus',
  'generatedAt'
];
