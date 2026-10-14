'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@archmage/ui';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartConfig = {
  users: { label: 'Users', color: 'hsl(var(--primary))' }
} satisfies ChartConfig;

export function UsersByAppChart({ data }: { data: { label: string; users: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <Bar dataKey="users" fill="var(--color-users)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  );
}
