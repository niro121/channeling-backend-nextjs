'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_BANK_TRANSFER_SUMMARY,
  PAYROLL_WORKFLOW_STEPS,
  type BankTransferBatchRecord
} from '@/types/payroll';
import {
  BankTransferFileUiProvider,
  useBankTransferFileUi
} from './bank-transfer-file-ui-context';
import { BankTransferFileHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetBatchHistory from './sheet-batch-history';
import SheetBatchView from './sheet-batch-view';

function BankTransferFileWorkspaceInner() {
  const { viewRecord, historyRecord, closeView, closeHistory } =
    useBankTransferFileUi();
  const [records] = useState<BankTransferBatchRecord[]>([]);
  const summary = EMPTY_BANK_TRANSFER_SUMMARY;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Bank Transfer File"
        description="Generate and manage bank transfer files from approved salaries using the existing bank file format."
        actions={<BankTransferFileHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={records.length}
        departmentOptions={[]}
        batchOptions={[]}
      />

      <SheetBatchView
        open={viewRecord != null}
        record={viewRecord}
        onOpenChange={(open) => {
          if (!open) closeView();
        }}
      />

      <SheetBatchHistory
        open={historyRecord != null}
        record={historyRecord}
        onOpenChange={(open) => {
          if (!open) closeHistory();
        }}
      />
    </div>
  );
}

export default function BankTransferFileWorkspace() {
  return (
    <BankTransferFileUiProvider>
      <BankTransferFileWorkspaceInner />
    </BankTransferFileUiProvider>
  );
}
