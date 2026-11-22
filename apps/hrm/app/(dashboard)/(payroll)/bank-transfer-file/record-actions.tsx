'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  History,
  Landmark,
  RefreshCw
} from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import type { BankTransferBatchRecord } from '@/types/payroll';
import { useBankTransferFileUi } from './bank-transfer-file-ui-context';

type RecordActionsProps = {
  record: BankTransferBatchRecord;
};

const LATER = 'Will be wired in the dynamic phase.';

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openView, openHistory } = useBankTransferFileUi();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [processedOpen, setProcessedOpen] = useState(false);

  const canView = has('payroll', 'view');
  const canEdit = has('payroll', 'edit');

  if (!canView) return null;

  const label = record.batchCode || 'Batch';
  const summary = `Staff: ${formatAmount(record.staffCount)} · Total: ${formatLkr(record.totalNetSalary)} · Bank: ${record.bankName || '—'} · Period: ${record.salaryPeriod || '—'}`;

  const isPending = record.status === 'pending';
  const isGenerated = record.status === 'generated';
  const isProcessed = record.status === 'processed';
  const canDownload = isGenerated || isProcessed;

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`View ${label}`}
          onClick={() => openView(record)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        {canDownload ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Download ${label}`}
            onClick={() =>
              toast({
                title: 'Download bank file',
                description: LATER
              })
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && isPending ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Generate bank file for ${label}`}
            onClick={() => setGenerateOpen(true)}
          >
            <Landmark className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && isGenerated ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Mark ${label} as processed`}
            onClick={() => setProcessedOpen(true)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        ) : null}

        {canEdit && isGenerated ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Regenerate bank file for ${label}`}
            onClick={() => setRegenerateOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        ) : null}

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

      <CustomAlertDialog
        open={generateOpen}
        handleVisibilityChange={setGenerateOpen}
        title="Generate bank transfer file?"
        description={summary}
        loading={false}
        handleContinue={() => {
          setGenerateOpen(false);
          toast({
            title: 'Generate bank file',
            description: LATER
          });
        }}
      />

      <CustomAlertDialog
        open={regenerateOpen}
        handleVisibilityChange={setRegenerateOpen}
        title="Regenerate bank file?"
        description={`The previous file will be superseded. ${summary}`}
        loading={false}
        handleContinue={() => {
          setRegenerateOpen(false);
          toast({
            title: 'Regenerate bank file',
            description: LATER
          });
        }}
      />

      <CustomAlertDialog
        open={processedOpen}
        handleVisibilityChange={setProcessedOpen}
        title="Mark batch as processed?"
        description="Confirm the bank has accepted this transfer. Payslips will be marked Paid."
        loading={false}
        handleContinue={() => {
          setProcessedOpen(false);
          toast({
            title: 'Mark as processed',
            description: LATER
          });
        }}
      />
    </>
  );
}
