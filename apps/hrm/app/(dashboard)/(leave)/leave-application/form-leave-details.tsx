'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Formik,
  Form,
  useFormikContext,
  type FormikHelpers
} from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import {
  CirclePlay,
  Info,
  Plane,
  RefreshCw,
  RotateCcw,
  SaveIcon,
  Trash2,
  XIcon
} from 'lucide-react';
import {
  Badge,
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
import { cn } from '@/lib/utils';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  createLeaveApplicationAction,
  deleteLeaveApplicationAction,
  getLeaveApplicationBalanceSnapshotAction,
  processLeaveApplicationLieuShiftsAction,
  processLeaveApplicationShiftsAction,
  updateLeaveApplicationAction
} from '@/app/actions/leave-actions/leave-application.actions';
import { getLeaveEntitlementBalanceAction } from '@/app/actions/leave-actions/leave-entitlement.actions';
import { formatAuditLine } from '@/lib/helpers/format-audit-line.helper';
import {
  computeLeaveApplicationDays,
  formatHalfDaySessionLabel
} from '@/lib/helpers/leave-application-days.helper';
import {
  leaveApplicationFormValuesToPayload,
  leaveApplicationRecordToFormValues
} from '@/lib/mappers/leave-application-form.mapper';
import {
  LEAVE_HALF_DAY_SESSION_OPTIONS,
  LIEU_SOURCE_LOOKBACK_DAYS,
  type LeaveApplicationFormValues,
  type LeaveApplicationRecord,
  type LeaveApplicationShiftRow,
  type LeaveEntitlementBalanceLeaveType
} from '@/types/leave';

export type LeaveTypeFormOption = {
  id: string;
  name: string;
  allowHalfDay?: boolean;
  isLieuLeave?: boolean;
  requiresApproval?: boolean;
};

type FilterOption = {
  id: string;
  name: string;
};

type LeaveBalanceSnapshot = {
  entitle: number;
  utilized: number;
  balance: number;
  pendingReserved: number;
  available: number;
  hasEntitlement: boolean;
};

type ShiftRow = {
  id: string;
  shift: string;
  department?: string;
  from: string;
  to: string;
  fromAt?: Date;
  toAt?: Date;
  shiftDate?: Date;
  allocationId?: string;
};

function dutyRosterHref(input: {
  staffId?: string;
  shiftDate?: Date;
  allocationId?: string;
}): string | null {
  if (!input.allocationId?.trim() || !input.shiftDate) return null;
  const dutyDate = input.shiftDate.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    dutyDate,
    allocationId: input.allocationId.trim()
  });
  if (input.staffId?.trim()) params.set('staffId', input.staffId.trim());
  return `/duty-roster?${params.toString()}`;
}

type AuditInfo = {
  name: string;
  position?: string | null;
  at: Date | string | null;
};

type FormLeaveDetailsProps = {
  staffOptions?: FilterOption[];
  leaveTypeOptions?: LeaveTypeFormOption[];
  shiftOptions?: FilterOption[];
  selectedRecord?: LeaveApplicationRecord | null;
  onClearSelection?: () => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

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
  balance: 0,
  pendingReserved: 0,
  available: 0,
  hasEntitlement: false
};

/** Stable defaults — inline `= []` would create a new array every render and loop effects. */
const EMPTY_FILTER_OPTIONS: FilterOption[] = [];
const EMPTY_LEAVE_TYPE_OPTIONS: LeaveTypeFormOption[] = [];

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

function resolveLeaveRange(values: LeaveApplicationFormValues): {
  fromDate: Date | null;
  toDate: Date | null;
} {
  const fromDate = values.fromDate ?? null;
  if (!fromDate) {
    return { fromDate: null, toDate: null };
  }
  const toDate = values.isHalfDay
    ? values.fromDate
    : values.toDate ?? values.fromDate;
  return { fromDate, toDate: toDate ?? null };
}

/** Keeps a mutable ref of form values for controls outside Formik (e.g. Recalculate). */
function FormValuesRefSync({
  valuesRef
}: {
  valuesRef: MutableRefObject<LeaveApplicationFormValues | null>;
}) {
  const { values } = useFormikContext<LeaveApplicationFormValues>();
  useEffect(() => {
    valuesRef.current = values;
  }, [values, valuesRef]);
  return null;
}

/** Keeps staff entitlement notice in sync with staff + leave date range. */
function StaffEntitlementBalanceSync({
  loadStaffBalance,
  clearStaffBalance
}: {
  loadStaffBalance: (
    staffId: string,
    range?: { fromDate?: Date | null; toDate?: Date | null }
  ) => Promise<void>;
  clearStaffBalance: () => void;
}) {
  const { values } = useFormikContext<LeaveApplicationFormValues>();
  const staffId = values.staffId;
  const { fromDate, toDate } = resolveLeaveRange(values);
  const fromKey = fromDate ? fromDate.getTime() : null;
  const toKey = toDate ? toDate.getTime() : null;

  useEffect(() => {
    if (!staffId) {
      clearStaffBalance();
      return;
    }
    void loadStaffBalance(staffId, { fromDate, toDate });
  }, [staffId, fromKey, toKey, loadStaffBalance, clearStaffBalance]);

  return null;
}

/** Keeps Entitle / Utilized / Balance in sync with staff, leave type, and dates. */
function LeaveBalanceSnapshotSync({
  loadLeaveBalance,
  clearLeaveBalance,
  excludeApplicationId
}: {
  loadLeaveBalance: (params: {
    staffId: string;
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    excludeApplicationId?: string;
  }) => Promise<void>;
  clearLeaveBalance: () => void;
  excludeApplicationId?: string;
}) {
  const { values } = useFormikContext<LeaveApplicationFormValues>();
  const staffId = values.staffId;
  const leaveTypeId = values.leaveTypeId;
  const { fromDate, toDate } = resolveLeaveRange(values);
  const fromKey = fromDate ? fromDate.getTime() : null;
  const toKey = toDate ? toDate.getTime() : null;

  useEffect(() => {
    if (!staffId || !leaveTypeId || !fromDate || !toDate) {
      clearLeaveBalance();
      return;
    }
    void loadLeaveBalance({
      staffId,
      leaveTypeId,
      fromDate,
      toDate,
      excludeApplicationId
    });
  }, [
    staffId,
    leaveTypeId,
    fromKey,
    toKey,
    excludeApplicationId,
    loadLeaveBalance,
    clearLeaveBalance
  ]);

  return null;
}

export default function FormLeaveDetails({
  staffOptions = EMPTY_FILTER_OPTIONS,
  leaveTypeOptions = EMPTY_LEAVE_TYPE_OPTIONS,
  shiftOptions = EMPTY_FILTER_OPTIONS,
  selectedRecord = null,
  onClearSelection
}: FormLeaveDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has, canAccess } = usePermissions();
  const canOpenDutyRoster = canAccess('/duty-roster');
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [softWarnOpen, setSoftWarnOpen] = useState(false);
  const [softWarnMessage, setSoftWarnMessage] = useState('');
  const softWarnAckRef = useRef(false);
  const pendingSubmitRef = useRef<{
    values: LeaveApplicationFormValues;
    helpers: FormikHelpers<LeaveApplicationFormValues>;
  } | null>(null);
  const [balance, setBalance] = useState<LeaveBalanceSnapshot>(emptyBalance);
  const [shiftRows, setShiftRows] = useState<ShiftRow[]>([]);
  const [processingShifts, setProcessingShifts] = useState(false);
  const [lieuOptions, setLieuOptions] = useState<FilterOption[]>(shiftOptions);
  const [processingLieu, setProcessingLieu] = useState(false);
  const [staffBalance, setStaffBalance] = useState({
    total: 0,
    used: 0,
    remaining: 0,
    leaveTypes: [] as LeaveEntitlementBalanceLeaveType[]
  });
  const [staffBalanceLoading, setStaffBalanceLoading] = useState(false);
  const [recalculatingBalance, setRecalculatingBalance] = useState(false);
  const formValuesRef = useRef<LeaveApplicationFormValues | null>(null);

  const isEdit = Boolean(selectedRecord?.id);
  const isReadOnly = Boolean(
    selectedRecord?.id && selectedRecord.status !== 'pending'
  );
  const canSave =
    !isReadOnly &&
    (isEdit
      ? has('leave-application', 'edit')
      : has('leave-application', 'add'));
  const canDelete =
    has('leave-application', 'delete') &&
    Boolean(selectedRecord?.id) &&
    (selectedRecord?.status === 'pending' ||
      selectedRecord?.status === 'rejected' ||
      selectedRecord?.status === 'cancelled');

  const formInitialValues = useMemo(
    () =>
      selectedRecord
        ? leaveApplicationRecordToFormValues(selectedRecord)
        : emptyValues,
    [selectedRecord]
  );

  const leaveTypeAllowHalfDay = useMemo(() => {
    const map = new Map(
      leaveTypeOptions.map((opt) => [opt.id, Boolean(opt.allowHalfDay)])
    );
    return map;
  }, [leaveTypeOptions]);

  const leaveTypeIsLieu = useMemo(() => {
    const map = new Map(
      leaveTypeOptions.map((opt) => [opt.id, Boolean(opt.isLieuLeave)])
    );
    return map;
  }, [leaveTypeOptions]);

  const leaveTypeRequiresApproval = useMemo(() => {
    const map = new Map(
      leaveTypeOptions.map((opt) => [
        opt.id,
        opt.requiresApproval !== false
      ])
    );
    return map;
  }, [leaveTypeOptions]);

  const clearStaffBalance = useCallback(() => {
    setStaffBalance((prev) => {
      if (
        prev.total === 0 &&
        prev.used === 0 &&
        prev.remaining === 0 &&
        prev.leaveTypes.length === 0
      ) {
        return prev;
      }
      return {
        total: 0,
        used: 0,
        remaining: 0,
        leaveTypes: []
      };
    });
  }, []);

  const clearLeaveBalance = useCallback(() => {
    setBalance((prev) => {
      if (
        prev.entitle === 0 &&
        prev.utilized === 0 &&
        prev.balance === 0 &&
        prev.pendingReserved === 0 &&
        prev.available === 0 &&
        !prev.hasEntitlement
      ) {
        return prev;
      }
      return emptyBalance;
    });
  }, []);

  const loadStaffBalance = useCallback(
    async (
      staffId: string,
      range?: { fromDate?: Date | null; toDate?: Date | null }
    ) => {
      setStaffBalanceLoading(true);
      try {
        const result = await getLeaveEntitlementBalanceAction(staffId, range);
        if (result.isError || !result.data) {
          clearStaffBalance();
          return;
        }
        setStaffBalance({
          total: result.data.totalEntitlement,
          used: result.data.used,
          remaining: result.data.remaining,
          leaveTypes: result.data.leaveTypes ?? []
        });
      } finally {
        setStaffBalanceLoading(false);
      }
    },
    [clearStaffBalance]
  );

  const loadLeaveBalance = useCallback(
    async (params: {
      staffId: string;
      leaveTypeId: string;
      fromDate: Date;
      toDate: Date;
      excludeApplicationId?: string;
    }) => {
      const result = await getLeaveApplicationBalanceSnapshotAction(params);
      if (result.isError || !result.data) {
        clearLeaveBalance();
        return;
      }
      setBalance({
        entitle: result.data.entitle,
        utilized: result.data.utilized,
        balance: result.data.balance,
        pendingReserved: result.data.pendingReserved ?? 0,
        available: result.data.available ?? result.data.balance,
        hasEntitlement: Boolean(result.data.hasEntitlement)
      });
    },
    [clearLeaveBalance]
  );

  const handleRecalculateBalances = useCallback(async () => {
    const values = formValuesRef.current;
    if (!values?.staffId) {
      toast({
        variant: 'destructive',
        title: 'Select staff first',
        description: 'Choose a staff member before recalculating leave balance.'
      });
      return;
    }

    setRecalculatingBalance(true);
    try {
      const { fromDate, toDate } = resolveLeaveRange(values);
      await loadStaffBalance(values.staffId, { fromDate, toDate });

      if (values.leaveTypeId && fromDate && toDate) {
        await loadLeaveBalance({
          staffId: values.staffId,
          leaveTypeId: values.leaveTypeId,
          fromDate,
          toDate,
          excludeApplicationId: selectedRecord?.id
        });
      } else {
        clearLeaveBalance();
      }

      toast({
        variant: 'success',
        title: 'Balance recalculated',
        description:
          'Leave balance refreshed from live entitlements. Days still follow the leave dates on the form.'
      });
    } finally {
      setRecalculatingBalance(false);
    }
  }, [
    clearLeaveBalance,
    loadLeaveBalance,
    loadStaffBalance,
    selectedRecord?.id,
    toast
  ]);

  useEffect(() => {
    if (selectedRecord) {
      const snapshotBalance = Number(selectedRecord.balanceSnapshot ?? 0);
      setBalance({
        entitle: Number(selectedRecord.entitleSnapshot ?? 0),
        utilized: Number(selectedRecord.utilizedSnapshot ?? 0),
        balance: snapshotBalance,
        pendingReserved: 0,
        available: snapshotBalance,
        hasEntitlement:
          snapshotBalance > 0 ||
          Number(selectedRecord.entitleSnapshot ?? 0) > 0
      });
      setShiftRows(
        (selectedRecord.shifts ?? []).map((shift, index) => {
          const fromAt = new Date(shift.from);
          const toAt = new Date(shift.to);
          const allocationId = shift.allocationId?.trim() || undefined;
          return {
            id: allocationId || String(index),
            shift: shift.shiftLabel,
            department: shift.department?.trim() || undefined,
            from: format(fromAt, 'EEE MMM d HH:mm'),
            to: format(toAt, 'EEE MMM d HH:mm'),
            fromAt,
            toAt,
            shiftDate: shift.shiftDate ? new Date(shift.shiftDate) : undefined,
            allocationId
          };
        })
      );
      const lieuId = selectedRecord.lieuShiftId?.trim();
      const lieuLabel = selectedRecord.lieuShiftLabel?.trim();
      if (lieuId && lieuLabel) {
        setLieuOptions([{ id: lieuId, name: lieuLabel }]);
      } else {
        setLieuOptions(shiftOptions);
      }
      return;
    }

    setBalance((prev) =>
      prev === emptyBalance ||
      (prev.entitle === 0 &&
        prev.utilized === 0 &&
        prev.balance === 0 &&
        prev.pendingReserved === 0 &&
        prev.available === 0 &&
        !prev.hasEntitlement)
        ? prev
        : emptyBalance
    );
    setShiftRows((prev) => (prev.length === 0 ? prev : []));
    setLieuOptions((prev) => (prev === shiftOptions ? prev : shiftOptions));
  }, [selectedRecord, shiftOptions]);

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
    helpers: FormikHelpers<LeaveApplicationFormValues>
  ) => {
    if (isReadOnly) return;
    const { setErrors, setTouched, resetForm } = helpers;

    const requestDays = previewLeaveDays(
      values,
      Boolean(leaveTypeAllowHalfDay.get(values.leaveTypeId))
    ).days;
    if (
      !balance.hasEntitlement ||
      (requestDays > 0 && requestDays > balance.available)
    ) {
      toast({
        variant: 'destructive',
        title: 'Insufficient leave balance',
        description: !balance.hasEntitlement
          ? 'No leave entitlement covers this leave type and date range.'
          : `Requested ${requestDays} day(s) exceeds available balance (${balance.available.toFixed(1)}).`
      });
      return;
    }

    try {
      setLoading(true);
      const shifts: LeaveApplicationShiftRow[] = shiftRows.map((row) => ({
        shiftLabel: row.shift,
        from: row.fromAt ?? (values.fromDate as Date),
        to: row.toAt ?? (values.toDate as Date),
        shiftDate: row.shiftDate ?? values.fromDate,
        department: row.department?.trim() || null,
        allocationId: row.allocationId?.trim() || null
      }));

      const lieuLabel =
        lieuOptions.find((opt) => opt.id === values.lieuShiftId)?.name ??
        shiftOptions.find((opt) => opt.id === values.lieuShiftId)?.name ??
        null;

      const payload = leaveApplicationFormValuesToPayload(values, {
        lieuShiftLabel: lieuLabel,
        entitleSnapshot: balance.entitle,
        utilizedSnapshot: balance.utilized,
        balanceSnapshot: balance.available,
        shifts,
        ...(softWarnAckRef.current ? { acknowledgedWarnings: true } : {})
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
        const errorMap = respond.errors as Record<string, unknown>;
        if (errorMap.requiresAck) {
          const warnings = Array.isArray(errorMap.softWarnings)
            ? (errorMap.softWarnings as string[])
            : [];
          pendingSubmitRef.current = { values, helpers };
          setSoftWarnMessage(
            warnings[0] ||
              (typeof errorMap.message === 'string'
                ? errorMap.message
                : 'Published duties overlap this leave. Continue anyway?')
          );
          setSoftWarnOpen(true);
          return;
        }

        softWarnAckRef.current = false;
        const fieldErrors: Record<string, string> = {};

        Object.keys(errorMap).forEach((key) => {
          if (
            key === 'message' ||
            key === 'requiresAck' ||
            key === 'softWarnings'
          ) {
            return;
          }
          const err = errorMap[key];
          const msg =
            Array.isArray(err) && err.length > 0
              ? String(err[0])
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
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : null) ?? 'Leave application save unsuccessful.'
        });
        return;
      }

      softWarnAckRef.current = false;
      pendingSubmitRef.current = null;
      const autoApproved = Boolean(
        (respond as { data?: { autoApproved?: boolean } })?.data?.autoApproved
      );
      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? 'Leave application updated successfully.'
          : autoApproved
            ? 'Leave application created and auto-approved.'
            : 'Leave application created successfully.'
      });

      resetForm({ values: emptyValues });
      setBalance(emptyBalance);
      setShiftRows([]);
      setLieuOptions(shiftOptions);
      onClearSelection?.();
      router.refresh();
    } catch (error: unknown) {
      softWarnAckRef.current = false;
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

  const handleSoftWarnContinue = async () => {
    const pending = pendingSubmitRef.current;
    setSoftWarnOpen(false);
    if (!pending) return;
    softWarnAckRef.current = true;
    await handleSubmit(pending.values, pending.helpers);
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
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg font-semibold">
                {isReadOnly ? 'Leave Application' : 'Leave Form Details'}
              </CardTitle>
              {isReadOnly && selectedRecord?.status ? (
                <Badge
                  variant="secondary"
                  className="capitalize"
                >
                  {selectedRecord.status}
                </Badge>
              ) : null}
            </div>
            {isEdit ? (
              <Button
                type="button"
                size="sm"
                className={cn('gap-1.5', buttonStyles.save)}
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
              const leaveRange = resolveLeaveRange(formik.values);
              const hasLeaveDates = Boolean(leaveRange.fromDate);
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
              const hasBalanceContext = Boolean(
                formik.values.staffId &&
                  formik.values.leaveTypeId &&
                  leaveRange.fromDate &&
                  leaveRange.toDate
              );
              const noCoveringEntitlement =
                hasBalanceContext && !balance.hasEntitlement;
              const projectedRemaining = balance.available - daysPreview.days;
              const exceedsBalance =
                !isReadOnly &&
                hasBalanceContext &&
                balance.hasEntitlement &&
                daysPreview.days > 0 &&
                projectedRemaining < 0;
              const canSubmit =
                canSave &&
                !(hasBalanceContext && (noCoveringEntitlement || exceedsBalance));

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

                  <FormValuesRefSync valuesRef={formValuesRef} />
                  <StaffEntitlementBalanceSync
                    loadStaffBalance={loadStaffBalance}
                    clearStaffBalance={clearStaffBalance}
                  />
                  <LeaveBalanceSnapshotSync
                    loadLeaveBalance={loadLeaveBalance}
                    clearLeaveBalance={clearLeaveBalance}
                    excludeApplicationId={selectedRecord?.id}
                  />

                  {formik.values.staffId ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
                      <div className="mb-2 flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            Staff leave entitlements
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hasLeaveDates
                              ? 'Leave types and balances for entitlement periods that cover the selected leave dates.'
                              : 'All active leave entitlements for the selected staff. Choose leave dates to filter by period.'}
                          </p>
                        </div>
                      </div>

                      {staffBalanceLoading ? (
                        <p className="text-xs text-muted-foreground">
                          Loading entitlements…
                        </p>
                      ) : staffBalance.leaveTypes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {hasLeaveDates
                            ? 'No leave entitlements cover the selected date range for this staff member.'
                            : 'No active leave entitlements found for this staff member.'}
                        </p>
                      ) : (
                        <div className="overflow-hidden rounded-md border border-border bg-background">
                          <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Leave Type</span>
                            <span className="text-right">Entitled</span>
                            <span className="text-right">Used</span>
                            <span className="text-right">Remaining</span>
                          </div>
                          <ul className="divide-y divide-border">
                            {staffBalance.leaveTypes.map((row) => (
                              <li
                                key={`${row.leaveTypeId}-${row.leaveTypeName}`}
                                className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] gap-2 px-2.5 py-1.5 text-xs"
                              >
                                <span className="truncate font-medium text-foreground">
                                  {row.leaveTypeName}
                                </span>
                                <span className="text-right tabular-nums text-muted-foreground">
                                  {row.entitled}
                                </span>
                                <span className="text-right tabular-nums text-muted-foreground">
                                  {row.used}
                                </span>
                                <span className="text-right font-semibold tabular-nums text-foreground">
                                  {row.remaining}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}

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
                    disabled={isReadOnly}
                    styleClasses={fieldStyleClasses}
                  />
                  {formik.values.leaveTypeId &&
                  leaveTypeRequiresApproval.get(formik.values.leaveTypeId) ===
                    false &&
                  !isEdit ? (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      This leave type does not require approval — saving will
                      approve immediately and deduct entitlement.
                    </p>
                  ) : null}

                  {showHalfDayControls ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="isHalfDay"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={formik.values.isHalfDay}
                        disabled={isReadOnly}
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
                        disabled={isReadOnly}
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
                        options={[...LEAVE_HALF_DAY_SESSION_OPTIONS]}
                        value={formik.values.halfDaySession}
                        onChange={(value) =>
                          formik.setFieldValue('halfDaySession', value)
                        }
                        required
                        disabled={isReadOnly}
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
                        disabled={isReadOnly}
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
                        disabled={isReadOnly}
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

                  <div
                    className={cn(
                      'space-y-3 rounded-lg border bg-muted/30 p-3',
                      exceedsBalance || noCoveringEntitlement
                        ? 'border-destructive/50'
                        : 'border-border'
                    )}
                  >
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
                          Available
                        </p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
                          {balance.available.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    {balance.pendingReserved > 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        Ledger remaining {balance.balance.toFixed(1)};{' '}
                        {balance.pendingReserved.toFixed(1)} reserved by other
                        pending applications.
                      </p>
                    ) : null}
                    {noCoveringEntitlement ? (
                      <p className="text-[11px] font-medium text-destructive">
                        No leave entitlement covers this leave type and date
                        range. Save is blocked.
                      </p>
                    ) : exceedsBalance ? (
                      <p className="text-[11px] font-medium text-destructive">
                        Requested {daysPreview.days} day(s) exceeds available
                        balance ({balance.available.toFixed(1)}). Save is
                        blocked.
                      </p>
                    ) : (
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Available = entitlement remaining minus other pending
                        requests for the same period. You cannot submit more
                        than available.
                        {!isReadOnly && daysPreview.days > 0 ? (
                          <>
                            {' '}
                            After this request:{' '}
                            <span
                              className={cn(
                                'font-medium tabular-nums',
                                projectedRemaining < 0
                                  ? 'text-destructive'
                                  : 'text-foreground'
                              )}
                            >
                              {projectedRemaining.toFixed(1)}
                            </span>{' '}
                            remaining.
                          </>
                        ) : null}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    {!isReadOnly ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        disabled={processingShifts}
                        onClick={async () => {
                          if (!formik.values.staffId) {
                            toast({
                              variant: 'destructive',
                              title: 'Missing staff',
                              description:
                                'Select staff before processing shifts.'
                            });
                            return;
                          }
                          if (!formik.values.fromDate || !effectiveToDate) {
                            toast({
                              variant: 'destructive',
                              title: 'Missing dates',
                              description:
                                'Set leave date(s) before processing shifts.'
                            });
                            return;
                          }
                          if (
                            formik.values.isHalfDay &&
                            !formik.values.halfDaySession
                          ) {
                            toast({
                              variant: 'destructive',
                              title: 'Missing session',
                              description:
                                'Select Morning or Afternoon before processing half-day shifts.'
                            });
                            return;
                          }

                          setProcessingShifts(true);
                          try {
                            const result =
                              await processLeaveApplicationShiftsAction({
                                staffId: formik.values.staffId,
                                fromDate: formik.values.fromDate,
                                toDate: effectiveToDate,
                                isHalfDay: formik.values.isHalfDay,
                                halfDaySession: formik.values.halfDaySession
                              });

                            if (result.isError || !result.data) {
                              toast({
                                variant: 'destructive',
                                title: 'Process Shift failed',
                                description:
                                  result.errors?.message ??
                                  'Could not load published duties.'
                              });
                              return;
                            }

                            const nextRows: ShiftRow[] = result.data.map(
                              (duty, index) => {
                                const fromAt = new Date(duty.from);
                                const toAt = new Date(duty.to);
                                return {
                                  id: duty.allocationId || String(index),
                                  shift: duty.shiftLabel,
                                  department: duty.department?.trim() || undefined,
                                  from: format(fromAt, 'EEE MMM d HH:mm'),
                                  to: format(toAt, 'EEE MMM d HH:mm'),
                                  fromAt,
                                  toAt,
                                  shiftDate: new Date(duty.shiftDate),
                                  allocationId: duty.allocationId
                                };
                              }
                            );
                            setShiftRows(nextRows);

                            if (nextRows.length === 0) {
                              toast({
                                title: 'No published duties',
                                description:
                                  'No published or amended roster duties for this staff in the leave period.'
                              });
                            } else {
                              toast({
                                title: 'Shifts processed',
                                description: `Loaded ${nextRows.length} published duty(ies). Save the leave form to keep this snapshot.`
                              });
                            }
                          } finally {
                            setProcessingShifts(false);
                          }
                        }}
                      >
                        <CirclePlay className="h-4 w-4" />
                        {processingShifts ? 'Processing…' : 'Process Shift'}
                      </Button>
                    ) : null}
                    <div className="max-h-48 overflow-auto rounded-md border border-border bg-background">
                      <table className="w-full min-w-max text-left text-xs">
                        <thead className="sticky top-0 bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Shift</th>
                            <th className="px-2 py-1.5 font-medium">Dept</th>
                            <th className="px-2 py-1.5 font-medium">From</th>
                            <th className="px-2 py-1.5 font-medium">To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-2 py-3 text-center text-muted-foreground"
                              >
                                No shifts processed
                              </td>
                            </tr>
                          ) : (
                            shiftRows.map((row) => {
                              const href = canOpenDutyRoster
                                ? dutyRosterHref({
                                    staffId: formik.values.staffId,
                                    shiftDate: row.shiftDate,
                                    allocationId: row.allocationId
                                  })
                                : null;
                              return (
                                <tr
                                  key={row.id}
                                  className="border-t border-border"
                                >
                                  <td className="whitespace-nowrap px-2 py-1.5">
                                    {href ? (
                                      <Link
                                        href={href}
                                        className="font-medium text-primary hover:underline"
                                        title="Open on Duty Roster"
                                      >
                                        {row.shift}
                                      </Link>
                                    ) : (
                                      row.shift
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                    {row.department || '—'}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                    {row.from}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                                    {row.to}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    {formik.values.leaveTypeId &&
                    !leaveTypeIsLieu.get(formik.values.leaveTypeId) ? (
                      <p className="text-xs text-muted-foreground">
                        Select a Lieu leave type to use Process Lieu Shift.
                      </p>
                    ) : null}
                    {!isReadOnly ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        disabled={
                          processingLieu ||
                          Boolean(
                            formik.values.leaveTypeId &&
                              !leaveTypeIsLieu.get(formik.values.leaveTypeId)
                          )
                        }
                        onClick={async () => {
                          if (!formik.values.staffId) {
                            toast({
                              variant: 'destructive',
                              title: 'Missing staff',
                              description:
                                'Select staff before processing lieu shifts.'
                            });
                            return;
                          }
                          if (!formik.values.fromDate) {
                            toast({
                              variant: 'destructive',
                              title: 'Missing dates',
                              description:
                                'Set leave date(s) before processing lieu shifts.'
                            });
                            return;
                          }

                          setProcessingLieu(true);
                          try {
                            const result =
                              await processLeaveApplicationLieuShiftsAction({
                                staffId: formik.values.staffId,
                                fromDate: formik.values.fromDate,
                                excludeApplicationId: selectedRecord?.id
                              });

                            if (result.isError || !result.data) {
                              toast({
                                variant: 'destructive',
                                title: 'Process Lieu Shift failed',
                                description:
                                  result.errors?.message ??
                                  'Could not load lieu source duties.'
                              });
                              return;
                            }

                            const nextOptions: FilterOption[] = result.data.map(
                              (duty) => ({
                                id: duty.allocationId,
                                name: duty.optionLabel
                              })
                            );
                            setLieuOptions(nextOptions);

                            if (nextOptions.length === 0) {
                              formik.setFieldValue('lieuShiftId', '');
                              toast({
                                title: 'No lieu duties',
                                description: `No unused published duties with Grant Lieu Leave in the ${LIEU_SOURCE_LOOKBACK_DAYS} days before leave start.`
                              });
                              return;
                            }

                            if (nextOptions.length === 1) {
                              formik.setFieldValue(
                                'lieuShiftId',
                                nextOptions[0]!.id
                              );
                            } else if (
                              formik.values.lieuShiftId &&
                              !nextOptions.some(
                                (opt) => opt.id === formik.values.lieuShiftId
                              )
                            ) {
                              formik.setFieldValue('lieuShiftId', '');
                            }

                            toast({
                              title: 'Lieu shifts processed',
                              description:
                                nextOptions.length === 1
                                  ? 'One eligible duty found and selected. Save the leave form to keep it.'
                                  : `Loaded ${nextOptions.length} eligible duties. Select one, then Save.`
                            });
                          } finally {
                            setProcessingLieu(false);
                          }
                        }}
                      >
                        <CirclePlay className="h-4 w-4" />
                        {processingLieu ? 'Processing…' : 'Process Lieu Shift'}
                      </Button>
                    ) : null}
                    <div className={fieldStyleClasses.parentDiv}>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Select Staff Shift"
                          options={lieuOptions}
                          value={formik.values.lieuShiftId}
                          defaultValue=""
                          clearable
                          disabled={isReadOnly}
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
                    disabled
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
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {selectedRecord?.approverName?.trim()
                          ? selectedRecord.approverName
                          : formik.values.leaveTypeId &&
                              leaveTypeRequiresApproval.get(
                                formik.values.leaveTypeId
                              ) === false
                            ? 'Auto on save (approval not required)'
                            : '—'}
                      </div>
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
                    disabled={isReadOnly}
                    styleClasses={fieldStyleClasses}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {canSave ? (
                      <Button
                        type="submit"
                        className="h-9 gap-1.5"
                        disabled={loading || !canSubmit}
                        title={
                          !canSubmit
                            ? 'Resolve leave balance before saving'
                            : undefined
                        }
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
                        setLieuOptions(shiftOptions);
                        clearStaffBalance();
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
                          disabled={isReadOnly}
                          onClick={(event) => {
                            event.preventDefault();
                            if (isReadOnly) return;
                            formik.setFieldValue(
                              'outWithCancel',
                              !formik.values.outWithCancel
                            );
                          }}
                        />
                        <Label
                          htmlFor="with-out-cancel"
                          className={cn(
                            'font-normal',
                            isReadOnly
                              ? 'cursor-default text-muted-foreground'
                              : 'cursor-pointer'
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            if (isReadOnly) return;
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
                        size="sm"
                        className={cn('gap-1.5', buttonStyles.delete.warning)}
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
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">Leave Balance</CardTitle>
            <p className="text-xs text-muted-foreground">
              Auto-updates with staff and dates. Recalculate refreshes from live
              entitlements.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            disabled={recalculatingBalance || staffBalanceLoading}
            onClick={() => {
              void handleRecalculateBalances();
            }}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                recalculatingBalance ? 'animate-spin' : undefined
              )}
            />
            <span className="hidden sm:inline">
              {recalculatingBalance ? 'Recalculating…' : 'Recalculate'}
            </span>
          </Button>
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
        className={{
          actionButton: buttonStyles.delete.danger
        }}
      />

      <CustomAlertDialog
        open={softWarnOpen}
        handleVisibilityChange={(open) => {
          setSoftWarnOpen(open);
          if (!open) {
            softWarnAckRef.current = false;
            pendingSubmitRef.current = null;
          }
        }}
        loading={loading}
        title="Published duties overlap leave"
        description={softWarnMessage}
        handleContinue={handleSoftWarnContinue}
        className={{
          cancelButton: 'h-9',
          actionButton: 'h-9'
        }}
      />
    </div>
  );
}
