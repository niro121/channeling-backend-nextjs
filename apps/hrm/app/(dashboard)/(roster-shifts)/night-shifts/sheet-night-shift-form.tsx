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
  formatNightHours,
  formatNightMoney,
  SAMPLE_NIGHT_AUDIT,
  SAMPLE_NIGHT_SHIFT_TYPES,
  SAMPLE_NIGHT_STAFF,
  SAMPLE_NIGHT_STATUS,
  type NightShiftSample
} from './sample-data';
import type { NightShiftFormSheetMode } from './night-shifts-ui-context';

export type NightShiftFormValues = {
  staffId: string;
  shiftTypeId: string;
  shiftDate: Date | null;
  startTime: string;
  endTime: string;
  nightHours: string;
  nightOt: string;
  nightAllowance: string;
  mealAllowance: string;
  consecutiveNights: string;
  status: string;
  sendToPayroll: boolean;
  remarks: string;
};

type SheetNightShiftFormProps = {
  open: boolean;
  mode: NightShiftFormSheetMode;
  sample: NightShiftSample | null;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function emptyValues(): NightShiftFormValues {
  return {
    staffId: '',
    shiftTypeId: '',
    shiftDate: null,
    startTime: '23:00',
    endTime: '07:00',
    nightHours: '8.00',
    nightOt: '0.00',
    nightAllowance: '2500.00',
    mealAllowance: '450.00',
    consecutiveNights: '1',
    status: 'pending_approval',
    sendToPayroll: true,
    remarks: ''
  };
}

function sampleToFormValues(sample: NightShiftSample): NightShiftFormValues {
  return {
    staffId: sample.staffId,
    shiftTypeId: sample.shiftTypeId,
    shiftDate: sample.shiftDate ? parseISO(sample.shiftDate) : null,
    startTime: sample.startTime,
    endTime: sample.endTime,
    nightHours: formatNightHours(sample.nightHours),
    nightOt: formatNightHours(sample.nightOt),
    nightAllowance: formatNightMoney(sample.nightAllowance).replace(/,/g, ''),
    mealAllowance: formatNightMoney(sample.mealAllowance).replace(/,/g, ''),
    consecutiveNights: String(sample.consecutiveNights),
    status: sample.status,
    sendToPayroll: sample.payrollReady,
    remarks: sample.remarks
  };
}

function AutoShiftDefaults({
  shiftTypeId,
  setFieldValue
}: {
  shiftTypeId: string;
  setFieldValue: FormikProps<NightShiftFormValues>['setFieldValue'];
}) {
  const previousTypeId = useRef(shiftTypeId);
  useEffect(() => {
    if (previousTypeId.current === shiftTypeId) return;
    previousTypeId.current = shiftTypeId;
    const found = SAMPLE_NIGHT_SHIFT_TYPES.find((s) => s.id === shiftTypeId);
    if (!found) return;
    void setFieldValue('startTime', found.startTime);
    void setFieldValue('endTime', found.endTime);
    void setFieldValue('nightHours', found.nightHours);
    void setFieldValue('nightAllowance', found.nightAllowance);
    void setFieldValue('mealAllowance', found.mealAllowance);
  }, [setFieldValue, shiftTypeId]);
  return null;
}

const LATER = 'Will be wired in a later phase.';

export default function SheetNightShiftForm({
  open,
  mode,
  sample,
  onOpenChange
}: SheetNightShiftFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        shiftTypeId: Yup.string().required('Night shift type is required'),
        shiftDate: Yup.date().nullable().required('Shift date is required'),
        status: Yup.string().required('Approval status is required'),
        consecutiveNights: Yup.number()
          .transform((value, original) =>
            original === '' || original == null ? undefined : value
          )
          .min(1, 'Must be at least 1')
          .required('Consecutive nights is required'),
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
          <SheetTitle>{isEdit ? 'Edit Night Shift' : 'Add Night Shift'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the record. All changes are captured in the audit trail.'
              : 'Record a night duty and its allowances.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async () => {
            setLoading(true);
            toast({
              title: isEdit ? 'Update night shift' : 'Save night shift',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoShiftDefaults
                shiftTypeId={formik.values.shiftTypeId}
                setFieldValue={formik.setFieldValue}
              />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <CustomSelectField
                  id="staffId"
                  placeholder="Staff Member"
                  value={formik.values.staffId}
                  onChange={(value) => formik.setFieldValue('staffId', value)}
                  required
                  options={SAMPLE_NIGHT_STAFF}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomSelectField
                    id="shiftTypeId"
                    placeholder="Night Shift Type"
                    value={formik.values.shiftTypeId}
                    onChange={(value) =>
                      formik.setFieldValue('shiftTypeId', value)
                    }
                    required
                    options={SAMPLE_NIGHT_SHIFT_TYPES}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="shiftDate"
                    placeholder="Shift Date"
                    value={formik.values.shiftDate}
                    onChange={(value) =>
                      formik.setFieldValue('shiftDate', value ?? null)
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
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="endTime"
                    type="time"
                    placeholder="End Time"
                    value={formik.values.endTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="nightHours"
                    type="number"
                    placeholder="Night Hours"
                    value={formik.values.nightHours}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="nightOt"
                    type="number"
                    placeholder="Night OT Hours"
                    value={formik.values.nightOt}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="nightAllowance"
                    type="number"
                    placeholder="Night Allowance (LKR)"
                    value={formik.values.nightAllowance}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="mealAllowance"
                    type="number"
                    placeholder="Meal Allowance (LKR)"
                    value={formik.values.mealAllowance}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="consecutiveNights"
                    type="number"
                    placeholder="Consecutive Nights"
                    value={formik.values.consecutiveNights}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    min={1}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Approval Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={SAMPLE_NIGHT_STATUS}
                    styleClasses={fieldStyleClasses}
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
                      Include the night and meal allowance in the current salary
                      cycle.
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

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by: {showAudit ? SAMPLE_NIGHT_AUDIT.createdBy : '—'}
                    {showAudit
                      ? ` · ${formatAuditDateTime(SAMPLE_NIGHT_AUDIT.createdAt)}`
                      : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated:{' '}
                    {showAudit ? SAMPLE_NIGHT_AUDIT.updatedBy : '—'}
                    {showAudit
                      ? ` · ${formatAuditDateTime(SAMPLE_NIGHT_AUDIT.updatedAt)}`
                      : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  className="gap-1.5"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {isEdit ? 'Save Changes' : 'Save Night Shift'}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
