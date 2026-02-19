'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type FilterValues = Record<string, string | undefined>;

interface FilterWrapperProps {
  initialValues?: FilterValues;
  buttonLabel?: string;
  /** Set to false to hide the Apply button (e.g. when other actions handle filter application). */
  showApplyButton?: boolean;
  /** Called when the Apply/Search button is clicked, before navigation. Use to clear list data and show loading. */
  onApplyClick?: () => void;
  /** Called when filter values change (e.g. user changed dropdown). Use to clear list until Search is clicked. */
  onValuesChange?: (values: FilterValues) => void;
  children: (props: {
    values: FilterValues;
    setValue: (key: string, value?: string) => void;
  }) => React.ReactNode;
}

export function FilterWrapper({
  initialValues = {},
  buttonLabel = 'Apply',
  showApplyButton = true,
  onApplyClick,
  onValuesChange,
  children
}: FilterWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = React.useState<FilterValues>(initialValues);
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onValuesChange?.(values);
  }, [values]);

  const setValue = (key: string, value?: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Also read the search input value from the DOM if it exists
    // This ensures the search keyword is included even if user didn't press Enter
    if (typeof window !== 'undefined') {
      const searchInput = document.querySelector('input[name="keyword"]') as HTMLInputElement;
      if (searchInput && searchInput.value) {
        params.set('keyword', searchInput.value);
      } else if (searchInput && !searchInput.value) {
        params.delete('keyword');
      }
    }

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== '__all__') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    params.delete('page');

    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    onApplyClick?.();
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {children({ values, setValue })}

      {showApplyButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={applyFilters}
          disabled={isPending}
          className="h-10 shrink-0 gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
