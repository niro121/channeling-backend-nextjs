import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Mail, XCircle } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { AppointmentLetterSummary } from '@/types/recruitment';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: AppointmentLetterSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Offers Extended',
      value: String(summary.offersExtended),
      icon: <Mail className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Pending Approval',
      value: String(summary.pendingApproval),
      icon: <Clock className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    },
    {
      label: 'Accepted',
      value: String(summary.accepted),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Declined',
      value: String(summary.declined),
      icon: <XCircle className="h-4 w-4 text-red-700" />,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
