import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SearchInput } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getDoctorPaymentReportAction,
  getDoctorPaymentReportExportAction,
  getReceiptReportAction,
  getReceiptReportExportAction,
} from '@/app/actions/reports/reports.actions';
import type { ReportTab } from '@/types/reports';
import Loading from '../loading';
import { ReportsTabs } from './reports-tabs';
import ReportsFilterSection from './reports-filter-section';
import { ReportsToolbar } from './reports-toolbar';
import { ReportsTable } from './reports-table';

type SearchParams = {
  searchParams?: Promise<{
    tab?: string;
    page?: string;
    limit?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

function resolveTab(tab?: string): ReportTab {
  return tab === 'doctor-payments' ? 'doctor-payments' : 'receipts';
}

export default async function ReportsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const tab = resolveTab(params?.tab);
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const keyword = params?.keyword ?? undefined;
  const dateFrom = params?.dateFrom ?? undefined;
  const dateTo = params?.dateTo ?? undefined;

  const searchPlaceholder =
    tab === 'receipts'
      ? 'Search by receipt, patient, or bill number...'
      : 'Search by doctor or receipt number...';

  async function handleReceiptExport() {
    'use server';
    return getReceiptReportExportAction({ keyword, dateFrom, dateTo });
  }

  async function handleDoctorPaymentExport() {
    'use server';
    return getDoctorPaymentReportExportAction({ keyword, dateFrom, dateTo });
  }

  const receiptResult =
    tab === 'receipts'
      ? await getReceiptReportAction({ page, limit, keyword, dateFrom, dateTo })
      : null;

  const doctorPaymentResult =
    tab === 'doctor-payments'
      ? await getDoctorPaymentReportAction({ page, limit, keyword, dateFrom, dateTo })
      : null;

  return (
    <div className="space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Receipt and Doctor Payment reports with search, print, and export.
        </p>
      </div>

      <Suspense fallback={null}>
        <ReportsTabs activeTab={tab} />
      </Suspense>

      <Suspense fallback={<Loading />}>
        {tab === 'receipts' && receiptResult ? (
          <ReportsTable
            tab="receipts"
            data={receiptResult.data}
            totalRecords={receiptResult.totalRecords}
            totalAmount={receiptResult.totalReceived}
            page={params?.page}
            limit={params?.limit}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:max-w-sm" key={`search-${tab}`}>
                  <SearchInput
                    name="keyword"
                    placeholder={searchPlaceholder}
                    className="pl-8 w-full h-9"
                  />
                </div>
                <ReportsFilterSection dateFrom={dateFrom} dateTo={dateTo} />
              </div>
            }
            toolbarRight={
              <ReportsToolbar variant="receipts" serverData={handleReceiptExport} />
            }
          />
        ) : null}

        {tab === 'doctor-payments' && doctorPaymentResult ? (
          <ReportsTable
            tab="doctor-payments"
            data={doctorPaymentResult.data}
            totalRecords={doctorPaymentResult.totalRecords}
            totalAmount={doctorPaymentResult.totalPaid}
            page={params?.page}
            limit={params?.limit}
            toolbarLeft={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:max-w-sm" key={`search-${tab}`}>
                  <SearchInput
                    name="keyword"
                    placeholder={searchPlaceholder}
                    className="pl-8 w-full h-9"
                  />
                </div>
                <ReportsFilterSection dateFrom={dateFrom} dateTo={dateTo} />
              </div>
            }
            toolbarRight={
              <ReportsToolbar
                variant="doctor-payments"
                serverData={handleDoctorPaymentExport}
              />
            }
          />
        ) : null}
      </Suspense>
    </div>
  );
}
