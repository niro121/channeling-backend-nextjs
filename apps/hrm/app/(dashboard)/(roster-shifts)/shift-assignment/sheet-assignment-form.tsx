'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import {
  Button,
  CustomDatePickerField,
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
import {
  shiftAssignmentFormValuesToBulkPayload,
  shiftAssignmentFormValuesToPayload,
  shiftAssignmentRecordToFormValues
} from '@/lib/mappers/shift-assignment-form.mapper';
import {
  bulkCreateShiftAssignmentsAction,
  createShiftAssignmentAction,
  getShiftAssignmentRosterScopeAction,
  getStaffManageRosterIdAction,
  updateShiftAssignmentAction
} from '@/app/actions/roster-actions/shift-assignment.actions';
import {
  SHIFT_ASSIGNMENT_ROTATION_PATTERNS,
  SHIFT_ASSIGNMENT_STATUS_OPTIONS,
  SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS,
  type RosterFilterOption,
  type ShiftAssignmentFormValues,
  type ShiftAssignmentRecord,
  type ShiftAssignmentRosterContext,
  type ShiftAssignmentStaffOption
} from '@/types/roster';
import type { ShiftAssignmentFormSheetMode } from './shift-assignment-ui-context';

type SheetAssignmentFormProps = {
  open: boolean;
  mode: ShiftAssignmentFormSheetMode;
  record: ShiftAssignmentRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
  rosterOptions: RosterFilterOption[];
  shiftTypeOptions: RosterFilterOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const emptyValues: ShiftAssignmentFormValues = {
  manageRosterId: '',
  staffId: '',
  shiftTypeId: '',
  rotationPatternId: 'fixed',
  effectiveFrom: null,
  effectiveTo: null,
  weeklyOffDayId: 'sunday',
  status: 'active',
  autoAssign: true
};

function sheetCopy(mode: ShiftAssignmentFormSheetMode) {
  if (mode === 'edit') {
    return {
      title: 'Edit Shift Assignment',
      description:
        'Update the record. All changes are captured in the audit trail.',
      saveLabel: 'Save Changes'
    };
  }
  if (mode === 'bulk') {
    return {
      title: 'Bulk Assign Shift',
      description:
        'Pick a roster group first, then apply one shift rule to selected staff in that group.',
      saveLabel: 'Save Assignment'
    };
  }
  return {
    title: 'Assign Shift',
    description:
      'Select a roster group, then assign a shift type to a staff member in that group.',
    saveLabel: 'Save Assignment'
  };
}

function applyFieldErrors(
  errorMap: Record<string, string | string[] | undefined> | undefined,
  setErrors: FormikHelpers<ShiftAssignmentFormValues>['setErrors'],
  setTouched: FormikHelpers<ShiftAssignmentFormValues>['setTouched']
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

function RosterContextCard({
  context,
  loading,
  selectedStaff,
  bulkEligibleCount,
  bulkSelectedCount,
  isBulk
}: {
  context: ShiftAssignmentRosterContext | null;
  loading: boolean;
  selectedStaff: ShiftAssignmentStaffOption | null;
  bulkEligibleCount: number;
  bulkSelectedCount: number;
  isBulk: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        Loading roster details…
      </div>
    );
  }

  if (!context) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
        Select a roster group to see department, institution, and the
        per-person daily shift limit.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-foreground">
          {context.name}{' '}
          <span className="font-normal text-muted-foreground">
            ({context.code})
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Limit {context.shiftsPerPersonPerDay}/person/day
        </p>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Department:</span>{' '}
          {context.departmentName}
        </p>
        <p>
          <span className="font-medium text-foreground">Institution:</span>{' '}
          {context.institutionName}
        </p>
      </div>
      {isBulk ? (
        <p className="text-xs text-muted-foreground">
          {bulkEligibleCount} of {bulkSelectedCount} selected staff belong to
          this roster and will receive the assignment.
        </p>
      ) : null}
      {selectedStaff ? (
        <div className="border-t border-border pt-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Staff:</span>{' '}
            {selectedStaff.code
              ? `${selectedStaff.code} — ${selectedStaff.staffName}`
              : selectedStaff.staffName}
          </p>
          <p>
            Active standing rules: {selectedStaff.activeAssignmentCount}
            {' · '}
            Day limit: {context.shiftsPerPersonPerDay}/day (enforced on
            allocate / publish)
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SheetAssignmentForm({
  open,
  mode,
  record,
  selectedCount,
  selectedStaffIds,
  rosterOptions,
  shiftTypeOptions,
  onOpenChange
}: SheetAssignmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [rosterContext, setRosterContext] =
    useState<ShiftAssignmentRosterContext | null>(null);
  const [staffOptions, setStaffOptions] = useState<
    ShiftAssignmentStaffOption[]
  >([]);
  const [editRosterReady, setEditRosterReady] = useState(mode !== 'edit');
  const [initialManageRosterId, setInitialManageRosterId] = useState(
    record?.manageRosterId ?? ''
  );
  const loadedRosterRef = useRef<string>('');
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';

  useEffect(() => {
    if (!open) return;

    if (mode !== 'edit' || !record) {
      setEditRosterReady(true);
      setInitialManageRosterId('');
      return;
    }

    if (record.manageRosterId) {
      setInitialManageRosterId(record.manageRosterId);
      setEditRosterReady(true);
      return;
    }

    let cancelled = false;
    setEditRosterReady(false);
    void getStaffManageRosterIdAction(record.staffId).then((result) => {
      if (cancelled) return;
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not resolve the staff roster group.'
        });
        setInitialManageRosterId('');
        setEditRosterReady(true);
        return;
      }
      setInitialManageRosterId(result.data ?? '');
      setEditRosterReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [mode, open, record, toast]);

  const validationSchema = useMemo(
    () =>
      Yup.object({
        manageRosterId: Yup.string().required('Roster group is required'),
        staffId: showStaff
          ? Yup.string().required('Staff member is required')
          : Yup.string(),
        shiftTypeId: Yup.string().required('Shift type is required'),
        rotationPatternId: Yup.string().required('Rotation pattern is required'),
        effectiveFrom: Yup.date()
          .nullable()
          .required('Effective from is required'),
        weeklyOffDayId: Yup.string().required('Weekly off day is required'),
        status: Yup.string().required('Status is required')
      }),
    [showStaff]
  );

  const initialValues = useMemo(() => {
    if (record && mode === 'edit') {
      return {
        ...shiftAssignmentRecordToFormValues(record),
        manageRosterId: initialManageRosterId || record.manageRosterId || ''
      };
    }
    return emptyValues;
  }, [initialManageRosterId, mode, record]);

  const showAudit = mode === 'edit';
  const auditCreatedBy = showAudit
    ? (record?.createdUser?.name ?? '—')
    : '—';
  const auditCreatedAt = showAudit
    ? formatAuditDateTime(record?.createdAt)
    : '—';
  const auditUpdatedBy = showAudit
    ? (record?.updatedUser?.name ?? '—')
    : '—';
  const auditUpdatedAt = showAudit
    ? formatAuditDateTime(record?.updatedAt)
    : '—';

  const formKey =
    mode === 'edit'
      ? `edit-${record?.id ?? 'new'}-${initialManageRosterId}-${editRosterReady ? 'ready' : 'wait'}`
      : `${mode}-new`;

  if (mode === 'edit' && !editRosterReady) {
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
          <div className="px-6 py-4 text-sm text-muted-foreground">
            Loading roster context…
          </div>
        </SheetContent>
      </Sheet>
    );
  }

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
          key={formKey}
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values, helpers) => {
            try {
              setLoading(true);
              let respond;

              let bulkCreatedCount = selectedCount;
              const rosterStaffIds = new Set(staffOptions.map((row) => row.id));

              if (mode === 'edit' && record?.id) {
                respond = await updateShiftAssignmentAction(
                  record.id,
                  shiftAssignmentFormValuesToPayload(values)
                );
              } else if (mode === 'bulk') {
                const eligibleIds = selectedStaffIds.filter((id) =>
                  rosterStaffIds.has(id)
                );
                if (eligibleIds.length === 0) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description:
                      'None of the selected staff belong to this roster group.'
                  });
                  return;
                }
                const { staffId: _ignored, ...rest } = values;
                respond = await bulkCreateShiftAssignmentsAction(
                  shiftAssignmentFormValuesToBulkPayload(rest, eligibleIds)
                );
                if (
                  !respond?.isError &&
                  respond?.data &&
                  'count' in respond.data
                ) {
                  bulkCreatedCount = respond.data.count ?? eligibleIds.length;
                }
              } else {
                if (
                  values.staffId &&
                  staffOptions.length > 0 &&
                  !rosterStaffIds.has(values.staffId)
                ) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description:
                      'Selected staff is not in this roster group. Pick again.'
                  });
                  return;
                }
                respond = await createShiftAssignmentAction(
                  shiftAssignmentFormValuesToPayload(values)
                );
              }

              if (respond?.isError) {
                const errorMap = respond.errors as Record<
                  string,
                  string | string[] | undefined
                >;
                const message = applyFieldErrors(
                  errorMap,
                  helpers.setErrors,
                  helpers.setTouched
                );
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    message ?? 'Shift assignment could not be saved.'
                });
                return;
              }

              toast({
                variant: 'success',
                title: 'Success',
                description:
                  mode === 'edit'
                    ? 'Shift assignment updated.'
                    : mode === 'bulk'
                      ? `${bulkCreatedCount} assignment(s) created.`
                      : 'Shift assignment created.'
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
                    : 'Shift assignment could not be saved.'
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          {(formik) => {
            const selectedStaff =
              staffOptions.find((row) => row.id === formik.values.staffId) ??
              null;
            const bulkEligibleCount = selectedStaffIds.filter((id) =>
              staffOptions.some((row) => row.id === id)
            ).length;

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                <RosterScopeLoader
                  manageRosterId={formik.values.manageRosterId}
                  staffId={formik.values.staffId}
                  setFieldValue={formik.setFieldValue}
                  loadedRosterRef={loadedRosterRef}
                  setScopeLoading={setScopeLoading}
                  setRosterContext={setRosterContext}
                  setStaffOptions={setStaffOptions}
                  onLoadError={(description) =>
                    toast({
                      variant: 'destructive',
                      title: 'Error',
                      description
                    })
                  }
                />

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {isBulk ? (
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                      {selectedCount} staff selected in the register — only
                      members of the chosen roster group will be assigned.
                    </div>
                  ) : null}

                  <CustomSelectField
                    id="manageRosterId"
                    placeholder="Roster Group"
                    value={formik.values.manageRosterId}
                    onChange={(value) => {
                      const next = value ?? '';
                      if (next === formik.values.manageRosterId) return;
                      void formik.setFieldValue('manageRosterId', next);
                      void formik.setFieldValue('staffId', '');
                    }}
                    required
                    options={rosterOptions}
                    styleClasses={fieldStyleClasses}
                  />

                  <RosterContextCard
                    context={rosterContext}
                    loading={scopeLoading}
                    selectedStaff={selectedStaff}
                    bulkEligibleCount={bulkEligibleCount}
                    bulkSelectedCount={selectedCount}
                    isBulk={isBulk}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {showStaff ? (
                      <div className="sm:col-span-2">
                        <CustomSelectField
                          id="staffId"
                          placeholder="Staff Member"
                          value={formik.values.staffId}
                          onChange={(value) =>
                            formik.setFieldValue('staffId', value)
                          }
                          required
                          options={staffOptions}
                          styleClasses={fieldStyleClasses}
                          disabled={
                            !formik.values.manageRosterId || scopeLoading
                          }
                        />
                      </div>
                    ) : null}

                    <CustomSelectField
                      id="shiftTypeId"
                      placeholder="Shift Type"
                      value={formik.values.shiftTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('shiftTypeId', value)
                      }
                      required
                      options={shiftTypeOptions}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="rotationPatternId"
                      placeholder="Rotation Pattern"
                      value={formik.values.rotationPatternId}
                      onChange={(value) =>
                        formik.setFieldValue('rotationPatternId', value)
                      }
                      required
                      options={[...SHIFT_ASSIGNMENT_ROTATION_PATTERNS]}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="effectiveFrom"
                      placeholder="Effective From"
                      value={formik.values.effectiveFrom}
                      onChange={(value) =>
                        formik.setFieldValue('effectiveFrom', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomDatePickerField
                      id="effectiveTo"
                      placeholder="Effective To"
                      value={formik.values.effectiveTo}
                      onChange={(value) =>
                        formik.setFieldValue('effectiveTo', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required={false}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="weeklyOffDayId"
                      placeholder="Weekly Off Day"
                      value={formik.values.weeklyOffDayId}
                      onChange={(value) =>
                        formik.setFieldValue('weeklyOffDayId', value)
                      }
                      required
                      options={[...SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS]}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Status"
                      value={formik.values.status}
                      onChange={(value) =>
                        formik.setFieldValue('status', value)
                      }
                      required
                      options={SHIFT_ASSIGNMENT_STATUS_OPTIONS}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <Label
                        htmlFor="autoAssign"
                        className="cursor-pointer text-sm font-semibold text-foreground"
                      >
                        Auto Assign
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Generate roster entries automatically from the rotation
                        pattern.
                      </p>
                    </div>
                    <Switch
                      id="autoAssign"
                      checked={formik.values.autoAssign}
                      onCheckedChange={(checked) =>
                        formik.setFieldValue('autoAssign', checked)
                      }
                      className="shrink-0"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>
                      Created by: {auditCreatedBy}
                      {auditCreatedAt !== '—' ? ` · ${auditCreatedAt}` : null}
                    </p>
                    <p className="sm:text-right">
                      Last updated: {auditUpdatedBy}
                      {auditUpdatedAt !== '—' ? ` · ${auditUpdatedAt}` : null}
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || scopeLoading}
                    variant="outline"
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
  );
}

function RosterScopeLoader({
  manageRosterId,
  staffId,
  setFieldValue,
  loadedRosterRef,
  setScopeLoading,
  setRosterContext,
  setStaffOptions,
  onLoadError
}: {
  manageRosterId: string;
  staffId: string;
  setFieldValue: FormikHelpers<ShiftAssignmentFormValues>['setFieldValue'];
  loadedRosterRef: React.MutableRefObject<string>;
  setScopeLoading: (value: boolean) => void;
  setRosterContext: (value: ShiftAssignmentRosterContext | null) => void;
  setStaffOptions: (value: ShiftAssignmentStaffOption[]) => void;
  onLoadError: (description: string) => void;
}) {
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const setFieldValueRef = useRef(setFieldValue);
  setFieldValueRef.current = setFieldValue;
  const staffIdRef = useRef(staffId);
  staffIdRef.current = staffId;

  useEffect(() => {
    const id = manageRosterId.trim();
    if (!id) {
      loadedRosterRef.current = '';
      setRosterContext(null);
      setStaffOptions([]);
      setScopeLoading(false);
      return;
    }

    if (loadedRosterRef.current === id) return;

    const previousId = loadedRosterRef.current;
    let cancelled = false;
    setScopeLoading(true);
    void getShiftAssignmentRosterScopeAction(id).then((result) => {
      if (cancelled) return;
      setScopeLoading(false);
      if (result.isError || !result.data) {
        loadedRosterRef.current = '';
        setRosterContext(null);
        setStaffOptions([]);
        if (staffIdRef.current) {
          void setFieldValueRef.current('staffId', '');
        }
        onLoadErrorRef.current(
          (result.errors as { message?: string })?.message ??
            'Could not load roster staff.'
        );
        return;
      }
      loadedRosterRef.current = id;
      setRosterContext(result.data.context);
      setStaffOptions(result.data.staff);
      if (previousId && previousId !== id && staffIdRef.current) {
        const stillValid = result.data.staff.some(
          (row) => row.id === staffIdRef.current
        );
        if (!stillValid) {
          void setFieldValueRef.current('staffId', '');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    loadedRosterRef,
    manageRosterId,
    setRosterContext,
    setScopeLoading,
    setStaffOptions
  ]);

  return null;
}
