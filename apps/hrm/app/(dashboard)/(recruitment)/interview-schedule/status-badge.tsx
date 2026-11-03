import { Badge } from '@archmage/ui';
import {
  INTERVIEW_STATUS_LABELS,
  type InterviewStatus
} from '@/types/recruitment';

const statusClassName: Record<InterviewStatus, string> = {
  scheduled: 'border border-slate-300 bg-transparent text-slate-600 hover:bg-transparent',
  confirmed: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  rescheduled: 'border-0 bg-orange-100 text-orange-800 hover:bg-orange-100',
  completed:
    'border border-emerald-600 bg-transparent text-emerald-700 hover:bg-transparent',
  no_show: 'border-0 bg-red-100 text-red-700 hover:bg-red-100',
  cancelled: 'border-0 bg-red-600 text-white hover:bg-red-600'
};

export default function InterviewStatusBadge({
  status
}: {
  status: InterviewStatus;
}) {
  return (
    <Badge variant="secondary" className={statusClassName[status]}>
      {INTERVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
