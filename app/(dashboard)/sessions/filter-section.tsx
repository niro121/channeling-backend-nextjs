'use client';

import { DateRangePicker } from '@/components/common/date-range-picker';
import { FilterWrapper } from '../filter-wrapper';
import { Combobox } from '@/components/common/combobox';
import { useSessionStore } from '@/store/store-session';

type Option = { id: string; name: string };

interface SessionFiltersProps {
  doctorOptions: Option[];
  doctorId?: string;
  fromDate?: string;
  toDate?: string;
}

export default function FilterSection({
  doctorOptions,
  doctorId,
  fromDate,
  toDate
}: SessionFiltersProps) {
  const { setDoctor } = useSessionStore();

  return (
    <FilterWrapper
      initialValues={{
        doctorId: doctorId ?? '__all__',
        fromDate,
        toDate
      }}
    >
      {({ values, setValue }) => (
        <>
          <Combobox
            label="All Doctors"
            options={doctorOptions}
            value={values.doctorId ?? '__all__'}
            onChange={(v) => {
              (setDoctor(doctorOptions.find((o) => o.id === v)!),
                setValue('doctorId', v));
            }}
          />
          <DateRangePicker
            from={values.fromDate}
            to={values.toDate}
            onChange={({ from, to }) => {
              setValue('fromDate', from);
              setValue('toDate', to);
            }}
          />
        </>
      )}
    </FilterWrapper>
  );
}
