import { getDoctorsForPaymentAction } from '@/app/actions/doctor-payments/doctor-payments.actions';
import { MakeDoctorPaymentClient } from './make-doctor-payment-client';

export default async function MakeDoctorPaymentPage() {
  const doctors = await getDoctorsForPaymentAction();

  return <MakeDoctorPaymentClient doctors={doctors} />;
}
