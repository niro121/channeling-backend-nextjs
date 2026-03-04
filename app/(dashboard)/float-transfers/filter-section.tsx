'use client';

import { FilterWrapper } from '../filter-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FLOAT_REQUEST_STATUS } from '@/types/float-request';

const STATUS_OPTIONS = [
  { value: '__all__', label: 'All statuses' },
  { value: String(FLOAT_REQUEST_STATUS.PENDING), label: 'PENDING' },
  { value: String(FLOAT_REQUEST_STATUS.APPROVED), label: 'APPROVED' },
  { value: String(FLOAT_REQUEST_STATUS.RECEIVED), label: 'RECEIVED' },
  { value: String(FLOAT_REQUEST_STATUS.REJECTED), label: 'REJECTED' },
  { value: String(FLOAT_REQUEST_STATUS.CANCELLED), label: 'CANCELLED' },
];

interface FloatTransfersFilterSectionProps {
  status?: string;
}

export default function FloatTransfersFilterSection({ status }: FloatTransfersFilterSectionProps) {
  return (
    <FilterWrapper
      initialValues={{
        status: status ?? '__all__',
      }}
    >
      {({ values, setValue }) => (
        <Select
          value={values.status ?? '__all__'}
          onValueChange={(v) => setValue('status', v)}
        >
          <SelectTrigger className="w-[180px] h-10">
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
      )}
    </FilterWrapper>
  );
}
