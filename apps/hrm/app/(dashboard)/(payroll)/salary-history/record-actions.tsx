'use client';

import { Eye, FileText, History, Layers } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { SalaryHistoryRecord } from '@/types/payroll';
import { useSalaryHistoryUi } from './salary-history-ui-context';

type RecordActionsProps = {
  record: SalaryHistoryRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { has } = usePermissions();
  const { openDetails, openPayslip, openComponents, openHistory } =
    useSalaryHistoryUi();
  const canView = has('payroll', 'view');

  if (!canView) return null;

  const label = `${record.staffCode || 'Staff'} — ${record.staffName || 'Untitled'}`;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`View salary details for ${label}`}
        onClick={() => openDetails(record)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`View payslip for ${label}`}
        onClick={() => openPayslip(record)}
      >
        <FileText className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`View components for ${label}`}
        onClick={() => openComponents(record)}
      >
        <Layers className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`History for ${label}`}
        onClick={() => openHistory(record)}
      >
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}
