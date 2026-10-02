'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { syncZonesFromChannelingAction } from '@/app/actions/organization-actions/zone.actions';

export function SyncZonesButton() {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncZonesFromChannelingAction();

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Sync failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not sync zones from Channeling.'
        });
        return;
      }

      const stats = result.data;
      toast({
        variant: 'success',
        title: 'Sync complete',
        description: stats
          ? `${stats.created} created, ${stats.updated} updated${
              stats.skipped > 0 ? `, ${stats.skipped} skipped` : ''
            }${stats.failed > 0 ? `, ${stats.failed} failed` : ''}.`
          : 'Zones synced from Channeling.'
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
        title="Refresh zones from Channeling?"
        description="This will fetch zones from Channeling and import them into HRM. Parent locations must already be linked (Refresh Locations first). New zones get an auto-generated code. Existing matches (by Channeling id, or name + location) are updated."
        handleContinue={handleSync}
      />
    </>
  );
}
