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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';

type Option = {
  id: string;
  name: string;
};

type SearchableSelectorProps = {
  label: string;
  value?: string;
  options: Option[];
  defaultValue?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  /** Shown on the trigger when no value is selected; defaults to label */
  placeholder?: string;
};

export function SearchableSelector({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__',
  className = 'w-60',
  disabled = false,
  placeholder,
}: SearchableSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((opt) => opt.id === value);
  const emptyLabel = placeholder ?? label;
  const displayValue = value && value !== defaultValue ? selectedOption?.name : emptyLabel;
  const isPlaceholder = !value || value === defaultValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled || options.length === 0}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            "hover:bg-background hover:text-foreground hover:border-input",
            isPlaceholder && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayValue || emptyLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn("p-0", className)} align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
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
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

