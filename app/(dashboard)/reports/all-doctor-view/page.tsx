import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AllDoctorViewReportContent from './all-doctor-view-content';
import { getReportFilterOptions } from '@/services/reference/report-filter-options.service';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function AllDoctorViewReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  // Fetch location options
  const ref = await getReportFilterOptions({ locations: true });

  // Format location options
  const locationOptions: Array<{ id: string; name: string }> =
    ref.success && ref.locationOptions ? ref.locationOptions.slice(1) : [];

  return (
    <AllDoctorViewReportContent
      initialLocationOptions={locationOptions}
    />
  );
}
