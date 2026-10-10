'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button, Input } from '@archmage/ui';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

type RosterColumnHeaderProps = {
  label: string;
  /** When set, header is sortable. */
  sortKey?: string;
  activeSortKey?: string | null;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  /** When set, shows a compact column filter input. */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  className?: string;
  align?: 'left' | 'right';
};

export function RosterColumnHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  filterValue,
  onFilterChange,
  filterPlaceholder = 'Filter…',
  className,
  align = 'left'
}: RosterColumnHeaderProps) {
  const isActive = Boolean(sortKey && activeSortKey === sortKey);
  const SortIcon = !isActive
    ? ArrowUpDown
    : sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown;

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 py-1',
        align === 'right' && 'items-end',
        className
      )}
    >
      {sortKey && onSort ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary/40',
            isActive && 'bg-primary/5 text-foreground',
            align === 'right' && 'flex-row-reverse'
          )}
          onClick={() => onSort(sortKey)}
        >
          {label}
          <SortIcon
            className={cn('h-3 w-3 shrink-0', isActive ? 'opacity-100' : 'opacity-50')}
          />
        </Button>
      ) : (
        <span
          className={cn(
            'px-1.5 text-xs font-medium text-muted-foreground',
            align === 'right' && 'text-right'
          )}
        >
          {label}
        </span>
      )}

      {onFilterChange ? (
        <Input
          value={filterValue ?? ''}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={filterPlaceholder}
          className="h-7 min-w-22 text-xs"
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
    </div>
  );
}
