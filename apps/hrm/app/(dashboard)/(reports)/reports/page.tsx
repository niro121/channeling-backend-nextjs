import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  Clock,
  FileBarChart2,
  PieChart,
  Users,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { checkRouteAccess } from '@/lib/server-permissions';

const REPORT_LINKS = [
  {
    href: '/reports/department',
    title: 'Department Reports',
    description:
      'Department workforce, staffing gaps, attendance and payroll comparisons.',
    icon: Building2,
    ready: true
  },
  {
    href: '/reports/staff',
    title: 'Staff Reports',
    description: 'Staff registers, employment status and headcount summaries.',
    icon: Users,
    ready: false
  },
  {
    href: '/reports/attendance',
    title: 'Attendance Reports',
    description: 'Present, late, absent and missing-punch analytics.',
    icon: FileBarChart2,
    ready: false
  },
  {
    href: '/reports/payroll',
    title: 'Payroll Reports',
    description: 'Payroll cost, statutory and payslip summaries by period.',
    icon: Wallet,
    ready: false
  },
  {
    href: '/reports/overtime',
    title: 'OT Reports',
    description: 'Approved overtime hours and cost by staff and department.',
    icon: Clock,
    ready: false
  },
  {
    href: '/reports/leave',
    title: 'Leave Reports',
    description: 'Leave utilization, balances and department leave load.',
    icon: CalendarDays,
    ready: false
  },
  {
    href: '/reports/statistical',
    title: 'Statistical Reports',
    description: 'Cross-module charts and hospital-wide KPI packs.',
    icon: PieChart,
    ready: false
  }
] as const;

export default async function ReportsHubPage() {
  const canView = await checkRouteAccess('/reports');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Reports"
        description="Hospital analytics hubs for workforce, attendance, leave, overtime and payroll."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_LINKS.map((item) => {
          const Icon = item.icon;
          const content = (
            <Card
              className={`h-full rounded-lg border border-border shadow-sm transition ${
                item.ready ? 'hover:border-primary/40 hover:shadow-md' : 'opacity-70'
              }`}
            >
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                  {!item.ready ? (
                    <p className="text-xs font-medium text-muted-foreground">
                      Coming soon
                    </p>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          );

          if (!item.ready) {
            return (
              <div key={item.href} aria-disabled>
                {content}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
