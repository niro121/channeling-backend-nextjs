'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

const MAX_DAYS = 31;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StatementPeriodPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from') ?? todayStr();
  const toParam = searchParams.get('to') ?? todayStr();
  const tillParam = searchParams.get('till');

  const [from, setFrom] = useState(fromParam);
  const [to, setTo] = useState(toParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFrom(fromParam);
    setTo(toParam);
  }, [fromParam, toParam]);

  const apply = useCallback(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError('Invalid date');
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      setError('From date must be before or equal to To date');
      return;
    }
    const days = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
    if (days > MAX_DAYS) {
      setError(`Maximum period is ${MAX_DAYS} days`);
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    if (tillParam) params.set('till', tillParam);
    router.push(`/my-till?${params.toString()}`);
    router.refresh();
  }, [from, to, tillParam, router]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="stmt-from" className="text-xs text-muted-foreground whitespace-nowrap">
          From
        </Label>
        <Input
          id="stmt-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          max={to}
          className="w-[140px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="stmt-to" className="text-xs text-muted-foreground whitespace-nowrap">
          To
        </Label>
        <Input
          id="stmt-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          min={from}
          max={todayStr()}
          className="w-[140px]"
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={apply} className="gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        Apply
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
