'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';

export function ShiftTypesHeaderActions() {
  const { has } = usePermissions();
  if (!has('shift-roster', 'add')) return null;

  return (
    <Button type="button" size="sm" className="h-9 gap-1.5" asChild>
      <Link href="/shift-types/add">
        <Plus className="h-4 w-4" />
        Add Shift
      </Link>
    </Button>
  );
}
