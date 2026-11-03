import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { BackButton, SearchInput } from '@archmage/ui';
import { checkRouteAccess } from '@/lib/server-permissions';
import {
  getReceiptReportAction,
  getReceiptReportExportAction,
} from '@/app/actions/reports/reports.actions';
import Loading from '../../loading';
import ReportsFilterSection from '../reports-filter-section';
import { ReportsToolbar } from '../reports-toolbar';
import { ReportsTable } from '../reports-table';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function ReceiptReportPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/reports');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const keyword = params?.keyword ?? undefined;
  const dateFrom = params?.dateFrom ?? undefined;
  const dateTo = params?.dateTo ?? undefined;

  async function handleExport() {
    'use server';
    return getReceiptReportExportAction({ keyword, dateFrom, dateTo });
  }

  const result = await getReceiptReportAction({
    page,
    limit,
    keyword,
    dateFrom,
    dateTo,
  });

  return (
    <div className="space-y-6 overflow-hidden">
      <div className="space-y-3">
        <BackButton href="/reports" label="Back to Reports" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipt Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Patient payment receipts with search, print, and export.
          </p>
        </div>
      </div>

      <Suspense fallback={<Loading />}>
        <ReportsTable
          tab="receipts"
          data={result.data}
          totalRecords={result.totalRecords}
          totalAmount={result.totalReceived}
          page={params?.page}
          limit={params?.limit}
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by receipt, patient, or bill number..."
                  className="pl-8 w-full h-9"
                />
              </div>
              <ReportsFilterSection dateFrom={dateFrom} dateTo={dateTo} />
            </div>
          }
          toolbarRight={<ReportsToolbar variant="receipts" serverData={handleExport} />}
        />
      </Suspense>
    </div>
  );
}
