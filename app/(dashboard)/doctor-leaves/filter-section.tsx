'use client';

import { DateRangePicker } from '@/components/common/date-range-picker';
import { FilterWrapper } from '../filter-wrapper';
import { Combobox } from '@/components/common/combobox';
import { DoctorLeaveFilterOption } from '@/types/doctor.leave';

interface DoctorLeavesFilterSectionProps {
  doctorOptions: DoctorLeaveFilterOption[];
  doctorId?: string;
  fromDate?: string;
  toDate?: string;
}

export default function DoctorLeavesFilterSection({
  doctorOptions,
  doctorId,
  fromDate,
  toDate
}: DoctorLeavesFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        doctorId: doctorId ?? '',
        fromDate,
        toDate
      }}
    >
      {({ values, setValue }) => {
        const hasDoctorSelected = Boolean(
          values.doctorId && values.doctorId !== '__all__'
        );
        return (
          <>
            <Combobox
              label="Select Doctor"
              options={doctorOptions}
              value={values.doctorId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('doctorId', v)}
            />
            {hasDoctorSelected && (
              <DateRangePicker
                from={values.fromDate}
                to={values.toDate}
                onChange={({ from, to }) => {
                  setValue('fromDate', from);
                  setValue('toDate', to);
                }}
              />
            )}
          </>
        );
      }}
    </FilterWrapper>
  );
}
