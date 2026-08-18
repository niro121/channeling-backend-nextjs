'use client';

import { cn } from '@/lib/utils';
import type { ShiftCell } from '@/types/roster';

const CHIP_STYLES: Record<string, string> = {
  D: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  E: 'border-orange-200 bg-orange-50 text-orange-900',
  N: 'border-violet-200 bg-violet-50 text-violet-900',
  O: 'border-border bg-muted/60 text-muted-foreground',
  L: 'border-dashed border-border bg-background text-muted-foreground'
};

const DEFAULT_CHIP = 'border-border bg-muted/40 text-foreground';

type ShiftChipProps = {
  shift: ShiftCell;
  onLeaveToggle?: () => void;
  onClick?: () => void;
  compact?: boolean;
};

export function ShiftChip({
  shift,
  onLeaveToggle,
  onClick,
  compact
}: ShiftChipProps) {
  const chipStyle = CHIP_STYLES[shift.code] ?? DEFAULT_CHIP;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'min-w-[6.5rem] rounded-md border px-2 py-1.5 text-left shadow-sm',
        chipStyle,
        compact && 'min-w-[5.5rem] px-1.5 py-1',
        onClick && 'cursor-pointer transition-colors hover:brightness-[0.98]'
      )}
    >
      <p className="text-xs font-semibold leading-tight">{shift.label}</p>
      <p className="text-[10px] leading-tight opacity-80">{shift.timeRange}</p>
      <label
        className="mt-1 flex items-center gap-1 text-[10px] font-medium"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
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
