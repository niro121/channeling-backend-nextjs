'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useAttendanceDevicesUi } from './attendance-devices-ui-context';

export function AttendanceDevicesHeaderActions() {
  const { has } = usePermissions();
  const { openAdd } = useAttendanceDevicesUi();
  if (!has('attendance', 'add')) return null;

  return (
    <Button
      type="button"
      size="sm"
      className="h-9 gap-1.5"
      onClick={openAdd}
    >
      <Plus className="h-4 w-4" />
      Add Device
    </Button>
  );
}
