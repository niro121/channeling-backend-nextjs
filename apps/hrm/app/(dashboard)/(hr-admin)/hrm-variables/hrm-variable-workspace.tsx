'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type { HrmVariableUiRecord } from '@/types/hrm-variable';
import { HrmVariableUiProvider } from './hrm-variable-ui-context';
import SectionHrmVariableSummary from './section-hrm-variable-summary';
import SectionPayeSlabs from './section-paye-slabs';
import SectionStatutoryRates from './section-statutory-rates';

type Props = {
  initialRecord?: HrmVariableUiRecord;
};

export default function HrmVariableWorkspace({ initialRecord }: Props) {
  return (
    <HrmVariableUiProvider initialRecord={initialRecord}>
      <div className="space-y-6">
        <CommonManagerHeader
          title="Manage HRM Variable"
          description="Statutory contribution rates (EPF / ETF) and progressive PAYE tax slabs used by payroll."
        />

        <SectionHrmVariableSummary />

        <div className="grid gap-4 lg:grid-cols-[minmax(18rem,38%)_minmax(0,1fr)]">
          <SectionStatutoryRates />
          <SectionPayeSlabs />
        </div>
      </div>
    </HrmVariableUiProvider>
  );
}
