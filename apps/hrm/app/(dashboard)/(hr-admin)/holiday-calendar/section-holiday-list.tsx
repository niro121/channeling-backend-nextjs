'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { Button, Input, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { holidayTypeLabel } from '@/lib/helpers/holiday-type.helper';
import { useHolidayCalendarUi } from './holiday-calendar-ui-context';

export default function SectionHolidayList() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const {
    records,
    selectedId,
    setSelectedId,
    startNewHoliday,
    year,
    search,
    setSearch
  } = useHolidayCalendarUi();

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => {
        if (!query) return true;
        return (
          record.name.toLowerCase().includes(query) ||
          record.code.toLowerCase().includes(query) ||
          holidayTypeLabel(record.typeId).toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(`${a.date.slice(0, 10)}T00:00:00`).getTime() -
          new Date(`${b.date.slice(0, 10)}T00:00:00`).getTime()
      );
  }, [records, search]);

  const changeYear = (nextYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(nextYear));
    params.delete('id');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleAdd = () => {
    startNewHoliday();
    toast({
      title: 'Add new holiday',
      description: 'Enter the holiday details in the form on the right, then click Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('holiday-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card">
      <div className="border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Holidays
        </h2>
      </div>

      <div className="border-b border-primary/10 px-3 py-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holidays…"
            className="w-full rounded-md border-primary/15 pl-9"
            aria-label="Search holidays"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {isPending ? 'Loading…' : `No holidays for ${year}.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
              const dateLabel = format(
                parseISO(`${record.date.slice(0, 10)}T00:00:00`),
                'yyyy.MM.dd'
              );
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/15 ring-1 ring-primary/30'
                        : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                    )}
                  >
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {record.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dateLabel} · {holidayTypeLabel(record.typeId)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-primary/10 px-3 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year - 1)}
            disabled={isPending}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-sm font-medium">{year}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeYear(year + 1)}
            disabled={isPending}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
