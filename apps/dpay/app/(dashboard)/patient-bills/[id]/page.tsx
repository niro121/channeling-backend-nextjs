import { notFound, redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { getPatientBillByIdAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { PatientBillDetailView } from '@/components/patient-bills/patient-bill-detail';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientBillDetailPage({ params }: PageProps) {
  const canView = await checkRouteAccess('/patient-bills');
  if (!canView) redirect('/unauthorized-access');

  const { id } = await params;
  const result = await getPatientBillByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <PatientBillDetailView bill={result.data} />;
}
