'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Receipt, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTab } from '@/types/reports';

const TABS: {
  id: ReportTab;
  label: string;
  icon: typeof Receipt;
}[] = [
  { id: 'receipts', label: 'Receipt Report', icon: Receipt },
  { id: 'doctor-payments', label: 'Doctor Payment Report', icon: Stethoscope },
];

type ReportsTabsProps = {
  activeTab: ReportTab;
};

export function ReportsTabs({ activeTab }: ReportsTabsProps) {
  const searchParams = useSearchParams();

  function hrefForTab(tab: ReportTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.delete('page');
    params.delete('keyword');
    return `/reports?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={hrefForTab(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
