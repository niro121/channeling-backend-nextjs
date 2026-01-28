'use client';

import { useDoctorSessionStore } from '@/store/store-doctor-session';
import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';

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
  const { setDoctor, setLocation } = useDoctorSessionStore();

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
            onChange={(v) => {
              setLocation(locationOptions.find((o) => o.id === v)!);
              setValue('locationId', v);
            }}
          />
          <Combobox
            label="All Doctors"
            options={doctorOptions}
            value={values.doctorId || '__all__'}
            onChange={(v) => {
              (setDoctor(doctorOptions.find((o) => o.id === v)!),
                setValue('doctorId', v));
            }}
          />
        </>
      )}
    </FilterWrapper>
  );
}
