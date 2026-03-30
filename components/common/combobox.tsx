'use client';

import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

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
};

export function Combobox({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__',
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={loading || options.length === 0}
          className="w-60 min-w-0 justify-between gap-2 text-start"
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

      <PopoverContent className="w-60 p-0">
        <Command>
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
                      value={option.name}
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
  );
}
