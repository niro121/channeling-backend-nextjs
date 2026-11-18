import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, SearchInput } from '@archmage/ui';
import { Plus } from 'lucide-react';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { getDoctorPaymentsAction } from '@/app/actions/doctor-payments/doctor-payments.actions';
import DoctorPaymentsFilterSection from './filter-section';
import { DoctorPaymentsTableWithDialog } from './doctor-payments-view-context';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    keyword?: string;
    method?: string;
    doctorName?: string;
    status?: string;
  }>;
};

export default async function DoctorPaymentsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/doctor-payments');
  if (!canView) redirect('/unauthorized-access');

  const canAdd = await checkPermission('doctor-payments', 'add');
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;
  const method = params?.method;
  const doctorName = params?.doctorName;
  const status = params?.status;

  const { data, totalRecords } = await getDoctorPaymentsAction({
    page,
    limit,
    keyword: params?.keyword ?? undefined,
    method: method && method !== '__all__' ? method : undefined,
    doctorName: doctorName && doctorName !== '__all__' ? doctorName : undefined,
    status: status && status !== '__all__' ? status : undefined,
  });

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <DoctorPaymentsTableWithDialog
          data={data}
          totalRecords={totalRecords}
          page={params?.page}
          limit={params?.limit}
          headingRight={
            canAdd ? (
              <Button size="sm" className="gap-1.5 h-9" type="button" asChild>
                <Link href="/doctor-payments/make">
                  <Plus className="h-4 w-4" />
                  Create Doctor Payment
                </Link>
              </Button>
            ) : null
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
              />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
