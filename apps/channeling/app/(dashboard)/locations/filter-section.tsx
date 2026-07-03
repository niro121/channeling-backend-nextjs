'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

interface LocationFiltersProps {
  locationTypeOptions: { id: string; name: string }[];
  locationId?: string;
}

export default function FilterSection({
  locationTypeOptions,
  locationId
}: LocationFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        locationId
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Location Types"
            options={locationTypeOptions}
            value={values.locationId}
            onChange={(v) => setValue('locationId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
