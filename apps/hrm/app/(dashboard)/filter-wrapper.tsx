"use client";

import React, { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@archmage/ui";
import { Loader2, SearchIcon } from "lucide-react";

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
  /** Called when the Apply/Search button is clicked. Receives the new URLSearchParams for immediate fetch. */
  onApplyClick?: (params?: URLSearchParams) => void;
  /** Called when filter values change (e.g. user changed dropdown). Use to clear list until Search is clicked. */
  onValuesChange?: (values: FilterValues) => void;
  children: (props: {
    values: FilterValues;
    setValue: (key: string, value?: string) => void;
  }) => React.ReactNode;
  searchButton?: {
    variant?:
      | "link"
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | null
      | undefined;
    className?: string;
  };
}

export function FilterWrapper({
  initialValues = {},
  buttonLabel = "Apply",
  showApplyButton = true,
  showClearButton = false,
  clearButtonLabel = "Clear",
  onApplyClick,
  onValuesChange,
  children,
  searchButton,
}: FilterWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = React.useState<FilterValues>(initialValues);
  const [isApplying, setIsApplying] = React.useState(false);
  const isInitialMount = React.useRef(true);
  const expectedParamsKeyRef = React.useRef<string | null>(null);
  const applyingTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  React.useEffect(() => {
    if (!isApplying) return;
    const expected = expectedParamsKeyRef.current;
    if (expected == null) return;

    // Once the URL reflects the last-applied params, stop the button spinner/disable.
    if (searchParams.toString() === expected) {
      setIsApplying(false);
      expectedParamsKeyRef.current = null;
      if (applyingTimeoutRef.current != null) {
        window.clearTimeout(applyingTimeoutRef.current);
        applyingTimeoutRef.current = null;
      }
    }
  }, [isApplying, searchParams]);

  const setValue = (key: string, value?: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const buildParams = (): URLSearchParams => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(values).forEach(([key, value]) => {
      if (value && value !== "__all__") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    if (typeof window !== "undefined") {
      document.querySelectorAll<HTMLInputElement>("input[data-filter-include]").forEach((input) => {
        const key = input.getAttribute("name");
        if (key) {
          const val = input.value?.trim();
          if (val) params.set(key, val);
          else params.delete(key);
        }
      });
    }

    params.delete("page");
    return params;
  };

  const applyFilters = () => {
    const params = buildParams();
    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    onApplyClick?.(params);

    // Disable button + show spinner immediately on click even if navigation is very fast.
    expectedParamsKeyRef.current = queryString;
    setIsApplying(true);
    if (applyingTimeoutRef.current != null) {
      window.clearTimeout(applyingTimeoutRef.current);
    }
    applyingTimeoutRef.current = window.setTimeout(() => {
      setIsApplying(false);
      expectedParamsKeyRef.current = null;
      applyingTimeoutRef.current = null;
    }, 8000);

    router.push(href);
  };

  const clearFilters = () => {
    setValues({});
    if (typeof window !== "undefined") {
      document.querySelectorAll<HTMLInputElement>("input[data-filter-include]").forEach((input) => {
        input.value = "";
      });
    }
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {children({ values, setValue })}

      {(showApplyButton || showClearButton) && (
        <div className="flex shrink-0 flex-nowrap items-center gap-3 self-end">
          {showApplyButton && (
            <Button
              size="sm"
              variant={searchButton?.variant ?? "outline"}
              onClick={applyFilters}
              disabled={isPending || isApplying}
              className={searchButton?.className ?? "h-10 shrink-0 gap-2"}
            >
              {isPending || isApplying ? (
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
      )}
    </div>
  );
}
