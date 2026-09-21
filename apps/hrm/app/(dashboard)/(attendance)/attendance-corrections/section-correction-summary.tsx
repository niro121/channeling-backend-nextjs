import type { ReactNode } from 'react';
import { Ban, CheckCircle2, Clock, FilePenLine } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { AttendanceCorrectionSummary } from '@/types/attendance';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionCorrectionSummaryProps = {
  summary: AttendanceCorrectionSummary;
};

export default function SectionCorrectionSummary({
  summary
}: SectionCorrectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Corrections',
      value: String(summary.totalCorrections),
      subText: 'All requests',
      icon: <FilePenLine className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Pending Approval',
      value: String(summary.pendingApproval),
      subText: 'Draft + pending',
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Approved',
      value: String(summary.approved),
      subText: 'Applied to daily attendance',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Rejected',
      value: String(summary.rejected),
      subText: 'Daily attendance unchanged',
      icon: <Ban className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-medium uppercase text-muted-foreground">
                {item.label}
              </p>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass}`}
              >
                {item.icon}
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{item.subText}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
