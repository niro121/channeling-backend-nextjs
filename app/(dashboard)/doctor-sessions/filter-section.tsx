'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

type Option = { id: string; name: string };
interface DoctorSessionFiltersProps {
  locationOptions: Option[];
  locationId?: string;
  doctorOptions: Option[];
  doctorId?: string;
}

export default function FilterSection({
  locationOptions,
  locationId,
  doctorOptions,
  doctorId
}: DoctorSessionFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        locationId,
        doctorId
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
          <Selector
            label="All Doctors"
            options={doctorOptions}
            value={values.doctorId}
            onChange={(v) => setValue('doctorId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
