'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import type { ExtraShiftNormalRecord } from './sample-data';

type ExtraShiftNormalViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ExtraShiftNormalRecord | null;
};

function DetailItem({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || '—'}</dd>
    </div>
  );
}

export function ExtraShiftNormalViewDialog({
  open,
  onOpenChange,
  record
}: ExtraShiftNormalViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extra shift form details</DialogTitle>
        </DialogHeader>

        {record ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem label="Form no">{record.formNumber}</DetailItem>
            <DetailItem label="Staff code">{record.staffCode}</DetailItem>
            <DetailItem label="Staff">{record.staffName}</DetailItem>
            <DetailItem label="Roster">{record.roster}</DetailItem>
            <DetailItem label="Shift start">{record.shiftStart}</DetailItem>
            <DetailItem label="Shift end">{record.shiftEnd}</DetailItem>
            <DetailItem label="From">
              {formatDateTime(record.fromAt, 'd MMM yyyy HH:mm')}
            </DetailItem>
            <DetailItem label="To">
              {formatDateTime(record.toAt, 'd MMM yyyy HH:mm')}
            </DetailItem>
            <DetailItem label="Approved by">
              {record.approverName || '—'}
            </DetailItem>
            <DetailItem label="Approved date">
              {record.approvedAt
                ? formatDateTime(record.approvedAt, 'd MMM yyyy')
                : '—'}
            </DetailItem>
            <DetailItem label="Comment">{record.comment}</DetailItem>
            <DetailItem label="Created by">{record.createdByName}</DetailItem>
            <DetailItem label="Created at">
              {formatDateTime(record.createdAt)}
            </DetailItem>
            <DetailItem label="Updated by">{record.updatedByName}</DetailItem>
            <DetailItem label="Updated at">
              {formatDateTime(record.updatedAt)}
            </DetailItem>
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
