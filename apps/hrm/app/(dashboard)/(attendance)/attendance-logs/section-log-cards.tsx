import type { ReactNode } from 'react';
import { FileWarning, Fingerprint, PenLine, ScrollText } from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import type { AttendanceLogCards } from '@/types/attendance';

type SummaryCard = {
  label: string;
  value: string;
  subText: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionLogCardsProps = {
  cards: AttendanceLogCards;
};

export default function SectionLogCards({ cards }: SectionLogCardsProps) {
  const items: SummaryCard[] = [
    {
      label: 'Log Events',
      value: cards.logEvents.toLocaleString(),
      subText: 'Current salary cycle',
      icon: <ScrollText className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'System Generated',
      value: cards.systemGenerated.toLocaleString(),
      subText: 'Roster and RFID events',
      icon: <Fingerprint className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Manual Updates',
      value: cards.manualUpdates.toLocaleString(),
      subText: 'Authorized users',
      icon: <PenLine className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    },
    {
      label: 'Rejected Changes',
      value: cards.rejectedChanges.toLocaleString(),
      subText: 'Retained for audit',
      icon: <FileWarning className="h-4 w-4 text-red-600" />,
      iconWrapClass: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium uppercase text-muted-foreground">
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
            <p className="mt-1 text-xs text-muted-foreground">{item.subText}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
