import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ConsultantPaymentsReportContent from './consultant-payments-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function ConsultantPaymentsReportPage() {
  const canView = await checkRouteAccess('/reports/consultant-payments');
  if (!canView) redirect('/unauthorized-access');

  const [ref, locRef, deptRef, specRef] =
    await Promise.all([
      getReportFilterOptions({ doctors: true }),
      getReportFilterOptions({ locations: true }),
      getReportFilterOptions({ departments: true }),
      getReportFilterOptions({ specialities: true }),
    ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locRef.success && locRef.locationOptions
      ? locRef.locationOptions
      : [{ id: '__all__', name: 'All Branches' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    deptRef.success && deptRef.departmentOptions
      ? deptRef.departmentOptions
      : [{ id: '__all__', name: 'All Departments' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specRef.success && specRef.specialityOptions
      ? specRef.specialityOptions
      : [{ id: '__all__', name: 'All Specialities' }];

  return (
    <ConsultantPaymentsReportContent
      institutionOptions={[
        ...INSTITUTION_OPTIONS
      ]}
      locationOptions={locationOptions}
      departmentOptions={departmentOptions}
      specialityOptions={specialityOptions}
      doctorOptions={doctorOptions}
    />
  );
}
