import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CustomDataTable, Button } from '@archmage/ui';
import { Download, Plus } from 'lucide-react';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getPatientBillsAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { patientBillColumns } from './columns';
import PatientBillsFilterSection from './filter-section';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{ page?: string; limit?: string }>;
};

export default async function PatientBillsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/patient-bills');
  if (!canView) redirect('/unauthorized-access');

  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const limit = params?.limit ? Number(params.limit) : 20;

  const { data, totalRecords } = await getPatientBillsAction({ page, limit });

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9" type="button">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button size="sm" className="gap-1.5 h-9" type="button" asChild>
                <Link href="/patient-bills/create">
                  <Plus className="h-4 w-4" />
                  Create Bill
                </Link>
              </Button>
            </div>
          }
          toolbarLeft={<PatientBillsFilterSection />}
        />
      </Suspense>
    </div>
  );
}
