'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';

type RfidAttendanceHeaderActionsProps = {
  exportDisabled?: boolean;
};

export function RfidAttendanceHeaderActions({
  exportDisabled = true
}: RfidAttendanceHeaderActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0"
        title="Refresh"
        onClick={() => router.refresh()}
      >
        <RefreshCw className="h-4 w-4" />
        <span className="sr-only">Refresh</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        disabled={exportDisabled}
        onClick={() =>
          toast({
            title: 'Export',
            description: 'Export will be available in a later attendance phase.'
          })
        }
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
      <Button type="button" size="sm" className="h-9 gap-1.5" asChild>
        <Link href="/attendance-corrections">
          <Plus className="h-4 w-4" />
          Add Correction
        </Link>
      </Button>
    </>
  );
}
