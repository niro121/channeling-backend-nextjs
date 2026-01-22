'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

interface DoctorFiltersProps {
  specialityOptions: { id: string; name: string }[];
  specialityId?: string;
}

export default function FilterSection({
  specialityOptions,
  specialityId
}: DoctorFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        specialityId
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Specialities"
            options={specialityOptions}
            value={values.specialityId}
            onChange={(v) => setValue('specialityId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
