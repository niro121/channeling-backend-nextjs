'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, Input, useToast } from '@archmage/ui';
import { deleteSalaryCycleAction } from '@/app/actions/hr-admin-actions/salary-cycle.actions';
import { cn } from '@/lib/utils';
import { formatCycleLabel } from '@/types/salary-cycle';
import { useSalaryCycleUi } from './salary-cycle-ui-context';

export default function SectionSalaryCycleList() {
  const { toast } = useToast();
  const {
    records,
    setRecords,
    institutionId,
    selectedId,
    setSelectedId,
    isNew,
    startNewCycle,
    search,
    setSearch,
    requestFill
  } = useSalaryCycleUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((r) => r.institutionId === institutionId)
      .filter((r) => {
        if (!query) return true;
        const label = formatCycleLabel(r.salaryFromDate, r.salaryToDate);
        return label.toLowerCase().includes(query);
      })
      .sort((a, b) => b.salaryFromDate.localeCompare(a.salaryFromDate));
  }, [records, institutionId, search]);

  const handleAdd = () => {
    startNewCycle();
    toast({
      title: 'Add salary cycle',
      description:
        'Enter salary window dates on the right, use Fill for defaults, then Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('salary-cycle-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId || isNew) {
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteSalaryCycleAction(selectedId);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Could not delete cycle',
          description: String(
            (result.errors as { message?: string }).message ??
              'Please try again.'
          )
        });
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== selectedId));
      setSelectedId(null);
      setDeleteOpen(false);
      toast({
        title: 'Salary cycle deleted',
        description: 'The cycle was removed successfully.'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full min-h-128 flex-col rounded-lg border border-primary/15 bg-card">
      <div className="border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Salary Cycles
        </h2>
      </div>

      <div className="border-b border-primary/10 px-3 py-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border-primary/15 pl-9"
            aria-label="Search salary cycles"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No salary cycles for this institution. Click Add Cycle to create one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id && !isNew;
              const label = formatCycleLabel(
                record.salaryFromDate,
                record.salaryToDate
              );
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/15 ring-1 ring-primary/30'
                        : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                    )}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 px-3 py-3">
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Add Cycle
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          disabled={!selectedId || isNew}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => {
            requestFill();
            toast({
              title: 'Fill requested',
              description:
                'Defaults are applied from the salary-from month when the detail form is open.'
            });
          }}
        >
          <Sparkles className="h-4 w-4" />
          Fill
        </Button>
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete salary cycle?"
        description="This cycle will be removed. Overlapping salary windows for the same institution are not allowed. When payroll uses a cycle, delete will be blocked."
        handleContinue={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
