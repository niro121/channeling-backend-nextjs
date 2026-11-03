import { Badge } from '@archmage/ui';
import {
  APPOINTMENT_LETTER_STATUS_LABELS,
  type AppointmentLetterStatus
} from '@/types/recruitment';

const statusClassName: Record<AppointmentLetterStatus, string> = {
  draft: 'border-0 bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending_approval: 'border-0 bg-amber-100 text-amber-800 hover:bg-amber-100',
  issued: 'border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  accepted: 'border-0 bg-teal-100 text-teal-800 hover:bg-teal-100',
  declined: 'border-0 bg-red-100 text-red-700 hover:bg-red-100'
};

export default function AppointmentLetterStatusBadge({
  status
}: {
  status: AppointmentLetterStatus;
}) {
  return (
    <Badge variant="secondary" className={statusClassName[status]}>
      {APPOINTMENT_LETTER_STATUS_LABELS[status]}
    </Badge>
  );
}
