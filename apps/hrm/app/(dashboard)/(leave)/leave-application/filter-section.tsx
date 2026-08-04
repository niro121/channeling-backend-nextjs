'use client';

import {
  Combobox,
  DateRangePicker,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type FilterOption = {
  id: string;
  name: string;
};

type FilterValues = Record<string, string | undefined>;

const DATE_SEARCH_BY_OPTIONS: FilterOption[] = [
  { id: 'created', name: 'Created Date' },
  { id: 'approved', name: 'Approved Date' },
  { id: 'shift', name: 'Shift Date' }
];

interface LeaveApplicationFilterSectionProps {
  staffOptions: FilterOption[];
  leaveTypeOptions: FilterOption[];
  approverOptions: FilterOption[];
  staffId?: string;
  leaveType?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
  dateSearchBy?: string;
  outWithCancel?: string;
  onValuesChange?: (values: FilterValues) => void;
}

export default function LeaveApplicationFilterSection({
  staffOptions,
  leaveTypeOptions,
  approverOptions,
  staffId,
  leaveType,
  approverId,
  fromDate,
  toDate,
  dateSearchBy,
  outWithCancel,
  onValuesChange
}: LeaveApplicationFilterSectionProps) {
  const initialValues = {
    staffId: staffId ?? '',
    leaveType,
    approverId: approverId ?? '',
    fromDate,
    toDate,
    dateSearchBy: dateSearchBy ?? 'created',
    outWithCancel: outWithCancel ?? 'all'
  };

  return (
    <FilterWrapper
      key={[
        initialValues.staffId,
        initialValues.leaveType,
        initialValues.approverId,
        initialValues.fromDate,
        initialValues.toDate,
        initialValues.dateSearchBy,
        initialValues.outWithCancel
      ].join('|')}
      initialValues={initialValues}
      buttonLabel="Search"
      showClearButton
      onValuesChange={onValuesChange}
    >
      {({ values, setValue }) => (
        <>
          <Combobox
            label="Select Staff"
            options={staffOptions}
            value={values.staffId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('staffId', v)}
            clearable
          />

          <Selector
            label="Search by Date"
            options={DATE_SEARCH_BY_OPTIONS}
            value={values.dateSearchBy}
            defaultValue="created"
            showDefaultOption={false}
            onChange={(v) => setValue('dateSearchBy', v)}
          />

          <DateRangePicker
            from={values.fromDate}
            to={values.toDate}
            onChange={({ from, to }) => {
              setValue('fromDate', from);
              setValue('toDate', to);
            }}
          />

          <Selector
            label="All Leave Types"
            options={leaveTypeOptions}
            value={values.leaveType}
            defaultValue="__all__"
            onChange={(v) => setValue('leaveType', v)}
          />

          <Combobox
            label="Leave Approved Person"
            options={approverOptions}
            value={values.approverId ?? ''}
            defaultValue=""
            onChange={(v) => setValue('approverId', v)}
            clearable
          />

          <div className="flex flex-col gap-1.5 self-end pb-0.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Out with cancel
            </Label>
            <RadioGroup
              value={values.outWithCancel ?? 'all'}
              onValueChange={(v) => setValue('outWithCancel', v)}
              className="flex h-10 items-center gap-4"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="all" id="out-cancel-all" />
                <Label htmlFor="out-cancel-all" className="font-normal">
                  All
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="yes" id="out-cancel-yes" />
                <Label
                  htmlFor="out-cancel-yes"
                  className="font-normal"
                  title="Not cancelled"
                >
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="no" id="out-cancel-no" />
                <Label
                  htmlFor="out-cancel-no"
                  className="font-normal"
                  title="Cancelled"
                >
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>
        </>
      )}
    </FilterWrapper>
  );
}
