import { CustomDataTable } from '@archmage/ui';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { reportColumns, type ReportListItem } from './columns';

const financialReports: ReportListItem[] = [
  {
    id: '1',
    rank: 1,
    masterData: 'Receipt Report',
    description:
      'Patient payment receipts with date filters, search, print, and export.',
    route: '/reports/receipts',
  },
  {
    id: '2',
    rank: 2,
    masterData: 'Doctor Payment Report',
    description:
      'Doctor payment receipts with totals, status, search, print, and export.',
    route: '/reports/doctor-payments',
  },
  {
    id: '3',
    rank: 3,
    masterData: 'Doctor Due Payment Report',
    description:
      'Doctors still owed for unpaid bill line items, with search, print, and export.',
    route: '/reports/doctor-due',
  },
  {
    id: '4',
    rank: 4,
    masterData: 'Patient Due Report',
    description:
      'Patients with outstanding balances (pending / partially paid) for collection follow-up.',
    route: '/reports/patient-due',
  },
  {
    id: '5',
    rank: 5,
    masterData: 'Patient Excess Report',
    description:
      'Patients who overpaid their bills, with excess amount for refund follow-up.',
    route: '/reports/patient-excess',
  },
];

const systemReports: ReportListItem[] = [
  {
    id: '6',
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
