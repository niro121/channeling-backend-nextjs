'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SearchIcon } from '@/components/icons';

type FilterValues = Record<string, string | undefined>;

interface FilterWrapperProps {
  initialValues?: FilterValues;
  buttonLabel?: string;
  /** Set to false to hide the Apply button (e.g. when other actions handle filter application). */
  showApplyButton?: boolean;
  /** When true, shows a Clear button that resets all filters and navigates to the base path. */
  showClearButton?: boolean;
  /** Label for the Clear button (default: "Clear"). */
  clearButtonLabel?: string;
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
  showClearButton = false,
  clearButtonLabel = 'Clear',
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
  // const prevParamsRef = React.useRef<string>('');

  // Sync values when URL params change (e.g. back/forward nav, or after Search)
  // Use searchParams.toString() to avoid overwriting user edits during same-session edits
  /* React.useEffect(() => {
    const paramsKey = searchParams.toString();
    if (paramsKey !== prevParamsRef.current) {
      prevParamsRef.current = paramsKey;
      const next: FilterValues = {};
      searchParams.forEach((value, key) => {
        next[key] = value;
      });
      setValues(next);
    }
  }, [searchParams]); */

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

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== '__all__') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Override with DOM values from any input that opts in via data-filter-include.
    // The input's name attribute is used as the param key.
    if (typeof window !== 'undefined') {
      const inputs = document.querySelectorAll<HTMLInputElement>('input[data-filter-include]');
      inputs.forEach((input) => {
        const key = input.getAttribute('name');
        if (key) {
          const val = input.value?.trim();
          if (val) params.set(key, val);
          else params.delete(key);
        }
      });
    }

    params.delete('page');

    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    onApplyClick?.();
    startTransition(() => {
      router.push(href);
    });
  };

  const clearFilters = () => {
    setValues({});
    if (typeof window !== 'undefined') {
      document.querySelectorAll<HTMLInputElement>('input[data-filter-include]').forEach((input) => {
        input.value = '';
      });
    }
    // Don't call onApplyClick when clearing - it sets loading state for fetch, but we're not fetching after clear.
    // The report-template will handle clearing data/loading via useEffect when searchParams become empty.
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {children({ values, setValue })}

      {showApplyButton && (
        <Button
          onClick={applyFilters}
          disabled={isPending}
          className="h-10 shrink-0 gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      )}
      {showClearButton && (
        <Button
          size="sm"
          variant="ghost"
          onClick={clearFilters}
          disabled={isPending}
          className="h-10 shrink-0"
        >
          {clearButtonLabel}
        </Button>
      )}
    </div>
  );
}
