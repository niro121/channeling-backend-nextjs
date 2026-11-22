'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { Badge, Button } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import type { DepartmentReportRow } from '@/types/reports';
import { useDepartmentReportsUi } from './department-reports-ui-context';

function RecordActions({ record }: { record: DepartmentReportRow }) {
  const { openDetail } = useDepartmentReportsUi();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => openDetail(record)}
      aria-label={`View ${record.name}`}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}

export const departmentReportColumns: ColumnDef<DepartmentReportRow>[] = [
  {
    accessorKey: 'code',
    header: () => <span className="whitespace-nowrap">Department Code</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.code}</span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Department Name',
    cell: ({ row }) => <span>{row.original.name}</span>
  },
  {
    accessorKey: 'institution',
    header: 'Institution',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.institution}</span>
    )
  },
  {
    accessorKey: 'departmentHead',
    header: 'Department Head',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.departmentHead}
      </span>
    )
  },
  {
    accessorKey: 'totalStaff',
    header: () => <span className="whitespace-nowrap">Total Staff</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalStaff}</span>
    )
  },
  {
    accessorKey: 'activeStaff',
    header: () => <span className="whitespace-nowrap">Active Staff</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.activeStaff}</span>
    )
  },
  {
    accessorKey: 'inactiveStaff',
    header: () => <span className="whitespace-nowrap">Inactive Staff</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.inactiveStaff}</span>
    )
  },
  {
    accessorKey: 'vacancies',
    header: 'Vacancies',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.vacancies}</span>
    )
  },
  {
    accessorKey: 'presentStaff',
    header: () => <span className="whitespace-nowrap">Present Staff</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.presentStaff}</span>
    )
  },
  {
    accessorKey: 'absentStaff',
    header: () => <span className="whitespace-nowrap">Absent Staff</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.absentStaff}</span>
    )
  },
  {
    accessorKey: 'leaveCount',
    header: () => <span className="whitespace-nowrap">Leave Count</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.leaveCount}</span>
    )
  },
  {
    accessorKey: 'totalOtHours',
    header: () => <span className="whitespace-nowrap">Total OT Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalOtHours}</span>
    )
  },
  {
    accessorKey: 'payrollExpenditure',
    header: () => (
      <span className="whitespace-nowrap">Payroll Expenditure</span>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">
        {formatLkr(row.original.payrollExpenditure)}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Department Status',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.status === 'active'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }
      >
        {row.original.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    )
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <RecordActions record={row.original} />,
    enableHiding: false
  }
];
