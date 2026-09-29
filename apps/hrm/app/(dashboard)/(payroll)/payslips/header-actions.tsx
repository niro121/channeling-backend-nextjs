'use client';

import { Download, Mail } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';

const LATER = 'Will be wired in the dynamic phase.';

export function PayslipsHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canView = has('payroll', 'view');

  if (!canView) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        onClick={() =>
          toast({
            title: 'Download All',
            description: LATER
          })
        }
      >
        <Download className="h-4 w-4" />
        Download All
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() =>
          toast({
            title: 'Email All',
            description: LATER
          })
        }
      >
        <Mail className="h-4 w-4" />
        Email All
      </Button>
    </div>
  );
}
