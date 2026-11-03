'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { Selector } from '@archmage/ui';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import type { SalaryCycleUiRecord } from '@/types/salary-cycle';
import { SalaryCycleUiProvider, useSalaryCycleUi } from './salary-cycle-ui-context';
import SectionSalaryCycleDetail from './section-salary-cycle-detail';
import SectionSalaryCycleList from './section-salary-cycle-list';

type Props = {
  initialRecords?: SalaryCycleUiRecord[];
  initialInstitutionId?: number;
  initialSelectedId?: string | null;
};

function InstitutionToolbar() {
  const { institutionId, setInstitutionId } = useSalaryCycleUi();

  return (
    <div className="w-full max-w-sm">
      <Selector
        label="Institution"
        options={INSTITUTION_OPTIONS}
        value={String(institutionId)}
        defaultValue="0"
        showDefaultOption={false}
        onChange={(v) => setInstitutionId(Number(v))}
        className={{ trigger: 'h-10 w-full' }}
      />
    </div>
  );
}

function SalaryCycleWorkspaceInner() {
  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Manage Salary Cycle"
        description="Define salary, advance, overtime, and day-off / PH windows used by payroll processing."
      />

      <InstitutionToolbar />

      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,30%)_minmax(0,1fr)]">
        <SectionSalaryCycleList />
        <SectionSalaryCycleDetail />
      </div>
    </div>
  );
}

export default function SalaryCycleWorkspace({
  initialRecords = [],
  initialInstitutionId = 0,
  initialSelectedId = null
}: Props) {
  return (
    <SalaryCycleUiProvider
      initialRecords={initialRecords}
      initialInstitutionId={initialInstitutionId}
      initialSelectedId={initialSelectedId}
    >
      <SalaryCycleWorkspaceInner />
    </SalaryCycleUiProvider>
  );
}
