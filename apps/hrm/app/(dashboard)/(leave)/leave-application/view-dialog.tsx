'use client';

import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@archmage/ui';
import { format } from 'date-fns';
import type { LeaveApplicationRecord } from './columns';

type LeaveApplicationViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: LeaveApplicationRecord | null;
};

function formatDateTime(date?: Date | string | null) {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, 'dd/MM/yyyy hh:mm a');
}

function DetailItem({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function LeaveApplicationViewDialog({
  open,
  onOpenChange,
  record
}: LeaveApplicationViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leave application details</DialogTitle>
        </DialogHeader>

        {record ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem label="Staff code">{record.staffCode || '—'}</DetailItem>
            <DetailItem label="Staff">{record.staffName}</DetailItem>
            <DetailItem label="Leave type">{record.leaveType}</DetailItem>
            <DetailItem label="Days">
              <span className="tabular-nums">{record.days}</span>
            </DetailItem>
            <DetailItem label="From">{record.fromDate}</DetailItem>
            <DetailItem label="To">{record.toDate}</DetailItem>
            <DetailItem label="Approver">{record.approverName}</DetailItem>
            <DetailItem label="Status">
              <Badge variant="secondary" className="capitalize">
                {record.status}
              </Badge>
            </DetailItem>
            <DetailItem label="Out with cancel">
              {record.status !== 'cancelled' ? 'Yes' : 'No'}
            </DetailItem>
            <DetailItem label="Shift date">{record.shiftDate}</DetailItem>
            <DetailItem label="Approved">
              {record.approvedAt ?? '—'}
            </DetailItem>
            <DetailItem label="Created by">
              {record.createdUser?.name || '—'}
            </DetailItem>
            <DetailItem label="Created at">
              {formatDateTime(record.createdAt)}
            </DetailItem>
            <DetailItem label="Updated by">
              {record.updatedUser?.name || '—'}
            </DetailItem>
            <DetailItem label="Updated at">
              {formatDateTime(record.updatedAt)}
            </DetailItem>
          </dl>
        ) : (
          <p className="py-6 text-sm text-muted-foreground">
            No application selected.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
