'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import {
  PROBATION_REVIEW_STATUS_LABELS,
  type ProbationReviewRecord,
  type ProbationReviewStatus
} from '@/types/performance';
import ProbationReviewRecordActions from './record-actions';

const statusClassName: Record<ProbationReviewStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending_review: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  approved: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  completed: 'border-0 bg-green-100 text-green-800 hover:bg-green-100',
  pending_approval:
    'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  overdue: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
};

export const PROBATION_REVIEW_EXPORT_COLUMNS = [
  'Staff Code',
  'Staff Name',
  'Department',
  'Designation',
  'Reporting Manager',
  'Joining Date',
  'Probation Start Date',
  'Probation End Date',
  'Review Due Date',
  'Review Status'
] as const;

export const PROBATION_REVIEW_EXPORT_KEYS = [
  'staffCode',
  'staffName',
  'department',
  'designation',
  'reportingManager',
  'joiningDate',
  'probationStartDate',
  'probationEndDate',
  'reviewDueDate',
  'reviewStatus'
] as const;

const dateCell = (value: string) => (
  <span className="whitespace-nowrap tabular-nums">{value || '—'}</span>
);

export const probationReviewColumns: ColumnDef<ProbationReviewRecord>[] = [
  {
    accessorKey: 'staffCode',
    header: () => <div className="whitespace-nowrap">Staff Code</div>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium">
        {row.original.staffCode}
      </span>
    )
  },
  {
    accessorKey: 'staffName',
    header: () => <div className="whitespace-nowrap">Staff Name</div>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium">
        {row.original.staffName}
      </span>
    )
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.department}</span>
    )
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.designation}</span>
    )
  },
  {
    accessorKey: 'reportingManager',
    header: () => <div className="whitespace-nowrap">Reporting Manager</div>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.reportingManager}</span>
    )
  },
  {
    accessorKey: 'joiningDate',
    header: () => <div className="whitespace-nowrap">Joining Date</div>,
    cell: ({ row }) => dateCell(row.original.joiningDate)
  },
  {
    accessorKey: 'probationStartDate',
    header: () => <div className="whitespace-nowrap">Probation Start Date</div>,
    cell: ({ row }) => dateCell(row.original.probationStartDate)
  },
  {
    accessorKey: 'probationEndDate',
    header: () => <div className="whitespace-nowrap">Probation End Date</div>,
    cell: ({ row }) => dateCell(row.original.probationEndDate)
  },
  {
    accessorKey: 'reviewDueDate',
    header: () => <div className="whitespace-nowrap">Review Due Date</div>,
    cell: ({ row }) => dateCell(row.original.reviewDueDate)
  },
  {
    accessorKey: 'reviewStatus',
    header: () => <div className="whitespace-nowrap">Review Status</div>,
    cell: ({ row }) => {
      const status = row.original.reviewStatus;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {PROBATION_REVIEW_STATUS_LABELS[status]}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <ProbationReviewRecordActions record={row.original} />,
    enableHiding: false
  }
];
