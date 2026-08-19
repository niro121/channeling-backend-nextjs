'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  useToast
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import {
  combineDateAndTime,
  formatOvernightHours,
  formatOvernightMoney,
  SAMPLE_OVERNIGHT_ALLOCATIONS,
  SAMPLE_OVERNIGHT_AUDIT,
  SAMPLE_OVERNIGHT_SHIFT_TYPES,
  SAMPLE_OVERNIGHT_STAFF,
  SAMPLE_OVERNIGHT_STATUS,
  splitHoursAtMidnight,
  type OvernightShiftSample
} from './sample-data';
import type { OvernightFormSheetMode } from './overnight-shifts-ui-context';

export type OvernightFormValues = {
  staffId: string;
  shiftTypeId: string;
  allocationId: string;
  startDate: Date | null;
  startTime: string;
  endDate: Date | null;
  endTime: string;
  day1Hours: string;
  day2Hours: string;
  totalHours: string;
  overnightOt: string;
  allowance: string;
  status: string;
  autoSplit: boolean;
  sendToPayroll: boolean;
  remarks: string;
};

type SheetOvernightFormProps = {
  open: boolean;
  mode: OvernightFormSheetMode;
  sample: OvernightShiftSample | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function emptyValues(): OvernightFormValues {
  return {
    staffId: '',
    shiftTypeId: '',
    allocationId: 'shift_start',
    startDate: null,
    startTime: '19:00',
    endDate: null,
    endTime: '07:00',
    day1Hours: '5.00',
    day2Hours: '7.00',
    totalHours: '12.00',
    overnightOt: '2.00',
    allowance: '3200.00',
    status: 'pending_approval',
    autoSplit: true,
    sendToPayroll: true,
    remarks: ''
  };
}

function sampleToFormValues(sample: OvernightShiftSample): OvernightFormValues {
  return {
    staffId: sample.staffId,
    shiftTypeId: sample.shiftTypeId,
    allocationId: sample.allocationId,
    startDate: sample.shiftStart ? parseISO(sample.shiftStart) : null,
    startTime: sample.startTime,
    endDate: sample.shiftEnd ? parseISO(sample.shiftEnd) : null,
    endTime: sample.endTime,
    day1Hours: formatOvernightHours(sample.day1Hours),
    day2Hours: formatOvernightHours(sample.day2Hours),
    totalHours: formatOvernightHours(sample.totalHours),
    overnightOt: formatOvernightHours(sample.overnightOt),
    allowance: formatOvernightMoney(sample.allowance).replace(/,/g, ''),
    status: sample.status,
    autoSplit: sample.autoSplit,
    sendToPayroll: sample.payrollReady,
    remarks: sample.remarks
  };
}

function AutoShiftTypeDefaults({
  shiftTypeId,
  setFieldValue
}: {
  shiftTypeId: string;
  setFieldValue: FormikProps<OvernightFormValues>['setFieldValue'];
}) {
  const previousTypeId = useRef(shiftTypeId);
  useEffect(() => {
    if (previousTypeId.current === shiftTypeId) return;
    previousTypeId.current = shiftTypeId;
    const found = SAMPLE_OVERNIGHT_SHIFT_TYPES.find((s) => s.id === shiftTypeId);
    if (!found) return;
    void setFieldValue('startTime', found.startTime);
    void setFieldValue('endTime', found.endTime);
    void setFieldValue('allowance', found.allowance);
  }, [setFieldValue, shiftTypeId]);
  return null;
}

function AutoSplitHours({
  autoSplit,
  startDate,
  startTime,
  endDate,
  endTime,
  setFieldValue
}: {
  autoSplit: boolean;
  startDate: Date | null;
  startTime: string;
  endDate: Date | null;
  endTime: string;
  setFieldValue: FormikProps<OvernightFormValues>['setFieldValue'];
}) {
  useEffect(() => {
    if (!autoSplit) return;
    const start = combineDateAndTime(startDate, startTime);
    const end = combineDateAndTime(endDate, endTime);
    if (!start || !end) return;
    const split = splitHoursAtMidnight(start, end);
    if (!split) return;
    void setFieldValue('day1Hours', formatOvernightHours(split.day1));
    void setFieldValue('day2Hours', formatOvernightHours(split.day2));
    void setFieldValue('totalHours', formatOvernightHours(split.total));
  }, [autoSplit, endDate, endTime, setFieldValue, startDate, startTime]);
  return null;
}

const LATER = 'Will be wired in a later phase.';

export default function SheetOvernightForm({
  open,
  mode,
  sample,
  onOpenChange
}: SheetOvernightFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        shiftTypeId: Yup.string().required('Overnight shift type is required'),
        allocationId: Yup.string().required('Allocation date is required'),
        startDate: Yup.date().nullable().required('Shift start date is required'),
        startTime: Yup.string().required('Start time is required'),
        endDate: Yup.date().nullable().required('Shift end date is required'),
        endTime: Yup.string().required('End time is required'),
        day1Hours: Yup.number().min(0, 'Cannot be negative').nullable(),
        day2Hours: Yup.number().min(0, 'Cannot be negative').nullable(),
        totalHours: Yup.number().min(0, 'Cannot be negative').nullable(),
        overnightOt: Yup.number().min(0, 'Cannot be negative').nullable(),
        allowance: Yup.number().min(0, 'Cannot be negative').nullable(),
        status: Yup.string().required('Status is required'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (sample && isEdit) return sampleToFormValues(sample);
    return emptyValues();
  }, [isEdit, sample]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {isEdit ? 'Edit Overnight Shift' : 'Add Overnight Shift'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the record. All changes are captured in the audit trail.'
              : 'Record a shift that crosses midnight.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async () => {
            setLoading(true);
            toast({
              title: isEdit ? 'Update overnight shift' : 'Save overnight shift',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => {
            const hoursDisabled = formik.values.autoSplit;

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <AutoShiftTypeDefaults
                  shiftTypeId={formik.values.shiftTypeId}
                  setFieldValue={formik.setFieldValue}
                />
                <AutoSplitHours
                  autoSplit={formik.values.autoSplit}
                  startDate={formik.values.startDate}
                  startTime={formik.values.startTime}
                  endDate={formik.values.endDate}
                  endTime={formik.values.endTime}
                  setFieldValue={formik.setFieldValue}
                />

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <CustomSelectField
                    id="staffId"
                    placeholder="Staff Member"
                    value={formik.values.staffId}
                    onChange={(value) =>
                      formik.setFieldValue('staffId', value)
                    }
                    required
                    options={SAMPLE_OVERNIGHT_STAFF}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CustomSelectField
                      id="shiftTypeId"
                      placeholder="Overnight Shift Type"
                      value={formik.values.shiftTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftTypeId', value)
                      }
                      required
                      options={SAMPLE_OVERNIGHT_SHIFT_TYPES}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="allocationId"
                      placeholder="Attendance Allocation Date"
                      value={formik.values.allocationId}
                      onChange={(value) =>
                        formik.setFieldValue('allocationId', value)
                      }
                      required
                      options={SAMPLE_OVERNIGHT_ALLOCATIONS}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="startDate"
                      placeholder="Shift Start Date"
                      value={formik.values.startDate}
                      onChange={(value) =>
                        formik.setFieldValue('startDate', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="startTime"
                      type="time"
                      placeholder="Start Time"
                      value={formik.values.startTime}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="endDate"
                      placeholder="Shift End Date"
                      value={formik.values.endDate}
                      onChange={(value) =>
                        formik.setFieldValue('endDate', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="endTime"
                      type="time"
                      placeholder="End Time"
                      value={formik.values.endTime}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="day1Hours"
                      type="number"
                      placeholder="Day 1 Hours"
                      value={formik.values.day1Hours}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={hoursDisabled}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="day2Hours"
                      type="number"
                      placeholder="Day 2 Hours"
                      value={formik.values.day2Hours}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={hoursDisabled}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="totalHours"
                      type="number"
                      placeholder="Total Hours"
                      value={formik.values.totalHours}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={hoursDisabled}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="overnightOt"
                      type="number"
                      placeholder="Overnight OT Hours"
                      value={formik.values.overnightOt}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="allowance"
                      type="number"
                      placeholder="Overnight Allowance (LKR)"
                      value={formik.values.allowance}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status}
                      onChange={(value) =>
                        formik.setFieldValue('status', value)
                      }
                      required
                      options={SAMPLE_OVERNIGHT_STATUS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <Label
                        htmlFor="autoSplit"
                        className="cursor-pointer text-sm font-semibold text-foreground"
                      >
                        Auto Split Hours at Midnight
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Split working hours between the two calendar days for
                        attendance and OT calculation.
                      </p>
                    </div>
                    <Switch
                      id="autoSplit"
                      checked={formik.values.autoSplit}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue('autoSplit', checked)
                      }
                      className="shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <Label
                        htmlFor="sendToPayroll"
                        className="cursor-pointer text-sm font-semibold text-foreground"
                      >
                        Send to Payroll
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Include overnight allowance in the current salary cycle.
                      </p>
                    </div>
                    <Switch
                      id="sendToPayroll"
                      checked={formik.values.sendToPayroll}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue('sendToPayroll', checked)
                      }
                      className="shrink-0"
                    />
                  </div>

                  <CustomFormField
                    id="remarks"
                    type="textarea"
                    placeholder="Remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

<div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Created by:{' '}
                      {showAudit ? SAMPLE_OVERNIGHT_AUDIT.createdBy : '—'}
                      {showAudit
                        ? ` · ${formatAuditDateTime(SAMPLE_OVERNIGHT_AUDIT.createdAt)}`
                        : null}
                    </p>
                    <p className="sm:text-right">
                      Last updated:{' '}
                      {showAudit ? SAMPLE_OVERNIGHT_AUDIT.updatedBy : '—'}
                      {showAudit
                        ? ` · ${formatAuditDateTime(SAMPLE_OVERNIGHT_AUDIT.updatedAt)}`
                        : null}
                    </p>
                  </div>
                </div>

                <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    size="sm"
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {isEdit ? 'Save Changes' : 'Save Overnight Shift'}
                  </Button>
                </SheetFooter>
              </Form>
            );
          }}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
