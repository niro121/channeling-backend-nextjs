'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import {
  SAMPLE_DUTY_AUDIT,
  SAMPLE_DUTY_SHIFTS,
  SAMPLE_DUTY_STAFF,
  SAMPLE_DUTY_STATUS,
  SAMPLE_DUTY_SUPERVISORS,
  type DutyRosterSample
} from './sample-data';
import type { DutyRosterFormSheetMode } from './duty-roster-ui-context';

export type DutyFormValues = {
  staffId: string;
  otherStaffId: string;
  shiftId: string;
  dutyDate: Date | null;
  startTime: string;
  endTime: string;
  dutyLocation: string;
  wardUnit: string;
  supervisorId: string;
  status: string;
  comments: string;
};

type SheetDutyFormProps = {
  open: boolean;
  mode: DutyRosterFormSheetMode;
  sample: DutyRosterSample | null;
  defaultDate: Date;
  onOpenChange: (open: boolean) => void;
  onSwapSubmit?: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function timesForShift(shiftId: string): { startTime: string; endTime: string } {
  const found = SAMPLE_DUTY_SHIFTS.find((s) => s.id === shiftId);
  return {
    startTime: found?.startTime ?? '07:00',
    endTime: found?.endTime ?? '15:00'
  };
}

function locationForStaff(staffId: string): {
  dutyLocation: string;
  wardUnit: string;
} {
  const found = SAMPLE_DUTY_STAFF.find((s) => s.id === staffId);
  return {
    dutyLocation: found?.dutyLocation ?? '',
    wardUnit: found?.wardUnit ?? ''
  };
}

function emptyValues(defaultDate: Date): DutyFormValues {
  return {
    staffId: '',
    otherStaffId: '',
    shiftId: '',
    dutyDate: defaultDate,
    startTime: '07:00',
    endTime: '15:00',
    dutyLocation: '',
    wardUnit: '',
    supervisorId: '',
    status: 'draft',
    comments: ''
  };
}

function sampleToFormValues(
  sample: DutyRosterSample,
  defaultDate: Date
): DutyFormValues {
  return {
    staffId: sample.staffId,
    otherStaffId: '',
    shiftId: sample.shiftId,
    dutyDate: defaultDate,
    startTime: sample.startTime,
    endTime: sample.endTime,
    dutyLocation: sample.dutyLocation,
    wardUnit: sample.wardUnit,
    supervisorId: sample.supervisorId,
    status: sample.status,
    comments: sample.comments
  };
}

function sheetCopy(mode: DutyRosterFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Duty Assignment',
      description:
        'Update the record. All changes are captured in the audit trail.',
      saveLabel: 'Save Changes',
      staffLabel: 'Staff Member',
      otherLabel: ''
    };
  }
  if (mode === 'swap') {
    return {
      title: 'Swap Shift',
      description: 'Swap the duty shift between two staff members.',
      saveLabel: 'Swap Shift',
      staffLabel: 'Staff Member',
      otherLabel: 'Swap With'
    };
  }
  if (mode === 'replace') {
    return {
      title: 'Replace Staff',
      description: 'Replace a rostered staff member with another.',
      saveLabel: 'Replace Staff',
      staffLabel: 'Staff to Replace',
      otherLabel: 'Replacement Staff'
    };
  }
  return {
    title: 'Assign Staff to Duty',
    description: 'Add a staff member to the selected duty roster.',
    saveLabel: 'Save Assignment',
    staffLabel: 'Staff Member',
    otherLabel: ''
  };
}

function AutoShiftTimes({
  shiftId,
  startTime,
  endTime,
  setFieldValue
}: {
  shiftId: string;
  startTime: string;
  endTime: string;
  setFieldValue: FormikProps<DutyFormValues>['setFieldValue'];
}) {
  const next = timesForShift(shiftId);
  useEffect(() => {
    if (!shiftId) return;
    if (startTime !== next.startTime) {
      void setFieldValue('startTime', next.startTime);
    }
    if (endTime !== next.endTime) {
      void setFieldValue('endTime', next.endTime);
    }
  }, [endTime, next.endTime, next.startTime, setFieldValue, shiftId, startTime]);
  return null;
}

function AutoStaffLocation({
  staffId,
  setFieldValue
}: {
  staffId: string;
  setFieldValue: FormikProps<DutyFormValues>['setFieldValue'];
}) {
  const previousStaffId = useRef(staffId);
  useEffect(() => {
    if (previousStaffId.current === staffId) return;
    previousStaffId.current = staffId;
    if (!staffId) return;
    const next = locationForStaff(staffId);
    void setFieldValue('dutyLocation', next.dutyLocation);
    void setFieldValue('wardUnit', next.wardUnit);
  }, [setFieldValue, staffId]);
  return null;
}

const LATER = 'Will be wired in a later phase.';

export default function SheetDutyForm({
  open,
  mode,
  sample,
  defaultDate,
  onOpenChange,
  onSwapSubmit
}: SheetDutyFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);
  const needsOtherStaff = mode === 'swap' || mode === 'replace';
  const showAudit = mode === 'edit' || !!sample;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        otherStaffId: needsOtherStaff
          ? Yup.string()
              .required(
                mode === 'swap'
                  ? 'Swap with staff is required'
                  : 'Replacement staff is required'
              )
              .notOneOf(
                [Yup.ref('staffId')],
                'Select a different registered staff member'
              )
          : Yup.string(),
        shiftId: Yup.string().required('Shift is required'),
        dutyDate: Yup.date().nullable().required('Duty date is required'),
        status: Yup.string().required('Status is required'),
        comments: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    [mode, needsOtherStaff]
  );

  const initialValues = useMemo(() => {
    if (sample && (mode === 'edit' || mode === 'swap' || mode === 'replace')) {
      return sampleToFormValues(sample, defaultDate);
    }
    return emptyValues(defaultDate);
  }, [defaultDate, mode, sample]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async () => {
            if (mode === 'swap') {
              onSwapSubmit?.();
              return;
            }
            setLoading(true);
            toast({
              title:
                mode === 'edit'
                  ? 'Update duty assignment'
                  : mode === 'replace'
                    ? 'Replace staff'
                    : 'Assign staff to duty',
              description: LATER
            });
            setLoading(false);
            onOpenChange(false);
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoShiftTimes
                shiftId={formik.values.shiftId}
                startTime={formik.values.startTime}
                endTime={formik.values.endTime}
                setFieldValue={formik.setFieldValue}
              />
              <AutoStaffLocation
                staffId={formik.values.staffId}
                setFieldValue={formik.setFieldValue}
              />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomSelectField
                    id="staffId"
                    placeholder={copy.staffLabel}
                    value={formik.values.staffId}
                    onChange={(value) => formik.setFieldValue('staffId', value)}
                    required
                    options={SAMPLE_DUTY_STAFF}
                    styleClasses={fieldStyleClasses}
                  />
                  {needsOtherStaff ? (
                    <CustomSelectField
                      id="otherStaffId"
                      placeholder={copy.otherLabel}
                      value={formik.values.otherStaffId}
                      onChange={(value) =>
                        formik.setFieldValue('otherStaffId', value)
                      }
                      required
                      options={SAMPLE_DUTY_STAFF.filter(
                        (staff) => staff.id !== formik.values.staffId
                      )}
                      styleClasses={fieldStyleClasses}
                    />
                  ) : (
                    <CustomSelectField
                      id="shiftId"
                      placeholder="Shift"
                      value={formik.values.shiftId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftId', value)
                      }
                      required
                      options={SAMPLE_DUTY_SHIFTS}
                      styleClasses={fieldStyleClasses}
                    />
                  )}
                  {needsOtherStaff ? (
                    <CustomSelectField
                      id="shiftId"
                      placeholder="Shift"
                      value={formik.values.shiftId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftId', value)
                      }
                      required
                      options={SAMPLE_DUTY_SHIFTS}
                      styleClasses={fieldStyleClasses}
                    />
                  ) : null}
                  <CustomDatePickerField
                    id="dutyDate"
                    placeholder="Duty Date"
                    value={formik.values.dutyDate}
                    onChange={(value) =>
                      formik.setFieldValue('dutyDate', value ?? null)
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
                    id="dutyLocation"
                    type="text"
                    placeholder="Duty Location"
                    value={formik.values.dutyLocation}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="wardUnit"
                    type="text"
                    placeholder="Ward / Unit"
                    value={formik.values.wardUnit}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="supervisorId"
                    placeholder="Supervisor"
                    value={formik.values.supervisorId}
                    onChange={(value) =>
                      formik.setFieldValue('supervisorId', value)
                    }
                    required={false}
                    options={SAMPLE_DUTY_SUPERVISORS}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="status"
                    placeholder="Status"
                    value={formik.values.status}
                    onChange={(value) => formik.setFieldValue('status', value)}
                    required
                    options={SAMPLE_DUTY_STATUS}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <CustomFormField
                  id="comments"
                  type="textarea"
                  placeholder="Comments"
                  value={formik.values.comments}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required={false}
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by:{' '}
                    {showAudit ? SAMPLE_DUTY_AUDIT.createdBy : '—'}
                    {showAudit
                      ? ` · ${formatAuditDateTime(SAMPLE_DUTY_AUDIT.createdAt)}`
                      : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated:{' '}
                    {showAudit ? SAMPLE_DUTY_AUDIT.updatedBy : '—'}
                    {showAudit
                      ? ` · ${formatAuditDateTime(SAMPLE_DUTY_AUDIT.updatedAt)}`
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
                  {copy.saveLabel}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
