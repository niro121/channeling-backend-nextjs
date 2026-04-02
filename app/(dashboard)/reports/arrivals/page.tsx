import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import DoctorArrivalsReportContent from './doctor-arrivals-report-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';


// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function DoctorArrivalsReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports/arrivals');
  if (!canView) {
    redirect('/unauthorized-access');
  }
  // Fetch data on the server
  const [ref, locationsResult] = await Promise.all([
    getReportFilterOptions({ doctors: true }),
    getReportFilterOptions({ locations: true })
  ]);

  // Format doctor options
  const doctorOptions: Array<{ id: string; name: string }> =
    ref.success && ref.doctorOptions ? ref.doctorOptions : [{ id: '__all__', name: 'All Doctors' }];

  // Format location options (without "All Branches" - Selector component adds it automatically)
  const locationOptions: Array<{ id: string; name: string }> =
    locationsResult.success && locationsResult.locationOptions
      ? locationsResult.locationOptions.slice(1)
      : [];

  return (
    <DoctorArrivalsReportContent
      initialDoctorOptions={doctorOptions}
      initialLocationOptions={locationOptions}
    />
  );
}
