'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import { useResumeBankUi } from './resume-bank-ui-context';

export function ResumeBankHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useResumeBankUi();
  const canAdd = has('recruitment', 'add');

  if (!canAdd) return null;

  return (
    <Button
      type="button"
      size="sm"
      className={`${buttonStyles.save} gap-1.5`}
      onClick={() => openCreate()}
    >
      <Plus className="h-4 w-4" />
      New Profile
    </Button>
  );
}
