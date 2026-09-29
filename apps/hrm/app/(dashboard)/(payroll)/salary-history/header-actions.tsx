'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';

export function SalaryHistoryHeaderActions() {
  const { has } = usePermissions();
  const canView = has('payroll', 'view');

  if (!canView) return null;

  return (
    <Button asChild type="button" size="sm" variant="outline" className="h-9 gap-1.5">
      <Link href="/payslips">
        <FileText className="h-4 w-4" />
        View Payslips
      </Link>
    </Button>
  );
}
