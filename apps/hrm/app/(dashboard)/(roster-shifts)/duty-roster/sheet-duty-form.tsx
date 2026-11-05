'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
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
import {
  dutyFormValuesToReplacePayload,
  dutyFormValuesToSavePayload,
  dutyRosterRowToFormValues,
  emptyDutyFormValues
} from '@/lib/mappers/duty-roster-form.mapper';
import {
  getStaffStandingAssignmentsForDutyAction,
  replaceDutyStaffAction,
  saveDutyAllocationAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import {
  DUTY_ATTENDANCE_OPTIONS,
  type DutyRosterFormOptions,
  type DutyRosterFormValues,
  type DutyRosterRow,
  type DutyRosterStandingAssignmentOption
} from '@/types/roster';
import type { DutyRosterFormSheetMode } from './duty-roster-ui-context';
import { buttonStyles } from '@/lib/utils/common-styles';

type SheetDutyFormProps = {
  open: boolean;
  mode: DutyRosterFormSheetMode;
  record: DutyRosterRow | null;
  defaultDate: Date;
  formOptions: DutyRosterFormOptions;
  onOpenChange: (open: boolean) => void;
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
  shiftTypes: DutyRosterFormOptions['shiftTypes'],
  standing?: DutyRosterStandingAssignmentOption | null
): { startTime: string; endTime: string } {
  if (standing && standing.shiftTypeId === shiftTypeId) {
    return {
      startTime: standing.startTime || '07:00',
      endTime: standing.endTime || '15:00'
    };
  }
  const found = shiftTypes.find((shift) => shift.id === shiftTypeId);
  return {
    startTime: found?.startTime ?? '07:00',
    endTime: found?.endTime ?? '15:00'
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
    description:
      'Allocate from a standing shift assignment, or use ad-hoc when none exists.',
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
  standing,
  setFieldValue
}: {
  shiftTypeId: string;
  startTime: string;
  endTime: string;
  shiftTypes: DutyRosterFormOptions['shiftTypes'];
  standing: DutyRosterStandingAssignmentOption | null;
  setFieldValue: FormikProps<DutyRosterFormValues>['setFieldValue'];
}) {
  const next = timesForShift(shiftTypeId, shiftTypes, standing);
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

function dutyDateKey(dutyDate: Date | null): string {
  if (!dutyDate) return '';
  try {
    return format(dutyDate, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function StandingAssignmentLoader({
  open,
  staffId,
  dutyDate,
  useStandingAssignment,
  setAssignments,
  setLoadingAssignments,
  onEmptyStandingAssignments
}: {
  open: boolean;
  staffId: string;
  dutyDate: Date | null;
  useStandingAssignment: boolean;
  setAssignments: (rows: DutyRosterStandingAssignmentOption[]) => void;
  setLoadingAssignments: (loading: boolean) => void;
  onEmptyStandingAssignments?: (staffId: string, dateKey: string) => void;
}) {
  useEffect(() => {
    if (!open || !useStandingAssignment || !staffId || !dutyDate) {
      setAssignments([]);
      return;
    }

    let cancelled = false;
    const dateKey = dutyDateKey(dutyDate);
    setLoadingAssignments(true);
    void getStaffStandingAssignmentsForDutyAction(staffId, dutyDate).then(
      (respond) => {
        if (cancelled) return;
        setLoadingAssignments(false);
        if (respond?.isError) {
          setAssignments([]);
          return;
        }
        const rows = respond?.data ?? [];
        setAssignments(rows);
        if (rows.length === 0 && dateKey) {
          onEmptyStandingAssignments?.(staffId, dateKey);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    dutyDate,
    onEmptyStandingAssignments,
    open,
    setAssignments,
    setLoadingAssignments,
    staffId,
    useStandingAssignment
  ]);

  return null;
}

function WorkingDepartmentSync({
  staffId,
  useWorkingDepartment,
  staff,
  setFieldValue
}: {
  staffId: string;
  useWorkingDepartment: boolean;
  staff: DutyRosterFormOptions['staff'];
  setFieldValue: FormikProps<DutyRosterFormValues>['setFieldValue'];
}) {
  const previousKey = useRef('');
  useEffect(() => {
    const key = `${staffId}|${useWorkingDepartment ? '1' : '0'}`;
    if (previousKey.current === key) return;
    previousKey.current = key;
    if (!staffId || !useWorkingDepartment) return;
    const found = staff.find((row) => row.id === staffId);
    void setFieldValue(
      'dutyLocationDepartmentId',
      found?.workingDepartmentId ?? ''
    );
  }, [setFieldValue, staff, staffId, useWorkingDepartment]);
  return null;
}

function applyFieldErrors(
  errorMap: Record<string, string | string[] | undefined> | undefined,
  setErrors: FormikHelpers<DutyRosterFormValues>['setErrors'],
  setTouched: FormikHelpers<DutyRosterFormValues>['setTouched']
) {
  const fieldErrors: Record<string, string> = {};
  Object.keys(errorMap ?? {}).forEach((key) => {
    if (
      key === 'message' ||
      key === 'softWarnings' ||
      key === 'requiresAck'
    ) {
      return;
    }
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

function ContextCard({
  staff,
  standing,
  adhocShiftLabel,
  useStanding
}: {
  staff: DutyRosterFormOptions['staff'][number] | undefined;
  standing: DutyRosterStandingAssignmentOption | null;
  adhocShiftLabel: string;
  useStanding: boolean;
}) {
  if (!staff) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
      <p className="font-semibold text-foreground">Duty context</p>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff:{' '}
          <span className="text-foreground">{staff.name}</span>
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
          Roster:{' '}
          <span className="text-foreground">
            {useStanding
              ? standing?.rosterCode || standing?.rosterName || staff.roster || '—'
              : staff.roster || '—'}
          </span>
        </p>
        {useStanding && standing ? (
          <>
            <p>
              Assignment:{' '}
              <span className="text-foreground">{standing.name}</span>
            </p>
            <p>
              Shift:{' '}
              <span className="text-foreground">{standing.shiftName}</span>
            </p>
            <p>
              Times:{' '}
              <span className="text-foreground">
                {standing.startTime} – {standing.endTime}
              </span>
            </p>
            <p>
              Effective:{' '}
              <span className="text-foreground">
                {standing.effectiveFrom
                  ? format(new Date(standing.effectiveFrom), 'dd MMM yyyy')
                  : '—'}
                {standing.effectiveTo
                  ? ` – ${format(new Date(standing.effectiveTo), 'dd MMM yyyy')}`
                  : ' – open'}
              </span>
            </p>
            <p>
              Rotation:{' '}
              <span className="text-foreground">
                {standing.rotationPattern || '—'}
              </span>
            </p>
            <p>
              Weekly off:{' '}
              <span className="text-foreground">
                {standing.weeklyOffDay || '—'}
              </span>
            </p>
          </>
        ) : (
          <p className="sm:col-span-2">
            Mode:{' '}
            <span className="text-foreground">
              Ad-hoc duty
              {adhocShiftLabel ? ` — ${adhocShiftLabel}` : ''}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function SheetDutyForm({
  open,
  mode,
  record,
  defaultDate,
  formOptions,
  onOpenChange
}: SheetDutyFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [standingAssignments, setStandingAssignments] = useState<
    DutyRosterStandingAssignmentOption[]
  >([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const autoAdhocKeysRef = useRef<Set<string>>(new Set());
  const pendingAckRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: DutyRosterFormValues;
    helpers: FormikHelpers<DutyRosterFormValues>;
  } | null>(null);
  const formikRef = useRef<FormikProps<DutyRosterFormValues> | null>(null);

  useEffect(() => {
    if (!open) {
      autoAdhocKeysRef.current.clear();
      setStandingAssignments([]);
    }
  }, [open]);

  const handleEmptyStandingAssignments = useMemo(() => {
    return (staffId: string, dateKey: string) => {
      const key = `${staffId}|${dateKey}`;
      if (autoAdhocKeysRef.current.has(key)) return;
      autoAdhocKeysRef.current.add(key);
      const formik = formikRef.current;
      if (!formik?.values.useStandingAssignment) return;
      void formik.setFieldValue('useStandingAssignment', false);
      void formik.setFieldValue('staffShiftAssignmentId', '');
      void formik.setFieldValue('shiftTypeId', '');
      toast({
        title: 'Switched to ad-hoc duty',
        description:
          'No standing assignment covers this duty date. Pick a shift type manually, or create a Shift Assignment for that window.'
      });
    };
  }, [toast]);
  const copy = sheetCopy(mode);
  const needsOtherStaff = mode === 'swap' || mode === 'replace';
  const showAudit = mode === 'edit' || !!record;
  const isLocked =
    record?.status === 'published' || record?.status === 'amended';
  const showDutyPlace = mode === 'assign' || mode === 'edit';

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
        staffShiftAssignmentId: Yup.string().when(
          ['useStandingAssignment'],
          {
            is: true,
            then: (schema) =>
              needsOtherStaff
                ? schema
                : schema.required('Assigned shift is required'),
            otherwise: (schema) => schema
          }
        ),
        shiftTypeId:
          mode === 'swap' || mode === 'replace'
            ? Yup.string()
            : Yup.string().required('Shift is required'),
        dutyDate: Yup.date().nullable().required('Duty date is required'),
        dutyLocationDepartmentId: showDutyPlace
          ? Yup.string().required('Duty department is required')
          : Yup.string(),
        comments: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    [mode, needsOtherStaff, showDutyPlace]
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

  const persistDuty = async (
    values: DutyRosterFormValues,
    helpers: FormikHelpers<DutyRosterFormValues>
  ) => {
    setLoading(true);
    try {
      const respond =
        mode === 'replace'
          ? await replaceDutyStaffAction(
              dutyFormValuesToReplacePayload(values, record?.id)
            )
          : await saveDutyAllocationAction(
              dutyFormValuesToSavePayload(values, record?.id, {
                acknowledgedWarnings: pendingAckRef.current
              })
            );

      if (respond?.isError) {
        const errorMap = respond.errors as Record<
          string,
          string | string[] | boolean | undefined
        >;

        if (errorMap.requiresAck && mode !== 'replace') {
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
                : 'This staff member has leave on that date. Continue anyway?')
          );
          setConfirmOpen(true);
          return;
        }

        const message =
          applyFieldErrors(
            errorMap as Record<string, string | string[] | undefined>,
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

      pendingAckRef.current = false;
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
  };

  return (
    <>
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
              pendingAckRef.current = false;
              await persistDuty(values, helpers);
            }}
          >
            {(formik) => {
              formikRef.current = formik;
              const selectedStaff = formOptions.staff.find(
                (row) => row.id === formik.values.staffId
              );
              const selectedStanding =
                standingAssignments.find(
                  (row) => row.id === formik.values.staffShiftAssignmentId
                ) ?? null;
              const adhocShift = formOptions.shiftTypes.find(
                (row) => row.id === formik.values.shiftTypeId
              );
              const institutionId = selectedStaff?.institutionId ?? '';
              const departmentOptions = (
                institutionId
                  ? formOptions.departments.filter(
                      (d) => d.institutionId === institutionId
                    )
                  : formOptions.departments
              ).map((d) => ({ id: d.id, name: d.name }));
              if (
                formik.values.dutyLocationDepartmentId &&
                !departmentOptions.some(
                  (d) => d.id === formik.values.dutyLocationDepartmentId
                )
              ) {
                const orphan = formOptions.departments.find(
                  (d) => d.id === formik.values.dutyLocationDepartmentId
                );
                if (orphan) {
                  departmentOptions.unshift({
                    id: orphan.id,
                    name: orphan.name
                  });
                }
              }
              const roomOptions = (
                formik.values.dutyZoneId
                  ? formOptions.rooms.filter(
                      (r) => r.zoneId === formik.values.dutyZoneId
                    )
                  : formOptions.rooms
              ).map((r) => ({ id: r.id, name: r.name }));

              return (
                <Form className="flex min-h-0 flex-1 flex-col">
                  <StandingAssignmentLoader
                    open={open}
                    staffId={formik.values.staffId}
                    dutyDate={formik.values.dutyDate}
                    useStandingAssignment={formik.values.useStandingAssignment}
                    setAssignments={setStandingAssignments}
                    setLoadingAssignments={setLoadingAssignments}
                    onEmptyStandingAssignments={handleEmptyStandingAssignments}
                  />
                  <AutoShiftTimes
                    shiftTypeId={formik.values.shiftTypeId}
                    startTime={formik.values.startTime}
                    endTime={formik.values.endTime}
                    shiftTypes={formOptions.shiftTypes}
                    standing={selectedStanding}
                    setFieldValue={formik.setFieldValue}
                  />
                  {showDutyPlace ? (
                    <WorkingDepartmentSync
                      staffId={formik.values.staffId}
                      useWorkingDepartment={formik.values.useWorkingDepartment}
                      staff={formOptions.staff}
                      setFieldValue={formik.setFieldValue}
                    />
                  ) : null}

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {isLocked ? (
                      <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
                        This date is published. Direct changes are rejected —
                        use Roster Amendments instead.
                      </p>
                    ) : null}

                    {showDutyPlace ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            From standing assignment
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Turn off for ad-hoc duty when staff has no covering
                            assignment for this date (or none at all). Empty
                            windows auto-switch to ad-hoc once.
                          </p>
                        </div>
                        <Switch
                          checked={formik.values.useStandingAssignment}
                          onCheckedChange={(checked) => {
                            void formik.setFieldValue(
                              'useStandingAssignment',
                              checked
                            );
                            void formik.setFieldValue(
                              'staffShiftAssignmentId',
                              ''
                            );
                            void formik.setFieldValue('shiftTypeId', '');
                          }}
                          disabled={isLocked}
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className={fieldStyleClasses.parentDiv}>
                        <Label className={fieldStyleClasses.labelClassName}>
                          {copy.staffLabel} *
                        </Label>
                        <div className={fieldStyleClasses.inputClassName}>
                          <Combobox
                            label={copy.staffLabel}
                            options={formOptions.staff}
                            value={formik.values.staffId}
                            defaultValue=""
                            clearable={mode === 'assign'}
                            disabled={
                              mode === 'edit' ||
                              mode === 'swap' ||
                              mode === 'replace'
                            }
                            triggerClassName="w-full max-w-none font-normal!"
                            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                            onChange={(value) => {
                              void formik.setFieldValue('staffId', value);
                              void formik.setFieldValue(
                                'staffShiftAssignmentId',
                                ''
                              );
                              if (formik.values.useStandingAssignment) {
                                void formik.setFieldValue('shiftTypeId', '');
                              }
                            }}
                          />
                        </div>
                        {formik.touched.staffId && formik.errors.staffId ? (
                          <p className="text-xs text-destructive">
                            {formik.errors.staffId}
                          </p>
                        ) : null}
                      </div>

                      {needsOtherStaff ? (
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            {copy.otherLabel} *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label={copy.otherLabel}
                              options={formOptions.staff.filter(
                                (staff) => staff.id !== formik.values.staffId
                              )}
                              value={formik.values.otherStaffId}
                              defaultValue=""
                              clearable
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) =>
                                formik.setFieldValue('otherStaffId', value)
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <CustomDatePickerField
                        id="dutyFormDate"
                        placeholder="Duty Date"
                        value={formik.values.dutyDate}
                        onChange={(value) => {
                          void formik.setFieldValue('dutyDate', value ?? null);
                          void formik.setFieldValue(
                            'staffShiftAssignmentId',
                            ''
                          );
                          if (formik.values.useStandingAssignment) {
                            void formik.setFieldValue('shiftTypeId', '');
                          }
                        }}
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

                      {showDutyPlace && formik.values.useStandingAssignment ? (
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            Assigned Shift *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label={
                                loadingAssignments
                                  ? 'Loading assignments…'
                                  : 'Select assigned shift'
                              }
                              options={standingAssignments}
                              value={formik.values.staffShiftAssignmentId}
                              defaultValue=""
                              clearable
                              disabled={
                                isLocked ||
                                !formik.values.staffId ||
                                !formik.values.dutyDate ||
                                loadingAssignments
                              }
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                const found = standingAssignments.find(
                                  (row) => row.id === value
                                );
                                void formik.setFieldValue(
                                  'staffShiftAssignmentId',
                                  value
                                );
                                void formik.setFieldValue(
                                  'shiftTypeId',
                                  found?.shiftTypeId ?? ''
                                );
                              }}
                            />
                          </div>
                          {formik.touched.staffShiftAssignmentId &&
                          formik.errors.staffShiftAssignmentId ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.staffShiftAssignmentId}
                            </p>
                          ) : null}
                          {!loadingAssignments &&
                          formik.values.staffId &&
                          formik.values.dutyDate &&
                          standingAssignments.length === 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-xs text-muted-foreground">
                                No standing assignment covers this date (outside
                                effective window, or none exist).
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  void formik.setFieldValue(
                                    'useStandingAssignment',
                                    false
                                  );
                                  void formik.setFieldValue(
                                    'staffShiftAssignmentId',
                                    ''
                                  );
                                  void formik.setFieldValue('shiftTypeId', '');
                                }}
                              >
                                Use ad-hoc duty
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {showDutyPlace && !formik.values.useStandingAssignment ? (
                        <CustomSelectField
                          id="shiftTypeId"
                          placeholder="Shift"
                          value={formik.values.shiftTypeId}
                          onChange={(value) =>
                            formik.setFieldValue('shiftTypeId', value)
                          }
                          required
                          disabled={isLocked}
                          options={formOptions.shiftTypes}
                          styleClasses={fieldStyleClasses}
                        />
                      ) : null}

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
                    </div>

                    {showDutyPlace &&
                    (selectedStaff || selectedStanding) ? (
                      <ContextCard
                        staff={selectedStaff}
                        standing={selectedStanding}
                        adhocShiftLabel={adhocShift?.name ?? ''}
                        useStanding={formik.values.useStandingAssignment}
                      />
                    ) : null}

                    {showDutyPlace ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Use staff working department
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Turn off to pick another department at the same
                              institution.
                            </p>
                          </div>
                          <Switch
                            checked={formik.values.useWorkingDepartment}
                            onCheckedChange={(checked) => {
                              void formik.setFieldValue(
                                'useWorkingDepartment',
                                checked
                              );
                              if (!checked) return;
                              void formik.setFieldValue(
                                'dutyLocationDepartmentId',
                                selectedStaff?.workingDepartmentId ?? ''
                              );
                            }}
                            disabled={isLocked || !formik.values.staffId}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Working Location
                            </Label>
                            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground">
                              {selectedStaff?.institutionName || (
                                <span className="text-muted-foreground">
                                  Select a staff member to see institution
                                </span>
                              )}
                            </div>
                          </div>

                          <CustomSelectField
                            id="dutyLocationDepartmentId"
                            placeholder="Duty Department"
                            value={formik.values.dutyLocationDepartmentId}
                            onChange={(value) =>
                              formik.setFieldValue(
                                'dutyLocationDepartmentId',
                                value
                              )
                            }
                            required
                            disabled={
                              isLocked || formik.values.useWorkingDepartment
                            }
                            options={departmentOptions}
                            styleClasses={fieldStyleClasses}
                          />

                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Zone
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Select zone"
                                options={formOptions.zones}
                                value={formik.values.dutyZoneId}
                                defaultValue=""
                                clearable
                                disabled={isLocked}
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) => {
                                  void formik.setFieldValue(
                                    'dutyZoneId',
                                    value
                                  );
                                  void formik.setFieldValue('dutyRoomId', '');
                                }}
                              />
                            </div>
                          </div>

                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Unit / Room
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Select unit / room"
                                options={roomOptions}
                                value={formik.values.dutyRoomId}
                                defaultValue=""
                                clearable
                                disabled={isLocked}
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) =>
                                  formik.setFieldValue('dutyRoomId', value)
                                }
                              />
                            </div>
                          </div>

                          <div className={fieldStyleClasses.parentDiv}>
                            <Label
                              className={fieldStyleClasses.labelClassName}
                            >
                              Supervisor
                            </Label>
                            <div className={fieldStyleClasses.inputClassName}>
                              <Combobox
                                label="Select supervisor"
                                options={formOptions.supervisors.filter(
                                  (row) => row.id !== formik.values.staffId
                                )}
                                value={formik.values.supervisorId}
                                defaultValue=""
                                clearable
                                disabled={isLocked}
                                triggerClassName="w-full max-w-none font-normal!"
                                popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                                onChange={(value) =>
                                  formik.setFieldValue('supervisorId', value)
                                }
                              />
                            </div>
                          </div>

                          <CustomSelectField
                            id="attendance"
                            placeholder="Attendance"
                            value={formik.values.attendance}
                            onChange={(value) =>
                              formik.setFieldValue('attendance', value)
                            }
                            required={false}
                            disabled={isLocked}
                            options={attendanceOptions}
                            styleClasses={fieldStyleClasses}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    )}

                    <CustomFormField
                      id="comments"
                      type="textarea"
                      placeholder="Comments"
                      value={formik.values.comments}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={needsOtherStaff || isLocked}
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
                      className={buttonStyles.cancel.normal}
                      onClick={() => onOpenChange(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={loading || isLocked}
                      className={buttonStyles.save}
                    >
                      {copy.saveLabel}
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
        title="Staff has leave on this date"
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
          await persistDuty(pending.values, pending.helpers);
          pendingSubmitRef.current = null;
        }}
      />
    </>
  );
}
