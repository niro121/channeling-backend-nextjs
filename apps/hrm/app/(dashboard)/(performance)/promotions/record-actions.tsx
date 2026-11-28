'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PromotionRecord } from '@/types/performance';
import { usePromotionsUi } from './promotions-ui-context';

type PromotionRecordActionsProps = {
  record: PromotionRecord;
};

export default function PromotionRecordActions({
  record
}: PromotionRecordActionsProps) {
  const { has } = usePermissions();
  const { openEdit } = usePromotionsUi();

  if (!has('performance', 'edit')) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
        aria-label={`Edit promotion request ${record.requestId}`}
        onClick={() => openEdit(record)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
