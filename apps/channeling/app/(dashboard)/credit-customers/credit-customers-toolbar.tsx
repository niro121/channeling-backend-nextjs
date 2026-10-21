'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExportWrapper } from '../export-wrapper';

/** Shape of one row in the credit customers export (mapped in page handleExport). */
type CreditCustomerExportRow = {
  code: string;
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  balance: string;
};

type CreditCustomersToolbarProps = {
  canAdd: boolean;
  serverData: () => Promise<{ success: boolean; data?: CreditCustomerExportRow[]; message?: string }>;
};

export function CreditCustomersToolbar({
  canAdd,
  serverData,
}: CreditCustomersToolbarProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <ExportWrapper<CreditCustomerExportRow>
        serverData={serverData}
        columns={['Code', 'Name', 'Email', 'Phone', 'Contact Person', 'Balance']}
        keys={['code', 'name', 'email', 'phone', 'contactPerson', 'balance']}
        title="Credit Customers List"
        fileName="credit-customers"
      />
      {canAdd && (
        <Link href="/credit-customers/add">
          <Button size="sm" className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add New</span>
          </Button>
        </Link>
      )}
    </div>
  );
}
