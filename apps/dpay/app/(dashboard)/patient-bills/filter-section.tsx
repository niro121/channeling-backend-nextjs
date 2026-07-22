'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@archmage/ui';
import type { PatientBillStatus } from '@/types/patient-bill';
import { FilterWrapper } from '../filter-wrapper';

const STATUS_OPTIONS: { value: PatientBillStatus | '__all__'; label: string }[] = [
  { value: '__all__', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

type PatientBillsFilterSectionProps = {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default function PatientBillsFilterSection({
  status,
  dateFrom,
  dateTo,
}: PatientBillsFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        status: status ?? '__all__',
        dateFrom: dateFrom ?? '',
        dateTo: dateTo ?? '',
      }}
    >
      {({ values, setValue }) => (
        <>
          <Select
            value={values.status ?? '__all__'}
            onValueChange={(v) => setValue('status', v)}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="date"
            value={values.dateFrom ?? ''}
            onChange={(e) => setValue('dateFrom', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Date from"
          />
          <input
            type="date"
            value={values.dateTo ?? ''}
            onChange={(e) => setValue('dateTo', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Date to"
          />
        </>
      )}
    </FilterWrapper>
  );
}
