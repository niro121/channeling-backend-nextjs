'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@archmage/ui';
import { DOCTOR_PAYMENT_STATUSES } from '@/types/doctor-payment';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { FilterWrapper } from '../filter-wrapper';

const METHOD_OPTIONS = [
  { value: '__all__', label: 'All Methods' },
  ...PATIENT_BILL_PAYMENT_METHODS.map((m) => ({
    value: String(m.value),
    label: m.label,
  })),
];

const STATUS_OPTIONS = [
  { value: '__all__', label: 'All Status' },
  ...DOCTOR_PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

type DoctorPaymentsFilterSectionProps = {
  method?: string;
  status?: string;
};

export default function DoctorPaymentsFilterSection({
  method,
  status,
}: DoctorPaymentsFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        method: method ?? '__all__',
        status: status ?? '__all__',
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
        </>
      )}
    </FilterWrapper>
  );
}
