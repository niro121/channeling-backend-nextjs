'use client';

import { useState } from 'react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  EMPTY_SALARY_HISTORY_SUMMARY,
  EMPTY_SALARY_HISTORY_TIMELINE,
  PAYROLL_WORKFLOW_STEPS,
  type SalaryHistoryRecord
} from '@/types/payroll';
import { SalaryHistoryHeaderActions } from './header-actions';
import {
  SalaryHistoryUiProvider,
  useSalaryHistoryUi
} from './salary-history-ui-context';
import SectionFilters from './section-filters';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SectionTimeline from './section-timeline';
import SectionWorkflowSteps from './section-workflow-steps';
import SheetComponents from './sheet-components';
import SheetHistory from './sheet-history';
import SheetPayslip from './sheet-payslip';
import SheetSalaryDetails from './sheet-salary-details';

function SalaryHistoryWorkspaceInner() {
  const {
    detailsRecord,
    payslipRecord,
    componentsRecord,
    historyRecord,
    closeDetails,
    closePayslip,
    closeComponents,
    closeHistory,
    openHistory
  } = useSalaryHistoryUi();

  const [records] = useState<SalaryHistoryRecord[]>([]);
  const summary = EMPTY_SALARY_HISTORY_SUMMARY;
  const timeline = EMPTY_SALARY_HISTORY_TIMELINE;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary History"
        description="Historical salary records per staff member with components, payslips and salary changes over time."
        actions={<SalaryHistoryHeaderActions />}
      />

      <SectionWorkflowSteps steps={PAYROLL_WORKFLOW_STEPS} />

      <SectionSummary summary={summary} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <SectionFilters
            staffOptions={[]}
            departmentOptions={[]}
            designationOptions={[]}
            periodOptions={[]}
            componentOptions={[]}
          />
        </div>
        <div className="lg:col-span-1">
          <SectionTimeline timeline={timeline} />
        </div>
      </div>

      <SectionRegister
        records={records}
        totalRecords={records.length}
        staffFocusLabel={timeline.staffLabel}
      />

      <SheetSalaryDetails
        open={detailsRecord != null}
        record={detailsRecord}
        onOpenChange={(open) => {
          if (!open) closeDetails();
        }}
        onOpenHistory={(record) => {
          closeDetails();
          openHistory(record);
        }}
      />

      <SheetPayslip
        open={payslipRecord != null}
        record={payslipRecord}
        onOpenChange={(open) => {
          if (!open) closePayslip();
        }}
        onOpenHistory={(record) => {
          closePayslip();
          openHistory(record);
        }}
      />

      <SheetComponents
        open={componentsRecord != null}
        record={componentsRecord}
        onOpenChange={(open) => {
          if (!open) closeComponents();
        }}
      />

      <SheetHistory
        open={historyRecord != null}
        record={historyRecord}
        onOpenChange={(open) => {
          if (!open) closeHistory();
        }}
      />
    </div>
  );
}

export default function SalaryHistoryWorkspace() {
  return (
    <SalaryHistoryUiProvider>
      <SalaryHistoryWorkspaceInner />
    </SalaryHistoryUiProvider>
  );
}
