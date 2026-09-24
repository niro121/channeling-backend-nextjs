'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
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

  useEffect(() => {
    setFrom(fromDate);
    setTo(toDate);
  }, [fromDate, toDate]);

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
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
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
      <Button type="button" variant="secondary" size="sm" onClick={apply} className="gap-1.5 h-10">
        <Calendar className="h-3.5 w-3.5" />
        Apply
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
