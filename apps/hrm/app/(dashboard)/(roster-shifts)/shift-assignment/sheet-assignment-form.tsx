'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
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
import {
  shiftAssignmentFormValuesToBulkPayload,
  shiftAssignmentFormValuesToPayload,
  shiftAssignmentRecordToFormValues
} from '@/lib/mappers/shift-assignment-form.mapper';
import {
  bulkCreateShiftAssignmentsAction,
  createShiftAssignmentAction,
  updateShiftAssignmentAction
} from '@/app/actions/roster-actions/shift-assignment.actions';
import {
  SHIFT_ASSIGNMENT_ROTATION_PATTERNS,
  SHIFT_ASSIGNMENT_STATUS_OPTIONS,
  SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS,
  type RosterFilterOption,
  type ShiftAssignmentFormValues,
  type ShiftAssignmentRecord
} from '@/types/roster';
import type { ShiftAssignmentFormSheetMode } from './shift-assignment-ui-context';

type SheetAssignmentFormProps = {
  open: boolean;
  mode: ShiftAssignmentFormSheetMode;
  record: ShiftAssignmentRecord | null;
  selectedCount: number;
  selectedStaffIds: string[];
  staffOptions: RosterFilterOption[];
  shiftTypeOptions: RosterFilterOption[];
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

const emptyValues: ShiftAssignmentFormValues = {
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
      description: 'Apply one shift assignment to all selected staff members.',
      saveLabel: 'Save Assignment'
    };
  }
  return {
    title: 'Assign Shift',
    description: 'Assign a shift type to an individual staff member.',
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

export default function SheetAssignmentForm({
  open,
  mode,
  record,
  selectedCount,
  selectedStaffIds,
  staffOptions,
  shiftTypeOptions,
  onOpenChange
}: SheetAssignmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const copy = sheetCopy(mode);
  const isBulk = mode === 'bulk';
  const showStaff = mode !== 'bulk';

  const validationSchema = useMemo(
    () =>
      Yup.object({
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
      return shiftAssignmentRecordToFormValues(record);
    }
    return emptyValues;
  }, [mode, record]);

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
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values, helpers) => {
            try {
              setLoading(true);
              let respond;

              let bulkCreatedCount = selectedCount;

              if (mode === 'edit' && record?.id) {
                respond = await updateShiftAssignmentAction(
                  record.id,
                  shiftAssignmentFormValuesToPayload(values)
                );
              } else if (mode === 'bulk') {
                if (selectedStaffIds.length === 0) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Select at least one staff member.'
                  });
                  return;
                }
                const { staffId: _ignored, ...rest } = values;
                respond = await bulkCreateShiftAssignmentsAction(
                  shiftAssignmentFormValuesToBulkPayload(rest, selectedStaffIds)
                );
                if (!respond?.isError && respond?.data && 'count' in respond.data) {
                  bulkCreatedCount = respond.data.count ?? selectedCount;
                }
              } else {
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
          {(formik) => (
            <Form className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {isBulk ? (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                    {selectedCount} staff selected — the assignment below
                    applies to every selected staff member.
                  </div>
                ) : null}

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
                    onChange={(value) => formik.setFieldValue('status', value)}
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
                  className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {copy.saveLabel}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </Formik>
      </SheetContent>
    </Sheet>
  );
}
