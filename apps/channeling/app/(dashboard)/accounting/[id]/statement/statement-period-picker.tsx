'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/common/date-range-picker';

type Props = {
  fromDate: string;
  toDate: string;
};

export function StatementPeriodPicker({ fromDate, toDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApplying, setIsApplying] = useState(false);
  const expectedKeyRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearApplying = useCallback(() => {
    setIsApplying(false);
    expectedKeyRef.current = null;
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    setFrom(fromDate);
    setTo(toDate);
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!isApplying || expectedKeyRef.current == null) return;
    if (`${fromDate}|${toDate}` !== expectedKeyRef.current) return;
    clearApplying();
  }, [isApplying, fromDate, toDate, clearApplying]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const showLoading = isPending || isApplying;

  const apply = () => {
    const nextFrom = from || to;
    const nextTo = to || from;
    if (!nextFrom || !nextTo) {
      setError('Select a date range');
      return;
    }
    if (nextFrom > nextTo) {
      setError('From date must be before or equal to To date');
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    params.set('fromDate', nextFrom);
    params.set('toDate', nextTo);
    const unchanged = nextFrom === fromDate && nextTo === toDate;
    if (unchanged) {
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    expectedKeyRef.current = `${nextFrom}|${nextTo}`;
    setIsApplying(true);
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      clearApplying();
    }, 15000);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker
        from={from}
        to={to}
        onChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom ?? '');
          setTo(nextTo ?? nextFrom ?? '');
          setError(null);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={apply}
        disabled={showLoading}
        aria-busy={showLoading}
        className="gap-1.5 h-10"
      >
        {showLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Calendar className="h-3.5 w-3.5" />
        )}
        Apply
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
