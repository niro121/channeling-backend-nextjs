import { getAllDoctors } from '@/app/actions/doctor.actions';
import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import DoctorArrivalsReportContent from './doctor-arrivals-report-content';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';

export default async function DoctorArrivalsReportPage() {
  const canView = await checkRouteAccess('/reports/arrivals');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const [doctorsResult, locationsResult] = await Promise.all([
    getAllDoctors({ page: '0', limit: '1000' }),
    getLocationOptions()
  ]);

  // Format doctor options
  const doctorOptions: Array<{ id: string; name: string }> = doctorsResult.success && doctorsResult.data
    ? [
        { id: '__all__', name: 'All Doctors' },
        ...doctorsResult.data
          .filter((doctor: any) => doctor.id)
          .map((doctor: any) => ({
            id: doctor.id || '',
            name: formatDoctorName(doctor)
          }))
      ]
    : [{ id: '__all__', name: 'All Doctors' }];

  // Format location options (without "All Branches" - Selector component adds it automatically)
  const locationOptions: Array<{ id: string; name: string }> = locationsResult.success && locationsResult.data
    ? locationsResult.data.map((loc: any) => ({
        id: loc.id || '',
        name: loc.name || ''
      }))
    : [];

  return (
    <DoctorArrivalsReportContent
      initialDoctorOptions={doctorOptions}
      initialLocationOptions={locationOptions}
    />
  );
}
