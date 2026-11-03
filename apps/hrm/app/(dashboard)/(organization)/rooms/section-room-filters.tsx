'use client';

import { Suspense, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { ROOM_STATUS_OPTIONS } from '@/types/room';
import { useRoomUi } from './room-ui-context';

export type RoomListFilters = {
  search?: string;
  locationId?: string;
  zoneId?: string;
  status?: string;
};

type Props = {
  initial?: RoomListFilters;
};

const STATUS_FILTER_OPTIONS = [
  { id: '__all__', name: 'All statuses' },
  ...ROOM_STATUS_OPTIONS.map((opt) => ({
    id: opt.id,
    name: opt.name
  }))
];

function SectionRoomFiltersInner({ initial = {} }: Props) {
  const { locationOptions, zoneOptions } = useRoomUi();

  const initialValues = {
    search: initial.search ?? '',
    locationId: initial.locationId || '__all__',
    zoneId: initial.zoneId || '__all__',
    status: initial.status || '__all__'
  };

  const locationFilterOptions = useMemo(
    () => [
      { id: '__all__', name: 'All locations' },
      ...locationOptions.map((loc) => ({
        id: loc.id,
        name: `${loc.name} (${loc.code})`
      }))
    ],
    [locationOptions]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.search,
          initialValues.locationId,
          initialValues.zoneId,
          initialValues.status
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['id']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => {
          const selectedLocationId =
            values.locationId && values.locationId !== '__all__'
              ? values.locationId
              : '';
          const zonesForFilter = selectedLocationId
            ? zoneOptions.filter((zone) => zone.locationId === selectedLocationId)
            : zoneOptions;
          const zoneFilterOptions = [
            { id: '__all__', name: 'All zones' },
            ...zonesForFilter.map((zone) => ({
              id: zone.id,
              name: `${zone.name} (${zone.code})`
            }))
          ];

          return (
            <>
              <div className="flex w-60 flex-col justify-end gap-2 self-end">
                <Label
                  htmlFor="room-search"
                  className="text-xs uppercase text-muted-foreground"
                >
                  Search
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="room-search"
                    name="search"
                    data-filter-include
                    defaultValue={values.search ?? ''}
                    placeholder="Number, code, or location..."
                    className="h-10 pl-9"
                    aria-label="Search rooms"
                  />
                </div>
              </div>

              <div className="flex w-60 flex-col justify-end self-end">
                <Selector
                  label="All locations"
                  options={locationFilterOptions}
                  value={values.locationId}
                  defaultValue="__all__"
                  showDefaultOption={false}
                  onChange={(v) => {
                    setValue('locationId', v);
                    setValue('zoneId', '__all__');
                  }}
                  className={{ trigger: 'h-10 w-full' }}
                />
              </div>

              <div className="flex w-60 flex-col justify-end self-end">
                <Selector
                  label="All zones"
                  options={zoneFilterOptions}
                  value={values.zoneId}
                  defaultValue="__all__"
                  showDefaultOption={false}
                  onChange={(v) => setValue('zoneId', v)}
                  className={{ trigger: 'h-10 w-full' }}
                />
              </div>

              <div className="flex w-60 flex-col justify-end self-end">
                <Selector
                  label="All statuses"
                  options={STATUS_FILTER_OPTIONS}
                  value={values.status}
                  defaultValue="__all__"
                  showDefaultOption={false}
                  onChange={(v) => setValue('status', v)}
                  className={{ trigger: 'h-10 w-full' }}
                />
              </div>
            </>
          );
        }}
      </FilterWrapper>
    </div>
  );
}

export default function SectionRoomFilters(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Loading filters…
        </div>
      }
    >
      <SectionRoomFiltersInner {...props} />
    </Suspense>
  );
}
