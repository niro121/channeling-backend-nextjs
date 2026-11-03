'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import type { SalaryBreakdownChartPoint } from '@/types/payroll';

type SectionSalaryChartsProps = {
  earnings: SalaryBreakdownChartPoint[];
  deductions: SalaryBreakdownChartPoint[];
};

const earningsChartConfig = {
  amount: {
    label: 'Amount',
    color: 'hsl(var(--primary))'
  }
} satisfies ChartConfig;

const deductionsChartConfig = {
  amount: {
    label: 'Amount',
    color: 'hsl(142 45% 40%)'
  }
} satisfies ChartConfig;

function BreakdownChartCard({
  title,
  data,
  config
}: {
  title: string;
  data: SalaryBreakdownChartPoint[];
  config: ChartConfig;
}) {
  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-[16/9] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value: number) => formatAmount(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatLkr(Number(value))}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function SectionSalaryCharts({
  earnings,
  deductions
}: SectionSalaryChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BreakdownChartCard
        title="Earnings Breakdown"
        data={earnings}
        config={earningsChartConfig}
      />
      <BreakdownChartCard
        title="Deductions Breakdown"
        data={deductions}
        config={deductionsChartConfig}
      />
    </div>
  );
}
