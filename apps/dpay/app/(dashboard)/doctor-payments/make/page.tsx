import { redirect } from 'next/navigation';
import { checkRouteAccess, checkPermission } from '@/lib/server-permissions';
import { getDoctorsForPaymentAction } from '@/app/actions/doctor-payments/doctor-payments.actions';
import { MakeDoctorPaymentClient } from './make-doctor-payment-client';

export default async function MakeDoctorPaymentPage() {
  const canView = await checkRouteAccess('/doctor-payments');
  if (!canView) redirect('/unauthorized-access');

  const canAdd = await checkPermission('doctor-payments', 'add');
  if (!canAdd) redirect('/unauthorized-access');

  const doctors = await getDoctorsForPaymentAction();

  return <MakeDoctorPaymentClient doctors={doctors} />;
}
