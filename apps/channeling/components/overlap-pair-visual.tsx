import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OverlapSide = {
  id: string;
  name: string;
  timeLabel: string;
  detail?: string;
  appointmentCount?: number;
  generatedLabel?: string;
  onLeave?: boolean;
  startMinutes: number;
  endMinutes: number;
};

function barStyle(start: number, end: number, min: number, span: number) {
  const left = ((start - min) / span) * 100;
  const width = Math.max(((end - start) / span) * 100, 1.5);
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
}

function TimeTrack({
  start,
  end,
  min,
  span,
  className
}: {
  start: number;
  end: number;
  min: number;
  span: number;
  className: string;
}) {
  return (
    <div className="relative h-2.5 w-full rounded-full bg-muted">
      <div className={`absolute top-0 h-2.5 rounded-full ${className}`} style={barStyle(start, end, min, span)} />
    </div>
  );
}

export function OverlapPairVisual({
  dayLabel,
  left,
  right,
  leftHref,
  rightHref,
  onEditLeft,
  onEditRight
}: {
  dayLabel: string;
  left: OverlapSide;
  right: OverlapSide;
  leftHref?: string;
  rightHref?: string;
  onEditLeft?: () => void;
  onEditRight?: () => void;
}) {
  const min = Math.min(left.startMinutes, right.startMinutes);
  const max = Math.max(left.endMinutes, right.endMinutes);
  const span = Math.max(max - min, 1);

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{dayLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <SessionSide
          side={left}
          href={leftHref}
          onEdit={onEditLeft}
          trackClassName="bg-primary"
          min={min}
          span={span}
        />
        <SessionSide
          side={right}
          href={rightHref}
          onEdit={onEditRight}
          trackClassName="bg-destructive"
          min={min}
          span={span}
        />
      </div>
    </div>
  );
}

function SessionFacts({ side }: { side: OverlapSide }) {
  if (side.appointmentCount == null && !side.generatedLabel && side.onLeave == null) return null;
  const appointments =
    side.appointmentCount == null
      ? null
      : `${side.appointmentCount} appointment${side.appointmentCount === 1 ? '' : 's'}`;

  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      {appointments ? <p>{appointments}</p> : null}
      {side.generatedLabel ? <p>Created {side.generatedLabel}</p> : null}
      {side.onLeave == null ? null : side.onLeave ? (
        <p className="font-medium text-destructive">On leave</p>
      ) : (
        <p>Not on leave</p>
      )}
    </div>
  );
}

function SessionSide({
  side,
  href,
  onEdit,
  trackClassName,
  min,
  span
}: {
  side: OverlapSide;
  href?: string;
  onEdit?: () => void;
  trackClassName: string;
  min: number;
  span: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{side.name}</p>
          <p className="text-xs text-muted-foreground">
            {side.timeLabel}
            {side.detail ? ` · ${side.detail}` : ''}
          </p>
          <SessionFacts side={side} />
        </div>
        {href ? (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={href}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        ) : onEdit ? (
          <Button variant="outline" size="sm" className="shrink-0" type="button" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
      </div>
      <TimeTrack
        start={side.startMinutes}
        end={side.endMinutes}
        min={min}
        span={span}
        className={trackClassName}
      />
    </div>
  );
}
