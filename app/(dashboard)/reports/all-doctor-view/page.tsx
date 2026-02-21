import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import AllDoctorViewReportContent from './all-doctor-view-content';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

export default async function AllDoctorViewReportPage() {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  // Fetch location options
  const locationsResult = await getLocationOptions();

  // Format location options
  const locationOptions: Array<{ id: string; name: string }> = locationsResult.success && locationsResult.data
    ? locationsResult.data.map((loc: any) => ({
        id: loc.id || '',
        name: loc.name || ''
      }))
    : [];

  return (
    <AllDoctorViewReportContent
      initialLocationOptions={locationOptions}
    />
  );
}
