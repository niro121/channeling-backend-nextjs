'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  PAYSHEET_COMPONENT_TYPE_LABELS,
  type PaysheetComponentTypeId
} from '@/types/paysheet-component';
import { usePaysheetComponentUi } from './paysheet-component-ui-context';

export default function SectionPaysheetComponentList() {
  const { toast } = useToast();
  const {
    records,
    activeKind,
    selectedId,
    setSelectedId,
    startNewPaysheetComponent,
    filters
  } = usePaysheetComponentUi();

  const filteredRecords = useMemo(() => {
    const query = (filters.search ?? '').trim().toLowerCase();
    const typeId =
      filters.typeId && filters.typeId !== '__all__' ? filters.typeId : '';
    const includedForFilter = new Set(
      (filters.includedFor ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );

    return records
      .filter((record) => record.kind === activeKind)
      .filter((record) => {
        if (typeId && record.typeId !== typeId) return false;

        if (includedForFilter.size) {
          const recordIncludedFor = record.includedForIds as readonly string[];
          const hasAny = recordIncludedFor.some((id) =>
            includedForFilter.has(id)
          );
          if (!hasAny) return false;
        }

        if (!query) return true;
        const typeLabel =
          PAYSHEET_COMPONENT_TYPE_LABELS[
            record.typeId as PaysheetComponentTypeId
          ] ?? record.typeId;
        return (
          record.name.toLowerCase().includes(query) ||
          record.code.toLowerCase().includes(query) ||
          typeLabel.toLowerCase().includes(query) ||
          String(record.orderNo).includes(query)
        );
      })
      .sort((a, b) => a.orderNo - b.orderNo || a.name.localeCompare(b.name));
  }, [records, activeKind, filters]);

  const handleAdd = () => {
    startNewPaysheetComponent();
    toast({
      title: 'Add paysheet component',
      description:
        'Enter the component details in the form on the right, then click Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('paysheet-component-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Components
        </h2>
        <Button type="button" size="sm" className="h-8 gap-1.5 px-3" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No components match the current filters. Click Add to create one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
              const typeLabel =
                PAYSHEET_COMPONENT_TYPE_LABELS[
                  record.typeId as PaysheetComponentTypeId
                ] ?? record.typeId;

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
                        <p className="mt-1 text-xs text-muted-foreground">
                          {typeLabel} · Order {record.orderNo}
                        </p>
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
