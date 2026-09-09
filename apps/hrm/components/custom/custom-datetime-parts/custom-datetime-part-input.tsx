'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  constrainTypingValue,
  normalizePartValue,
  partRange,
  rangeOptions,
  type DateTimePartKey,
  type DateTimeParts,
  type DateTimePartsConfig
} from './custom-datetime-parts';

export type DateTimePartInputProps = {
  id: string;
  label: string;
  partKey: DateTimePartKey;
  parts: DateTimeParts;
  value: string;
  onChange: (value: string) => void;
  config?: DateTimePartsConfig;
  className?: string;
};

export function CustomDateTimePartInput({
  id,
  label,
  partKey,
  parts,
  value,
  onChange,
  config,
  className
}: DateTimePartInputProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { min, max, pad } = partRange(partKey, parts, config);

  const options = useMemo(() => rangeOptions(min, max, pad), [min, max, pad]);

  const filtered = useMemo(() => {
    const query = value.replace(/\D/g, '');
    if (!query) return options;
    return options.filter((option) => option.name.includes(query));
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const commit = (raw: string) => {
    onChange(normalizePartValue(partKey, raw, parts, config));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative space-y-1', className)}>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          maxLength={pad}
          value={value}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(
              constrainTypingValue(partKey, event.target.value, parts, config)
            );
            setOpen(true);
          }}
          onBlur={() => {
            onChange(normalizePartValue(partKey, value, parts, config));
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(value);
            }
            if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="h-9 px-1 pr-5 text-center tabular-nums"
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-4 items-center justify-center text-muted-foreground"
          aria-label={`Open ${label} options`}
          onMouseDown={(event) => {
            event.preventDefault();
            setOpen((current) => !current);
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <p className="text-center text-[10px] font-medium uppercase text-muted-foreground">
        {label}
      </p>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-background py-1 shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-center text-xs text-muted-foreground">
              No match
            </li>
          ) : (
            filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className={cn(
                    'flex w-full justify-center px-2 py-1 text-xs tabular-nums hover:bg-muted',
                    option.id === value &&
                      'bg-primary/10 font-medium text-primary'
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(option.id);
                  }}
                >
                  {option.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
