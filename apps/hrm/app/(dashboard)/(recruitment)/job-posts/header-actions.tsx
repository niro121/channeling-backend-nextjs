'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import { useJobPostsUi } from './job-posts-ui-context';

export function JobPostsHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useJobPostsUi();
  const canAdd = has('recruitment', 'add');

  if (!canAdd) return null;

  return (
    <Button
      type="button"
      size="sm"
      className={`${buttonStyles.save} gap-1.5`}
      onClick={openCreate}
    >
      <Plus className="h-4 w-4" />
      New Job Post
    </Button>
  );
}
