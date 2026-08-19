'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';

/** Header action for overtime: open Additional Extra Time Forms. */
export function OvertimeHeaderActions() {
  return (
    <Button type="button" size="sm" className="h-9 gap-1.5" asChild>
      <Link href="/overtime-extra-time">
        <Plus className="h-4 w-4" />
        New OT Request
      </Link>
    </Button>
  );
}
