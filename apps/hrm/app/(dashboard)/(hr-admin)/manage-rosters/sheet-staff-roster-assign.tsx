'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { getStaffRosterAssignCandidatesAction } from '@/app/actions/hr-admin-actions/manage-roster.actions';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { StaffRosterAssignCandidate } from '@/types/manage-roster';
import {
  useManageRosterUi,
  type StaffRosterAssignSheetMode
} from './manage-roster-ui-context';

type SheetStaffRosterAssignProps = {
  open: boolean;
  mode: StaffRosterAssignSheetMode;
  onOpenChange: (open: boolean) => void;
};

export default function SheetStaffRosterAssign({
  open,
  mode,
  onOpenChange
}: SheetStaffRosterAssignProps) {
  const { toast } = useToast();
  const {
    records,
    staffRosterFilters,
    staffRosterRows,
    requestAssign,
    membershipSaving
  } = useManageRosterUi();

  const [optionsLoading, setOptionsLoading] = useState(false);
  const [candidates, setCandidates] = useState<StaffRosterAssignCandidate[]>(
    []
  );
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const targetRoster = useMemo(
    () => records.find((row) => row.id === staffRosterFilters.rosterId) ?? null,
    [records, staffRosterFilters.rosterId]
  );

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedIds([]);

    let cancelled = false;
    const load = async () => {
      try {
        setOptionsLoading(true);
        const result = await getStaffRosterAssignCandidatesAction();
        if (cancelled) return;
        if (result.isError || !result.data) {
          toast({
            variant: 'destructive',
            title: 'Could not load staff',
            description:
              (result.errors as { message?: string })?.message ??
              'Staff options could not be loaded for assignment.'
          });
          setCandidates([]);
          return;
        }
        setCandidates(result.data);
      } catch (error: unknown) {
        if (cancelled) return;
        toast({
          variant: 'destructive',
          title: 'Could not load staff',
          description:
            error instanceof Error
              ? error.message
              : 'Staff options could not be loaded for assignment.'
        });
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const alreadyOnRoster = useMemo(
    () => new Set(staffRosterRows.map((row) => row.id)),
    [staffRosterRows]
  );

  const filteredCandidates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return candidates.filter((row) => {
      if (!needle) return true;
      return (
        row.staffName.toLowerCase().includes(needle) ||
        row.staffCode.toLowerCase().includes(needle) ||
        row.currentRosterCode.toLowerCase().includes(needle)
      );
    });
  }, [candidates, search]);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      if (mode === 'add') {
        return prev.includes(id) ? [] : [id];
      }
      return prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id];
    });
  };

  const handleConfirm = () => {
    if (!targetRoster) {
      toast({
        variant: 'destructive',
        title: 'Roster required',
        description: 'Select a target roster group before assigning staff.'
      });
      return;
    }

    const selected = candidates.filter((row) => selectedIds.includes(row.id));
    if (!selected.length) {
      toast({
        variant: 'destructive',
        title: 'No staff selected',
        description: 'Choose at least one staff member to register.'
      });
      return;
    }

    const already = selected.filter((row) => alreadyOnRoster.has(row.id));
    if (already.length === selected.length) {
      toast({
        title: 'Already registered',
        description: 'Selected staff are already on this roster group.'
      });
      return;
    }

    requestAssign({
      candidates: selected.filter((row) => !alreadyOnRoster.has(row.id)),
      targetRosterId: targetRoster.id,
      targetRosterCode: targetRoster.code,
      targetRosterName: targetRoster.name
    });
  };

  const title = mode === 'bulk' ? 'Bulk Add Staff' : 'Add Staff';
  const description =
    mode === 'bulk'
      ? 'Select one or more staff members to register on the selected roster group. Moving someone from another group requires confirmation.'
      : 'Select a staff member to register on the selected roster group. Moving from another group requires confirmation.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-1 pb-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-4">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Target roster
            </p>
            <p className="mt-1 font-medium text-foreground">
              {targetRoster
                ? `${targetRoster.name} (${targetRoster.code})`
                : 'No roster selected'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-roster-assign-search">Search staff</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="staff-roster-assign-search"
                className="pl-8"
                placeholder="Name, Staff ID, or current roster"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-[16rem] flex-1 rounded-md border border-border">
            {optionsLoading ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading staff...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex h-full min-h-[16rem] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                No staff options match this search.
              </div>
            ) : (
              <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
                {filteredCandidates.map((row) => {
                  const checked = selectedIds.includes(row.id);
                  const onRoster = alreadyOnRoster.has(row.id);
                  const locked = row.hasStandingAssignments;
                  return (
                    <li key={row.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40">
                        <Checkbox
                          checked={checked}
                          disabled={onRoster || locked || membershipSaving}
                          onCheckedChange={() => toggleId(row.id)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {row.staffCode
                              ? `${row.staffCode} — ${row.staffName}`
                              : row.staffName}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {onRoster
                              ? 'Already on this roster'
                              : locked
                                ? 'Locked by standing shift assignment(s)'
                                : row.currentRosterCode
                                  ? `Current: ${row.currentRosterName || row.currentRosterCode}`
                                  : 'No roster membership'}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedIds.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} selected
              {mode === 'add' ? ' (single add)' : ''}
            </p>
          ) : null}
        </div>

        <SheetFooter className="gap-2 border-t border-border px-1 pt-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={buttonStyles.cancel.normal}
            onClick={() => onOpenChange(false)}
            disabled={membershipSaving}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            className={buttonStyles.save}
            disabled={
              !targetRoster ||
              selectedIds.length === 0 ||
              optionsLoading ||
              membershipSaving
            }
            onClick={handleConfirm}
          >
            {membershipSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {mode === 'bulk' ? 'Add selected' : 'Add staff'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
