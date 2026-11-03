import type { ReactNode } from 'react';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Handshake,
  Search,
  UserCheck,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { ApplicationSummary } from '@/types/recruitment';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: ApplicationSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Applied',
      value: String(summary.applied),
      icon: <ClipboardList className="h-4 w-4 text-slate-600" />,
      iconWrapClass: 'bg-slate-100'
    },
    {
      label: 'Screening',
      value: String(summary.screening),
      icon: <Search className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Shortlisted',
      value: String(summary.shortlisted),
      icon: <UserCheck className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Interview',
      value: String(summary.interview),
      icon: <Users className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Selected',
      value: String(summary.selected),
      icon: <FileCheck2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Offer',
      value: String(summary.offer),
      icon: <Handshake className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Hired',
      value: String(summary.hired),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Rejected',
      value: String(summary.rejected),
      icon: <Ban className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      {cards.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {item.label}
              </p>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass}`}
              >
                {item.icon}
              </span>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
