import {
  getDepartmentOptions,
  getLocationOptions
} from '@/app/actions/doctor.sessions.action';
import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import SmsLogReportContent from './sms-log-report-content';

export const dynamic = 'force-dynamic';

export default async function SmsLogReportPage() {
  const canView = await checkRouteAccess('/reports/sms-log');
  if (!canView) redirect('/unauthorized-access');

  const [locationsResult, departmentsResult] = await Promise.all([
    getLocationOptions(),
    getDepartmentOptions()
  ]);

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.data
      ? [
          { id: '__all__', name: 'Branch' },
          ...locationsResult.data.map((loc: any) => ({
            id: loc.id || '',
            name: loc.name || ''
          }))
        ]
      : [{ id: '__all__', name: 'Branch' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    departmentsResult.success && departmentsResult.data
      ? [
          { id: '__all__', name: 'Department' },
          ...departmentsResult.data.map((d: any) => ({
            id: d.id || '',
            name: d.name || ''
          }))
        ]
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
