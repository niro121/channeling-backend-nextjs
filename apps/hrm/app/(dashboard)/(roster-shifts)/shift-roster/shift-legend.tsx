import { cn } from '@/lib/utils';
import type { ShiftTypeChip } from '@/types/roster';

const BADGE_STYLES: Record<string, string> = {
  D: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  E: 'border-orange-200 bg-orange-50 text-orange-800',
  N: 'border-violet-200 bg-violet-50 text-violet-800',
  O: 'border-border bg-muted text-muted-foreground',
  L: 'border-dashed border-border bg-background text-muted-foreground'
};

const DEFAULT_BADGE = 'border-border bg-muted/40 text-foreground';

type ShiftLegendProps = {
  shiftTypes: ShiftTypeChip[];
};

export function ShiftLegend({ shiftTypes }: ShiftLegendProps) {
  if (shiftTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shiftTypes.map((item) => (
        <span
          key={item.id}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            BADGE_STYLES[item.code] ?? DEFAULT_BADGE
          )}
        >
          <span className="font-semibold">{item.code}</span>
          <span>
            {item.name}
            {item.timeRange !== '—' ? `: ${item.timeRange}` : ''}
          </span>
        </span>
      ))}
    </div>
  );
}
