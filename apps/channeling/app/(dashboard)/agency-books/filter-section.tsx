'use client';

import { FilterWrapper } from '../filter-wrapper';
import { SearchableSelector } from '@/components/common/searchable-selector';

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
          <SearchableSelector
            label="All Agencies"
            placeholder="All Agencies"
            options={[{ id: '__all__', name: 'All Agencies' }, ...agencyOptions]}
            value={values.agencyId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('agencyId', v)}
          />
        </>
      )}
    </FilterWrapper>
  );
}
