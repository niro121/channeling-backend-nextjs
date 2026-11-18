'use client';

import React from 'react';
import { Row } from '@tanstack/react-table';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import { Button } from '@/components/ui/button';
import { FileText, Pencil } from 'lucide-react';
import Link from 'next/link';
import type { Account } from '@/types/accounting';
import { usePermissions } from '@/components/hooks/use-permissions';

type AccountWithBalance = Account & { balance?: number };

interface AccountRecordActionsProps<TData extends AccountWithBalance> {
  row: Row<TData>;
}

export function AccountRecordActions<TData extends AccountWithBalance>({
  row,
}: AccountRecordActionsProps<TData>) {
  const account = row.original;
  const id = account.id;
  const { has } = usePermissions();
  if (!id) return null;

  return (
    <DataTableRowActions>
      {has('accounting', 'edit') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/accounting/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href={`/accounting/${id}/statement`}>
          <FileText className="h-4 w-4" />
          <span className="sr-only">Statement</span>
        </Link>
      </Button>
    </DataTableRowActions>
  );
}
