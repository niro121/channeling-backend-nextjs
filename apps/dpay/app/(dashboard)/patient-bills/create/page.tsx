import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import { PatientBillForm } from '@/components/patient-bills/patient-bill-form';

export default async function CreatePatientBillPage() {
  const canAdd = await checkPermission('patient-bills', 'add');
  if (!canAdd) redirect('/unauthorized-access');

  return <PatientBillForm />;
}
