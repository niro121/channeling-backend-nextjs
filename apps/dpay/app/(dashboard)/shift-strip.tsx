'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@archmage/ui';
import type { ChannelingCashierShift } from '@/lib/channeling/public-api';
import { pauseMyShiftAction, resumeMyShiftAction } from '@/app/actions/shift.actions';

function rupees(cents: number) {
  return (cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function label(shift: ChannelingCashierShift) {
  if (shift.expired) return 'Shift expired';
  if (shift.statusLabel === 'handover_pending') return 'Handover pending';
  if (shift.statusLabel === 'paused') return 'Shift paused';
  return 'Shift active';
}

export function ShiftStrip({ initialShift }: { initialShift: ChannelingCashierShift | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [shift, setShift] = useState(initialShift);
  const [pending, startTransition] = useTransition();

  const run = (action: typeof pauseMyShiftAction) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Shift', description: result.message });
        return;
      }
      setShift(result.shift);
      router.refresh();
    });
  };

  if (!shift) {
    return (
      <p className="hidden text-xs text-muted-foreground sm:block">
        Start your shift in Channeling
      </p>
    );
  }

  const floatNote = shift.floatRequest
    ? shift.floatRequest.status === 'approved'
      ? `Float ${shift.floatRequest.floatNo ?? ''} approved`.trim()
      : `Float ${shift.floatRequest.floatNo ?? ''} pending`.trim()
    : `Float ${rupees(shift.floatBalanceCents)}`;

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="text-right leading-tight">
        <p className="text-xs font-medium">{label(shift)}</p>
        <p className="text-[11px] text-muted-foreground">
          {shift.locationName ?? 'Branch'} · {floatNote}
        </p>
      </div>
      {shift.canPause ? (
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(pauseMyShiftAction)}>
          Pause
        </Button>
      ) : null}
      {shift.canResume ? (
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(resumeMyShiftAction)}>
          Resume
        </Button>
      ) : null}
    </div>
  );
}
