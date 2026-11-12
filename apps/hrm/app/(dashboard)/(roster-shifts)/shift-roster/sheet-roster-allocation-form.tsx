'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
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
import { getStaffStandingAssignmentsForDutyAction } from '@/app/actions/roster-actions/duty-roster.actions';
import { saveRosterAllocationDraftAction } from '@/app/actions/roster-actions/shift-roster.actions';
import {
  LeaveApplicationHint,
  useRosterLeavePreview
} from '@/components/roster/leave-application-hint';
import { formatAuditDateTime } from '@/lib/utils/date';
import { buttonStyles } from '@/lib/utils/common-styles';
import { cn } from '@/lib/utils';
import type {
  DutyRosterFormOptions,
  DutyRosterStandingAssignmentOption
} from '@/types/roster';
import type { RosterAllocationFormTarget } from './shift-roster-ui-context';

export type RosterAllocationFormValues = {
  useStandingAssignment: boolean;
  staffId: string;
  staffShiftAssignmentId: string;
  shiftTypeId: string;
  rosterDate: Date | null;
  startTime: string;
  endTime: string;
  useWorkingDepartment: boolean;
  dutyLocationDepartmentId: string;
  dutyZoneId: string;
  dutyRoomId: string;
  supervisorId: string;
  isLeave: boolean;
  totalHours: string;
  otHours: string;
  comments: string;
};

type SheetRosterAllocationFormProps = {
  open: boolean;
  target: RosterAllocationFormTarget;
  formOptions: DutyRosterFormOptions;
  periodFromDate: string;
  periodToDate: string;
  rosterValue: string;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function hoursFromTimes(startTime: string, endTime: string): string {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null) return '0.0';
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return (diff / 60).toFixed(1);
}

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

function dutyDateKey(dutyDate: Date | null): string {
  if (!dutyDate) return '';
  try {
    return format(dutyDate, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function buildInitialValues(
  target: RosterAllocationFormTarget,
  formOptions: DutyRosterFormOptions
): RosterAllocationFormValues {
  const staffId = target.row?.staffId ?? '';
  const staff = formOptions.staff.find((s) => s.id === staffId);
  const shift = target.shift;
  const shiftTypeId = shift?.shiftTypeId ?? '';
  const useStanding =
    shift?.allocationSource === 'standing' &&
    Boolean(shift.staffShiftAssignmentId);
  const times = timesForShift(shiftTypeId, formOptions.shiftTypes);
  const workingDeptId = staff?.workingDepartmentId ?? '';
  const dutyDeptId = shift?.dutyLocationDepartmentId ?? workingDeptId;
  const useWorkingDepartment =
    !dutyDeptId || !workingDeptId || dutyDeptId === workingDeptId;

  return {
    useStandingAssignment: useStanding || (!shift && Boolean(staffId)),
    staffId,
    staffShiftAssignmentId: shift?.staffShiftAssignmentId ?? '',
    shiftTypeId,
    rosterDate: target.dateIso ? parseISO(target.dateIso) : null,
    startTime: times.startTime,
    endTime: times.endTime,
    useWorkingDepartment,
    dutyLocationDepartmentId: dutyDeptId,
    dutyZoneId: shift?.dutyZoneId ?? '',
    dutyRoomId: shift?.dutyRoomId ?? '',
    supervisorId: shift?.supervisorId ?? '',
    isLeave: shift?.isLeave ?? false,
    totalHours: hoursFromTimes(times.startTime, times.endTime),
    otHours:
      target.mode === 'edit' && shift
        ? String(shift.otHours.toFixed(1))
        : '0.0',
    comments: shift?.comments ?? ''
  };
}

function AutoShiftTimes({
  shiftTypeId,
  startTime,
  endTime,
  totalHours,
  shiftTypes,
  standing,
  setFieldValue
}: {
  shiftTypeId: string;
  startTime: string;
  endTime: string;
  totalHours: string;
  shiftTypes: DutyRosterFormOptions['shiftTypes'];
  standing: DutyRosterStandingAssignmentOption | null;
  setFieldValue: FormikProps<RosterAllocationFormValues>['setFieldValue'];
}) {
  const next = timesForShift(shiftTypeId, shiftTypes, standing);
  const nextHours = hoursFromTimes(next.startTime, next.endTime);

  useEffect(() => {
    if (!shiftTypeId) return;
    if (startTime !== next.startTime) {
      void setFieldValue('startTime', next.startTime);
    }
    if (endTime !== next.endTime) {
      void setFieldValue('endTime', next.endTime);
    }
    if (totalHours !== nextHours) {
      void setFieldValue('totalHours', nextHours);
    }
  }, [
    endTime,
    next.endTime,
    next.startTime,
    nextHours,
    setFieldValue,
    shiftTypeId,
    startTime,
    totalHours
  ]);

  return null;
}

function StandingAssignmentLoader({
  open,
  staffId,
  rosterDate,
  setAssignments,
  setLoadingAssignments,
  onStandingCoverageChange
}: {
  open: boolean;
  staffId: string;
  rosterDate: Date | null;
  setAssignments: (rows: DutyRosterStandingAssignmentOption[]) => void;
  setLoadingAssignments: (loading: boolean) => void;
  onStandingCoverageChange?: (input: {
    staffId: string;
    dateKey: string;
    hasCoverage: boolean;
  }) => void;
}) {
  useEffect(() => {
    if (!open || !staffId || !rosterDate) {
      setAssignments([]);
      return;
    }

    let cancelled = false;
    const dateKey = dutyDateKey(rosterDate);
    setLoadingAssignments(true);
    void getStaffStandingAssignmentsForDutyAction(staffId, rosterDate).then(
      (respond) => {
        if (cancelled) return;
        setLoadingAssignments(false);
        if (respond?.isError) {
          setAssignments([]);
          if (dateKey) {
            onStandingCoverageChange?.({
              staffId,
              dateKey,
              hasCoverage: false
            });
          }
          return;
        }
        const rows = respond?.data ?? [];
        setAssignments(rows);
        if (dateKey) {
          onStandingCoverageChange?.({
            staffId,
            dateKey,
            hasCoverage: rows.length > 0
          });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    onStandingCoverageChange,
    open,
    rosterDate,
    setAssignments,
    setLoadingAssignments,
    staffId
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
  setFieldValue: FormikProps<RosterAllocationFormValues>['setFieldValue'];
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

function LeavePreviewSync({
  staffId,
  rosterDate,
  startTime,
  endTime,
  staffLabel,
  onChange
}: {
  staffId: string;
  rosterDate: Date | null;
  startTime: string;
  endTime: string;
  staffLabel?: string;
  onChange: (next: {
    staffId: string;
    rosterDate: Date | null;
    startTime: string;
    endTime: string;
    staffLabel?: string;
  }) => void;
}) {
  const previousKey = useRef('');
  useEffect(() => {
    const key = `${staffId}|${dutyDateKey(rosterDate)}|${startTime}|${endTime}|${staffLabel ?? ''}`;
    if (previousKey.current === key) return;
    previousKey.current = key;
    onChange({ staffId, rosterDate, startTime, endTime, staffLabel });
  }, [endTime, onChange, rosterDate, staffId, staffLabel, startTime]);
  return null;
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
      <p className="font-semibold text-foreground">Allocation context</p>
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
          Roster:{' '}
          <span className="text-foreground">
            {useStanding
              ? standing?.rosterCode ||
                standing?.rosterName ||
                staff.roster ||
                '—'
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

export default function SheetRosterAllocationForm({
  open,
  target,
  formOptions,
  periodFromDate,
  periodToDate,
  rosterValue,
  onOpenChange
}: SheetRosterAllocationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [standingAssignments, setStandingAssignments] = useState<
    DutyRosterStandingAssignmentOption[]
  >([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [leavePreviewKey, setLeavePreviewKey] = useState('');
  const [leavePreviewStaffId, setLeavePreviewStaffId] = useState('');
  const [leavePreviewDate, setLeavePreviewDate] = useState<Date | null>(null);
  const [leavePreviewStart, setLeavePreviewStart] = useState('');
  const [leavePreviewEnd, setLeavePreviewEnd] = useState('');
  const [leavePreviewLabel, setLeavePreviewLabel] = useState<string | undefined>();
  const autoAdhocKeysRef = useRef<Set<string>>(new Set());
  const autoStandingKeysRef = useRef<Set<string>>(new Set());
  const userForcedAdhocKeysRef = useRef<Set<string>>(new Set());
  const coverageContextRef = useRef('');
  const pendingAckRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: RosterAllocationFormValues;
    helpers: FormikHelpers<RosterAllocationFormValues>;
  } | null>(null);
  const formikRef = useRef<FormikProps<RosterAllocationFormValues> | null>(
    null
  );

  const mode = target.mode;
  const isLocked =
    target.shift?.status === 'published' ||
    target.shift?.status === 'amended';

  const leavePreview = useRosterLeavePreview({
    open,
    staffId: leavePreviewStaffId,
    date: leavePreviewDate,
    startTime: leavePreviewStart,
    endTime: leavePreviewEnd,
    staffLabel: leavePreviewLabel
  });
  const highlightLeaveField =
    leavePreview.hasLeave && leavePreviewKey.length > 0;

  const handleLeavePreviewSync = useCallback(
    (next: {
      staffId: string;
      rosterDate: Date | null;
      startTime: string;
      endTime: string;
      staffLabel?: string;
    }) => {
      setLeavePreviewStaffId(next.staffId);
      setLeavePreviewDate(next.rosterDate);
      setLeavePreviewStart(next.startTime);
      setLeavePreviewEnd(next.endTime);
      setLeavePreviewLabel(next.staffLabel);
      setLeavePreviewKey(
        `${next.staffId}|${dutyDateKey(next.rosterDate)}|${next.startTime}|${next.endTime}`
      );
    },
    []
  );

  const initialValues = useMemo(
    () => buildInitialValues(target, formOptions),
    [formOptions, target]
  );

  useEffect(() => {
    if (!open) {
      autoAdhocKeysRef.current.clear();
      autoStandingKeysRef.current.clear();
      userForcedAdhocKeysRef.current.clear();
      coverageContextRef.current = '';
      setStandingAssignments([]);
      return;
    }
    if (
      target.shift &&
      !initialValues.useStandingAssignment &&
      initialValues.staffId
    ) {
      const dateKey = dutyDateKey(initialValues.rosterDate);
      if (dateKey) {
        userForcedAdhocKeysRef.current.add(
          `${initialValues.staffId}|${dateKey}`
        );
      }
    }
  }, [initialValues, open, target.shift]);

  const handleStandingCoverageChange = useMemo(() => {
    return (input: {
      staffId: string;
      dateKey: string;
      hasCoverage: boolean;
    }) => {
      const key = `${input.staffId}|${input.dateKey}`;
      const formik = formikRef.current;
      if (!formik || isLocked) return;

      if (coverageContextRef.current !== key) {
        coverageContextRef.current = key;
      }

      if (!input.hasCoverage) {
        autoStandingKeysRef.current.delete(key);
        if (!formik.values.useStandingAssignment) return;
        if (autoAdhocKeysRef.current.has(key)) {
          void formik.setFieldValue('useStandingAssignment', false);
          void formik.setFieldValue('staffShiftAssignmentId', '');
          void formik.setFieldValue('shiftTypeId', '');
          return;
        }
        autoAdhocKeysRef.current.add(key);
        void formik.setFieldValue('useStandingAssignment', false);
        void formik.setFieldValue('staffShiftAssignmentId', '');
        void formik.setFieldValue('shiftTypeId', '');
        toast({
          title: 'Switched to ad-hoc duty',
          description:
            'No standing assignment covers this date. Pick a shift type manually, or create a Shift Assignment for that window.'
        });
        return;
      }

      autoAdhocKeysRef.current.delete(key);
      if (formik.values.useStandingAssignment) return;
      if (userForcedAdhocKeysRef.current.has(key)) return;
      if (autoStandingKeysRef.current.has(key)) {
        void formik.setFieldValue('useStandingAssignment', true);
        return;
      }
      autoStandingKeysRef.current.add(key);
      void formik.setFieldValue('useStandingAssignment', true);
      void formik.setFieldValue('staffShiftAssignmentId', '');
      void formik.setFieldValue('shiftTypeId', '');
      toast({
        title: 'Switched to standing assignment',
        description:
          'A covering Shift Assignment exists for this date. Select the assigned shift.'
      });
    };
  }, [isLocked, toast]);

  const title =
    mode === 'edit' ? 'Edit Roster Allocation' : 'Allocate Shift';
  const description = isLocked
    ? 'Published and amended cells are locked. Use Roster Amendments to change them.'
    : mode === 'edit'
      ? 'Update the record. All changes are captured in the audit trail.'
      : 'Allocate from a standing shift assignment, or use ad-hoc when none exists.';
  const saveLabel = 'Save Draft';

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        staffShiftAssignmentId: Yup.string().when(['useStandingAssignment'], {
          is: true,
          then: (schema) => schema.required('Assigned shift is required'),
          otherwise: (schema) => schema
        }),
        shiftTypeId: Yup.string().required('Shift type is required'),
        rosterDate: Yup.date().nullable().required('Roster date is required'),
        dutyLocationDepartmentId: Yup.string().required(
          'Duty department is required'
        ),
        isLeave: Yup.boolean().required(),
        otHours: Yup.number()
          .transform((value, original) =>
            original === '' ? undefined : value
          )
          .min(0, 'Must be 0 or greater')
          .required('OT hours are required'),
        comments: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const auditCreatedBy =
    mode === 'edit' ? (target.shift?.createdUser?.name ?? '—') : '—';
  const auditCreatedAt =
    mode === 'edit' ? formatAuditDateTime(target.shift?.createdAt) : '—';
  const auditUpdatedBy =
    mode === 'edit' ? (target.shift?.updatedUser?.name ?? '—') : '—';
  const auditUpdatedAt =
    mode === 'edit' ? formatAuditDateTime(target.shift?.updatedAt) : '—';

  const persistAllocation = async (
    values: RosterAllocationFormValues,
    helpers: FormikHelpers<RosterAllocationFormValues>
  ) => {
    if (isLocked) {
      toast({
        variant: 'destructive',
        title: 'Locked',
        description:
          'Published and amended cells can only be changed via Roster Amendments.'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await saveRosterAllocationDraftAction({
        allocationId: target.shift?.allocationId,
        staffId: values.staffId,
        shiftTypeId: values.shiftTypeId,
        rosterDate: values.rosterDate ?? '',
        periodFromDate,
        periodToDate,
        roster: rosterValue,
        isLeave: values.isLeave,
        otHours: Number(values.otHours || 0),
        comments: values.comments,
        allocationSource: values.useStandingAssignment ? 'standing' : 'adhoc',
        staffShiftAssignmentId: values.useStandingAssignment
          ? values.staffShiftAssignmentId
          : null,
        dutyLocationDepartmentId: values.dutyLocationDepartmentId || null,
        dutyZoneId: values.dutyZoneId || null,
        dutyRoomId: values.dutyRoomId || null,
        supervisorId: values.supervisorId || null,
        acknowledgedWarnings: pendingAckRef.current
      });

      if (response.isError) {
        const errorMap = response.errors as Record<
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
                : 'This staff member has leave on that date. Continue anyway?')
          );
          setConfirmOpen(true);
          return;
        }

        const formErrors: Record<string, string> = {};
        Object.keys(errorMap).forEach((key) => {
          if (
            key === 'message' ||
            key === 'softWarnings' ||
            key === 'requiresAck'
          ) {
            return;
          }
          const value = errorMap[key];
          const msg = Array.isArray(value) ? value[0] : value;
          if (typeof msg === 'string' && msg) formErrors[key] = msg;
        });
        if (Object.keys(formErrors).length) {
          helpers.setErrors(formErrors);
          helpers.setTouched(
            Object.keys(formErrors).reduce(
              (acc, key) => ({ ...acc, [key]: true }),
              {} as Record<string, boolean>
            )
          );
        }
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : undefined) ?? 'Roster allocation could not be saved.'
        });
        return;
      }

      pendingAckRef.current = false;
      toast({
        variant: 'success',
        title: 'Success',
        description:
          mode === 'edit' ? 'Roster draft updated.' : 'Roster draft saved.'
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
            : 'Roster allocation could not be saved.'
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
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={async (values, helpers) => {
              pendingAckRef.current = false;
              await persistAllocation(values, helpers);
            }}
          >
            {(formik) => {
              formikRef.current = formik;
              const selectedStaff = formOptions.staff.find(
                (staff) => staff.id === formik.values.staffId
              );
              const selectedStanding =
                standingAssignments.find(
                  (row) => row.id === formik.values.staffShiftAssignmentId
                ) ?? null;
              const adhocShift = formOptions.shiftTypes.find(
                (shift) => shift.id === formik.values.shiftTypeId
              );
              const departmentOptions = selectedStaff?.institutionId
                ? formOptions.departments.filter(
                    (dept) =>
                      dept.institutionId === selectedStaff.institutionId
                  )
                : formOptions.departments;
              const roomOptions = formik.values.dutyZoneId
                ? formOptions.rooms.filter(
                    (room) => room.zoneId === formik.values.dutyZoneId
                  )
                : formOptions.rooms;

              return (
                <Form className="flex min-h-0 flex-1 flex-col">
                  <StandingAssignmentLoader
                    open={open}
                    staffId={formik.values.staffId}
                    rosterDate={formik.values.rosterDate}
                    setAssignments={setStandingAssignments}
                    setLoadingAssignments={setLoadingAssignments}
                    onStandingCoverageChange={handleStandingCoverageChange}
                  />
                  <WorkingDepartmentSync
                    staffId={formik.values.staffId}
                    useWorkingDepartment={formik.values.useWorkingDepartment}
                    staff={formOptions.staff}
                    setFieldValue={formik.setFieldValue}
                  />
                  <AutoShiftTimes
                    shiftTypeId={formik.values.shiftTypeId}
                    startTime={formik.values.startTime}
                    endTime={formik.values.endTime}
                    totalHours={formik.values.totalHours}
                    shiftTypes={formOptions.shiftTypes}
                    standing={selectedStanding}
                    setFieldValue={formik.setFieldValue}
                  />
                  <LeavePreviewSync
                    staffId={formik.values.staffId}
                    rosterDate={formik.values.rosterDate}
                    startTime={formik.values.startTime}
                    endTime={formik.values.endTime}
                    staffLabel={selectedStaff?.name}
                    onChange={handleLeavePreviewSync}
                  />

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Use standing assignment
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Turn off for an ad-hoc shift type when no covering
                          assignment exists.
                        </p>
                      </div>
                      <Switch
                        checked={formik.values.useStandingAssignment}
                        onCheckedChange={(checked) => {
                          const dateKey = dutyDateKey(formik.values.rosterDate);
                          const key =
                            formik.values.staffId && dateKey
                              ? `${formik.values.staffId}|${dateKey}`
                              : '';
                          if (key) {
                            if (!checked) {
                              userForcedAdhocKeysRef.current.add(key);
                              autoStandingKeysRef.current.delete(key);
                            } else {
                              userForcedAdhocKeysRef.current.delete(key);
                              autoAdhocKeysRef.current.delete(key);
                            }
                          }
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            clearable={mode !== 'edit'}
                            disabled={mode === 'edit' || isLocked}
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

                      <CustomDatePickerField
                        id="rosterDate"
                        placeholder="Roster Date"
                        value={formik.values.rosterDate}
                        onChange={(value) => {
                          void formik.setFieldValue(
                            'rosterDate',
                            value ?? null
                          );
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
                        disabled={mode === 'edit' || isLocked}
                        styleClasses={fieldStyleClasses}
                      />

                      {formik.values.useStandingAssignment ? (
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
                                !formik.values.rosterDate ||
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
                          formik.values.rosterDate &&
                          standingAssignments.length === 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-xs text-muted-foreground">
                                No standing assignment covers this date.
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={isLocked}
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
                      ) : (
                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            Shift Type *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label="Shift Type"
                              options={formOptions.shiftTypes}
                              value={formik.values.shiftTypeId}
                              defaultValue=""
                              clearable
                              disabled={isLocked}
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                void formik.setFieldValue('shiftTypeId', value);
                              }}
                            />
                          </div>
                          {formik.touched.shiftTypeId &&
                          formik.errors.shiftTypeId ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.shiftTypeId}
                            </p>
                          ) : null}
                        </div>
                      )}

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

                    {selectedStaff || selectedStanding ? (
                      <ContextCard
                        staff={selectedStaff}
                        standing={selectedStanding}
                        adhocShiftLabel={adhocShift?.name ?? ''}
                        useStanding={formik.values.useStandingAssignment}
                      />
                    ) : null}

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
                          <Label className={fieldStyleClasses.labelClassName}>
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

                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
                            Duty Department *
                          </Label>
                          <div className={fieldStyleClasses.inputClassName}>
                            <Combobox
                              label="Duty Department"
                              options={departmentOptions}
                              value={formik.values.dutyLocationDepartmentId}
                              defaultValue=""
                              clearable
                              disabled={
                                isLocked || formik.values.useWorkingDepartment
                              }
                              triggerClassName="w-full max-w-none font-normal!"
                              popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                              onChange={(value) => {
                                void formik.setFieldValue(
                                  'dutyLocationDepartmentId',
                                  value
                                );
                              }}
                            />
                          </div>
                          {formik.touched.dutyLocationDepartmentId &&
                          formik.errors.dutyLocationDepartmentId ? (
                            <p className="text-xs text-destructive">
                              {formik.errors.dutyLocationDepartmentId}
                            </p>
                          ) : null}
                        </div>

                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
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
                                void formik.setFieldValue('dutyZoneId', value);
                                void formik.setFieldValue('dutyRoomId', '');
                              }}
                            />
                          </div>
                        </div>

                        <div className={fieldStyleClasses.parentDiv}>
                          <Label className={fieldStyleClasses.labelClassName}>
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
                          <Label className={fieldStyleClasses.labelClassName}>
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

                        <div
                          className={cn(
                            'space-y-2',
                            highlightLeaveField &&
                              !formik.values.isLeave &&
                              'rounded-lg border border-amber-400/80 bg-amber-50/40 p-2 dark:border-amber-500/50 dark:bg-amber-950/20'
                          )}
                        >
                          <CustomSelectField
                            id="isLeave"
                            placeholder="Leave"
                            value={String(formik.values.isLeave)}
                            onChange={(value) =>
                              formik.setFieldValue('isLeave', value === 'true')
                            }
                            required
                            disabled={isLocked}
                            options={[
                              { id: 'false', name: 'No' },
                              { id: 'true', name: 'Yes' }
                            ]}
                            styleClasses={fieldStyleClasses}
                          />
                          <LeaveApplicationHint
                            preview={leavePreview}
                            showLeaveFlagNote
                            action={
                              !formik.values.isLeave && !isLocked ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 border-amber-500/50 text-xs text-amber-900 hover:bg-amber-100 dark:text-amber-100"
                                  onClick={() =>
                                    void formik.setFieldValue('isLeave', true)
                                  }
                                >
                                  Set Leave to Yes
                                </Button>
                              ) : null
                            }
                          />
                        </div>
                        <CustomFormField
                          id="totalHours"
                          type="text"
                          placeholder="Total Hours"
                          value={formik.values.totalHours}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required={false}
                          disabled
                          styleClasses={fieldStyleClasses}
                        />
                        <CustomFormField
                          id="otHours"
                          type="number"
                          placeholder="OT Hours"
                          value={formik.values.otHours}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          required
                          min={0}
                          disabled={isLocked}
                          styleClasses={fieldStyleClasses}
                        />
                      </div>
                    </div>

                    <CustomFormField
                      id="comments"
                      type="textarea"
                      placeholder="Roster note..."
                      value={formik.values.comments}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled={isLocked}
                      styleClasses={fieldStyleClasses}
                    />

                    <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-foreground">
                          Created by:
                        </span>{' '}
                        {auditCreatedBy}
                        {mode === 'edit' && auditCreatedAt !== '—'
                          ? ` · ${auditCreatedAt}`
                          : null}
                      </p>
                      <p className="sm:text-right">
                        <span className="font-semibold text-foreground">
                          Last updated:
                        </span>{' '}
                        {auditUpdatedBy}
                        {mode === 'edit' && auditUpdatedAt !== '—'
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
                      {saveLabel}
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
        title="Confirm soft warning"
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
          await persistAllocation(pending.values, pending.helpers);
          pendingSubmitRef.current = null;
        }}
      />
    </>
  );
}
