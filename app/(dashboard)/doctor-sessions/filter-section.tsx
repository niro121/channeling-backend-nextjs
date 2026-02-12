'use client';

import React, { useEffect } from 'react';
import { useDoctorSessionStore } from '@/store/store-doctor-session';
import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';

type Option = { id: string; name: string };
interface DoctorSessionFiltersProps {
  institutionOptions: Option[];
  institutionId?: string;
  doctorOptions: Option[];
  doctorId?: string;
}

export default function FilterSection({
  institutionOptions,
  institutionId,
  doctorOptions,
  doctorId
}: DoctorSessionFiltersProps) {
  const { setDoctor, setInstitution } = useDoctorSessionStore();

  useEffect(() => {
    const effectiveInstitutionId = institutionId ?? '0';
    const inst = institutionOptions.find((o) => o.id === effectiveInstitutionId);
    if (inst) setInstitution(inst);
    if (doctorId && doctorId !== '__all__') {
      const doc = doctorOptions.find((o) => o.id === doctorId);
      if (doc) setDoctor(doc);
    }
  }, [institutionId, doctorId, institutionOptions, doctorOptions, setInstitution, setDoctor]);

  return (
    <FilterWrapper
      initialValues={{
        institutionId,
        doctorId
      }}
      buttonLabel="Search sessions"
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="Institution"
            options={institutionOptions}
            value={values.institutionId ?? '0'}
            onChange={(v) => {
              setInstitution(institutionOptions.find((o) => o.id === v)!);
              setValue('institutionId', v);
            }}
          />
          <Combobox
            label="Doctor"
            options={doctorOptions}
            value={values.doctorId || '__all__'}
            onChange={(v) => {
              setDoctor(doctorOptions.find((o) => o.id === v)!);
              setValue('doctorId', v);
            }}
          />
        </>
      )}
    </FilterWrapper>
  );
}
