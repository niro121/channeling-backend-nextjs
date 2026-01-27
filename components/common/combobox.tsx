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
import { Check, ChevronsUpDown } from 'lucide-react';

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
};

export function Combobox({
  label,
  options,
  value,
  onChange,
  defaultValue = '__all__'
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={options.length === 0}
          className="w-60 justify-between"
        >
          {selectedOption?.name || label}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0">
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
                  <Check
                    className={cn(
                      'ml-auto',
                      value === option.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
