'use client';

import { Play, RotateCcw, Save } from 'lucide-react';
import { Badge, Button } from '@archmage/ui';

type SalaryGenerationHeaderActionsProps = {
  cycleLabel: string | null;
  staffCountLabel: string;
  busy?: boolean;
  onGenerate: () => void;
  onSave: () => void;
  onClear: () => void;
};

export function SalaryGenerationHeaderActions({
  cycleLabel,
  staffCountLabel,
  busy = false,
  onGenerate,
  onSave,
  onClear
}: SalaryGenerationHeaderActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={onGenerate}
      >
        <Play className="h-4 w-4 fill-current" />
        {busy ? 'Working…' : 'Generate Salary'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={onSave}
      >
        <Save className="h-4 w-4" />
        Save Salary
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={onClear}
      >
        <RotateCcw className="h-4 w-4" />
        Clear
      </Button>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {cycleLabel ? (
          <Badge className="bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
            Cycle {cycleLabel}
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="px-3 py-1 text-sm font-medium text-muted-foreground"
          >
            No cycle
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">{staffCountLabel}</span>
      </div>
    </div>
  );
}
