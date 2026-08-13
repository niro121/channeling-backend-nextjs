import { cn } from '@/lib/utils';
import { SHIFT_LEGEND, type ShiftCode } from './sample-data';

const BADGE_STYLES: Record<ShiftCode, string> = {
  D: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  E: 'border-orange-200 bg-orange-50 text-orange-800',
  N: 'border-violet-200 bg-violet-50 text-violet-800',
  O: 'border-border bg-muted text-muted-foreground',
  L: 'border-dashed border-border bg-background text-muted-foreground'
};

export function ShiftLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SHIFT_LEGEND.map((item) => (
        <span
          key={item.code}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            BADGE_STYLES[item.code]
          )}
        >
          <span className="font-semibold">{item.code}</span>
          <span>
            {item.label}
            {item.timeRange !== '—' ? `: ${item.timeRange}` : ''}
          </span>
        </span>
      ))}
    </div>
  );
}
