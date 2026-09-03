'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
import {
  Button,
  Combobox,
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
  useToast
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import {
  dutyFormValuesToReplacePayload,
  dutyFormValuesToSavePayload,
  dutyFormValuesToSwapPayload,
  dutyRosterRowToFormValues,
  emptyDutyFormValues
} from '@/lib/mappers/duty-roster-form.mapper';
import {
  replaceDutyStaffAction,
  saveDutyAllocationAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import {
  DUTY_ATTENDANCE_OPTIONS,
  type DutyRosterFormOptions,
  type DutyRosterFormValues,
  type DutyRosterRow,
  type RosterFilterOption,
  type SwapDutyPayload
} from '@/types/roster';
import type { DutyRosterFormSheetMode } from './duty-roster-ui-context';

type SheetDutyFormProps = {
  open: boolean;
  mode: DutyRosterFormSheetMode;
  record: DutyRosterRow | null;
  defaultDate: Date;
  formOptions: DutyRosterFormOptions;
  onOpenChange: (open: boolean) => void;
  onSwapSubmit?: (payload: SwapDutyPayload) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const ATTENDANCE_UNMARKED = 'unmarked';

const attendanceOptions = [
  { id: ATTENDANCE_UNMARKED, name: 'Not marked' },
  ...DUTY_ATTENDANCE_OPTIONS
];

function timesForShift(
  shiftTypeId: string,
  shiftTypes: DutyRosterFormOptions['shiftTypes']
): { startTime: string; endTime: string } {
  const found = shiftTypes.find((shift) => shift.id === shiftTypeId);
  return {
    startTime: found?.startTime ?? '07:00',
    endTime: found?.endTime ?? '15:00'
  };
}

function withCurrentOption(
  options: RosterFilterOption[],
  value: string
): RosterFilterOption[] {
  const trimmed = value.trim();
  if (!trimmed) return options;
  if (options.some((option) => option.id === trimmed)) return options;
  return [{ id: trimmed, name: trimmed }, ...options];
}

function locationForStaff(
  staffId: string,
  staff: DutyRosterFormOptions['staff']
): { dutyLocation: string; wardUnit: string } {
  const found = staff.find((row) => row.id === staffId);
  return {
    dutyLocation: found?.dutyLocation ?? '',
    wardUnit: found?.wardUnit ?? ''
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
  shiftTypeId,
  startTime,
  endTime,
  shiftTypes,
  setFieldValue
}: {
  shiftTypeId: string;
  startTime: string;
  endTime: string;
  shiftTypes: DutyRosterFormOptions['shiftTypes'];
  setFieldValue: FormikProps<DutyRosterFormValues>['setFieldValue'];
}) {
  const next = timesForShift(shiftTypeId, shiftTypes);
  useEffect(() => {
    if (!shiftTypeId) return;
    if (startTime !== next.startTime) {
      void setFieldValue('startTime', next.startTime);
    }
    if (endTime !== next.endTime) {
      void setFieldValue('endTime', next.endTime);
    }
  }, [
    endTime,
    next.endTime,
    next.startTime,
    setFieldValue,
    shiftTypeId,
    startTime
  ]);
  return null;
}

function AutoStaffLocation({
  staffId,
  staff,
  setFieldValue
}: {
  staffId: string;
  staff: DutyRosterFormOptions['staff'];
  setFieldValue: FormikProps<DutyRosterFormValues>['setFieldValue'];
}) {
  const previousStaffId = useRef(staffId);
  useEffect(() => {
    if (previousStaffId.current === staffId) return;
    previousStaffId.current = staffId;
    if (!staffId) return;
    const next = locationForStaff(staffId, staff);
    void setFieldValue('dutyLocation', next.dutyLocation);
    void setFieldValue('wardUnit', next.wardUnit);
  }, [setFieldValue, staff, staffId]);
  return null;
}

function applyFieldErrors(
  errorMap: Record<string, string | string[] | undefined> | undefined,
  setErrors: FormikHelpers<DutyRosterFormValues>['setErrors'],
  setTouched: FormikHelpers<DutyRosterFormValues>['setTouched']
) {
  const fieldErrors: Record<string, string> = {};
  Object.keys(errorMap ?? {}).forEach((key) => {
    if (key === 'message') return;
    const err = errorMap?.[key];
    const msg = Array.isArray(err) ? err[0] : err;
    if (msg) fieldErrors[key] = msg;
  });
  if (Object.keys(fieldErrors).length > 0) {
    setErrors(fieldErrors);
    setTouched(
      Object.keys(fieldErrors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<string, boolean>
      )
    );
  }
  return (errorMap?.message as string) ?? undefined;
}

function actionMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const map = errors as Record<string, string | string[] | undefined>;
  if (typeof map.message === 'string') return map.message;
  return undefined;
}

export default function SheetDutyForm({
  open,
  mode,
  record,
  defaultDate,
  formOptions,
  onOpenChange,
  onSwapSubmit
}: SheetDutyFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);
  const needsOtherStaff = mode === 'swap' || mode === 'replace';
  const showAudit = mode === 'edit' || !!record;
  const isLocked =
    record?.status === 'published' || record?.status === 'amended';

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
        shiftTypeId:
          mode === 'swap' || mode === 'replace'
            ? Yup.string()
            : Yup.string().required('Shift is required'),
        dutyDate: Yup.date().nullable().required('Duty date is required'),
        comments: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    [mode, needsOtherStaff]
  );

  const initialValues = useMemo(() => {
    if (record && (mode === 'edit' || mode === 'swap' || mode === 'replace')) {
      return dutyRosterRowToFormValues(record, defaultDate);
    }
    return emptyDutyFormValues(defaultDate);
  }, [defaultDate, mode, record]);

  const auditCreatedBy = record?.createdUser?.name || record?.createdBy || '—';
  const auditUpdatedBy = record?.updatedUser?.name || record?.updatedBy || '—';
  const auditCreatedAt = record?.createdAt
    ? formatAuditDateTime(record.createdAt)
    : '—';
  const auditUpdatedAt = record?.updatedAt
    ? formatAuditDateTime(record.updatedAt)
    : '—';

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
          onSubmit={async (values, helpers) => {
            if (mode === 'swap') {
              onSwapSubmit?.(
                dutyFormValuesToSwapPayload(values, record?.id)
              );
              return;
            }

            setLoading(true);
            try {
              const respond =
                mode === 'replace'
                  ? await replaceDutyStaffAction(
                      dutyFormValuesToReplacePayload(values, record?.id)
                    )
                  : await saveDutyAllocationAction(
                      dutyFormValuesToSavePayload(values, record?.id)
                    );

              if (respond?.isError) {
                const errorMap = respond.errors as Record<
                  string,
                  string | string[] | undefined
                >;
                const message =
                  applyFieldErrors(
                    errorMap,
                    helpers.setErrors,
                    helpers.setTouched
                  ) ?? actionMessage(respond.errors);
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    message ??
                    (mode === 'replace'
                      ? 'Duty staff could not be replaced.'
                      : 'Duty assignment could not be saved.')
                });
                return;
              }

              toast({
                variant: 'success',
                title: 'Success',
                description:
                  mode === 'edit'
                    ? 'Duty assignment updated.'
                    : mode === 'replace'
                      ? 'Duty staff replaced.'
                      : 'Duty assignment saved.'
              });
              onOpenChange(false);
              router.refresh();
            } catch (error: unknown) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description:
                  error instanceof Error
                    ? error.message
                    : 'Duty assignment could not be saved.'
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <AutoShiftTimes
                shiftTypeId={formik.values.shiftTypeId}
                startTime={formik.values.startTime}
                endTime={formik.values.endTime}
                shiftTypes={formOptions.shiftTypes}
                setFieldValue={formik.setFieldValue}
              />
              <AutoStaffLocation
                staffId={formik.values.staffId}
                staff={formOptions.staff}
                setFieldValue={formik.setFieldValue}
              />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {isLocked ? (
                  <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
                    This date is published. Direct changes are rejected — use
                    Roster Amendments instead.
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomSelectField
                    id="staffId"
                    placeholder={copy.staffLabel}
                    value={formik.values.staffId}
                    onChange={(value) => formik.setFieldValue('staffId', value)}
                    required
                    disabled={mode === 'edit' || mode === 'swap' || mode === 'replace'}
                    options={formOptions.staff}
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
                      options={formOptions.staff.filter(
                        (staff) => staff.id !== formik.values.staffId
                      )}
                      styleClasses={fieldStyleClasses}
                    />
                  ) : (
                    <CustomSelectField
                      id="shiftTypeId"
                      placeholder="Shift"
                      value={formik.values.shiftTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftTypeId', value)
                      }
                      required
                      options={formOptions.shiftTypes}
                      styleClasses={fieldStyleClasses}
                    />
                  )}
                  {needsOtherStaff ? (
                    <CustomSelectField
                      id="shiftTypeId"
                      placeholder="Shift"
                      value={formik.values.shiftTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftTypeId', value)
                      }
                      required={false}
                      disabled
                      options={formOptions.shiftTypes}
                      styleClasses={fieldStyleClasses}
                    />
                  ) : null}
                  <CustomDatePickerField
                    id="dutyFormDate"
                    placeholder="Duty Date"
                    value={formik.values.dutyDate}
                    onChange={(value) =>
                      formik.setFieldValue('dutyDate', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    disabled={mode !== 'assign'}
                    useFormikError={false}
                    error={
                      typeof formik.errors.dutyDate === 'string'
                        ? formik.errors.dutyDate
                        : undefined
                    }
                    touched={Boolean(formik.touched.dutyDate)}
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
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Duty Location
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Select Duty Location"
                        options={withCurrentOption(
                          formOptions.locations ?? [],
                          formik.values.dutyLocation
                        )}
                        value={formik.values.dutyLocation}
                        defaultValue=""
                        clearable
                        disabled={needsOtherStaff}
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) =>
                          formik.setFieldValue('dutyLocation', value)
                        }
                      />
                    </div>
                  </div>
                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Ward / Unit
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Select Ward / Unit"
                        options={withCurrentOption(
                          formOptions.units ?? [],
                          formik.values.wardUnit
                        )}
                        value={formik.values.wardUnit}
                        defaultValue=""
                        clearable
                        disabled={needsOtherStaff}
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) =>
                          formik.setFieldValue('wardUnit', value)
                        }
                      />
                    </div>
                  </div>
                  <CustomSelectField
                    id="supervisorId"
                    placeholder="Supervisor"
                    value={formik.values.supervisorId}
                    onChange={(value) =>
                      formik.setFieldValue('supervisorId', value)
                    }
                    required={false}
                    disabled={needsOtherStaff}
                    options={formOptions.supervisors}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="attendance"
                    placeholder="Attendance"
                    value={formik.values.attendance}
                    onChange={(value) =>
                      formik.setFieldValue('attendance', value)
                    }
                    required={false}
                    disabled={needsOtherStaff}
                    options={attendanceOptions}
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
                  disabled={needsOtherStaff}
                  styleClasses={fieldStyleClasses}
                />

<div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by: {showAudit ? auditCreatedBy : '—'}
                    {showAudit && auditCreatedAt !== '—'
                      ? ` · ${auditCreatedAt}`
                      : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated: {showAudit ? auditUpdatedBy : '—'}
                    {showAudit && auditUpdatedAt !== '—'
                      ? ` · ${auditUpdatedAt}`
                      : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
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
