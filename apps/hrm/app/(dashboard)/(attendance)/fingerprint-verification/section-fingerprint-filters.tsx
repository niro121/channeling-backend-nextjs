'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Tabs,
  TabsList,
  TabsTrigger
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type {
  FingerprintVerificationFilterOptions,
  FingerprintVerificationMode
} from '@/types/attendance';

type SectionFingerprintFiltersProps = {
  mode: FingerprintVerificationMode;
  filterOptions: FingerprintVerificationFilterOptions;
  initial: {
    mode?: string;
    fromDate?: string;
    toDate?: string;
    shiftRosterId?: string;
    staffId?: string;
  };
};

function parseLocalDate(iso?: string): Date | null {
  if (!iso?.trim()) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toLocalDateIso(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return format(value, 'yyyy-MM-dd');
}

function SectionFingerprintFiltersInner({
  mode,
  filterOptions,
  initial
}: SectionFingerprintFiltersProps) {
  const router = useRouter();

  const initialValues = {
    mode: initial.mode === 'staff' ? 'staff' : 'roster',
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? '',
    shiftRosterId: initial.shiftRosterId ?? '',
    staffId: initial.staffId ?? ''
  };

  const switchMode = (nextMode: FingerprintVerificationMode) => {
    const params = new URLSearchParams();
    params.set('mode', nextMode);
    if (initialValues.fromDate) params.set('fromDate', initialValues.fromDate);
    if (initialValues.toDate) params.set('toDate', initialValues.toDate);
    if (nextMode === 'roster' && initialValues.shiftRosterId) {
      params.set('shiftRosterId', initialValues.shiftRosterId);
    }
    if (nextMode === 'staff' && initialValues.staffId) {
      params.set('staffId', initialValues.staffId);
    }
    router.push(`/fingerprint-verification?${params.toString()}`);
  };

  return (
    <>
      <Tabs
        value={mode}
        onValueChange={(value) =>
          switchMode(value === 'staff' ? 'staff' : 'roster')
        }
      >
        <TabsList>
          <TabsTrigger value="roster">By Roster</TabsTrigger>
          <TabsTrigger value="staff">By Staff</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Search & Filters
          </h2>
        </div>

        <FilterWrapper
          key={[
            initialValues.mode,
            initialValues.fromDate,
            initialValues.toDate,
            initialValues.shiftRosterId,
            initialValues.staffId
          ].join('|')}
          initialValues={initialValues}
          buttonLabel="Search"
          showClearButton
          clearButtonLabel="Reset"
          searchButton={{
            variant: 'default',
            className: 'h-10 w-full gap-2'
          }}
        >
          {({ values, setValue }) => (
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CustomDatePickerField
                id="fingerprintFromDate"
                placeholder="From Date"
                value={parseLocalDate(values.fromDate)}
                onChange={(value) =>
                  setValue('fromDate', toLocalDateIso(value))
                }
                onBlur={() => undefined}
                required={false}
                useFormikError={false}
                styleClasses={{
                  parentDiv: 'grid grid-cols-1 gap-2 items-start',
                  labelClassName: 'text-xs uppercase text-muted-foreground',
                  inputClassName: 'w-full'
                }}
              />
              <CustomDatePickerField
                id="fingerprintToDate"
                placeholder="To Date"
                value={parseLocalDate(values.toDate)}
                onChange={(value) => setValue('toDate', toLocalDateIso(value))}
                onBlur={() => undefined}
                required={false}
                useFormikError={false}
                styleClasses={{
                  parentDiv: 'grid grid-cols-1 gap-2 items-start',
                  labelClassName: 'text-xs uppercase text-muted-foreground',
                  inputClassName: 'w-full'
                }}
              />
              {mode === 'roster' ? (
                <Combobox
                  label="Select Roster"
                  options={filterOptions.rosters}
                  value={values.shiftRosterId ?? ''}
                  defaultValue=""
                  onChange={(v) => setValue('shiftRosterId', v)}
                  clearable
                  triggerClassName='self-end'
                />
              ) : (
                <Combobox
                  label="Select Staff"
                  options={filterOptions.staff}
                  value={values.staffId ?? ''}
                  defaultValue=""
                  onChange={(v) => setValue('staffId', v)}
                  clearable
                  triggerClassName='self-end'
                />
              )}
            </div>
          )}
        </FilterWrapper>
      </div>
    </>
  );
}

export default function SectionFingerprintFilters(
  props: SectionFingerprintFiltersProps
) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionFingerprintFiltersInner {...props} />
    </Suspense>
  );
}
