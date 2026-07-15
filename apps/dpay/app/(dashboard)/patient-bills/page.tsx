import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CustomDataTable, Button, SearchInput } from '@archmage/ui';
import { Plus } from 'lucide-react';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getPatientBillsAction } from '@/app/actions/patient-bills/patient-bills.actions';
import type { PatientBillStatus } from '@/types/patient-bill';
import { patientBillColumns } from './columns';
import PatientBillsFilterSection from './filter-section';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

const VALID_STATUSES: PatientBillStatus[] = ['pending', 'partial', 'paid', 'closed'];

export default async function PatientBillsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/patient-bills');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const statusParam = params?.status;
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as PatientBillStatus)
      ? (statusParam as PatientBillStatus)
      : undefined;

  const { data, totalRecords } = await getPatientBillsAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    status,
    dateFrom: params?.dateFrom ?? undefined,
    dateTo: params?.dateTo ?? undefined,
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Patient Bills"
          subHeading="Bills raised for admitted patients."
          columns={patientBillColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={params?.page}
          limit={params?.limit}
          headingRight={
            <Button size="sm" className="gap-1.5 h-9" type="button" asChild>
              <Link href="/patient-bills/create">
                <Plus className="h-4 w-4" />
                Create Bill
              </Link>
            </Button>
          }
          toolbarLeft={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <SearchInput
                  name="keyword"
                  placeholder="Search by bill no. or patient"
                  className="pl-8 w-full h-9"
                />
              </div>
              <PatientBillsFilterSection
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
