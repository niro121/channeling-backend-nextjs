'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DutyRosterRow, DutyRosterViewMode } from '@/types/roster';
import {
  buildDutyWeekCards,
  dutyRangeLabel,
  type DutyBucketCard
} from '@/lib/utils/duty-roster-view';
import DialogDutyRange from './dialog-duty-range';
import SectionDutyViewToolbar from './section-duty-view-toolbar';

type SectionDutyWeeksBoardProps = {
  items: DutyRosterRow[];
  dutyDate: Date;
  viewMode: DutyRosterViewMode;
  onViewChange: (mode: DutyRosterViewMode) => void;
};

export default function SectionDutyWeeksBoard({
  items,
  dutyDate,
  viewMode,
  onViewChange
}: SectionDutyWeeksBoardProps) {
  const cards = useMemo(
    () => buildDutyWeekCards(dutyDate, items),
    [dutyDate, items]
  );
  const [active, setActive] = useState<DutyBucketCard | null>(null);

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
              Duty Weeks — {dutyRangeLabel(dutyDate, 'weeks')}
            </CardTitle>
            <CardDescription>
              Week cards (Sun–Sat) for this month. Click a week to view duties.
            </CardDescription>
          </div>
          <SectionDutyViewToolbar
            viewMode={viewMode}
            onViewChange={onViewChange}
          />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const hasDuties = card.dutyCount > 0;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActive(card)}
                  className={cn(
                    'rounded-lg border px-4 py-4 text-left transition-colors',
                    hasDuties
                      ? 'border-border bg-card hover:border-sky-500/40 hover:bg-sky-50/40'
                      : 'border-dashed border-border bg-muted/20 hover:bg-muted/40'
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
                        ? 'font-semibold text-sky-700'
                        : 'font-medium text-muted-foreground'
                    )}
                  >
                    {hasDuties
                      ? `${card.dutyCount} duties · ${card.staffCount} staff`
                      : 'No duties this week'}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DialogDutyRange
        open={!!active}
        title={active ? `${active.label} — ${active.subLabel}` : 'Week duties'}
        description="Staff-grouped duties for the selected week."
        rows={active?.rows ?? []}
        onOpenChange={(next) => {
          if (!next) setActive(null);
        }}
      />
    </>
  );
}
