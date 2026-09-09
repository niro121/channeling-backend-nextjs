'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import {
  CirclePlay,
  Plane,
  RotateCcw,
  SaveIcon,
  Trash2,
  XIcon
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  CustomAlertDialog,
  CustomDatePickerField,
  CustomFormField,
  CustomSelectField,
  Label,
  useToast
} from '@archmage/ui';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  createLeaveApplicationAction,
  deleteLeaveApplicationAction,
  getLeaveApplicationBalanceSnapshotAction,
  updateLeaveApplicationAction
} from '@/app/actions/leave-actions/leave-application.actions';
import { getLeaveEntitlementBalanceAction } from '@/app/actions/leave-actions/leave-entitlement.actions';
import {
  computeLeaveApplicationDays,
  formatHalfDaySessionLabel
} from '@/lib/helpers/leave-application-days.helper';
import {
  leaveApplicationFormValuesToPayload,
  leaveApplicationRecordToFormValues
} from '@/lib/mappers/leave-application-form.mapper';
import type {
  LeaveApplicationFormValues,
  LeaveApplicationRecord,
  LeaveApplicationShiftRow
} from '@/types/leave';

export type LeaveTypeFormOption = {
  id: string;
  name: string;
  allowHalfDay?: boolean;
};

type FilterOption = {
  id: string;
  name: string;
};

type LeaveBalanceSnapshot = {
  entitle: number;
  utilized: number;
  balance: number;
};

type ShiftRow = {
  id: string;
  shift: string;
  from: string;
  to: string;
  shiftDate?: Date;
};

type AuditInfo = {
  name: string;
  position?: string | null;
  at: Date | string | null;
};

type FormLeaveDetailsProps = {
  staffOptions?: FilterOption[];
  leaveTypeOptions?: LeaveTypeFormOption[];
  approverOptions?: FilterOption[];
  shiftOptions?: FilterOption[];
  selectedRecord?: LeaveApplicationRecord | null;
  onClearSelection?: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const HALF_DAY_SESSION_OPTIONS = [
  { id: 'AM', name: 'Morning' },
  { id: 'PM', name: 'Afternoon' }
];

const emptyValues: LeaveApplicationFormValues = {
  formNumber: '',
  staffId: '',
  leaveTypeId: '',
  fromDate: null,
  toDate: null,
  requestedDate: new Date(),
  approverId: '',
  approvedDate: null,
  lieuShiftId: '',
  comment: '',
  outWithCancel: false,
  isHalfDay: false,
  halfDaySession: ''
};

const emptyBalance: LeaveBalanceSnapshot = {
  entitle: 0,
  utilized: 0,
  balance: 0
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Staff is required'),
  leaveTypeId: Yup.string().required('Leave type is required'),
  fromDate: Yup.date().nullable().required('Date is required'),
  toDate: Yup.date()
    .nullable()
    .when('isHalfDay', {
      is: true,
      then: (schema) => schema.nullable().notRequired(),
      otherwise: (schema) =>
        schema
          .required('To date is required')
          .min(Yup.ref('fromDate'), 'To date must be on or after from date')
    }),
  halfDaySession: Yup.string().when('isHalfDay', {
    is: true,
    then: (schema) =>
      schema
        .oneOf(['AM', 'PM'], 'Select Morning or Afternoon')
        .required('Select Morning or Afternoon'),
    otherwise: (schema) => schema.notRequired()
  }),
  requestedDate: Yup.date().nullable().optional(),
  approverId: Yup.string().optional(),
  comment: Yup.string().optional(),
  outWithCancel: Yup.boolean(),
  isHalfDay: Yup.boolean()
});

function previewLeaveDays(values: LeaveApplicationFormValues, allowHalfDay: boolean): {
  days: number;
  label: string;
} {
  if (!values.fromDate) {
    return { days: 0, label: '—' };
  }

  const toDate = values.isHalfDay
    ? values.fromDate
    : values.toDate ?? values.fromDate;

  const days = computeLeaveApplicationDays({
    fromDate: values.fromDate,
    toDate,
    isHalfDay: values.isHalfDay,
    allowHalfDay,
    halfDaySession: values.halfDaySession
  });

  if (values.isHalfDay && (values.halfDaySession === 'AM' || values.halfDaySession === 'PM')) {
    return {
      days,
      label: `${days} (${formatHalfDaySessionLabel(values.halfDaySession)})`
    };
  }

  if (values.isHalfDay) {
    return { days: 0, label: 'Select Morning or Afternoon' };
  }

  return { days, label: String(days) };
}

function formatAuditLine(info?: AuditInfo | null): string {
  if (!info?.name || !info.at) return '—';

  const date = info.at instanceof Date ? info.at : new Date(info.at);
  if (Number.isNaN(date.getTime())) return '—';

  const namePart = info.position
    ? `${info.name} (${info.position})`
    : info.name;
  const datePart = format(date, 'd MMM yyyy');
  const timePart = format(date, 'HH:mm');

  return `${namePart} · ${datePart} · ${timePart}`;
}

export default function FormLeaveDetails({
  staffOptions = [],
  leaveTypeOptions = [],
  approverOptions = [],
  shiftOptions = [],
  selectedRecord = null,
  onClearSelection
}: FormLeaveDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [balance, setBalance] = useState<LeaveBalanceSnapshot>(emptyBalance);
  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([]);
  const [staffBalance, setStaffBalance] = useState({
    total: 0,
    used: 0,
    remaining: 0
  });

  const isEdit = Boolean(selectedRecord?.id);
  const canSave = isEdit
    ? has('leave-application', 'edit')
    : has('leave-application', 'add');
  const canDelete = has('leave-application', 'delete');

  const formInitialValues: LeaveApplicationFormValues = selectedRecord
    ? leaveApplicationRecordToFormValues(selectedRecord)
    : emptyValues;

  const leaveTypeAllowHalfDay = useMemo(() => {
    const map = new Map(
      leaveTypeOptions.map((opt) => [opt.id, Boolean(opt.allowHalfDay)])
    );
    return map;
  }, [leaveTypeOptions]);

  useEffect(() => {
    if (selectedRecord) {
      setBalance({
        entitle: Number(selectedRecord.entitleSnapshot ?? 0),
        utilized: Number(selectedRecord.utilizedSnapshot ?? 0),
        balance: Number(selectedRecord.balanceSnapshot ?? 0)
      });
      setShiftRows(
        (selectedRecord.shifts ?? []).map((shift, index) => ({
          id: String(index),
          shift: shift.shiftLabel,
          from: format(new Date(shift.from), 'EEE MMM d HH:mm'),
          to: format(new Date(shift.to), 'EEE MMM d HH:mm'),
          shiftDate: shift.shiftDate ? new Date(shift.shiftDate) : undefined
        }))
      );
    } else {
      setBalance(emptyBalance);
      setShiftRows([]);
    }
  }, [selectedRecord]);

  useEffect(() => {
    const staffId = selectedRecord?.staffId;
    if (!staffId) {
      setStaffBalance({ total: 0, used: 0, remaining: 0 });
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await getLeaveEntitlementBalanceAction(staffId);
      if (cancelled) return;
      if (result.isError || !result.data) {
        setStaffBalance({ total: 0, used: 0, remaining: 0 });
        return;
      }
      setStaffBalance({
        total: result.data.totalEntitlement,
        used: result.data.used,
        remaining: result.data.remaining
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRecord?.staffId]);

  const utilisationPercent =
    staffBalance.total > 0
      ? Math.round((staffBalance.used / staffBalance.total) * 100)
      : 0;

  const auditCreated = selectedRecord?.createdUser
    ? {
        name: selectedRecord.createdUser.name,
        at: selectedRecord.createdAt ?? null
      }
    : null;

  const auditUpdated = selectedRecord?.updatedUser
    ? {
        name: selectedRecord.updatedUser.name,
        at: selectedRecord.updatedAt ?? null
      }
    : null;

  const handleSubmit = async (
    values: LeaveApplicationFormValues,
    {
      setErrors,
      setTouched,
      resetForm
    }: FormikHelpers<LeaveApplicationFormValues>
  ) => {
    try {
      setLoading(true);
      const shifts: LeaveApplicationShiftRow[] = shiftRows.map((row) => ({
        shiftLabel: row.shift,
        from: values.fromDate as Date,
        to: values.toDate as Date,
        shiftDate: row.shiftDate ?? values.fromDate
      }));

      const lieuLabel =
        shiftOptions.find((opt) => opt.id === values.lieuShiftId)?.name ?? null;

      const payload = leaveApplicationFormValuesToPayload(values, {
        lieuShiftLabel: lieuLabel,
        entitleSnapshot: balance.entitle,
        utilizedSnapshot: balance.utilized,
        balanceSnapshot: balance.balance,
        shifts
      });

      const respond =
        isEdit && selectedRecord?.id
          ? await updateLeaveApplicationAction(selectedRecord.id, payload)
          : await createLeaveApplicationAction(payload);

      if (
        respond?.isError &&
        respond?.errors &&
        typeof respond.errors === 'object' &&
        !Array.isArray(respond.errors)
      ) {
        const fieldErrors: Record<string, string> = {};
        const errorMap = respond.errors as Record<
          string,
          string | string[] | undefined
        >;

        Object.keys(errorMap).forEach((key) => {
          if (key === 'message') return;
          const err = errorMap[key];
          const msg =
            Array.isArray(err) && err.length > 0
              ? err[0]
              : typeof err === 'string'
                ? err
                : undefined;
          if (!msg) return;
          fieldErrors[key] = msg;
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

        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            ((respond.errors as Record<string, unknown>)?.message as string) ??
            'Leave application save unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? 'Leave application updated successfully.'
          : 'Leave application created successfully.'
      });

      resetForm({ values: emptyValues });
      setBalance(emptyBalance);
      setShiftRows([]);
      onClearSelection?.();
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Leave application save unsuccessful.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id) return;
    try {
      setDeleting(true);
      const result = await deleteLeaveApplicationAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave application deletion unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave application deleted successfully.'
      });
      onClearSelection?.();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message ?? 'Leave application deletion unsuccessful.'
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold">
              Leave Form Details
            </CardTitle>
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => onClearSelection?.()}
              >
                <XIcon className="h-4 w-4" />
                New
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <Formik
            initialValues={formInitialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {(formik) => {
              const allowHalfDay = Boolean(
                leaveTypeAllowHalfDay.get(formik.values.leaveTypeId)
              );
              const showHalfDayControls = allowHalfDay;
              const daysPreview = previewLeaveDays(
                formik.values,
                allowHalfDay
              );
              const effectiveToDate = formik.values.isHalfDay
                ? formik.values.fromDate
                : formik.values.toDate;

              return (
                <Form className="space-y-4">
                  <CustomFormField
                    type="text"
                    id="formNumber"
                    placeholder="Form Number (auto)"
                    value={formik.values.formNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                  />

                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Staff
                      <span className="text-red-600"> *</span>
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      {isEdit ? (
                        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                          {staffOptions.find(
                            (opt) => opt.id === formik.values.staffId
                          )?.name || selectedRecord?.staffName || '—'}
                        </div>
                      ) : (
                        <Combobox
                          label="Select Staff"
                          options={staffOptions}
                          value={formik.values.staffId}
                          defaultValue=""
                          clearable
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) => {
                            formik.setFieldValue('staffId', value);
                            if (value) {
                              void getLeaveEntitlementBalanceAction(value).then(
                                (result) => {
                                  if (result.isError || !result.data) {
                                    setStaffBalance({
                                      total: 0,
                                      used: 0,
                                      remaining: 0
                                    });
                                    return;
                                  }
                                  setStaffBalance({
                                    total: result.data.totalEntitlement,
                                    used: result.data.used,
                                    remaining: result.data.remaining
                                  });
                                }
                              );
                            } else {
                              setStaffBalance({
                                total: 0,
                                used: 0,
                                remaining: 0
                              });
                            }
                          }}
                        />
                      )}
                    </div>
                    {formik.touched.staffId && formik.errors.staffId ? (
                      <p className="text-xs text-destructive">
                        {formik.errors.staffId}
                      </p>
                    ) : null}
                  </div>

                  <CustomSelectField
                    id="leaveTypeId"
                    placeholder="Leave Type"
                    options={leaveTypeOptions}
                    value={formik.values.leaveTypeId}
                    onChange={(value) => {
                      formik.setFieldValue('leaveTypeId', value);
                      const typeAllowsHalf = Boolean(
                        leaveTypeAllowHalfDay.get(value)
                      );
                      if (!typeAllowsHalf) {
                        formik.setFieldValue('isHalfDay', false);
                        formik.setFieldValue('halfDaySession', '');
                      }
                    }}
                    required
                    styleClasses={fieldStyleClasses}
                  />

                  {showHalfDayControls ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="isHalfDay"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={formik.values.isHalfDay}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          formik.setFieldValue('isHalfDay', checked);
                          formik.setFieldValue('halfDaySession', '');
                          if (checked && formik.values.fromDate) {
                            formik.setFieldValue(
                              'toDate',
                              formik.values.fromDate
                            );
                          }
                        }}
                      />
                      <Label htmlFor="isHalfDay" className="font-normal">
                        Half day
                      </Label>
                    </div>
                  ) : null}

                  {formik.values.isHalfDay && showHalfDayControls ? (
                    <>
                      <CustomDatePickerField
                        id="fromDate"
                        placeholder="Leave Date"
                        value={formik.values.fromDate}
                        onChange={(date) => {
                          formik.setFieldValue('fromDate', date ?? null);
                          formik.setFieldValue('toDate', date ?? null);
                        }}
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                        error={formik.errors.fromDate as string | undefined}
                        touched={formik.touched.fromDate}
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 5}
                      />

                      <CustomSelectField
                        id="halfDaySession"
                        placeholder="Session"
                        label="Morning / Afternoon"
                        options={HALF_DAY_SESSION_OPTIONS}
                        value={formik.values.halfDaySession}
                        onChange={(value) =>
                          formik.setFieldValue('halfDaySession', value)
                        }
                        required
                        styleClasses={fieldStyleClasses}
                      />
                      {formik.touched.halfDaySession &&
                      formik.errors.halfDaySession ? (
                        <p className="text-xs text-destructive">
                          {formik.errors.halfDaySession}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <CustomDatePickerField
                        id="fromDate"
                        placeholder="From Date"
                        value={formik.values.fromDate}
                        onChange={(date) =>
                          formik.setFieldValue('fromDate', date ?? null)
                        }
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                        error={formik.errors.fromDate as string | undefined}
                        touched={formik.touched.fromDate}
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 5}
                      />

                      <CustomDatePickerField
                        id="toDate"
                        placeholder="To Date"
                        value={formik.values.toDate}
                        onChange={(date) =>
                          formik.setFieldValue('toDate', date ?? null)
                        }
                        onBlur={formik.handleBlur}
                        required
                        styleClasses={fieldStyleClasses}
                        error={formik.errors.toDate as string | undefined}
                        touched={formik.touched.toDate}
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 5}
                      />
                    </>
                  )}

                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <span className="font-medium">Days: </span>
                    <span className="tabular-nums text-muted-foreground">
                      {daysPreview.label}
                    </span>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={async () => {
                        if (
                          !formik.values.staffId ||
                          !formik.values.leaveTypeId ||
                          !formik.values.fromDate ||
                          (!formik.values.isHalfDay && !formik.values.toDate)
                        ) {
                          toast({
                            variant: 'destructive',
                            title: 'Missing details',
                            description:
                              'Select staff, leave type, and dates before recalculating.'
                          });
                          return;
                        }

                        const result =
                          await getLeaveApplicationBalanceSnapshotAction({
                            staffId: formik.values.staffId,
                            leaveTypeId: formik.values.leaveTypeId,
                            fromDate: formik.values.fromDate,
                            toDate:
                              effectiveToDate ?? formik.values.fromDate
                          });

                        if (result.isError || !result.data) {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description:
                              result.errors?.message ??
                              'Unable to recalculate balance.'
                          });
                          return;
                        }

                        setBalance(result.data);
                      }}
                    >
                      <CirclePlay className="h-4 w-4" />
                      Recalculate
                    </Button>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Entitle
                        </p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums">
                          {balance.entitle.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Utilized
                        </p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-orange-600">
                          {balance.utilized.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Balance
                        </p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
                          {balance.balance.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        if (!formik.values.fromDate || !effectiveToDate) {
                          toast({
                            variant: 'destructive',
                            title: 'Missing dates',
                            description:
                              'Set leave date(s) before processing shifts.'
                          });
                          return;
                        }
                        const sessionLabel = formatHalfDaySessionLabel(
                          formik.values.halfDaySession
                        );
                        setShiftRows([
                          {
                            id: '1',
                            shift: formik.values.isHalfDay
                              ? `Half day${sessionLabel ? ` (${sessionLabel})` : ''}`
                              : 'Leave day',
                            from: format(
                              formik.values.fromDate,
                              'EEE MMM d HH:mm'
                            ),
                            to: format(effectiveToDate, 'EEE MMM d HH:mm'),
                            shiftDate: formik.values.fromDate
                          }
                        ]);
                      }}
                    >
                      <CirclePlay className="h-4 w-4" />
                      Process Shift
                    </Button>
                    <div className="overflow-hidden rounded-md border border-border bg-background">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Shift</th>
                            <th className="px-2 py-1.5 font-medium">From</th>
                            <th className="px-2 py-1.5 font-medium">To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-2 py-3 text-center text-muted-foreground"
                              >
                                No shifts processed
                              </td>
                            </tr>
                          ) : (
                            shiftRows.map((row) => (
                              <tr
                                key={row.id}
                                className="border-t border-border"
                              >
                                <td className="whitespace-nowrap px-2 py-1.5">
                                  {row.shift}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                  {row.from}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                  {row.to}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        toast({
                          title: 'Coming soon',
                          description:
                            'Process Lieu Shift will wire when shift masters land.'
                        });
                      }}
                    >
                      <CirclePlay className="h-4 w-4" />
                      Process Lieu Shift
                    </Button>
                    <div className={fieldStyleClasses.parentDiv}>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Select Staff Shift"
                          options={shiftOptions}
                          value={formik.values.lieuShiftId}
                          defaultValue=""
                          clearable
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('lieuShiftId', value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <CustomDatePickerField
                    id="requestedDate"
                    placeholder="Requested Date"
                    value={formik.values.requestedDate}
                    onChange={(date) =>
                      formik.setFieldValue('requestedDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 5}
                  />

                  <div className={fieldStyleClasses.parentDiv}>
                    <Label className={fieldStyleClasses.labelClassName}>
                      Leave Approved Person
                    </Label>
                    <div className={fieldStyleClasses.inputClassName}>
                      <Combobox
                        label="Search approver"
                        options={approverOptions}
                        value={formik.values.approverId}
                        defaultValue=""
                        clearable
                        triggerClassName="w-full max-w-none font-normal!"
                        popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                        onChange={(value) =>
                          formik.setFieldValue('approverId', value)
                        }
                      />
                    </div>
                  </div>

                  <CustomDatePickerField
                    id="approvedDate"
                    placeholder="Leave Approved Date"
                    value={formik.values.approvedDate}
                    onChange={(date) =>
                      formik.setFieldValue('approvedDate', date ?? null)
                    }
                    onBlur={formik.handleBlur}
                    required={false}
                    disabled
                    styleClasses={fieldStyleClasses}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 5}
                  />

                  <CustomFormField
                    type="textarea"
                    id="comment"
                    placeholder="Comment"
                    value={formik.values.comment}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {canSave ? (
                      <Button
                        type="submit"
                        className="h-9 gap-1.5"
                        disabled={loading}
                      >
                        <SaveIcon className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-1.5"
                      onClick={() => {
                        formik.resetForm({ values: emptyValues });
                        setBalance(emptyBalance);
                        setShiftRows([]);
                        onClearSelection?.();
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <RadioGroup
                      value={formik.values.outWithCancel ? 'yes' : ''}
                      onValueChange={() => undefined}
                      className="flex items-center"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem
                          value="yes"
                          id="with-out-cancel"
                          onClick={(event) => {
                            event.preventDefault();
                            formik.setFieldValue(
                              'outWithCancel',
                              !formik.values.outWithCancel
                            );
                          }}
                        />
                        <Label
                          htmlFor="with-out-cancel"
                          className="cursor-pointer font-normal"
                          onClick={(event) => {
                            event.preventDefault();
                            formik.setFieldValue(
                              'outWithCancel',
                              !formik.values.outWithCancel
                            );
                          }}
                        >
                          With Out Cancel
                        </Label>
                      </div>
                    </RadioGroup>
                    {canDelete && isEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={loading || deleting}
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="shrink-0 font-semibold text-foreground">
                        Created by:
                      </span>
                      <span className="text-muted-foreground">
                        {formatAuditLine(auditCreated)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="shrink-0 font-semibold text-foreground">
                        Last updated:
                      </span>
                      <span className="text-muted-foreground">
                        {formatAuditLine(auditUpdated)}
                      </span>
                    </div>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="relative rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <Plane className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {staffBalance.total}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Used
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {staffBalance.used}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-2 py-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {staffBalance.remaining}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Utilisation</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {utilisationPercent}%
              </span>
            </div>
            <Progress value={utilisationPercent} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={deleting}
        title="Delete leave application?"
        description="This will permanently remove the selected leave application."
        handleContinue={handleDelete}
      />
    </div>
  );
}
