'use client';

import { useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Input, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  STAFF_GRADE_LEVEL_LABELS,
  type StaffGradeLevelId
} from '@/types/staff-grade';
import { useStaffGradeUi } from './staff-grade-ui-context';

export default function SectionStaffGradeList() {
  const { toast } = useToast();
  const { records, selectedId, setSelectedId, startNewStaffGrade, search, setSearch } =
    useStaffGradeUi();

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (!query) return true;
      return (
        record.name.toLowerCase().includes(query) ||
        record.code.toLowerCase().includes(query) ||
        STAFF_GRADE_LEVEL_LABELS[record.gradeLevelId as StaffGradeLevelId]
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [records, search]);

  const handleAdd = () => {
    startNewStaffGrade();
    toast({
      title: 'Add new area / staff grade',
      description: 'Enter the details in the form on the right, then click Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('staff-grade-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Area List
        </h2>
        <Button type="button" size="sm" className="h-8 gap-1.5 px-3" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="border-b border-primary/10 px-3 py-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search area..."
            className="w-full rounded-md border-primary/15 pl-9"
            aria-label="Search areas"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No areas found.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
              const gradeLabel =
                STAFF_GRADE_LEVEL_LABELS[record.gradeLevelId as StaffGradeLevelId] ??
                record.gradeLevelId;

              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/15 ring-1 ring-primary/30'
                        : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-snug text-foreground">
                          {record.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{gradeLabel}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {record.code}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
