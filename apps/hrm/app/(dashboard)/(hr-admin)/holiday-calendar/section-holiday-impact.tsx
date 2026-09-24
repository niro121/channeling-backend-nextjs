'use client';

import { List } from 'lucide-react';

const IMPACT_ITEMS = [
  'Payroll pays PH allowance to eligible staff',
  'Shifts on this date default to PH shift template',
  'Leave requests spanning this day skip counting'
] as const;

export default function SectionHolidayImpact() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2">
        <List className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Impact</h3>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {IMPACT_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
