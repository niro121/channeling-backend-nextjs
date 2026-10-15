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
  amendmentFormValuesToPayload,
  amendmentRecordToFormValues
} from '@/lib/mappers/roster-amendment-form.mapper';
import {
  createRosterAmendmentAction,
  lookupPublishedAllocationForAmendmentAction,
  updateRosterAmendmentAction
} from '@/app/actions/roster-actions/roster-amendment.actions';
import type {
  RosterAmendmentFormOptions,
  RosterAmendmentRecord
} from '@/types/roster';
import type { AmendmentFormSheetMode } from './roster-amendments-ui-context';

export type AmendmentFormValues = {
  amendmentNo: string;
  amendmentTypeId: string;
  staffId: string;
  rosterDate: Date | null;
  originalShift: string;
  originalShiftTypeId: string;
  amendedShiftId: string;
  replacementStaffId: string;
  requestedById: string;
  status: string;
  reason: string;
  remarks: string;
};

type SheetAmendmentFormProps = {
  open: boolean;
  mode: AmendmentFormSheetMode;
  record: RosterAmendmentRecord | null;
  formOptions: RosterAmendmentFormOptions;
  onOpenChange: (open: boolean) => void;
};

const fieldStyleClasses = {
  parentDiv: 'grid grid-cols-1 gap-1.5 items-start',
  labelClassName: 'text-sm text-foreground font-semibold',
  inputClassName: 'w-full'
};

function emptyValues(): AmendmentFormValues {
  return {
    amendmentNo: 'Auto-assigned on save',
    amendmentTypeId: '',
    staffId: '',
    rosterDate: null,
    originalShift: '',
    originalShiftTypeId: '',
    amendedShiftId: '',
    replacementStaffId: '',
    requestedById: '',
    status: 'pending_approval',
    reason: '',
    remarks: ''
  };
}

function AutoPublishedAllocationLookup({
  staffId,
  rosterDate,
  setFieldValue,
  toast
}: {
  staffId: string;
  rosterDate: Date | null;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const lookupKey = useRef('');

  useEffect(() => {
    if (!staffId || !rosterDate) {
      void setFieldValue('originalShift', '');
      void setFieldValue('originalShiftTypeId', '');
      return;
    }

    const key = `${staffId}:${format(rosterDate, 'yyyy-MM-dd')}`;
    if (lookupKey.current === key) return;
    lookupKey.current = key;

    let cancelled = false;

    void (async () => {
      const result = await lookupPublishedAllocationForAmendmentAction(
        staffId,
        format(rosterDate, 'yyyy-MM-dd')
      );
      if (cancelled) return;

      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Lookup failed',
          description:
            (result.errors as { message?: string })?.message ??
            'Could not load published shift for this staff member and date.'
        });
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        return;
      }

      const allocation = result.data;
      if (!allocation) {
        void setFieldValue('originalShift', '');
        void setFieldValue('originalShiftTypeId', '');
        toast({
          variant: 'destructive',
          title: 'No published shift',
          description:
            'No published roster cell exists for this staff member on the selected date.'
        });
        return;
      }

      void setFieldValue('originalShift', allocation.originalShiftLabel);
      void setFieldValue('originalShiftTypeId', allocation.originalShiftTypeId);
    })();

    return () => {
      cancelled = true;
    };
  }, [rosterDate, setFieldValue, staffId, toast]);

  return null;
}

function AutoAmendmentTypeFields({
  amendmentTypeId,
  originalShiftTypeId,
  setFieldValue
}: {
  amendmentTypeId: string;
  originalShiftTypeId: string;
  setFieldValue: FormikProps<AmendmentFormValues>['setFieldValue'];
}) {
  useEffect(() => {
    if (amendmentTypeId === 'duty_cancellation') {
      void setFieldValue('amendedShiftId', '');
      void setFieldValue('replacementStaffId', '');
      return;
    }
    if (amendmentTypeId === 'staff_replacement') {
      void setFieldValue('amendedShiftId', originalShiftTypeId);
      return;
    }
    void setFieldValue('replacementStaffId', '');
  }, [amendmentTypeId, originalShiftTypeId, setFieldValue]);
  return null;
}

export default function SheetAmendmentForm({
  open,
  mode,
  record,
  formOptions,
  onOpenChange
}: SheetAmendmentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = mode === 'edit';
  const showAudit = isEdit && !!record;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        amendmentTypeId: Yup.string().required('Amendment type is required'),
        staffId: Yup.string().required('Staff member is required'),
        rosterDate: Yup.date().nullable().required('Roster date is required'),
        originalShiftTypeId: Yup.string().required(
          'Published original shift is required for the selected date'
        ),
        amendedShiftId: Yup.string().when('amendmentTypeId', {
          is: (value: string) =>
            value === 'duty_cancellation' || value === 'staff_replacement',
          then: (schema) => schema,
          otherwise: (schema) => schema.required('Amended shift is required')
        }),
        replacementStaffId: Yup.string().when('amendmentTypeId', {
          is: 'staff_replacement',
          then: (schema) =>
            schema
              .required('Replacement staff is required')
              .notOneOf(
                [Yup.ref('staffId')],
                'Replacement staff must be different from the staff being replaced'
              ),
          otherwise: (schema) => schema
        }),
        requestedById: Yup.string().required('Requested by is required'),
        status: Yup.string().required('Approval status is required'),
        reason: Yup.string()
          .required('Reason for amendment is required')
          .max(500, 'Must be less than 500 characters'),
        remarks: Yup.string().max(500, 'Must be less than 500 characters')
      }),
    []
  );

  const initialValues = useMemo(() => {
    if (record && isEdit) return amendmentRecordToFormValues(record);
    return emptyValues();
  }, [isEdit, record]);

  const staffOptions = useMemo(
    () => formOptions.staff.map(({ id, name }) => ({ id, name })),
    [formOptions.staff]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{isEdit ? 'Edit Amendment' : 'New Amendment'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the record. All changes are captured in the audit trail.'
              : 'Raise an amendment against a published roster entry.'}
          </SheetDescription>
        </SheetHeader>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            setLoading(true);
            try {
              const payload = amendmentFormValuesToPayload(values);
              const result = isEdit && record
                ? await updateRosterAmendmentAction(record.id, payload)
                : await createRosterAmendmentAction(payload);

              if (result.isError) {
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    (result.errors as { message?: string })?.message ??
                    'Roster amendment could not be saved.'
                });
                return;
              }

              toast({
                variant: 'success',
                title: 'Success',
                description: isEdit
                  ? `${record?.code ?? 'Amendment'} updated.`
                  : `${result.data?.code ?? 'Amendment'} saved.`
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
                    : 'Roster amendment could not be saved.'
              });
            } finally {
              setLoading(false);
            }
          }}
        >
          {(formik) => {
            const isCancellation =
              formik.values.amendmentTypeId === 'duty_cancellation';
            const isStaffReplacement =
              formik.values.amendmentTypeId === 'staff_replacement';
            const replacementStaffOptions = formOptions.replacementStaff.filter(
              (option) => option.id !== formik.values.staffId
            );

            return (
              <Form className="flex min-h-0 flex-1 flex-col">
                {!isEdit ? (
                  <AutoPublishedAllocationLookup
                    staffId={formik.values.staffId}
                    rosterDate={formik.values.rosterDate}
                    setFieldValue={formik.setFieldValue}
                    toast={toast}
                  />
                ) : null}
                <AutoAmendmentTypeFields
                  amendmentTypeId={formik.values.amendmentTypeId}
                  originalShiftTypeId={formik.values.originalShiftTypeId}
                  setFieldValue={formik.setFieldValue}
                />

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CustomFormField
                      id="amendmentNo"
                      type="text"
                      placeholder="Amendment No"
                      value={formik.values.amendmentNo}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="amendmentTypeId"
                      placeholder="Amendment Type"
                      value={formik.values.amendmentTypeId}
                      onChange={(value) =>
                        formik.setFieldValue('amendmentTypeId', value)
                      }
                      required
                      options={formOptions.amendmentTypes}
                      styleClasses={fieldStyleClasses}
                    />
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
                    <CustomDatePickerField
                      id="rosterDate"
                      placeholder="Roster Date"
                      value={formik.values.rosterDate}
                      onChange={(value) =>
                        formik.setFieldValue('rosterDate', value ?? null)
                      }
                      onBlur={formik.handleBlur}
                      required
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomFormField
                      id="originalShift"
                      type="text"
                      placeholder="Original Shift"
                      value={formik.values.originalShift}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      required={false}
                      disabled
                      styleClasses={fieldStyleClasses}
                    />
                    {isStaffReplacement ? (
                      <CustomSelectField
                        id="replacementStaffId"
                        placeholder="Replacement Staff"
                        value={formik.values.replacementStaffId}
                        onChange={(value) =>
                          formik.setFieldValue('replacementStaffId', value)
                        }
                        required
                        options={replacementStaffOptions}
                        styleClasses={fieldStyleClasses}
                      />
                    ) : (
                      <CustomSelectField
                        id="amendedShiftId"
                        placeholder="Amended Shift"
                        value={formik.values.amendedShiftId}
                        onChange={(value) =>
                          formik.setFieldValue('amendedShiftId', value)
                        }
                        required={!isCancellation}
                        disabled={isCancellation}
                        options={formOptions.shiftTypes}
                        styleClasses={fieldStyleClasses}
                      />
                    )}
                    <CustomSelectField
                      id="requestedById"
                      placeholder="Requested By"
                      value={formik.values.requestedById}
                      onChange={(value) =>
                        formik.setFieldValue('requestedById', value)
                      }
                      required
                      options={formOptions.requesters}
                      styleClasses={fieldStyleClasses}
                    />
                    <CustomSelectField
                      id="status"
                      placeholder="Approval Status"
                      value={formik.values.status}
                      onChange={(value) =>
                        formik.setFieldValue('status', value)
                      }
                      required
                      options={formOptions.statuses}
                      styleClasses={fieldStyleClasses}
                    />
                  </div>

                  <CustomFormField
                    id="reason"
                    type="textarea"
                    placeholder="Reason for Amendment"
                    value={formik.values.reason}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    styleClasses={fieldStyleClasses}
                  />
                  <CustomFormField
                    id="remarks"
                    type="textarea"
                    placeholder="Approver Remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required={false}
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

                <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    size="sm"
                    className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {isEdit ? 'Save Changes' : 'Save Amendment'}
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
