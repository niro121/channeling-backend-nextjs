'use client';

import { FilterWrapper } from '../filter-wrapper';
import { Selector } from '@/components/common/selector';

interface AgencyBookFiltersProps {
  agencyOptions: { id: string; name: string }[];
  agencyId?: string;
}

export default function FilterSection({
  agencyOptions,
  agencyId
}: AgencyBookFiltersProps) {
  return (
    <FilterWrapper
      initialValues={{
        agencyId
      }}
    >
      {({ values, setValue }) => (
        <>
          <Selector
            label="All Agencies"
            options={agencyOptions}
            value={values.agencyId}
            onChange={(v) => setValue('agencyId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
