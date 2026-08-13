'use client';

import { cn } from '@/lib/utils';
import type { ShiftCellSample, ShiftCode } from './sample-data';

const CHIP_STYLES: Record<ShiftCode, string> = {
  D: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  E: 'border-orange-200 bg-orange-50 text-orange-900',
  N: 'border-violet-200 bg-violet-50 text-violet-900',
  O: 'border-border bg-muted/60 text-muted-foreground',
  L: 'border-dashed border-border bg-background text-muted-foreground'
};

type ShiftChipProps = {
  shift: ShiftCellSample;
  onLeaveToggle?: () => void;
  compact?: boolean;
};

export function ShiftChip({ shift, onLeaveToggle, compact }: ShiftChipProps) {
  return (
    <div
      className={cn(
        'min-w-[6.5rem] rounded-md border px-2 py-1.5 text-left shadow-sm',
        CHIP_STYLES[shift.code],
        compact && 'min-w-[5.5rem] px-1.5 py-1'
      )}
    >
      <p className="text-xs font-semibold leading-tight">{shift.label}</p>
      <p className="text-[10px] leading-tight opacity-80">{shift.timeRange}</p>
      <label className="mt-1 flex items-center gap-1 text-[10px] font-medium">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-border"
          checked={shift.isLeave}
          onChange={onLeaveToggle}
          onClick={(e) => e.stopPropagation()}
        />
        Leave
      </label>
    </div>
  );
}
