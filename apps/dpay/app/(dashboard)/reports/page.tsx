import { CustomDataTable } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { reportColumns, type ReportListItem } from './columns';

const financialReports: ReportListItem[] = [
  {
    id: '1',
    rank: 1,
    masterData: 'Financial Reports',
    description:
      'Receipt and doctor payment reports with date filters, search, print, and export.',
    route: '/reports/financial',
  },
];

const systemReports: ReportListItem[] = [
  {
    id: '2',
    rank: 1,
    masterData: 'User Activity Report',
    description:
      'View user activity logs with filters for date range, user, and action.',
    route: '/reports/user-activity',
  },
];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a report to view detailed analytics and activity.
        </p>
      </div>

      <CustomDataTable
        heading="Financial"
        subHeading=""
        columns={reportColumns}
        data={financialReports}
        rowCount={financialReports.length}
        haveBulkDelete={false}
        showPagination={false}
      />

      <CustomDataTable
        heading="System"
        subHeading=""
        columns={reportColumns}
        data={systemReports}
        rowCount={systemReports.length}
        haveBulkDelete={false}
        showPagination={false}
      />
    </div>
  );
}
