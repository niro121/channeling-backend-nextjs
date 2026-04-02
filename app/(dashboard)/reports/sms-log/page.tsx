import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import SmsLogReportContent from './sms-log-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

export const dynamic = 'force-dynamic';

export default async function SmsLogReportPage() {
  const canView = await checkRouteAccess('/reports/sms-log');
  if (!canView) redirect('/unauthorized-access');

  const [locationsResult, departmentsResult] = await Promise.all([
    getReportFilterOptions({ locations: true, allLabels: { locations: 'Branch' } }),
    getReportFilterOptions({ departments: true, allLabels: { departments: 'Department' } }),
  ]);

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.locationOptions
      ? [
          ...locationsResult.locationOptions
        ]
      : [{ id: '__all__', name: 'Branch' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    departmentsResult.success && departmentsResult.departmentOptions
      ? departmentsResult.departmentOptions
      : [{ id: '__all__', name: 'Department' }];

  return (
    <SmsLogReportContent
      institutionOptions={[
        ...INSTITUTION_OPTIONS
      ]}
      locationOptions={locationOptions}
      departmentOptions={departmentOptions}
    />
  );
}
