'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

type FilterValues = Record<string, string | undefined>;

interface FilterWrapperProps {
  initialValues?: FilterValues;
  children: (props: {
    values: FilterValues;
    setValue: (key: string, value?: string) => void;
  }) => React.ReactNode;
}

export function FilterWrapper({
  initialValues = {},
  children
}: FilterWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [values, setValues] = React.useState<FilterValues>(initialValues);

  const setValue = (key: string, value?: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== '__all__') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    params.delete('page');

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {children({ values, setValue })}

      <Button size="sm" variant="outline" onClick={applyFilters}>
        Apply
      </Button>
    </div>
  );
}
