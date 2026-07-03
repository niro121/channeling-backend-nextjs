import { checkRouteAccess } from '@/lib/server-permissions';
import { redirect } from 'next/navigation';
import DoctorViewReportContent from './doctor-view-content';

// Force dynamic rendering to prevent prerendering during build
export const dynamic = 'force-dynamic';

type SearchParams = {
  sessionId?: string;
};

export default async function DoctorViewReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Check if user can access reports
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const sessionId = params?.sessionId || '';

  return (
    <DoctorViewReportContent sessionId={sessionId} />
  );
}
