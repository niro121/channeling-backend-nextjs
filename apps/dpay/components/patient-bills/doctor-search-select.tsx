'use client';

import * as React from 'react';
import { ChevronsUpDown, Loader2 } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@archmage/ui';
import { searchChannelingDoctorsAction } from '@/app/actions/channeling/doctors.actions';
import {
  formatPublicDoctorLabel,
  type PublicDoctor,
} from '@/types/channeling-doctor';

type DoctorSearchSelectProps = {
  value: string;
  onChange: (doctorName: string, doctor?: PublicDoctor) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
};

export function DoctorSearchSelect({
  value,
  onChange,
  placeholder = 'Search doctor...',
  className,
  disabled = false,
  hasError = false,
}: DoctorSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [doctors, setDoctors] = React.useState<PublicDoctor[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const requestIdRef = React.useRef(0);

  const loadDoctors = React.useCallback(async (keyword: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await searchChannelingDoctorsAction(keyword);
      if (requestId !== requestIdRef.current) return;

      if (!result.success) {
        setDoctors([]);
        setError(result.message);
        return;
      }

      if (!result.configured) {
        setDoctors([]);
        setError(result.message);
        return;
      }

      setDoctors(result.doctors);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setDoctors([]);
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(() => {
      void loadDoctors(search);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [open, search, loadDoctors]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal ring-offset-background hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            !value && 'text-muted-foreground',
            hasError && 'border-destructive',
            className
          )}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Search by name or speciality..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[280px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading doctors...
              </div>
            ) : error ? (
              <div className="px-3 py-6 text-center text-sm text-destructive">{error}</div>
            ) : (
              <>
                <CommandEmpty>No doctors found.</CommandEmpty>
                <CommandGroup>
                  {doctors.map((doctor) => {
                    const label = formatPublicDoctorLabel(doctor);
                    return (
                      <CommandItem
                        key={doctor.id}
                        value={label}
                        onSelect={() => {
                          onChange(label, doctor);
                          setSearch('');
                          setOpen(false);
                        }}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {`${doctor.title} ${doctor.name}`.trim()}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {[doctor.code, doctor.specialityName].filter(Boolean).join(' · ') ||
                              '—'}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
