'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Combobox,
  DateRangePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label
} from '@archmage/ui';
import type { RosterFilterOption } from '@/types/roster';

export type CreateFixedRosterValues = {
  roster: string;
  fromDate: string;
  toDate: string;
  department?: string;
  unit?: string;
};

type DialogCreateFixedRosterProps = {
  open: boolean;
  loading?: boolean;
  rosterOptions: RosterFilterOption[];
  departmentOptions?: RosterFilterOption[];
  unitOptions?: RosterFilterOption[];
  initial: CreateFixedRosterValues;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: CreateFixedRosterValues) => void;
};

export default function DialogCreateFixedRoster({
  open,
  loading = false,
  rosterOptions,
  departmentOptions = [],
  unitOptions = [],
  initial,
  onOpenChange,
  onConfirm
}: DialogCreateFixedRosterProps) {
  const [roster, setRoster] = useState(initial.roster);
  const [department, setDepartment] = useState(initial.department ?? '');
  const [unit, setUnit] = useState(initial.unit ?? '');
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRoster(initial.roster);
    setDepartment(initial.department ?? '');
    setUnit(initial.unit ?? '');
    setFromDate(initial.fromDate);
    setToDate(initial.toDate);
    setError('');
  }, [open, initial]);

  const handleConfirm = () => {
    if (!roster.trim()) {
      setError('Select a roster group.');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Select a date range.');
      return;
    }
    setError('');
    onConfirm({
      roster: roster.trim(),
      fromDate,
      toDate,
      department: department || undefined,
      unit: unit || undefined
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Fixed Roster</DialogTitle>
          <DialogDescription>
            Builds draft duties for the selected range from active{' '}
            <span className="font-medium text-foreground">Fixed</span> +{' '}
            <span className="font-medium text-foreground">Auto Assign</span>{' '}
            standing assignments (same engine as Fill New).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm">
            <ul className="list-disc space-y-1.5 pl-4 text-foreground">
              <li>Empty days only — existing cells stay unchanged.</li>
              <li>Leave / weekly-off overlaps show a soft warning before continue.</li>
              <li>Does not create a separate template collection.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Roster group *
            </Label>
            <Combobox
              label="Roster"
              options={rosterOptions}
              value={roster}
              defaultValue=""
              onChange={setRoster}
              clearable
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Department (optional)
              </Label>
              <Combobox
                label="Department"
                options={departmentOptions}
                value={department}
                defaultValue=""
                onChange={setDepartment}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Unit / Room (optional)
              </Label>
              <Combobox
                label="Unit / Room"
                options={unitOptions}
                value={unit}
                defaultValue=""
                onChange={setUnit}
                clearable
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Date range *
            </Label>
            <DateRangePicker
              from={fromDate || undefined}
              to={toDate || undefined}
              onChange={({ from, to }) => {
                setFromDate(from ?? '');
                setToDate(to ?? '');
              }}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? 'Creating…' : 'Create drafts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
