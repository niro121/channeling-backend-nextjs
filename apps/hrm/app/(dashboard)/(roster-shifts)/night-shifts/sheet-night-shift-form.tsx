'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
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
  nightShiftFormValuesToPayload,
  nightShiftRecordToFormValues
} from '@/lib/mappers/night-shift-form.mapper';
import {
  createNightShiftAction,
  getNightShiftConflictPreviewAction,
  updateNightShiftAction
} from '@/app/actions/roster-actions/night-shift.actions';
import {
  NIGHT_SHIFT_STATUS_OPTIONS,
  type NightShiftConflictPreview,
  type NightShiftFormOptions,
  type NightShiftRecord,
  type NightShiftStaffOption
} from '@/types/roster';
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
  sendToPayroll: boolean;
  remarks: string;
};

type SheetNightShiftFormProps = {
  open: boolean;
  mode: NightShiftFormSheetMode;
  record: NightShiftRecord | null;
  formOptions: NightShiftFormOptions;
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
    consecutiveNights: '—',
    sendToPayroll: true,
    remarks: ''
  };
}

function AutoShiftDefaults({
  shiftTypeId,
  shiftTypes,
  setFieldValue,
  locked
}: {
  shiftTypeId: string;
  shiftTypes: NightShiftFormOptions['shiftTypes'];
  setFieldValue: FormikProps<NightShiftFormValues>['setFieldValue'];
  locked: boolean;
}) {
  const previousTypeId = useRef(shiftTypeId);
  useEffect(() => {
    if (locked) return;
    if (previousTypeId.current === shiftTypeId) return;
    previousTypeId.current = shiftTypeId;
    const found = shiftTypes.find((s) => s.id === shiftTypeId);
    if (!found) return;
    void setFieldValue('startTime', found.startTime);
    void setFieldValue('endTime', found.endTime);
    void setFieldValue('nightHours', found.nightHours);
    void setFieldValue('nightAllowance', found.nightAllowance);
    void setFieldValue('mealAllowance', found.mealAllowance);
  }, [locked, setFieldValue, shiftTypeId, shiftTypes]);
  return null;
}

function NightContextCard({
  staff
}: {
  staff: NightShiftStaffOption | undefined;
}) {
  if (!staff) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
      <p className="font-semibold text-foreground">Night duty context</p>
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
          Unit:{' '}
          <span className="text-foreground">{staff.unit || '—'}</span>
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
  preview: NightShiftConflictPreview | null;
}) {
  if (!preview) return null;
  if (!preview.blocksSave && !preview.infoMessage && preview.allocations.length === 0) {
    return null;
  }

  if (preview.blocksSave) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        {preview.blockReason ?? 'Cannot save this night shift for the selected staff and date.'}
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

const nonNegativeNumber = (label: string) =>
  Yup.number()
    .transform((value, original) =>
      original === '' || original == null ? undefined : value
    )
    .min(0, `${label} cannot be negative`);

export default function SheetNightShiftForm({
  open,
  mode,
  record,
  formOptions,
  onOpenChange
}: SheetNightShiftFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [conflictPreview, setConflictPreview] =
    useState<NightShiftConflictPreview | null>(null);
  const pendingSubmitRef = useRef<{
    values: NightShiftFormValues;
    helpers: FormikHelpers<NightShiftFormValues>;
  } | null>(null);
  const pendingAckRef = useRef(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit && !!record;
  const identityLocked = isEdit;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        shiftTypeId: Yup.string().required('Night shift type is required'),
        shiftDate: Yup.date().nullable().required('Shift date is required'),
        nightHours: nonNegativeNumber('Night hours'),
        nightOt: nonNegativeNumber('Night OT hours'),
        nightAllowance: nonNegativeNumber('Night allowance'),
        mealAllowance: nonNegativeNumber('Meal allowance'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return nightShiftRecordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

  const shiftTypeOptions = useMemo(
    () => formOptions.shiftTypes.map(({ id, name }) => ({ id, name })),
    [formOptions.shiftTypes]
  );

  const statusLabel = useMemo(() => {
    if (!record) return '';
    return (
      NIGHT_SHIFT_STATUS_OPTIONS.find((option) => option.id === record.status)
        ?.name ?? record.status
    );
  }, [record]);

  useEffect(() => {
    if (!open) {
      setConflictPreview(null);
      pendingSubmitRef.current = null;
      pendingAckRef.current = false;
      setConfirmOpen(false);
    }
  }, [open]);

  const persistNightShift = async (
    values: NightShiftFormValues,
    helpers: FormikHelpers<NightShiftFormValues>
  ) => {
    setLoading(true);
    try {
      const payload = nightShiftFormValuesToPayload(values, {
        acknowledgedWarnings: pendingAckRef.current
      });
      const result =
        isEdit && record
          ? await updateNightShiftAction(record.id, payload)
          : await createNightShiftAction(payload);

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
          title: 'Error',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) ?? 'Night shift could not be saved.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit ? 'Night shift updated.' : 'Night shift saved.'
      });
      pendingAckRef.current = false;
      onOpenChange(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Night shift could not be saved.'
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
              {isEdit ? 'Edit Night Shift' : 'Add Night Shift'}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update night hours, allowances and payroll flag. Staff, date and shift type stay locked on edit.'
                : 'Create a night duty for a night-flagged shift type. Same staff/date/shift type is blocked; day limits follow Manage Roster.'}
            </SheetDescription>
          </SheetHeader>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={async (values, helpers) => {
              await persistNightShift(values, helpers);
            }}
          >
            {(formik) => {
              const selectedStaff = formOptions.staff.find(
                (staff) => staff.id === formik.values.staffId
              );

              return (
                <Form className="flex min-h-0 flex-1 flex-col">
                  <AutoShiftDefaults
                    shiftTypeId={formik.values.shiftTypeId}
                    shiftTypes={formOptions.shiftTypes}
                    setFieldValue={formik.setFieldValue}
                    locked={identityLocked}
                  />
                  <ConflictPreviewEffect
                    open={open}
                    staffId={formik.values.staffId}
                    shiftDate={formik.values.shiftDate}
                    shiftTypeId={formik.values.shiftTypeId}
                    excludeAllocationId={isEdit ? record?.id : null}
                    setFieldValue={formik.setFieldValue}
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

                    <NightContextCard staff={selectedStaff} />
                    {isEdit && record ? (
                      <DutyPlaceEditNote
                        allocationId={record.id}
                        dutyDate={record.shiftDate}
                        staffId={record.staffId}
                      />
                    ) : null}
                    <ConflictStrip preview={conflictPreview} />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <CustomSelectField
                        id="shiftTypeId"
                        placeholder="Night Shift Type"
                        value={formik.values.shiftTypeId}
                        onChange={(value) =>
                          formik.setFieldValue('shiftTypeId', value)
                        }
                        required
                        options={shiftTypeOptions}
                        disabled={identityLocked}
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
                        disabled={identityLocked}
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
                        min={0}
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
                        min={0}
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
                        min={0}
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
                        min={0}
                        styleClasses={fieldStyleClasses}
                      />
                      <CustomFormField
                        id="consecutiveNights"
                        type="text"
                        placeholder="Consecutive Nights"
                        value={formik.values.consecutiveNights}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        required={false}
                        disabled
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
                          htmlFor="sendToPayroll"
                          className="cursor-pointer text-sm font-semibold text-foreground"
                        >
                          Send to Payroll
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Include the night and meal allowance in the current
                          salary cycle.
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
                        {showAudit
                          ? record?.createdUser?.name ||
                            record?.createdBy ||
                            '—'
                          : '—'}
                        {showAudit && record?.createdAt
                          ? ` · ${formatAuditDateTime(record.createdAt)}`
                          : null}
                      </p>
                      <p className="sm:text-right">
                        Last updated:{' '}
                        {showAudit
                          ? record?.updatedUser?.name ||
                            record?.updatedBy ||
                            '—'
                          : '—'}
                        {showAudit && record?.updatedAt
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
                      {isEdit ? 'Save Changes' : 'Save Night Shift'}
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
          await persistNightShift(pending.values, pending.helpers);
          pendingSubmitRef.current = null;
        }}
      />
    </>
  );
}

function ConflictPreviewEffect({
  open,
  staffId,
  shiftDate,
  shiftTypeId,
  excludeAllocationId,
  setFieldValue,
  onPreview
}: {
  open: boolean;
  staffId: string;
  shiftDate: Date | null;
  shiftTypeId: string;
  excludeAllocationId?: string | null;
  setFieldValue: FormikProps<NightShiftFormValues>['setFieldValue'];
  onPreview: (preview: NightShiftConflictPreview | null) => void;
}) {
  useEffect(() => {
    if (!open || !staffId || !shiftDate) {
      onPreview(null);
      void setFieldValue('consecutiveNights', '—');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getNightShiftConflictPreviewAction({
          staffId,
          shiftDate,
          shiftTypeId,
          excludeAllocationId
        });
        if (cancelled) return;
        if (response.isError || !response.data) {
          onPreview(null);
          return;
        }
        onPreview(response.data);
        void setFieldValue(
          'consecutiveNights',
          String(response.data.consecutiveNightsPreview)
        );
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
    setFieldValue,
    shiftDate,
    shiftTypeId,
    staffId
  ]);

  return null;
}
