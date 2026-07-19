'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@archmage/ui';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { FilterWrapper } from '../filter-wrapper';

const METHOD_OPTIONS = [
  { value: '__all__', label: 'All Methods' },
  ...PATIENT_BILL_PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label })),
];

const STATUS_OPTIONS = [
  { value: '__all__', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
];

type ReceiptsFilterSectionProps = {
  method?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default function ReceiptsFilterSection({
  method,
  status,
  dateFrom,
  dateTo,
}: ReceiptsFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        method: method ?? '__all__',
        status: status ?? '__all__',
        dateFrom: dateFrom ?? '',
        dateTo: dateTo ?? '',
      }}
    >
      {({ values, setValue }) => (
        <>
          <Select
            value={values.method ?? '__all__'}
            onValueChange={(v) => setValue('method', v)}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={values.status ?? '__all__'}
            onValueChange={(v) => setValue('status', v)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Status" />
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
