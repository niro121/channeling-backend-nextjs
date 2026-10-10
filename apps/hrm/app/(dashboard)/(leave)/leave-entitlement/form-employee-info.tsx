'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { format } from 'date-fns';
import { SaveIcon, Trash2, XIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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
import {
  createLeaveEntitlementAction,
  deleteLeaveEntitlementAction,
  updateLeaveEntitlementAction
} from '@/app/actions/leave-actions/leave-entitlement.actions';
import {
  leaveEntitlementFormValuesToPayload,
  leaveEntitlementRecordToFormValues
} from '@/lib/mappers/leave-entitlement-form.mapper';
import type {
  LeaveEntitlementFormValues,
  LeaveEntitlementRecord
} from '@/types/leave';
import { usePermissions } from '@/components/hooks/use-permissions';

type FilterOption = {
  id: string;
  name: string;
};

type AuditInfo = {
  name: string;
  position?: string | null;
  at: Date | string | null;
};

type FormEmployeeInfoProps = {
  employeeOptions?: FilterOption[];
  leaveTypeOptions?: FilterOption[];
  selectedRecord?: LeaveEntitlementRecord | null;
  onClearSelection?: () => void;
  createdBy?: AuditInfo | null;
  lastUpdatedBy?: AuditInfo | null;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-2 items-start',
  labelClassName: 'text-sm text-black font-semibold capitalize',
  inputClassName: 'w-full'
};

const emptyValues: LeaveEntitlementFormValues = {
  staffId: '',
  leaveTypeId: '',
  fromDate: null,
  toDate: null,
  entitled: '',
  carryForward: '0',
  status: 'active'
};

const validationSchema = Yup.object({
  staffId: Yup.string().required('Employee is required'),
  leaveTypeId: Yup.string().required('Leave type is required'),
  fromDate: Yup.date().nullable().required('From date is required'),
  toDate: Yup.date()
    .nullable()
    .required('To date is required')
    .min(Yup.ref('fromDate'), 'To date must be on or after from date'),
  entitled: Yup.number()
    .transform((value, original) => (original === '' ? undefined : value))
    .min(0, 'Must be 0 or greater')
    .required('Entitled days is required'),
  carryForward: Yup.number()
    .transform((value, original) => (original === '' ? 0 : value))
    .min(0, 'Must be 0 or greater')
    .optional(),
  status: Yup.string().oneOf(['active', 'expired', 'pending'])
});

function formatAuditLine(info?: AuditInfo | null): string {
  if (!info?.name || !info.at) return '—';

  const date = info.at instanceof Date ? info.at : new Date(info.at);
  if (Number.isNaN(date.getTime())) return '—';

  const namePart = info.position
    ? `${info.name} (${info.position})`
    : info.name;
  const datePart = format(date, 'do MMM yyyy');
  const timePart = format(date, 'HH:mm');

  return `${namePart} · ${datePart} · ${timePart}`;
}

export default function FormEmployeeInfo({
  employeeOptions = [],
  leaveTypeOptions = [],
  selectedRecord = null,
  onClearSelection,
  createdBy = null,
  lastUpdatedBy = null
}: FormEmployeeInfoProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { has } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = Boolean(selectedRecord?.id);
  const canSave = isEdit
    ? has('leave-entitlement', 'edit')
    : has('leave-entitlement', 'add');
  const canDelete = has('leave-entitlement', 'delete');

  const formInitialValues: LeaveEntitlementFormValues = selectedRecord
    ? leaveEntitlementRecordToFormValues(selectedRecord)
    : emptyValues;

  const auditCreated =
    createdBy ??
    (selectedRecord?.createdUser
      ? {
          name: selectedRecord.createdUser.name,
          at: selectedRecord.createdAt ?? null
        }
      : null);

  const auditUpdated =
    lastUpdatedBy ??
    (selectedRecord?.updatedUser
      ? {
          name: selectedRecord.updatedUser.name,
          at: selectedRecord.updatedAt ?? null
        }
      : null);

  const handleSubmit = async (
    values: LeaveEntitlementFormValues,
    { setErrors, setTouched, resetForm }: FormikHelpers<LeaveEntitlementFormValues>
  ) => {
    try {
      setLoading(true);
      const payload = leaveEntitlementFormValuesToPayload(values);

      const respond = isEdit && selectedRecord?.id
        ? await updateLeaveEntitlementAction(selectedRecord.id, payload)
        : await createLeaveEntitlementAction(payload);

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
          const formKey =
            key === 'staffId'
              ? 'staffId'
              : key === 'leaveTypeId'
                ? 'leaveTypeId'
                : key;
          fieldErrors[formKey] = msg;
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
            'Leave entitlement save unsuccessful.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: isEdit
          ? 'Leave entitlement updated successfully.'
          : 'Leave entitlement created successfully.'
      });

      resetForm({ values: emptyValues });
      onClearSelection?.();
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Leave entitlement save unsuccessful.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id) return;
    try {
      setDeleting(true);
      const result = await deleteLeaveEntitlementAction(selectedRecord.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.errors?.message ?? 'Leave entitlement deletion unsuccessful.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Leave entitlement deleted successfully.'
      });
      onClearSelection?.();
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message ?? 'Leave entitlement deletion unsuccessful.'
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
            <div>
              <CardTitle className="text-lg font-semibold">
                Employee Information
              </CardTitle>
              <CardDescription>
                {isEdit
                  ? 'Update leave entitlement details for the selected record.'
                  : 'Configure leave entitlement details for the selected employee.'}
              </CardDescription>
            </div>
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
            {(formik) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className={fieldStyleClasses.parentDiv}>
                      <Label className={fieldStyleClasses.labelClassName}>
                        Employee
                        <span className="text-red-600"> *</span>
                      </Label>
                      <div className={fieldStyleClasses.inputClassName}>
                        <Combobox
                          label="Select Employee"
                          options={employeeOptions}
                          value={formik.values.staffId}
                          defaultValue=""
                          clearable
                          triggerClassName="w-full max-w-none font-normal!"
                          popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
                          onChange={(value) =>
                            formik.setFieldValue('staffId', value)
                          }
                        />
                      </div>
                    </div>

                    <CustomSelectField
                      id="leaveTypeId"
                      placeholder="Leave Type"
                      options={leaveTypeOptions}
                      value={formik.values.leaveTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('leaveTypeId', value)
                      }
                      required
                      styleClasses={fieldStyleClasses}
                    />

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

                    <CustomFormField
                      type="number"
                      id="entitled"
                      placeholder="Entitled Days Per Year"
                      value={formik.values.entitled}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required
                      min={0}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {canDelete && isEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={loading || deleting}
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                    {canSave ? (
                      <Button
                        type="submit"
                        className="gap-1.5"
                        disabled={loading}
                      >
                        <SaveIcon className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    ) : null}
                  </div>
                </Form>
            )}
          </Formik>
          <Card className="mt-8 rounded-lg border border-border shadow-sm">
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="shrink-0 font-semibold text-foreground">
                  Created by:
                </span>
                <span className="text-muted-foreground">
                  {formatAuditLine(auditCreated)}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="shrink-0 font-semibold text-foreground">
                  Last updated:
                </span>
                <span className="text-muted-foreground">
                  {formatAuditLine(auditUpdated)}
                </span>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        loading={deleting}
        title="Delete leave entitlement?"
        description="This will permanently remove the selected entitlement record."
        handleContinue={handleDelete}
      />
    </div>
  );
}
