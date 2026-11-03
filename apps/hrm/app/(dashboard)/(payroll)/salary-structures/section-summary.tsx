import type { ReactNode } from 'react';
import { FileText, Layers, PencilLine, Users } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import type { SalaryStructureSummary } from '@/types/payroll';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryProps = {
  summary: SalaryStructureSummary;
};

export default function SectionSummary({ summary }: SectionSummaryProps) {
  const cards: SummaryCard[] = [
    {
      label: 'Total Structures',
      value: formatAmount(summary.totalStructures),
      subText: 'All salary templates',
      icon: <Layers className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Active',
      value: formatAmount(summary.active),
      subText: 'Currently in use',
      icon: <FileText className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Draft',
      value: formatAmount(summary.draft),
      subText: 'Not yet published',
      icon: <PencilLine className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Staff Covered',
      value: formatAmount(summary.staffCovered),
      subText: 'Assigned to a structure',
      icon: <Users className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
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
