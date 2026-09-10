'use client';

import { FilterWrapper } from '../filter-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportUserSelect } from '@/components/common/user-select';
import type { ReportUserOption } from '@/components/common/user-select';
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
  requestedById?: string;
  bulkCashierId?: string;
  userOptions: ReportUserOption[];
  mode?: 'given' | 'requested';
}

export default function FloatTransfersFilterSection({
  status,
  requestedById,
  bulkCashierId,
  userOptions,
  mode = 'given',
}: FloatTransfersFilterSectionProps) {
  const isGiven = mode === 'given';
  return (
    <FilterWrapper
      initialValues={{
        status: status ?? '__all__',
        ...(isGiven
          ? { requestedById: requestedById ?? '__all__' }
          : { bulkCashierId: bulkCashierId ?? '__all__' }),
      }}
    >
      {({ values, setValue }) => (
        <>
          <ReportUserSelect
            userOptions={userOptions}
            value={
              isGiven
                ? values.requestedById ?? '__all__'
                : values.bulkCashierId ?? '__all__'
            }
            onChange={(v) => setValue(isGiven ? 'requestedById' : 'bulkCashierId', v)}
            label={isGiven ? 'Requested by' : 'Assigned to'}
            placeholder="Select user"
            widthClassName="w-[220px]"
          />
          <Select
            value={values.status ?? '__all__'}
            onValueChange={(v) => setValue('status', v)}
          >
            <SelectTrigger className="w-[180px] h-10 self-end">
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
        </>
      )}
    </FilterWrapper>
  );
}
