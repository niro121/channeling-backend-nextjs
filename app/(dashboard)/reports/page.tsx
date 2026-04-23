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
    rank: 1,
    masterData: 'Doctor Arrival Report',
    description: 'View doctor arrivals information with filters',
    route: '/reports/arrivals'
  },
  {
    id: '2',
    rank: 2,
    masterData: 'All Doctor View',
    description: 'View aggregated booking details by doctor and session time with filters',
    route: '/reports/all-doctor-view'
  },
  {
    id: '3',
    rank: 3,
    masterData: 'Doctor Leave',
    description: 'View doctor leave records with date & time range, filter by institution, branch, department, speciality, and doctor',
    route: '/reports/doctor-leave'
  },
  {
    id: '4',
    rank: 4,
    masterData: 'Doctor Appointment Count Report ( By Session Date )',
    description: 'Counts are based on receipt entries matched to bookings by session date, with booking/session filter options.',
    route: '/reports/doctor-appointment-count'
  },
  {
    id: '5',
    rank: 5,
    masterData: 'Channel Patient Count (Accounting Wise)',
    description: 'Channel booking count and accounting-wise fee summary by date range and branch.',
    route: '/reports/channel-patient-count-accounting-wise'
  },
  {
    id: '7',
    rank: 7,
    masterData: 'Channel Income Report (Accounting Wise)',
    description: 'Income totals grouped by booking channel type (excluding API/PCR).',
    route: '/reports/channel-income-accounting-wise'
  },
  {
    id: '9',
    rank: 9,
    masterData: 'Channel Discount Report',
    description: 'Shows billed channel bookings with hospital/professional fee discounts and discount schemes.',
    route: '/reports/channel-discount'
  },
  {
    id: '10',
    rank: 10,
    masterData: 'Consultant Payments Report',
    description: 'View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status',
    route: '/reports/consultant-payments'
  },
  {
    id: '11',
    rank: 11,
    masterData: 'Channel Agent Reference Book',
    description: 'View channel agent reference book information with filters',
    route: '/reports/channel-agent-reference-book'
  },
  {
    id: '14',
    rank: 14,
    masterData: 'Agent Details',
    description: 'View agent information with filters',
    route: '/reports/agent-detail'
  },
  {
    id: '15',
    rank: 15,
    masterData: 'Agent Statement',
    description: 'Agent-wise statement with opening/closing balance and receipt details enriched with booking fee breakdown when available.',
    route: '/reports/agency-statement'
  },
  {
    id: '16',
    rank: 16,
    masterData: 'Channel Agent Receipt',
    description: 'Search all receipts linked to bookings by Book No prefix (BookNo%).',
    route: '/reports/channel-agent-receipt'
  },
  {
    id: '18',
    rank: 18,
    masterData: 'Agent Balance Report',
    description: 'View agent balances with status filter using agency soft limit, associated account hard limit, and live account balance.',
    route: '/reports/agent-balance'
  },
  {
    id: '21',
    rank: 21,
    masterData: 'Channel Booking Details',
    description: 'View channel booking records with filters for date & time range, data type, institution, branch, speciality, doctor, status, refund status, area, agency, patient phone, gender, payment type, and method',
    route: '/reports/channel-bookings'
  },
  {
    id: '21a',
    rank: 22,
    masterData: 'Agent Wise Appointments - Summary and Detail',
    description:
      'Agent channel appointments by session date & time with institution, branch, department, and agent filters; summary counts per month or full detail with fee totals.',
    route: '/reports/agent-wise-appointments'
  },
  {
    id: '24',
    rank: 24,
    masterData: 'All Cashier Summary and Detail Report',
    description: 'All-cashier report with date/time, branch, and user filters; supports Summary and Detail formats with print and CSV.',
    route: '/reports/all-cashier-summary-detail'
  },
  {
    id: '25',
    rank: 25,
    masterData: 'Userwise Cashier Detail - Channel',
    description: 'User-wise cashier summary by date range; Summary (refunds in detail) or Detail (all transactions). Print and Download CSV.',
    route: '/reports/cashier-summary'
  },
  {
    id: '27',
    rank: 27,
    masterData: 'Withholding Tax Report',
    description: 'Doctor payments with WHT; filter by date & time range, consultant, speciality, branch, and detail or summary.',
    route: '/reports/withholding-tax'
  },
  {
    id: '29',
    rank: 29,
    masterData: 'SMS Reports',
    description: 'View SMS log entries with date & time range and status filters, with print/PDF/Excel export.',
    route: '/reports/sms-reports'
  },
  {
    id: '30',
    rank: 30,
    masterData: 'Channel Schedule With Charges',
    description:
      'View doctor sessions with charge breakdown filtered by institution, branch, department, speciality, doctor, and report type.',
    route: '/reports/channel-schedule-with-charges'
  },
  {
    id: '31',
    rank: 31,
    masterData: 'API LOG REPORT',
    description: 'View API request logs with date & time range and filter by UUID',
    route: '/reports/api-log'
  },
  {
    id: '32',
    rank: 32,
    masterData: 'Agent History(Credit Limit Update)',
    description: 'Track changes to agent soft/hard credit limits from the activity log.',
    route: '/reports/agent-history-credit-limit-update'
  },
  {
    id: '33',
    rank: 33,
    masterData: 'Channel Transfer Report',
    description: 'View booking transfers with From/To session details using activity log + booking/session data.',
    route: '/reports/channel-transfer'
  },
  {
    id: '34',
    rank: 34,
    masterData: 'Cashier Drawer Balance',
    description: 'Shows all tills and their balances by payment method for the selected date.',
    route: '/reports/cashier-drawer-balance'
  },
  {
    id: '35',
    rank: 35,
    masterData: 'Card Summary - Bank Wise',
    description: 'Lists card transactions by bank with Summary and Detail views.',
    route: '/reports/card-summary-bank-wise'
  },
  {
    id: '36',
    rank: 36,
    masterData: 'Agent Collection Receipt Report',
    description: 'Shows agent deposits/withdrawals and cancellations by payment type, with totals.',
    route: '/reports/agent-collection-receipt'
  },
  {
    id: '37',
    rank: 37,
    masterData: 'Cash Book',
    description: 'Statement-style report for a selected cash book within a date range.',
    route: '/reports/cash-book'
  },
  {
    id: '38',
    rank: 38,
    masterData: 'Agency Balance Confirmation Letter',
    description: 'Check agency balance confirmation letter.',
    route: '/reports/agent-balance-confirmation-letter'
  },
  {
    id: '39',
    rank: 39,
    masterData: 'Bank Deposits',
    description: 'Lists bank deposit receipts with date/time range and bank account filters.',
    route: '/reports/bank-deposits'
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

  const doctors = reportsData.filter((r) =>
    [
      '/reports/arrivals',
      '/reports/all-doctor-view',
      '/reports/doctor-leave',
      '/reports/doctor-appointment-count',
    ].includes(r.route)
  );
  const channel = reportsData.filter((r) =>
    [
      '/reports/channel-patient-count-accounting-wise',
      '/reports/channel-income-accounting-wise',
      '/reports/channel-discount',
      '/reports/consultant-payments',
      '/reports/withholding-tax',
      '/reports/channel-bookings',
      '/reports/channel-schedule-with-charges',
      '/reports/channel-transfer',
    ].includes(r.route)
  );
  const agents = reportsData.filter((r) =>
    [
      '/reports/channel-agent-reference-book',
      '/reports/agent-detail',
      '/reports/agency-statement',
      '/reports/channel-agent-receipt',
      '/reports/agent-balance',
      '/reports/agent-history-credit-limit-update',
      '/reports/agent-collection-receipt',
      '/reports/agent-balance-confirmation-letter',
      '/reports/agent-wise-appointments',
    ].includes(r.route)
  );
  const cashier = reportsData.filter((r) =>
    [
      '/reports/all-cashier-summary-detail',
      '/reports/cashier-summary',
      '/reports/cashier-drawer-balance',
      '/reports/card-summary-bank-wise',
      '/reports/cash-book',
      '/reports/bank-deposits',
    ].includes(r.route)
  );
  const smsAndApi = reportsData.filter((r) =>
    ['/reports/sms-reports', '/reports/api-log'].includes(r.route)
  );

  const sections = [
    { title: 'Doctors', items: doctors },
    { title: 'Channel', items: channel },
    { title: 'Agents', items: agents },
    { title: 'Cashier', items: cashier },
    { title: 'SMS & System', items: smsAndApi },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="overflow-hidden space-y-4">
      <Suspense fallback={<Loading />}>
        {sections.map((section) => (
          <CustomDataTable<ReportListItem, unknown>
            key={section.title}
            heading={section.title}
            subHeading=""
            columns={reportColumns}
            data={section.items}
            rowCount={section.items.length}
            haveBulkDelete={false}
            showPagination={false}
          />
        ))}
      </Suspense>
    </div>
  );
}
