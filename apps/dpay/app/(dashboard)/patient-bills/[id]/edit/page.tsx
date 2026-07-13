import { notFound, redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import { getPatientBillByIdAction } from '@/app/actions/patient-bills/patient-bills.actions';
import { PatientBillForm } from '@/components/patient-bills/patient-bill-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPatientBillPage({ params }: PageProps) {
  const canEdit = await checkPermission('patient-bills', 'edit');
  if (!canEdit) redirect('/unauthorized-access');

  const { id } = await params;
  const result = await getPatientBillByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <PatientBillForm bill={result.data} isEditPage />;
}
