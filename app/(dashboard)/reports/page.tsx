import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { reportColumns, type ReportListItem } from './columns';
import { logActivity } from '@/lib/activity-log';
import Loading from '../loading';

const reportsData: ReportListItem[] = [
  {
    id: '1',
    masterData: 'All Doctors List',
    description: 'Comprehensive list of all doctors with their details',
    route: '/reports/doctors'
  },
  {
    id: '2',
    masterData: 'Channel Agent Reference Book',
    description: 'View channel agent reference book information with filters',
    route: '/reports/channel-agent-reference-book'
  },
  {
    id: '3',
    masterData: 'Doctor Arrivals Report',
    description: 'View doctor arrivals information with filters',
    route: '/reports/arrivals'
  },
  {
    id: '4',
    masterData: 'Agent Detail Report',
    description: 'View agent information with filters',
    route: '/reports/agent-detail'
  },
  {
    id: '5',
    masterData: 'All Doctor View (By Session Time)',
    description: 'View aggregated booking details by doctor and session time with filters',
    route: '/reports/all-doctor-view'
  },
  {
    id: '6',
    masterData: 'SMS Activity',
    description: 'Daily SMS statistics, success/failure graph, cost estimate, and breakdown by type',
    route: '/reports/sms-activity'
  },
  {
    id: '7',
    masterData: 'User Activity',
    description: 'Audit log of user actions by user and date range (display capped at 10,000; export as PDF/CSV)',
    route: '/reports/user-activity'
  }
];

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'reports.visited',
      entityType: 'Reports',
      importance: 'low',
    });
  }
  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable<ReportListItem, unknown>
          heading="Reports"
          subHeading="Access various reports and analytics."
          columns={reportColumns}
          data={reportsData}
          rowCount={reportsData.length}
          haveBulkDelete={false}
        />
      </Suspense>
    </div>
  );
}
