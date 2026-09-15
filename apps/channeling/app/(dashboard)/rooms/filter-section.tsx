'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

interface RoomFiltersProps {
  locationOptions: { id: string; name: string }[];
  locationId?: string;
}

export default function FilterSection({
  locationOptions,
  locationId
}: RoomFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        locationId
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Locations"
            options={locationOptions}
            value={values.locationId}
            onChange={(v) => setValue('locationId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
