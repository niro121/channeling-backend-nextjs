'use client';

import { Label } from '@archmage/ui';

type ReportDateRangeFieldsProps = {
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  idPrefix?: string;
};

/** Same From / To date inputs used by Receipt and Doctor Payment reports. */
export function ReportDateRangeFields({
  dateFrom = '',
  dateTo = '',
  onDateFromChange,
  onDateToChange,
  idPrefix = 'report',
}: ReportDateRangeFieldsProps) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={`${idPrefix}-date-from`}
          className="text-xs text-muted-foreground shrink-0"
        >
          From
        </Label>
        <input
          id={`${idPrefix}-date-from`}
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Date from"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Label
          htmlFor={`${idPrefix}-date-to`}
          className="text-xs text-muted-foreground shrink-0"
        >
          To
        </Label>
        <input
          id={`${idPrefix}-date-to`}
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Date to"
        />
      </div>
    </>
  );
}
