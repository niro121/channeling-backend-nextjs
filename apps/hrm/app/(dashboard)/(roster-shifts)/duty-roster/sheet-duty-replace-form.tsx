'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  Combobox,
  CustomDatePickerField,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import {
  getDutySwapCandidatesAction,
  getStaffStandingAssignmentsForDutyAction
} from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterStaffOption,
  DutyRosterStandingAssignmentOption,
  DutyRosterRow,
  DutyRosterSwapCandidate,
  ReplaceDutyPayload
} from '@/types/roster';
import { buttonStyles } from '@/lib/utils/common-styles';

type SheetDutyReplaceFormProps = {
  open: boolean;
  record: DutyRosterRow | null;
  defaultDate: Date;
  staffOptions: DutyRosterStaffOption[];
  onOpenChange: (open: boolean) => void;
  onReplaceSubmit: (payload: ReplaceDutyPayload) => void;
};

type ReplaceFormValues = {
  staffId: string;
  replacementStaffId: string;
  dutyDate: Date | null;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function dutyDateKey(dutyDate: Date | null): string {
  if (!dutyDate) return '';
  try {
    return format(dutyDate, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function formatDutyDay(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

function rowToCandidate(row: DutyRosterRow): DutyRosterSwapCandidate {
  const staffLabel = row.staffCode
    ? `${row.staffCode} — ${row.staffName}`
    : row.staffName;
  return {
    id: row.staffId,
    allocationId: row.id,
    staffId: row.staffId,
    name: staffLabel,
    staffCode: row.staffCode,
    staffName: row.staffName,
    shiftTypeId: row.shiftTypeId,
    shiftName: row.shiftName,
    startTime: row.startTime,
    endTime: row.endTime,
    dutyLocation: row.dutyLocation,
    wardUnit: row.wardUnit,
    department: row.department,
    roster: row.roster,
    supervisorName: row.supervisorName,
    status: String(row.status),
    allocationSource: String(row.allocationSource || 'adhoc'),
    date: row.date
  };
}

function CurrentDutyCard({
  candidate
}: {
  candidate: DutyRosterSwapCandidate | null;
}) {
  if (!candidate) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
        <p className="font-semibold text-foreground">Duty to hand over</p>
        <p className="text-muted-foreground">
          Select a staff member who already has a duty on this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-border bg-muted/40 px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Duty to hand over</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Current duty
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff: <span className="text-foreground">{candidate.name}</span>
        </p>
        <p>
          Date:{' '}
          <span className="text-foreground">
            {formatDutyDay(candidate.date)}
          </span>
        </p>
        <p>
          Shift:{' '}
          <span className="text-foreground">{candidate.shiftName}</span>
        </p>
        <p>
          Times:{' '}
          <span className="text-foreground">
            {candidate.startTime} – {candidate.endTime}
          </span>
        </p>
        <p>
          Department:{' '}
          <span className="text-foreground">
            {candidate.department || '—'}
          </span>
        </p>
        <p>
          Duty location:{' '}
          <span className="text-foreground">
            {candidate.dutyLocation || '—'}
          </span>
        </p>
        <p>
          Ward / unit:{' '}
          <span className="text-foreground">{candidate.wardUnit || '—'}</span>
        </p>
        <p>
          Roster:{' '}
          <span className="text-foreground">{candidate.roster || '—'}</span>
        </p>
        <p>
          Supervisor:{' '}
          <span className="text-foreground">
            {candidate.supervisorName || '—'}
          </span>
        </p>
        <p>
          Status:{' '}
          <span className="text-foreground capitalize">
            {candidate.status || '—'}
          </span>
        </p>
      </div>
    </div>
  );
}

function ReplacementPreviewCard({
  staff,
  duty,
  standing
}: {
  staff: DutyRosterStaffOption | null;
  duty: DutyRosterSwapCandidate | null;
  standing: DutyRosterStandingAssignmentOption | null;
}) {
  if (!staff) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-50/50 px-3 py-3 text-sm dark:bg-amber-950/20">
        <p className="font-semibold text-foreground">Replacement preview</p>
        <p className="text-muted-foreground">
          Select a staff member who does not already have a duty on this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-amber-500/70 bg-amber-50/60 px-3 py-3 text-sm dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Replacement preview</p>
        <span className="rounded-full bg-amber-600/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
          Incoming staff
        </span>
      </div>
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
          <span className="text-foreground">{staff.roster || '—'}</span>
        </p>
        {standing ? (
          <>
            <p>
              Standing shift:{' '}
              <span className="text-foreground">{standing.shiftName}</span>
            </p>
            <p>
              Assignment:{' '}
              <span className="text-foreground">{standing.name}</span>
            </p>
          </>
        ) : (
          <p className="sm:col-span-2">
            Standing assignment:{' '}
            <span className="text-foreground">None covering this date</span>
          </p>
        )}
      </div>
      {duty ? (
        <div className="rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-2 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">
            Will take over this duty
          </p>
          <p>
            {duty.shiftName} · {duty.startTime} – {duty.endTime} ·{' '}
            {duty.dutyLocation || duty.department || 'No location'} ·{' '}
            {formatDutyDay(duty.date)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SheetDutyReplaceForm({
  open,
  record,
  defaultDate,
  staffOptions,
  onOpenChange,
  onReplaceSubmit
}: SheetDutyReplaceFormProps) {
  const { toast } = useToast();
  const lockedFromRow = !!record;
  const [onDuty, setOnDuty] = useState<DutyRosterSwapCandidate[]>([]);
  const [loadingOnDuty, setLoadingOnDuty] = useState(false);
  const [standing, setStanding] = useState<
    DutyRosterStandingAssignmentOption[]
  >([]);
  const [loadingStanding, setLoadingStanding] = useState(false);

  const initialValues = useMemo<ReplaceFormValues>(
    () => ({
      staffId: record?.staffId ?? '',
      replacementStaffId: '',
      dutyDate: record?.date ? new Date(record.date) : defaultDate
    }),
    [defaultDate, record]
  );

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff to replace is required'),
        replacementStaffId: Yup.string()
          .required('Replacement staff is required')
          .notOneOf(
            [Yup.ref('staffId')],
            'Select a different registered staff member'
          ),
        dutyDate: Yup.date().nullable().required('Duty date is required')
      }),
    []
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>Replace Staff</SheetTitle>
          <SheetDescription>
            Move an existing duty cell to another staff member who is not
            already rostered on that date. The shift and place stay the same.
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={(values) => {
            const current = onDuty.find(
              (row) => row.staffId === values.staffId
            );
            const incoming = staffOptions.find(
              (row) => row.id === values.replacementStaffId
            );
            if (!current) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description:
                  'The selected staff member has no duty on this date.'
              });
              return;
            }
            if (!incoming) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Replacement staff was not found.'
              });
              return;
            }
            const dutyDate = values.dutyDate as Date;
            onReplaceSubmit({
              allocationId: current.allocationId,
              staffId: values.staffId,
              replacementStaffId: values.replacementStaffId,
              dutyDate,
              confirmSummary: `Replace ${current.name} with ${incoming.name} on ${format(dutyDate, 'dd MMM yyyy')} (${current.shiftName}).`
            });
          }}
        >
          {(formik) => {
            const current =
              onDuty.find((row) => row.staffId === formik.values.staffId) ??
              null;
            const incoming =
              staffOptions.find(
                (row) => row.id === formik.values.replacementStaffId
              ) ?? null;
            const onDutyIds = new Set(onDuty.map((row) => row.staffId));
            const primaryOptions = lockedFromRow
              ? onDuty.filter((row) => row.staffId === formik.values.staffId)
              : onDuty;
            const replacementOptions = staffOptions.filter(
              (row) =>
                row.id !== formik.values.staffId && !onDutyIds.has(row.id)
            );
            const primaryStanding = standing[0] ?? null;

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <OnDutyLoader
                  open={open}
                  dutyDate={formik.values.dutyDate}
                  record={record}
                  setOnDuty={setOnDuty}
                  setLoadingOnDuty={setLoadingOnDuty}
                />
                <StandingPreviewLoader
                  open={open}
                  staffId={formik.values.replacementStaffId}
                  dutyDate={formik.values.dutyDate}
                  setStanding={setStanding}
                  setLoadingStanding={setLoadingStanding}
                />

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Staff to Replace *
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Staff to Replace"
                          options={primaryOptions}
                          value={formik.values.staffId}
                          defaultValue=""
                          clearable={!lockedFromRow}
                          disabled={lockedFromRow || loadingOnDuty}
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) => {
                            void formik.setFieldValue('staffId', value);
                            if (value === formik.values.replacementStaffId) {
                              void formik.setFieldValue(
                                'replacementStaffId',
                                ''
                              );
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

                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Replacement Staff *
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label={
                            loadingOnDuty
                              ? 'Loading available staff…'
                              : 'Replacement Staff'
                          }
                          options={replacementOptions}
                          value={formik.values.replacementStaffId}
                          defaultValue=""
                          clearable
                          disabled={
                            loadingOnDuty || !formik.values.staffId
                          }
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('replacementStaffId', value)
                          }
                        />
                      </div>
                      {formik.touched.replacementStaffId &&
                      formik.errors.replacementStaffId ? (
                        <p className="text-xs text-destructive">
                          {formik.errors.replacementStaffId}
                        </p>
                      ) : null}
                      {!loadingOnDuty &&
                      formik.values.staffId &&
                      replacementOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No free staff for{' '}
                          {dutyDateKey(formik.values.dutyDate) || 'this date'}.
                          Everyone else already has a duty.
                        </p>
                      ) : null}
                    </div>

                    <CustomDatePickerField
                      id="replaceDutyDate"
                      placeholder="Duty Date"
                      value={formik.values.dutyDate}
                      onChange={(value) => {
                        void formik.setFieldValue('dutyDate', value ?? null);
                        if (!lockedFromRow) {
                          void formik.setFieldValue('staffId', '');
                        }
                        void formik.setFieldValue('replacementStaffId', '');
                      }}
                      onBlur={formik.handleBlur}
                      required
                      disabled={lockedFromRow}
                      useFormikError={false}
                      error={
                        typeof formik.errors.dutyDate === 'string'
                          ? formik.errors.dutyDate
                          : undefined
                      }
                      touched={Boolean(formik.touched.dutyDate)}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CurrentDutyCard candidate={current} />
                  <ReplacementPreviewCard
                    staff={incoming}
                    duty={current}
                    standing={loadingStanding ? null : primaryStanding}
                  />
                </div>

                <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={buttonStyles.cancel.normal}
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className={buttonStyles.save}
                    disabled={loadingOnDuty}
                  >
                    Replace Staff
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

function OnDutyLoader({
  open,
  dutyDate,
  record,
  setOnDuty,
  setLoadingOnDuty
}: {
  open: boolean;
  dutyDate: Date | null;
  record: DutyRosterRow | null;
  setOnDuty: (rows: DutyRosterSwapCandidate[]) => void;
  setLoadingOnDuty: (loading: boolean) => void;
}) {
  const { toast } = useToast();
  const dateKey = dutyDateKey(dutyDate);

  useEffect(() => {
    if (!open || !dutyDate || !dateKey) {
      setOnDuty([]);
      return;
    }
    let cancelled = false;
    setLoadingOnDuty(true);
    void getDutySwapCandidatesAction(dutyDate).then((respond) => {
      if (cancelled) return;
      setLoadingOnDuty(false);
      if (respond?.isError) {
        setOnDuty([]);
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (respond.errors as { message?: string })?.message ??
            'Could not load staff on duty for this date.'
        });
        return;
      }
      const rows = respond?.data ?? [];
      if (record && !rows.some((row) => row.staffId === record.staffId)) {
        setOnDuty([rowToCandidate(record), ...rows]);
        return;
      }
      setOnDuty(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, dutyDate, open, record, setLoadingOnDuty, setOnDuty, toast]);

  return null;
}

function StandingPreviewLoader({
  open,
  staffId,
  dutyDate,
  setStanding,
  setLoadingStanding
}: {
  open: boolean;
  staffId: string;
  dutyDate: Date | null;
  setStanding: (rows: DutyRosterStandingAssignmentOption[]) => void;
  setLoadingStanding: (loading: boolean) => void;
}) {
  useEffect(() => {
    if (!open || !staffId || !dutyDate) {
      setStanding([]);
      return;
    }
    let cancelled = false;
    setLoadingStanding(true);
    void getStaffStandingAssignmentsForDutyAction(staffId, dutyDate).then(
      (respond) => {
        if (cancelled) return;
        setLoadingStanding(false);
        if (respond?.isError) {
          setStanding([]);
          return;
        }
        setStanding(respond?.data ?? []);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [dutyDate, open, setLoadingStanding, setStanding, staffId]);

  return null;
}
