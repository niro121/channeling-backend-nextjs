'use client';

import { DatePicker } from '@/components/common/datepicker';
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
          <DatePicker
            value={values.fromDate ? new Date(values.fromDate) : undefined}
            onChange={(date) =>
              setValue(
                'fromDate',
                date ? date.toISOString().split('T')[0] : undefined
              )
            }
          />
          <DatePicker
            value={values.toDate ? new Date(values.toDate) : undefined}
            onChange={(date) =>
              setValue(
                'toDate',
                date ? date.toISOString().split('T')[0] : undefined
              )
            }
          />
        </>
      )}
    </FilterWrapper>
  );
}
