'use client';

import type { ReactNode } from 'react';
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  UserRound,
  Users,
  UserX
} from 'lucide-react';
import { Card, CardContent } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import type { DepartmentReportCards } from '@/types/reports';

type SummaryCard = {
  label: string;
  value: string;
  icon: ReactNode;
  iconWrapClass: string;
};

type SectionSummaryCardsProps = {
  cards: DepartmentReportCards;
};

export default function SectionSummaryCards({
  cards
}: SectionSummaryCardsProps) {
  const items: SummaryCard[] = [
    {
      label: 'Total Departments',
      value: String(cards.totalDepartments),
      icon: <Building2 className="h-4 w-4 text-teal-700" />,
      iconWrapClass: 'bg-teal-50'
    },
    {
      label: 'Total Staff',
      value: String(cards.totalStaff),
      icon: <Users className="h-4 w-4 text-emerald-700" />,
      iconWrapClass: 'bg-emerald-50'
    },
    {
      label: 'Active Departments',
      value: String(cards.activeDepartments),
      icon: <UserRound className="h-4 w-4 text-sky-700" />,
      iconWrapClass: 'bg-sky-50'
    },
    {
      label: 'Average Staff Per Department',
      value: String(cards.averageStaffPerDepartment),
      icon: <BarChart3 className="h-4 w-4 text-violet-700" />,
      iconWrapClass: 'bg-violet-50'
    },
    {
      label: 'Departments With Vacancies',
      value: String(cards.departmentsWithVacancies),
      icon: <UserX className="h-4 w-4 text-orange-600" />,
      iconWrapClass: 'bg-orange-50'
    },
    {
      label: 'Total Department Payroll',
      value: formatLkr(cards.totalDepartmentPayroll),
      icon: <CircleDollarSign className="h-4 w-4 text-amber-700" />,
      iconWrapClass: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-lg border border-border shadow-sm"
        >
          <CardContent className="px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.iconWrapClass}`}
              >
                {item.icon}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {item.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              View underlying records
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
