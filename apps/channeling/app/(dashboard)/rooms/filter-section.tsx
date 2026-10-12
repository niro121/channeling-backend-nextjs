'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';
import { SearchInput } from '@/components/common/search';

const OCCUPANCY_OPTIONS = [
  { id: 'occupied', name: 'Occupied' },
  { id: 'available', name: 'Available' }
];

interface RoomFiltersProps {
  locationOptions: { id: string; name: string }[];
  locationId?: string;
  occupancy?: string;
}

export default function FilterSection({
  locationOptions,
  locationId,
  occupancy
}: RoomFiltersProps) {
  return (
    <FilterWrapper
      className="flex-nowrap overflow-visible py-1"
      initialValues={{
        locationId,
        occupancy
      }}
    >
      {({ values, setValue }) => (
        <>
          <div className="relative w-56 shrink-0">
            <SearchInput
              name="keyword"
              placeholder="Search by number, zone"
              className="pl-8 w-full h-9"
            />
          </div>
          <Selector
            label="All Locations"
            options={locationOptions}
            value={values.locationId}
            onChange={(v) => setValue('locationId', v)}
            className={{ trigger: 'w-48!' }}
          />
          <Selector
            label="All Occupancy"
            options={OCCUPANCY_OPTIONS}
            value={values.occupancy}
            onChange={(v) => setValue('occupancy', v)}
            className={{ trigger: 'w-48!' }}
          />
        </>
      )}
    </FilterWrapper>
  );
}
