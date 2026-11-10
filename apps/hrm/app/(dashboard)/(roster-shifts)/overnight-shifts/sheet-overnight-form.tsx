'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { addDays, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomAlertDialog,
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
import { buttonStyles } from '@/lib/utils/common-styles';
import { DutyPlaceEditNote } from '@/components/roster/duty-place-edit-note';
import {
  splitHoursAtMidnight,
  formatOvernightHours
} from '@/lib/utils/overnight-shift';
import {
  overnightRecordToFormValues,
  overnightFormValuesToPayload
} from '@/lib/mappers/overnight-shift-form.mapper';
import {
  createOvernightShiftAction,
  getOvernightShiftConflictPreviewAction,
  updateOvernightShiftAction
} from '@/app/actions/roster-actions/overnight-shift.actions';
import {
  OVERNIGHT_ALLOCATION_OPTIONS,
  OVERNIGHT_SHIFT_STATUS_OPTIONS,
  type OvernightShiftConflictPreview,
  type OvernightShiftFormOptions,
  type OvernightShiftRecord,
  type OvernightShiftStaffOption
} from '@/types/roster';
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
  record: OvernightShiftRecord | null;
  formOptions: OvernightShiftFormOptions;
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
    day1Hours: '0.00',
    day2Hours: '0.00',
    totalHours: '0.00',
    overnightOt: '0.00',
    allowance: '3200.00',
    status: 'pending_approval',
    autoSplit: true,
    sendToPayroll: true,
    remarks: ''
  };
}

function AutoShiftTypeDefaults({
  shiftTypeId,
  formOptions,
  setFieldValue,
  locked
}: {
  shiftTypeId: string;
  formOptions: OvernightShiftFormOptions;
  setFieldValue: FormikProps<OvernightFormValues>['setFieldValue'];
  locked: boolean;
}) {
  const previousTypeId = useRef(shiftTypeId);
  useEffect(() => {
    if (locked) return;
    if (previousTypeId.current === shiftTypeId) return;
    previousTypeId.current = shiftTypeId;
    const found = formOptions.shiftTypes.find((s) => s.id === shiftTypeId);
    if (!found) return;
    void setFieldValue('startTime', found.startTime);
    void setFieldValue('endTime', found.endTime);
    void setFieldValue('allowance', found.allowance);
  }, [locked, setFieldValue, shiftTypeId, formOptions.shiftTypes]);
  return null;
}

function OvernightContextCard({
  staff
}: {
  staff: OvernightShiftStaffOption | undefined;
}) {
  if (!staff) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
      <p className="font-semibold text-foreground">Overnight duty context</p>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff: <span className="text-foreground">{staff.name}</span>
        </p>
        <p>
          Institution:{' '}
          <span className="text-foreground">
            {staff.institutionName || '—'}
          </span>
        </p>
        <p>
          Working dept:{' '}
          <span className="text-foreground">
            {staff.workingDepartmentName || '—'}
          </span>
        </p>
        <p>
          Unit: <span className="text-foreground">{staff.unit || '—'}</span>
        </p>
        <p className="sm:col-span-2">
          Roster:{' '}
          <span className="text-foreground">{staff.roster || '—'}</span>
        </p>
      </div>
    </div>
  );
}

function ConflictStrip({
  preview
}: {
  preview: OvernightShiftConflictPreview | null;
}) {
  if (!preview) return null;
  if (
    !preview.blocksSave &&
    !preview.infoMessage &&
    preview.allocations.length === 0
  ) {
    return null;
  }

  if (preview.blocksSave) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        {preview.blockReason ??
          'Cannot save this overnight shift for the selected staff and start date.'}
      </div>
    );
  }

  if (preview.infoMessage) {
    return (
      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
        {preview.infoMessage}
      </div>
    );
  }

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
    if (!startDate || !endDate) {
      void setFieldValue('day1Hours', '0.00');
      void setFieldValue('day2Hours', '0.00');
      void setFieldValue('totalHours', '0.00');
      return;
    }
    const split = splitHoursAtMidnight(startDate, startTime, endDate, endTime);
    if (!split) {
      void setFieldValue('day1Hours', '0.00');
      void setFieldValue('day2Hours', '0.00');
      void setFieldValue('totalHours', '0.00');
      return;
    }
    void setFieldValue('day1Hours', formatOvernightHours(split.day1));
    void setFieldValue('day2Hours', formatOvernightHours(split.day2));
    void setFieldValue('totalHours', formatOvernightHours(split.total));
  }, [autoSplit, endDate, endTime, setFieldValue, startDate, startTime]);
  return null;
}

export default function SheetOvernightForm({
  open,
  mode,
  record,
  formOptions,
  onOpenChange
}: SheetOvernightFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [conflictPreview, setConflictPreview] =
    useState<OvernightShiftConflictPreview | null>(null);
  const pendingSubmitRef = useRef<{
    values: OvernightFormValues;
    helpers: FormikHelpers<OvernightFormValues>;
  } | null>(null);
  const pendingAckRef = useRef(false);
  const isEdit = mode === 'edit';
  const identityLocked = isEdit;

  const shiftTypeOptions = useMemo(
    () => formOptions.shiftTypes.map(({ id, name }) => ({ id, name })),
    [formOptions.shiftTypes]
  );

  const statusLabel = useMemo(() => {
    if (!record) return '';
    return (
      OVERNIGHT_SHIFT_STATUS_OPTIONS.find((o) => o.id === record.status)?.name ??
      record.status
    );
  }, [record]);

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
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return overnightRecordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

  useEffect(() => {
    if (!open) {
      setConflictPreview(null);
      pendingSubmitRef.current = null;
      pendingAckRef.current = false;
      setConfirmOpen(false);
    }
  }, [open]);

  const persistOvernightShift = async (
    values: OvernightFormValues,
    helpers: FormikHelpers<OvernightFormValues>
  ) => {
    setLoading(true);
    try {
      const payload = overnightFormValuesToPayload(values, {
        acknowledgedWarnings: pendingAckRef.current
      });
      const result =
        isEdit && record
          ? await updateOvernightShiftAction(record.id, payload)
          : await createOvernightShiftAction(payload);

      if (result.isError) {
        const errorMap = result.errors as Record<
          string,
          string | string[] | boolean | undefined
        >;

        if (errorMap.requiresAck) {
          const softWarnings = Array.isArray(errorMap.softWarnings)
            ? errorMap.softWarnings.filter(
                (item): item is string => typeof item === 'string'
              )
            : [];
          pendingSubmitRef.current = { values, helpers };
          setConfirmDescription(
            softWarnings.join(' ') ||
              (typeof errorMap.message === 'string'
                ? errorMap.message
                : 'This staff member has leave or weekly off on that date. Continue anyway?')
          );
          setConfirmOpen(true);
          return;
        }

        toast({
          variant: 'destructive',
          title: isEdit ? 'Update failed' : 'Save failed',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) ?? 'Could not save overnight shift'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? 'Overnight shift updated.'
          : 'Overnight shift saved.'
      });
      pendingAckRef.current = false;
      router.refresh();
      onOpenChange(false);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                ? 'Update overnight hours, split and payroll flag. Staff and shift type stay locked on edit.'
                : 'Record a shift that crosses midnight. Only overnight-flagged shift types are listed.'}
            </SheetDescription>
          </SheetHeader>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={(values, helpers) =>
              persistOvernightShift(values, helpers)
            }
          >
            {(formik) => {
              const hoursDisabled = formik.values.autoSplit;
              const selectedStaff = formOptions.staff.find(
                (staff) => staff.id === formik.values.staffId
              );

              return (
                <Form className="flex min-h-0 flex-1 flex-col">
                  <AutoShiftTypeDefaults
                    shiftTypeId={formik.values.shiftTypeId}
                    formOptions={formOptions}
                    setFieldValue={formik.setFieldValue}
                    locked={identityLocked}
                  />
                  <AutoSplitHours
                    autoSplit={formik.values.autoSplit}
                    startDate={formik.values.startDate}
                    startTime={formik.values.startTime}
                    endDate={formik.values.endDate}
                    endTime={formik.values.endTime}
                    setFieldValue={formik.setFieldValue}
                  />
                  <ConflictPreviewEffect
                    open={open}
                    staffId={formik.values.staffId}
                    startDate={formik.values.startDate}
                    shiftTypeId={formik.values.shiftTypeId}
                    excludeAllocationId={isEdit ? record?.id : null}
                    onPreview={setConflictPreview}
                  />

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Staff Member *
                      </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Staff Member"
                        options={formOptions.staff}
                        value={formik.values.staffId}
                        defaultValue=""
                        clearable={!identityLocked}
                        disabled={identityLocked}
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) => {
                          void formik.setFieldValue('staffId', value);
                        }}
                      />
                    </div>
                    {formik.touched.staffId && formik.errors.staffId ? (
                      <p className="text-xs text-destructive">
                        {formik.errors.staffId}
                      </p>
                    ) : null}
                  </div>

                  <OvernightContextCard staff={selectedStaff} />
                  <ConflictStrip preview={conflictPreview} />
                  {isEdit && record ? (
                    <DutyPlaceEditNote
                      allocationId={record.id}
                      dutyDate={record.startDate}
                      staffId={record.staffId}
                    />
                  ) : null}

                  <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          Overnight Shift
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Shift crosses midnight into the next calendar day
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CustomSelectField
                      id="shiftTypeId"
                      placeholder="Overnight Shift Type"
                      value={formik.values.shiftTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftTypeId', value)
                      }
                      required
                      options={shiftTypeOptions}
                      disabled={identityLocked}
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
                      options={OVERNIGHT_ALLOCATION_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                      <CustomDatePickerField
                      id="startDate"
                      placeholder="Shift Start Date"
                      value={formik.values.startDate}
                      onChange={(value) => {
                        const nextStart = value ?? null;
                        void formik.setFieldValue('startDate', nextStart);
                        if (nextStart) {
                          void formik.setFieldValue(
                            'endDate',
                            addDays(nextStart, 1)
                          );
                        } else {
                          void formik.setFieldValue('endDate', null);
                        }
                      }}
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
                      disabled
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
                      disabled
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
                    {isEdit ? (
                      <CustomFormField
                        id="allocationStatus"
                        type="text"
                        placeholder="Roster Status"
                        value={statusLabel}
                        onChange={() => undefined}
                        onBlur={formik.handleBlur}
                        required={false}
                        disabled
                        styleClasses={fieldStyleClasses}
                      />
                    ) : null}
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
                      {isEdit
                        ? record?.createdUser?.name || record?.createdBy || '—'
                        : '—'}
                      {isEdit && record?.createdAt
                        ? ` · ${formatAuditDateTime(record.createdAt)}`
                        : null}
                    </p>
                    <p className="sm:text-right">
                      Last updated:{' '}
                      {isEdit
                        ? record?.updatedUser?.name || record?.updatedBy || '—'
                        : '—'}
                      {isEdit && record?.updatedAt
                        ? ` · ${formatAuditDateTime(record.updatedAt)}`
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
                    className={buttonStyles.cancel.normal}
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || Boolean(conflictPreview?.blocksSave)}
                    className={buttonStyles.save}
                  >
                    {isEdit ? 'Save Changes' : 'Save Overnight Shift'}
                  </Button>
                </SheetFooter>
              </Form>
            );
          }}
        </Formik>
      </SheetContent>
      </Sheet>

      <CustomAlertDialog
        open={confirmOpen}
        title="Confirm roster warning"
        description={confirmDescription}
        loading={loading}
        handleVisibilityChange={(nextOpen) => {
          if (!nextOpen) {
            pendingSubmitRef.current = null;
            pendingAckRef.current = false;
          }
          setConfirmOpen(nextOpen);
        }}
        handleContinue={async () => {
          const pending = pendingSubmitRef.current;
          if (!pending) {
            setConfirmOpen(false);
            return;
          }
          pendingAckRef.current = true;
          setConfirmOpen(false);
          await persistOvernightShift(pending.values, pending.helpers);
          pendingSubmitRef.current = null;
        }}
      />
    </>
  );
}

function ConflictPreviewEffect({
  open,
  staffId,
  startDate,
  shiftTypeId,
  excludeAllocationId,
  onPreview
}: {
  open: boolean;
  staffId: string;
  startDate: Date | null;
  shiftTypeId: string;
  excludeAllocationId?: string | null;
  onPreview: (preview: OvernightShiftConflictPreview | null) => void;
}) {
  useEffect(() => {
    if (!open || !staffId || !startDate) {
      onPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getOvernightShiftConflictPreviewAction({
          staffId,
          startDate,
          shiftTypeId,
          excludeAllocationId
        });
        if (cancelled) return;
        if (response.isError || !response.data) {
          onPreview(null);
          return;
        }
        onPreview(response.data);
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    excludeAllocationId,
    onPreview,
    open,
    shiftTypeId,
    staffId,
    startDate
  ]);

  return null;
}
