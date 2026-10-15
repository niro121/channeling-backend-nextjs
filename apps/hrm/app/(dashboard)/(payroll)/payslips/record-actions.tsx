'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, Mail, MessageSquare, Printer } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  sendPayslipEmailAction,
  sendPayslipSmsAction
} from '@/app/actions/payroll-actions/payslip.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PayslipRecord } from '@/types/payroll';
import { downloadPayslipHtml, printPayslip } from './payslip-print';
import { usePayslipsUi } from './payslips-ui-context';

type RecordActionsProps = {
  record: PayslipRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openView } = usePayslipsUi();
  const canView = has('payroll', 'view');
  const canNotify = has('payroll', 'edit');
  const [busy, setBusy] = useState(false);

  const label = `${record.staffCode || 'Staff'} — ${record.staffName || 'Untitled'}`;

  if (!canView) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`View payslip for ${label}`}
        onClick={() => openView(record)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Download payslip for ${label}`}
        onClick={() => {
          downloadPayslipHtml(record);
          toast({
            variant: 'success',
            title: 'Download started',
            description: label
          });
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Print payslip for ${label}`}
        onClick={() => {
          const ok = printPayslip(record);
          toast({
            title: ok ? 'Print dialog opened' : 'Print blocked',
            description: ok
              ? label
              : 'Allow pop-ups to print this payslip.'
          });
        }}
      >
        <Printer className="h-4 w-4" />
      </Button>
      {canNotify ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={busy}
            aria-label={`Email payslip for ${label}`}
            onClick={() => {
              setBusy(true);
              void sendPayslipEmailAction(record.id)
                .then((result) => {
                  if (result.isError) {
                    toast({
                      variant: 'destructive',
                      title: 'Email failed',
                      description:
                        (typeof result.errors?.message === 'string' &&
                          result.errors.message) ||
                        'Unable to send email.'
                    });
                    return;
                  }
                  toast({
                    variant: 'success',
                    title: 'Email sent',
                    description: record.staffEmail || label
                  });
                })
                .finally(() => setBusy(false));
            }}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={busy}
            aria-label={`SMS payslip for ${label}`}
            onClick={() => {
              setBusy(true);
              void sendPayslipSmsAction(record.id)
                .then((result) => {
                  if (result.isError) {
                    toast({
                      variant: 'destructive',
                      title: 'SMS failed',
                      description:
                        (typeof result.errors?.message === 'string' &&
                          result.errors.message) ||
                        'Unable to send SMS.'
                    });
                    return;
                  }
                  toast({
                    variant: 'success',
                    title: 'SMS sent',
                    description: record.staffPhone || label
                  });
                  router.refresh();
                })
                .finally(() => setBusy(false));
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
