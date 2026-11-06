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
import { getDutySwapCandidatesAction } from '@/app/actions/roster-actions/duty-roster.actions';
import type {
  DutyRosterRow,
  DutyRosterSwapCandidate,
  SwapDutyPayload
} from '@/types/roster';
import { buttonStyles } from '@/lib/utils/common-styles';

type SheetDutySwapFormProps = {
  open: boolean;
  record: DutyRosterRow | null;
  defaultDate: Date;
  onOpenChange: (open: boolean) => void;
  onSwapSubmit: (payload: SwapDutyPayload) => void;
};

type SwapFormValues = {
  staffId: string;
  otherStaffId: string;
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

function DutySwapCard({
  title,
  candidate,
  variant
}: {
  title: string;
  candidate: DutyRosterSwapCandidate | null;
  variant: 'current' | 'partner';
}) {
  const borderClass =
    variant === 'partner'
      ? 'border-sky-500/70 bg-sky-50/60 dark:bg-sky-950/20'
      : 'border-border bg-muted/40';

  if (!candidate) {
    return (
      <div
        className={`space-y-2 rounded-lg border px-3 py-3 text-sm ${borderClass}`}
      >
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-muted-foreground">
          {variant === 'partner'
            ? 'Select a staff member on duty this date to preview their allocation.'
            : 'Select a staff member who already has a duty on this date.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-2 rounded-lg border-2 px-3 py-3 text-sm ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{title}</p>
        {variant === 'partner' ? (
          <span className="rounded-full bg-sky-600/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
            Swap partner
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Current duty
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-muted-foreground sm:grid-cols-2">
        <p>
          Staff:{' '}
          <span className="text-foreground">{candidate.name}</span>
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
        <p>
          Source:{' '}
          <span className="text-foreground capitalize">
            {candidate.allocationSource || '—'}
          </span>
        </p>
      </div>
    </div>
  );
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

export default function SheetDutySwapForm({
  open,
  record,
  defaultDate,
  onOpenChange,
  onSwapSubmit
}: SheetDutySwapFormProps) {
  const { toast } = useToast();
  const lockedFromRow = !!record;
  const [candidates, setCandidates] = useState<DutyRosterSwapCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const initialValues = useMemo<SwapFormValues>(
    () => ({
      staffId: record?.staffId ?? '',
      otherStaffId: '',
      dutyDate: record?.date ? new Date(record.date) : defaultDate
    }),
    [defaultDate, record]
  );

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        otherStaffId: Yup.string()
          .required('Swap with staff is required')
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
          <SheetTitle>Swap Shift</SheetTitle>
          <SheetDescription>
            Exchange shift types between two staff members who already have a
            duty on the same date. Only the swap partner is editable when opened
            from a row.
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={(values) => {
            const left = candidates.find((row) => row.staffId === values.staffId);
            const right = candidates.find(
              (row) => row.staffId === values.otherStaffId
            );
            if (!left || !right) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description:
                  'Both staff members must already have a duty on this date.'
              });
              return;
            }
            const dutyDate = values.dutyDate as Date;
            onSwapSubmit({
              allocationId: left.allocationId,
              staffId: values.staffId,
              otherStaffId: values.otherStaffId,
              dutyDate,
              confirmSummary: `${left.name} (${left.shiftName}) ↔ ${right.name} (${right.shiftName}) on ${format(dutyDate, 'dd MMM yyyy')}.`
            });
          }}
        >
          {(formik) => {
            const left =
              candidates.find(
                (row) => row.staffId === formik.values.staffId
              ) ?? null;
            const right =
              candidates.find(
                (row) => row.staffId === formik.values.otherStaffId
              ) ?? null;
            const partnerOptions = candidates.filter(
              (row) => row.staffId !== formik.values.staffId
            );
            const primaryOptions = lockedFromRow
              ? candidates.filter(
                  (row) => row.staffId === formik.values.staffId
                )
              : candidates;

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <SwapCandidatesLoader
                  open={open}
                  dutyDate={formik.values.dutyDate}
                  record={record}
                  setCandidates={setCandidates}
                  setLoadingCandidates={setLoadingCandidates}
                />
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Staff Member *
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Staff Member"
                          options={primaryOptions}
                          value={formik.values.staffId}
                          defaultValue=""
                          clearable={!lockedFromRow}
                          disabled={lockedFromRow || loadingCandidates}
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) => {
                            void formik.setFieldValue('staffId', value);
                            if (value === formik.values.otherStaffId) {
                              void formik.setFieldValue('otherStaffId', '');
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
                        Swap With *
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label={
                            loadingCandidates
                              ? 'Loading staff on duty…'
                              : 'Swap With'
                          }
                          options={partnerOptions}
                          value={formik.values.otherStaffId}
                          defaultValue=""
                          clearable
                          disabled={
                            loadingCandidates || !formik.values.staffId
                          }
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('otherStaffId', value)
                          }
                        />
                      </div>
                      {formik.touched.otherStaffId &&
                      formik.errors.otherStaffId ? (
                        <p className="text-xs text-destructive">
                          {formik.errors.otherStaffId}
                        </p>
                      ) : null}
                      {!loadingCandidates &&
                      formik.values.staffId &&
                      partnerOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No other staff have a duty on{' '}
                          {dutyDateKey(formik.values.dutyDate) || 'this date'}.
                          Use Replace instead.
                        </p>
                      ) : null}
                    </div>

                    <CustomDatePickerField
                      id="swapDutyDate"
                      placeholder="Duty Date"
                      value={formik.values.dutyDate}
                      onChange={(value) => {
                        void formik.setFieldValue('dutyDate', value ?? null);
                        if (!lockedFromRow) {
                          void formik.setFieldValue('staffId', '');
                        }
                        void formik.setFieldValue('otherStaffId', '');
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

                  <DutySwapCard
                    title="Current duty"
                    candidate={left}
                    variant="current"
                  />
                  <DutySwapCard
                    title="Swap partner duty"
                    candidate={right}
                    variant="partner"
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
                    disabled={loadingCandidates}
                  >
                    Swap Shift
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

function SwapCandidatesLoader({
  open,
  dutyDate,
  record,
  setCandidates,
  setLoadingCandidates
}: {
  open: boolean;
  dutyDate: Date | null;
  record: DutyRosterRow | null;
  setCandidates: (rows: DutyRosterSwapCandidate[]) => void;
  setLoadingCandidates: (loading: boolean) => void;
}) {
  const { toast } = useToast();
  const dateKey = dutyDateKey(dutyDate);

  useEffect(() => {
    if (!open || !dutyDate || !dateKey) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    setLoadingCandidates(true);
    void getDutySwapCandidatesAction(dutyDate).then((respond) => {
      if (cancelled) return;
      setLoadingCandidates(false);
      if (respond?.isError) {
        setCandidates([]);
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
        setCandidates([rowToCandidate(record), ...rows]);
        return;
      }
      setCandidates(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [
    dateKey,
    dutyDate,
    open,
    record,
    setCandidates,
    setLoadingCandidates,
    toast
  ]);

  return null;
}
