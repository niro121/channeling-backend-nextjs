import { formatReportMax } from '@/lib/report-limits';
import PatientDueReportContent from './patient-due-content';

export const dynamic = 'force-dynamic';

export default async function PatientDueReportPage() {

  return <PatientDueReportContent capLabel={formatReportMax()} />;
}
