'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@archmage/ui';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const revenueConfig = {
  value: { label: 'Revenue', color: 'hsl(var(--primary))' }
} satisfies ChartConfig;

function shortDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function RevenueTrendChart({ series }: { series: { date: string; value: number }[] }) {
  const data = series.map((p) => ({ label: shortDay(p.date), value: Math.round(p.value) }));
  return (
    <ChartContainer config={revenueConfig} className="h-[180px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={40}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ChartContainer>
  );
}

const hoursConfig = {
  bookings: { label: 'Bookings', color: 'hsl(var(--primary))' }
} satisfies ChartConfig;

function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/** Bookings made per hour of the day (Colombo), trimmed to the hours that have any. */
export function BookingHoursChart({ byHour }: { byHour: number[] }) {
  const first = byHour.findIndex((n) => n > 0);
  const last = byHour.length - 1 - [...byHour].reverse().findIndex((n) => n > 0);
  const data =
    first < 0 ? [] : byHour.slice(first, last + 1).map((bookings, i) => ({ label: hourLabel(first + i), bookings }));
  return (
    <ChartContainer config={hoursConfig} className="h-[160px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={8} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
