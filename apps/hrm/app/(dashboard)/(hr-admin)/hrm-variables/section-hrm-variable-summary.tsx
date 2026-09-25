'use client';

import { Building2, UserRound } from 'lucide-react';
import { formatRatePercent } from '@/types/hrm-variable';
import { useHrmVariableUi } from './hrm-variable-ui-context';

const CARDS = [
  {
    key: 'epfEmployee' as const,
    label: 'EPF (Employee)',
    icon: UserRound,
    iconClass: 'bg-emerald-100 text-emerald-700'
  },
  {
    key: 'epfCompany' as const,
    label: 'EPF (Company)',
    icon: Building2,
    iconClass: 'bg-sky-100 text-sky-700'
  },
  {
    key: 'etfEmployee' as const,
    label: 'ETF (Employee)',
    icon: UserRound,
    iconClass: 'bg-orange-100 text-orange-700'
  },
  {
    key: 'etfCompany' as const,
    label: 'ETF (Company)',
    icon: Building2,
    iconClass: 'bg-lime-100 text-lime-700'
  }
];

export default function SectionHrmVariableSummary() {
  const { record } = useHrmVariableUi();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, iconClass }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {formatRatePercent(record.rates[key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
