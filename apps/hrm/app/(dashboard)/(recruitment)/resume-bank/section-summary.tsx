import type { ReactNode } from 'react';
import { FileStack, Link2, Stethoscope, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { ResumeBankSummary } from '@/types/recruitment';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: ResumeBankSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Profiles in Bank',
      value: summary.profilesInBank.toLocaleString('en-US'),
      icon: <FileStack className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Added This Month',
      value: String(summary.addedThisMonth),
      icon: <UserPlus className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Linked to Applications',
      value: String(summary.linkedToApplications),
      icon: <Link2 className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Clinical Profiles',
      value: `${summary.clinicalProfilesPercent}%`,
      icon: <Stethoscope className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
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
