'use client';

import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  ChangeStaffFormOptions,
  ChangeStaffHistoryRow,
  ChangeStaffMemberOption
} from '@/types/change-staff';
import { ChangeStaffUiProvider } from './change-staff-ui-context';
import SectionChangeStaffForm from './section-change-staff-form';
import SectionChangeStaffHistory from './section-change-staff-history';

type Props = {
  initialMembers: ChangeStaffMemberOption[];
  initialHistory: ChangeStaffHistoryRow[];
  formOptions: ChangeStaffFormOptions;
};

export default function ChangeStaffWorkspace({
  initialMembers,
  initialHistory,
  formOptions
}: Props) {
  return (
    <ChangeStaffUiProvider
      initialMembers={initialMembers}
      initialHistory={initialHistory}
      formOptions={formOptions}
      initialStaffId={initialMembers[0]?.id}
    >
      <div className="space-y-6">
        <CommonManagerHeader
          title="Change Staff"
          description="Update a staff member's working department, status, category, grade, designation or basic — every change is captured with an effective date and full audit trail."
        />

        <SectionChangeStaffForm />
        <SectionChangeStaffHistory />

        <div className="rounded-md border border-primary/15 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Roster membership and paysheet assignments are not auto-updated here.
          Active From versions employment attributes only; payroll/roster use their
          own effective dates.
        </div>
      </div>
    </ChangeStaffUiProvider>
  );
}
