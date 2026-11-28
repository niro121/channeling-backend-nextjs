'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import { usePromotionsUi } from './promotions-ui-context';

export function PromotionsHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = usePromotionsUi();

  if (!has('performance', 'add')) return null;

  return (
    <Button
      type="button"
      size="sm"
      className={`${buttonStyles.save} gap-1.5`}
      onClick={openCreate}
    >
      <Plus className="h-4 w-4" />
      Create Promotion Request
    </Button>
  );
}
