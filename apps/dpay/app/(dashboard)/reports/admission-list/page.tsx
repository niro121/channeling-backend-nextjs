import { formatReportMax } from '@/lib/report-limits';
import AdmissionListReportContent from './admission-list-content';

export const dynamic = 'force-dynamic';

export default async function AdmissionListReportPage() {

  return <AdmissionListReportContent capLabel={formatReportMax()} />;
}
