import { Suspense } from 'react';
import Link from 'next/link';
import { Button, SearchInput } from '@archmage/ui';
import { Plus } from 'lucide-react';
import {
  getDoctorPaymentsAction,
  getDoctorPaymentsExportAction,
} from '@/app/actions/doctor-payments/doctor-payments.actions';
import { DOCTOR_PAYMENT_METHODS, DOCTOR_PAYMENT_STATUSES } from '@/types/doctor-payment';
import DoctorPaymentsFilterSection from './filter-section';
import { DoctorPaymentsTableWithDialog } from './doctor-payments-view-context';
import { DoctorPaymentsExcelButton } from './doctor-payments-excel-button';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    method?: string;
    doctorName?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function DoctorPaymentsPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const method = params?.method;
  const doctorName = params?.doctorName;
  const status = params?.status;
  const dateFrom = params?.dateFrom || undefined;
  const dateTo = params?.dateTo || undefined;

  const { data, totalRecords } = await getDoctorPaymentsAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    method: method && method !== '__all__' ? method : undefined,
    doctorName: doctorName && doctorName !== '__all__' ? doctorName : undefined,
    status: status && status !== '__all__' ? status : undefined,
    dateFrom,
    dateTo,
  });

  async function handleExport() {
    'use server';
    return getDoctorPaymentsExportAction({
      keyword: params?.keyword ?? undefined,
      method: method && method !== '__all__' ? method : undefined,
      doctorName: doctorName && doctorName !== '__all__' ? doctorName : undefined,
      status: status && status !== '__all__' ? status : undefined,
      dateFrom,
      dateTo,
    });
  }

  const dateRangeLabel =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : dateTo
          ? `Up to ${dateTo}`
          : null;

  const excelSummaryItems = [
    ...(dateRangeLabel
      ? [{ label: 'Date Range', value: dateRangeLabel, fullWidth: true }]
      : []),
    { label: 'Search', value: params?.keyword || 'All' },
    { label: 'Doctor', value: doctorName && doctorName !== '__all__' ? doctorName : 'All' },
    {
      label: 'Method',
      value: DOCTOR_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? 'All',
    },
    {
      label: 'Status',
      value: DOCTOR_PAYMENT_STATUSES.find((s) => s.value === status)?.label ?? 'All',
    },
  ];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <DoctorPaymentsTableWithDialog
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          headingRight={
            <div className="flex items-center gap-2">
              <DoctorPaymentsExcelButton serverData={handleExport} summaryItems={excelSummaryItems} />
              <Button size="sm" className="gap-1.5 h-9" type="button" asChild>
                <Link href="/doctor-payments/make">
                  <Plus className="h-4 w-4" />
                  Create Doctor Payment
                </Link>
              </Button>
            </div>
          }
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search receipt no, doctor, remarks..."
                  className="pl-8 w-full h-9"
                />
              </div>
              <DoctorPaymentsFilterSection
                method={params?.method}
                status={params?.status}
                dateFrom={params?.dateFrom}
                dateTo={params?.dateTo}
              />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
