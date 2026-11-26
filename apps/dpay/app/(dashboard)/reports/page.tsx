import { CustomDataTable } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { userTypes } from '@/lib/roles';
import { DPAY_REPORTS, REPORT_CATEGORIES, canViewReport } from '@/lib/report-privileges';
import { reportColumns, type ReportListItem } from './columns';

export default async function ReportsPage() {
  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'reports.visited',
      entityType: 'Reports',
      importance: 'low',
    });
  }

  const isAdmin = session?.user?.userType === userTypes.admin;
  const visible = DPAY_REPORTS.filter(
    (report) => isAdmin || canViewReport(session?.user?.permissions, report.action)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a report to view detailed analytics and activity.
        </p>
      </div>

      {REPORT_CATEGORIES.map((category) => {
        const reports: ReportListItem[] = visible
          .filter((report) => report.category === category)
          .map((report) => ({
            id: report.action,
            rank: report.rank,
            masterData: report.name,
            description: report.description,
            route: report.route,
          }));
        if (reports.length === 0) return null;
        return (
          <CustomDataTable
            key={category}
            heading={category}
            subHeading=""
            columns={reportColumns}
            data={reports}
            rowCount={reports.length}
            haveBulkDelete={false}
            showPagination={false}
          />
        );
      })}
    </div>
  );
}
