'use client';

import { useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, Input, useToast } from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  BRANCH_TYPE_OPTIONS,
  LOCATION_STATUS_OPTIONS,
  branchTypeLabel,
  locationStatusLabel
} from '@/types/location';
import { SyncLocationsButton } from './sync-locations-button';
import { useLocationUi } from './location-ui-context';

export default function SectionLocationList() {
  const { toast } = useToast();
  const {
    records,
    selectedId,
    setSelectedId,
    startNewLocation,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    branchTypeFilter,
    setBranchTypeFilter
  } = useLocationUi();

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== '' && String(record.status) !== statusFilter) {
        return false;
      }
      if (
        branchTypeFilter !== '' &&
        String(record.branchType) !== branchTypeFilter
      ) {
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
  }, [records, search, statusFilter, branchTypeFilter]);

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
          <Button type="button" size="sm" className="h-8 gap-1.5 px-3" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-b border-primary/10 px-3 py-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or city..."
            className="w-full rounded-md border-primary/15 pl-9"
            aria-label="Search locations"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={branchTypeFilter}
            onChange={(e) => setBranchTypeFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-primary/15 bg-background px-3 text-sm text-foreground"
            aria-label="Filter by branch type"
          >
            <option value="">All branch types</option>
            {BRANCH_TYPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-primary/15 bg-background px-3 text-sm text-foreground"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LOCATION_STATUS_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredRecords.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No locations found.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredRecords.map((record) => {
              const isSelected = selectedId === record.id;
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
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {record.code} · {branchTypeLabel(record.branchType)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {locationStatusLabel(record.status)}
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
