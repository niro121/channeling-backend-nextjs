import {
  getDoctorsForPaymentAction,
  getStaffForDoctorPaymentAction,
} from '@/app/actions/doctor-payments/doctor-payments.actions';
import { MakeDoctorPaymentClient } from './make-doctor-payment-client';

export default async function MakeDoctorPaymentPage() {
  const [doctors, staff] = await Promise.all([
    getDoctorsForPaymentAction(),
    getStaffForDoctorPaymentAction(),
  ]);

  return <MakeDoctorPaymentClient doctors={doctors} staff={staff} />;
}
