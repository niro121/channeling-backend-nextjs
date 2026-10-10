'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { syncDepartmentsFromChannelingAction } from '@/app/actions/organization-actions/department.actions';

export function SyncDepartmentsButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncDepartmentsFromChannelingAction();

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not sync departments from Channeling.'
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
          : 'Departments synced from Channeling.'
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
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-3"
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
        title="Refresh departments from Channeling?"
        description="This will fetch departments from Channeling and import them into HRM. New departments will be created and existing matches (by Channeling id, or name + institution) will be updated. Local-only departments that are not in Channeling will not be removed."
        handleContinue={handleSync}
      />
    </>
  );
}
