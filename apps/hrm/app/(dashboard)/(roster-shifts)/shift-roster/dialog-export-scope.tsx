'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label
} from '@archmage/ui';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ShiftRosterExportScope } from '@/types/roster';

type DialogExportScopeProps = {
  open: boolean;
  value: ShiftRosterExportScope;
  totalMatching: number;
  onValueChange: (value: ShiftRosterExportScope) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const OPTIONS: {
  value: ShiftRosterExportScope;
  label: string;
  hint: (total: number) => string;
}[] = [
  {
    value: '100',
    label: 'First 100 staff',
    hint: (total) =>
      total > 0
        ? `Up to 100 of ${total} matching staff`
        : 'Up to 100 matching staff'
  },
  {
    value: '500',
    label: 'First 500 staff',
    hint: (total) =>
      total > 0
        ? `Up to 500 of ${total} matching staff`
        : 'Up to 500 matching staff'
  },
  {
    value: 'all',
    label: 'All matching staff',
    hint: (total) =>
      total > 0
        ? `Every staff row matching current filters (${total})`
        : 'Every staff row matching current filters'
  }
];

export default function DialogExportScope({
  open,
  value,
  totalMatching,
  onValueChange,
  onCancel,
  onConfirm
}: DialogExportScopeProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export / print scope</DialogTitle>
          <DialogDescription>
            Choose how many staff rows to include. Filters (department, unit,
            roster, dates, search) still apply.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={value}
          onValueChange={(next) =>
            onValueChange(next as ShiftRosterExportScope)
          }
          className="gap-3 py-2"
        >
          {OPTIONS.map((option) => {
            const id = `roster-export-scope-${option.value}`;
            return (
              <div
                key={option.value}
                className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <RadioGroupItem value={option.value} id={id} className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor={id} className="cursor-pointer font-medium">
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {option.hint(totalMatching)}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
