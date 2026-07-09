'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { syncStaffFromChannelingAction } from '@/app/actions/staff-actions/staff.actions';

export function SyncStaffButton() {
  const [loading, setLoading] = useState(false);
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
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 h-9 cursor-pointer"
      onClick={handleSync}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Refresh</span>
    </Button>
  );
}
