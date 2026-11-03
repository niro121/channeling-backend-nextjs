'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserPlus, Users } from 'lucide-react';
import { Button, Combobox, Label, Selector, useToast } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { getStaffOptionsAction } from '@/app/actions/staff-actions/staff.actions';
import { STAFF_STATUS_OPTIONS } from '@/types/staff';
import type { StaffRosterFilterValues } from '@/types/manage-roster';
import { useManageRosterUi } from './manage-roster-ui-context';

const statusOptions = STAFF_STATUS_OPTIONS.map((option) => ({
  id: option.id,
  name: option.name
}));

function toStaffRosterFilters(
  values: Record<string, string | undefined>
): StaffRosterFilterValues {
  const status = values.status?.trim() ?? '';
  return {
    rosterId: values.rosterId?.trim() ?? '',
    staffId: values.staffId?.trim() ?? '',
    departmentId: values.departmentId?.trim() ?? '',
    status: !status || status === '__all__' ? '' : status
  };
}

function SectionStaffRosterFiltersInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const {
    records,
    departmentOptions,
    staffRosterFilters,
    setStaffRosterFilters,
    staffRosterLoading,
    loadStaffRoster,
    clearStaffRosterRegister,
    openAssignSheet
  } = useManageRosterUi();

  const [staffOptions, setStaffOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [staffOptionsLoading, setStaffOptionsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setStaffOptionsLoading(true);
        const result = await getStaffOptionsAction();
        if (cancelled) return;
        if (result.isError || !result.data) {
          toast({
            variant: 'destructive',
            title: 'Could not load staff',
            description:
              result.errors?.message ??
              'Staff options could not be loaded for the filter.'
          });
          setStaffOptions([]);
          return;
        }
        setStaffOptions(
          result.data.map((row) => ({
            id: row.id,
            name: row.code ? `${row.code} — ${row.name}` : row.name
          }))
        );
      } catch (error: unknown) {
        if (cancelled) return;
        toast({
          variant: 'destructive',
          title: 'Could not load staff',
          description:
            error instanceof Error
              ? error.message
              : 'Staff options could not be loaded for the filter.'
        });
      } finally {
        if (!cancelled) setStaffOptionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const rosterOptions = records.map((row) => ({
    id: row.id,
    name: `${row.name} (${row.code})`
  }));

  const departmentComboboxOptions = departmentOptions.map((row) => ({
    id: row.id,
    name: row.name
  }));

  const urlFilterKey = useMemo(
    () =>
      [
        searchParams.get('rosterId') ?? '',
        searchParams.get('staffId') ?? '',
        searchParams.get('departmentId') ?? '',
        searchParams.get('status') ?? ''
      ].join('|'),
    [searchParams]
  );

  // Prefer applied URL values; fall back to context (e.g. roster prefilled from Rosters tab).
  const initialValues = {
    rosterId: searchParams.get('rosterId') || staffRosterFilters.rosterId || '',
    staffId: searchParams.get('staffId') || '',
    departmentId: searchParams.get('departmentId') || '',
    status: searchParams.get('status') || '__all__'
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Filters
      </h2>

      <FilterWrapper
        key={urlFilterKey}
        initialValues={initialValues}
        buttonLabel="Load Staff"
        showClearButton
        clearButtonLabel="Reset"
        preserveQueryKeys={['tab']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
        onValuesChange={(values) => {
          setStaffRosterFilters(toStaffRosterFilters(values));
          clearStaffRosterRegister();
        }}
        onApplyClick={(params) => {
          const next = toStaffRosterFilters({
            rosterId: params?.get('rosterId') ?? '',
            staffId: params?.get('staffId') ?? '',
            departmentId: params?.get('departmentId') ?? '',
            status: params?.get('status') ?? ''
          });

          if (!next.rosterId) {
            toast({
              variant: 'destructive',
              title: 'Roster required',
              description: 'Select a roster group before loading staff.'
            });
            clearStaffRosterRegister();
            return;
          }

          void loadStaffRoster(next);
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Roster <span className="text-destructive">*</span>
              </Label>
              <Combobox
                label="Roster"
                options={rosterOptions}
                value={values.rosterId ?? ''}
                defaultValue=""
                onChange={(value) => setValue('rosterId', value)}
                clearable
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Staff
              </Label>
              <Combobox
                label="Staff"
                options={staffOptions}
                value={values.staffId ?? ''}
                defaultValue=""
                onChange={(value) => setValue('staffId', value)}
                clearable
                loading={staffOptionsLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Department
              </Label>
              <Combobox
                label="Department"
                options={departmentComboboxOptions}
                value={values.departmentId ?? ''}
                defaultValue=""
                onChange={(value) => setValue('departmentId', value)}
                clearable
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Status
              </Label>
              <Selector
                label="Status"
                options={statusOptions}
                value={values.status || '__all__'}
                defaultValue="__all__"
                onChange={(value) => setValue('status', value)}
                className={{ trigger: 'h-10 w-full max-w-none' }}
              />
            </div>
          </div>
        )}
      </FilterWrapper>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => openAssignSheet('bulk')}
          disabled={!staffRosterFilters.rosterId || staffRosterLoading}
        >
          <Users className="h-3.5 w-3.5" />
          Bulk Add
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => openAssignSheet('add')}
          disabled={!staffRosterFilters.rosterId || staffRosterLoading}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Staff
        </Button>
      </div>
    </div>
  );
}

export default function SectionStaffRosterFilters() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionStaffRosterFiltersInner />
    </Suspense>
  );
}
