'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import {
  PROMOTION_STATUS_LABELS,
  PROMOTION_TYPE_LABELS,
  type PromotionRecord,
  type PromotionStatus
} from '@/types/performance';
import PromotionRecordActions from './record-actions';

const statusClassName: Record<PromotionStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending_approval:
    'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  approved: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  rejected: 'border-0 bg-red-100 text-red-700 hover:bg-red-100',
  effective: 'border-0 bg-green-100 text-green-800 hover:bg-green-100'
};

export const PROMOTION_EXPORT_COLUMNS = [
  'Promotion Request ID',
  'Staff Code',
  'Staff Name',
  'Department',
  'Current Designation',
  'Proposed Designation',
  'Current Grade',
  'Proposed Grade',
  'Requested By',
  'Request Date',
  'Effective Date',
  'Promotion Type',
  'Approval Status'
] as const;

export const PROMOTION_EXPORT_KEYS = [
  'requestId',
  'staffCode',
  'staffName',
  'department',
  'currentDesignation',
  'proposedDesignation',
  'currentGrade',
  'proposedGrade',
  'requestedBy',
  'requestDate',
  'effectiveDate',
  'promotionType',
  'approvalStatus'
] as const;

const textCell = (value: string) => (
  <span className="whitespace-nowrap">{value || '—'}</span>
);

const dateCell = (value: string) => (
  <span className="whitespace-nowrap tabular-nums">{value || '—'}</span>
);

export const promotionColumns: ColumnDef<PromotionRecord>[] = [
  {
    accessorKey: 'requestId',
    header: () => <div className="whitespace-nowrap">Promotion Request ID</div>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium text-primary">
        {row.original.requestId}
      </span>
    )
  },
  {
    accessorKey: 'staffCode',
    header: () => <div className="whitespace-nowrap">Staff Code</div>,
    cell: ({ row }) => textCell(row.original.staffCode)
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
    cell: ({ row }) => textCell(row.original.department)
  },
  {
    accessorKey: 'currentDesignation',
    header: () => <div className="whitespace-nowrap">Current Designation</div>,
    cell: ({ row }) => textCell(row.original.currentDesignation)
  },
  {
    accessorKey: 'proposedDesignation',
    header: () => <div className="whitespace-nowrap">Proposed Designation</div>,
    cell: ({ row }) => textCell(row.original.proposedDesignation)
  },
  {
    accessorKey: 'currentGrade',
    header: () => <div className="whitespace-nowrap">Current Grade</div>,
    cell: ({ row }) => textCell(row.original.currentGrade)
  },
  {
    accessorKey: 'proposedGrade',
    header: () => <div className="whitespace-nowrap">Proposed Grade</div>,
    cell: ({ row }) => textCell(row.original.proposedGrade)
  },
  {
    accessorKey: 'requestedBy',
    header: () => <div className="whitespace-nowrap">Requested By</div>,
    cell: ({ row }) => textCell(row.original.requestedBy)
  },
  {
    accessorKey: 'requestDate',
    header: () => <div className="whitespace-nowrap">Request Date</div>,
    cell: ({ row }) => dateCell(row.original.requestDate)
  },
  {
    accessorKey: 'effectiveDate',
    header: () => <div className="whitespace-nowrap">Effective Date</div>,
    cell: ({ row }) => dateCell(row.original.effectiveDate)
  },
  {
    accessorKey: 'promotionType',
    header: () => <div className="whitespace-nowrap">Promotion Type</div>,
    cell: ({ row }) =>
      textCell(PROMOTION_TYPE_LABELS[row.original.promotionType])
  },
  {
    accessorKey: 'approvalStatus',
    header: () => <div className="whitespace-nowrap">Approval Status</div>,
    cell: ({ row }) => {
      const status = row.original.approvalStatus;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {PROMOTION_STATUS_LABELS[status]}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <PromotionRecordActions record={row.original} />,
    enableHiding: false
  }
];
