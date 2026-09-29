'use client';

import { Download, Eye, Mail, Printer } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PayslipRecord } from '@/types/payroll';
import { usePayslipsUi } from './payslips-ui-context';

type RecordActionsProps = {
  record: PayslipRecord;
};

const LATER = 'Will be wired in the dynamic phase.';

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openView } = usePayslipsUi();
  const canView = has('payroll', 'view');

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
        onClick={() =>
          toast({
            title: 'Download payslip',
            description: LATER
          })
        }
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Print payslip for ${label}`}
        onClick={() =>
          toast({
            title: 'Print payslip',
            description: LATER
          })
        }
      >
        <Printer className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`Email payslip for ${label}`}
        onClick={() =>
          toast({
            title: 'Email payslip',
            description: LATER
          })
        }
      >
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  );
}
