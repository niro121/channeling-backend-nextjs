'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DutyRosterRow, DutyRosterViewMode } from '@/types/roster';
import {
  buildDutyMonthCards,
  dutyRangeLabel,
  type DutyBucketCard
} from '@/lib/utils/duty-roster-view';
import DialogDutyRange from './dialog-duty-range';
import SectionDutyViewToolbar from './section-duty-view-toolbar';

type SectionDutyMonthsBoardProps = {
  items: DutyRosterRow[];
  dutyDate: Date;
  viewMode: DutyRosterViewMode;
  onViewChange: (mode: DutyRosterViewMode) => void;
};

export default function SectionDutyMonthsBoard({
  items,
  dutyDate,
  viewMode,
  onViewChange
}: SectionDutyMonthsBoardProps) {
  const cards = useMemo(
    () => buildDutyMonthCards(dutyDate, items),
    [dutyDate, items]
  );
  const [active, setActive] = useState<DutyBucketCard | null>(null);
  const currentMonthIso = `${dutyDate.getFullYear()}-${String(dutyDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => {
    setActive((prev) => {
      if (!prev) return null;
      const next = cards.find((card) => card.id === prev.id);
      if (!next || next.dutyCount === 0) return null;
      return next;
    });
  }, [cards]);

  return (
    <>
      <Card className="overflow-hidden rounded-lg border border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              Duty Months — {dutyRangeLabel(dutyDate, 'months')}
            </CardTitle>
            <CardDescription>
              Twelve months for the selected year. Click a month to view duties.
            </CardDescription>
          </div>
          <SectionDutyViewToolbar
            viewMode={viewMode}
            onViewChange={onViewChange}
          />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => {
              const hasDuties = card.dutyCount > 0;
              const isCurrent = card.fromIso === currentMonthIso;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActive(card)}
                  className={cn(
                    'rounded-lg border px-4 py-4 text-left transition-colors',
                    hasDuties
                      ? 'border-border bg-card hover:border-violet-500/40 hover:bg-violet-50/30'
                      : 'border-dashed border-border bg-muted/20 hover:bg-muted/40',
                    isCurrent && 'ring-1 ring-violet-500/50'
                  )}
                >
                  <p className="text-base font-semibold text-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.subLabel}
                  </p>
                  <p
                    className={cn(
                      'mt-3 text-xs',
                      hasDuties
                        ? 'font-semibold text-violet-700'
                        : 'font-medium text-muted-foreground'
                    )}
                  >
                    {hasDuties
                      ? `${card.dutyCount} duties · ${card.staffCount} staff`
                      : 'No duties'}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DialogDutyRange
        open={!!active}
        title={
          active ? `${active.label} ${active.subLabel}` : 'Month duties'
        }
        description="Staff-grouped duties for the selected month."
        rows={active?.rows ?? []}
        onOpenChange={(next) => {
          if (!next) setActive(null);
        }}
      />
    </>
  );
}
