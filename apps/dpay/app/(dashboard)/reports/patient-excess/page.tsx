import { formatReportMax } from '@/lib/report-limits';
import PatientExcessReportContent from './patient-excess-content';

export const dynamic = 'force-dynamic';

export default async function PatientExcessReportPage() {

  return <PatientExcessReportContent capLabel={formatReportMax()} />;
}
