'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import {
  Button,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  CustomTimeField,
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
  createAttendanceCorrectionAction,
  lookupAttendanceDayForCorrectionAction,
  updateAttendanceCorrectionAction
} from '@/app/actions/attendance-actions/attendance-correction.actions';
import type {
  AttendanceCorrectionFormOptions,
  AttendanceCorrectionRecord
} from '@/types/attendance';
import { ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS } from '@/types/attendance';
import type { CorrectionFormSheetMode } from './attendance-corrections-ui-context';

export type CorrectionFormValues = {
  correctionNo: string;
  staffId: string;
  attendanceDate: Date | null;
  originalFirstIn: string;
  originalLastOut: string;
  originalStatus: string;
  correctedFirstIn: string;
  correctedFirstInMeridiem: 'AM' | 'PM';
  correctedLastOut: string;
  correctedLastOutMeridiem: 'AM' | 'PM';
  correctedStatus: string;
  reason: string;
};

type SheetCorrectionFormProps = {
  open: boolean;
  mode: CorrectionFormSheetMode;
  record: AttendanceCorrectionRecord | null;
  formOptions: AttendanceCorrectionFormOptions;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const timeFieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputWrapper: 'w-full',
  timeInput: 'w-full',
  selectInput: 'w-full'
};

function meridiemFromHhMm(hhmm: string): 'AM' | 'PM' {
  const hour = Number(hhmm.split(':')[0]);
  if (Number.isNaN(hour)) return 'AM';
  return hour >= 12 ? 'PM' : 'AM';
}

function emptyValues(): CorrectionFormValues {
  return {
    correctionNo: 'Auto-assigned on save',
    staffId: '',
    attendanceDate: null,
    originalFirstIn: '',
    originalLastOut: '',
    originalStatus: '',
    correctedFirstIn: '',
    correctedFirstInMeridiem: 'AM',
    correctedLastOut: '',
    correctedLastOutMeridiem: 'AM',
    correctedStatus: 'present',
    reason: ''
  };
}

function recordToFormValues(
  record: AttendanceCorrectionRecord
): CorrectionFormValues {
  const [y, m, d] = record.date.slice(0, 10).split('-').map(Number);
  const correctedFirstIn =
    record.correctedFirstInLabel === '—' ? '' : record.correctedFirstInLabel;
  const correctedLastOut =
    record.correctedLastOutLabel === '—' ? '' : record.correctedLastOutLabel;
  return {
    correctionNo: record.code,
    staffId: record.staffId,
    attendanceDate: y && m && d ? new Date(y, m - 1, d) : null,
    originalFirstIn:
      record.originalFirstInLabel === '—' ? '' : record.originalFirstInLabel,
    originalLastOut:
      record.originalLastOutLabel === '—' ? '' : record.originalLastOutLabel,
    originalStatus: record.originalStatus || '',
    correctedFirstIn,
    correctedFirstInMeridiem: meridiemFromHhMm(correctedFirstIn),
    correctedLastOut,
    correctedLastOutMeridiem: meridiemFromHhMm(correctedLastOut),
    correctedStatus: record.correctedStatus,
    reason: record.reason
  };
}

function AutoAttendanceDayLookup({
  staffId,
  attendanceDate,
  setFieldValue,
  toast,
  enabled
}: {
  staffId: string;
  attendanceDate: Date | null;
  setFieldValue: FormikProps<CorrectionFormValues>['setFieldValue'];
  toast: ReturnType<typeof useToast>['toast'];
  enabled: boolean;
}) {
  const lookupKey = useRef('');

  useEffect(() => {
    if (!enabled) return;
    if (!staffId || !attendanceDate) {
      void setFieldValue('originalFirstIn', '');
      void setFieldValue('originalLastOut', '');
      void setFieldValue('originalStatus', '');
      return;
    }

    const key = `${staffId}:${format(attendanceDate, 'yyyy-MM-dd')}`;
    if (lookupKey.current === key) return;
    lookupKey.current = key;

    let cancelled = false;

    void (async () => {
      const result = await lookupAttendanceDayForCorrectionAction(
        staffId,
        format(attendanceDate, 'yyyy-MM-dd')
      );
      if (cancelled) return;

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Lookup failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not load attendance for this staff and date.'
        });
        return;
      }

      const day = result.data;
      void setFieldValue(
        'originalFirstIn',
        day?.originalFirstInLabel === '—'
          ? ''
          : (day?.originalFirstInLabel ?? '')
      );
      void setFieldValue(
        'originalLastOut',
        day?.originalLastOutLabel === '—'
          ? ''
          : (day?.originalLastOutLabel ?? '')
      );
      void setFieldValue('originalStatus', day?.originalStatus ?? '');
      if (day?.originalFirstInLabel && day.originalFirstInLabel !== '—') {
        void setFieldValue('correctedFirstIn', day.originalFirstInLabel);
        void setFieldValue(
          'correctedFirstInMeridiem',
          meridiemFromHhMm(day.originalFirstInLabel)
        );
      }
      if (day?.originalLastOutLabel && day.originalLastOutLabel !== '—') {
        void setFieldValue('correctedLastOut', day.originalLastOutLabel);
        void setFieldValue(
          'correctedLastOutMeridiem',
          meridiemFromHhMm(day.originalLastOutLabel)
        );
      }
      const dayStatus = day?.originalStatus ?? '';
      if (dayStatus === 'on_leave') {
        void setFieldValue('correctedStatus', 'leave');
      } else if (
        dayStatus &&
        ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS.some(
          (option) => option.id === dayStatus
        )
      ) {
        void setFieldValue('correctedStatus', dayStatus);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attendanceDate, enabled, setFieldValue, staffId, toast]);

  return null;
}

export default function SheetCorrectionForm({
  open,
  mode,
  record,
  formOptions,
  onOpenChange
}: SheetCorrectionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit && !!record;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        staffId: Yup.string().required('Staff member is required'),
        attendanceDate: Yup.date()
          .nullable()
          .required('Attendance date is required'),
        correctedStatus: Yup.string().required('Corrected status is required'),
        correctedFirstIn: Yup.string().trim(),
        correctedLastOut: Yup.string().trim(),
        reason: Yup.string()
          .required('Reason is required')
          .max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return recordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

  const save = async (
    values: CorrectionFormValues,
    status: 'draft' | 'pending_approval'
  ) => {
    setLoading(true);
    try {
      if (!values.attendanceDate) return;
      const payload = {
        staffId: values.staffId,
        date: format(values.attendanceDate, 'yyyy-MM-dd'),
        correctedFirstIn: values.correctedFirstIn.trim() || null,
        correctedLastOut: values.correctedLastOut.trim() || null,
        correctedStatus: values.correctedStatus,
        reason: values.reason.trim(),
        status
      };

      const result =
        isEdit && record
          ? await updateAttendanceCorrectionAction(record.id, payload)
          : await createAttendanceCorrectionAction(payload);

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Correction could not be saved.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? `${record?.code ?? 'Correction'} updated.`
          : `${result.data?.code ?? 'Correction'} saved as ${
              status === 'draft' ? 'draft' : 'pending approval'
            }.`
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
            : 'Correction could not be saved.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {isEdit ? 'Edit Correction' : 'Create Correction'}
          </SheetTitle>
          <SheetDescription>
            Original punch-derived values stay read-only. Corrected fields update
            Daily Attendance after approval.
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            await save(values, 'draft');
          }}
        >
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              {!isEdit ? (
                <AutoAttendanceDayLookup
                  staffId={formik.values.staffId}
                  attendanceDate={formik.values.attendanceDate}
                  setFieldValue={formik.setFieldValue}
                  toast={toast}
                  enabled
                />
              ) : null}

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomFormField
                    id="correctionNo"
                    type="text"
                    placeholder="Correction ID"
                    value={formik.values.correctionNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="staffId"
                    placeholder="Staff Member"
                    value={formik.values.staffId}
                    onChange={(value) => formik.setFieldValue('staffId', value)}
                    required
                    options={formOptions.staff}
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomDatePickerField
                    id="attendanceDate"
                    placeholder="Attendance Date"
                    value={formik.values.attendanceDate}
                    onChange={(value) =>
                      formik.setFieldValue('attendanceDate', value ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomSelectField
                    id="correctedStatus"
                    placeholder="Corrected Status"
                    value={formik.values.correctedStatus}
                    onChange={(value) =>
                      formik.setFieldValue('correctedStatus', value)
                    }
                    required
                    options={formOptions.dayStatuses}
                    styleClasses={fieldStyleClasses}
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Original (read-only)
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <CustomFormField
                      id="originalFirstIn"
                      type="text"
                      placeholder="Original In"
                      value={formik.values.originalFirstIn || '—'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="originalLastOut"
                      type="text"
                      placeholder="Original Out"
                      value={formik.values.originalLastOut || '—'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="originalStatus"
                      type="text"
                      placeholder="Original Status"
                      value={formik.values.originalStatus || '—'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Corrected
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CustomTimeField
                      timeId="correctedFirstIn"
                      meridiemId="correctedFirstInMeridiem"
                      label="Corrected In"
                      timeValue={formik.values.correctedFirstIn}
                      meridiemValue={formik.values.correctedFirstInMeridiem}
                      onTimeChange={(e) =>
                        formik.setFieldValue('correctedFirstIn', e.target.value)
                      }
                      onMeridiemChange={(value) =>
                        formik.setFieldValue('correctedFirstInMeridiem', value)
                      }
                      styleClasses={timeFieldStyleClasses}
                    />
                    <CustomTimeField
                      timeId="correctedLastOut"
                      meridiemId="correctedLastOutMeridiem"
                      label="Corrected Out"
                      timeValue={formik.values.correctedLastOut}
                      meridiemValue={formik.values.correctedLastOutMeridiem}
                      onTimeChange={(e) =>
                        formik.setFieldValue('correctedLastOut', e.target.value)
                      }
                      onMeridiemChange={(value) =>
                        formik.setFieldValue('correctedLastOutMeridiem', value)
                      }
                      styleClasses={timeFieldStyleClasses}
                    />
                  </div>
                </div>

                <CustomFormField
                  id="reason"
                  type="textarea"
                  placeholder="Reason for Correction"
                  value={formik.values.reason}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  styleClasses={fieldStyleClasses}
                />

                <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    Created by:{' '}
                    {showAudit
                      ? record?.createdUser?.name || record?.createdBy || '—'
                      : '—'}
                    {showAudit && record?.createdAt
                      ? ` · ${formatAuditDateTime(record.createdAt)}`
                      : null}
                  </p>
                  <p className="sm:text-right">
                    Last updated:{' '}
                    {showAudit
                      ? record?.updatedUser?.name || record?.updatedBy || '—'
                      : '—'}
                    {showAudit && record?.updatedAt
                      ? ` · ${formatAuditDateTime(record.updatedAt)}`
                      : null}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row flex-wrap justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  size="sm"
                  className="w-full gap-1 border-red-500 text-red-500 transition-colors duration-100 ease-in-out hover:bg-red-500 hover:text-white sm:w-24"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={async () => {
                    const errors = await formik.validateForm();
                    if (Object.keys(errors).length > 0) {
                      formik.setTouched(
                        Object.fromEntries(
                          Object.keys(formik.values).map((k) => [k, true])
                        ) as never
                      );
                      return;
                    }
                    await save(formik.values, 'pending_approval');
                  }}
                >
                  Submit for Approval
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  Save Draft
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
