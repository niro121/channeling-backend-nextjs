"use client"
'use client';

import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '../ui/popover';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';

type Option = {
  id: string;
  name: string;
};

type ComboboxProps = {
  label: string;
  options: Option[];
  value: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  loading?: boolean;
  /** Show a clear control when value differs from default (e.g. reset to all branches). */
  clearable?: boolean;
  /** Optional width/style override for the trigger button. */
  triggerClassName?: string;
  /** Optional width/style override for the dropdown panel. */
  popoverClassName?: string;
};

export function Combobox({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__',
  loading = false,
  clearable = false,
  triggerClassName,
  popoverClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((opt) => opt.id === value);
  const canClear = clearable && !loading && options.length > 0 && value !== defaultValue;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={loading || options.length === 0}
            className={cn('w-60 min-w-0 justify-between gap-2 text-start', triggerClassName)}
          >
            <span
              className="min-w-0 flex-1 truncate"
              title={loading ? `Loading ${label}...` : selectedOption?.name || label}
            >
              {loading ? `Loading ${label}...` : selectedOption?.name || label}
            </span>
            {loading ? (
              <Loader2 className="shrink-0 opacity-70 animate-spin" />
            ) : (
              <ChevronsUpDown className="shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>

      <PopoverContent className={cn('w-60 p-0', popoverClassName)}>
        <Command value={value}>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} disabled={loading} />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      keywords={[option.name]}
                      onSelect={() => {
                        onChange(option.id);
                        setOpen(false);
                      }}
                    >
                      {option.name}
                      <Check
                        className={cn(
                          'ml-auto',
                          value === option.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
      {canClear ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={`Clear ${label}`}
          onClick={() => onChange(defaultValue)}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
