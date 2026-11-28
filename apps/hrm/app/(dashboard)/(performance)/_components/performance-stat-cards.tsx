import type { ReactNode } from 'react';
import { Card, CardContent } from '@archmage/ui';

export type PerformanceStatCardItem = {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** Tailwind classes for the round icon background, e.g. `bg-amber-50`. */
  iconWrapClass?: string;
};

type PerformanceStatCardsProps = {
  items: PerformanceStatCardItem[];
};

/** KPI card row shared by the Performance sub-pages. */
export default function PerformanceStatCards({
  items
}: PerformanceStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              {item.icon ? (
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass ?? 'bg-muted'}`}
                >
                  {item.icon}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
