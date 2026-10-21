import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { getStaffSpecialityOptionsAction } from '@/app/actions/hr-admin-actions/staff-speciality.actions';
import { getAppointmentLetterOnboardContextAction } from '@/app/actions/recruitment-actions/staff-onboard.actions';
import type { GeneralFormValues } from '@/types/staff';
import TabLayout from '../tab-layout';

type SearchParams = {
  searchParams?: Promise<{
    from?: string;
    letterId?: string;
  }>;
};

export default async function StaffAddPage({ searchParams }: SearchParams) {
  const optionsRes = await getStaffSpecialityOptionsAction({ activeOnly: true });
  const specialityOptions = optionsRes.isError ? [] : (optionsRes.data ?? []);

  const params = await searchParams;
  const letterId =
    params?.from === 'appointment' ? params?.letterId?.trim() : undefined;

  let generalPrefill: GeneralFormValues | null = null;
  let appointmentLetterId: string | undefined;
  let employmentHints: {
    department: string;
    designation: string;
    employmentType: string;
    salary: string;
  } | null = null;

  if (letterId) {
    const onboard = await getAppointmentLetterOnboardContextAction(letterId);
    if (!onboard.isError && onboard.data && !onboard.data.letter.alreadyOnboarded) {
      generalPrefill = onboard.data.prefill;
      appointmentLetterId = onboard.data.letter.letterId;
      employmentHints = onboard.data.employmentHints;
    }
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Add Staff"
        description={
          appointmentLetterId
            ? 'Prefill from accepted appointment letter — confirm NIC and remaining details before saving.'
            : 'Add a new staff member to the system.'
        }
        backwordButton={true}
      />
      {employmentHints ? (
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          Offer hints for Employment tab after save:{' '}
          <span className="font-medium text-foreground">
            {[employmentHints.designation, employmentHints.department, employmentHints.employmentType, employmentHints.salary]
              .filter(Boolean)
              .join(' · ') || '—'}
          </span>
        </div>
      ) : null}
      <TabLayout
        specialityOptions={specialityOptions}
        generalPrefill={generalPrefill}
        appointmentLetterId={appointmentLetterId}
      />
    </div>
  );
}
