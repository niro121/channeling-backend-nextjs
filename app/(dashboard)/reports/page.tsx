import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CustomDataTable } from '@/components/common/custom-data-table';
import { reportColumns, type ReportListItem } from './columns';
import { logActivityNonBlocking } from '@/lib/activity-log';
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
  },
  {
    id: '8',
    masterData: 'Userwise Cashier Detail - Channel',
    description: 'User-wise cashier summary by date range; Summary (refunds in detail) or Detail (all transactions). Print and Download CSV.',
    route: '/reports/cashier-summary'
  },
  {
    id: '9',
    masterData: 'Doctor Leave Report',
    description: 'View doctor leave records with date & time range, filter by institution, branch, department, speciality, and doctor',
    route: '/reports/doctor-leave'
  },
  {
    id: '14',
    masterData: 'Channel schedule with charges',
    description:
      'View doctor sessions with charge breakdown filtered by institution, branch, department, speciality, doctor, and report type.',
    route: '/reports/channel-schedule-with-charges'
  },
  {
    id: '10',
    masterData: 'Consultant Payments Report',
    description: 'View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status',
    route: '/reports/consultant-payments'
  },
  {
    id: '11',
    masterData: 'Channel Bookings',
    description: 'View channel booking records with filters for date & time range, data type, institution, branch, speciality, doctor, status, refund status, area, agency, patient phone, gender, payment type, and method',
    route: '/reports/channel-bookings'
  },
  {
    id: '12',
    masterData: 'Agent Balance Confirmation Letter',
    description: 'Generate a balance certificate letter for selected agent as at a specific date with support for English and Sinhala languages',
    route: '/reports/agent-balance'
  },
  {
    id: '13',
    masterData: 'API Log Report',
    description: 'View API request logs with date & time range and filter by UUID',
    route: '/reports/api-log'
  },
  {
    id: '15',
    masterData: 'All Cashier Summary and Detail Report',
    description: 'All-cashier report with date/time, branch, and user filters; supports Summary and Detail formats with print and CSV.',
    route: '/reports/all-cashier-summary-detail'
  },
  {
    id: '12',
    masterData: 'SMS Log Report',
    description: 'View SMS sent/failure logs with date & time range, institution, branch, department, report type, and phone number filters',
    route: '/reports/sms-log'
  }
];

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
