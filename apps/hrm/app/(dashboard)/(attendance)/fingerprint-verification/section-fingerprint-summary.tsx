import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { FingerprintVerificationSummary } from '@/types/attendance';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionFingerprintSummaryProps = {
  summary: FingerprintVerificationSummary;
};

export default function SectionFingerprintSummary({
  summary
}: SectionFingerprintSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Verified',
      value: String(summary.verified),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Late',
      value: String(summary.late),
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Missing Punch',
      value: String(summary.missingPunch),
      icon: <Fingerprint className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Early Out',
      value: String(summary.earlyOut),
      icon: <AlertTriangle className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
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
