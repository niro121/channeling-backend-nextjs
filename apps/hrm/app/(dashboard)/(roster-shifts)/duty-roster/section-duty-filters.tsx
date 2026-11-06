'use client';

import { Suspense, useMemo } from 'react';
import { format } from 'date-fns';
import { Combobox, CustomDatePickerField, Label } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { DutyRosterViewMode, RosterFilterOption } from '@/types/roster';

export type DutyFilterValues = {
  departmentId: string;
  unitId: string;
  dutyDate: Date | null;
  shiftId: string;
  rosterId: string;
  staffId: string;
};

type SectionDutyFiltersProps = {
  initial?: Partial<DutyFilterValues>;
  viewMode: DutyRosterViewMode;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  shiftOptions: RosterFilterOption[];
  rosterOptions: RosterFilterOption[];
  staffOptions: RosterFilterOption[];
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

function toIso(value?: Date | null): string {
  return value ? format(value, 'yyyy-MM-dd') : '';
}

const MONTH_OPTIONS = [
  { id: '1', name: 'January' },
  { id: '2', name: 'February' },
  { id: '3', name: 'March' },
  { id: '4', name: 'April' },
  { id: '5', name: 'May' },
  { id: '6', name: 'June' },
  { id: '7', name: 'July' },
  { id: '8', name: 'August' },
  { id: '9', name: 'September' },
  { id: '10', name: 'October' },
  { id: '11', name: 'November' },
  { id: '12', name: 'December' }
];

function SectionDutyFiltersInner({
  initial = {},
  viewMode,
  departmentOptions,
  unitOptions,
  shiftOptions,
  rosterOptions,
  staffOptions
}: SectionDutyFiltersProps) {
  const dutyDate = initial.dutyDate ?? new Date();
  const yearOptions = useMemo(() => {
    const current = dutyDate.getFullYear();
    return Array.from({ length: 7 }, (_, i) => {
      const year = current - 3 + i;
      return { id: String(year), name: String(year) };
    });
  }, [dutyDate]);

  const showDate = viewMode === 'list';
  const showMonthYear = viewMode === 'days' || viewMode === 'weeks';
  const showYearOnly = viewMode === 'months';

  const initialValues = {
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    dutyDate: toIso(initial.dutyDate ?? null),
    shiftTypeId: initial.shiftId ?? '',
    roster: initial.rosterId ?? '',
    staffId: initial.staffId ?? '',
    month: String((initial.dutyDate ?? new Date()).getMonth() + 1),
    year: String((initial.dutyDate ?? new Date()).getFullYear())
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={`${viewMode}|${Object.values(initialValues).join('|')}`}
        initialValues={initialValues}
        buttonLabel="Load Duty Roster"
        showClearButton
        preserveQueryKeys={['limit', 'view']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => {
          const setMonthYear = (month: string, year: string) => {
            const m = Number.parseInt(month || '1', 10) || 1;
            const y =
              Number.parseInt(year || String(new Date().getFullYear()), 10) ||
              new Date().getFullYear();
            const next = new Date(y, m - 1, 1);
            setValue('month', String(m));
            setValue('year', String(y));
            setValue('dutyDate', format(next, 'yyyy-MM-dd'));
          };

          const setYearOnly = (year: string) => {
            const y =
              Number.parseInt(year || String(new Date().getFullYear()), 10) ||
              new Date().getFullYear();
            setValue('year', String(y));
            setValue('month', '1');
            setValue('dutyDate', format(new Date(y, 0, 1), 'yyyy-MM-dd'));
          };

          return (
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Staff (optional)
                </Label>
                <Combobox
                  label="Staff"
                  options={staffOptions}
                  value={values.staffId ?? ''}
                  defaultValue=""
                  onChange={(value) => setValue('staffId', value)}
                  clearable
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Select Department
                </Label>
                <Combobox
                  label="Department"
                  options={departmentOptions}
                  value={values.department ?? ''}
                  defaultValue=""
                  onChange={(value) => setValue('department', value)}
                  clearable
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Select Unit
                </Label>
                <Combobox
                  label="Unit"
                  options={unitOptions}
                  value={values.unit ?? ''}
                  defaultValue=""
                  onChange={(value) => setValue('unit', value)}
                  clearable
                />
              </div>

              {showDate ? (
                <div>
                  <Label
                    htmlFor="dutyFilterDate"
                    className="text-xs uppercase text-muted-foreground"
                  >
                    Select Date
                  </Label>
                  <CustomDatePickerField
                    id="dutyFilterDate"
                    placeholder=""
                    value={parseLocalDate(values.dutyDate)}
                    onChange={(value) =>
                      setValue('dutyDate', toLocalDateIso(value))
                    }
                    onBlur={() => undefined}
                    required={false}
                    useFormikError={false}
                    styleClasses={{
                      parentDiv: 'grid grid-cols-1 items-start',
                      inputClassName: 'w-full'
                    }}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    List shows all duties for this calendar day.
                  </p>
                </div>
              ) : null}

              {showMonthYear ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Year
                    </Label>
                    <Combobox
                      label="Year"
                      options={yearOptions}
                      value={values.year ?? ''}
                      defaultValue=""
                      onChange={(value) =>
                        setMonthYear(values.month ?? '1', value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      Month
                    </Label>
                    <Combobox
                      label="Month"
                      options={MONTH_OPTIONS}
                      value={values.month ?? ''}
                      defaultValue=""
                      onChange={(value) =>
                        setMonthYear(
                          value,
                          values.year ?? String(new Date().getFullYear())
                        )
                      }
                    />
                  </div>
                </>
              ) : null}

              {showYearOnly ? (
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Year
                  </Label>
                  <Combobox
                    label="Year"
                    options={yearOptions}
                    value={values.year ?? ''}
                    defaultValue=""
                    onChange={setYearOnly}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Twelve month cards for this year.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Select Shift
                </Label>
                <Combobox
                  label="Shift"
                  options={shiftOptions}
                  value={values.shiftTypeId ?? ''}
                  defaultValue=""
                  onChange={(value) => setValue('shiftTypeId', value)}
                  clearable
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Select Roster
                </Label>
                <Combobox
                  label="Roster"
                  options={rosterOptions}
                  value={values.roster ?? ''}
                  defaultValue=""
                  onChange={(value) => setValue('roster', value)}
                  clearable
                />
              </div>
            </div>
          );
        }}
      </FilterWrapper>
    </div>
  );
}

export default function SectionDutyFilters(props: SectionDutyFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionDutyFiltersInner {...props} />
    </Suspense>
  );
}
