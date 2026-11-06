'use client';

import { Button } from '@archmage/ui';
import type { DutyRosterViewMode } from '@/types/roster';

const VIEW_BUTTONS: Array<{ mode: DutyRosterViewMode; label: string }> = [
  { mode: 'list', label: 'List' },
  { mode: 'days', label: 'Days' },
  { mode: 'weeks', label: 'Weeks' },
  { mode: 'months', label: 'Months' }
];

type SectionDutyViewToolbarProps = {
  viewMode: DutyRosterViewMode;
  onViewChange: (mode: DutyRosterViewMode) => void;
};

export default function SectionDutyViewToolbar({
  viewMode,
  onViewChange
}: SectionDutyViewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {VIEW_BUTTONS.map(({ mode, label }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={viewMode === mode ? 'default' : 'outline'}
          className="h-9"
          onClick={() => onViewChange(mode)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
