import { formatReportMax } from '@/lib/report-limits';
import DoctorDueReportContent from './doctor-due-content';

export const dynamic = 'force-dynamic';

export default async function DoctorDuePaymentReportPage() {

  return <DoctorDueReportContent capLabel={formatReportMax()} />;
}
