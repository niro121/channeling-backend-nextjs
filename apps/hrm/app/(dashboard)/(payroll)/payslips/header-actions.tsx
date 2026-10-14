'use client';

import { useState } from 'react';
import { Download, Mail, MessageSquare } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  sendPayslipEmailBulkAction,
  sendPayslipSmsBulkAction,
  getPayslipExportAction
} from '@/app/actions/payroll-actions/payslip.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PayslipFilters } from '@/types/payroll';

type PayslipsHeaderActionsProps = {
  filters?: PayslipFilters;
};

export function PayslipsHeaderActions({
  filters = {}
}: PayslipsHeaderActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canView = has('payroll', 'view');
  const canNotify = has('payroll', 'edit');
  const [busy, setBusy] = useState(false);

  if (!canView) return null;

  const handleDownloadAll = async () => {
    setBusy(true);
    try {
      const result = await getPayslipExportAction(filters);
      if (!result.success || !result.data?.length) {
        toast({
          variant: 'destructive',
          title: 'Download failed',
          description: result.message ?? 'No payslips to download.'
        });
        return;
      }
      const headers = Object.keys(result.data[0]);
      const csv = [
        headers.join(','),
        ...result.data.map((row) =>
          headers
            .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payslips.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        variant: 'success',
        title: 'Download ready',
        description: `${result.data.length} payslip row(s) exported`
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAll = async () => {
    if (!canNotify) return;
    setBusy(true);
    try {
      const result = await sendPayslipEmailBulkAction(filters);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Email All failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to send emails.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Email All complete',
        description: `Sent ${result.data.sent} · skipped ${result.data.skipped} · failed ${result.data.failed}`
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSmsAll = async () => {
    if (!canNotify) return;
    setBusy(true);
    try {
      const result = await sendPayslipSmsBulkAction(filters);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'SMS All failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to send SMS.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'SMS All complete',
        description: `Sent ${result.data.sent} · skipped ${result.data.skipped} · failed ${result.data.failed}`
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={() => void handleDownloadAll()}
      >
        <Download className="h-4 w-4" />
        Download All
      </Button>
      {canNotify ? (
        <>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            disabled={busy}
            onClick={() => void handleEmailAll()}
          >
            <Mail className="h-4 w-4" />
            Email All
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            disabled={busy}
            onClick={() => void handleSmsAll()}
          >
            <MessageSquare className="h-4 w-4" />
            SMS All
          </Button>
        </>
      ) : null}
    </div>
  );
}
