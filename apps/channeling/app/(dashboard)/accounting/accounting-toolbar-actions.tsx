'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';

export function AccountingToolbarActions() {
  const { has } = usePermissions();
  const canAdd = has('accounting', 'add');

  if (!canAdd) return null;

  return (
    <div className="flex items-center gap-2">
      <Link href="/accounting/entries/new">
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <FileText className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add journal entry
          </span>
        </Button>
      </Link>
      <Link href="/accounting/add">
        <Button size="sm" className="gap-1.5 h-9">
          <Plus className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add account
          </span>
        </Button>
      </Link>
    </div>
  );
}
