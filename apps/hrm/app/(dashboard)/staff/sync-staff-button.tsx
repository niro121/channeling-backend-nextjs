'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { syncStaffFromChannelingAction } from '@/app/actions/staff-actions/staff.actions';

export function SyncStaffButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncStaffFromChannelingAction();

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description: result.errors?.message ?? 'Could not sync staff from Channeling.'
        });
        return;
      }

      const stats = result.data;
      toast({
        variant: 'success',
        title: 'Sync complete',
        description: stats
          ? `${stats.created} created, ${stats.updated} updated${
              stats.failed > 0 ? `, ${stats.failed} failed` : ''
            }.`
          : 'Staff synced from Channeling.'
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unexpected error.'
      });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 h-9 cursor-pointer"
        onClick={() => setShowConfirmation(true)}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Refresh</span>
      </Button>

      <CustomAlertDialog
        open={showConfirmation}
        handleVisibilityChange={setShowConfirmation}
        loading={loading}
        title="Refresh staff from Channeling?"
        description="This will fetch staff records from Channeling and import them into HRM. New staff will be created and existing matches will be updated with Channeling data such as code, name, NIC, contact, and status. HR details you entered in HRM (for example EPF, ETF, legacy code, and employment dates) will not be removed."
        handleContinue={handleSync}
      />
    </>
  );
}
