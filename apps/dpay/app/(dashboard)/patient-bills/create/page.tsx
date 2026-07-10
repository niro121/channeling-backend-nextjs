import { redirect } from 'next/navigation';
import { checkPermission } from '@/lib/server-permissions';
import { generateBillNumbersAction } from '@/app/actions/patient-bills/generate-bill-numbers.action';
import { PatientBillForm } from '@/components/patient-bills/patient-bill-form';

export default async function CreatePatientBillPage() {
  const canAdd = await checkPermission('patient-bills', 'add');
  if (!canAdd) redirect('/unauthorized-access');

  const initialNumbers = await generateBillNumbersAction();

  return <PatientBillForm initialNumbers={initialNumbers} />;
}
