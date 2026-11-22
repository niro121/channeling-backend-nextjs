'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { buttonStyles } from '@/lib/utils/common-styles';
import { useInterviewScheduleUi } from './interview-schedule-ui-context';

export default function InterviewScheduleHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useInterviewScheduleUi();

  if (!has('recruitment', 'add')) return null;

  return (
    <Button
      type="button"
      className={`${buttonStyles.save} gap-1.5`}
      onClick={openCreate}
    >
      <Plus className="h-4 w-4" />
      Schedule Interview
    </Button>
  );
}
