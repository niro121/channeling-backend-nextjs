'use client';

import type { ReactNode } from 'react';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';

type FilterValues = Record<string, string | undefined>;

type DataTableFilterFeatureProps = {
  initialValues?: FilterValues;
  buttonLabel?: string;
  showApplyButton?: boolean;
  showClearButton?: boolean;
  clearButtonLabel?: string;
  onApplyClick?: (params?: URLSearchParams) => void;
  onValuesChange?: (values: FilterValues) => void;
  searchButton?: {
    variant?:
      | 'link'
      | 'default'
      | 'destructive'
      | 'outline'
      | 'secondary'
      | 'ghost'
      | null
      | undefined;
    className?: string;
  };
  children: (props: {
    values: FilterValues;
    setValue: (key: string, value?: string) => void;
  }) => ReactNode;
};

/** Toolbar feature: wraps FilterWrapper for use in toolbarLeft/Middle/Right. */
export function DataTableFilterFeature({
  children,
  ...filterProps
}: DataTableFilterFeatureProps) {
  return <FilterWrapper {...filterProps}>{children}</FilterWrapper>;
}
