import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInsight } from '@/lib/insights';
import type { Change, InsightRange, SessionFillRow } from '@/types/insights';
import { BookingHoursChart, RevenueTrendChart } from './insight-charts';

// ── Formatting ───────────────────────────────────────────────────────────────────────────

function rs(value: number): string {
  return `Rs ${Math.round(value).toLocaleString('en-US')}`;
}

function pct(value: number | null, digits = 0): string {
  return value == null ? '—' : `${(value * 100).toFixed(digits)}%`;
}

function hour12(h: number): string {
  return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
}

function count(value: number): string {
  return value.toLocaleString('en-US');
}

/** ▲ 12% / ▼ 4% vs the previous period; "New" when there was nothing before. */
function ChangePill({ value, inverse = false, className }: { value: Change; inverse?: boolean; className?: string }) {
  if (value == null) {
    return <span className={cn('text-xs font-medium text-muted-foreground', className)}>New</span>;
  }
  const flat = Math.abs(value) < 0.005;
  const good = inverse ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        flat ? 'text-muted-foreground' : good ? 'text-primary' : 'text-destructive',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {flat ? '0%' : `${Math.abs(value * 100).toFixed(0)}%`}
    </span>
  );
}

function ModuleCard({
  title,
  description,
  className,
  children
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Unavailable({ title, message }: { title: string; message: string }) {
  return (
    <ModuleCard title={title}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </ModuleCard>
  );
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full bg-primary', className)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ModuleSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Modules ──────────────────────────────────────────────────────────────────────────────

export async function RevenueModule({ range }: { range: InsightRange }) {
  const res = await getInsight('revenue', range);
  if (!res.success) return <Unavailable title="Revenue" message={res.message} />;
  const r = res.data;
  return (
    <ModuleCard title="Revenue" description="Nett from paid bookings for sessions in this period">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="text-3xl font-semibold tabular-nums">{rs(r.value)}</p>
        <div className="pb-1 text-sm text-muted-foreground">
          <ChangePill value={r.change} /> <span>vs {rs(r.previous)}</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {count(r.paidBookings)} paid bookings · {rs(r.averagePerBooking)} average
      </p>
      {r.series.length > 1 && (
        <div className="mt-4">
          <RevenueTrendChart series={r.series} />
        </div>
      )}
    </ModuleCard>
  );
}

export async function BookingsModule({ range }: { range: InsightRange }) {
  const res = await getInsight('bookings', range);
  if (!res.success) return <Unavailable title="Bookings & channels" message={res.message} />;
  const b = res.data;
  return (
    <ModuleCard title="Bookings & channels" description="Where bookings come from">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Bookings" value={count(b.total)} hint={<ChangePill value={b.change} />} />
        <Metric label="Paid" value={count(b.paid)} hint={pct(b.total ? b.paid / b.total : null)} />
        <Metric label="Cancelled" value={count(b.cancelled)} />
      </div>
      {b.channels.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-3">
          {b.channels.map((c) => (
            <li key={c.method} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <span>{count(c.bookings)}</span>
                  <span className="text-muted-foreground">{pct(c.share)}</span>
                  <ChangePill value={c.change} />
                </span>
              </div>
              <Bar value={c.share} />
              <p className="text-xs text-muted-foreground">{rs(c.revenue)} revenue</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No bookings in this period.</p>
      )}
    </ModuleCard>
  );
}

export async function TopDoctorsModule({ range }: { range: InsightRange }) {
  const res = await getInsight('top-doctors', range);
  if (!res.success) return <Unavailable title="Top doctors" message={res.message} />;
  const doctors = res.data.doctors;
  return (
    <ModuleCard title="Top doctors" description="Most booked, with how full their sessions are">
      {doctors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings in this period.</p>
      ) : (
        <ol className="flex flex-col divide-y">
          {doctors.map((d, i) => (
            <li key={d.doctorId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[d.speciality, d.fillRate != null ? `${pct(d.fillRate)} full` : null, rs(d.revenue)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-semibold tabular-nums">{count(d.bookings)}</span>
                <ChangePill value={d.change} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModuleCard>
  );
}

function SessionList({ title, rows, tone }: { title: string; rows: SessionFillRow[]; tone: 'good' | 'warn' }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-2.5">
        {rows.map((s) => (
          <li key={s.sessionId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{s.doctorName}</span>
              <span className="shrink-0 tabular-nums">
                {s.booked}/{s.capacity}
              </span>
            </div>
            <Bar value={s.fillRate} className={tone === 'warn' ? 'bg-amber-500' : undefined} />
            <p className="text-xs text-muted-foreground">
              {s.date} · {s.time}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function SessionFillModule({ range }: { range: InsightRange }) {
  const res = await getInsight('session-fill', range);
  if (!res.success) return <Unavailable title="Session fill" message={res.message} />;
  const f = res.data;
  const fillChange = f.fillRate != null && f.previousFillRate ? (f.fillRate - f.previousFillRate) / f.previousFillRate : null;
  return (
    <ModuleCard title="Session fill" description="Booked seats against session capacity">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Fill rate" value={pct(f.fillRate)} hint={f.previousFillRate != null ? <ChangePill value={fillChange} /> : undefined} />
        <Metric label="Sessions" value={count(f.sessions)} />
        <Metric label="Full" value={count(f.fullSessions)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {count(f.booked)} of {count(f.capacity)} seats booked
      </p>
      <SessionList title="Filling fast (upcoming)" rows={f.fillingFast} tone="good" />
      <SessionList title="Under-booked (upcoming)" rows={f.underBooked} tone="warn" />
    </ModuleCard>
  );
}

export async function BookingBehaviourModule({ range }: { range: InsightRange }) {
  const res = await getInsight('booking-behaviour', range);
  if (!res.success) return <Unavailable title="When patients book" message={res.message} />;
  const b = res.data;
  const lead = [
    { label: 'Same day', value: b.leadTime.sameDay },
    { label: '1–2 days ahead', value: b.leadTime.oneToTwoDays },
    { label: '3–7 days ahead', value: b.leadTime.threeToSevenDays },
    { label: 'Over a week', value: b.leadTime.moreThanWeek }
  ];
  const peak = b.peakHour == null ? '—' : `${hour12(b.peakHour)} – ${hour12((b.peakHour + 1) % 24)}`;
  return (
    <ModuleCard title="When patients book" description="Hour the booking was made, and how far ahead">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Busiest hour" value={peak} />
        <Metric
          label="Booked ahead"
          value={b.averageLeadDays == null ? '—' : `${b.averageLeadDays.toFixed(1)} days`}
          hint="on average"
        />
      </div>
      {b.total > 0 && (
        <>
          <div className="mt-4">
            <BookingHoursChart byHour={b.byHour} />
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {lead.map((l) => (
              <li key={l.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span>{l.label}</span>
                  <span className="tabular-nums text-muted-foreground">{pct(b.total ? l.value / b.total : null)}</span>
                </div>
                <Bar value={b.total ? l.value / b.total : 0} />
              </li>
            ))}
          </ul>
        </>
      )}
    </ModuleCard>
  );
}

export async function LeakageModule({ range }: { range: InsightRange }) {
  const res = await getInsight('leakage', range);
  if (!res.success) return <Unavailable title="Lost bookings" message={res.message} />;
  const l = res.data;
  return (
    <ModuleCard title="Lost bookings" description="Cancellations, no-shows and on-call bookings never paid">
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Metric label="Cancelled" value={pct(l.cancelRate, 1)} hint={`${count(l.cancelled)} · ${rs(l.refundAmount)} refunded`} />
        <Metric
          label="No-shows"
          value={pct(l.noShowRate, 1)}
          hint={l.marked ? `${count(l.noShow)} of ${count(l.marked)} marked` : 'No attendance marked'}
        />
        <Metric
          label="On-call paid"
          value={pct(l.onCallConversion)}
          hint={l.onCallPast ? `${count(l.onCallPast - l.onCallUnpaid)} of ${count(l.onCallPast)} past on-call` : 'No past on-call bookings'}
        />
        <Metric label="Unpaid on-call value" value={rs(l.unpaidValue)} hint={`${count(l.onCallUnpaid)} bookings`} />
      </div>
    </ModuleCard>
  );
}

export async function SpecialitiesModule({ range }: { range: InsightRange }) {
  const res = await getInsight('specialities', range);
  if (!res.success) return <Unavailable title="Speciality demand" message={res.message} />;
  const rows = res.data.specialities;
  const max = Math.max(1, ...rows.map((r) => r.bookings));
  return (
    <ModuleCard title="Speciality demand" description="Bookings per speciality and how demand is moving">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings in this period.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((s) => (
            <li key={s.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{s.name}</span>
                <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  {count(s.bookings)}
                  <ChangePill value={s.change} />
                </span>
              </div>
              <Bar value={s.bookings / max} />
            </li>
          ))}
        </ul>
      )}
    </ModuleCard>
  );
}
