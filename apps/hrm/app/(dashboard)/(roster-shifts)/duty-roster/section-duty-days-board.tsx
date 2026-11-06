'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DutyRosterRow, DutyRosterViewMode } from '@/types/roster';
import {
  buildDutyDayCards,
  dutyRangeLabel,
  type DutyBucketCard
} from '@/lib/utils/duty-roster-view';
import DialogDutyRange from './dialog-duty-range';
import SectionDutyViewToolbar from './section-duty-view-toolbar';

type SectionDutyDaysBoardProps = {
  items: DutyRosterRow[];
  dutyDate: Date;
  viewMode: DutyRosterViewMode;
  onViewChange: (mode: DutyRosterViewMode) => void;
};

export default function SectionDutyDaysBoard({
  items,
  dutyDate,
  viewMode,
  onViewChange
}: SectionDutyDaysBoardProps) {
  const cards = useMemo(
    () => buildDutyDayCards(dutyDate, items),
    [dutyDate, items]
  );
  const [active, setActive] = useState<DutyBucketCard | null>(null);
  const todayIso = format(new Date(), 'yyyy-MM-dd');

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
              Duty Days — {dutyRangeLabel(dutyDate, 'days')}
            </CardTitle>
            <CardDescription>
              One card per day. Click a day to view duties for that date.
            </CardDescription>
          </div>
          <SectionDutyViewToolbar
            viewMode={viewMode}
            onViewChange={onViewChange}
          />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {cards.map((card) => {
              const isToday = card.id === todayIso;
              const hasDuties = card.dutyCount > 0;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActive(card)}
                  className={cn(
                    'flex min-h-24 flex-col rounded-lg border px-3 py-2.5 text-left transition-colors',
                    hasDuties
                      ? 'border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-50/40'
                      : 'border-dashed border-border bg-muted/20 hover:bg-muted/40',
                    isToday && 'ring-1 ring-emerald-500/60'
                  )}
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {card.subLabel}
                  </span>
                  <span className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
                    {card.label}
                  </span>
                  <span
                    className={cn(
                      'mt-auto pt-2 text-xs',
                      hasDuties
                        ? 'font-semibold text-emerald-700'
                        : 'text-muted-foreground'
                    )}
                  >
                    {hasDuties
                      ? `${card.dutyCount} duty · ${card.staffCount} staff`
                      : 'No duties'}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DialogDutyRange
        open={!!active}
        title={
          active
            ? `Duties — ${format(new Date(active.fromIso + 'T00:00:00'), 'EEE dd MMM yyyy')}`
            : 'Duties'
        }
        description="Staff-grouped duties for the selected day."
        rows={active?.rows ?? []}
        onOpenChange={(next) => {
          if (!next) setActive(null);
        }}
      />
    </>
  );
}
