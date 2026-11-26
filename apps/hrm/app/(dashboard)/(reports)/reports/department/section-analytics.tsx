'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Selector
} from '@archmage/ui';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { formatAmount, formatLkr, formatLkrCompact } from '@/lib/utils/currency';
import type { ReportChartPoint } from '@/types/reports';

const DONUT_COLORS = [
  'hsl(160 60% 30%)',
  'hsl(152 45% 45%)',
  'hsl(45 80% 45%)',
  'hsl(0 65% 48%)',
  'hsl(215 15% 45%)',
  'hsl(200 55% 40%)',
  'hsl(280 40% 45%)',
  'hsl(25 70% 45%)'
];

const staffChartConfig = {
  value: {
    label: 'Staff',
    color: 'hsl(var(--primary))'
  }
} satisfies ChartConfig;

const payrollChartConfig = {
  value: {
    label: 'Payroll',
    color: 'hsl(160 55% 32%)'
  }
} satisfies ChartConfig;

type ChartViewId = 'staff' | 'payroll';

type SectionAnalyticsProps = {
  staffByDepartment: ReportChartPoint[];
  payrollByDepartment: ReportChartPoint[];
};

function ChartLegend({
  data,
  formatValue
}: {
  data: ReportChartPoint[];
  formatValue: (value: number) => string;
}) {
  if (!data.length) {
    return (
      <p className="mt-3 text-center text-xs text-muted-foreground">
        No chart data for the selected period.
      </p>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((point, index) => (
        <div
          key={point.name}
          className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5 last:border-0 sm:last:border-b"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length]
              }}
            />
            <span
              className="truncate text-sm font-medium text-foreground"
              title={point.name}
            >
              {point.name}
            </span>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatValue(point.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StaffDonutCard({ data }: { data: ReportChartPoint[] }) {
  const chartData = useMemo(
    () => data.map((point) => ({ ...point })),
    [data]
  );

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Staff Distribution by Department
          </CardTitle>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {data.length} groups
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length ? (
          <ChartContainer
            config={staffChartConfig}
            className="mx-auto aspect-square max-h-[260px] w-full"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    formatter={(value) => String(value)}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={95}
                paddingAngle={1}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`staff-cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No staff distribution to chart.
          </div>
        )}
        <ChartLegend data={data} formatValue={(v) => String(v)} />
      </CardContent>
    </Card>
  );
}

function PayrollBarCard({ data }: { data: ReportChartPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        category:
          point.name.length > 14 ? `${point.name.slice(0, 14)}…` : point.name,
        fullName: point.name,
        value: point.value
      })),
    [data]
  );

  return (
    <Card className="rounded-lg border border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Payroll Cost by Department
          </CardTitle>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {data.length} groups
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length ? (
          <ChartContainer
            config={payrollChartConfig}
            className="aspect-[16/10] w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
                height={data.length > 5 ? 56 : 28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tickFormatter={(value: number) =>
                  formatLkrCompact(value, { currency: false })
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatLkr(Number(value))}
                    labelFormatter={(_, payload) => {
                      const full = payload?.[0]?.payload?.fullName;
                      return typeof full === 'string' ? full : '';
                    }}
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`payroll-cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No payroll cost to chart for this period.
          </div>
        )}
        <ChartLegend data={data} formatValue={(v) => formatAmount(v)} />
      </CardContent>
    </Card>
  );
}

export default function SectionAnalytics({
  staffByDepartment,
  payrollByDepartment
}: SectionAnalyticsProps) {
  const [leftView, setLeftView] = useState<ChartViewId>('staff');
  const [rightView, setRightView] = useState<ChartViewId>('payroll');

  const viewOptions = [
    { id: 'staff', name: 'Staff Distribution by Department' },
    { id: 'payroll', name: 'Payroll Cost by Department' }
  ];

  const leftData =
    leftView === 'staff' ? staffByDepartment : payrollByDepartment;
  const rightData =
    rightView === 'staff' ? staffByDepartment : payrollByDepartment;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Report analytics</h2>
        <div className="flex flex-wrap gap-2">
          <Selector
            label="Staff Distribution by Department"
            options={viewOptions}
            value={leftView}
            defaultValue="staff"
            showDefaultOption={false}
            onChange={(value) =>
              setLeftView((value as ChartViewId) || 'staff')
            }
            className={{ trigger: 'w-[260px] max-w-full' }}
          />
          <Selector
            label="Payroll Cost by Department"
            options={viewOptions}
            value={rightView}
            defaultValue="payroll"
            showDefaultOption={false}
            onChange={(value) =>
              setRightView((value as ChartViewId) || 'payroll')
            }
            className={{ trigger: 'w-[260px] max-w-full' }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {leftView === 'staff' ? (
          <StaffDonutCard data={leftData} />
        ) : (
          <PayrollBarCard data={leftData} />
        )}
        {rightView === 'staff' ? (
          <StaffDonutCard data={rightData} />
        ) : (
          <PayrollBarCard data={rightData} />
        )}
      </div>
    </div>
  );
}
