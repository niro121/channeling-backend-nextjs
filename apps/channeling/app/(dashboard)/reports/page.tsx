import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { userTypes } from '@/lib/roles';
import { canViewReport, REPORT_PRIVILEGES } from '@/lib/report-privileges';
import Loading from '../loading';
import { ReportsCatalog } from './reports-catalog';
import type { ReportListItem } from './columns';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'reports.visited',
      entityType: 'Reports',
      importance: 'low',
    });
  }

  const isAdmin = session?.user?.userType === userTypes.admin;
  const reports: ReportListItem[] = REPORT_PRIVILEGES.filter(
    (report) => isAdmin || canViewReport(session?.user?.permissions, report.action)
  ).map((report) => ({
    id: report.id,
    rank: report.rank,
    masterData: report.name,
    description: report.description,
    route: report.route,
    category: report.category,
  }));

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        {reports.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            No reports are assigned to your group.
          </div>
        ) : (
          <ReportsCatalog reports={reports} />
        )}
      </Suspense>
    </div>
  );
}
