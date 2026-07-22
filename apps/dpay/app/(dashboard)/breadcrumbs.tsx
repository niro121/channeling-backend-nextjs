'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@archmage/ui';
import { usePathname } from 'next/navigation';

const PATH_NAMES = [
  { path: 'welcome', name: 'Dashboard' },
  { path: 'patient-bills', name: 'Patient Bills' },
  { path: 'create', name: 'Create Bill' },
  { path: 'doctor-payments', name: 'Doctor Payments' },
  { path: 'make', name: 'Make' },
  { path: 'payments', name: 'Payments' },
  { path: 'receipts', name: 'Receipts' },
  { path: 'bank-accounts', name: 'Bank Accounts' },
  { path: 'ledger', name: 'Ledger' },
  { path: 'reconciliation', name: 'Reconciliation' },
  { path: 'settlements', name: 'Settlements' },
  { path: 'reports', name: 'Reports' },
  { path: 'financial', name: 'Financial' },
  { path: 'user-activity', name: 'User Activity' },
  { path: 'users', name: 'Users' },
  { path: 'user-groups', name: 'User Groups' },
  { path: 'admin', name: 'Admin' },
  { path: 'monitor', name: 'Server Monitor' },
  { path: 'account', name: 'Account' },
  { path: 'add', name: 'Add' },
  { path: 'edit', name: 'Edit' },
  { path: 'unauthorized-access', name: 'Unauthorized' },
];

function isDynamicId(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  if (/^\d+$/.test(segment)) return true;
  return false;
}

function formatSegment(segment: string): string {
  const mapped = PATH_NAMES.find((item) => item.path === segment);
  if (mapped) return mapped.name;
  if (isDynamicId(segment)) return 'Details';
  return segment.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const pathNames = pathname.split('/').filter(Boolean);
  return (
    <Breadcrumb className="hidden md:block min-w-0 flex-1">
      <BreadcrumbList className="flex flex-nowrap items-center gap-1.5 sm:gap-2 truncate">
        <BreadcrumbItem>
          <BreadcrumbLink asChild><Link href="/welcome">Dashboard</Link></BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {pathNames.map((link, index) => {
          const isLast = index === pathNames.length - 1;
          const isId = isDynamicId(link);
          const href = '/' + pathNames.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={link}>
              <BreadcrumbItem className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
                {isLast || isId ? (
                  <BreadcrumbPage className={isLast ? 'font-semibold text-foreground truncate' : 'truncate'}>{formatSegment(link)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href} className="cursor-pointer transition-colors hover:text-foreground truncate">{formatSegment(link)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
