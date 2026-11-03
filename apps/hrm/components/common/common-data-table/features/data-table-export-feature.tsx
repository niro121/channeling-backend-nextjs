'use client';

import { Settings2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@archmage/ui';
import {
  ExportWrapper,
  type ExportWrapperProps
} from '@/app/(dashboard)/export-wrapper';
import { useCommonDataTableContext } from '../common-data-table-context';

type DataTableColumnToggleProps = {
  className?: string;
};

/** Optional column visibility control for CommonDataTable. */
export function DataTableColumnToggle({ className }: DataTableColumnToggleProps) {
  const { table } = useCommonDataTableContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className ?? 'h-9 gap-1.5'}
        >
          <Settings2 className="h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide()
          )
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DataTableExportFeatureProps<T> = ExportWrapperProps<T> & {
  /** When true, shows a Columns visibility toggle next to export buttons. */
  showColumnToggle?: boolean;
  className?: string;
};

/** Toolbar feature: ExportWrapper + optional column visibility toggle. */
export function DataTableExportFeature<T>({
  showColumnToggle = false,
  className,
  ...exportProps
}: DataTableExportFeatureProps<T>) {
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      {showColumnToggle ? <DataTableColumnToggle /> : null}
      <ExportWrapper {...exportProps} />
    </div>
  );
}
