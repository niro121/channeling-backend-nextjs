'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Clock3,
  PartyPopper,
  Plane,
  Table2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@archmage/ui';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { href: '/leave-application', label: 'Leave', icon: Plane },
  { href: '/overtime-extra-time', label: 'Extra Time', icon: Clock3 },
  { href: '/overtime-extra-shift-normal', label: 'Extra Shift', icon: Table2 },
  { href: '/holiday-calendar', label: 'Holiday', icon: PartyPopper },
  { href: '/duty-roster', label: 'Roster', icon: CalendarDays }
] as const;

type SectionFingerprintLinksProps = {
  className?: string;
};

export default function SectionFingerprintLinks({
  className
}: SectionFingerprintLinksProps) {
  return (
    <Card className={cn('rounded-lg border border-border shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick Links</CardTitle>
      </CardHeader>
      <CardContent>
        <nav
          aria-label="Fingerprint verification links"
          className="flex flex-wrap gap-x-6 gap-y-3"
        >
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
