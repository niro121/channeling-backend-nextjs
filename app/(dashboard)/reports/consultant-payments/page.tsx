import {
  getDoctorOptions,
  getDepartmentOptions,
  getLocationOptions
} from '@/app/actions/doctor.sessions.action';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';
import { INSTITUTION_OPTIONS } from '@/types/doctor.session';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import ConsultantPaymentsReportContent from './consultant-payments-report-content';

export const dynamic = 'force-dynamic';

export default async function ConsultantPaymentsReportPage() {
  const canView = await checkRouteAccess('/reports/consultant-payments');
  if (!canView) redirect('/unauthorized-access');

  const [doctorsResult, locationsResult, departmentsResult, specialityRes] =
    await Promise.all([
      getDoctorOptions(),
      getLocationOptions(),
      getDepartmentOptions(),
      getAllSpecialityOptions()
    ]);

  const doctorOptions: Array<{ id: string; name: string }> =
    doctorsResult.success && doctorsResult.data
      ? [
          { id: '__all__', name: 'All Doctors' },
          ...doctorsResult.data
            .filter((d: any) => d.id)
            .map((d: any) => ({
              id: d.id || '',
              name: formatDoctorName(d)
            }))
        ]
      : [{ id: '__all__', name: 'All Doctors' }];

  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.data
      ? [
          { id: '__all__', name: 'All Branches' },
          ...locationsResult.data.map((loc: any) => ({
            id: loc.id || '',
            name: loc.name || ''
          }))
        ]
      : [{ id: '__all__', name: 'All Branches' }];

  const departmentOptions: Array<{ id: string; name: string }> =
    departmentsResult.success && departmentsResult.data
      ? [
          { id: '__all__', name: 'All Departments' },
          ...departmentsResult.data.map((d: any) => ({
            id: d.id || '',
            name: d.name || ''
          }))
        ]
      : [{ id: '__all__', name: 'All Departments' }];

  const specialityOptions: Array<{ id: string; name: string }> =
    specialityRes.success && specialityRes.data
      ? [
          { id: '__all__', name: 'All Specialities' },
          ...specialityRes.data.map((s: any) => ({
            id: s.id || '',
            name: s.name || ''
          }))
        ]
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
