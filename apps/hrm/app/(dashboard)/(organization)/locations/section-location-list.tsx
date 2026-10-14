'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/lib/utils/common-styles';
import { expandHexColor } from '@/components/custom/custom-color-picker';
import { branchTypeLabel, locationStatusLabel } from '@/types/location';
import { SyncLocationsButton } from './sync-locations-button';
import { useLocationUi } from './location-ui-context';

export default function SectionLocationList() {
  const { toast } = useToast();
  const { records, selectedId, setSelectedId, startNewLocation, filters } =
    useLocationUi();

  const filteredRecords = useMemo(() => {
    const query = (filters.search ?? '').trim().toLowerCase();
    const branchType =
      filters.branchType && filters.branchType !== '__all__'
        ? filters.branchType
        : '';
    const status =
      filters.status && filters.status !== '__all__' ? filters.status : '';

    return records.filter((record) => {
      if (status !== '' && String(record.status) !== status) {
        return false;
      }
      if (branchType !== '' && String(record.branchType) !== branchType) {
        return false;
      }
      if (!query) return true;
      return (
        record.name.toLowerCase().includes(query) ||
        record.code.toLowerCase().includes(query) ||
        record.city.toLowerCase().includes(query) ||
        branchTypeLabel(record.branchType).toLowerCase().includes(query)
      );
    });
  }, [records, filters]);

  const handleAdd = () => {
    startNewLocation();
    toast({
      title: 'Add new location',
      description: 'Enter the location details in the form on the right, then click Save.'
    });
    requestAnimationFrame(() => {
      document
        .getElementById('location-detail-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <div className="flex h-full min-h-[32rem] flex-col rounded-lg border border-primary/15 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-3 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Location List
        </h2>
        <div className="flex items-center gap-2">
          <SyncLocationsButton />
          <Button
            type="button"
            size="sm"
            className={cn('gap-1.5 px-3', buttonStyles.save)}
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No locations match the current filters.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
              const accent = expandHexColor(record.color ?? '');

              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={cn(
                      'relative w-full overflow-hidden rounded-md border text-left transition-colors',
                      isSelected
                        ? accent
                          ? 'bg-muted/50'
                          : 'border-primary/40 bg-primary/15 ring-1 ring-primary/30'
                        : accent
                          ? 'bg-background hover:bg-muted/40'
                          : 'border-primary/15 bg-background hover:border-primary/25 hover:bg-muted/40'
                    )}
                    style={
                      accent
                        ? {
                            borderColor: accent,
                            boxShadow: isSelected
                              ? `0 0 0 1px ${accent}`
                              : undefined
                          }
                        : undefined
                    }
                  >
                    {accent ? (
                      <span
                        className="absolute inset-y-0 left-0 w-1.5"
                        style={{ backgroundColor: accent }}
                        title={accent}
                        aria-hidden
                      />
                    ) : null}

                    <div
                      className={cn(
                        'flex items-start justify-between gap-3 px-3 py-2.5',
                        accent && 'pl-4'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-snug text-foreground">
                          {record.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {record.code} · {branchTypeLabel(record.branchType)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {locationStatusLabel(record.status)}
                        </span>
                        {accent ? (
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: accent }}
                            title={accent}
                            aria-label={`Branch color ${accent}`}
                          />
                        ) : null}
                      </div>
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
